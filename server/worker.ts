import cron from 'node-cron';
import { log, getConfig, insertSignal, getActiveSignals, updateSignalResult, db } from './db';
import { getTopUSDTContracts, getKlines } from './services/binance';
import { evaluateStrategy } from './services/strategy';
import { evaluateWithAI } from './services/ai';
import { sendTelegramSignal } from './services/telegram';

const cooldowns: Record<string, number> = {};
let isScanRunning = false;
let isSignalUpdateRunning = false;

async function runWithConcurrency<T>(
    items: T[],
    concurrency: number,
    handler: (item: T) => Promise<void>
) {
    const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length)) }, async (_, workerIndex) => {
        for (let i = workerIndex; i < items.length; i += concurrency) {
            await handler(items[i]);
        }
    });
    await Promise.all(workers);
}

async function scanMarket() {
    if (isScanRunning) {
        log('WARN', 'Skip market scan because previous run is still in progress.');
        return;
    }
    isScanRunning = true;
    log('INFO', 'Starting Market Scan...');
    try {
        const getConfVal = (key: string) => (getConfig.get(key) as any)?.value as string;
        const topNStr = getConfVal('topN');
        const topN = parseInt(topNStr || '20', 10);
        const maxConcurrencyStr = getConfVal('scanMaxConcurrency');
        const maxConcurrency = Math.max(1, parseInt(maxConcurrencyStr || '3', 10));

        const vwapFilter = getConfVal('vwapFilter') === 'true';
        const volFilter = getConfVal('volFilter') === 'true';

        let symbols = await getTopUSDTContracts(topN);
        const manualSymbolsStr = getConfVal('manualSymbols');
        
        if (manualSymbolsStr && manualSymbolsStr.trim() !== '') {
            const customSymbols = manualSymbolsStr.split(',').map(s => s.trim().toUpperCase()).filter(s => s !== '' && s.endsWith('USDT'));
            symbols = Array.from(new Set([...customSymbols, ...symbols])); // Custom ones first
            log('INFO', `Monitoring Contracts (Custom + TopN): ${symbols.join(', ')}`);
        } else {
            log('INFO', `Monitoring Top Contracts: ${symbols.join(', ')}`);
        }

        await runWithConcurrency(symbols, maxConcurrency, async (symbol) => {
            try {
                const [klines5m, klines15m] = await Promise.all([
                    getKlines(symbol, '5m', 200),
                    getKlines(symbol, '15m', 200)
                ]);

                const snapshot = evaluateStrategy(symbol, klines5m, klines15m, vwapFilter, volFilter);
                if (snapshot) {
                    // Cooldown check
                    const cdKey = `${symbol}_${snapshot.signalType}`;
                    const now = Date.now();
                    if (cooldowns[cdKey] && now - cooldowns[cdKey] < 6 * 5 * 60 * 1000) {
                        continue; // In cooldown
                    }

                    log('INFO', `Signal generated for ${symbol}: ${snapshot.signalType}`);
                    
                    const aiResult = await evaluateWithAI(snapshot);
                    log('INFO', `AI Evaluation - Pass: ${aiResult.pass}, Score: ${aiResult.score}`);

                    if (aiResult.pass) {
                        await sendTelegramSignal(snapshot, aiResult.pass, aiResult.score, aiResult.reason);
                    } else {
                        log('INFO', `AI filtered out signal for ${symbol}`);
                        // Optional: still send to telegram if config says so, but let's stick to true only for now
                    }

                    insertSignal.run(
                        symbol, '5m', snapshot.signalType, snapshot.direction,
                        snapshot.entry, snapshot.stop, snapshot.tp1, snapshot.tp2,
                        now, aiResult.provider, Math.round(aiResult.score), aiResult.pass ? 1 : 0, aiResult.reason,
                        JSON.stringify(snapshot.context), null
                    );

                    cooldowns[cdKey] = now;
                }

                // Sleep bit to avoid rate limits
                await new Promise(r => setTimeout(r, 100));

            } catch (e) {
                log('ERROR', `Error processing ${symbol}: ${e}`);
            }
        });
        log('INFO', `Market Scan Completed.`);
    } finally {
        isScanRunning = false;
    }
}

async function updateActiveSignals() {
    if (isSignalUpdateRunning) {
        log('WARN', 'Skip signal update because previous run is still in progress.');
        return;
    }
    isSignalUpdateRunning = true;
    const active = getActiveSignals.all() as any[];
    try {
        const uniqueSymbols = Array.from(new Set(active.map(s => s.symbol)));
        const klinesBySymbol = new Map<string, Awaited<ReturnType<typeof getKlines>>>();

        await runWithConcurrency(uniqueSymbols, 4, async (symbol) => {
            const klines = await getKlines(symbol, '5m', 20);
            klinesBySymbol.set(symbol, klines);
        });

        for (const s of active) {
            try {
                // To simplify, we track using close prices of 5m
                const klines = klinesBySymbol.get(s.symbol) || [];
                if(!klines.length) continue;
                
                let result: string | null = null;
                let pnl = 0;
                const elapsedKlines = klines.filter(k => k.closeTime > s.signal_time);

                if (elapsedKlines.length >= 12) {
                    result = 'EXPIRED'; // configured timeout
                }

                for (const k of elapsedKlines) {
                    if (s.direction === 'LONG') {
                        if (k.low <= s.stop) { result = 'LOSS_SL'; pnl = -1; break; }
                        if (k.high >= s.tp2) { result = 'WIN_TP2'; pnl = 2; break; }
                        if (k.high >= s.tp1) { result = 'WIN_TP1'; pnl = 1; break; }
                    } else {
                        if (k.high >= s.stop) { result = 'LOSS_SL'; pnl = -1; break; }
                        if (k.low <= s.tp2) { result = 'WIN_TP2'; pnl = 2; break; }
                        if (k.low <= s.tp1) { result = 'WIN_TP1'; pnl = 1; break; }
                    }
                }

                if (result) {
                    log('INFO', `Signal ${s.id} resolved: ${result}`);
                    updateSignalResult.run(result, pnl, Date.now(), s.id);
                }
            } catch (e) {
                log('ERROR', `Status update error for ${s.id}: ${e}`);
            }
        }
    } finally {
        isSignalUpdateRunning = false;
    }
}

function start() {
    log('INFO', 'Worker Thread Started');
    const getConfVal = (key: string) => (getConfig.get(key) as any)?.value as string;
    const intervalStr = getConfVal('scanIntervalMin');
    const intervalMin = parseInt(intervalStr || '5', 10);

    // Run immediately
    scanMarket();
    // Schedule
    cron.schedule(`*/${intervalMin} * * * *`, () => {
        scanMarket();
        updateActiveSignals();
    });
}

start();

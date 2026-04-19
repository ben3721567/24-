import cron from 'node-cron';
import { log, getConfig, insertSignal, getActiveSignals, updateSignalResult, db } from './db';
import { getTopUSDTContracts, getKlines } from './services/binance';
import { evaluateStrategy } from './services/strategy';
import { evaluateWithAI } from './services/ai';
import { sendTelegramSignal } from './services/telegram';

const cooldowns: Record<string, number> = {};

async function scanMarket() {
    log('INFO', 'Starting Market Scan...');
    const getConfVal = (key: string) => (getConfig.get(key) as any)?.value as string;
    const topNStr = getConfVal('topN');
    const topN = parseInt(topNStr || '20');

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

    for (const symbol of symbols) {
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
                     sendTelegramSignal(snapshot, aiResult.pass, aiResult.score, aiResult.reason);
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
    }
    log('INFO', `Market Scan Completed.`);
}

async function updateActiveSignals() {
    const active = getActiveSignals.all() as any[];
    for (const s of active) {
        try {
             // To simplify, we track using close prices of 5m
             const klines = await getKlines(s.symbol, '5m', 20);
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
}

function start() {
    log('INFO', 'Worker Thread Started');
    const getConfVal = (key: string) => (getConfig.get(key) as any)?.value as string;
    const intervalStr = getConfVal('scanIntervalMin');
    const intervalMin = parseInt(intervalStr || '5');

    // Run immediately
    scanMarket();
    // Schedule
    cron.schedule(`*/${intervalMin} * * * *`, () => {
        scanMarket();
        updateActiveSignals();
    });
}

start();

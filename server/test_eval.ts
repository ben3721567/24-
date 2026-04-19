import { getTopUSDTContracts, getKlines, Kline } from './services/binance';
import { calculateEMA, calculateMACD, calculateATR, calculateVWAP, calculateSMA } from './services/indicators';

export function evaluateStrategyDebug(symbol: string, klines5m: Kline[], klines15m: Kline[], vwapFilter: boolean, volFilter: boolean): any {
    // Remove the currently forming (unclosed) candle to evaluate firmly on the last closed bar
    const k5mClosed = klines5m.slice(0, -1);
    const k15mClosed = klines15m.slice(0, -1);

    const closes15m = k15mClosed.map(k => k.close);
    const ema20_15m = calculateEMA(20, closes15m);
    const ema50_15m = calculateEMA(50, closes15m);
    const macd15m = calculateMACD(closes15m);
    const vwap15m = calculateVWAP(k15mClosed);

    const closes5m = k5mClosed.map(k => k.close);
    const ema9_5m = calculateEMA(9, closes5m);
    const ema21_5m = calculateEMA(21, closes5m);
    const ema50_5m = calculateEMA(50, closes5m);
    const macd5m = calculateMACD(closes5m);
    const atr5m = calculateATR(k5mClosed.map(k => k.high), k5mClosed.map(k => k.low), closes5m);
    const vwap5m = calculateVWAP(k5mClosed);
    const volSma5m = calculateSMA(20, k5mClosed.map(k => k.volume));

    const getVal = (arr: any[], indexOffset = 0) => arr[arr.length - 1 - indexOffset];
    
    const e20_15 = getVal(ema20_15m);
    const e20_15_prev = getVal(ema20_15m, 1);
    const e50_15 = getVal(ema50_15m);
    const m15_hist = getVal(macd15m)?.histogram;
    const m15_hist_prev = getVal(macd15m, 1)?.histogram;
    const close15 = getVal(closes15m);
    const vwap15 = getVal(vwap15m);

    console.log(`${symbol} 15m: e20=${e20_15}, e50=${e50_15}, m15=${m15_hist}, m15prev=${m15_hist_prev}, c15=${close15}, vwap15=${vwap15}`);

    const trendBull15 = e20_15 > e50_15 && e20_15 > e20_15_prev && m15_hist > m15_hist_prev;
    const trendBear15 = e20_15 < e50_15 && e20_15 < e20_15_prev && m15_hist < m15_hist_prev;
    const vwapBull15 = close15 > vwap15;
    const vwapBear15 = close15 < vwap15;

    const longFilterStatus = vwapFilter ? (trendBull15 && vwapBull15) : trendBull15;
    const shortFilterStatus = vwapFilter ? (trendBear15 && vwapBear15) : trendBear15;
    
    let filterStatus = 'FILTERED';
    if (longFilterStatus) filterStatus = 'LONG_ONLY';
    else if (shortFilterStatus) filterStatus = 'SHORT_ONLY';

    console.log(`${symbol} FilterStatus: ${filterStatus} (vwapFilter=${vwapFilter})`);

    const close = getVal(closes5m);
    const open = getVal(k5mClosed.map(k => k.open));
    const high = getVal(k5mClosed.map(k => k.high));
    const low = getVal(k5mClosed.map(k => k.low));
    
    const e9 = getVal(ema9_5m);
    const e21 = getVal(ema21_5m);
    const e50 = getVal(ema50_5m);
    const m5m = getVal(macd5m)?.histogram;
    const m5m_1 = getVal(macd5m, 1)?.histogram;
    const m5m_2 = getVal(macd5m, 2)?.histogram;
    const v5m = getVal(vwap5m);
    const atr = getVal(atr5m);
    const volMa = getVal(volSma5m);
    const volume = getVal(k5mClosed.map(k => k.volume));

    const realBody = Math.abs(close - open);
    const bodyStrong = realBody > atr * 0.22;
    const bullCandle = close > open;
    const bearCandle = close < open;
    
    const bullStack5 = e9 > e21 && e21 > e50;
    const bearStack5 = e9 < e21 && e21 < e50;

    const bullMomentum5 = m5m > m5m_1;
    const bearMomentum5 = m5m < m5m_1;
    const bullMomentumStrong5 = m5m > m5m_1 && m5m_1 > m5m_2;
    const bearMomentumStrong5 = m5m < m5m_1 && m5m_1 < m5m_2;

    const volConfirm = volume > volMa * 1.3;
    const commonFilter = bodyStrong && (volFilter ? volConfirm : true);

    console.log(`${symbol} 5m: bullStack=${bullStack5}, bearStack=${bearStack5}, bullMomStr=${bullMomentumStrong5}, bearMomStr=${bearMomentumStrong5}, strongBody=${bodyStrong}, c=${close}, o=${open}, e21=${e21}, v5m=${v5m}`);

    let recentCrossUp = -1;
    let recentCrossDown = -1;
    for (let i = 0; i < 20; i++) {
        let cNow = getVal(closes5m, i);
        let cPrev = getVal(closes5m, i + 1);
        let eNow = getVal(ema21_5m, i);
        let ePrev = getVal(ema21_5m, i + 1);
        if (cPrev <= ePrev && cNow > eNow) { if (recentCrossUp === -1) recentCrossUp = i; }
        if (cPrev >= ePrev && cNow < eNow) { if (recentCrossDown === -1) recentCrossDown = i; }
        if (recentCrossUp !== -1 && recentCrossDown !== -1) break;
    }
    
    console.log(`${symbol} Crosses: UP=${recentCrossUp}, DOWN=${recentCrossDown}`);

    const crossUpEma21 = recentCrossUp === 0;
    const crossDownEma21 = recentCrossDown === 0;

    const highest8 = Math.max(...k5mClosed.slice(-8).map(k => k.high));
    const lowest8 = Math.min(...k5mClosed.slice(-8).map(k => k.low));

    const topShort = bearCandle && close < e21 && close < v5m && close < e9 && highest8 === high && commonFilter;
    const breakLong = bullStack5 && close > e21 && close > v5m && crossUpEma21 && bullMomentumStrong5 && bullCandle && commonFilter;
    const pullbackLong = bullStack5 && low < e21 && close > e21 && close > v5m && bullMomentum5 && bullCandle && commonFilter && recentCrossDown !== -1 && recentCrossDown < 8;
    const fakeBreakLong = recentCrossDown >= 0 && recentCrossDown < 6 && close > e21 && close > v5m && bullMomentumStrong5 && bullCandle && commonFilter;

    console.log(`${symbol} RawSignals: topS=${topShort}, brkL=${breakLong}, pbL=${pullbackLong}, fbL=${fakeBreakLong}`);

    return null;
}

async function run() {
    console.log('Fetching top 5 contracts...');
    try {
        const symbols = await getTopUSDTContracts(5);
        for (const symbol of symbols) {
            console.log(`\n--- Evaluating ${symbol} ---`);
            const k5 = await getKlines(symbol, '5m', 200);
            const k15 = await getKlines(symbol, '15m', 200);
            evaluateStrategyDebug(symbol, k5, k15, false, false);
        }
    } catch (e) {
        console.error("Error", e);
    }
}
run();

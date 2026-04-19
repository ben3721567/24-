import { Kline } from './binance';
import { calculateEMA, calculateMACD, calculateATR, calculateVWAP, calculateSMA } from './indicators';

export interface StrategySnapshot {
    symbol: string;
    filter15m: 'LONG_ONLY' | 'SHORT_ONLY' | 'FILTERED';
    direction: 'LONG' | 'SHORT' | 'NONE';
    signalType: string;
    currentPrice: number;
    entry: number;
    stop: number;
    tp1: number;
    tp2: number;
    reason: string;
    context: any;
}

export function evaluateStrategy(symbol: string, klines5m: Kline[], klines15m: Kline[], vwapFilter: boolean, volFilter: boolean): StrategySnapshot | null {
    if (klines5m.length < 100 || klines15m.length < 100) return null;

    // Use only closed candles to prevent repainting and incomplete volume/momentum anomalies
    const k5mClosed = klines5m.slice(0, -1);
    const k15mClosed = klines15m.slice(0, -1);

    // Array variables
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

    // Get latest/prev values
    const getVal = (arr: any[], indexOffset = 0) => arr[arr.length - 1 - indexOffset];
    
    // 15m Filtration
    const e20_15 = getVal(ema20_15m);
    const e20_15_prev = getVal(ema20_15m, 1);
    const e50_15 = getVal(ema50_15m);
    const m15_hist = getVal(macd15m)?.histogram;
    const m15_hist_prev = getVal(macd15m, 1)?.histogram;
    const close15 = getVal(closes15m);
    const vwap15 = getVal(vwap15m);

    const trendBull15 = e20_15 > e50_15 && e20_15 > e20_15_prev && m15_hist > m15_hist_prev;
    const trendBear15 = e20_15 < e50_15 && e20_15 < e20_15_prev && m15_hist < m15_hist_prev;
    const vwapBull15 = close15 > vwap15;
    const vwapBear15 = close15 < vwap15;

    const longFilterStatus = vwapFilter ? (trendBull15 && vwapBull15) : trendBull15;
    const shortFilterStatus = vwapFilter ? (trendBear15 && vwapBear15) : trendBear15;
    
    let filterStatus: 'LONG_ONLY' | 'SHORT_ONLY' | 'FILTERED' = 'FILTERED';
    if (longFilterStatus) filterStatus = 'LONG_ONLY';
    else if (shortFilterStatus) filterStatus = 'SHORT_ONLY';

    if (filterStatus === 'FILTERED') return null;

    // 5m Base Indicators
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

    // Calculate Crosses and Bars Since
    const crossUpEma21 = getVal(closes5m, 1) <= getVal(ema21_5m, 1) && close > e21;
    const crossDownEma21 = getVal(closes5m, 1) >= getVal(ema21_5m, 1) && close < e21;
    
    let recentCrossUp = -1;
    let recentCrossDown = -1;
    for (let i = 0; i < 20; i++) {
        let cNow = getVal(closes5m, i);
        let cPrev = getVal(closes5m, i + 1);
        let eNow = getVal(ema21_5m, i);
        let ePrev = getVal(ema21_5m, i + 1);

        if (cPrev <= ePrev && cNow > eNow) {
            if (recentCrossUp === -1) recentCrossUp = i;
        }
        if (cPrev >= ePrev && cNow < eNow) {
            if (recentCrossDown === -1) recentCrossDown = i;
        }
        if (recentCrossUp !== -1 && recentCrossDown !== -1) break;
    }
    
    const fakeBreakWindow = 6;
    const highest8 = Math.max(...k5mClosed.slice(-8).map(k => k.high));
    const lowest8 = Math.min(...k5mClosed.slice(-8).map(k => k.low));

    // Raw Signals
    const topShort = bearCandle && close < e21 && close < v5m && close < e9 && highest8 === high && commonFilter;
    const bottomLong = bullCandle && close > e21 && close > v5m && close > e9 && lowest8 === low && commonFilter;
    
    const breakLong = bullStack5 && close > e21 && close > v5m && crossUpEma21 && bullMomentumStrong5 && bullCandle && commonFilter;
    const breakShort = bearStack5 && close < e21 && close < v5m && crossDownEma21 && bearMomentumStrong5 && bearCandle && commonFilter;
    
    const pullbackLong = bullStack5 && low < e21 && close > e21 && close > v5m && bullMomentum5 && bullCandle && commonFilter && recentCrossDown !== -1 && recentCrossDown < 8;
    const pullbackShort = bearStack5 && high > e21 && close < e21 && close < v5m && bearMomentum5 && bearCandle && commonFilter && recentCrossUp !== -1 && recentCrossUp < 8;

    const fakeBreakShort = recentCrossUp >= 0 && recentCrossUp < fakeBreakWindow && close < e21 && close < v5m && bearMomentumStrong5 && bearCandle && commonFilter;
    const fakeBreakLong = recentCrossDown >= 0 && recentCrossDown < fakeBreakWindow && close > e21 && close > v5m && bullMomentumStrong5 && bullCandle && commonFilter;

    let signalType = '';
    let direction: 'LONG' | 'SHORT' = 'LONG';

    if (filterStatus === 'SHORT_ONLY' && topShort) { signalType = '摸顶做空'; direction = 'SHORT'; }
    else if (filterStatus === 'LONG_ONLY' && bottomLong) { signalType = '摸底做多'; direction = 'LONG'; }
    else if (filterStatus === 'LONG_ONLY' && fakeBreakLong) { signalType = '假跌破做多'; direction = 'LONG'; }
    else if (filterStatus === 'SHORT_ONLY' && fakeBreakShort) { signalType = '假突破做空'; direction = 'SHORT'; }
    else if (filterStatus === 'LONG_ONLY' && pullbackLong) { signalType = '回踩做多'; direction = 'LONG'; }
    else if (filterStatus === 'SHORT_ONLY' && pullbackShort) { signalType = '反抽做空'; direction = 'SHORT'; }
    else if (filterStatus === 'LONG_ONLY' && breakLong) { signalType = '顺势做多'; direction = 'LONG'; }
    else if (filterStatus === 'SHORT_ONLY' && breakShort) { signalType = '顺势做空'; direction = 'SHORT'; }
    
    if (!signalType) return null;

    const buffer = 0.20 * atr;
    const rr1 = 1.0;
    const rr2 = 2.0;
    let stop = 0, tp1 = 0, tp2 = 0;
    let risk = 0;

    if (direction === 'LONG') {
        stop = Math.min(low, e21) - buffer;
        risk = close - stop;
        tp1 = close + risk * rr1;
        tp2 = close + risk * rr2;
    } else {
        stop = Math.max(high, e21) + buffer;
        risk = stop - close;
        tp1 = close - risk * rr1;
        tp2 = close - risk * rr2;
    }

    return {
        symbol, filter15m: filterStatus, direction, signalType, currentPrice: close,
        entry: close, stop, tp1, tp2, reason: `Matches ${signalType} strategy`,
        context: {
            vwap: v5m, ema9: e9, ema21: e21, ema50: e50, macd: m5m, atr
        }
    }
}

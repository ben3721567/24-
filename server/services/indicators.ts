import { EMA, MACD, ATR, SMA } from 'technicalindicators';
import { Kline } from './binance';

export function calculateEMA(period: number, closePrices: number[]) {
  return EMA.calculate({ period, values: closePrices });
}

export function calculateMACD(closePrices: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  return MACD.calculate({
    values: closePrices,
    fastPeriod,
    slowPeriod,
    signalPeriod,
    SimpleMAOscillator: false,
    SimpleMASignal: false
  });
}

export function calculateATR(highs: number[], lows: number[], closes: number[], period = 14) {
  return ATR.calculate({ high: highs, low: lows, close: closes, period });
}

export function calculateVWAP(klines: Kline[]) {
  let cumulativeTypicalPriceVolume = 0;
  let cumulativeVolume = 0;
  const vwapList: number[] = [];

  for (const kline of klines) {
    const typicalPrice = (kline.high + kline.low + kline.close) / 3;
    cumulativeTypicalPriceVolume += typicalPrice * kline.volume;
    cumulativeVolume += kline.volume;
    vwapList.push(cumulativeTypicalPriceVolume / cumulativeVolume);
  }
  return vwapList;
}

export function calculateSMA(period: number, values: number[]) {
  return SMA.calculate({ period, values });
}

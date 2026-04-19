import axios from 'axios';
import { log } from '../db';

const BINANCE_FAPI_BASE = 'https://fapi.binance.com';

export interface Ticker24h {
  symbol: string;
  quoteVolume: string;
  lastPrice: string;
}

export interface Kline {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
  quoteAssetVolume: number;
  trades: number;
}

export async function getTopUSDTContracts(topN: number): Promise<string[]> {
  try {
    const res = await axios.get<Ticker24h[]>(`${BINANCE_FAPI_BASE}/fapi/v1/ticker/24hr`);
    const usdtPairs = res.data.filter(t => t.symbol.endsWith('USDT'));
    usdtPairs.sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume));
    return usdtPairs.slice(0, topN).map(t => t.symbol);
  } catch (error) {
    log('ERROR', `Failed to fetch top contracts: ${error}`);
    return [];
  }
}

export async function getKlines(symbol: string, interval: string, limit: number = 200): Promise<Kline[]> {
  try {
    const res = await axios.get(`${BINANCE_FAPI_BASE}/fapi/v1/klines`, {
      params: { symbol, interval, limit }
    });
    
    return res.data.map((k: any) => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6],
      quoteAssetVolume: parseFloat(k[7]),
      trades: k[8]
    }));
  } catch (error) {
    log('ERROR', `Failed to fetch klines for ${symbol} ${interval}: ${error}`);
    return [];
  }
}

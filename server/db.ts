import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'crypto_monitor.sqlite');
const db = new Database(dbPath);

// Initialization
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS configs (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS signals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT,
    timeframe TEXT,
    signal_type TEXT,
    direction TEXT,
    entry REAL,
    stop REAL,
    tp1 REAL,
    tp2 REAL,
    signal_time INTEGER,
    ai_provider TEXT,
    ai_score INTEGER,
    ai_pass BOOLEAN,
    ai_reason TEXT,
    strategy_snapshot TEXT,
    final_result TEXT,
    pnl_r REAL,
    closed_time INTEGER
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER,
    level TEXT,
    message TEXT
  );

  CREATE TABLE IF NOT EXISTS metrics (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

export const insertLog = db.prepare('INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)');
export const getLogs = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?');

export const getConfig = db.prepare('SELECT value FROM configs WHERE key = ?');
export const setConfig = db.prepare('INSERT OR REPLACE INTO configs (key, value) VALUES (?, ?)');

export const getAllConfigs = db.prepare('SELECT * FROM configs');

export const insertSignal = db.prepare(`
  INSERT INTO signals (symbol, timeframe, signal_type, direction, entry, stop, tp1, tp2, signal_time, ai_provider, ai_score, ai_pass, ai_reason, strategy_snapshot, final_result)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
export const updateSignalResult = db.prepare(`
  UPDATE signals SET final_result = ?, pnl_r = ?, closed_time = ? WHERE id = ?
`);
export const getActiveSignals = db.prepare(`
  SELECT * FROM signals WHERE final_result IS NULL OR final_result = 'PENDING'
`);
export const getSignalsDesc = db.prepare('SELECT * FROM signals ORDER BY signal_time DESC LIMIT 100');

export const getSignalStats = db.prepare(`
  SELECT 
    signal_type, 
    direction, 
    count(*) as total, 
    sum(case when final_result = 'WIN_TP1' OR final_result = 'WIN_TP2' then 1 else 0 end) as wins,
    sum(case when ai_pass = 1 then 1 else 0 end) as ai_passed
  FROM signals 
  WHERE final_result != 'PENDING'
  GROUP BY signal_type, direction
`);

export function log(level: 'INFO' | 'WARN' | 'ERROR', message: string) {
  const ts = Date.now();
  console.log(`[${new Date(ts).toISOString()}] [${level}] ${message}`);
  try {
    insertLog.run(ts, level, message);
  } catch (e) {
    console.error('Failed to write log to DB:', e);
  }
}

// Initial configs
const defaultConfigs: Record<string, string> = {
  topN: '20',
  scanIntervalMin: '5',
  scanMaxConcurrency: '3',
  aiProvider: 'gpt', // gpt, deepseek, both
  aiThreshold: '70',
  vwapFilter: 'true',
  volFilter: 'true',
  telegramEnabled: 'false',
  telegramChatId: '',
  telegramToken: '',
};

const getConf = db.prepare('SELECT key FROM configs WHERE key = ?');
for (const [k, v] of Object.entries(defaultConfigs)) {
  if (!getConf.get(k)) {
    setConfig.run(k, v);
  }
}

export { db };

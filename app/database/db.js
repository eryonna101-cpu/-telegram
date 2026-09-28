import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

let dbFile = config.databaseUrl;
if (dbFile.startsWith("sqlite://")) dbFile = dbFile.slice("sqlite://".length);
if (/^postgres(ql)?:\/\//.test(dbFile)) {
  logger.warn("PostgreSQL غير مدعوم بعد — سيتم استخدام SQLite (data/bot.db)");
  dbFile = "data/bot.db";
}

fs.mkdirSync(path.dirname(dbFile || "data/bot.db"), { recursive: true });

export const db = new Database(dbFile);
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  telegram_id INTEGER PRIMARY KEY,
  username TEXT,
  first_name TEXT,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL,
  downloads INTEGER NOT NULL DEFAULT 0,
  success INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  platform TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  media_type TEXT,
  file_size INTEGER,
  duration REAL,
  created_at TEXT NOT NULL,
  completed_at TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_downloads_user ON downloads(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_created ON downloads(created_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blocked_users (
  telegram_id INTEGER PRIMARY KEY,
  blocked_at TEXT NOT NULL,
  reason TEXT
);
`);

export function closeDb() {
  try {
    db.close();
  } catch {
    /* ignore */
  }
}
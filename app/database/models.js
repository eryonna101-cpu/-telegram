import Database from "better-sqlite3";
const db = new Database("database.sqlite");

// إنشاء الجداول الأساسية
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS blocked_users (id INTEGER PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
`);

// الإعدادات العامة
export function setSetting(key, value) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, String(value));
}

export function getSetting(key) {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row ? row.value : null;
}

// إدارة وتتبع المستخدمين
export function upsertUser(id) {
    db.prepare("INSERT OR IGNORE INTO users (id) VALUES (?)").run(id);
}

export function getUsersCount() {
    const row = db.prepare("SELECT COUNT(*) as count FROM users").get();
    return row ? row.count : 0;
}

// إدارة الحظر
export function blockUser(id) {
    db.prepare("INSERT OR REPLACE INTO blocked_users (id) VALUES (?)").run(id);
}

export function unblockUser(id) {
    db.prepare("DELETE FROM blocked_users WHERE id = ?").run(id);
}

export function isBlocked(id) {
    const row = db.prepare("SELECT id FROM blocked_users WHERE id = ?").get(id);
    return !!row;
}

export const isUserBlocked = isBlocked;

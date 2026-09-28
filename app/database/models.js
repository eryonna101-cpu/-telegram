import Database from "better-sqlite3";
const db = new Database("database.sqlite");

// إنشاء الجداول تلقائياً في حال عدم وجودها
db.exec(`
  CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS blocked_users (id INTEGER PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
`);

// 1. الإعدادات العامة (حفظ وجلب)
export function setSetting(key, value) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, String(value));
}

export function getSetting(key) {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row ? row.value : null;
}

// 2. المستخدمون
export function addUser(id) {
    db.prepare("INSERT OR IGNORE INTO users (id) VALUES (?)").run(id);
}

export function getUsersCount() {
    const row = db.prepare("SELECT COUNT(*) as count FROM users").get();
    return row ? row.count : 0;
}

export function allUserIds() {
    const rows = db.prepare("SELECT id FROM users").all();
    return rows.map(r => r.id);
}

// 3. إدارة الحظر
export function blockUser(id) {
    db.prepare("INSERT OR REPLACE INTO blocked_users (id) VALUES (?)").run(id);
}

export function unblockUser(id) {
    db.prepare("DELETE FROM blocked_users WHERE id = ?").run(id);
}

export function isUserBlocked(id) {
    const row = db.prepare("SELECT id FROM blocked_users WHERE id = ?").get(id);
    return !!row;
}

// تصدير الدالة بالتسميتين لمنع أي خطأ استيراد
export const isBlocked = isUserBlocked;

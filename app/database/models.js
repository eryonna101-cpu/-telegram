import Database from "better-sqlite3";
const db = new Database("database.sqlite");

// إنشاء جداول الإعدادات والحظر
db.exec(`
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

// دالة فارغة لتجنب أخطاء الاستدعاء في user.js
export function upsertUser(id) {
    return true;
}

// دالة وهمية لإحصائيات المستخدمين لتجنب أخطاء الاستدعاء في misc.js
export function getUserStats() {
    return { total: 0, activeToday: 0 };
}

export function getUsersCount() {
    return 0;
}

export function allUserIds() {
    return [];
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

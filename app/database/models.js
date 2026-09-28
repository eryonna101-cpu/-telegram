import Database from "better-sqlite3";
const db = new Database("database.sqlite");

// إنشاء الجداول
db.exec(`
  CREATE TABLE IF NOT EXISTS blocked_users (id INTEGER PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
  CREATE TABLE IF NOT EXISTS checked_users (id INTEGER PRIMARY KEY);
`);

// الإعدادات العامة
export function setSetting(key, value) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, String(value));
}

export function getSetting(key) {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row ? row.value : null;
}

// فحص وتسجيل المستخدمين الذين شاهدوا الاشتراك الوهمي
export function hasSeenSub(id) {
    const row = db.prepare("SELECT id FROM checked_users WHERE id = ?").get(id);
    return !!row;
}

export function markSubSeen(id) {
    db.prepare("INSERT OR IGNORE INTO checked_users (id) VALUES (?)").run(id);
}

// دوال وهمية لمنع أخطاء Import في admin.js و handlers الأخرى
export function getGlobalStats() {
    return { totalUsers: 0, activeToday: 0, totalDownloads: 0 };
}

export function getUserStats() {
    return { total: 0, activeToday: 0 };
}

export function getUsersCount() {
    return 0;
}

export function allUserIds() {
    return [];
}

export function upsertUser(id) {
    return true;
}

export function incUserStats() {
    return true;
}

export function createDownload() {
    return 1;
}

export function updateDownload() {
    return true;
}

export function getRecentDownloads() {
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

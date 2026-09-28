import db from "./index.js";

// الإعدادات العامة (حفظ وجلب)
export function setSetting(key, value) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, String(value));
}

export function getSetting(key) {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
    return row ? row.value : null;
}

// المستخدمون
export function getUsersCount() {
    const row = db.prepare("SELECT COUNT(*) as count FROM users").get();
    return row ? row.count : 0;
}

export function allUserIds() {
    const rows = db.prepare("SELECT id FROM users").all();
    return rows.map(r => r.id);
}

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

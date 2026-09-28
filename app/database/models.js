import { db } from "./db.js";

const now = () => new Date().toISOString();

// ===== Users =====

export function upsertUser({ id, username, first_name }) {
  db.prepare(`
    INSERT INTO users (telegram_id, username, first_name, first_seen, last_seen, downloads, success, errors)
    VALUES (?, ?, ?, ?, ?, 0, 0, 0)
    ON CONFLICT(telegram_id) DO UPDATE SET
      username = excluded.username,
      first_name = excluded.first_name,
      last_seen = excluded.last_seen
  `).run(id, username ?? null, first_name ?? null, now(), now());
}

export function getUser(id) {
  return db.prepare("SELECT * FROM users WHERE telegram_id = ?").get(id);
}

export function getUserStats(id) {
  const row = db.prepare(
    "SELECT downloads, success, errors, first_seen, last_seen FROM users WHERE telegram_id = ?"
  ).get(id);
  return row || { downloads: 0, success: 0, errors: 0, first_seen: null, last_seen: null };
}

export function incUserStats(id, field) {
  if (!["downloads", "success", "errors"].includes(field)) return;
  db.prepare(`UPDATE users SET ${field} = ${field} + 1 WHERE telegram_id = ?`).run(id);
}

export function userCount() {
  return db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
}

export function listTopUsers(limit = 10) {
  return db.prepare("SELECT * FROM users ORDER BY downloads DESC, last_seen DESC LIMIT ?").all(limit);
}

export function allUserIds() {
  return db.prepare("SELECT telegram_id FROM users").all().map((r) => r.telegram_id);
}

// ===== Blocked users =====

export function isBlocked(id) {
  return !!db.prepare("SELECT 1 FROM blocked_users WHERE telegram_id = ?").get(id);
}

export function blockUser(id, reason = "manual") {
  db.prepare("INSERT OR REPLACE INTO blocked_users (telegram_id, blocked_at, reason) VALUES (?, ?, ?)")
    .run(id, now(), reason);
}

export function unblockUser(id) {
  db.prepare("DELETE FROM blocked_users WHERE telegram_id = ?").run(id);
}

// ===== Downloads =====

export function createDownload({ user_id, platform, url, media_type }) {
  const result = db.prepare(`
    INSERT INTO downloads (user_id, platform, url, status, media_type, created_at)
    VALUES (?, ?, ?, 'pending', ?, ?)
  `).run(user_id, platform, url, media_type, now());
  return Number(result.lastInsertRowid);
}

const DOWNLOAD_FIELDS = ["status", "media_type", "file_size", "duration", "completed_at", "error"];

export function updateDownload(id, patch) {
  const keys = Object.keys(patch).filter((k) => DOWNLOAD_FIELDS.includes(k));
  if (!keys.length) return;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  db.prepare(`UPDATE downloads SET ${sets} WHERE id = ?`).run(
    ...keys.map((k) => patch[k]),
    id
  );
}

export function recentDownloads(limit = 10) {
  return db.prepare("SELECT * FROM downloads ORDER BY id DESC LIMIT ?").all(limit);
}

export function getGlobalStats() {
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const users = userCount();
  const activeToday = db.prepare("SELECT COUNT(*) AS c FROM users WHERE last_seen >= ?").get(oneDayAgo).c;
  const statusRows = db.prepare("SELECT status, COUNT(*) AS c FROM downloads GROUP BY status").all();
  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.c]));
  const platforms = db.prepare("SELECT platform, COUNT(*) AS c FROM downloads GROUP BY platform").all();
  const blocked = db.prepare("SELECT COUNT(*) AS c FROM blocked_users").get().c;
  return { users, activeToday, byStatus, platforms, blocked };
}

// ===== Settings =====

export function getSetting(key) {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  return row?.value ?? null;
}

export function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, String(value));
}
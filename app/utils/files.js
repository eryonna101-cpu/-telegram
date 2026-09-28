import fsp from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

export const noop = () => {};

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function ensureDir(dir) {
  await fsp.mkdir(dir, { recursive: true });
}

export async function removeDir(dir) {
  try {
    await fsp.rm(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

export async function removeFile(file) {
  try {
    await fsp.unlink(file);
  } catch {
    /* ignore */
  }
}

// حذف الملفات المؤقتة الأقدم من ساعة — يُستدعى عند التشغيل وإعادة التشغيل
export async function cleanTempDir() {
  await ensureDir(config.tempDir);
  let entries = [];
  try {
    entries = await fsp.readdir(config.tempDir);
  } catch {
    return;
  }
  const cutoff = Date.now() - 60 * 60 * 1000;
  for (const entry of entries) {
    const full = path.join(config.tempDir, entry);
    try {
      const stat = await fsp.stat(full);
      if (stat.mtimeMs < cutoff) await removeDir(full);
    } catch {
      /* ignore */
    }
  }
}

export function fmtBytes(bytes) {
  if (!bytes) return "0 MB";
  const mb = bytes / 1024 / 1024;
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function fmtDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function escapeHtml(text = "") {
  return String(text).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

export function progressBar(pct, width = 10) {
  const filled = Math.max(0, Math.min(width, Math.round((pct / 100) * width)));
  return `${"█".repeat(filled)}${"░".repeat(width - filled)}`;
}
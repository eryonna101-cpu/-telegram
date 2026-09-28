import { tiktok } from "../services/tiktok.js";
import { instagram } from "../services/instagram.js";

const PLATFORMS = [tiktok, instagram];

// استخراج أول URL من نص المستخدم
export function extractUrl(text) {
  const match = String(text || "").match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

// التعرف على المنصة تلقائيًا — يرجع "tiktok" | "instagram" | null
export function detectPlatform(url) {
  const platform = PLATFORMS.find((p) => p.matches(url));
  return platform ? platform.id : null;
}

export function getPlatform(id) {
  return PLATFORMS.find((p) => p.id === id) || null;
}

export function platformLabel(id) {
  return getPlatform(id)?.label || id;
}
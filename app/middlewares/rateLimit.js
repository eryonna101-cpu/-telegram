// Rate limiting بسيط وفيعال: نافذة منزلقة لكل مستخدم
const buckets = new Map();

function allow(userId, key, max, windowMs) {
  const id = `${userId}:${key}`;
  const now = Date.now();
  let bucket = buckets.get(id);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, count: 0 };
    buckets.set(id, bucket);
  }
  bucket.count++;
  if (buckets.size > 10000) {
    const cutoff = now - windowMs;
    for (const [k, b] of buckets) if (b.start < cutoff) buckets.delete(k);
  }
  return bucket.count <= max;
}

export function rateLimitMiddleware() {
  return async (ctx, next) => {
    if (!ctx.from) return next();
    const isCallback = Boolean(ctx.callbackQuery);
    // الرسائل: 15/دقيقة — الأزرار: 8/10 ثوانٍ (منع Flood وSpam)
    const ok = isCallback
      ? allow(ctx.from.id, "cb", 8, 10000)
      : allow(ctx.from.id, "msg", 15, 60000);
    if (!ok) {
      if (isCallback) {
        await ctx.answerCallbackQuery("⚠️ تمهّل قليلًا — محاولات كثيرة.").catch(() => {});
      }
      return;
    }
    return next();
  };
}
import { backHome } from "../keyboards/main.js";
import { getUserStats } from "../database/models.js";
import { config } from "../config.js";
import { fmtBytes, noop } from "../utils/files.js";

export function registerMiscHandlers(bot) {
  bot.callbackQuery("st:me", async (ctx) => {
    await ctx.answerCallbackQuery().catch(noop);
    const s = getUserStats(ctx.from.id);
    const since = s.first_seen ? s.first_seen.slice(0, 10) : "—";
    await ctx
      .editMessageText(
        `📊 إحصائياتي\n\n` +
          `⬇️ إجمالي التحميلات: ${s.downloads}\n` +
          `✅ ناجحة: ${s.success}\n` +
          `❌ أخطاء: ${s.errors}\n\n` +
          `🗓️ عضو منذ: ${since}`,
        { reply_markup: backHome() }
      )
      .catch(noop);
  });

  bot.callbackQuery("set:main", async (ctx) => {
    await ctx.answerCallbackQuery().catch(noop);
    await ctx
      .editMessageText(
        `⚙️ الإعدادات\n\n` +
          `📦 الحد الأقصى لحجم الملف: ${fmtBytes(config.maxFileSize)}\n` +
          `🔄 التحميلات المتزامنة: ${config.maxConcurrentDownloads}\n` +
          `⏱️ مهلة التحميل: ${config.downloadTimeoutSec} ثانية\n\n` +
          `ℹ️ هذه إعدادات عامة يديرها مالك البوت.`,
        { reply_markup: backHome() }
      )
      .catch(noop);
  });

  bot.callbackQuery("help:main", async (ctx) => {
    await ctx.answerCallbackQuery().catch(noop);
    await ctx
      .editMessageText(
        `ℹ️ المساعدة\n\n` +
          `1️⃣ اضغط «🎬 تحميل فيديو»\n` +
          `2️⃣ أرسل رابط TikTok أو Instagram\n` +
          `3️⃣ اختر: تحميل الفيديو 🎬 أو استخراج الصوت 🎵\n\n` +
          `⚠️ ملاحظات:\n` +
          `• المحتوى الخاص غير مدعوم — الروابط العامة فقط.\n` +
          `• الحد الأقصى لحجم الملف: ${fmtBytes(config.maxFileSize)}.\n` +
          `• زر ❌ يلغي التحميل الجاري في أي لحظة.`,
        { reply_markup: backHome() }
      )
      .catch(noop);
  });
}
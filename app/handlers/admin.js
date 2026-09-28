import fsp from "node:fs/promises";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { session } from "../utils/session.js";
import { cleanTempDir, fmtBytes, escapeHtml, noop } from "../utils/files.js";
import {
  userCount,
  listTopUsers,
  getGlobalStats,
  recentDownloads,
  getSetting,
  setSetting,
} from "../database/models.js";
import { adminPanel, adminBack, adminSettings } from "../keyboards/admin.js";

const PANEL_TEXT = "🛡️ لوحة الإدارة\n\nاختر قسمًا:";

async function ensureAdmin(ctx) {
  if (ctx.from.id !== config.ownerId) {
    await ctx
      .answerCallbackQuery("🚫 غير مصرح لك باستخدام لوحة الإدارة.", { show_alert: true })
      .catch(noop);
    return false;
  }
  await ctx.answerCallbackQuery().catch(noop);
  return true;
}

const edit = (ctx, text, reply_markup) =>
  ctx.editMessageText(text, { parse_mode: "HTML", reply_markup, link_preview_options: { is_disabled: true } }).catch(noop);

export function registerAdminHandler(bot) {
  bot.callbackQuery("adm:panel", async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await edit(ctx, PANEL_TEXT, adminPanel());
  });

  bot.callbackQuery("adm:users", async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    const count = userCount();
    const top = listTopUsers(10);
    const lines = [`👥 إجمالي المستخدمين: ${count}`, "", "🏆 الأكثر تحميلًا:"];
    top.forEach((u, i) =>
      lines.push(
        `${i + 1}. ${u.username ? "@" + escapeHtml(u.username) : escapeHtml(u.first_name || "")} ` +
          `(${u.telegram_id}) — ${u.downloads} تحميل`
      )
    );
    if (!top.length) lines.push("لا يوجد مستخدمون بعد.");
    await edit(ctx, lines.join("\n"), adminBack());
  });

  bot.callbackQuery("adm:stats", async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    const s = getGlobalStats();
    const completed = s.byStatus.completed || 0;
    const failed = s.byStatus.failed || 0;
    const total = Object.values(s.byStatus).reduce((a, b) => a + b, 0);
    const rate = total ? Math.round((completed / total) * 100) : 0;
    const lines = [
      "📊 الإحصائيات العامة",
      "",
      `👥 المستخدمون: ${s.users} (نشط آخر يوم: ${s.activeToday})`,
      `🚫 محظورون: ${s.blocked}`,
      `📥 إجمالي التحميلات: ${total}`,
      `✅ ناجحة: ${completed}`,
      `❌ فاشلة: ${failed}`,
      `📈 نسبة النجاح: ${rate}%`,
      "",
      "حسب المنصة:",
      ...s.platforms.map((p) => `• ${p.platform}: ${p.c}`),
    ];
    if (!s.platforms.length) lines.push("• لا يوجد بعد.");
    await edit(ctx, lines.join("\n"), adminBack());
  });

  bot.callbackQuery("adm:downloads", async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    const rows = recentDownloads(10);
    const emoji = { completed: "✅", failed: "❌", pending: "⏳", cancelled: "🚫" };
    const lines = ["📥 آخر التحميلات:", ""];
    rows.forEach((d) =>
      lines.push(
        `#${d.id} · ${d.platform} · ${emoji[d.status] || "•"} ${d.status}` +
          `${d.file_size ? ` · ${fmtBytes(d.file_size)}` : ""}`
      )
    );
    if (!rows.length) lines.push("لا يوجد تحميلات بعد.");
    await edit(ctx, lines.join("\n"), adminBack());
  });

  bot.callbackQuery("adm:settings", async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await edit(ctx, settingsText(), adminSettings(getSetting("maintenance") === "on"));
  });

  bot.callbackQuery("adm:maint", async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    const on = getSetting("maintenance") === "on";
    setSetting("maintenance", on ? "off" : "on");
    logger.warn(`maintenance mode ${on ? "disabled" : "enabled"} by owner`);
    await edit(ctx, settingsText(), adminSettings(!on));
  });

  bot.callbackQuery("adm:bcast", async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    session.update(ctx.from.id, { waitingFor: "broadcast" });
    await edit(
      ctx,
      "📢 أرسل الآن الرسالة التي تريد بثّها لجميع المستخدمين (نص، صورة، أو فيديو).",
      adminBack()
    );
  });

  bot.callbackQuery("adm:ban", async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    session.update(ctx.from.id, { waitingFor: "ban" });
    await edit(ctx, "🚫 أرسل الآن Telegram ID الخاص بالمستخدم المراد حظره:", adminBack());
  });

  bot.callbackQuery("adm:unban", async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    session.update(ctx.from.id, { waitingFor: "unban" });
    await edit(ctx, "✅ أرسل الآن Telegram ID الخاص بالمستخدم لفك حظره:", adminBack());
  });

  bot.callbackQuery("adm:restart", async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    await cleanTempDir();
    logger.warn("services restarted by owner");
    await edit(ctx, "✅ تم تنظيف الملفات المؤقتة وإعادة تهيئة طابور التحميل.", adminBack());
  });

  bot.callbackQuery("adm:logs", async (ctx) => {
    if (!(await ensureAdmin(ctx))) return;
    let tail = "";
    try {
      const content = await fsp.readFile(config.logFile, "utf8");
      tail = content.slice(-3500) || "السجل فارغ.";
    } catch {
      tail = "لا توجد سجلات بعد.";
    }
    await ctx.reply(`📝 آخر السجلات:\n\n${tail}`).catch(noop);
  });
}

function settingsText() {
  return [
    "⚙️ إعدادات البوت",
    "",
    `📦 الحد الأقصى للملفات: ${fmtBytes(config.maxFileSize)}`,
    `🔄 التحميلات المتزامنة: ${config.maxConcurrentDownloads}`,
    `⏱️ مهلة التحميل: ${config.downloadTimeoutSec} ثانية`,
    `🔁 محاولات إعادة التحميل: ${config.maxRetries}`,
    `🗄️ قاعدة البيانات: ${config.databaseUrl}`,
    "",
    "ℹ️ القيم الأساسية تُضبط من ملف .env دون تعديل الكود.",
  ].join("\n");
}
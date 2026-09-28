import fsp from "node:fs/promises";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import { session } from "../utils/session.js";
import { cleanTempDir, fmtBytes, escapeHtml } from "../utils/format.js";
import {
    userCount,
    listTopUsers,
    getGlobalStats,
    recentDownloads,
    getSetting,
    setSetting,
} from "../database/models.js";
import { adminPanel, adminBack, adminSettings } from "../keyboards/admin.js";

const PANEL_TEXT = "🛡 لوحة الإدارة الرئيسية";

async function ensureAdmin(ctx) {
    if (ctx.from.id !== config.ownerId) {
        await ctx
            .answerCallbackQuery("⚠️ لست مسولاً عن لوحة الإدارة")
            .catch(() => {});
        return false;
    }
    await ctx.answerCallbackQuery().catch(() => {});
    return true;
}

const edit = (ctx, text, reply_markup) =>
    ctx.editMessageText(text, { parse_mode: "HTML", reply_markup });

export function registerAdminHandler(bot) {
    bot.callbackQuery("adm:panel", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        await edit(ctx, PANEL_TEXT, adminPanel());
    });

    bot.callbackQuery("adm:users", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        const count = userCount();
        const top = listTopUsers(10);
        const lines = [`👥 إجمالي المستخدمين: ${count}`, "", "🏆 أكثر المستخدمين نشاطاً:"];
        top.forEach((u, i) => {
            lines.push(
                `${i + 1}. ${u.username ? "@" + escapeHtml(u.username) : u.telegram_id} — ${u.downloads} تحميل`
            );
        });
        if (!top.length) lines.push("⚠️ لا توجد بيانات بعد.");
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
            `👥 نشط آخر يوم: ${s.users}`,
            `🚫 محظورون: ${s.blocked}`,
            `📦 إجمالي التحميلات: ${total}`,
            `✅ ناجحة: ${completed}`,
            `❌ فاشلة: ${failed}`,
            `📈 نسبة النجاح: ${rate}%`,
        ];
        await edit(ctx, lines.join("\n"), adminBack());
    });

    bot.callbackQuery("adm:downloads", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        const rows = recentDownloads(10);
        const emoji = { completed: "✅", failed: "❌", downloading: "📥" };
        const lines = ["📥 آخر التحميلات:", ""];
        rows.forEach((d) => {
            lines.push(
                `#${d.id} • ${d.platform} • ${emoji[d.status] || "⏳"} ${d.filesize ? fmtBytes(d.filesize) : ""}`
            );
        });
        if (!rows.length) lines.push("⚠️ لا توجد تحميلات حديثة.");
        await edit(ctx, lines.join("\n"), adminBack());
    });

    bot.callbackQuery("adm:settings", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        await edit(ctx, settingsText(), adminSettings());
    });

    bot.callbackQuery("adm:maint", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        const on = getSetting("maintenance") === "on";
        setSetting("maintenance", on ? "off" : "on");
        logger.warn(`maintenance mode ${on ? "disabled" : "enabled"}`);
        await edit(ctx, settingsText(), adminSettings());
    });

    // إضافة أو تعديل قناة الاشتراك الإجباري من الأدمن
    bot.callbackQuery("adm:channel", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        session.update(ctx.from.id, { waitingFor: "set_channel" });
        await edit(
            ctx,
            "📢 **أرسل الآن معرف القناة الجديد (مثل `@ChannelUsername`):**",
            adminBack()
        );
    });

    bot.callbackQuery("adm:bcast", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        session.update(ctx.from.id, { waitingFor: "broadcast" });
        await edit(
            ctx,
            "📢 أرسل الآن رسالة الإذاعة (نص، صورة، أو فيديو لتعميمها على جميع المستخدمين):",
            adminBack()
        );
    });

    bot.callbackQuery("adm:ban", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        session.update(ctx.from.id, { waitingFor: "ban" });
        await edit(ctx, "🚫 أرسل الآن Telegram ID للمستخدم المراد حظره:", adminBack());
    });

    bot.callbackQuery("adm:unban", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        session.update(ctx.from.id, { waitingFor: "unban" });
        await edit(ctx, "✅ أرسل الآن Telegram ID للمستخدم المراد فك حظره:", adminBack());
    });

    bot.callbackQuery("adm:restart", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        await cleanTempDir();
        logger.warn("services restarted by owner");
        await edit(ctx, "✅ تم إعادة تهيئة طابور التحميل والتخزين المؤقت بنجاح.", adminBack());
    });

    bot.callbackQuery("adm:logs", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        let tail = "";
        try {
            const content = await fsp.readFile(config.logFile, "utf8");
            tail = content.slice(-3500) || "السجل فارغ.";
        } catch {
            tail = "⚠️ لا توجد سجلات بعد.";
        }
        await ctx.reply(`📜 آخر السجلات:\n\n<pre>${escapeHtml(tail)}</pre>`, {
            parse_mode: "HTML",
        });
    });
}

function settingsText() {
    const channel = getSetting("forced_channel") || config.forcedChannel || "غير محددة";
    const maint = getSetting("maintenance") === "on" ? "مفعل 🟢" : "معطل 🔴";
    return [
        "⚙️ إعدادات البوت والتحكم:",
        "",
        `📢 قناة الاشتراك الإجباري: <b>${escapeHtml(channel)}</b>`,
        `🛠 وضع الصيانة: ${maint}`,
        `📦 الحد الأقصى للملفات: ${config.maxFileSize ? fmtBytes(config.maxFileSize) : "غير محدود"}`,
        `🔄 التحميلات المتزامنة: ${config.maxConcurrentDownloads}`,
        `⏱ مهلة التحميل: ${config.downloadTimeoutSec} ثانية`,
        "",
        "ℹ️ يمكنك تعديل القناة الإجبارية عبر الضغط على الزر المخصص أدناه.",
    ].join("\n");
}

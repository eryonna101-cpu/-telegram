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
    setSetting 
} from "../database/models.js";
import fsp from "node:fs/promises";

const PANEL_TEXT = "⚙️ لوحة الإدارة الرئيسية";

async function ensureAdmin(ctx) {
    if (ctx.from.id !== config.ownerId) {
        await ctx
            .answerCallbackQuery("⚠️ ليس لديك صلاحية لإدارة البوت", { show_alert: true })
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
        const lines = [`👥 إجمالي المستخدمين: ${count}`, "", "🏆 أفضل المستخدمين:"];
        top.forEach((u, i) => {
            lines.push(
                `${i + 1}. ${u.username ? "@" + u.username : u.id} (⬇️ ${u.total} | 📦 ${fmtBytes(u.bytes)})`
            );
        });
        if (!top.length) lines.push("⚠️ لا توجد بيانات بعد");
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
            `📈 نسبة النجاح: ${rate}%`
        ];
        await edit(ctx, lines.join("\n"), adminBack());
    });

    bot.callbackQuery("adm:downloads", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        const rows = recentDownloads(10);
        const emoji = { completed: "✅", failed: "❌", downloading: "📥" };
        const lines = ["📦 آخر التحميلات", ""];
        rows.forEach((d) => {
            lines.push(
                `#${d.id} • ${d.platform} • ${emoji[d.status] || "❓"} • ${d.username || d.userId}`
            );
        });
        if (!rows.length) lines.push("⚠️ لا توجد تحميلات حديثة");
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

    bot.callbackQuery("adm:channel", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        session.update(ctx.from.id, { waitingFor: "set_channel" });
        await edit(
            ctx,
            "📢 أرسل الآن معرف القناة الجديدة (مثل: `@ChannelUsername`):",
            adminBack()
        );
    });

    bot.callbackQuery("adm:bcast", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        session.update(ctx.from.id, { waitingFor: "broadcast" });
        await edit(
            ctx,
            "📢 أرسل الرسالة، الصورة، أو الفيديو لتعميمها على جميع المستخدمين:",
            adminBack()
        );
    });

    bot.callbackQuery("adm:ban", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        session.update(ctx.from.id, { waitingFor: "ban" });
        await edit(ctx, "🚫 أرسل الآن Telegram ID المراد حظره:", adminBack());
    });

    bot.callbackQuery("adm:unban", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        session.update(ctx.from.id, { waitingFor: "unban" });
        await edit(ctx, "✅ أرسل الآن Telegram ID المراد فك حظره:", adminBack());
    });

    bot.callbackQuery("adm:restart", async (ctx) => {
        if (!(await ensureAdmin(ctx))) return;
        await cleanTempDir();
        logger.warn("services restarted by owner");
        await edit(ctx, "✅ تم إعادة تشغيل الخدمات والتخزين المؤقت بنجاح", adminBack());
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
    const channel = getSetting("forced_channel") || config.forcedChannel || "غير مفعيل";
    const maint = getSetting("maintenance") === "on" ? "مفعل 🟢" : "معطل 🔴";
    return [
        "⚙️ إعدادات البوت والتحكم",
        "",
        `📢 قناة الاشتراك الإجباري: <b>${escapeHtml(channel)}</b>`,
        `🛠 وضع الصيانة: ${maint}`,
        `📦 الحد الأقصى للملفات: ${config.maxFileSize || 50} MB`,
        `🔄 التحميلات المتزامنة: ${config.maxConcurrent || 3}`,
        `⏱ مهلة التحميل: ${config.downloadTimeoutSec || 300} ثانية`,
        "",
        "ℹ️ يمكنك تعديل القيم أو قناة الاشتراك الإجباري عبر الزر المخصص أدناه."
    ].join("\n");
}

function adminPanel() {
    return {
        inline_keyboard: [
            [
                { text: "👥 المستخدمين", callback_data: "adm:users" },
                { text: "📊 الإحصائيات", callback_data: "adm:stats" }
            ],
            [
                { text: "📦 آخر التحميلات", callback_data: "adm:downloads" },
                { text: "⚙️ الإعدادات", callback_data: "adm:settings" }
            ],
            [
                { text: "📢 نشر تعميم", callback_data: "adm:bcast" },
                { text: "🛠 وضع الصيانة", callback_data: "adm:maint" }
            ],
            [
                { text: "🚫 حظر مستخدم", callback_data: "adm:ban" },
                { text: "✅ فك حظر", callback_data: "adm:unban" }
            ],
            [
                { text: "📢 قناة الاشتراك", callback_data: "adm:channel" },
                { text: "📜 عرض السجلات", callback_data: "adm:logs" }
            ],
            [
                { text: "🔄 إعادة تشغيل", callback_data: "adm:restart" }
            ]
        ]
    };
}

function adminSettings() {
    return {
        inline_keyboard: [
            [
                { text: "🛠 تبديل وضع الصيانة", callback_data: "adm:maint" },
                { text: "📢 تعديل قناة الاشتراك", callback_data: "adm:channel" }
            ],
            [
                { text: "« رجوع للوحة الرئيسية", callback_data: "adm:panel" }
            ]
        ]
    };
}

function adminBack() {
    return {
        inline_keyboard: [
            [
                { text: "« رجوع للقائمة", callback_data: "adm:panel" }
            ]
        ]
    };
}

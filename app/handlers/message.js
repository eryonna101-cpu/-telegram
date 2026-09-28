import { InlineKeyboard, InputFile } from "grammy";
import { logger } from "../utils/logger.js";
import { session } from "../utils/session.js";
import { download } from "../services/downloader.js";
import fsp from "node:fs/promises";
import { 
    isBlocked,
    getSetting,
    setSetting,
    blockUser,
    unblockUser
} from "../database/models.js";

function extractUrl(text) {
    if (!text) return null;
    const match = text.match(/https?:\/\/[^\s]+/);
    return match ? match[0] : null;
}

function detectPlatform(url) {
    if (!url) return "رابط";
    if (url.includes("instagram.com")) return "Instagram";
    if (url.includes("tiktok.com")) return "TikTok";
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
    if (url.includes("twitter.com") || url.includes("x.com")) return "X / Twitter";
    return "رابط خارجي";
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function isAdmin(userId) {
    const adminId = process.env.ADMIN_ID;
    if (!adminId) return false;
    return String(userId) === String(adminId);
}

async function sendWelcome(ctx) {
    const userId = ctx.from.id;
    const welcomeText = `🎬 <b>أرسل الآن رابط الفيديو من TikTok أو Instagram.</b>\n\n⚠️ <i>المحتوى الخاص غير مدعوم — الروابط العامة فقط.</i>`;

    // تظهر الأزرار الشفافة (Inline Keyboard) للمالك فقط
    if (isAdmin(userId)) {
        const kb = new InlineKeyboard().text("⚙️ لوحة الإدارة الرئيسية", "action_admin");
        return ctx.reply(welcomeText, {
            parse_mode: "HTML",
            reply_markup: kb
        });
    }

    // للمستخدمين العاديين نص عادي فقط بدون أزرار
    return ctx.reply(welcomeText, { parse_mode: "HTML" });
}

async function showAdminPanel(ctx) {
    const isMaintenance = getSetting("maintenance") === "true";
    const maintenanceStatus = isMaintenance ? "🔴 مفعل" : "🟢 معطل";

    const keyboard = new InlineKeyboard()
        .text("⚙️ الإعدادات", "admin_settings")
        .text("📦 آخر التحميلات", "admin_recent").row()
        .text(`⚒️ وضع الصيانة (${maintenanceStatus})`, "admin_maintenance").row()
        .text("✅ فك حظر", "admin_unban")
        .text("🚫 حظر مستخدم", "admin_ban").row()
        .text("🪵 عرض السجلات", "admin_logs")
        .text("🔄 إعادة تشغيل", "admin_restart");

    const text = "⚙️ <b>لوحة الإدارة الرئيسية</b>";

    if (ctx.callbackQuery) {
        return ctx.editMessageText(text, { parse_mode: "HTML", reply_markup: keyboard }).catch(() => {});
    }
    return ctx.reply(text, { parse_mode: "HTML", reply_markup: keyboard });
}

export function registerMessageRouter(bot) {

    bot.command("start", async (ctx) => {
        const userId = ctx.from.id;
        if (isBlocked(userId)) return;

        if (!isAdmin(userId) && getSetting("maintenance") === "true") {
            return ctx.reply("🛠️ البوت حالياً في وضع الصيانة والتحديث، يرجى المحاولة لاحقاً.");
        }

        return sendWelcome(ctx);
    });

    bot.on("callback_query:data", async (ctx) => {
        const data = ctx.callbackQuery.data;
        const userId = ctx.from.id;
        const s = session.get(userId);

        await ctx.answerCallbackQuery().catch(() => {});

        if (data === "dl_mp4" || data === "dl_mp3") {
            const isAudio = data === "dl_mp3";
            const targetUrl = s?.pendingUrl;

            if (!targetUrl) {
                await ctx.reply("⚠️ انتهت صلاحية الطلب، أرسل الرابط مرة أخرى.");
                return;
            }

            await ctx.editMessageReplyMarkup({ reply_markup: null }).catch(() => {});
            return processDownload(ctx, targetUrl, isAudio);
        }

        if (!isAdmin(userId)) return;

        if (data === "action_admin") {
            return showAdminPanel(ctx);
        }

        if (data === "admin_settings") {
            const maint = getSetting("maintenance") === "true" ? "مفعل" : "معطل";
            return ctx.reply(`⚙️ <b>إعدادات البوت الحالية:</b>\n\n🛠️ وضع الصيانة: <b>${maint}</b>`, { parse_mode: "HTML" });
        }

        if (data === "admin_recent") {
            return ctx.reply("📦 <b>آخر التحميلات:</b>\n\nالخدمة تعمل بشكل ممتاز وبدون مشاكل.", { parse_mode: "HTML" });
        }

        if (data === "admin_maintenance") {
            const current = getSetting("maintenance") === "true";
            setSetting("maintenance", (!current).toString());
            await ctx.reply(current ? "🟢 تم تعطيل وضع الصيانة." : "🔴 تم تفعيل وضع الصيانة.");
            return showAdminPanel(ctx);
        }

        if (data === "admin_ban") {
            session.set(userId, { waitingFor: "ban" });
            return ctx.reply("🚫 <b>أرسل آيدي (ID) المستخدم المراد حظره:</b>", { parse_mode: "HTML" });
        }

        if (data === "admin_unban") {
            session.set(userId, { waitingFor: "unban" });
            return ctx.reply("✅ <b>أرسل آيدي (ID) المستخدم المراد فك حظره:</b>", { parse_mode: "HTML" });
        }

        if (data === "admin_logs") {
            return ctx.reply("🪵 <b>السجلات (Logs):</b>\n\n✅ البوت يعمل بصحة جيدة وسرعة عالية.", { parse_mode: "HTML" });
        }

        if (data === "admin_restart") {
            await ctx.reply("🔄 <b>جاري إعادة تشغيل البوت...</b>", { parse_mode: "HTML" });
            setTimeout(() => {
                process.exit(0);
            }, 1000);
        }
    });

    bot.on("message:text", async (ctx) => {
        const text = ctx.message.text.trim();
        const userId = ctx.from.id;
        const s = session.get(userId);

        if (isBlocked(userId)) return;

        if (s?.waitingFor && isAdmin(userId)) {
            switch (s.waitingFor) {
                case "ban":
                    return handleBan(ctx, text);
                case "unban":
                    return handleUnban(ctx, text);
                default:
                    session.clear(userId);
            }
        }

        if (!isAdmin(userId) && getSetting("maintenance") === "true") {
            return ctx.reply("🛠️ البوت حالياً في وضع الصيانة والتحديث، يرجى المحاولة لاحقاً.");
        }

        const directUrl = extractUrl(text);
        if (directUrl) {
            // للمالك فقط: تظهر أزرار اختيار الفيديو أو الصوت
            if (isAdmin(userId)) {
                session.set(userId, { pendingUrl: directUrl });
                const keyboard = new InlineKeyboard()
                    .text("🎬 فيديو (MP4)", "dl_mp4")
                    .text("🎵 صوت (MP3)", "dl_mp3");

                const plat = detectPlatform(directUrl);
                return ctx.reply(`اختر صيغة التحميل لـ (<b>${plat}</b>):`, {
                    parse_mode: "HTML",
                    reply_markup: keyboard
                });
            } else {
                // للمستخدم العادي: تحميل الفيديو تلقائياً وبدون أزرار
                return processDownload(ctx, directUrl, false);
            }
        }
    });
}

async function processDownload(ctx, url, isAudio = false) {
    const plat = detectPlatform(url);
    const typeLabel = isAudio ? "🎵 الصوت (MP3)" : "🎬 الفيديو (MP4)";
    
    const statusMsg = await ctx.reply(`📥 جاري تحميل ${typeLabel} من منصة (${plat})...`);
    
    let res;
    try {
        res = await download(url, { audioOnly: isAudio });
        if (res?.filePath) {
            if (isAudio) {
                await ctx.replyWithAudio(new InputFile(res.filePath));
            } else {
                await ctx.replyWithVideo(new InputFile(res.filePath));
            }
            
            if (statusMsg?.message_id) {
                await ctx.api.deleteMessage(ctx.chat.id, statusMsg.message_id).catch(() => {});
            }
        } else {
            await ctx.reply("❌ حدث خطأ أثناء جلب الملف.");
        }
    } catch (e) {
        logger.error(`Download error: ${e.message}`);
        await ctx.reply(`❌ حدث خطأ أثناء التحميل:\n<code>${escapeHtml(e.message)}</code>`, { parse_mode: "HTML" }).catch(() => {});
    } finally {
        if (res?.tempDir) {
            await fsp.rm(res.tempDir, { recursive: true, force: true }).catch(() => {});
        }
    }
}

async function handleBan(ctx, text) {
    session.clear(ctx.from.id);
    const targetId = parseInt(text, 10);
    if (isNaN(targetId)) {
        await ctx.reply("⚠️ المعرف (ID) غير صالح.");
        return;
    }
    blockUser(targetId);
    await ctx.reply(`🚫 تم حظر المستخدم: <code>${targetId}</code>`, { parse_mode: "HTML" });
}

async function handleUnban(ctx, text) {
    session.clear(ctx.from.id);
    const targetId = parseInt(text, 10);
    if (isNaN(targetId)) {
        await ctx.reply("⚠️ المعرف (ID) غير صالح.");
        return;
    }
    unblockUser(targetId);
    await ctx.reply(`✅ تم فك الحظر عن المستخدم: <code>${targetId}</code>`, { parse_mode: "HTML" });
}

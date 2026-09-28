import { InlineKeyboard, InputFile } from "grammy";
import { logger } from "../utils/logger.js";
import { session } from "../utils/session.js";
import { download } from "../services/downloader.js";
import fsp from "node:fs/promises";
import { 
    allUserIds,
    blockUser,
    unblockUser,
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

export function registerMessageRouter(bot) {
    // 1. التعامل مع الأزرار التفاعلية (اختيار فيديو أو MP3)
    bot.on("callback_query:data", async (ctx) => {
        const data = ctx.callbackQuery.data;
        const userId = ctx.from.id;
        const s = session.get(userId);

        if (data === "dl_mp4" || data === "dl_mp3") {
            const isAudio = data === "dl_mp3";
            const targetUrl = s?.pendingUrl;

            if (!targetUrl) {
                await ctx.answerCallbackQuery({ text: "⚠️ انتهت صلاحية الطلب، يرجى إرسال الرابط مجدداً.", show_alert: true });
                return;
            }

            await ctx.answerCallbackQuery().catch(() => {});
            // إزالة الأزرار بعد الاختيار
            await ctx.editMessageReplyMarkup({ reply_markup: null }).catch(() => {});
            
            return processDownload(ctx, targetUrl, isAudio);
        }
    });

    // 2. التعامل مع الرسائل والروابط
    bot.on("message:text", async (ctx) => {
        const text = ctx.message.text.trim();
        const userId = ctx.from.id;
        const s = session.get(userId);

        // التعرّف على الرابط وأخذ الخيار من المستخدم
        const directUrl = extractUrl(text);
        if (directUrl) {
            session.set(userId, { pendingUrl: directUrl });

            const keyboard = new InlineKeyboard()
                .text("🎬 فيديو (MP4)", "dl_mp4")
                .text("🎵 صوت (MP3)", "dl_mp3");

            const plat = detectPlatform(directUrl);
            return ctx.reply(`اختر صيغة التحميل المطلوبة لـ (<b>${plat}</b>):`, {
                parse_mode: "HTML",
                reply_markup: keyboard
            });
        }

        // متابعة باقي الأوامر لوحة التحكم (الإذاعة / الحظر / إلخ)
        if (s?.waitingFor) {
            switch (s.waitingFor) {
                case "broadcast":
                    return handleBroadcast(ctx, text);
                case "ban":
                    return handleBan(ctx, text);
                case "unban":
                    return handleUnban(ctx, text);
                case "set_channel":
                    return handleSetChannel(ctx, text);
                default:
                    session.clear(userId);
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

async function handleBroadcast(ctx, text) {
    session.clear(ctx.from.id);
    const users = allUserIds();
    let success = 0;
    let failed = 0;
    
    const progressMsg = await ctx.reply(`📢 جاري إرسال التعميم إلى ${users.length} مستخدم...`);
    
    for (const userId of users) {
        try {
            await ctx.api.sendMessage(userId, text, { parse_mode: "HTML" });
            success++;
        } catch {
            failed++;
        }
    }
    
    await ctx.api.editMessageText(
        ctx.chat.id,
        progressMsg.message_id,
        `✅ تم إكمال التعميم:\n\n👥 إجمالي المستهدفين: ${users.length}\n✅ بنجاح: ${success}\n❌ بفشل: ${failed}`
    ).catch(() => {});
}

async function handleBan(ctx, text) {
    session.clear(ctx.from.id);
    const targetId = parseInt(text, 10);
    if (isNaN(targetId)) {
        await ctx.reply("⚠️ المعرف (ID) غير صالح. يرجى إرسال أرقام صحيحة.");
        return;
    }
    blockUser(targetId);
    await ctx.reply(`🚫 تم حظر المستخدم بنجاح: <code>${targetId}</code>`, { parse_mode: "HTML" });
}

async function handleUnban(ctx, text) {
    session.clear(ctx.from.id);
    const targetId = parseInt(text, 10);
    if (isNaN(targetId)) {
        await ctx.reply("⚠️ المعرف (ID) غير صالح. يرجى إرسال أرقام صحيحة.");
        return;
    }
    unblockUser(targetId);
    await ctx.reply(`✅ تم فك الحظر عن المستخدم بنجاح: <code>${targetId}</code>`, { parse_mode: "HTML" });
}

async function handleSetChannel(ctx, text) {
    session.clear(ctx.from.id);
    if (!text.startsWith("@")) {
        await ctx.reply("⚠️ يجب أن يبدأ معرف القناة بعلامة @ مثل: `@ChannelUsername`");
        return;
    }
    await ctx.reply(`📢 تم تحديث قناة الاشتراك الإجباري بنجاح إلى: <b>${escapeHtml(text)}</b>`, { parse_mode: "HTML" });
}

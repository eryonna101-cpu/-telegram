import { InputFile } from "grammy";
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
    bot.on("callback_query:data", async (ctx) => {
        const data = ctx.callbackQuery.data;
        if (data.includes("dl") || data.includes("download") || data.includes("link")) {
            session.set(ctx.from.id, { waitingFor: "link" });
            await ctx.answerCallbackQuery().catch(() => {});
            return ctx.reply("📥 **أرسل الآن رابط الفيديو** الذي تريد تحميلة:");
        }
    });

    bot.on("message:text", async (ctx) => {
        const text = ctx.message.text.trim();
        const userId = ctx.from.id;
        const s = session.get(userId);

        const directUrl = extractUrl(text);
        if (directUrl) {
            return processDownload(ctx, directUrl);
        }

        if (text.includes("يحمل") || text.includes("تحميل")) {
            session.set(userId, { waitingFor: "link" });
            return ctx.reply("📥 **أرسل الآن رابط الفيديو** الذي تريد تحميله (TikTok, Instagram, YouTube...):");
        }

        if (s?.waitingFor) {
            switch (s.waitingFor) {
                case "link":
                    return processDownload(ctx, text);
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

async function processDownload(ctx, text) {
    const url = extractUrl(text);
    if (!url) {
        await ctx.reply("⚠️ يرجى إرسال رابط صالح للتحميل.");
        return;
    }
    session.clear(ctx.from.id);
    const plat = detectPlatform(url);
    const statusMsg = await ctx.reply(`📥 جاري جلب معلومات الفيديو من (${plat})...`);
    
    let res;
    try {
        res = await download(url);
        if (res?.filePath) {
            await ctx.replyWithVideo(new InputFile(res.filePath));
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

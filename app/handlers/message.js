import { logger } from "../utils/logger.js";
import { session } from "../utils/session.js";
import { extractUrl, detectPlatform, platformDownload } from "../services/downloader.js";
import { 
    allUserIds,
    blockUser,
    unblockUser,
} from "../database/models.js";

// دالة التنسيق المدمجة بدلاً من الاستيراد من format.js
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
    bot.on("message:text", async (ctx) => {
        const s = session.get(ctx.from.id);
        if (!s?.waitingFor) return;
        const text = ctx.message.text.trim();
        switch (s.waitingFor) {
            case "link":
                return handleLink(ctx, text);
            case "broadcast":
                return handleBroadcast(ctx, text);
            case "ban":
                return handleBan(ctx, text);
            case "unban":
                return handleUnban(ctx, text);
            case "set_channel":
                return handleSetChannel(ctx, text);
            default:
                session.clear(ctx.from.id);
        }
    });
}

async function handleLink(ctx, text) {
    if (!extractUrl(text)) {
        await ctx.reply("⚠️ يرجى إرسال رابط صالح للتحميل.");
        return;
    }
    session.clear(ctx.from.id);
    const plat = detectPlatform(text);
    const statusMsg = await ctx.reply(`📥 جاري جلب معلومات الفيديو من (${plat})...`);
    try {
        await platformDownload(ctx, text, statusMsg);
    } catch (e) {
        logger.error(`Download error: ${e.message}`);
        await ctx.reply("❌ حدث خطأ أثناء محاولة التحميل، يرجى المحاولة لاحقاً.").catch(() => {});
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

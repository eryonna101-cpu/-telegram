import { logger } from "../utils/logger.js";
import { session } from "../utils/session.js";
import { extractUrl, detectPlatform, platformLabel } from "../utils/links.js";
import { probe } from "../services/downloader.js";
import { confirmKeyboard } from "../keyboards/confirm.js";
import { checkSubscription, getSubscriptionKeyboard } from "../middlewares/sub.js";
import {
    allUserIds,
    blockUser,
    unblockUser,
} from "../database/models.js";
import { fmtBytes, fmtDuration, escapeHtml } from "../utils/format.js";

export function registerMessageRouter(bot) {
    bot.on("message:text", async (ctx) => {
        const s = session.get(ctx.from.id);
        if (!s?.waitingFor) return;
        const text = ctx.message.text.trim();
        switch (s.waitingFor) {
            case "link":
                return handleLink(ctx, text);
            case "broadcast":
                return handleBroadcast(ctx);
            case "ban":
                return handleBan(ctx, text);
            case "unban":
                return handleUnban(ctx, text);
            default:
                return;
        }
    });

    bot.on("message", async (ctx) => {
        const s = session.get(ctx.from.id);
        if (!s?.waitingFor) return;
        if (s.waitingFor === "broadcast") return;
        if (s.waitingFor === "link") {
            await ctx.reply("⚠️ يرجى إرسال رابط صحيح فقط، من فضلك.");
        }
    });
}

async function handleLink(ctx, text) {
    // فحص الاشتراك الإجباري أولاً
    const isSubscribed = await checkSubscription(ctx);
    if (!isSubscribed) {
        const channel = config.forcedChannel || process.env.FORCED_CHANNEL || "YourChannel";
        return ctx.reply(
            "⚠️ **عذراً، يجب عليك الاشتراك في قناة البوت أولاً لتتمكن من استخدام التنزيل.**\n\nيرجى الاشتراك ثم الضغط على زر التحقق أدناه 👇",
            getSubscriptionKeyboard(channel)
        );
    }

    const url = extractUrl(text) || (/^https?:\/\//i.test(text.trim()) ? text.trim() : null);
    const platform = url ? detectPlatform(url) : null;
    if (!platform) {
        await ctx.reply("⚠️ هذا الرابط غير مدعوم.");
        return;
    }
    session.update(ctx.from.id, { waitingFor: null });
    const waitMsg = await ctx.reply("🔍 جاري فحص الرابط...");
    const info = await probe(url).catch(() => null);
    try {
        await ctx.deleteMessage(waitMsg.message_id);
    } catch {
        /* ignore */
    }

    const lines = [`🔗 الرابط:`, platformLabel(platform)];
    if (info) {
        if (info.title) lines.push(`📄 العنوان: ${escapeHtml(info.title)}`);
        if (info.duration) lines.push(`⏱ المدة: ${fmtDuration(info.duration)}`);
        if (info.filesize) lines.push(`📦 الحجم التقريبي: ${fmtBytes(info.filesize)}`);
    }
    session.update(ctx.from.id, { info });
    await ctx.reply(lines.join("\n"), {
        reply_markup: confirmKeyboard(),
    });
}

async function handleBroadcast(ctx) {
    session.update(ctx.from.id, { waitingFor: null });
    const status = await ctx.reply("📢 جاري إرسال الإذاعة للمستخدمين...");
    const ids = allUserIds();
    let ok = 0;
    let failed = 0;
    for (const id of ids) {
        try {
            await ctx.api.copyMessage(id, ctx.chat.id, ctx.message.message_id);
            ok++;
        } catch {
            failed++;
        }
        if ((ok + failed) % 20 === 0) await new Promise((r) => setTimeout(r, 1000));
    }
    await ctx.api.editMessageText(
        ctx.chat.id,
        status.message_id,
        `📢 تم الإرسال إلى ${ok} مستخدم وفشل لـ ${failed} مستخدم.`
    );
    logger.info("broadcast completed", { total: ids.length, ok, failed });
}

async function handleBan(ctx, text) {
    const id = parseInt(text.replace(/\D/g, ""), 10);
    if (!id) {
        await ctx.reply("⚠️ أرسل Telegram ID صحيح فقط للحظر.");
        return;
    }
    session.update(ctx.from.id, { waitingFor: null });
    blockUser(id, "banned by owner");
    await ctx.reply(`🚫 تم حظر المستخدم بنجاح: ${id}`);
    logger.warn("user blocked", { target: id });
}

async function handleUnban(ctx, text) {
    const id = parseInt(text.replace(/\D/g, ""), 10);
    if (!id) {
        await ctx.reply("⚠️ أرسل Telegram ID صحيح فقط لفك الحظر.");
        return;
    }
    session.update(ctx.from.id, { waitingFor: null });
    unblockUser(id);
    await ctx.reply(`✅ تم فك الحظر عن المستخدم: ${id}`);
    logger.info("user unblocked", { target: id });
}

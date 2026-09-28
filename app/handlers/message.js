import { InlineKeyboard, Keyboard, InputFile } from "grammy";
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

// دالة التحقق من المالك
function isAdmin(userId) {
    const adminId = process.env.ADMIN_ID;
    if (!adminId) return false;
    return String(userId).trim() === String(adminId).trim();
}

function getMainKeyboard(userId) {
    const keyboard = new Keyboard()
        .text("📥 أرسل رابط للتحميل")
        .row()
        .text("📊 إحصائياتي").text("⚙️ الإعدادات")
        .row()
        .text("ℹ️ المساعدة");

    // زر لوحة الإدارة يظهر للمالك فقط في الكيبورد العادي
    if (isAdmin(userId)) {
        keyboard.row().text("🥊 لوحة الإدارة");
    }

    return keyboard.resized();
}

export function registerMessageRouter(bot) {
    // 1. امر /start
    bot.command("start", async (ctx) => {
        const userId = ctx.from.id;
        const name = ctx.from.first_name || "المستخدم";
        const welcomeText = `👋 <b>أهلاً بك ${escapeHtml(name)}!</b>\n\n✨ <b>أنا بوت التحميل السريع من جميع المنصات</b>\n(TikTok • Instagram • YouTube • X / Twitter)\n\n🚀 <b>طريقة الاستخدام:</b>\nفقط <b>أرسل رابط المقطع</b> مباشرة هنا، وسأوفر لك خيارات التحميل كـ <b>فيديو (MP4)</b> أو <b>صوت (MP3)</b> فوراً!\n\n👇 <b>استخدم الأزرار أدناه للتحكم:</b>`;

        await ctx.reply(welcomeText, {
            parse_mode: "HTML",
            reply_markup: getMainKeyboard(userId)
        });
    });

    // 2. معالجة أزرار الاختيار المدمجة
    bot.on("callback_query:data", async (ctx) => {
        const data = ctx.callbackQuery.data;
        const userId = ctx.from.id;
        const s = session.get(userId);

        await ctx.answerCallbackQuery().catch(() => {});

        if (data === "dl_mp4" || data === "dl_mp3") {
            const isAudio = data === "dl_mp3";
            const targetUrl = s?.pendingUrl;

            if (!targetUrl) {
                await ctx.reply("⚠️ انتهت صلاحية الطلب، يرجى إعادة إرسال الرابط من جديد.");
                return;
            }

            await ctx.editMessageReplyMarkup({ reply_markup: null }).catch(() => {});
            return processDownload(ctx, targetUrl, isAudio);
        }

        if (data.includes("stat") || data.includes("إحصائيات")) {
            return ctx.reply(`📊 <b>إحصائياتك:</b>\n\n👤 الاسم: ${escapeHtml(ctx.from.first_name)}\n🆔 المعرف: <code>${userId}</code>\n⚡️ الحالة: نشط ✅`, { parse_mode: "HTML" });
        }

        if (data.includes("setting") || data.includes("إعدادات")) {
            return ctx.reply("⚙️ <b>الإعدادات:</b>\n\nالبوت يقوم بالتحميل بأعلى جودة متوفرة تلقائياً.", { parse_mode: "HTML" });
        }

        if (data.includes("help") || data.includes("مساعدة")) {
            return ctx.reply("ℹ️ <b>المساعدة:</b>\n\nكل ما عليك هو نسخ رابط المقطع من أي منصة وإرساله هنا مباشرة.", { parse_mode: "HTML" });
        }

        // حماية أزرار الإدارة
        if (data.startsWith("admin_") || data.includes("إدارة")) {
            if (!isAdmin(userId)) {
                return ctx.answerCallbackQuery({ text: "⚠️ هذه اللوحة مخصصة للمالك فقط.", show_alert: true });
            }
            return showAdminPanel(ctx);
        }
    });

    // 3. معالجة الرسائل والروابط
    bot.on("message:text", async (ctx) => {
        const text = ctx.message.text.trim();
        const userId = ctx.from.id;
        const s = session.get(userId);

        if (text.includes("المساعدة") || text.includes("مساعدة")) {
            return ctx.reply("ℹ️ <b>المساعدة:</b>\n\nأرسل رابط المقطع من (TikTok, Instagram, YouTube) وسيصلك الملف فوراً.", { parse_mode: "HTML" });
        }

        if (text.includes("إحصائياتي") || text.includes("احصائياتي")) {
            return ctx.reply(`📊 <b>إحصائياتك:</b>\n\n👤 الاسم: ${escapeHtml(ctx.from.first_name)}\n🆔 المعرف: <code>${userId}</code>\n⚡️ الحالة: نشط ✅`, { parse_mode: "HTML" });
        }

        if (text.includes("الإعدادات") || text.includes("الاعدادات")) {
            return ctx.reply("⚙️ <b>الإعدادات:</b>\n\nجميع خيارات الجودة والصيغ محدثة وتعمل تلقائياً.", { parse_mode: "HTML" });
        }

        // حماية زر لوحة الإدارة في الكيبورد
        if (text.includes("لوحة الإدارة") || text.includes("الإدارة")) {
            if (!isAdmin(userId)) {
                return ctx.reply("⚠️ ليس لديك صلاحية للوصول إلى لوحة الإدارة.");
            }
            return showAdminPanel(ctx);
        }

        if (text.includes("أرسل رابط") || text.includes("يحمل")) {
            return ctx.reply("📥 **قم بإرسال رابط المقطع الآن** وسأقوم بتحميله لك فوراً!");
        }

        if (s?.waitingFor) {
            if (!isAdmin(userId)) {
                session.clear(userId);
                return;
            }
            switch (s.waitingFor) {
                case "broadcast":
                    return handleBroadcast(ctx, text);
                case "ban":
                    return handleBan(ctx, text);
                case "unban":
                    return handleUnban(ctx, text);
                default:
                    session.clear(userId);
            }
        }

        // التعرّف على الرابط المباشر
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
    });
}

async function showAdminPanel(ctx) {
    const keyboard = new InlineKeyboard()
        .text("📢 تعميم للجميع", "admin_broadcast").row()
        .text("🚫 حظر مستخدم", "admin_ban").text("✅ فك حظر", "admin_unban");

    if (ctx.callbackQuery) {
        return ctx.editMessageText("🥊 <b>لوحة الإدارة:</b>\n\nاختر الإجراء المطلوب:", {
            parse_mode: "HTML",
            reply_markup: keyboard
        }).catch(() => {});
    }

    return ctx.reply("🥊 <b>لوحة الإدارة:</b>\n\nاختر الإجراء المطلوب:", {
        parse_mode: "HTML",
        reply_markup: keyboard
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

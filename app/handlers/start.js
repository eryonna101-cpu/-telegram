import { InlineKeyboard } from "grammy";

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

// أزرار Inline فقط تحت الرسالة
function getInlineKeyboard(userId) {
    const kb = new InlineKeyboard()
        .text("📥 أرسل رابط للتحميل", "action_send_link").row()
        .text("📊 إحصائياتي", "action_stats").text("⚙️ الإعدادات", "action_settings").row()
        .text("ℹ️ المساعدة", "action_help");

    // تظهر فقط لمالك البوت
    if (isAdmin(userId)) {
        kb.row().text("🥊 لوحة الإدارة", "action_admin");
    }

    return kb;
}

export function registerStartHandler(bot) {
    bot.command("start", async (ctx) => {
        const userId = ctx.from?.id;
        const name = ctx.from?.first_name || "المستخدم";
        const welcomeText = `👋 <b>أهلاً بك ${escapeHtml(name)}!</b>\n\n✨ <b>أنا بوت التحميل السريع من جميع المنصات</b>\n(TikTok • Instagram • YouTube • X / Twitter)\n\n🚀 <b>طريقة الاستخدام:</b>\nفقط <b>أرسل رابط المقطع</b> مباشرة هنا، وسأوفر لك خيارات التحميل كـ <b>فيديو (MP4)</b> أو <b>صوت (MP3)</b> فوراً!`;

        return ctx.reply(welcomeText, {
            parse_mode: "HTML",
            reply_markup: getInlineKeyboard(userId)
        });
    });
}

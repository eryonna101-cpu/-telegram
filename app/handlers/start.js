import { Keyboard } from "grammy";

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getMainKeyboard() {
    return new Keyboard()
        .text("📥 أرسل رابط للتحميل")
        .row()
        .text("📊 إحصائياتي").text("⚙️ الإعدادات")
        .row()
        .text("ℹ️ المساعدة")
        .row()
        .text("🥊 لوحة الإدارة")
        .resized();
}

export function registerStartHandler(bot) {
    bot.command("start", async (ctx) => {
        const name = ctx.from?.first_name || "المستخدم";
        const welcomeText = `👋 <b>أهلاً بك ${escapeHtml(name)}!</b>\n\n✨ <b>أنا بوت التحميل السريع من جميع المنصات</b>\n(TikTok • Instagram • YouTube • X / Twitter)\n\n🚀 <b>طريقة الاستخدام:</b>\nفقط <b>أرسل رابط المقطع</b> مباشرة هنا، وسأوفر لك خيارات التحميل كـ <b>فيديو (MP4)</b> أو <b>صوت (MP3)</b> فوراً!\n\n👇 <b>استخدم الأزرار أدناه للتحكم:</b>`;

        return ctx.reply(welcomeText, {
            parse_mode: "HTML",
            reply_markup: getMainKeyboard()
        });
    });
}

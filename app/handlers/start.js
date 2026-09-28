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

export function registerStartHandler(bot) {
    bot.command("start", async (ctx) => {
        const userId = ctx.from?.id;
        const name = ctx.from?.first_name || "المستخدم";
        
        // رسالة ترحيبية بسيطة ومباشرة
        const welcomeText = `👋 <b>أهلاً بك ${escapeHtml(name)}!</b>\n\n📥 <b>أرسل الرابط الآن وسأقوم بتحميله لك فوراً.</b>`;

        // إذا كان المستخدم هو مالك البوت فقط، يظهر له زر Inline للوحة الإدارة
        if (isAdmin(userId)) {
            const kb = new InlineKeyboard().text("🥊 لوحة الإدارة", "action_admin");
            return ctx.reply(welcomeText, {
                parse_mode: "HTML",
                reply_markup: kb
            });
        }

        // للمستخدم العادي: رسالة بدون أي أزرار
        return ctx.reply(welcomeText, {
            parse_mode: "HTML"
        });
    });
}

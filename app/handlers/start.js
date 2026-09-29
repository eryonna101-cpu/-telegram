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
        const name = escapeHtml(ctx.from?.first_name || "مستخدم");

        const welcomeText = `أهلاً بك يا <b>${name}</b> في البوت!`;

        // قائمة المالك (تتضمن زر إحصائيات المستخدمين الجدد والنشطين)
        if (isAdmin(userId)) {
            const adminKb = new InlineKeyboard()
                .text("👥 إحصائيات المستخدمين", "admin_users_stats")
                .row()
                .text("⚙️ إعدادات البوت", "settings");

            return ctx.reply(welcomeText + "\n\n🔹 <b>أهلاً بك يا مالك البوت، هذه لوحة التحكم الخاصة بك:</b>", {
                parse_mode: "HTML",
                reply_markup: adminKb
            });
        } 
        
        // قائمة المستخدم العادي (بسيطة ونظيفة)
        else {
            const userKb = new InlineKeyboard()
                .text("ℹ️ معلومات البوت", "bot_info");

            return ctx.reply(welcomeText, {
                parse_mode: "HTML",
                reply_markup: userKb
            });
        }
    });
}

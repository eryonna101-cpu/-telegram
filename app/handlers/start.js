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

        // إذا كان المستخدم هو المالك (Admin)
        if (isAdmin(userId)) {
            const adminKb = new InlineKeyboard()
                .text("لوحة تحكم المالك", "admin_panel")
                .row()
                .text("الإحصائيات", "stats")
                .text("الإعدادات", "settings");

            return ctx.reply(welcomeText, {
                parse_mode: "HTML",
                reply_markup: adminKb
            });
        } 
        
        // للمستخدم العادي
        else {
            const userKb = new InlineKeyboard()
                .text("معلومات البوت", "bot_info")
                .text("المساعدة", "help");

            return ctx.reply(welcomeText, {
                parse_mode: "HTML",
                reply_markup: userKb
            });
        }
    });
}

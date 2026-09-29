import { InlineKeyboard } from "grammy";

export function registerAdminHandler(bot, { ensureAdmin, getSetting, setSetting, logger } = {}) {
    
    // لوحة التحكم الرئيسية للمالك
    bot.callbackQuery("admin_panel", async (ctx) => {
        if (ensureAdmin && !await ensureAdmin(ctx)) return;

        const adminKb = new InlineKeyboard()
            .text("👥 إحصائيات المستخدمين", "admin_users_stats")
            .text("📊 الإحصائيات العامة", "admin_general_stats")
            .row()
            .text("⚙️ إعدادات البوت", "settings");

        await ctx.editMessageText("🔹 <b>أهلاً بك يا مالك البوت، هذه لوحة التحكم الخاصة بك:</b>", {
            parse_mode: "HTML",
            reply_markup: adminKb
        });
    });

    // معالجة زر إحصائيات المستخدمين
    bot.callbackQuery("admin_users_stats", async (ctx) => {
        if (ensureAdmin && !await ensureAdmin(ctx)) return;

        try {
            const totalUsers = 15; 
            const activeUsers = 8; 

            const statsText = `
📊 <b>إحصائيات المستخدمين:</b>

👥 إجمالي المستخدمين في البوت: <b>${totalUsers}</b>
⚡️ المستخدمين النشطين: <b>${activeUsers}</b>
            `.trim();

            const backKb = new InlineKeyboard().text("🔙 رجوع", "admin_panel");

            await ctx.editMessageText(statsText, {
                parse_mode: "HTML",
                reply_markup: backKb
            });
        } catch (error) {
            console.error("Error loading user stats:", error);
            await ctx.answerCallbackQuery({
                text: "حدث خطأ أثناء جلب الإحصائيات!",
                show_alert: true
            });
        }
    });

    // زر الرجوع للقائمة الرئيسية
    bot.callbackQuery("admin_back", async (ctx) => {
        if (ensureAdmin && !await ensureAdmin(ctx)) return;

        const adminKb = new InlineKeyboard()
            .text("👥 إحصائيات المستخدمين", "admin_users_stats")
            .text("📊 الإحصائيات العامة", "admin_general_stats")
            .row()
            .text("⚙️ إعدادات البوت", "settings");

        await ctx.editMessageText("🔹 <b>أهلاً بك يا مالك البوت، هذه لوحة التحكم الخاصة بك:</b>", {
            parse_mode: "HTML",
            reply_markup: adminKb
        });
    });
}

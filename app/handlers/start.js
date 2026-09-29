import { InlineKeyboard } from "grammy";

export function registerAdminHandler(bot, { ensureAdmin, getSetting, setSetting, logger } = {}) {
    
    // لوحة التحكم الرئيسية للمالك
    bot.callbackQuery("admin_panel", async (ctx) => {
        if (ensureAdmin && !await ensureAdmin(ctx)) return;

        const adminKb = new InlineKeyboard()
            .text("👥 المستخدمين", "admin_users_stats")
            .text("📊 الإحصائيات", "admin_general_stats")
            .row()
            .text("📦 آخر التحميلات", "admin_downloads")
            .text("⚙️ الإعدادات", "settings")
            .row()
            .text("📢 نشر تعميم", "adm:bcast")
            .text("🛠 وضع الصيانة", "adm:maint")
            .row()
            .text("🚫 حظر مستخدم", "adm:ban")
            .text("✅ فك حظر", "adm:unban")
            .row()
            .text("📢 قناة الاشتراك", "adm:channel")
            .text("📜 عرض السجلات", "adm:logs")
            .row()
            .text("🔄 إعادة تشغيل", "adm:restart");

        await ctx.editMessageText("🛠 <b>لوحة الإدارة الرئيسية:</b>", {
            parse_mode: "HTML",
            reply_markup: adminKb
        });
    });

    // معالجة زر إحصائيات المستخدمين (الجدد والنشطين)
    bot.callbackQuery("admin_users_stats", async (ctx) => {
        if (ensureAdmin && !await ensureAdmin(ctx)) return;

        try {
            // يمكنك ربط هذه القيم لاحقاً بقاعدة البيانات الفعلية لمشروعك
            const newUsersToday = 3; 
            const activeUsers = 12;  
            const totalUsers = 25;   

            const statsText = `
👥 <b>إحصائيات المستخدمين في البوت:</b>

📥 المستخدمين الجدد (اليوم): <b>${newUsersToday}</b>
⚡️ المستخدمين النشطين: <b>${activeUsers}</b>
📊 إجمالي المستخدمين: <b>${totalUsers}</b>
            `.trim();

            const backKb = new InlineKeyboard().text("🔙 رجوع للقائمة", "admin_panel");

            await ctx.editMessageText(statsText, {
                parse_mode: "HTML",
                reply_markup: backKb
            });
        } catch (error) {
            console.error("Error loading user stats:", error);
            await ctx.answerCallbackQuery({
                text: "حدث خطأ أثناء جلب إحصائيات المستخدمين!",
                show_alert: true
            });
        }
    });

    // زر الرجوع للقائمة الرئيسية (admin_panel)
    bot.callbackQuery("admin_back", async (ctx) => {
        if (ensureAdmin && !await ensureAdmin(ctx)) return;

        const adminKb = new InlineKeyboard()
            .text("👥 المستخدمين", "admin_users_stats")
            .text("📊 الإحصائيات", "admin_general_stats")
            .row()
            .text("📦 آخر التحميلات", "admin_downloads")
            .text("⚙️ الإعدادات", "settings")
            .row()
            .text("📢 نشر تعميم", "adm:bcast")
            .text("🛠 وضع الصيانة", "adm:maint")
            .row()
            .text("🚫 حظر مستخدم", "adm:ban")
            .text("✅ فك حظر", "adm:unban")
            .row()
            .text("📢 قناة الاشتراك", "adm:channel")
            .text("📜 عرض السجلات", "adm:logs")
            .row()
            .text("🔄 إعادة تشغيل", "adm:restart");

        await ctx.editMessageText("🛠 <b>لوحة الإدارة الرئيسية:</b>", {
            parse_mode: "HTML",
            reply_markup: adminKb
        });
    });
}

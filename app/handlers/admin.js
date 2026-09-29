import { InlineKeyboard } from "grammy";
import { db } from "../database/db.js";

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

    // معالجة زر إحصائيات المستخدمين الحقيقية من قاعدة البيانات
    bot.callbackQuery("admin_users_stats", async (ctx) => {
        if (ensureAdmin && !await ensureAdmin(ctx)) return;

        try {
            // 1. إجمالي المستخدمين
            const totalResult = db.prepare("SELECT COUNT(*) as count FROM users").get();
            const totalUsers = totalResult ? totalResult.count : 0;

            // 2. المستخدمين الجدد اليوم (مقارنة تاريخ أول انضمام بتنسيق YYYY-MM-DD)
            const todayStr = new Date().toISOString().split('T')[0];
            const newUsersResult = db.prepare("SELECT COUNT(*) as count FROM users WHERE date(first_seen) = ?").get(todayStr);
            const newUsersToday = newUsersResult ? newUsersResult.count : 0;

            // 3. المستخدمين النشطين (الذين كان آخر ظهور لهم خلال الـ 24 ساعة الماضية أو نفس اليوم)
            const activeResult = db.prepare("SELECT COUNT(*) as count FROM users WHERE date(last_seen) >= date('now', '-1 day')").get();
            const activeUsers = activeResult ? activeResult.count : 0;

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
            console.error("Error loading user stats from DB:", error);
            await ctx.answerCallbackQuery({
                text: "حدث خطأ أثناء جلب إحصائيات المستخدمين من قاعدة البيانات!",
                show_alert: true
            });
        }
    });

    // زر الرجوع للقائمة الرئيسية
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

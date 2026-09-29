import { InlineKeyboard } from "grammy";
import { db } from "../database/db.js";

export function registerAdminHandler(bot, { ensureAdmin, session, logger } = {}) {
    
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

    // قسم المستخدمين
    bot.callbackQuery("admin_users_stats", async (ctx) => {
        if (ensureAdmin && !await ensureAdmin(ctx)) return;

        try {
            const totalResult = db.prepare("SELECT COUNT(*) as count FROM users").get();
            const totalUsers = totalResult ? totalResult.count : 0;

            const todayStr = new Date().toISOString().split('T')[0];
            const newUsersResult = db.prepare("SELECT COUNT(*) as count FROM users WHERE date(first_seen) = ?").get(todayStr);
            const newUsersToday = newUsersResult ? newUsersResult.count : 0;

            const activeResult = db.prepare("SELECT COUNT(*) as count FROM users WHERE date(last_seen) >= date('now', '-1 day')").get();
            const activeUsers = activeResult ? activeResult.count : 0;

            const recentUsers = db.prepare("SELECT first_name, username, telegram_id, first_seen FROM users ORDER BY first_seen DESC LIMIT 10").all();

            let usersListMsg = "";
            if (recentUsers && recentUsers.length > 0) {
                usersListMsg = "\n\n<b>آخر المستخدمين المنضمين:</b>\n" + recentUsers.map(u => {
                    const name = u.first_name || "مستخدم";
                    const uname = u.username ? `@${u.username}` : `ID: ${u.telegram_id}`;
                    return `▪️ ${name} (${uname})`;
                }).join("\n");
            }

            const statsText = `
👥 <b>إحصائيات المستخدمين:</b>

📥 الجدد اليوم: <b>${newUsersToday}</b>
⚡️ النشطين: <b>${activeUsers}</b>
📊 الإجمالي: <b>${totalUsers}</b>
${usersListMsg}
            `.trim();

            const backKb = new InlineKeyboard().text("🔙 رجوع للقائمة", "admin_panel");

            await ctx.editMessageText(statsText, {
                parse_mode: "HTML",
                reply_markup: backKb
            });
        } catch (error) {
            console.error("Error loading user stats:", error);
            await ctx.answerCallbackQuery({ text: "حدث خطأ أثناء جلب إحصائيات المستخدمين!", show_alert: true });
        }
    });

    // الإحصائيات العامة
    bot.callbackQuery("admin_general_stats", async (ctx) => {
        if (ensureAdmin && !await ensureAdmin(ctx)) return;

        try {
            const totalDownloadsRes = db.prepare("SELECT COUNT(*) as count FROM downloads").get();
            const totalDownloads = totalDownloadsRes ? totalDownloadsRes.count : 0;

            const todayStr = new Date().toISOString().split('T')[0];
            const todayDownloadsRes = db.prepare("SELECT COUNT(*) as count FROM downloads WHERE date(created_at) = ?").get(todayStr);
            const todayDownloads = todayDownloadsRes ? todayDownloadsRes.count : 0;

            const generalStatsText = `
📊 <b>الإحصائيات العامة للبوت:</b>

📦 إجمالي التنزيلات الكلية: <b>${totalDownloads}</b>
📥 تنزيلات اليوم: <b>${todayDownloads}</b>
            `.trim();

            const backKb = new InlineKeyboard().text("🔙 رجوع للقائمة", "admin_panel");

            await ctx.editMessageText(generalStatsText, {
                parse_mode: "HTML",
                reply_markup: backKb
            });
        } catch (error) {
            console.error("Error loading general stats:", error);
            await ctx.answerCallbackQuery({ text: "حدث خطأ أثناء جلب الإحصائيات العامة!", show_alert: true });
        }
    });

    // زر نشر تعميم (تفعيل حالة الانتظار في الجلسة)
    bot.callbackQuery("adm:bcast", async (ctx) => {
        if (ensureAdmin && !await ensureAdmin(ctx)) return;

        try {
            if (session) {
                session.set(ctx.from.id, { waiting: "broadcast" });
            }

            const backKb = new InlineKeyboard().text("🔙 رجوع للقائمة", "admin_panel");

            await ctx.editMessageText("📢 <b>أرسل الآن نص التعميم أو الرسالة التي تريد نشرها لجميع المستخدمين:</b>", {
                parse_mode: "HTML",
                reply_markup: backKb
            });
        } catch (error) {
            console.error("Error in bcast:", error);
            await ctx.answerCallbackQuery({ text: "حدث خطأ!", show_alert: true });
        }
    });

    // معالجة الرسالة النصية للإذاعة
    bot.on("message:text", async (ctx, next) => {
        const userId = ctx.from?.id;
        if (!userId) return next();

        const userSession = session ? session.get(userId) : null;
        
        if (userSession && userSession.waiting === "broadcast" && ensureAdmin && await ensureAdmin(ctx)) {
            session.delete(userId);

            const broadcastText = ctx.message.text;
            const users = db.prepare("SELECT telegram_id FROM users").all();

            let successCount = 0;
            let failCount = 0;

            await ctx.reply("⏳ <b>جاري إرسال التعميم لجميع الأعضاء...</b>", { parse_mode: "HTML" });

            for (const user of users) {
                try {
                    await ctx.api.sendMessage(user.telegram_id, broadcastText, { parse_mode: "HTML" });
                    successCount++;
                    await new Promise(res => setTimeout(res, 40));
                } catch (err) {
                    failCount++;
                }
            }

            return ctx.reply(`✅ <b>تم إرسال التعميم بنجاح!</b>\n\n📤 وصل إلى: <b>${successCount}</b> مستخدم\n❌ فشل الوصول إلى: <b>${failCount}</b>`, {
                parse_mode: "HTML"
            });
        }

        return next();
    });
}

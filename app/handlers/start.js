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
    const adminId = process.env.ADMIN_ID || process.env.OWNER_ID;
    if (!adminId) return false;
    return String(userId) === String(adminId);
}

export function registerStartHandler(bot) {
    bot.command("start", async (ctx) => {
        const userId = ctx.from?.id;
        const name = escapeHtml(ctx.from?.first_name || "مستخدم");

        // إذا كان المستخدم هو المالك، تظهر له أزرار لوحة الإدارة
        if (isAdmin(userId)) {
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

            return ctx.reply("🛠 <b>لوحة الإدارة الرئيسية:</b>", {
                parse_mode: "HTML",
                reply_markup: adminKb
            });
        } 
        
        // للمستخدم العادي (بدون أزرار Inline، رسالة مباشرة تطلب الرابط)
        else {
            const welcomeText = `أهلاً بك يا <b>${name}</b> في البوت!\n\nأرسل الآن رابط الفيديو الذي تريد تحميله 📥`;

            return ctx.reply(welcomeText, {
                parse_mode: "HTML"
            });
        }
    });
}

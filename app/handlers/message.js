        if (data === "admin_users") {
            const count = getUsersCount();
            
            // إضافة أزرار تفاعلية لإدارة المستخدمين
            const kb = new InlineKeyboard()
                .text("📋 عرض قائمة المستخدمين", "admin_list_users").row()
                .text("📢 قناة الاشتراك الوهمي", "admin_fake_channel_menu").row()
                .text("🔙 رجوع", "action_admin");
                
            return ctx.reply(`👥 <b>إدارة المستخدمين:</b>\n\n📊 إجمالي الأعضاء المسجلين في البوت: <b>${count}</b> مشتركاً.`, {
                parse_mode: "HTML",
                reply_markup: kb
            });
        }

        // زر عرض قائمة المستخدمين التفاعلية
        if (data === "admin_list_users") {
            // جلب آخر المستخدمين (تأكد من توفر دالة listTopUsers أو ما يعادلها في models.js، أو جلبهم بالطريقة المناسبة)
            const users = typeof listTopUsers === 'function' ? listTopUsers(10) : [];
            
            let text = `📋 <b>آخر المستخدمين المسجلين:</b>\n\n`;
            if (users.length === 0) {
                text += `<i>لا يوجد مستخدمين مسجلين بعد أو أن القائمة فارغة.</i>`;
            } else {
                users.forEach((u, index) => {
                    text += `${index + 1}. آيدي: <code>${u.user_id || u.id}</code>\n`;
                });
            }

            const kb = new InlineKeyboard()
                .text("🚫 حظر مستخدم من القائمة", "admin_ban")
                .text("🔙 رجوع", "admin_users");

            return ctx.editMessageText(text, {
                parse_mode: "HTML",
                reply_markup: kb
            }).catch(() => {});
        }

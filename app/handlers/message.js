        // التأكد من أن أي ضغطة زر تبدأ بـ admin_ تخص الإدارة فقط ولا يستطيع غير المالك تنفيذها
        if (data.startsWith("admin_") || data === "action_admin") {
            if (!isAdmin(userId)) {
                return ctx.answerCallbackQuery({
                    text: "⚠️ هذه اللوحة مخصصة لمالك البوت فقط.",
                    show_alert: true
                });
            }
        }

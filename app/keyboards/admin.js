export const adminPanel = () => ({
  inline_keyboard: [
    [
      { text: "👥 المستخدمون", callback_data: "adm:users" },
      { text: "📊 الإحصائيات", callback_data: "adm:stats" },
    ],
    [
      { text: "📥 التحميلات", callback_data: "adm:downloads" },
      { text: "⚙️ إعدادات البوت", callback_data: "adm:settings" },
    ],
    [{ text: "📢 إرسال رسالة", callback_data: "adm:bcast" }],
    [
      { text: "🚫 حظر مستخدم", callback_data: "adm:ban" },
      { text: "✅ فك حظر", callback_data: "adm:unban" },
    ],
    [
      { text: "🔄 إعادة تشغيل الخدمات", callback_data: "adm:restart" },
      { text: "📝 السجلات", callback_data: "adm:logs" },
    ],
    [{ text: "🏠 الرئيسية", callback_data: "menu:home" }],
  ],
});

export const adminBack = () => ({
  inline_keyboard: [[{ text: "⬅️ لوحة الإدارة", callback_data: "adm:panel" }]],
});

export const adminSettings = (maintenanceOn) => ({
  inline_keyboard: [
    [
      {
        text: `🛠️ وضع الصيانة: ${maintenanceOn ? "مفعّل ✅" : "متوقف ❌"}`,
        callback_data: "adm:maint",
      },
    ],
    [{ text: "⬅️ لوحة الإدارة", callback_data: "adm:panel" }],
  ],
});
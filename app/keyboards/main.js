import { config } from "../config.js";

export const mainMenu = (userId) => {
  const keyboard = {
    inline_keyboard: [
      [{ text: "🎬 تحميل فيديو", callback_data: "dl:menu" }],
      [
        { text: "⚙️ الإعدادات", callback_data: "set:main" },
        { text: "📊 إحصائياتي", callback_data: "st:me" },
      ],
      [{ text: "ℹ️ المساعدة", callback_data: "help:main" }],
    ],
  };
  if (userId === config.ownerId) {
    keyboard.inline_keyboard.push([{ text: "🛡️ الإدارة", callback_data: "adm:panel" }]);
  }
  return keyboard;
};

export const backHome = () => ({
  inline_keyboard: [[{ text: "🏠 الرئيسية", callback_data: "menu:home" }]],
});
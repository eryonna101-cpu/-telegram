export const confirmKeyboard = () => ({
  inline_keyboard: [
    [{ text: "⬇️ تحميل الفيديو", callback_data: "dl:video" }],
    [{ text: "🎵 استخراج الصوت", callback_data: "dl:audio" }],
    [{ text: "❌ إلغاء", callback_data: "dl:cancel" }],
  ],
});

export const cancelKeyboard = () => ({
  inline_keyboard: [[{ text: "❌ إلغاء", callback_data: "dl:cancel" }]],
});

export const linkPromptKeyboard = cancelKeyboard;

export const successKeyboard = (wasAudio) => ({
  inline_keyboard: [
    [{ text: "🔄 تحميل مرة أخرى", callback_data: wasAudio ? "dl:audio" : "dl:video" }],
    [
      {
        text: wasAudio ? "🎬 تحميل الفيديو" : "🎵 استخراج الصوت",
        callback_data: wasAudio ? "dl:video" : "dl:audio",
      },
    ],
    [{ text: "🏠 الرئيسية", callback_data: "menu:home" }],
  ],
});

export const errorKeyboard = (wasAudio) => ({
  inline_keyboard: [
    [{ text: "🔄 المحاولة مرة أخرى", callback_data: wasAudio ? "dl:audio" : "dl:video" }],
    [{ text: "🏠 الرئيسية", callback_data: "menu:home" }],
  ],
});
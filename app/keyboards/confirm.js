export function confirmKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: "✅ تأكيد", callback_data: "confirm:yes" },
                { text: "❌ إلغاء", callback_data: "confirm:no" }
            ]
        ]
    };
}

import { config } from "../config.js";

export const mainMenu = (userId) => {
    const keyboard = {
        inline_keyboard: [
            [
                { text: "📥 يحمل من جميع المنصات", callback_data: "download_menu" }
            ],
            [
                { text: "⚙️ الإعدادات", callback_data: "adm:settings" },
                { text: "📊 إحصائياتي", callback_data: "my_stats" }
            ],
            [
                { text: "ℹ️ المساعدة", callback_data: "help" }
            ]
        ]
    };
    
    if (userId === config.ownerId) {
        keyboard.inline_keyboard.push([
            { text: "🛡 لوحة الإدارة", callback_data: "adm:panel" }
        ]);
    }
    
    return keyboard;
};

export const backHome = () => ({
    inline_keyboard: [
        [
            { text: "🏠 الرئيسية", callback_data: "adm:panel" }
        ]
    ]
});

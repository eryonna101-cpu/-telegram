import { config } from "../config.js";

export const mainMenu = (userId) => {
    const keyboard = {
        inline_keyboard: [
            [
                { 
                    text: "📥 يحمل من جميع المنصات", 
                    callback_data: "download_menu",
                    style: "success" // لون أخضر بارز لزر التحميل الأساسي
                }
            ],
            [
                { 
                    text: "⚙️ الإعدادات", 
                    callback_data: "adm:settings",
                    style: "primary" // لون أزرق للإعدادات
                },
                { 
                    text: "📊 إحصائياتي", 
                    callback_data: "my_stats",
                    style: "secondary" // لون ثانوي للإحصائيات
                }
            ],
            [
                { 
                    text: "ℹ️ المساعدة", 
                    callback_data: "help",
                    style: "secondary" // لون ثانوي للمساعدة
                }
            ]
        ]
    };
    
    // إضافة زر لوحة الإدارة للمالك حصرياً بلون مميز
    if (userId === config.ownerId) {
        keyboard.inline_keyboard.push([
            { 
                text: "🛡 لوحة الإدارة", 
                callback_data: "adm:panel",
                style: "danger" // لون مميز وبارز لوحة التحكم الخاصة بالأدمن
            }
        ]);
    }
    
    return keyboard;
};

export const backHome = () => ({
    inline_keyboard: [
        [
            { 
                text: "🏠 الرئيسية", 
                callback_data: "adm:panel",
                style: "primary" 
            }
        ]
    ]
});

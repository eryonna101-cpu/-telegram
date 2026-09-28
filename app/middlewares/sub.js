import { config } from "../config.js";

export async function checkSubscription(ctx) {
    // إذا لم يتم تحديد قناة اشتراك إجباري في الإعدادات، يتم السماح للمستخدم مباشرة
    const channel = config.forcedChannel || process.env.FORCED_CHANNEL;
    if (!channel) return true;

    try {
        const userId = ctx.from?.id;
        if (!userId) return true;

        const chatMember = await ctx.telegram.getChatMember(channel, userId);
        const status = chatMember?.status;

        // التحقق مما إذا كان المستخدم عضواً، مشرفاً، أو مالكاً للقناة
        const isMember = ["creator", "administrator", "member"].includes(status);
        return isMember;
    } catch (err) {
        console.error("Error checking subscription:", err);
        return true; // في حال حدث خطأ تقني، نسمح للمستخدم بالاستمرار لكي لا يتوقف البوت
    }
}

// دالة لإنشاء زر الاشتراك الإجباري مع الأزرار التفاعلية الحديثة
export function getSubscriptionKeyboard(channelUsername) {
    const cleanChannel = channelUsername.replace("@", "");
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "📢 اشترك في القناة",
                        url: `https://t.me/${cleanChannel}`
                    }
                ],
                [
                    {
                        text: "✅ تم الاشتراك، تحقق",
                        callback_data: "check_sub"
                    }
                ]
            ]
        }
    };
}

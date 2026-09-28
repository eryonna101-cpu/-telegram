import { config } from "../config.js";

export async function checkSubscription(ctx) {
    const channel = config.forcedChannel;
    if (!channel) return true;

    try {
        const userId = ctx.from?.id;
        if (!userId) return true;

        const chatMember = await ctx.telegram.getChatMember(channel, userId);
        const status = chatMember?.status;
        return ["creator", "administrator", "member"].includes(status);
    } catch (err) {
        console.error("Error checking subscription:", err);
        return true; 
    }
}

export function getSubscriptionKeyboard(channelUsername) {
    const cleanChannel = channelUsername.replace("@", "");
    return {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "📢 اشترك في القناة الرسمية",
                        url: `https://t.me/${cleanChannel}`
                    }
                ],
                [
                    {
                        text: "🔄 اضغط هنا بعد الاشتراك (تحقق)",
                        callback_data: "check_sub"
                    }
                ]
            ]
        }
    };
}

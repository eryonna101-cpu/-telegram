import { Bot } from "grammy";
import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { rateLimitMiddleware } from "./middlewares/rateLimit.js";
import { userMiddleware } from "./middlewares/user.js";
import { registerStartHandler } from "./handlers/start.js";
import { registerMiscHandlers } from "./handlers/misc.js";
import { registerDownloadHandler } from "./handlers/download.js";
import { registerAdminHandler } from "./handlers/admin.js";
import { registerMessageRouter } from "./handlers/message.js";

export function createBot() {
  const bot = new Bot(config.botToken);

  bot.use(rateLimitMiddleware());
  bot.use(userMiddleware());

  registerStartHandler(bot);
  registerMiscHandlers(bot);
  registerDownloadHandler(bot);
  registerAdminHandler(bot);
  registerMessageRouter(bot); // أخيرًا — يقرأ الجلسات فقط

  // معالجة أخطاء شاملة — البوت لا يتوقف
  bot.catch((err) => {
    logger.error("unhandled bot error", {
      user_id: err.ctx?.from?.id ?? null,
      error: err.error?.message || String(err.error),
    });
  });

  return bot;
}
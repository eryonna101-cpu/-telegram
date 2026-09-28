import { config } from "./config.js";
import { logger } from "./utils/logger.js";
import { createBot } from "./bot.js";
import { closeDb } from "./database/db.js";
import { cleanTempDir } from "./utils/files.js";

if (!config.botToken) {
  logger.error("BOT_TOKEN مفقود — أضفه في ملف .env (من @BotFather)");
  process.exit(1);
}
if (!config.ownerId) {
  logger.error("OWNER_ID مفقود — أضفه في ملف .env (من @userinfobot)");
  process.exit(1);
}

// البقاء حيًا عند الأخطاء غير المتوقة — تُسجّل فقط
process.on("unhandledRejection", (reason) =>
  logger.error("unhandled rejection", { error: String(reason).slice(0, 300) })
);
process.on("uncaughtException", (err) =>
  logger.error("uncaught exception", { error: String(err?.message).slice(0, 300) })
);

await cleanTempDir();

const bot = createBot();
logger.info("starting bot (long polling)", {
  max_concurrent: config.maxConcurrentDownloads,
  max_file_size: config.maxFileSize,
});

let stopping = false;
const shutdown = async (signal) => {
  if (stopping) return;
  stopping = true;
  logger.info(`received ${signal} — shutting down`);
  try {
    await bot.stop();
  } catch {
    /* ignore */
  }
  closeDb();
  process.exit(0);
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

await bot.start({
  drop_pending_updates: true,
  onStart: (me) => logger.info(`bot started as @${me.username}`),
});
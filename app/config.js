import "dotenv/config";

const toInt = (value, fallback) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const config = {
  botToken: process.env.BOT_TOKEN || "",
  ownerId: parseInt(process.env.OWNER_ID || "0", 10) || 0,
  databaseUrl: process.env.DATABASE_URL || "data/bot.db",
  maxFileSize: toInt(process.env.MAX_FILE_SIZE, 50 * 1024 * 1024),
  maxConcurrentDownloads: toInt(process.env.MAX_CONCURRENT_DOWNLOADS, 3),
  downloadTimeoutSec: toInt(process.env.DOWNLOAD_TIMEOUT, 300),
  maxRetries: toInt(process.env.MAX_RETRIES, 2),
  tempDir: process.env.TEMP_DIR || "downloads",
  logLevel: process.env.LOG_LEVEL || "info",
  logFile: process.env.LOG_FILE || "logs/bot.log",
};
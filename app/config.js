import "dotenv/config";

const toInt = (value, fallback) => {
    const n = parseInt(value, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const config = {
    botToken: process.env.BOT_TOKEN || "",
    ownerId: parseInt(process.env.OWNER_ID || "0", 10),
    forcedChannel: process.env.FORCED_CHANNEL || "@YourChannel", // قناة الاشتراك الإجباري
    databaseUrl: process.env.DATABASE_URL || "",
    maxFileSize: toInt(process.env.MAX_FILE_SIZE, 0),
    maxConcurrentDownloads: toInt(process.env.MAX_CONCURRENT_DOWNLOADS, 1),
    downloadTimeoutSec: toInt(process.env.DOWNLOAD_TIMEOUT_SEC, 300),
    maxRetries: toInt(process.env.MAX_RETRIES, 3),
    tempDir: process.env.TEMP_DIR || "downloads",
    logLevel: process.env.LOG_LEVEL || "info",
    logFile: process.env.LOG_FILE || "logs/bot.log",
};

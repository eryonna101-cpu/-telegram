# 🎬 بوت تحميل الفيديوهات — TikTok & Instagram

بوت Telegram احترافي لتحميل الفيديوهات من TikTok وInstagram، بواجهة **Inline Keyboard** بالكامل، بدون أي Slash Commands أو Frontend.

## ✨ الميزات

- 🎬 تحميل فيديوهات TikTok (بدون علامة مائية عند توفرها من المصدر) وInstagram (Reels / Posts / Videos العامة فقط)
- 🎵 استخراج الصوت بصيغة MP3
- ⏳ شريط تقدم مباشر أثناء التحميل مع زر إلغاء
- 🚦 طابور تحميل مع تحكم بالتزامن + مهلة + إعادة محاولة محدودة
- 🛡️ لوحة إدارة كاملة داخل Telegram للمالك (OWNER_ID): المستخدمون، الإحصائيات، التحميلات، البث، الحظر، السجلات، وضع الصيانة
- 📦 SQLite (دعم PostgreSQL لاحقًا) — جداول: users / downloads / settings / blocked_users
- 🔒 حماية: Rate limiting، منع Flood، تحقق من الروابط، حد لحجم الملفات، تنظيف تلقائي للملفات المؤقتة
- 📝 Logging احترافي بدون تسجيل أي Secrets

> ⚖️ البوت يدعم المحتوى **العام المتاح** فقط. لا يحاول تجاوز الحسابات الخاصة أو القيود الأمنية.

## 🏗️ البنية

```
app/
├── main.js          # نقطة التشغيل
├── bot.js           # إنشاء البوت وتسجيل المعالجات
├── config.js        # الإعدادات من متغيرات البيئة
├── database/        # قاعدة البيانات (db + models)
├── handlers/        # start / download / admin / misc / message router
├── keyboards/       # Inline keyboards
├── services/        # downloader (yt-dlp) / tiktok / instagram / ffmpeg / queue
├── middlewares/     # user + rate limiting
└── utils/           # logger / links / session / files
```

## 📋 المتطلبات

- Node.js 20+
- FFmpeg (`ffmpeg` في PATH)
- yt-dlp (`yt-dlp` في PATH)

## 🚀 التشغيل المحلي

```bash
# 1) المتطلبات الخارجية
# Ubuntu/Debian:
sudo apt install ffmpeg python3-pip
sudo pip install yt-dlp

# 2) المشروع
git clone <repo> && cd <repo>
npm install

# 3) الإعدادات
cp .env.example .env
# ثم عدّل BOT_TOKEN و OWNER_ID (تُؤخذ من @BotFather و @userinfobot)

# 4) التشغيل
npm start
```

## 🐳 التشغيل بـ Docker

```bash
cp .env.example .env   # ضع BOT_TOKEN و OWNER_ID
docker compose up -d --build

# عرض السجلات
docker compose logs -f bot
```

الصورة تحتوي FFmpeg و yt-dlp مسبقًا — لا تحتاج تثبيت أي شيء إضافي.

## ☁️ النشر

أي منصة تدعم Docker أو Node.js طويل الأمد:

- **Railway** — ارفع المستودع وأضف متغيرات البيئة
- **Fly.io / Render** — استخدم Dockerfile
- **VPS** — `docker compose up -d`

> البوت يعمل بنظام Long Polling — لا يحتاج دومين أو IP عام أو Webhook.

## ⚙️ متغيرات البيئة

| المتغير | الوصف | الافتراضي |
|---|---|---|
| `BOT_TOKEN` | توكن البوت من @BotFather | — (إلزامي) |
| `OWNER_ID` | Telegram ID للمالك | — (إلزامي) |
| `DATABASE_URL` | مسار ملف SQLite | `data/bot.db` |
| `MAX_FILE_SIZE` | الحد الأقصى للملف (بايت) | `52428800` |
| `MAX_CONCURRENT_DOWNLOADS` | عدد التحميلات المتزامنة | `3` |
| `DOWNLOAD_TIMEOUT` | مهلة التحميل (ثانية) | `300` |
| `MAX_RETRIES` | محاولات إعادة التحميل | `2` |
| `TEMP_DIR` | مجلد الملفات المؤقتة | `downloads` |
| `LOG_LEVEL` | مستوى السجلات | `info` |
| `LOG_FILE` | ملف السجل | `logs/bot.log` |

## 📜 ملاحظة قانونية

هذا المشروع لأغراض تعليمية. استخدمه فقط مع المحتوى الذي تملكه أو المسموح لك بتحميله، واحترم شروط استخدام المنصات وحقوق النشر.
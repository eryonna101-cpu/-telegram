import { config } from "../config.js";
import { session } from "../utils/session.js";
import { noop } from "../utils/files.js";
import { upsertUser, isBlocked, getSetting } from "../database/models.js";

// يسجّل المستخدم، يمنع المحظورين، ويطبّق وضع الصيانة
export function userMiddleware() {
  return async (ctx, next) => {
    if (!ctx.from || ctx.from.is_bot) return next();
    if (isBlocked(ctx.from.id)) return; // تجاهل صامت للمحظورين
    upsertUser(ctx.from);
    if (getSetting("maintenance") === "on" && ctx.from.id !== config.ownerId) {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery("🛠️ البوت تحت الصيانة حاليًا، جرّب لاحقًا.").catch(noop);
      }
      return;
    }
    return next();
  };
}

// مسح الجلسة عند العودة للقائمة — يستخدمه معالج الرئيسية
export function clearSession() {
  return async (ctx, next) => {
    session.clear(ctx.from.id);
    return next();
  };
}
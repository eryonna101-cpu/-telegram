// جلسات مؤقتة في الذاكرة: انتظار رابط / بث / حظر — عملية واحدة لكل مستخدم
const sessions = new Map();

export const session = {
  get: (userId) => sessions.get(userId),
  set: (userId, data) => sessions.set(userId, data),
  update: (userId, patch) => {
    const current = sessions.get(userId) || {};
    sessions.set(userId, { ...current, ...patch });
  },
  clear: (userId) => sessions.delete(userId),
};
import { config } from "../config.js";

// استخراج أول رابط URL من نص المستخدم //
export function extractUrl(text) {
    const match = String(text || "").match(/https?:\/\/[^\s]+/i);
    return match ? match[0] :[span_1](start_span)[span_1](end_span) null;
}

// التعرف على المنصة أو السماح بأي رابط عام //
export function detectPlatform(url) {
    if (!url) return null;
    return "universal";
}

export function getPlatform(id) {
    return {
        id: "universal",
        label: "الكل",
        ydlOpts: []
    };
}

export function platformLabel(id) {
    return "منصة مدعومة";
}

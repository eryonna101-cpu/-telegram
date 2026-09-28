import path from "node:path";
import fsp from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";

export async function download(url) {
    const response = await fetch("https://api.cobalt.tools/api/json", {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ url: url })
    });

    const data = await response.json();

    if (data.status === "error" || data.status === "picker") {
        throw new Error(data.text || "فشل جلب الرابط من الخدمة الخارجية");
    }

    const mediaUrl = data.url;
    if (!mediaUrl) {
        throw new Error("لم يتم العثور على رابط فيديو مباشر");
    }

    const dir = path.join(config.tempDir || "./temp", randomUUID());
    await fsp.mkdir(dir, { recursive: true });

    const videoRes = await fetch(mediaUrl);
    if (!videoRes.ok) throw new Error("فشل تنزيل ملف الفيديو");

    const buffer = Buffer.from(await videoRes.arrayBuffer());
    const filePath = path.join(dir, "video.mp4");
    await fsp.writeFile(filePath, buffer);

    return { filePath, tempDir: dir };
}

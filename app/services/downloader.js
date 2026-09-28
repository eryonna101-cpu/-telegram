import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import { getPlatform } from "../utils/links.js";
import { remuxToMp4 } from "./ffmpeg.js";

const YTDLP = process.env.YTDLP_PATH || "yt-dlp";

function runYtDlp(args, { timeoutMs = 0, signal, onLine } = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(YTDLP, args, { stdio: ["ignore", "pipe", "pipe"] });
        let out = "";
        let errOut = "";
        let finished = false;

        const finish = (fn, arg) => {
            if (finished) return;
            finished = true;
            clearTimeout(timer);
            fn(arg);
        };

        let timer;
        if (timeoutMs > 0) {
            timer = setTimeout(() => {
                child.kill("SIGKILL");
                finish(reject, new Error(`yt-dlp timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        }

        const onAbort = () => {
            child.kill("SIGKILL");
            finish(reject, new Error("yt-dlp aborted"));
        };

        if (signal) {
            if (signal.aborted) return onAbort();
            signal.addEventListener("abort", onAbort, { once: true });
        }

        child.stdout.on("data", (chunk) => {
            const text = chunk.toString();
            out += text;
            if (onLine) {
                const lines = text.split(/\r?\n/);
                for (let i = 0; i < lines.length - 1; i++) {
                    onLine(lines[i]);
                }
            }
        });

        child.stderr.on("data", (chunk) => {
            errOut += chunk.toString();
        });

        child.on("error", (err) => {
            finish(reject, err);
        });

        child.on("close", (code) => {
            if (code === 0) {
                finish(resolve, out);
            } else {
                finish(reject, new Error(`yt-dlp exited with code ${code}: ${errOut}`));
            }
        });
    });
}

export async function probe(url) {
    return { title: "Media", duration: 0, thumbnail: null };
}

export async function download(url, { audioOnly = false, platform, onProgress, signal, timeoutMs } = {}) {
    const dir = path.join(config.tempDir, randomUUID());
    await fsp.mkdir(dir, { recursive: true });

    const args = [
        "--no-playlist",
        "--no-warnings",
        "--newline",
        "--restrict-filenames",
        "--user-agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "--no-check-certificates",
        "--extractor-args",
        "youtube:player_client=android,web",
        "--max-filesize",
        String(config.maxFileSize),
        "-o",
        path.join(dir, "media.%(ext)s"),
        "--print",
        "after_move:filepath",
    ];

    if (audioOnly) {
        args.push("-x", "--audio-format", "mp3", "--audio-quality", "0");
    } else {
        args.push("-f", "bv*[height<=1080]+ba/b", "--merge-output-format", "mp4");
    }

    args.push(url);

    const stdout = await runYtDlp(args, {
        signal,
        onLine: (line) => {
            const m = line.match(/\[download\]\s+(\d+(?:\.\d+)?)/);
            if (m && onProgress) onProgress(Math.min(100, parseFloat(m[1])));
        },
    });

    const filePath = stdout
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && fs.existsSync(l))
        .pop();

    if (!filePath) throw new Error("yt-dlp did not produce a file");

    return { filePath: await postProcess(filePath, audioOnly), tempDir: dir };
}

async function postProcess(filePath, audioOnly) {
    if (audioOnly) return filePath;
    if (path.extname(filePath).toLowerCase() !== ".mp4") {
        const mp4 = filePath.replace(/\.[^.]+$/, "") + ".mp4";
        try {
            await remuxToMp4(filePath, mp4);
            await fsp.unlink(filePath).catch(() => {});
            return mp4;
        } catch {
            return filePath;
        }
    }
    return filePath;
}

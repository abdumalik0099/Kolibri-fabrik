import "dotenv/config";
import express from "express";
import cors from "cors";
import { readFile } from "node:fs/promises";
import formidable from "formidable";

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Hardcoded qiymatlar o'chirildi - endi environment variable'dan o'qiladi
const BOT_TOKEN = (process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || "").trim();
const CHAT_ID = (process.env.CHAT_ID || process.env.TELEGRAM_CHAT_ID || "").trim();

function sendJson(res, status, payload) {
  res.status(status).type("application/json; charset=utf-8").send(JSON.stringify(payload));
}

function maskSecret(value, visible = 6) {
  if (!value) return "(missing)";
  if (value.length <= visible) return `${value}...`;
  return `${value.slice(0, visible)}...`;
}

function parseMultipart(req) {
  const form = formidable({
    multiples: false,
    maxFiles: 1,
    maxFileSize: 100 * 1024 * 1024,
    allowEmptyFiles: false,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
}

function firstFile(value) {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
}

// ✅ getTelegramFilePath funksiyasi to'liq va to'g'ri - env token ishlatadi
async function getTelegramFilePath(fileId) {
  if (!BOT_TOKEN) {
    throw new Error("BOT_TOKEN environment variable o'rnatilmagan");
  }
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getFile`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ file_id: fileId }),
  });
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok || !json?.result?.file_path) {
    // ✅ Aniq JSON xato xabari qaytariladi
    throw new Error(json?.description || `Telegram getFile error ${response.status}`);
  }
  return json.result.file_path;
}

async function sendVideoToTelegram(file) {
  if (!BOT_TOKEN) {
    throw new Error("BOT_TOKEN environment variable o'rnatilmagan");
  }
  if (!CHAT_ID) {
    throw new Error("CHAT_ID environment variable o'rnatilmagan");
  }
  if (!file?.filepath) {
    throw new Error("Video fayl topilmadi");
  }

  const buffer = await readFile(file.filepath);
  const form = new FormData();
  form.set("chat_id", CHAT_ID);
  form.set("supports_streaming", "true");
  form.set(
    "video",
    new Blob([buffer], { type: file.mimetype || "video/mp4" }),
    file.originalFilename || "product-video.mp4"
  );

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`, {
    method: "POST",
    body: form,
  });
  const json = await response.json().catch(() => null);

  if (!response.ok || !json?.ok) {
    throw new Error(json?.description || `Telegram error ${response.status}`);
  }

  const fileId = json?.result?.video?.file_id;
  if (!fileId) {
    throw new Error("Telegram video file_id qaytarmadi");
  }

  return {
    file_id: fileId,
    smallest_file_id: fileId,
    largest_file_id: fileId,
    message_id: json?.result?.message_id,
  };
}

app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "https://kolibri-fabrik.vercel.app",
      /\.vercel\.app$/,
    ],
    methods: ["GET", "POST", "DELETE", "OPTIONS", "HEAD"],
  })
);

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    bot_token_set: Boolean(BOT_TOKEN),
    chat_id_set: Boolean(CHAT_ID),
  });
});

app.post("/api/upload-video", async (req, res) => {
  try {
    const { files } = await parseMultipart(req);
    const videoFile = firstFile(files?.video);
    const result = await sendVideoToTelegram(videoFile);
    sendJson(res, 200, { ok: true, ...result });
  } catch (err) {
    // ✅ Aniq JSON xato xabari - 500 emas, 400 yoki 502
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[/api/upload-video] error:", message);
    sendJson(res, 400, { error: message });
  }
});

// ✅ /api/file/:fileId - to'g'rilandi, getTelegramFilePath ishlatiladi, xatolar JSON qaytaradi
app.get("/api/file/:fileId", async (req, res) => {
  try {
    const fileId = decodeURIComponent(req.params.fileId || "");
    if (!fileId) {
      return sendJson(res, 400, { error: "fileId topilmadi" });
    }

    const filePath = await getTelegramFilePath(fileId);
    const response = await fetch(`https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`);

    if (!response.ok) {
      return sendJson(res, 502, {
        error: `Telegram fayl yuklashda xato: HTTP ${response.status}`,
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.status(200);
    res.setHeader("content-type", response.headers.get("content-type") || "application/octet-stream");
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
    res.send(buffer);
  } catch (err) {
    // ✅ 500 emas, aniq JSON xato xabari
    const message = err instanceof Error ? err.message : "Fayl topilmadi";
    console.error("[/api/file/:fileId] error:", message);
    sendJson(res, 400, { error: message });
  }
});

app.listen(PORT, () => {
  console.log(`[server] BOT_TOKEN: ${maskSecret(BOT_TOKEN)}`);
  console.log(`[server] CHAT_ID:   ${CHAT_ID || "(missing)"}`);
  console.log(`[server] running at http://localhost:${PORT}`);
});

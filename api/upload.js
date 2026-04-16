// Vercel Serverless Function: POST /api/upload
// Uploads a base64 dataUrl image to Telegram channel and returns file_ids + message_id.

const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const CHAT_ID_RAW = (process.env.TELEGRAM_CHAT_ID || "").trim();

function normalizeChatId(input) {
  const cleaned = String(input || "").trim().replace(/^['"]|['"]$/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("@")) return cleaned;
  if (/^-?\d+$/.test(cleaned)) return cleaned;
  return cleaned;
}

const CHAT_ID = normalizeChatId(CHAT_ID_RAW);

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function setCors(req, res) {
  // Same-origin in production. Keep permissive for local previews.
  const origin = req.headers.origin || "*";
  res.setHeader("access-control-allow-origin", origin);
  res.setHeader("access-control-allow-methods", "POST,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
}

function readJsonBody(req, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === "object") return resolve(req.body);
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const str = Buffer.concat(chunks).toString("utf8");
        resolve(str ? JSON.parse(str) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function dataUrlToBuffer(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl || "");
  if (!match) throw new Error("Invalid dataUrl");
  const mime = match[1];
  const b64 = match[2];
  const buf = Buffer.from(b64, "base64");
  return { mime, buf };
}

async function sendPhotoToChannel({ dataUrl, fileName, caption }) {
  if (!BOT_TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN");
  if (!CHAT_ID) throw new Error("Missing TELEGRAM_CHAT_ID");

  const { mime, buf } = dataUrlToBuffer(dataUrl);
  const form = new FormData();
  form.set("chat_id", CHAT_ID);
  if (caption) form.set("caption", caption);
  form.set("photo", new Blob([buf], { type: mime || "image/webp" }), fileName || "image.webp");

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  const res = await fetch(url, { method: "POST", body: form });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    const desc = json?.description || `Telegram error ${res.status}`;
    throw new Error(desc);
  }
  return json.result;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = await readJsonBody(req);
    const { dataUrl, fileName } = body || {};
    const result = await sendPhotoToChannel({ dataUrl, fileName });
    const photos = Array.isArray(result?.photo) ? result.photo : [];
    if (photos.length === 0) throw new Error("No photo in sendPhoto result");
    const smallestFileId = photos[0]?.file_id || null;
    const largestFileId = photos[photos.length - 1]?.file_id || null;
    const messageId = result?.message_id;

    sendJson(res, 200, {
      file_id: smallestFileId || largestFileId,
      smallest_file_id: smallestFileId,
      largest_file_id: largestFileId,
      message_id: messageId,
    });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : "Unknown error" });
  }
}


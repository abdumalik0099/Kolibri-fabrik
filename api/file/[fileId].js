// Vercel Serverless Function: GET /api/file/:fileId

const BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function setCors(req, res) {
  const origin = req.headers.origin || "*";
  res.setHeader("access-control-allow-origin", origin);
  res.setHeader("access-control-allow-methods", "GET,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
}

async function getTelegramFilePath(fileId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getFile`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    const desc = json?.description || `Telegram getFile error ${res.status}`;
    throw new Error(desc);
  }
  const filePath = json?.result?.file_path;
  if (!filePath) throw new Error("file_path Telegram javobida topilmadi");
  return filePath;
}

const filePathCache = new Map();

async function getFilePath(fileId) {
  const cached = filePathCache.get(fileId);
  if (cached) return cached;
  const filePath = await getTelegramFilePath(fileId);
  filePathCache.set(fileId, filePath);
  return filePath;
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return; }
  if (req.method !== "GET") { sendJson(res, 405, { error: "Method not allowed" }); return; }

  try {
    if (!BOT_TOKEN) {
      throw new Error("TELEGRAM_BOT_TOKEN environment variable o'rnatilmagan");
    }

    const fileId = Array.isArray(req.query?.fileId)
      ? req.query.fileId[0]
      : req.query?.fileId;

    if (!fileId) throw new Error("fileId parametri topilmadi");

    const filePath = await getFilePath(String(fileId));
    const tgUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

    const tgRes = await fetch(tgUrl);
    if (!tgRes.ok) {
      throw new Error(`Telegram fayl yuklashda xato (HTTP ${tgRes.status})`);
    }

    const buf = Buffer.from(await tgRes.arrayBuffer());

    // ✅ FIX: content-type to'g'ri aniqlanadi
    let contentType = tgRes.headers.get("content-type") || "";
    if (!contentType || contentType === "application/octet-stream") {
      if (filePath.endsWith(".webp")) contentType = "image/webp";
      else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) contentType = "image/jpeg";
      else if (filePath.endsWith(".png")) contentType = "image/png";
      else contentType = "image/jpeg";
    }

    res.statusCode = 200;
    res.setHeader("content-type", contentType);
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
    res.setHeader("x-content-type-options", "nosniff");
    res.end(buf);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fayl topilmadi";
    console.error("[api/file/[fileId]] error:", message);
    sendJson(res, 400, { error: message });
  }
}
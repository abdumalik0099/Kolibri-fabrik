// Vercel Serverless Function: GET /api/file/:fileId
// Proxies Telegram file bytes without exposing bot token to the browser.

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

async function tgGetFile(fileId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getFile`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ file_id: fileId }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) {
    const desc = json?.description || `Telegram error ${res.status}`;
    throw new Error(desc);
  }
  return json.result;
}

const filePathCache = new Map(); // fileId -> file_path (warm instance only)

async function getFilePath(fileId) {
  const cached = filePathCache.get(fileId);
  if (cached) return cached;
  const result = await tgGetFile(fileId);
  const filePath = result?.file_path;
  if (!filePath) throw new Error("No file_path in getFile result");
  filePathCache.set(fileId, filePath);
  return filePath;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    if (!BOT_TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN");
    const fileId = Array.isArray(req.query?.fileId) ? req.query.fileId[0] : req.query?.fileId;
    if (!fileId) throw new Error("Missing fileId");
    const filePath = await getFilePath(String(fileId));
    const url = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

    const tgRes = await fetch(url);
    if (!tgRes.ok) throw new Error(`Telegram file fetch failed (${tgRes.status})`);

    const buf = Buffer.from(await tgRes.arrayBuffer());
    res.statusCode = 200;
    res.setHeader("content-type", tgRes.headers.get("content-type") || "application/octet-stream");
    res.setHeader("cache-control", "public, max-age=31536000, immutable");
    res.end(buf);
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : "Unknown error" });
  }
}


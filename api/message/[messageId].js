// Vercel Serverless Function: DELETE /api/message/:messageId
// Deletes a Telegram channel message (bot must be admin in the channel).

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
  const origin = req.headers.origin || "*";
  res.setHeader("access-control-allow-origin", origin);
  res.setHeader("access-control-allow-methods", "DELETE,OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
}

async function tgDeleteMessage(messageId) {
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: CHAT_ID, message_id: Number(messageId) }),
  });
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
  if (req.method !== "DELETE") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    if (!BOT_TOKEN) throw new Error("Missing TELEGRAM_BOT_TOKEN");
    if (!CHAT_ID) throw new Error("Missing TELEGRAM_CHAT_ID");
    const messageId = Array.isArray(req.query?.messageId) ? req.query.messageId[0] : req.query?.messageId;
    if (!messageId) throw new Error("Missing messageId");
    await tgDeleteMessage(String(messageId));
    sendJson(res, 200, { ok: true });
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : "Unknown error" });
  }
}


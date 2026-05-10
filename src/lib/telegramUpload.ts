export type TelegramUploadResult = {
  file_id: string;
  smallest_file_id?: string | null;
  largest_file_id?: string | null;
  message_id?: number;
};

// 1. Sening yangi Render backend manziling (localhost o'rniga)
const API_URL = "https://kolibri-server.onrender.com";

// 2. Sayt Vercel'da turganda so'rovlarni to'g'ri Render'ga yo'naltirish funksiyasi
function apiUrl(path: string): string {
  // Agar yo'l allaqachon to'liq havola bo'lsa, o'zini qaytaramiz
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  // Bo'lmasa uni Render serverimiz havolasiga ulaymiz
  return `${API_URL}${path}`;
}

export async function uploadImageToTelegram(params: {
  dataUrl: string;
  fileName?: string;
}): Promise<TelegramUploadResult> {
  // Bu qism Vercel API orqali ishlayveradi (chunki /api/upload o'ziniki)
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dataUrl: params.dataUrl, fileName: params.fileName }),
  });
  const json = (await res.json().catch(() => null)) as TelegramUploadResult | { error?: string } | null;
  if (!res.ok || !json || ("error" in json && json.error)) {
    throw new Error((json as { error?: string })?.error || "Telegram image upload failed");
  }
  return json as TelegramUploadResult;
}

export async function uploadVideoToTelegram(params: {
  file: File;
  fileName?: string;
}): Promise<TelegramUploadResult> {
  const formData = new FormData();
  formData.append("video", params.file, params.fileName || params.file.name || "product-video.mp4");

  // 3. Localhost o'rniga bizning Render dagi yangi API_URL ishlatiladi
  const res = await fetch(apiUrl("/api/upload-video"), {
    method: "POST",
    body: formData,
  });

  const json = (await res.json().catch(() => null)) as
    | {
        ok?: boolean;
        error?: string;
        file_id?: string;
        smallest_file_id?: string | null;
        largest_file_id?: string | null;
        message_id?: number;
      }
    | null;

  if (!res.ok || !json || ("error" in json && json.error)) {
    throw new Error(json?.error || "Telegram video upload failed");
  }

  const fileId = json.largest_file_id || json.file_id;
  if (!fileId) {
    throw new Error("No video file_id returned from server");
  }

  console.log("[uploadVideoToTelegram] response", json);

  return {
    file_id: fileId,
    largest_file_id: json.largest_file_id || fileId,
    smallest_file_id: json.smallest_file_id ?? null,
    message_id: json.message_id,
  };
}

export async function deleteTelegramMessage(messageId: number): Promise<void> {
  const res = await fetch(apiUrl(`/api/message/${messageId}`), { method: "DELETE" });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!res.ok || !json?.ok) {
    throw new Error(json?.error || "Telegram delete failed");
  }
}

export function telegramFileProxyUrl(fileId: string): string {
  // 4. Videolarni ko'rsatish uchun havolani Render serveriga yo'naltiramiz
  return apiUrl(`/api/file/${encodeURIComponent(fileId)}`);
}
export type TelegramUploadResult = {
  file_id: string;
  smallest_file_id?: string | null;
  largest_file_id?: string | null;
  message_id?: number;
};

function apiUrl(path: string): string {
  return path;
}

export async function uploadImageToTelegram(params: {
  dataUrl: string;
  fileName?: string;
}): Promise<TelegramUploadResult> {
  const res = await fetch(apiUrl("/api/upload"), {
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

  const res = await fetch("http://localhost:3001/api/upload-video", {
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
    throw new Error("No video file_id returned from local server");
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
  return apiUrl(`/api/file/${encodeURIComponent(fileId)}`);
}

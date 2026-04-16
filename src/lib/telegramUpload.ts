export type TelegramUploadResult = {
  file_id: string;
  smallest_file_id?: string | null;
  largest_file_id?: string | null;
  message_id?: number;
};

export async function uploadImageToTelegram(params: {
  dataUrl: string; // data:image/...;base64,...
  fileName?: string;
}): Promise<TelegramUploadResult> {
  const res = await fetch(`/api/upload`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dataUrl: params.dataUrl, fileName: params.fileName }),
  });
  const json = (await res.json().catch(() => null)) as TelegramUploadResult | { error?: string } | null;
  if (!res.ok || !json || ("error" in json && json.error)) {
    throw new Error((json as { error?: string })?.error || "Telegram upload failed");
  }
  return json as TelegramUploadResult;
}

export async function deleteTelegramMessage(messageId: number): Promise<void> {
  const res = await fetch(`/api/message/${messageId}`, { method: "DELETE" });
  const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
  if (!res.ok || !json?.ok) throw new Error(json?.error || "Telegram delete failed");
}

export function telegramFileProxyUrl(fileId: string): string {
  return `/api/file/${encodeURIComponent(fileId)}`;
}

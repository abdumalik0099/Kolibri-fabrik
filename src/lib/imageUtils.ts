async function decodeImageSource(file: Blob): Promise<HTMLImageElement | ImageBitmap> {
  // Prefer createImageBitmap: faster + avoids some <img> decode hangs on big/odd files.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall back to <img> below.
    }
  }

  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Failed to encode image"));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}

export type WebpEncodeOptions = {
  maxWidth?: number;
  maxHeight?: number;
  maxBytes?: number;
  initialQuality?: number;
  minQuality?: number;
  fileNameBase?: string;
};

/**
 * Converts any image file into a compressed WebP File in the browser.
 * Uses an adaptive loop to get under `maxBytes` while keeping quality high.
 */
export async function imageFileToWebp(
  file: File,
  {
    maxWidth = 2560,
    maxHeight = 2560,
    maxBytes = 700_000,
    initialQuality = 0.86,
    minQuality = 0.55,
    fileNameBase,
  }: WebpEncodeOptions = {}
): Promise<File> {
  let decoded: HTMLImageElement | ImageBitmap;
  try {
    decoded = await decodeImageSource(file);
  } catch {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    throw new Error(`Rasm formati qo'llab-quvvatlanmaydi: ${ext ? "." + ext : "unknown"}`);
  }

  let targetW =
    decoded instanceof ImageBitmap
      ? decoded.width
      : decoded.naturalWidth || decoded.width;
  let targetH =
    decoded instanceof ImageBitmap
      ? decoded.height
      : decoded.naturalHeight || decoded.height;

  const widthRatio = maxWidth / targetW;
  const heightRatio = maxHeight / targetH;
  const ratio = Math.min(1, widthRatio, heightRatio);
  targetW = Math.max(1, Math.round(targetW * ratio));
  targetH = Math.max(1, Math.round(targetH * ratio));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { alpha: false })!;

  let quality = initialQuality;
  let attempts = 0;
  let blob: Blob | null = null;

  // Iteratively lower quality, and if needed, lower dimensions slightly.
  // Keeps attempts bounded to avoid freezing the UI on bulk operations.
  while (attempts < 10) {
    canvas.width = targetW;
    canvas.height = targetH;
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(decoded as unknown as CanvasImageSource, 0, 0, targetW, targetH);

    const encoded = await canvasToBlob(canvas, "image/webp", quality);
    blob = encoded;
    if (encoded.size <= maxBytes) break;

    if (quality > minQuality) {
      quality = Math.max(minQuality, quality - 0.07);
    } else {
      targetW = Math.max(1, Math.round(targetW * 0.9));
      targetH = Math.max(1, Math.round(targetH * 0.9));
    }
    attempts += 1;
  }

  if (!blob) throw new Error("WebP conversion failed");

  const base = fileNameBase || file.name.replace(/\.[^/.]+$/, "") || "image";
  const out = new File([blob], `${base}.webp`, { type: "image/webp" });

  if (decoded instanceof ImageBitmap) decoded.close();
  return out;
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(blob);
  });
}

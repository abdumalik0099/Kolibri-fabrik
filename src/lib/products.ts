import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { blobToDataUrl, imageFileToWebp } from "./imageUtils";
import { telegramFileProxyUrl, uploadImageToTelegram, uploadVideoToTelegram } from "./telegramUpload";

export interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  description: string;
  imageUrl?: string;
  imageTelegramFileId?: string;
  imageTelegramMessageId?: number;
  videoUrl?: string;
  videoTelegramFileId?: string;
  videoTelegramMessageId?: number;
  galleryCoverUrl?: string;
  galleryCoverThumbUrl?: string;
  galleryCount?: number;
  createdAt: number;
}

const COLLECTION = "products";

// ✅ Barcha mumkin bo'lgan field nomlari qo'llab-quvvatlanadi
type ProductRecord = Product & {
  image_url?: string;
  image_file_id?: string;
  image_telegram_file_id?: string;
  video_url?: string;
  video_file_id?: string;
  video_telegram_file_id?: string;
};

function pickFirstString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickFirstNumber(...values: Array<unknown>): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function extractTelegramFileIdFromProxyUrl(url?: string): string | null {
  if (!url) return null;
  // /api/file/<fileId> formatidagi URL'dan file_id ajratib olinadi
  const match = url.match(/\/api\/file\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

// ✅ Eski "o'lik" URL'larni tozalaydi va faqat ishchi file_id asosidagi URL qaytaradi
function normalizeTelegramMediaUrl(url?: string, fileId?: string): string | undefined {
  // 1. Agar to'g'ridan-to'g'ri file_id berilgan bo'lsa - ishlatamiz
  const directFileId = fileId?.trim();
  if (directFileId) return telegramFileProxyUrl(directFileId);

  // 2. Agar URL /api/file/<id> formatida bo'lsa - file_id ajratib olamiz
  const proxyFileId = extractTelegramFileIdFromProxyUrl(url);
  if (proxyFileId) return telegramFileProxyUrl(proxyFileId);

  // 3. Agar URL https://api.telegram.org/file/bot... formatida bo'lsa - o'tkazib yuboramiz (eski, ishlamaydigan)
  if (url && url.includes("api.telegram.org/file/bot")) {
    return undefined; // Eski to'g'ridan-to'g'ri URL'lar ishlamaydi, o'chirilamiz
  }

  // 4. Boshqa URL'lar (masalan, Firebase Storage yoki CDN) - qoldirish
  return url || undefined;
}

// ✅ imageUrl va image_url ikkalasini ham normallashtiradi
function normalizeProduct(product: ProductRecord): Product {
  const imageFileId = pickFirstString(
    product.imageTelegramFileId,
    product.image_file_id,
    product.image_telegram_file_id
  );
  const videoFileId = pickFirstString(
    product.videoTelegramFileId,
    product.video_file_id,
    product.video_telegram_file_id
  );
  // ✅ imageUrl va image_url ikkalasini ham tan oladi
  const imageUrl = pickFirstString(product.imageUrl, product.image_url);
  const videoUrl = pickFirstString(product.videoUrl, product.video_url);

  return {
    ...product,
    imageTelegramFileId: imageFileId,
    videoTelegramFileId: videoFileId,
    imageUrl: normalizeTelegramMediaUrl(imageUrl, imageFileId),
    videoUrl: normalizeTelegramMediaUrl(videoUrl, videoFileId),
    createdAt: pickFirstNumber(product.createdAt) || Date.now(),
  };
}

// ✅ Rasmdagi URL ni to'g'ri qaytaradi (imageUrl va image_url ikkalasini ham tekshiradi)
export function getProductImageUrl(product?: Partial<ProductRecord>): string | undefined {
  return normalizeTelegramMediaUrl(
    pickFirstString(product?.imageUrl, product?.image_url),
    pickFirstString(
      product?.imageTelegramFileId,
      product?.image_file_id,
      product?.image_telegram_file_id
    )
  );
}

export function getProductVideoUrl(product?: Partial<ProductRecord>): string | undefined {
  return normalizeTelegramMediaUrl(
    pickFirstString(product?.videoUrl, product?.video_url),
    pickFirstString(
      product?.videoTelegramFileId,
      product?.video_file_id,
      product?.video_telegram_file_id
    )
  );
}

export async function getProducts(): Promise<Product[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) =>
    normalizeProduct({ id: d.id, ...d.data() } as ProductRecord)
  );
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return normalizeProduct({ id: snap.id, ...snap.data() } as ProductRecord);
}

export async function addProduct(
  data: Omit<Product, "id" | "imageUrl" | "createdAt">,
  imageFile?: File,
  videoFile?: File
): Promise<string> {
  if (!imageFile && !videoFile) throw new Error("Rasm yoki video tanlang");

  let imageUrl: string | null = null;
  let imageTelegramFileId: string | null = null;
  let imageTelegramMessageId: number | null = null;

  if (imageFile) {
    const webp = await imageFileToWebp(imageFile);
    const dataUrl = await blobToDataUrl(webp);
    const tg = await uploadImageToTelegram({ dataUrl, fileName: webp.name || "product.webp" });
    const bestFileId = tg.largest_file_id || tg.file_id;
    imageUrl = telegramFileProxyUrl(bestFileId);
    imageTelegramFileId = tg.file_id;
    imageTelegramMessageId = tg.message_id ?? null;
  }

  let videoUrl: string | null = null;
  let videoTelegramFileId: string | null = null;
  let videoTelegramMessageId: number | null = null;

  if (videoFile) {
    const videoTg = await uploadVideoToTelegram({
      file: videoFile,
      fileName: videoFile.name || "product-video.mp4",
    });
    const bestVideoFileId = videoTg.largest_file_id || videoTg.file_id;
    videoUrl = telegramFileProxyUrl(bestVideoFileId);
    videoTelegramFileId = videoTg.file_id;
    videoTelegramMessageId = videoTg.message_id ?? null;
  }

  // ✅ Ikkala format ham saqlanadi (imageUrl va image_url) - backward compatibility
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    imageUrl,
    image_url: imageUrl,
    imageTelegramFileId,
    image_file_id: imageTelegramFileId,
    imageTelegramMessageId,
    videoUrl,
    video_url: videoUrl,
    videoTelegramFileId,
    video_file_id: videoTelegramFileId,
    videoTelegramMessageId,
    createdAt: Date.now(),
  });

  return docRef.id;
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, "id">>,
  imageFile?: File,
  videoFile?: File
): Promise<void> {
  const updates: Record<string, unknown> = { ...data };

  if (imageFile) {
    const webp = await imageFileToWebp(imageFile);
    const dataUrl = await blobToDataUrl(webp);
    const tg = await uploadImageToTelegram({ dataUrl, fileName: webp.name || "product.webp" });
    const bestFileId = tg.largest_file_id || tg.file_id;
    updates.imageUrl = telegramFileProxyUrl(bestFileId);
    updates.image_url = updates.imageUrl; // ✅ ikkalasini ham yangilaymiz
    updates.imageTelegramFileId = tg.file_id;
    updates.image_file_id = tg.file_id;
    updates.imageTelegramMessageId = tg.message_id ?? null;
  }

  if (videoFile) {
    const tg = await uploadVideoToTelegram({
      file: videoFile,
      fileName: videoFile.name || "product-video.mp4",
    });
    const bestVideoFileId = tg.largest_file_id || tg.file_id;
    updates.videoUrl = telegramFileProxyUrl(bestVideoFileId);
    updates.video_url = updates.videoUrl; // ✅ ikkalasini ham yangilaymiz
    updates.videoTelegramFileId = tg.file_id;
    updates.video_file_id = tg.file_id;
    updates.videoTelegramMessageId = tg.message_id ?? null;
  }

  await updateDoc(doc(db, COLLECTION, id), updates);
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

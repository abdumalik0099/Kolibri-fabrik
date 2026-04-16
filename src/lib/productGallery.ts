import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ProductGalleryItem = {
  id: string;
  srcUrl?: string; // e.g. Telegram proxy URL for the best (largest) image
  thumbUrl?: string; // Telegram proxy URL for smallest image
  createdAt: number;
  originalName?: string;
  telegramFileId?: string;
  telegramSmallestFileId?: string;
  telegramLargestFileId?: string;
  telegramMessageId?: number;
};

const SUBCOLLECTION = "gallery";

function galleryCol(productId: string) {
  return collection(db, "products", productId, SUBCOLLECTION);
}

export async function getProductGalleryCount(productId: string): Promise<number> {
  const snap = await getCountFromServer(galleryCol(productId));
  return snap.data().count;
}

export async function getProductGalleryPage(params: {
  productId: string;
  pageSize: number;
  cursor?: DocumentSnapshot | null;
}): Promise<{ items: ProductGalleryItem[]; nextCursor: DocumentSnapshot | null }> {
  const { productId, pageSize, cursor } = params;
  const base = query(galleryCol(productId), orderBy("createdAt", "desc"), limit(pageSize));
  const q = cursor ? query(base, startAfter(cursor)) : base;

  const snap = await getDocs(q);
  const docs = snap.docs;
  const items = docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ProductGalleryItem, "id">) }));
  const nextCursor = docs.length > 0 ? docs[docs.length - 1]! : null;
  return { items, nextCursor };
}

export async function addProductGalleryTelegramImage(params: {
  productId: string;
  telegramFileId: string;
  telegramSmallestFileId?: string | null;
  telegramLargestFileId?: string | null;
  telegramMessageId?: number;
  srcUrl: string;
  thumbUrl?: string;
  originalName?: string;
}): Promise<string> {
  const {
    productId,
    telegramFileId,
    telegramSmallestFileId,
    telegramLargestFileId,
    telegramMessageId,
    srcUrl,
    thumbUrl,
    originalName,
  } = params;
  const docRef = await addDoc(galleryCol(productId), {
    telegramFileId,
    telegramSmallestFileId: telegramSmallestFileId ?? null,
    telegramLargestFileId: telegramLargestFileId ?? null,
    telegramMessageId: telegramMessageId ?? null,
    srcUrl,
    thumbUrl: thumbUrl || null,
    originalName: originalName || null,
    createdAt: Date.now(),
  });
  return docRef.id;
}

export async function deleteProductGalleryImage(productId: string, galleryItemId: string): Promise<void> {
  await deleteDoc(doc(db, "products", productId, SUBCOLLECTION, galleryItemId));
}

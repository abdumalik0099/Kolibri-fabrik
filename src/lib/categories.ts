import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import { blobToDataUrl, imageFileToWebp } from "./imageUtils";
import { telegramFileProxyUrl, uploadImageToTelegram } from "@/lib/telegramUpload";

export interface Category {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: number;
}

const COLLECTION = "categories";

export async function getCategories(): Promise<Category[]> {
  const snapshot = await getDocs(collection(db, COLLECTION));
  const cats = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Category));
  return cats.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export async function addCategory(name: string, imageFile: File): Promise<string> {
  const webp = await imageFileToWebp(imageFile);
  const dataUrl = await blobToDataUrl(webp);
  const tg = await uploadImageToTelegram({ dataUrl, fileName: webp.name || "category.webp" });
  const bestFileId = tg.largest_file_id || tg.file_id;
  const imageUrl = telegramFileProxyUrl(bestFileId);
  const docRef = await addDoc(collection(db, COLLECTION), {
    name,
    imageUrl,
    createdAt: Date.now(),
  });
  return docRef.id;
}

export async function updateCategory(
  id: string,
  name: string,
  imageFile?: File
): Promise<void> {
  const updates: Record<string, unknown> = { name };
  if (imageFile) {
    const webp = await imageFileToWebp(imageFile);
    const dataUrl = await blobToDataUrl(webp);
    const tg = await uploadImageToTelegram({ dataUrl, fileName: webp.name || "category.webp" });
    const bestFileId = tg.largest_file_id || tg.file_id;
    updates.imageUrl = telegramFileProxyUrl(bestFileId);
  }
  await updateDoc(doc(db, COLLECTION, id), updates);
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

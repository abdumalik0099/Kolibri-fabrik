import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import { compressImage } from "./imageUtils";

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
  const imageUrl = await compressImage(imageFile);
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
    updates.imageUrl = await compressImage(imageFile);
  }
  await updateDoc(doc(db, COLLECTION, id), updates);
}

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

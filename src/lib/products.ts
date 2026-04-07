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
import { compressImage } from "./imageUtils";

export interface Product {
  id: string;
  title: string;
  price: number;
  category: string;
  description: string;
  imageUrl: string;
  createdAt: number;
}

const COLLECTION = "products";

export async function getProducts(): Promise<Product[]> {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
}

export async function getProduct(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Product;
}

export async function addProduct(
  data: Omit<Product, "id" | "imageUrl" | "createdAt">,
  imageFile: File
): Promise<string> {
  const imageUrl = await compressImage(imageFile);
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    imageUrl,
    createdAt: Date.now(),
  });
  return docRef.id;
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, "id">>,
  imageFile?: File
): Promise<void> {
  const updates: Record<string, unknown> = { ...data };
  if (imageFile) {
    updates.imageUrl = await compressImage(imageFile);
  }
  await updateDoc(doc(db, COLLECTION, id), updates);
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}

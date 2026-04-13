import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";

export type AnalyticsPayload = {
  deviceModel: string;
  location: string;
  entryTime?: ReturnType<typeof serverTimestamp>;
  sessionId: string;
};

export async function logVisit(payload: AnalyticsPayload) {
  await addDoc(collection(db, "analytics"), {
    deviceModel: payload.deviceModel,
    location: payload.location,
    sessionId: payload.sessionId,
    entryTime: serverTimestamp(),
  });
}

export async function upsertPresence(sessionId: string, data: { deviceModel: string; location: string }) {
  await setDoc(
    doc(db, "presence", sessionId),
    {
      deviceModel: data.deviceModel,
      location: data.location,
      lastActive: serverTimestamp(),
      sessionId,
      entryTime: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function resetStatistics() {
  const analyticsSnapshot = await getDocs(collection(db, "analytics"));
  const presenceSnapshot = await getDocs(collection(db, "presence"));
  const batch = writeBatch(db);

  analyticsSnapshot.docs.forEach((docRef) => {
    batch.delete(doc(db, "analytics", docRef.id));
  });

  presenceSnapshot.docs.forEach((docRef) => {
    batch.delete(doc(db, "presence", docRef.id));
  });

  await batch.commit();
}

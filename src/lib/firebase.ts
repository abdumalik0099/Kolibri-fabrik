import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const env = import.meta.env as unknown as Partial<Record<string, string>>;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? "AIzaSyASssZsJ916lU5ERMgvDSmsx3MxPNAbYUw",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "aloqa-tarmoq.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "aloqa-tarmoq",
  // IMPORTANT: If you see CORS/preflight upload errors, your bucket name or bucket CORS may be wrong.
  // Set `VITE_FIREBASE_STORAGE_BUCKET` to the exact bucket shown in Firebase Console -> Storage.
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "aloqa-tarmoq.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "568484567013",
  appId: env.VITE_FIREBASE_APP_ID ?? "1:568484567013:web:99420835fbe876042e410c",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? "G-JVZ9JT90KX",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export default app;

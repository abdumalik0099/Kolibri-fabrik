import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyASssZsJ916lU5ERMgvDSmsx3MxPNAbYUw",
  authDomain: "aloqa-tarmoq.firebaseapp.com",
  projectId: "aloqa-tarmoq",
  storageBucket: "aloqa-tarmoq.firebasestorage.app",
  messagingSenderId: "568484567013",
  appId: "1:568484567013:web:99420835fbe876042e410c",
  measurementId: "G-JVZ9JT90KX",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

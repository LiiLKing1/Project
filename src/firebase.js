import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyDEqsJlagD68qJA0E8Ys2CiC8iTUpjNYlM",
  authDomain: "project-500cb.firebaseapp.com",
  projectId: "project-500cb",
  storageBucket: "project-500cb.firebasestorage.app",
  messagingSenderId: "90975235362",
  appId: "1:90975235362:web:8d566c3f82fe556ece897b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
});


export default app;

import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, indexedDBLocalPersistence, browserLocalPersistence } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDEqsJlagD68qJA0E8Ys2CiC8iTUpjNYlM",
  authDomain: "project-500cb.firebaseapp.com",
  projectId: "project-500cb",
  storageBucket: "project-500cb.firebasestorage.app",
  messagingSenderId: "90975235362",
  appId: "1:90975235362:web:8d566c3f82fe556ece897b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Explicitly set persistence so Electron doesn't drop the session on restart
setPersistence(auth, indexedDBLocalPersistence).catch(() => {
  setPersistence(auth, browserLocalPersistence);
});

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export default app;

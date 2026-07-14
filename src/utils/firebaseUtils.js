import { getDoc, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const TIMEOUT_MS = 15000; 

export const withTimeout = (promise, actionName = 'Amal') => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`[Kechikish] ${actionName} uzoq vaqt olmoqda. Ma'lumotlar offline saqlangan bo'lishi mumkin. Sahifani yangilab tekshiring.`));
    }, TIMEOUT_MS);
  });
  return Promise.race([promise, timeoutPromise]);
};

// Wrappers for Firestore operations
export const fetchDoc = (ref) => withTimeout(getDoc(ref), 'Hujjat yuklash');
export const fetchDocs = (query) => withTimeout(getDocs(query), 'Ro\'yxat yuklash');

// Instant writes (Optimistic UI)
export const saveDoc = async (collectionRef, data) => {
  const newDocRef = doc(collectionRef);
  setDoc(newDocRef, { ...data, createdAt: new Date().toISOString() }).catch(console.error);
  return newDocRef;
};

export const editDoc = async (docRef, data) => {
  updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() }).catch(console.error);
  return docRef;
};

export const removeDoc = async (docRef) => {
  deleteDoc(docRef).catch(console.error);
  return docRef;
};

export const putDoc = async (docRef, data) => {
  setDoc(docRef, data).catch(console.error);
  return docRef;
};

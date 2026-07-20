// firebaseMock.js - Haqiqiy Firebase/Firestore ga to'g'ridan-to'g'ri ulanadi
// Bu fayl endi mock emas - barcha funksiyalar haqiqiy Firebase SDK dan re-export qilinadi
export {
  collection,
  doc,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  onSnapshot,
  writeBatch,
  runTransaction,
  increment,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  getCountFromServer,
} from 'firebase/firestore';

export {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

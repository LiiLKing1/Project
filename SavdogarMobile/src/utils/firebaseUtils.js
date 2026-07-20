import { getDoc, getDocs, doc, setDoc, updateDoc, deleteDoc, collection } from '../services/firebaseMock';
import { db } from '../firebase';

const TIMEOUT_MS = 8000; 

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

// Audit Log Helper
export const logAudit = async (storeId, userProfile, action, resource, details = '') => {
  if (!storeId || !userProfile) return;
  try {
    const auditRef = doc(collection(db, `users/${storeId}/auditLogs`));
    await setDoc(auditRef, {
      action,
      resource,
      details,
      userId: userProfile.uid || userProfile.id || 'unknown',
      userName: userProfile.name || userProfile.fullName || 'Admin',
      userRole: userProfile.role || 'admin',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Audit log saqlashda xatolik:', error);
  }
};

// Instant writes (Optimistic UI)
export const saveDoc = async (collectionRef, data, auditData = null) => {
  const newDocRef = doc(collectionRef);
  await withTimeout(setDoc(newDocRef, { ...data, createdAt: new Date().toISOString() }), "Ma'lumotni saqlash");
  if (auditData) {
    await logAudit(auditData.storeId, auditData.userProfile, 'CREATE', auditData.resource, auditData.details);
  }
  return newDocRef;
};

export const editDoc = async (docRef, data, auditData = null) => {
  await withTimeout(updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() }), "Ma'lumotni tahrirlash");
  if (auditData) {
    await logAudit(auditData.storeId, auditData.userProfile, 'UPDATE', auditData.resource, auditData.details);
  }
  return docRef;
};

export const softDeleteDoc = async (docRef, auditData = null) => {
  await withTimeout(updateDoc(docRef, { status: 'archived', archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }), "Ma'lumotni arxivlash");
  if (auditData) {
    await logAudit(auditData.storeId, auditData.userProfile, 'ARCHIVE', auditData.resource, auditData.details);
  }
  return docRef;
};

export const removeDoc = async (docRef, auditData = null) => {
  await withTimeout(deleteDoc(docRef), "Ma'lumotni o'chirish");
  if (auditData) {
    await logAudit(auditData.storeId, auditData.userProfile, 'DELETE', auditData.resource, auditData.details);
  }
  return docRef;
};

export const putDoc = async (docRef, data, auditData = null) => {
  await withTimeout(setDoc(docRef, data), "Ma'lumotni yozish");
  if (auditData) {
    await logAudit(auditData.storeId, auditData.userProfile, 'PUT', auditData.resource, auditData.details);
  }
  return docRef;
};

export const generateDiff = (oldObj, newObj, ignoreKeys = ['updatedAt', 'createdAt', 'id', 'archivedAt', 'status']) => {
  if (!oldObj || !newObj) return '';
  const changes = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  allKeys.forEach(key => {
    if (ignoreKeys.includes(key)) return;
    let oldVal = oldObj[key];
    let newVal = newObj[key];
    if (oldVal === undefined) oldVal = '';
    if (newVal === undefined) newVal = '';
    if (Array.isArray(oldVal) && Array.isArray(newVal)) {
       if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) changes.push(key + ': o\'zgardi');
       return;
    }
    if (typeof oldVal === 'object' && typeof newVal === 'object' && oldVal !== null && newVal !== null) {
      if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) changes.push(key + ': o\'zgardi');
      return;
    }
    if (oldVal !== newVal) {
      if (typeof oldVal === 'boolean') oldVal = oldVal ? 'ha' : 'yo\'q';
      if (typeof newVal === 'boolean') newVal = newVal ? 'ha' : 'yo\'q';
      if (oldVal === '') oldVal = 'bo\'sh';
      if (newVal === '') newVal = 'bo\'sh';
      changes.push(key + ' (' + oldVal + ' -> ' + newVal + ')');
    }
  });
  return changes.length > 0 ? changes.join(', ') : '';
};
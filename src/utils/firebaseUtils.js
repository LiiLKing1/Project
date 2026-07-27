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

// Background Google Drive Sync Helper
const triggerDriveSync = (ref, data, action) => {
  if (window.electronAPI?.syncToDrive && ref?.path) {
    const parts = ref.path.split('/');
    if (parts.length >= 4 && parts[0] === 'users') {
      const storeId = parts[1];
      const collectionName = parts[2];
      const docId = parts[parts.length - 1]; // usually parts[3]
      window.electronAPI.syncToDrive({ storeId, collectionName, docId, data, action });
    } else if (parts.length === 2 && parts[0] === 'users') {
      const storeId = parts[1];
      window.electronAPI.syncToDrive({ storeId, collectionName: 'profile', docId: storeId, data, action });
    }
  }
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

export const saveDoc = async (collectionRef, data, auditData = null) => {
  const newDocRef = doc(collectionRef);
  const docData = { ...data, createdAt: new Date().toISOString() };
  await withTimeout(setDoc(newDocRef, docData), "Ma'lumotni saqlash");
  triggerDriveSync(newDocRef, docData, 'CREATE');
  if (auditData) {
    await logAudit(auditData.storeId, auditData.userProfile, 'CREATE', auditData.resource, auditData.details);
  }
  return newDocRef;
};

export const editDoc = async (docRef, data, auditData = null) => {
  const docData = { ...data, updatedAt: new Date().toISOString() };
  await withTimeout(updateDoc(docRef, docData), "Ma'lumotni tahrirlash");
  triggerDriveSync(docRef, docData, 'UPDATE');
  if (auditData) {
    await logAudit(auditData.storeId, auditData.userProfile, 'UPDATE', auditData.resource, auditData.details);
  }
  return docRef;
};

export const softDeleteDoc = async (docRef, auditData = null) => {
  const docData = { status: 'archived', archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await withTimeout(updateDoc(docRef, docData), "Ma'lumotni arxivlash");
  triggerDriveSync(docRef, docData, 'UPDATE'); // For soft delete, just update
  if (auditData) {
    await logAudit(auditData.storeId, auditData.userProfile, 'ARCHIVE', auditData.resource, auditData.details);
  }
  return docRef;
};

export const removeDoc = async (docRef, auditData = null) => {
  await withTimeout(deleteDoc(docRef), "Ma'lumotni o'chirish");
  triggerDriveSync(docRef, null, 'DELETE');
  if (auditData) {
    await logAudit(auditData.storeId, auditData.userProfile, 'DELETE', auditData.resource, auditData.details);
  }
  return docRef;
};

export const putDoc = async (docRef, data, auditData = null) => {
  await withTimeout(setDoc(docRef, data), "Ma'lumotni yozish");
  triggerDriveSync(docRef, data, 'CREATE');
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
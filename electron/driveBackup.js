import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEYFILEPATH = path.join(__dirname, 'savdogar-service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'];

let auth;
let drive;

try {
  if (fs.existsSync(KEYFILEPATH)) {
    auth = new google.auth.GoogleAuth({
      keyFile: KEYFILEPATH,
      scopes: SCOPES,
    });
    drive = google.drive({ version: 'v3', auth });
    console.log("[Google Drive] Service account loaded successfully.");
  } else {
    console.warn("[Google Drive] savdogar-service-account.json not found!");
  }
} catch(e) {
  console.error("[Google Drive] Auth error:", e);
}

const ROOT_FOLDER_ID = '1fP4vHjIkcwR7diF63LAgBwremREHld4Y';

// Cache structure to avoid looking up folder IDs repeatedly
// { 'storeId': { id: 'folderId', collections: { 'products': 'folderId' } } }
const folderCache = {};

async function getOrCreateFolder(name, parentId) {
  if (!drive) return null;
  const query = `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const res = await drive.files.list({
    q: query,
    fields: 'files(id, name)',
    spaces: 'drive',
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  const fileMetadata = {
    name: name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId]
  };
  const createRes = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id'
  });
  return createRes.data.id;
}

async function getStoreFolderId(storeId) {
  if (folderCache[storeId]?.id) return folderCache[storeId].id;
  
  const id = await getOrCreateFolder(storeId, ROOT_FOLDER_ID);
  if (id) {
    folderCache[storeId] = { id, collections: {} };
  }
  return id;
}

async function getCollectionFolderId(storeId, collectionName) {
  if (folderCache[storeId]?.collections[collectionName]) {
    return folderCache[storeId].collections[collectionName];
  }
  
  const storeFolderId = await getStoreFolderId(storeId);
  if (!storeFolderId) return null;

  const id = await getOrCreateFolder(collectionName, storeFolderId);
  if (id) {
    folderCache[storeId].collections[collectionName] = id;
  }
  return id;
}

async function getFileId(name, parentId) {
   const query = `name='${name}' and '${parentId}' in parents and trashed=false`;
   const res = await drive.files.list({
     q: query,
     fields: 'files(id)',
     spaces: 'drive'
   });
   if (res.data.files.length > 0) return res.data.files[0].id;
   return null;
}

export async function syncToDrive({ storeId, collectionName, docId, data, action }) {
  if (!drive || !storeId || !collectionName || !docId) return;

  try {
    const parentId = await getCollectionFolderId(storeId, collectionName);
    if (!parentId) return;

    const fileName = `${docId}.json`;
    const existingFileId = await getFileId(fileName, parentId);

    if (action === 'DELETE') {
      if (existingFileId) {
        await drive.files.delete({ fileId: existingFileId });
        console.log(`[Google Drive] O'chirildi: ${collectionName}/${fileName}`);
      }
      return;
    }

    const fileMetadata = {
      name: fileName,
      parents: existingFileId ? undefined : [parentId] // parents cannot be provided during update
    };

    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(data, null, 2)
    };

    if (existingFileId) {
      await drive.files.update({
        fileId: existingFileId,
        media: media
      });
      console.log(`[Google Drive] Yangilandi: ${collectionName}/${fileName}`);
    } else {
      await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id'
      });
      console.log(`[Google Drive] Yaratildi: ${collectionName}/${fileName}`);
    }
  } catch (err) {
    console.error(`[Drive Sync Error] ${action} ${collectionName}/${docId}:`, err);
  }
}

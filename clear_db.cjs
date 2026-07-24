const admin = require('firebase-admin');
const fs = require('fs');
const readline = require('readline');

// Check if service-account.json exists
if (!fs.existsSync('./service-account.json')) {
  console.error("XATOLIK: 'service-account.json' fayli topilmadi!");
  console.log("Firebase Console -> Project Settings -> Service Accounts bo'limidan yangi kalit yarating va uni 'service-account.json' nomi bilan shu papkaga saqlang.");
  process.exit(1);
}

const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function deleteAllAuthUsers() {
  let nextPageToken;
  let deletedCount = 0;
  console.log("Foydalanuvchilarni o'chirish boshlandi...");
  
  do {
    const listUsersResult = await auth.listUsers(1000, nextPageToken);
    const uids = listUsersResult.users.map((userRecord) => userRecord.uid);
    
    if (uids.length > 0) {
      const deleteResult = await auth.deleteUsers(uids);
      deletedCount += deleteResult.successCount;
      console.log(`- ${deleteResult.successCount} ta foydalanuvchi o'chirildi...`);
    }
    
    nextPageToken = listUsersResult.pageToken;
  } while (nextPageToken);
  
  console.log(`Barcha foydalanuvchilar o'chirildi. Jami: ${deletedCount} ta.`);
}

async function deleteCollection(collectionPath, batchSize) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.orderBy('__name__').limit(batchSize);

  return new Promise((resolve, reject) => {
    deleteQueryBatch(query, resolve).catch(reject);
  });
}

async function deleteQueryBatch(query, resolve) {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    resolve();
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  process.nextTick(() => {
    deleteQueryBatch(query, resolve);
  });
}

async function deleteAllCollections() {
  console.log("Firestore ma'lumotlarini o'chirish boshlandi...");
  try {
    const collections = await db.listCollections();
    for (const collection of collections) {
      console.log(`- '${collection.id}' kolleksiyasi o'chirilmoqda...`);
      await deleteCollection(collection.id, 500);
    }
    console.log("Barcha kolleksiyalar o'chirildi.");
  } catch (err) {
    console.error("Firestore tozalashda xatolik:", err);
  }
}

rl.question("DIQQAT: Barcha foydalanuvchilar va Firestore ma'lumotlari o'chirib tashlanadi! Davom etamizmi? (ha/yoq): ", async (answer) => {
  if (answer.toLowerCase() === 'ha') {
    try {
      await deleteAllAuthUsers();
      await deleteAllCollections();
      console.log("-----------------------------------------");
      console.log("BAZA TO'LIQ TOZALANDI!");
      console.log("-----------------------------------------");
    } catch (error) {
      console.error("Xatolik yuz berdi:", error);
    }
  } else {
    console.log("Jarayon bekor qilindi.");
  }
  rl.close();
  process.exit(0);
});

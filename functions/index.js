const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { google } = require('googleapis');

admin.initializeApp();
const db = admin.firestore();

// 1. You must place your service account JSON file in the functions folder and name it 'service-account.json'.
// 2. You must enable Google Sheets API and Google Drive API in Google Cloud Console for this service account.
// 3. The service account will be the owner of the sheets, so we might want to share it with the user's email if needed,
//    or just let the user access it via a link or their own drive (we'll grant writer/reader access to the user's email).

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'];

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: './service-account.json', // Must be present when deploying
    scopes: SCOPES,
  });
  return await auth.getClient();
}

exports.onBusinessApproved = functions.firestore
  .document('users/{userId}')
  .onUpdate(async (change, context) => {
    const newValue = change.after.data();
    const previousValue = change.before.data();
    const userId = context.params.userId;

    if (previousValue.status !== 'active' && newValue.status === 'active') {
      try {
        const authClient = await getAuthClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });
        const drive = google.drive({ version: 'v3', auth: authClient });

        // Create new spreadsheet
        const spreadsheet = await sheets.spreadsheets.create({
          resource: {
            properties: {
              title: `Savdogar Platformasi - ${newValue.displayName || newValue.email}`,
            },
            sheets: [
              { properties: { title: 'Mahsulotlar' } },
              { properties: { title: 'Sotuvlar' } },
              { properties: { title: 'Xodimlar' } },
              { properties: { title: 'Mijozlar' } }
            ]
          },
          fields: 'spreadsheetId, spreadsheetUrl',
        });

        const spreadsheetId = spreadsheet.data.spreadsheetId;

        // Give the business owner permission to view/edit the sheet on their Google Drive
        if (newValue.email) {
          try {
             await drive.permissions.create({
               fileId: spreadsheetId,
               resource: {
                 type: 'user',
                 role: 'writer',
                 emailAddress: newValue.email,
               }
             });
          } catch(err) {
             console.error("Could not grant permission (maybe not a Google email):", err);
          }
        }

        // Save spreadsheetId to user document
        await db.collection('users').doc(userId).update({
          spreadsheetId: spreadsheetId,
          spreadsheetUrl: spreadsheet.data.spreadsheetUrl,
        });

        console.log(`Spreadsheet created for ${userId}: ${spreadsheetId}`);
      } catch (error) {
        console.error('Error creating spreadsheet:', error);
      }
    }
  });

// Listen to all subcollections inside a store (users/{storeId}/{collectionId}/{docId})
exports.onDataChanged = functions.firestore
  .document('users/{storeId}/{collectionId}/{docId}')
  .onWrite(async (change, context) => {
    const storeId = context.params.storeId;
    const collectionId = context.params.collectionId; // e.g., 'products', 'sales'
    
    // Only care about specific collections
    const targetSheets = {
      'products': 'Mahsulotlar',
      'sales': 'Sotuvlar',
      'staff': 'Xodimlar',
      'customers': 'Mijozlar'
    };

    const sheetName = targetSheets[collectionId];
    if (!sheetName) return null;

    // Get the spreadsheetId for this store
    const storeDoc = await db.collection('users').doc(storeId).get();
    if (!storeDoc.exists || !storeDoc.data().spreadsheetId) {
      return null;
    }
    const spreadsheetId = storeDoc.data().spreadsheetId;

    const data = change.after.exists ? change.after.data() : null;
    if (!data) return null; // Document was deleted, we just append changes normally, so maybe skip or write "DELETED"

    try {
      const authClient = await getAuthClient();
      const sheets = google.sheets({ version: 'v4', auth: authClient });

      // Flatten data object to a row array based on collection
      let row = [];
      const timestamp = new Date().toISOString();
      
      if (collectionId === 'products') {
        row = [timestamp, data.name || '', data.barcode || '', data.category || '', data.costPrice || 0, data.salePrice || 0, data.stock || 0];
      } else if (collectionId === 'sales') {
        row = [timestamp, data.id || '', data.totalAmount || 0, data.paymentMethod || '', data.cashierId || '', data.items ? JSON.stringify(data.items) : ''];
      } else {
        // generic fallback
        row = [timestamp, JSON.stringify(data)];
      }

      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [row]
        }
      });
      
      console.log(`Appended data to ${sheetName} for store ${storeId}`);
    } catch (error) {
      console.error('Error appending to spreadsheet:', error);
    }
  });

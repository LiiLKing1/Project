import { google } from 'googleapis';
import fs from 'fs';

async function run() {
  try {
    const keyFile = JSON.parse(fs.readFileSync('./electron/savdogar-service-account.json', 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: keyFile.client_email,
        private_key: keyFile.private_key
      },
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    const ROOT_FOLDER_ID = '1fP4vHjIkcwR7diF63LAgBwremREHld4Y';
    
    // Find pending_users
    const folderRes = await drive.files.list({
      q: `name='pending_users' and '${ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });
    
    if (folderRes.data.files.length === 0) {
      console.log("No pending_users folder found.");
      return;
    }
    
    const pendingFolderId = folderRes.data.files[0].id;
    console.log("Found pending_users folder:", pendingFolderId);
    
    // Create a test JSON file
    const media = {
      mimeType: 'application/json',
      body: JSON.stringify({ test: 'hello' })
    };
    
    const createRes = await drive.files.create({
      requestBody: {
        name: 'test.json',
        parents: [pendingFolderId]
      },
      media: media,
      fields: 'id'
    });
    
    console.log("Created file:", createRes.data.id);
  } catch (err) {
    console.error(err);
  }
}

run();

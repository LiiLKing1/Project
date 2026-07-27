export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userData } = req.body;
  if (!userData || !userData.uid) return res.status(400).json({ error: 'Missing userData' });

  try {
    const { google } = await import('googleapis');
    
    // Check if env vars are present
    if (!process.env.DRIVE_CLIENT_EMAIL || !process.env.DRIVE_PRIVATE_KEY) {
      console.warn("Missing Drive credentials, skipping Vercel API Google Drive write");
      return res.status(500).json({ error: 'Missing Drive Credentials' });
    }

    const credentials = {
      client_email: process.env.DRIVE_CLIENT_EMAIL,
      private_key: process.env.DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // We need to write to: Savdogar/pending_users/uid.json
    // Actually, in driveBackup.js we put it in "pending_users" folder which is inside "admin".
    // Wait, let's find the pending_users folder directly like we did in Admin Panel API.
    const ROOT_FOLDER_ID = '1fP4vHjIkcwR7diF63LAgBwremREHld4Y';
    let pendingFolderId;

    const folderRes = await drive.files.list({
      q: `name='pending_users' and '${ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
    });
    
    if (folderRes.data.files.length === 0) {
      // Create pending_users folder
      const createRes = await drive.files.create({
        requestBody: {
          name: 'pending_users',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [ROOT_FOLDER_ID]
        },
        fields: 'id'
      });
      pendingFolderId = createRes.data.id;
    } else {
      pendingFolderId = folderRes.data.files[0].id;
    }

    // Check if file already exists
    const fileName = `${userData.uid}.json`;
    const existRes = await drive.files.list({
       q: `name='${fileName}' and '${pendingFolderId}' in parents and trashed=false`,
       fields: 'files(id)'
    });

    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(userData, null, 2)
    };

    if (existRes.data.files.length > 0) {
       // Update
       await drive.files.update({
         fileId: existRes.data.files[0].id,
         media: media
       });
    } else {
       // Create
       await drive.files.create({
         requestBody: {
           name: fileName,
           parents: [pendingFolderId]
         },
         media: media
       });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Drive API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { google } = await import('googleapis');
    
    if (!process.env.DRIVE_CLIENT_EMAIL || !process.env.DRIVE_PRIVATE_KEY) {
      return res.status(500).json({ error: 'Server configuration error: Missing Google Credentials' });
    }

    const credentials = {
      client_email: process.env.DRIVE_CLIENT_EMAIL,
      private_key: process.env.DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive.readonly'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // 1. Find 'pending_users' folder
    const ROOT_FOLDER_ID = '1fP4vHjIkcwR7diF63LAgBwremREHld4Y';
    const folderRes = await drive.files.list({
      q: `name='pending_users' and '${ROOT_FOLDER_ID}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
    });
    
    if (folderRes.data.files.length === 0) {
      return res.status(200).json({ users: [] }); // No pending users folder yet
    }
    
    const pendingFolderId = folderRes.data.files[0].id;
    
    // 2. Fetch JSON files inside
    const filesRes = await drive.files.list({
      q: `'${pendingFolderId}' in parents and mimeType='application/json' and trashed=false`,
      fields: 'files(id, name)',
    });
    
    const users = [];
    for (const file of filesRes.data.files) {
      const fileContentRes = await drive.files.get({
        fileId: file.id,
        alt: 'media'
      });
      users.push({
        fileId: file.id,
        ...fileContentRes.data
      });
    }

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Drive API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

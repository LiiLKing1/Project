export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileId } = req.body;
  if (!fileId) return res.status(400).json({ error: 'Missing fileId' });

  try {
    const { google } = await import('googleapis');
    
    const credentials = {
      client_email: process.env.DRIVE_CLIENT_EMAIL,
      private_key: process.env.DRIVE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    };
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/drive'],
    });
    
    const drive = google.drive({ version: 'v3', auth });
    
    // Delete the file from Google Drive to remove from pending
    await drive.files.delete({
      fileId: fileId
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Drive API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

import { app, BrowserWindow, ipcMain, screen, shell, Menu } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let localServer;
let serverPort = 0;

// ── Mime type mapping ────────────────────────────────────────────────────────
const MIME_MAP = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.webp': 'image/webp',
};

// ── Local HTTP server for packaged app (Firebase needs http:// not file://) ──
function startLocalServer(distPath) {
  return new Promise((resolve) => {
    localServer = http.createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      if (urlPath === '/') urlPath = '/index.html';

      if (urlPath === '/auth-google') {
        const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Google Login - Savdogar</title>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f9fafb; color: #111827; }
    .card { background: white; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
    .spinner { border: 3px solid rgba(0,0,0,0.1); border-top-color: #8052ff; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 0 auto 1rem; display: none; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .btn { background: #8052ff; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; margin-bottom: 1rem; font-weight: 600; transition: background 0.2s; }
    .btn:hover { background: #6b46d9; }
  </style>
</head>
<body>
  <div class="card">
    <button id="loginBtn" class="btn">Google orqali kirish</button>
    <div class="spinner" id="spinner"></div>
    <h2 id="status" style="margin:0 0 0.5rem; font-size:1.25rem;">Xavfsiz ulanish...</h2>
    <p id="substatus" style="margin:0; color:#6b7280; font-size:0.875rem;">Davom etish uchun yuqoridagi tugmani bosing.</p>
  </div>
  <script type="module">
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
    import { getAuth, signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

    const firebaseConfig = {
      apiKey: "AIzaSyDEqsJlagD68qJA0E8Ys2CiC8iTUpjNYlM",
      authDomain: "project-500cb.firebaseapp.com",
      projectId: "project-500cb",
      storageBucket: "project-500cb.firebasestorage.app",
      messagingSenderId: "90975235362",
      appId: "1:90975235362:web:8d566c3f82fe556ece897b"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();

    document.getElementById('loginBtn').addEventListener('click', () => {
      document.getElementById('loginBtn').style.display = 'none';
      document.getElementById('spinner').style.display = 'block';
      document.getElementById('substatus').innerText = "Iltimos oynani yopmang. Savdogar dasturiga kiritilmoqda.";

      signInWithPopup(auth, provider)
        .then((result) => {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const idToken = credential.idToken;
          
          return fetch('/auth-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken })
          });
        })
        .then(() => {
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('status').innerText = "Muvaffaqiyatli kirdingiz!";
          document.getElementById('status').style.color = "#15846e";
          document.getElementById('substatus').innerText = "Bu oynani yopib, dasturga qaytishingiz mumkin.";
          setTimeout(() => window.close(), 3000);
        })
        .catch((error) => {
          document.getElementById('spinner').style.display = 'none';
          document.getElementById('loginBtn').style.display = 'inline-block';
          document.getElementById('loginBtn').innerText = 'Qaytadan urinish';
          document.getElementById('status').innerText = "Xatolik yuz berdi";
          document.getElementById('status').style.color = "#dc2626";
          document.getElementById('substatus').innerText = error.message;
        });
    });
  </script>
</body>
</html>
`;
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      if (urlPath === '/auth-token' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.idToken && mainWindow) {
              mainWindow.webContents.send('google-login-success', parsed.idToken);
            }
          } catch(e) {}
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        });
        return;
      }

      // Strip leading slash so path.join doesn't treat it as absolute root on Windows
      const relativePath = urlPath.startsWith('/') ? urlPath.slice(1) : urlPath;
      const safePath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, '');
      let filePath = path.join(distPath, safePath);

      fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
          // SPA fallback — serve index.html for all unknown routes
          filePath = path.join(distPath, 'index.html');
        }
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_MAP[ext] || 'application/octet-stream';
        fs.readFile(filePath, (readErr, data) => {
          if (readErr) {
            res.writeHead(404);
            res.end('Not found');
            return;
          }
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        });
      });
    });

    // Bind to fixed port for auth persistence
    localServer.listen(42851, '127.0.0.1', () => {
      serverPort = localServer.address().port;
      resolve(serverPort);
    });
  });
}

// ── Create main window ───────────────────────────────────────────────────────
async function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    title: 'Savdogar',
    width,
    height,
    useContentSize: true,
    show: false,
    frame: false, // Frameless window
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Open external links in system browser, except for Firebase Auth popups
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.includes('firebaseapp.com') || url.includes('accounts.google.com')) {
      return { action: 'allow' };
    }
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    // Dev mode — use Vite dev server directly
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // Production — serve dist via local HTTP so Firebase auth works
    const distPath = path.join(__dirname, '../dist');
    await startLocalServer(distPath);
    await mainWindow.loadURL(`http://127.0.0.1:${serverPort}/`);
  }
}

// ── App lifecycle ────────────────────────────────────────────────────────────
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');
app.setName('Savdogar');

app.whenReady().then(() => {
  Menu.setApplicationMenu(null); // Hide default menu bar
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (localServer) localServer.close();
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: Print receipt ───────────────────────────────────────────────────────
ipcMain.handle('print-receipt', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return new Promise((resolve) => {
      mainWindow.webContents.print(
        { silent: true, printBackground: true },
        (success, failureReason) => resolve({ success, failureReason })
      );
    });
  }
  return { success: false, failureReason: 'No window' };
});

// ── IPC: Open external URL ───────────────────────────────────────────────────
ipcMain.handle('open-external', async (event, url) => {
  await shell.openExternal(url);
});

// ── IPC: Window Controls ─────────────────────────────────────────────────────
ipcMain.on('start-google-login', async () => {
  if (serverPort) {
    const authUrl = `https://project-three-brown-18.vercel.app/link-account?desktopPort=${serverPort}`;
    await shell.openExternal(authUrl);
  }
});

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.restore();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

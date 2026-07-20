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

      if (urlPath === '/auth-success') {
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const token = urlParams.get('token');
        if (token && mainWindow) {
          mainWindow.webContents.send('google-login-success', token);
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end('<html><body style="font-family:sans-serif;text-align:center;padding:50px;background:#f9fafb;"><h2>Muvaffaqiyatli ulandi!</h2><p>Bu oynani yopishingiz va ilovaga qaytishingiz mumkin.</p><script>setTimeout(()=>window.close(), 3000)</script></body></html>');
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

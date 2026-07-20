const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Hardware/System
  printReceipt: () => ipcRenderer.invoke('print-receipt'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
  // Window Controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  isElectron: true,

  // Auth
  startGoogleLogin: () => ipcRenderer.send('start-google-login'),
  onGoogleLoginSuccess: (callback) => ipcRenderer.on('google-login-success', (event, token) => callback(token)),
  removeGoogleLoginListener: () => ipcRenderer.removeAllListeners('google-login-success'),
});

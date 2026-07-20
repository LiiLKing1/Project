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
  
  isElectron: true,
});

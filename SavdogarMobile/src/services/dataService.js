// Data Service Layer
// Now only handles Electron-specific system calls (print, etc.)
// All data operations go directly through Firebase

const isElectron = !!window.electronAPI;

export const dataService = {
  // Print receipt via Electron's native print dialog
  printReceipt: async () => {
    if (isElectron) return await window.electronAPI.printReceipt();
    // Fallback for browser
    window.print();
  },

  // Open external URL in system browser (from Electron)
  openExternal: async (url) => {
    if (isElectron) return await window.electronAPI.openExternal(url);
    window.open(url, '_blank');
  },
};

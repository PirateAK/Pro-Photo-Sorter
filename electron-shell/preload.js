// electron-shell/preload.js
// Exposes safe, whitelisted Node/Electron APIs to the React renderer.
// v1.2.3: added openExternal + auto-update controls.
// v1.2.9: added Safety-Backup mirror IPC (survives userData wipes).
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listDrives: () => ipcRenderer.invoke('pps:list-drives'),
  openExternal: (url) => ipcRenderer.invoke('pps:open-external', url),

  // Auto-update (v1.2.3) — check + download + install controls
  appVersion: () => ipcRenderer.invoke('pps:app-version'),
  checkForUpdates: () => ipcRenderer.invoke('pps:check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('pps:download-update'),
  installUpdate: () => ipcRenderer.invoke('pps:install-update'),
  onUpdateStatus: (cb) => {
    const listener = (_evt, payload) => cb(payload);
    ipcRenderer.on('pps:update-status', listener);
    return () => ipcRenderer.removeListener('pps:update-status', listener);
  },

  // Safety-Backup mirror (v1.2.9) — writes/reads a copy of the app state +
  // license to %USERPROFILE%\Documents\Pro Photo Sorter\Safety-Backups\ so
  // user data survives ANY future userData folder rename / wipe / uninstall.
  safetyWrite: (payload) => ipcRenderer.invoke('pps:safety-write', payload),
  safetyReadLatest: () => ipcRenderer.invoke('pps:safety-read-latest'),
  safetyOpenFolder: () => ipcRenderer.invoke('pps:safety-open-folder'),
  safetyInfo: () => ipcRenderer.invoke('pps:safety-info'),
});

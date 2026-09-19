// electron-shell/preload.js
// Exposes safe, whitelisted Node/Electron APIs to the React renderer.
// The renderer accesses them via `window.electronAPI`.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  listDrives: () => ipcRenderer.invoke('pps:list-drives'),
});

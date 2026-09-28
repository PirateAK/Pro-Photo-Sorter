const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  appVersion: () => ipcRenderer.invoke('pps:app-version'),
  openExternal: (url) => ipcRenderer.invoke('tpc:open-external', url),
  tpcInstallPack: (payload) => ipcRenderer.invoke('tpc:install-pack', payload),
  tpcSavePack: (payload) => ipcRenderer.invoke('tpc:save-pack', payload),
});

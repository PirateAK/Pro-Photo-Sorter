// Tag Pack Creator — Electron shell (v1.5.0).
// Loads the shared React build at index.html#/tpc and exposes two IPCs:
//   tpc:save-pack    → native Save As dialog for the .pps-tagpack.json
//   tpc:install-pack → drop the file in Documents\Pro Photo Sorter\Inbox\
//                      where Pro Photo Sorter picks it up on next Tag Manager open.
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

app.setPath('userData', path.join(app.getPath('appData'), 'Tag Pack Creator'));

let win = null;
function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 900,
    title: 'Tag Pack Creator',
    backgroundColor: '#1a1715',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, spellcheck: true, preload: path.join(__dirname, 'preload.js') },
  });
  win.setMenuBarVisibility(false);
  const indexPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'build', 'index.html')
    : path.join(__dirname, 'build', 'index.html');
  win.loadFile(indexPath, { hash: '/tpc' });
  win.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) win.webContents.toggleDevTools();
  });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());

const INBOX_DIR = path.join(app.getPath('documents'), 'Pro Photo Sorter', 'Inbox');
const safeName = (name) => path.basename(String(name || 'pack.pps-tagpack.json')).replace(/[<>:"/\\|?*]+/g, '_');

ipcMain.handle('tpc:install-pack', async (_e, { name, json }) => {
  try {
    fs.mkdirSync(INBOX_DIR, { recursive: true });
    const target = path.join(INBOX_DIR, safeName(name));
    fs.writeFileSync(target, json, 'utf8');
    return { ok: true, path: target };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('tpc:save-pack', async (_e, { name, json }) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Save tag pack',
      defaultPath: path.join(app.getPath('documents'), safeName(name)),
      filters: [{ name: 'Pro Photo Sorter tag pack', extensions: ['json'] }],
    });
    if (canceled || !filePath) return { ok: false, error: 'cancelled' };
    fs.writeFileSync(filePath, json, 'utf8');
    return { ok: true, path: filePath };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('tpc:open-external', async (_e, url) => { if (/^https?:\/\//.test(url)) await shell.openExternal(url); });
ipcMain.handle('pps:app-version', () => app.getVersion());

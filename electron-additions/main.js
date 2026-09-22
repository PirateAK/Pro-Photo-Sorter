// electron-shell/main.js
// Pro Photo Sorter — Electron entry.
// v1.2.3: full auto-update via electron-updater from GitHub Releases.
// Configure once via `publish` in package.json; each new release published
// to https://github.com/PirateAK/Pro-Photo-Sorter/releases/latest is picked
// up automatically on next launch (if the user opted in).

const { app, BrowserWindow, Menu, MenuItem, ipcMain, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');
const { autoUpdater } = require('electron-updater');

Menu.setApplicationMenu(null);

// electron-updater logging goes to renderer console via IPC.
autoUpdater.autoDownload = false;      // We ask the user first.
autoUpdater.autoInstallOnAppQuit = false; // We control the restart.
autoUpdater.allowPrerelease = false;
autoUpdater.allowDowngrade = false;

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 1000,
    title: 'Pro Photo Sorter',
    backgroundColor: '#1a1715',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  const indexPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'build', 'index.html')
    : path.join(__dirname, 'build', 'index.html');
  win.loadFile(indexPath);

  // Spellcheck right-click menu (v0.25.0)
  win.webContents.on('context-menu', (event, params) => {
    const menu = new Menu();

    for (const suggestion of params.dictionarySuggestions) {
      menu.append(new MenuItem({
        label: suggestion,
        click: () => win.webContents.replaceMisspelling(suggestion),
      }));
    }

    if (params.misspelledWord) {
      if (params.dictionarySuggestions.length > 0) {
        menu.append(new MenuItem({ type: 'separator' }));
      }
      menu.append(new MenuItem({
        label: 'Add to dictionary',
        click: () => win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
      }));
      menu.append(new MenuItem({ type: 'separator' }));
    }

    if (params.editFlags.canCut)   menu.append(new MenuItem({ role: 'cut' }));
    if (params.editFlags.canCopy)  menu.append(new MenuItem({ role: 'copy' }));
    if (params.editFlags.canPaste) menu.append(new MenuItem({ role: 'paste' }));

    if (menu.items.length > 0) menu.popup();
  });

  // ── Wire updater events to the renderer ─────────────────────────────────
  const sendUpd = (channel, payload) => {
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  };

  autoUpdater.on('checking-for-update', () => sendUpd('pps:update-status', { state: 'checking' }));
  autoUpdater.on('update-available', (info) => sendUpd('pps:update-status', {
    state: 'available',
    version: info?.version,
    releaseNotes: info?.releaseNotes,
    releaseDate: info?.releaseDate,
  }));
  autoUpdater.on('update-not-available', (info) => sendUpd('pps:update-status', {
    state: 'up-to-date',
    version: info?.version,
  }));
  autoUpdater.on('download-progress', (p) => sendUpd('pps:update-status', {
    state: 'downloading',
    percent: p?.percent || 0,
    bytesPerSecond: p?.bytesPerSecond || 0,
    transferred: p?.transferred || 0,
    total: p?.total || 0,
  }));
  autoUpdater.on('update-downloaded', (info) => sendUpd('pps:update-status', {
    state: 'downloaded',
    version: info?.version,
  }));
  autoUpdater.on('error', (err) => sendUpd('pps:update-status', {
    state: 'error',
    message: err?.message || String(err),
  }));
}

// ── IPC: drive & free-space info (Windows) ────────────────────────────────
function listDrivesWindows() {
  return new Promise((resolve) => {
    const psCmd =
      'Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" | ' +
      'Select-Object DeviceID,VolumeName,Size,FreeSpace | ConvertTo-Json -Compress';
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCmd}"`,
      { windowsHide: true, timeout: 8000, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err) return resolve([]);
        try {
          const raw = (stdout || '').trim();
          if (!raw) return resolve([]);
          const parsed = JSON.parse(raw);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          resolve(arr.filter((d) => d && d.DeviceID).map((d) => ({
            letter: String(d.DeviceID),
            label: d.VolumeName ? String(d.VolumeName) : '',
            totalBytes: Number(d.Size) || 0,
            freeBytes: Number(d.FreeSpace) || 0,
          })));
        } catch { resolve([]); }
      }
    );
  });
}

ipcMain.handle('pps:list-drives', async () => {
  if (process.platform !== 'win32') return [];
  return await listDrivesWindows();
});

// ── IPC: open an external URL in the user's default browser ────────────────
ipcMain.handle('pps:open-external', async (_evt, url) => {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return false;
  await shell.openExternal(url);
  return true;
});

// ── IPC: auto-update controls (v1.2.3) ─────────────────────────────────────
ipcMain.handle('pps:check-for-updates', async () => {
  try {
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, version: result?.updateInfo?.version || null };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
});

ipcMain.handle('pps:download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
});

ipcMain.handle('pps:install-update', async () => {
  // isSilent=false, isForceRunAfter=true → run installer with UI, relaunch after
  setImmediate(() => autoUpdater.quitAndInstall(false, true));
  return { ok: true };
});

ipcMain.handle('pps:app-version', () => app.getVersion());

app.whenReady().then(createWindow);
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());

// electron-shell/main.js
// Pro Photo Sorter — Electron entry.
// v1.2.9: PERMANENT DATA-PERSISTENCE FIX
//   1. Pin `userData` path to %APPDATA%\Pro Photo Sorter\ BEFORE app.whenReady
//      so future productName / package rename can never shift Chromium's
//      storage folder again (this is what silently wiped tag packs + license
//      after the v1.2.8 update).
//   2. One-time migration on boot: if the pinned dir is empty but the old
//      %APPDATA%\electron-shell\ dir exists with data, copy Local Storage,
//      Session Storage and IndexedDB across so anyone hit by v1.2.8 recovers
//      automatically on their next launch.
//   3. Safety-Backup mirror to
//      %USERPROFILE%\Documents\Pro Photo Sorter\Safety-Backups\latest.json
//      (+ dated snapshots, last 30 kept). Written on every state/license save
//      via IPC. Auto-restored on boot if the pinned userData dir has no state
//      key yet — belt-and-suspenders against ANY future data-loss regression.
//
// v1.2.3: full auto-update via electron-updater from GitHub Releases.

const { app, BrowserWindow, Menu, MenuItem, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { autoUpdater } = require('electron-updater');

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 1 — PIN userData path BEFORE anything else touches it.
// ─────────────────────────────────────────────────────────────────────────────
//  Electron defaults `userData` to `<appData>/<productName>`. If we ever
//  rename productName again the folder moves and Chromium's Local Storage /
//  IndexedDB effectively vanish (they're still on disk, just orphaned). By
//  calling app.setPath() here — synchronously, before app.whenReady() — we
//  lock the path forever regardless of what productName says.
//
//  Chosen folder name is 'Pro Photo Sorter' so anyone who ALREADY updated to
//  v1.2.8 keeps the same physical folder they just created (no second move).
const PINNED_USER_DATA_DIR_NAME = 'Pro Photo Sorter';
const appDataRoot = app.getPath('appData');
const PINNED_USER_DATA_PATH = path.join(appDataRoot, PINNED_USER_DATA_DIR_NAME);
app.setPath('userData', PINNED_USER_DATA_PATH);

// ─────────────────────────────────────────────────────────────────────────────
//  STEP 2 — one-time migration from legacy %APPDATA%\electron-shell\.
// ─────────────────────────────────────────────────────────────────────────────
//  Only runs if:
//    a) pinned userData has NO 'Local Storage' folder yet (fresh / wiped), AND
//    b) legacy '<appData>/electron-shell/Local Storage' exists.
//  A sentinel file '.pps-migrated-from-electron-shell' inside the pinned dir
//  guarantees we never migrate twice.
function migrateFromLegacyElectronShellSync() {
  try {
    const legacyPath = path.join(appDataRoot, 'electron-shell');
    const legacyLocalStorage = path.join(legacyPath, 'Local Storage');
    const pinnedLocalStorage = path.join(PINNED_USER_DATA_PATH, 'Local Storage');
    const sentinel = path.join(PINNED_USER_DATA_PATH, '.pps-migrated-from-electron-shell');

    if (fs.existsSync(sentinel)) return;                    // already migrated
    if (!fs.existsSync(legacyLocalStorage)) return;         // nothing to migrate
    if (fs.existsSync(pinnedLocalStorage)) return;          // new dir already has data — don't clobber

    fs.mkdirSync(PINNED_USER_DATA_PATH, { recursive: true });

    // Copy the three folders Chromium uses for our persistent state.
    for (const sub of ['Local Storage', 'Session Storage', 'IndexedDB']) {
      const from = path.join(legacyPath, sub);
      const to = path.join(PINNED_USER_DATA_PATH, sub);
      if (fs.existsSync(from) && !fs.existsSync(to)) {
        copyDirSync(from, to);
      }
    }

    fs.writeFileSync(
      sentinel,
      `Migrated legacy user data from "${legacyPath}" on ${new Date().toISOString()}\n`,
      'utf8'
    );
    console.log('[PPS] Migrated user data from legacy electron-shell folder.');
  } catch (err) {
    console.warn('[PPS] Legacy migration failed:', err && err.message);
  }
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else if (entry.isFile()) {
      try { fs.copyFileSync(s, d); } catch { /* skip locked file */ }
    }
  }
}

migrateFromLegacyElectronShellSync();

// ─────────────────────────────────────────────────────────────────────────────
//  Safety-Backup folder — outside %APPDATA% so it survives userData wipes.
// ─────────────────────────────────────────────────────────────────────────────
const SAFETY_DIR = path.join(app.getPath('documents'), 'Pro Photo Sorter', 'Safety-Backups');
const SAFETY_LATEST = path.join(SAFETY_DIR, 'latest.json');

function ensureSafetyDir() {
  try { fs.mkdirSync(SAFETY_DIR, { recursive: true }); } catch { /* ignore */ }
}
function safetyWriteSync(payload) {
  ensureSafetyDir();
  const json = JSON.stringify(payload, null, 2);
  fs.writeFileSync(SAFETY_LATEST, json, 'utf8');
  // Also drop a dated daily snapshot (one per day, first save wins).
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const daily = path.join(SAFETY_DIR, `snapshot-${today}.json`);
  if (!fs.existsSync(daily)) {
    try { fs.writeFileSync(daily, json, 'utf8'); } catch { /* ignore */ }
    // Prune to newest 30 daily snapshots.
    try {
      const files = fs.readdirSync(SAFETY_DIR)
        .filter((f) => f.startsWith('snapshot-') && f.endsWith('.json'))
        .sort();                                    // ascending — oldest first
      while (files.length > 30) {
        const oldest = files.shift();
        try { fs.unlinkSync(path.join(SAFETY_DIR, oldest)); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }
}
function safetyReadLatestSync() {
  try {
    if (!fs.existsSync(SAFETY_LATEST)) return null;
    const raw = fs.readFileSync(SAFETY_LATEST, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// v1.3.1 — keep the menu bar hidden (Kurt likes the chrome-free look) but
// register a hidden accelerator so DevTools (F12 / Ctrl+Shift+I) is
// available for support/recovery when he needs it. Previously
// Menu.setApplicationMenu(null) also killed the shortcut, which locked
// out DevTools during the v1.3.1 tag-wipe incident.
const devToolsMenu = Menu.buildFromTemplate([
  {
    label: 'PPS',
    visible: false,
    submenu: [
      { role: 'toggleDevTools', accelerator: 'F12' },
      { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I' },
      { role: 'reload',         accelerator: 'CmdOrCtrl+R' },
      { role: 'forceReload',    accelerator: 'CmdOrCtrl+Shift+R' },
    ],
  },
]);
Menu.setApplicationMenu(devToolsMenu);

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
    autoHideMenuBar: true,   // v1.3.1 — keep chrome-free, F12/DevTools still work
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  win.setMenuBarVisibility(false);   // hide immediately (autoHide alone shows briefly on Alt)

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

// ── IPC: Safety-Backup mirror (v1.2.9) ─────────────────────────────────────
ipcMain.handle('pps:safety-write', async (_evt, payload) => {
  try {
    safetyWriteSync({
      writtenAt: new Date().toISOString(),
      appVersion: app.getVersion(),
      license: payload?.license || null,
      state: payload?.state || null,
    });
    return { ok: true, path: SAFETY_LATEST };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
});

ipcMain.handle('pps:safety-read-latest', async () => {
  try {
    const data = safetyReadLatestSync();
    return { ok: true, data, path: SAFETY_LATEST };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
});

ipcMain.handle('pps:safety-open-folder', async () => {
  try {
    ensureSafetyDir();
    await shell.openPath(SAFETY_DIR);
    return { ok: true, path: SAFETY_DIR };
  } catch (e) {
    return { ok: false, error: e?.message || String(e) };
  }
});

ipcMain.handle('pps:safety-info', async () => {
  return {
    ok: true,
    safetyDir: SAFETY_DIR,
    latestPath: SAFETY_LATEST,
    userDataDir: PINNED_USER_DATA_PATH,
    latestExists: fs.existsSync(SAFETY_LATEST),
  };
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());

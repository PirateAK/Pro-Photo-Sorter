// electron-shell/main.js
// Pro Photo Sorter — Electron entry.
// v1.0.0 additions: spellcheck + right-click menu (from v0.25.0) plus
// an IPC bridge that returns drive/free-space info to the React app.

const { app, BrowserWindow, Menu, MenuItem, ipcMain } = require('electron');
const path = require('path');
const { exec } = require('child_process');

Menu.setApplicationMenu(null);

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
}

// ── IPC: drive & free-space info (Windows) ────────────────────────────────
// Uses PowerShell to enumerate logical disks. Falls back to a smaller subset
// on failure so the UI at least gets something.
function listDrivesWindows() {
  return new Promise((resolve) => {
    const psCmd =
      'Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3" | ' +
      'Select-Object DeviceID,VolumeName,Size,FreeSpace | ConvertTo-Json -Compress';
    // -NoProfile keeps startup fast; ExecutionPolicy Bypass avoids policy blocks.
    exec(
      `powershell -NoProfile -ExecutionPolicy Bypass -Command "${psCmd}"`,
      { windowsHide: true, timeout: 8000, maxBuffer: 1024 * 1024 },
      (err, stdout) => {
        if (err) {
          console.error('[pps] listDrives PS error:', err.message);
          return resolve([]);
        }
        try {
          const raw = (stdout || '').trim();
          if (!raw) return resolve([]);
          const parsed = JSON.parse(raw);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          const drives = arr
            .filter((d) => d && d.DeviceID)
            .map((d) => ({
              letter: String(d.DeviceID),                    // "C:"
              label: d.VolumeName ? String(d.VolumeName) : '',
              totalBytes: Number(d.Size) || 0,
              freeBytes: Number(d.FreeSpace) || 0,
            }));
          resolve(drives);
        } catch (e) {
          console.error('[pps] listDrives parse error:', e.message);
          resolve([]);
        }
      }
    );
  });
}

ipcMain.handle('pps:list-drives', async () => {
  if (process.platform !== 'win32') return [];
  return await listDrivesWindows();
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());

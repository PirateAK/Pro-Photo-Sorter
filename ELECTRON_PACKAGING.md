# Pro Photo Sorter — Electron Wrapper (Windows Build Guide)

This React app runs offline as a desktop `.exe` via Electron. This guide reflects the **verified working setup** as of Feb 2026.

## Folder layout (siblings inside the repo root)

```
C:\Pro-Photo-Sorter\
├── frontend\        (React app source)
├── electron-shell\  (Electron wrapper + build script)
└── backend\         (unused for desktop build)
```

## Prerequisites

- Node.js 18 or 20 LTS recommended (Node 24 works but is bleeding-edge)
- Windows Command Prompt (not PowerShell — the here-doc syntax below is CMD-specific)

## Build steps (once you have a fresh copy of the repo)

### 1. Fix the ajv dependency in the frontend (one-time)

Older Create React App projects hit a `Cannot find module 'ajv/dist/compile/codegen'` error under modern Node. Fix:

```cmd
cd /d C:\Pro-Photo-Sorter\frontend
npm pkg set homepage="./"
npm install ajv@^8 ajv-keywords@^5 --save-dev --legacy-peer-deps
npm run build
```

The `homepage: "./"` is **critical** — without it, React uses absolute paths that break under Electron's `file://` protocol.

### 2. Configure electron-shell (verified working config)

`electron-shell/main.js`:

```js
const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
Menu.setApplicationMenu(null);
function createWindow() {
  const win = new BrowserWindow({
    width: 1600, height: 1000, title: 'Pro Photo Sorter',
    backgroundColor: '#1a1715',
    webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  const indexPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'build', 'index.html')
    : path.join(__dirname, 'build', 'index.html');
  win.loadFile(indexPath);
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
```

`electron-shell/package.json` (critical `build` config):

```json
{
  "main": "main.js",
  "build": {
    "appId": "com.you.prophotosorter",
    "productName": "Pro Photo Sorter",
    "files": ["main.js", "package.json"],
    "extraResources": [
      { "from": "../frontend/build", "to": "app/build" }
    ],
    "win": { "target": "nsis" }
  }
}
```

**Why `extraResources` instead of packing the build into the ASAR?**
Packing hundreds of small React chunks into an ASAR archive introduces load-time issues and confusing path resolution. `extraResources` copies the React build to `resources/app/build/` beside the ASAR — `main.js` reaches it via `process.resourcesPath`.

### 3. Install Electron locally (avoids npx cache hangs)

```cmd
cd /d C:\Pro-Photo-Sorter\electron-shell
npm install --save-dev electron --legacy-peer-deps
```

### 4. Test in dev mode (fast, no packaging)

```cmd
cd /d C:\Pro-Photo-Sorter\electron-shell
xcopy /e /i /y ..\frontend\build build
node_modules\.bin\electron .
```

(The `xcopy` step only matters for local dev because dev mode reads from `__dirname/build`.)

### 5. Build the production `.exe`

```cmd
cd /d C:\Pro-Photo-Sorter\electron-shell
if exist dist rmdir /s /q dist
npx electron-builder --win --x64
```

The unpacked app lands at `dist\win-unpacked\Pro Photo Sorter.exe` — this is the working executable to shortcut to the desktop.

## Known gotchas (already solved, keep for reference)

| Symptom | Root cause | Fix |
|---|---|---|
| Blank window, `ERR_FILE_NOT_FOUND` on `index.html` | `main.js` path pointed to the wrong folder | Use the `app.isPackaged` branch shown above |
| `Cannot find module 'ajv/dist/compile/codegen'` on `npm run build` | Broken transitive ajv version | `npm install ajv@^8 ajv-keywords@^5 --save-dev --legacy-peer-deps` |
| React assets 404 inside packaged app | Missing `"homepage": "./"` in frontend/package.json | Set it before `npm run build` |
| `.exe` opens Electron's default welcome screen | `package.json` missing `"main": "main.js"` OR `main.js` didn't exist | Verify both |
| `winCodeSign` extraction errors during build | Windows blocks symlink extraction | Ignore — only affects installer signing, not the `.exe` itself. Or enable Windows Developer Mode. |
| `app.asar` is only ~1.5 KB | `build.files` array didn't include the React build AND `extraResources` not set | Use the config above (React build goes via `extraResources`, not `files`) |

---

**Author:** Built by the photographer who dreamed it up — with implementation by Emergent.

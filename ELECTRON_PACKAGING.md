# Pro Photo Sorter — Electron Wrapper (Optional)

This React app runs in Chromium browsers via the File System Access API and gives you full drive access after you grant permission.

If you'd like to run it as a true desktop app (offline, no browser tab, real C:\ access without prompts), you can wrap the built React bundle in Electron:

## 1. Build the React app

```bash
cd /app/frontend
yarn build
```

The bundle lands in `/app/frontend/build`.

## 2. Create an Electron shell

In a fresh folder next to `build/`:

```bash
mkdir electron-shell && cd electron-shell
npm init -y
npm install --save-dev electron
```

## 3. `main.js`

```js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1600,
    height: 1000,
    title: 'Pro Photo Sorter',
    backgroundColor: '#1a1715',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, '..', 'build', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());
```

## 4. Package with electron-builder

```bash
npm install --save-dev electron-builder
npx electron-builder --win --x64
```

You'll get a portable `Pro Photo Sorter Setup.exe` in the `dist/` folder.

---

**Author:** Built by the photographer who dreamed it up — with implementation by Emergent.

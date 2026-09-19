# Electron Setup — v1.0.0

The desktop shell (`C:\Pro-Photo-Sorter\electron-shell\`) has two files that
live outside the repo's normal sync path: `main.js` and `package.json`. This
guide is a **one-time paste-in** to bring your shell up to v1.0.0.

Everything you need is in `electron-additions\` inside the repo. You have
four items to copy over:

| Copy from                              | Copy to (create if missing)                     |
| -------------------------------------- | ----------------------------------------------- |
| `electron-additions\main.js`           | `electron-shell\main.js`                        |
| `electron-additions\preload.js`        | `electron-shell\preload.js`                     |
| `electron-additions\icon.png`          | `electron-shell\icon.png`                       |
| `electron-additions\package.json`      | `electron-shell\package.json`                   |

## Fastest path — one copy-paste block

Open **Command Prompt** and paste this. It copies every file into place
and then installs the Electron toolchain:

```cmd
cd /d C:\Pro-Photo-Sorter
copy /Y electron-additions\main.js         electron-shell\main.js
copy /Y electron-additions\preload.js      electron-shell\preload.js
copy /Y electron-additions\icon.png        electron-shell\icon.png
copy /Y electron-additions\package.json    electron-shell\package.json
cd electron-shell
call npm install --legacy-peer-deps --no-audit --no-fund --loglevel=error
```

That's it. Now double-click **`run-app.bat`** to launch, or **`pack-app.bat`**
to build the installer.

## What each file does

### `main.js`
The Electron entry point. Owns the window, the menu, the spellcheck
right-click menu, and the IPC handler `pps:list-drives` that powers the
"System Drives" panel in the app.

### `preload.js`
A tiny bridge — the only thing that runs both in Node and in the
renderer. It safely exposes `window.electronAPI.listDrives()` to React so
the app can query drive info without loosening the Chromium sandbox.

### `icon.png`
The app icon. `electron-builder` uses this for the installer, taskbar,
Start Menu, and desktop shortcut.

### `package.json`
Tells `electron-builder` how to build the redistributable installer
(target: NSIS, icon path, product name, shortcuts). Also pins Electron
and electron-builder versions.

## Verifying it worked

After launching, right-click the Watermark text field or a Tag rename
input — you should see spelling suggestions plus Cut/Copy/Paste.

Click the **🖴 Drives** button next to either **Open** button (source
or destination panel). A modal should list every disk on your system
with free/used/total bars. If it's empty or errors out, see below.

## Troubleshooting

**Drives panel shows "Drive info is only available inside the desktop app":**
You're running in a plain browser (yarn start) instead of Electron. Use
`run-app.bat`.

**Drives panel says "No drives reported" inside Electron:**
PowerShell may be locked down on this machine. Open a Command Prompt
and run:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_LogicalDisk"
```

If that fails, share the error text — we'll swap the backend to `wmic`.

**`npm install` in `electron-shell` fails with peer conflicts:**
Always use `--legacy-peer-deps`:

```cmd
cd /d C:\Pro-Photo-Sorter\electron-shell
call npm install --legacy-peer-deps --no-audit --no-fund
```

**Installer build fails on `pack-app.bat`:**
Scroll up in the terminal for the red error. Most commonly it's the icon
not being found — make sure `electron-shell\icon.png` exists and is a
valid PNG. On satellite links, `electron-builder` can also time out
downloading its NSIS helper the very first time — just re-run.

## Notes

- No `emergentintegrations` or cloud services involved. Everything is
  local.
- The default spellcheck dictionary is en-US. Add words via the
  "Add to dictionary" right-click option; they persist across sessions.
- The React `onContextMenu` handler on the main photo image (for the
  per-photo watermark toggle) runs first and calls `preventDefault()`,
  so Electron's spellcheck menu only appears in text inputs — exactly
  what we want.

# Electron Setup — v1.2.3

The desktop shell (`C:\Pro-Photo-Sorter\electron-shell\`) has files that
live outside the repo's normal sync path. `pack-app.bat` copies them
from `electron-additions\` for you automatically — this doc is just for
first-time setup and troubleshooting.

## What's inside electron-additions (auto-synced by pack-app.bat)

| File                     | What it does                                                |
| ------------------------ | ----------------------------------------------------------- |
| `main.js`                | Electron entry — window, spellcheck menu, drives IPC, **auto-update IPC (v1.2.3)** |
| `preload.js`             | Safely bridges those APIs to the React renderer             |
| `icon.png`               | App icon (installer, taskbar, Start Menu, desktop shortcut) |
| `package.json`           | electron-builder config + `electron-updater` dep + GitHub publish block |

## 🚨 v1.2.3 — critical new step when publishing releases

Auto-update now works via `electron-updater`. When you build with
`pack-app.bat`, `electron-builder` produces **TWO files** in
`electron-shell\dist\`:

- `Pro Photo Sorter Setup 1.2.3.exe`  ← the installer (uploaded before)
- `latest.yml`                        ← **NEW: update metadata (small text file)**

**When you publish a release to GitHub, attach BOTH files.**
Without `latest.yml` next to the `.exe`, opted-in users won't be notified
of the update. Drag both from `electron-shell\dist\` into the GitHub
Release's "Attach binaries" box.

Gumroad only needs the `.exe` — the `latest.yml` is for the GitHub
Release page only.

## First-time setup — one copy-paste block

Only needed once on a fresh machine. Everyday `pack-app.bat` runs handle
sync automatically.

```cmd
cd /d C:\Pro-Photo-Sorter
copy /Y electron-additions\main.js         electron-shell\main.js
copy /Y electron-additions\preload.js      electron-shell\preload.js
copy /Y electron-additions\icon.png        electron-shell\icon.png
copy /Y electron-additions\package.json    electron-shell\package.json
cd electron-shell
call npm install --legacy-peer-deps --no-audit --no-fund --loglevel=error
```

That's it. Double-click **`run-app.bat`** to launch, or **`pack-app.bat`**
to build the installer.

## Auto-update behavior at a glance (v1.2.3)

1. User opts in via **Settings → Auto-Update → Check for updates on launch**
2. On next launch, PPS pings `github.com/PirateAK/Pro-Photo-Sorter/releases/latest`
3. If newer version → banner appears with **Download** button
4. User clicks Download → progress % shown in banner
5. Once downloaded → banner flips to **Install & Restart**
6. Click → PPS quits, NSIS installer runs, PPS relaunches on the new version
7. All user data (tag packs, license, settings) survives the update

## Troubleshooting

**"No update available" but I know I published one:**
- Confirm you attached `latest.yml` to the GitHub Release, not just the `.exe`
- Confirm the release is set to "Latest release" (not draft, not pre-release)
- Confirm `frontend/package.json` version was actually bumped before `pack-app.bat`

**Drives panel shows "Drive info is only available inside the desktop app":**
You're running in a plain browser (`yarn start`) instead of Electron. Use `run-app.bat`.

**Drives panel says "No drives reported" inside Electron:**
PowerShell may be locked down. Open Command Prompt and run:

```cmd
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_LogicalDisk"
```

If that fails, share the error text.

**`npm install` in `electron-shell` fails with peer conflicts:**
Always use `--legacy-peer-deps`.

**Installer build fails on `pack-app.bat`:**
Scroll up in the terminal for the red error. Most common: icon not
found — make sure `electron-shell\icon.png` exists. On satellite links,
`electron-builder` can time out downloading its NSIS helper on the very
first build — just re-run.

## Notes

- Everything stays local by default. The auto-update check is the ONLY
  network call PPS makes without a manual user action, and it's opt-in.
- License activation is a one-time internet ping via Gumroad (see the
  License tab in Help).
- The default spellcheck dictionary is en-US. Add words via the "Add to
  dictionary" right-click option; they persist across sessions.

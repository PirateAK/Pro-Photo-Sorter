# Pro Photo Sorter — Quick Start

**Version 1.0.0** · From zero to sorting in ten minutes.

---

## 1. Prerequisites

- Windows 10 or 11 (64-bit)
- **Node.js 18 or newer** — get it from <https://nodejs.org> (LTS)
- **Git** — get it from <https://git-scm.com/download/win>
- ~2 GB free disk for the app + node_modules

## 2. First install (do this once)

Open **Command Prompt** and paste this whole block:

```cmd
cd /d C:\
git clone https://github.com/YOUR_USERNAME/Pro-Photo-Sorter.git
cd Pro-Photo-Sorter
run-app.bat
```

(Replace `YOUR_USERNAME` with your GitHub account, or the shared repo URL.)

The first run will install every dependency, build the React bundle, and
launch the Electron app. On a normal connection it takes 3–5 minutes; on a
satellite link, 15–30 minutes is normal. **Just leave it running.**

## 3. Daily use

Double-click **`run-app.bat`** in `C:\Pro-Photo-Sorter`. It pulls the latest
code, rebuilds if anything changed, and launches the app.

## 4. Making a shippable installer

When you're ready to hand the app to another photographer, double-click
**`pack-app.bat`**. When it finishes you'll find:

```
C:\Pro-Photo-Sorter\electron-shell\dist\Pro Photo Sorter Setup 1.0.0.exe
```

That's a normal Windows installer. Anyone can double-click it and run the
app — they don't need Node or Git installed.

## 5. First-run walkthrough

1. Click **Open** in the left panel and pick your unsorted-photos folder.
2. Click **Open** in the right panel and pick where you want them sorted to.
3. Click **Tags** in the toolbar → **Import Pack** → pick a starter pack
   from `C:\Pro-Photo-Sorter\starter-packs\`. (Wedding, wildlife, landscape,
   etc.)
4. Drag tags into the **Folders** bar to build a destination path.
5. Drag tags into the **Tags** bar to add to the filename.
6. Click **Store** — the current photo is copied to the destination.

## 6. If something breaks

**`git pull` complains about `buildInfo.json`:**

```cmd
cd /d C:\Pro-Photo-Sorter
git checkout -- frontend/src/buildInfo.json
git pull
```

**Electron won't launch / white window:**

Delete the build folder and re-run:

```cmd
cd /d C:\Pro-Photo-Sorter
rmdir /s /q frontend\build
rmdir /s /q electron-shell\build
run-app.bat
```

**Spell-check right-click menu missing:**

See `ELECTRON-SETUP.md` — a one-time paste into `electron-shell\main.js`.

## 7. Where things live

| Path                                     | What                                    |
| ---------------------------------------- | --------------------------------------- |
| `C:\Pro-Photo-Sorter\frontend\`          | React source code                       |
| `C:\Pro-Photo-Sorter\electron-shell\`    | Electron wrapper (main.js, preload.js)  |
| `C:\Pro-Photo-Sorter\starter-packs\`     | Ready-to-import tag packs               |
| `C:\Pro-Photo-Sorter\run-app.bat`        | Daily launch script                     |
| `C:\Pro-Photo-Sorter\pack-app.bat`       | Build the redistributable installer     |
| `C:\Pro-Photo-Sorter\USER_GUIDE.md`      | Full feature manual                     |
| `C:\Pro-Photo-Sorter\CHANGELOG.md`       | What's new in each version              |

That's it. Happy sorting.

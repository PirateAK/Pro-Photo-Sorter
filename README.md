# Pro Photo Sorter

**Offline-first Windows desktop app for photographers who shoot faster than
they file.** Built with React + Electron, drives the filesystem via the
File System Access API, does image editing on HTML5 Canvas, and never talks
to the cloud.

---

## Highlights

- **Dual file trees** — one for the source, one for the destination.
- **Tag Packs** — icon-driven categories you drag onto photos to build
  destination folders and filenames.
- **Filmstrip + Viewer + EXIF chips** on one screen.
- **Star ratings** with a full-screen Cull Mode for the fast first pass.
- **Image Editor** — crop, sharpen, exposure, contrast, saturation, temperature,
  tint, rotate, flip, Auto-Tone.
- **Watermarks** — draggable position, scale, opacity, light/dark style,
  font choice, per-photo or batch.
- **Resize to Print Size** — 4×6, 5×7, 8×10, 11×14 at 300 DPI, with a
  movable crop preview.
- **Batch Actions** — store, move, delete, skip, rename, watermark, resize
  a whole multi-selection.
- **Search** with EXIF, star, and filename filters and a "Stop & Load
  Partial" hatch for big folders.
- **Drive & space info panel** — live disk-space snapshot of every drive.
- **Fully local** — no cloud, no upload, no internet needed after install.

## Get started

See **[QUICK_START.md](QUICK_START.md)** for the ten-minute install.

Feature-by-feature walkthrough: **[USER_GUIDE.md](USER_GUIDE.md)**.

What's new in each version: **[CHANGELOG.md](CHANGELOG.md)**.

One-time Electron polish (spell-check menu + drive info bridge):
**[ELECTRON-SETUP.md](ELECTRON-SETUP.md)**.

## Repo layout

```
Pro-Photo-Sorter/
├── frontend/            React source (App.js, components/, lib/)
├── electron-shell/      Electron wrapper — lives on your PC, see ELECTRON-SETUP.md
├── electron-additions/  Files to paste into electron-shell (preload.js, main.js, icon)
├── starter-packs/       Six ready-to-import Tag Packs
├── run-app.bat          Daily launch: pull, build, run in dev
├── pack-app.bat         Build a redistributable Windows installer
├── USER_GUIDE.md        Full manual
├── QUICK_START.md       Ten-minute install
├── CHANGELOG.md         Version history
└── ELECTRON-SETUP.md    One-time Electron-side paste-ins
```

## Building the installer

```cmd
pack-app.bat
```

Produces `electron-shell\dist\Pro Photo Sorter Setup 1.1.5.exe`.

## License

Personal use for the current tester. Redistribution rights TBD.

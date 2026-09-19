# Changelog

All notable changes to Pro Photo Sorter are tracked here. Dates in YYYY-MM-DD.

## v1.0.0 — 2026-02-15 · Ship candidate

The first officially "shippable" release. Everything below is what a new
user gets in one clean package.

### Added
- **Drive & space info panel** — click **🖴 Drives** on either the source or
  destination panel to see every drive on the system with free/used/total
  capacity bars.
- **System free-space chip** at the bottom of both panels showing total free
  space across all drives (Electron builds only; browser dev hides it).
- **Per-folder image count** on hover in both file trees — see how many
  photos live in a folder without opening it.
- **User Guide** (`USER_GUIDE.md`) and **Quick Start** (`QUICK_START.md`)
  bundled with the repo for new users.
- **NSIS Windows installer target** — `pack-app.bat` now produces a
  double-click `Pro Photo Sorter Setup 1.0.0.exe`.
- **App icon** (folder + camera motif) baked into the Electron build.

### Changed
- Version bumped from `0.25.0` → `1.0.0`.
- README refreshed with feature list and install path.
- `ELECTRON-SETUP.md` extended to include the new preload/IPC setup for
  drive info alongside the existing spellcheck instructions.

### Notes for existing testers
- Pull, then run `run-app.bat`. If git rejects the pull because of local
  `buildInfo.json` changes, run:
  ```
  git checkout -- frontend/src/buildInfo.json && git pull
  ```
- Update `electron-shell/main.js` and add `electron-shell/preload.js` using
  the copy-paste blocks in `ELECTRON-SETUP.md`.

---

## v0.25.0 — 2026-02-14 · Print + Watermark polish

### Added
- **Aspect-ratio Resize** store buttons (4×6, 5×7, 8×10, 11×14) with a
  draggable **Resize Crop Preview** modal at 300 DPI.
- **Font choice** for watermarks (multiple system fonts).
- **Quick per-image watermark toggle** — a pill button in the toolbar plus
  right-click on the viewer.
- **Spellcheck attributes** on the watermark text input and Tag rename
  popover, so Chromium underlines misspellings in red.
- `ELECTRON-SETUP.md` guiding a one-time `main.js` paste for the right-click
  spelling-suggestions menu.

### Fixed
- Resize output now correctly inherits folder path and filename template
  tags (previously landed in the destination root).

---

## v0.24.0 — 2026-02-12 · Watermark Phase 2

### Added
- Drag-to-position watermark preview overlay.
- Scale + opacity sliders with live preview.
- Light / Dark watermark styling.

### Fixed
- Watermark scale drift on very tall/wide images.

---

## v0.23.0 — 2026-02-10 · Tag Packs v1.1

### Added
- Import / Export a single Tag Pack as `.pps-tagpack.json`.
- **Bundle export** — package every pack into one `.zip` for sharing.
- **Bundle import** — restore an entire tag library from `.zip`.
- Six curated starter packs (wedding, portrait, landscape, wildlife,
  sports, real-estate) in `/starter-packs/`.
- Inline tag rename / delete on right-click.
- Cross-bar drag-and-drop for tags between packs.

### Changed
- Terminology: "Categories" → "Tags"; "Category Manager" → "Tag Manager".

---

## v0.22.0 — 2026-02-08 · Filmstrip & Cull Mode

### Added
- Filmstrip auto-scroll to keep the current thumb visible.
- Full-screen **Cull Mode** — big preview, keyboard rate + delete.
- Session stats bar above the filmstrip.
- Batch Rename modal with template previews.

---

## v0.21.0 — 2026-02-05 · Search & Batch

### Added
- **Search Modal** with EXIF filters, star filters, filename substring.
- "**Stop & Load Partial**" hatch for big scans.
- **Batch Actions**: store / move / delete / skip / watermark / resize a
  multi-selection.
- Recent Folders dropdown per side.

---

## v0.20.0 — 2026-02-01 · Image Editor

### Added
- Non-destructive Image Editor: crop, exposure, contrast, saturation,
  temperature, tint, rotate, flip.
- Auto-Tone based on histogram analysis.
- Right-side clipping bug fixed with a `ResizeObserver`.

---

## v0.10.0 — 2026-01-15 · MVP

### Added
- Dual file trees (source + destination) driven by File System Access API.
- Filmstrip of the current source folder.
- Tag bars for building destination paths and filenames.
- Store / Move / Delete / Skip.
- Star ratings persisted locally.
- EXIF read via `exifr`, template renderer with `{date}`, `{camera}`, `{n}` etc.
- Electron shell for a fully-offline Windows build.
- `run-app.bat` and `pack-app.bat` for one-click daily use and shipping.

---

## Roadmap (post-1.0)

- **Multi-Source Roots** — open several source folders stacked in the UI.
- **Metadata Sidecar (.xmp) export** — round-trip stars/tags with Lightroom.
- **AI Auto-Tagging** — offline TensorFlow.js/MobileNet scan that suggests
  category icons per photo.
- **Per-folder disk size** — needs the folder-path bridge; currently the app
  shows image count on hover instead.
- **First-Run Welcome Modal** and **In-App Starter-Pack Browser** for new
  testers.

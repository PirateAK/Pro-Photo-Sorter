# Pro Photo Sorter — Product Requirements Document

## Original Problem Statement
A professional photographer needs software to sort thousands of digital photos.
Requirements: file tree of source drive (left), file tree of destination drive (right),
filmstrip of photos in selected source folder (bottom), large image viewer (center),
icon bar above viewer, dropdowns for Date/Location/Categories, category lists with
custom icons, drag icons onto image to form a reorderable overlay that becomes the
destination filename/path, action buttons (Delete/Skip/Store), category management UI.

## User Personas
- **Working photographer**: has 10k+ RAW/JPG files, wants to cull + organize into
  a category-driven folder structure without repetitive typing.

## Tech Stack
- **Frontend**: React 19 (CRA + CRACO), Tailwind, Framer Motion, Lucide, exifr, Sonner
- **File I/O**: File System Access API (Chromium browsers) — no upload, direct disk
- **Persistence**: localStorage (`pps.state.v1`) for categories
- **Backend**: FastAPI (template, unused by the app — kept for supervisor)
- **Desktop packaging**: Optional Electron wrapper — see `/app/ELECTRON_PACKAGING.md`

## Core Requirements (Static)
- 5-region layout: source tree · center viewer · dest tree · top toolbar · bottom filmstrip
- Native drive access via FSA API
- Category lists with items: label + icon (built-in Lucide OR custom image)
- Drag/click icons from palette onto image
- Icons form a repositionable overlay bar; icons within can be reordered by drag
- Store action: first icon = subfolder under destination, remaining icons = filename
- EXIF-based Date, Location, Camera chips
- Thumbnail cache per session
- Keyboard shortcuts (Space=skip, Del=delete, S=store, ←/→=nav, Ctrl+Z=undo, B=batch, ?=help)
- Undo for skip and store actions
- Batch mode — apply icons to multiple selected photos, store all in one action
- Earth-tone dark theme (warm browns, ochre primary #C68A53, sage/terracotta accents)
- Author credit "Built for photographers · Pro Photo Sorter" in right panel footer

## What's Been Implemented (2026-01-27, iteration 2)
- ✅ Full 5-region CSS-grid layout with filmstrip sprocket-hole styling
- ✅ Recursive file trees (source + destination) with expand/collapse
- ✅ FSA API integration: pick directory, list children, list images, copy, delete, mkdir -p
- ✅ Filmstrip with in-memory + IndexedDB thumbnail cache
- ✅ Center image viewer with prev/next nav and filename badge
- ✅ EXIF chips (date, GPS, camera model)
- ✅ Category Manager modal — add/remove categories & items, built-in icon grid, custom image picker with 64×64 auto-crop
- ✅ Icon palette in top toolbar (category dropdown + draggable icon chips)
- ✅ Drag-and-drop from palette onto image
- ✅ Framer Motion Reorder for icon reordering; free-position drag of overlay bar
- ✅ Destination path preview line
- ✅ Actions: Skip (remove from view), Delete (from disk with confirm), Store (copy to dest with mkdir -p)
- ✅ Undo (skip + store, delete not undoable)
- ✅ Batch mode with visual selection
- ✅ Keyboard shortcuts + help modal
- ✅ localStorage persistence (synchronous save, v2 schema)
- ✅ Fallback screen for non-Chromium browsers
- ✅ Electron packaging guide

### Iteration 2 additions
- ✅ **Move-instead-of-Copy** toggle (Settings → Store Mode). Move mode deletes source after successful write and removes from filmstrip
- ✅ **Custom filename templates** with tokens: `{folder} {labels} {label1} {label2} {allLabels} {date} {stars} {original} {ext}`; 5 presets + live preview
- ✅ **Persistent thumbnail cache** via IndexedDB (`pps-thumbs` DB), with in-memory fast layer + "Clear cache" button
- ✅ **1–5 star ratings** per image, overlay widget on the viewer, star badges on filmstrip thumbs, minimum-star filter, keyboard shortcuts 1–5 to rate, 0 to clear
- ✅ **Image Editor** modal (opens via Edit button or `E` key):
  - Zoom with mouse wheel + slider (10%–800%)
  - Pan by dragging image
  - Fit-to-window and 100% shortcuts
  - Draw crop rectangle in image-space with rule-of-thirds overlay
  - Brightness slider (−80 to +80, darkens or lightens)
  - Sharpen slider (0–100, 3×3 convolution kernel)
  - "Save as new" — writes JPG with `_edit_YYYYMMDD_HHMMSS` suffix, non-destructive
  - Target selector: save into source folder or destination folder

### Iteration 3 additions
- ✅ **Rotate & Straighten**: 90° CW/CCW buttons + fine-tune angle slider (−15° to +15° in 0.1° steps); rotation applied full-res in save pipeline. Crop is disabled while rotated (mutually exclusive) with a hint.
- ✅ **Contrast** slider (−50 to +50) using CSS filter
- ✅ **Saturation** slider (−100 to +100) using CSS filter
- ✅ **Before / After Peek**: Hold `\` or `` ` `` (or press-and-hold the "Peek" button) to bypass every edit and preview the original with an "ORIGINAL" badge; releases on keyup/mouseup
- ✅ **Rating Filter Chip**: When the minimum-star filter is set > 0 and photos are loaded, an earth-tone chip appears at the head of the filmstrip showing "≥ N stars" with an X to clear the filter in one tap
- ✅ Polish: Escape key closes any open modal; help modal now has explicit close button; editor keyboard peek ignores input-focused elements

### Iteration 4 additions
- ✅ **Horizon Alignment Grid**: Fine translucent 10-column/row grid + bold centre cross overlays the canvas whenever the angle slider is focused or being dragged. Also a manual "Show alignment grid" toggle in the sidebar.
- ✅ **Batch Auto-Enhance**: New "Auto (N)" button in the toolbar (visible only in batch mode with ≥1 selection). Iterates through each selected image, samples its 256×256 histogram, computes brightness/contrast/saturation via percentile stretching + saturation-target logic, and writes an `_auto.jpg` next to each source. Live progress toast.
- ✅ **Custom Aspect Crops**: New Free / 1:1 / 4:3 / 3:2 / 16:9 buttons in the Crop section. Selecting a ratio auto-fits a centered max-size crop and constrains subsequent drag-to-resize to maintain that ratio.
- ✅ **Preset Looks**: Save the current Brightness/Contrast/Saturation/Sharpen combination as a named "look" (localStorage). One-click apply, hover-delete, inline save with Enter/Escape. Persisted under `looks: []` in `pps.state.v2`.
- ✅ **Auto-Enhance (single image)**: Inside the editor, `Wand2` button runs histogram analysis on the current image and sets the sliders to suggested values with an info toast.

### Iteration 13 additions (2026-02, Filmstrip loading state)
- ✅ **Loading indicator during folder scan**: Added `loadingImages` boolean state. When user selects a source folder, filmstrip immediately clears and shows "Loading images from selected folder…". After scan completes, message flips to actual results ("No images in this folder." only if truly empty). Small UX polish that removes the confusing pre-scan "no images" flash.

### Iteration 12 additions (2026-02, Per-Bar Category Memory)
- ✅ **Per-Bar Category Memory**: Added `foldersCatId` and `tagsCatId` to `DEFAULT_SETTINGS`. On mount, both palette bars restore their previously-chosen category from `settings`. Changing either bar's dropdown persists via wrapped setters (`setFoldersCatId` / `setTagsCatId`) that update settings. Deleted-category safety: sync effect uses raw setters to avoid double-persist loops.
- Verified: setting FOLDERS bar to "Rating" and reloading → bar restores to "Rating" with its icons. FILENAME bar independently keeps its own last choice.

### Iteration 11 additions (2026-02, Trash + Cull + Rating persist + Auto-Reopen toggle)
- ✅ **Empty Trash button**: Toolbar shows `Trash (N)` in danger color when `.pps-trash` inside the current source has files. Click → confirm → deletes all trash files and removes the folder. Live-refreshed when images list changes.
- ✅ **Cull Mode**: New full-screen `CullMode` component + `Cull` toolbar button. Filters to unrated photos by default; keys `1`–`5` rate + auto-advance, `0` clear, `Space`/`→` skip, `←` back, `Esc` exit. Shows a live progress counter and star buttons in the footer.
- ✅ **Persisted ratings across sort→search**: When `storeCurrent` writes a file to destination, it also mirrors the rating under the destination key (`{targetPath}/{writtenName}`). `photoSearch.match` now checks both persisted ratings and the `_starN_` filename heuristic — search's Min Stars filter is finally reliable.
- ✅ **Auto-Reopen toggle**: New Settings → Startup section with a checkbox for "Reopen last folders on launch" (default on). Persisted in `settings.autoReopenLast`. Startup toast effect returns early if disabled.
- Files added: `components/CullMode.jsx`

### Iteration 18 additions (2026-02, Inline tag editing + cross-bar drag)
- ✅ **Right-click context menu on palette chips**: Instant Rename / Add tag before / Add tag after / Delete / Manage category. Works independently on both FOLDERS and FILENAME rows.
- ✅ **Right-click on empty palette space**: "Add tag to [category]" + "Manage categories…" — no more opening the big modal just to add one tag.
- ✅ **Inline label popover**: Plain text input, Enter to save, Escape to cancel. Auto-selects existing label for quick overwrite. New tags default to Lucide `Tag` icon (custom-image icons remain in the full Category Manager per user request).
- ✅ **Middle-click quick-delete** on any chip with a 5-second Undo toast (same pattern as Trash).
- ✅ **Cross-bar drag to reorganize categories**: Drag a chip from FOLDERS palette bar onto the FILENAME palette bar (or vice versa) → the item moves from the source bar's currently-selected category into the target bar's currently-selected category. Highlight ring on hover. Same-category drops are a silent no-op. Undo toast on every move. Overlay-drop routing is unaffected because the overlay's `IconRow` stops event propagation before the palette-bar handler sees it.
- Files touched: `components/IconPalette.jsx` (full rewrite with menu + popover subcomponents + bar-level drop handlers + `sourceCatId` in drag payload), `App.js` (two new props on IconPalette: `onCategoriesChange`, `onOpenManager`).

### Iteration 17 additions (2026-02, Watermark on Store + Stop & Load Partial Search)
- ✅ **Watermark on Store**: New Settings section (`watermark-toggle` + `watermark-text`). When enabled, every stored JPG/PNG/WebP has the user's text baked into the bottom-right corner during Store & Batch Store. White text with a soft dark shadow (~1.6% of the long edge), 92% JPEG quality; PNG stays lossless. Non-watermarkable formats (GIF/BMP/HEIC) fall through to the original-bytes copy path so nothing breaks. Originals on the source drive are never modified — only the destination copy is stamped.
- ✅ **Stop & Load Partial (Search)**: Replaced the single "Cancel scan" button with a two-button footer during scan — primary **Stop & Load N** (aborts the walk and immediately loads whatever's been found so far into the filmstrip, labelling the batch "(partial)") + secondary **Cancel** (aborts and discards results). Lets Captain Kurt bail out of huge tree scans without waiting for the whole walk to finish.
- Files touched: `lib/watermark.js` (mime-preserving output, `canWatermark` helper), `lib/fsapi.js` (new `writeBlobTo`), `App.js` (import + branch in the store loop), `components/SettingsModal.jsx` (new Watermark section), `components/SearchModal.jsx` (`stopAndLoadPartial` + footer buttons).

### Iteration 10 additions (2026-02, Photo Search)
- ✅ **New Photo Search feature**: recursive filesystem search over sorted photos with these filters — folder tokens (multi-select), filename tokens (multi-select), ANY/ALL logic toggle, EXIF date range, min-stars (heuristic from filename `_star3_`), free-text substring. All configured in a new `SearchModal` opened via a Search button in the toolbar.
- ✅ **Live results streaming**: `photoSearch.searchPhotos()` is an async generator that yields matches as it walks the directory tree, so the modal updates a running count during scan. Cancel-mid-scan supported via AbortController.
- ✅ **Results → filmstrip integration**: "Load N into filmstrip" replaces the current filmstrip with matches, auto-enters batch mode with everything selected, and shows a "🔍 N results in [folder]" indicator. Users can then Store/Move/Re-tag with all existing batch tools.
- ✅ **Saved searches**: Persisted in `localStorage['pps.savedSearches.v1']` (max 20). Named queries can be loaded with one click, deleted individually.
- ✅ **Exit search mode**: dedicated button clears filmstrip and returns to normal sorting workflow. Delete is disabled while in search mode (parent handles unknown per FSA API).
- Files added: `lib/photoSearch.js`, `components/SearchModal.jsx`

### Iteration 9 additions (2026-02, Palette split + Startup reopen)
- ✅ **Two-row Icon Palette**: The single palette bar (dropdown + folder/tag toggle) is replaced with two independent stacked bars: **FOLDERS** and **FILENAME**. Each bar has its own category dropdown (`palette-folders-category-select`, `palette-filename-category-select`) and its own icon slider. Clicking/dragging an icon in the top bar goes to the Folders overlay row; the bottom bar goes to the Filename row. Removes the old `paletteTarget` state and the folder/tag toggle icons.
- ✅ **Startup "Reopen last session?" toast**: On app load, checks IndexedDB recents; if any exist, offers a single Reopen button that reacquires permission and loads both source + destination in one click. 600ms delay before toast to avoid sonner hydration races.
- ✅ **Per-picker location memory**: `pickDirectory()` now accepts `{ id, startIn }`. `pickSource` passes `id: "pps-source"` + the most recent source handle as `startIn`; `pickDest` does the same for destination. Chrome then reopens the picker near your last used folder. (Note: `C:\` cannot be forced as start location due to FSA API security — it only accepts a handle or well-known locations like "desktop"/"documents"/"downloads".)
- ✅ **Drag source-bar authority**: Drag payload from IconPalette now includes `{ item, role }`. Both `onImageDrop` (App.js) and `IconRow` drop handler (IconOverlay.jsx) route by that role instead of drop location. Fixes bug where dragging from Filename bar could land in Folders row when the mouse crossed the Folders row of the overlay. Result: source bar wins, drop is forgiving of aim.

### Iteration 8 additions (2026-02, Themes + Recents + Stats + Trash)
- ✅ **Earth Light theme**: Warm parchment palette with terracotta accents (light: `--bg #f5efe6`, `--primary #b56d3a`). Toggle-able via top-toolbar sun/moon button (`toggle-theme`) or Settings → Appearance section (`theme-dark` / `theme-light`). Persisted in `pps.state.v2.settings.theme`. Applied via `data-theme` attribute on `<html>`, driven by CSS variable overrides.
- ✅ **Recent Folders**: Small `chevron-down` dropdown next to both Source and Destination Open buttons shows the last 5 folders picked. Backed by a new IndexedDB store (`pps-recent`) since `FileSystemHandle`s can't go in localStorage. Uses `queryPermission`/`requestPermission` on click to re-verify access.
- ✅ **Session Stats strip**: Live counter row sitting directly above the filmstrip. Tracks Stored, Moved, Trashed, Skipped, Rated, Enhanced + Total. Reset button appears once any counter > 0. Counters bumped in `storeCurrent`, `deleteCurrentFile`, `removeCurrentFromView`, `batchAutoRate`, `batchAutoEnhance`.
- ✅ **Move-to-Trash delete flow**: Single delete (`Del` key or Delete button) and batch delete now copy files to `.pps-trash` subfolder inside the source drive before removing the original. Toast shows an inline "Undo" action that restores the file. Batch delete route through the same trash path; user can dig deleted files back out via File Explorer or the Undo toast.
- ✅ Kbd chip class made theme-aware (previously hardcoded rgba black, near-invisible in light theme). Light-theme `--text-dim` darkened to `#5c4c3b` for AA contrast on the stats strip.

### Iteration 7 additions (2026-02, Batch workflow overhaul)
- ✅ **Batch size limit** (default 20, configurable 1–500 in Settings). When selection exceeds the limit, a confirm dialog offers "process first N now (rest stay selected)" vs "process ALL at once (may lag)".
- ✅ **After-batch source handling** with 3 modes: `keep` (remove from filmstrip only), `move` (delete originals after copy), `delete` (delete originals with confirm). Default is set in Settings; per-run override lives in the Run Batch dropdown as `Store · Keep in source`, `Store · Move originals`, `Store · Delete originals`.
- ✅ **Auto-Enhance destination fix** — previously wrote `_auto.jpg` to source folder. Now writes to destination via icons on the first tagged photo, or falls back to the currently selected destination-tree folder. Errors clearly if neither is set.
- ✅ **Auto-apply icons prompt** — when a batch is run and only one selected photo has icons, prompts "Apply these to all N selected photos?" so the photographer doesn't have to tag every photo individually.
- ✅ **Always-confirm delete** — batch-delete mode requires explicit "Delete N originals from disk?" confirmation, cannot be undone.
- ✅ **Progress feedback** — processed photos are removed from the filmstrip (keep/move/delete all remove; leftover selection preserved for next click).
- ✅ New Settings section "Batch Behavior" with `batchSizeLimit` numeric input and `batchAfterAction` 3-way toggle.

### Iteration 6 additions (2026-02, Electron packaging deep-dive)
- ✅ **Debugged & fixed blank-window issue on packaged `.exe`** (root cause chain resolved):
  1. `frontend/package.json` `"homepage": "./"` — critical for relative asset paths under `file://`
  2. Broken transitive `ajv` dependency causing silent `npm run build` failures — fixed with `npm install ajv@^8 ajv-keywords@^5 --save-dev --legacy-peer-deps`
  3. `electron-shell/main.js` load path — must branch on `app.isPackaged` to use `process.resourcesPath/app/build/index.html` in prod vs `__dirname/build/index.html` in dev
  4. Verified `build.extraResources` config in `electron-shell/package.json` correctly places React build outside the ASAR
- ✅ Author + Emergent updated `/app/ELECTRON_PACKAGING.md` with the verified working config + Known Gotchas table
- ⏳ Confirmed working: `dist\win-unpacked\Pro Photo Sorter.exe` launches full working app; user made desktop shortcut

### Iteration 5 additions
- ✅ **Batch Rename** modal (`Rename` toolbar button): template-based rename with `{n}`, `{nn}`, `{nnn}`, `{nnnn}`, `{N}`, `{date}`, `{stars}`, `{original}`, `{ext}` tokens; 4 presets (Studio, Date+N, Keep original, Stars grouped); live preview table; crash-safe atomic writes (writes final name first, deletes original only after successful write); star-rating keys are remapped so ratings survive rename; EXIF dates parsed for every image during the actual run (not just previews).
- ✅ **Comparison View** (segmented ×1 / ×2 / ×3 control): splits center viewer into 2 or 3 side-by-side panes showing adjacent images with active-pane indicator, per-pane star badges, and a hint prompting to return to ×1 for tagging.
- ✅ **Face-Detection Auto-Rate** (`Auto-Rate` toolbar button): computes Laplacian-variance focus score for every image; when the browser exposes `FaceDetector` API also boosts scoring for photos with detected faces; batches rating updates. Falls back to focus-only with an on-toast hint when face API isn't available.
- ✅ **Contact Sheet PDF** (`Sheet` toolbar button): produces a printable jsPDF (Letter/A4, 3/4/5/6 columns) with earth-toned thumbnails, filenames, and star rows. Save to download, source, or destination. Live rendering progress. Contact sheet uses batch-selected photos when batch mode is active, otherwise the whole filmstrip.
- ✅ Bugfixes from testing: comparison mode retains star rating overlay + hint; all modals close on Escape even while text inputs are focused; rename is crash-safe; contact sheet uses lazy file loading to avoid unhandled promise rejections.


## Backlog / Future Enhancements

### 🐛 Known bugs (fix first next session)
_None outstanding._

### Iteration 25 (2026-02, Bundle picker + version 0.24.0 sync)
- ✅ **Bundle picker** — the old "Bundle all…" button in the Tag Manager footer is now **"Bundle…"** and opens a nested overlay listing every pack with checkboxes. Users can share only the packs they want ("here's my Wedding + Wildlife" instead of "here's everything I have"). Header shows `N of M selected`, Select all / Select none quick links, per-row tag count. Confirm button dynamically labels `Bundle N pack(s)`.
- ✅ **Version stamp now v0.24.0** in both `frontend/package.json` and `buildInfo.json`, aligning the in-app stamp with the iteration count.
- ✅ **`run-app.bat` / `pack-app.bat` hardened** with auto `npm install --legacy-peer-deps` step so future dependency additions never fail Kurt's build silently. `--legacy-peer-deps` matches the yarn permissiveness Emergent uses and sidesteps the `react-day-picker` vs `date-fns@4` strict-peer conflict on npm.
- Files touched: `components/CategoryManager.jsx` (state for picker, `openBundlePicker`, refactored `bundleExport(idsSet)`, overlay JSX), `run-app.bat` + `pack-app.bat` (`--legacy-peer-deps`), `frontend/package.json` + `buildInfo.json` (0.24.0).

### Iteration 24 (2026-02, Basics + Starter Packs + Bundle Export + Version sync)
- ✅ **Version bump to 0.23.0** in both `frontend/package.json` and `frontend/src/buildInfo.json`. Kurt still needs to manually bump `electron-shell/package.json` on his PC (that file lives outside the Emergent workspace).
- ✅ **Polished default packs** in `storage.js` — renamed to **"Subjects (Basic)"** (8 tags: portrait, landscape, wildlife, macro, action, group, closeup, night) and **"Ratings"** (7 tags: pick, keep, reject, best, star3, star4, star5). Fresh installs get a productive starting point.
- ✅ **6 starter packs** shipped as distribution files in `/app/starter-packs/`:
  - `wedding.pps-tagpack.json` (18 tags — ceremony, reception, portraits, details)
  - `wildlife.pps-tagpack.json` (18 tags — Alaska-first: bear, moose, eagle, salmon, whale, otter, wolf, seal + behavior)
  - `landscape.pps-tagpack.json` (18 tags — golden hour, mountains, water, aurora, aerial)
  - `portrait.pps-tagpack.json` (17 tags — headshot, family, studio, natural light, senior)
  - `real-estate.pps-tagpack.json` (17 tags — room-by-room + exterior + aerial + twilight)
  - `sports.pps-tagpack.json` (17 tags — game, action, peak moment, celebration, team)
  - `README.md` explains how to import and share
- ✅ **Bundle Export** — new "Bundle all…" button in Tag Manager footer. Uses `jszip` (added via `yarn add jszip`) to package every user pack into a single `pps-tagpacks_YYYY-MM-DD.zip` — perfect for full-setup backups or moving to another PC. Zip includes a `bundle.json` manifest with pack names and tag counts.
- Files touched: `frontend/package.json` (version + jszip dep), `frontend/src/buildInfo.json` (version), `frontend/src/lib/storage.js` (default pack contents), `frontend/src/components/CategoryManager.jsx` (bundle export + button), 6 new pack JSON files + README in `/app/starter-packs/`.
- **Note for Kurt**: On your PC, edit `C:\Pro-Photo-Sorter\electron-shell\package.json` and change `"version": "1.0.0"` → `"version": "0.23.0"` so the installer file name matches the in-app stamp.

### Iteration 23 (2026-02, Tag Packs v1.1 groundwork — Import / Export / Rename)
- ✅ **Export pack**: Button in the Tag Manager's right-pane header. Serializes the current pack to `<packname>.pps-tagpack.json` and triggers a download via a temporary `<a download>` link. Format: `{ formatVersion: 1, kind: "pps-tagpack", name, description, exportedAt, tags: [{label, iconType, iconName, iconData}] }`. Custom image icons embed as base64 so packs are fully self-contained files that can be emailed / thumb-drived to friends.
- ✅ **Import pack**: Button below "New tag pack…" in the left rail. Opens a native file picker (`accept=".json,.pps-tagpack.json,application/json"`). Validates `kind === "pps-tagpack"` and `Array.isArray(tags)` before importing. **Always adds** — never merges, never replaces — auto-suffixes on name collision (`Wildlife` → `Wildlife (2)` → `Wildlife (3)`) so no existing pack is ever destroyed. Toast confirms with name + tag count.
- ✅ **Rename pack**: Pencil icon appears on hover in the left rail next to the trash icon. Click to enter inline edit mode — Enter saves, Escape cancels, blur commits. Great for tidying up imported packs (e.g. renaming `Wildlife (2)` → `Wildlife-Alaska`).
- ✅ Complete lifecycle now lives entirely inside Tag Manager: **Create · Add/Edit tags · Rename · Delete · Export · Import**. No new modals, no new screens.
- Files touched: `components/CategoryManager.jsx` (import/export/rename handlers, new left-rail Import button + import file input, right-pane Export button, click-to-rename inline input with save/cancel, unique-name helper). Icon imports expanded: `Download`, `Upload`, `Pencil`.

### Iteration 22 (2026-02, Version stamp in UI)
- ✅ **Build stamp visible in the app** — bottom-right of the destination panel footer: `v0.21.0 · 2026-02-15` in dim font-mono. Hovering the stamp reveals a tooltip explaining what it's for so testers know to include it in bug reports.
- ✅ **`src/buildInfo.json`** — small JSON blob with `version` and `buildDate`. Imported into `App.js` and rendered. Under version control so the fallback is meaningful even before a rebuild.
- ✅ **Auto-regeneration on every build** — both `run-app.bat` and `pack-app.bat` now include a `node -e ...` one-liner that reads the version from `package.json` and stamps today's ISO date into `buildInfo.json` before `npm run build`. No manual bumping ever.
- ✅ **Bumped `frontend/package.json` version** from `0.1.0` → `0.21.0` to match the iteration count so what testers see aligns with what we call the release.
- ✅ **Shipped `run-app.bat` into the workspace** (previously only pack-app.bat was tracked in Emergent) so future updates flow to Kurt via the same push-and-pull cycle.
- Files touched: `App.js` (import + rendered stamp), `frontend/src/buildInfo.json` (new), `frontend/package.json` (version bump), `run-app.bat` (new in workspace, adds build-info step), `pack-app.bat` (adds build-info step).

### Iteration 21 (2026-02, Terminology cleanup: Categories → Tags, groundwork for Tag Packs)
- ✅ **User-visible rename** — pure UI-string swap, zero internal code changes (variable names `categories`, `items`, `setCategories` all preserved for stability, `data-testid`s preserved for test snapshots).
  - Toolbar "Categories" button → **Tags**
  - Modal title "Category Manager" → **Tag Manager**
  - Left-rail placeholder "New list…" → **New tag pack…**
  - Right-pane "N icons" → **N tags**
  - Item input "Label (used in filename/folder)…" → **Tag label (used in filename/folder)…**
  - Empty-state "No icons yet." → **No tags yet.**
  - Empty pack "Create a category to begin." → **Create a tag pack to begin.**
  - Right-click menu "Manage category…" / "Manage categories…" → **Manage tag pack…** / **Manage tag packs…**
  - Empty-bar hint "No icons in this list — right-click to add one, or open Category Manager." → **"No tags in this pack — right-click to add one, or open Tag Manager."**
  - Footer copy expanded to preview the coming feature: **"Tag packs let you swap sets of tags for different photography styles…"**
- ✅ Sets up **Tag Packs feature** (v1.1 add-on): export/import `.pps-tagpack.json` files, opinionated starter packs per photography specialty (Wedding, Wildlife, Landscape, Portrait, Rating, Real Estate), share via any file transfer.
- Files touched: `App.js` (toolbar label + placeholder copy), `components/CategoryManager.jsx` (all user-facing strings), `components/IconPalette.jsx` (context-menu labels + empty-state copy).

### Iteration 20 (2026-02, Watermark drag preview + font size + opacity + color)
- ✅ **Font size preset**: Small (~1%) / Medium (~1.6%, default) / Large (~2.4%) of the long edge. Applied consistently in `writeWithWatermark` and the live preview.
- ✅ **Opacity slider**: 30–100%, step 5. Multiplied into the stamp's fill alpha.
- ✅ **Text color: Light / Dark** — Light = white text with a soft dark halo (default, good on darker photos); Dark = black text with a soft light halo (good on bright skies / snow / sand). Halo automatically flips for legibility.
- ✅ **Live drag-to-position preview**: 380×220 canvas inside the Watermark section renders either the currently-viewed photo (if any) or a fallback earth-tone gradient. Drag anywhere on the preview → position saved as `{ watermarkXPct, watermarkYPct }` percentages so it lands correctly on any aspect ratio. Small circle marks the anchor. Reset button snaps back to bottom-right.
- ✅ **Preview scale=3** so Small/Medium/Large font differences are visible on the tiny preview canvas. Export uses real photo dimensions (scale=1) so the actual output matches the intended fractions.
- ✅ **Auto text alignment by zone**: The `computeStampGeom` helper picks `textAlign` (left/center/right) and `textBaseline` (top/middle/alphabetic) based on which third of the image the anchor lives in, and nudges the draw point inward by a padding value so the text never kisses the edge. Same math is shared between preview and export so what you see is what gets baked.
- ✅ Corner presets deliberately omitted — drag preview replaces them per user request.
- Files touched: `lib/watermark.js` (added `paintWatermark`, `computeStampGeom`, `FONT_SIZE_FRACTION`, expanded options incl. `color` and `scale`), `components/SettingsModal.jsx` (font-size buttons, opacity slider, color picker, new `WatermarkPreview` subcomponent with pointer-drag handling and HiDPI canvas), `App.js` (thread `previewImageHandle` through, pass all watermark options into `writeWithWatermark`).

### Iteration 19 (2026-02, Image Editor right-clip fix)
- ✅ **Image Editor no longer clips on the right when opened in a non-maximized window or when the window is resized.** Root cause: `fit()` and the canvas render effect only re-ran on `imgEl` changes, so a stale `getBoundingClientRect()` measurement from before the modal's layout had settled could leave the canvas sized wider than the visible stage. Fix: introduced a `stageTick` counter driven by a `ResizeObserver` on the stage element + a `window.resize` listener + a 30 ms delayed bump on mount. `stageTick` is a dependency of both the `fit()` effect and the render effect, so any layout change now triggers a clean re-fit and re-render.
- Files touched: `components/ImageEditor.jsx` (state, effect adds, dependency updates).

### Captured 2026-02 (mid-session, awaiting return)
**Watermark polish — two-stage plan:**
- **Stage 1 (fast, ~1 session)**: Corner picker in Settings — Top-Left / Top-Right / Bottom-Left / Bottom-Right radio (bottom-right stays default) + opacity slider (30/60/90/solid). Persist as `settings.watermarkCorner` and `settings.watermarkOpacity`. Update `writeWithWatermark(sourceHandle, text, { corner, opacity })` to compute x/y from corner + apply alpha to fillStyle.
- **Stage 2 (larger)**: Live preview panel inside the Settings watermark section — renders a downsized thumbnail of the currently-viewed photo (fallback: a sample gradient) with the stamp overlaid. Draggable stamp; position saved as `{ xPct, yPct }` so it lands correctly on any aspect ratio. Corner presets remain as one-click shortcuts.
- **Recommendation**: Ship Stage 1 first — user reports 90% of the ask is "just pick a different corner". Stage 2 is nicer-to-have.

**User documentation package (do this right before v1.0 tag, not before):**
- `USER_GUIDE.md` — full manual auto-generated from the codebase. Sections: Getting Started in 5 Minutes, File Trees, Filmstrip, Icon Palette (Folders + Filename rows), Store / Batch / Move / Delete flow, Watermark, Search, Cull Mode, Contact Sheet, Auto-Rate, Batch Rename, Themes, Recent Folders, Settings reference, Keyboard Shortcuts cheat sheet, Troubleshooting FAQ, Glossary. Include `[insert screenshot: xxx]` markers for user to fill in.
- `QUICK_START.md` — one-page printable cheat sheet (keyboard shortcuts + core flow).
- Optional in-app "?" Help panel — same content rendered inside a modal so customers don't need to open a file.
- Convert Markdown → PDF or HTML for shipping via `md-to-pdf` or similar (one command).
- Short marketing blurb + feature list for distribution page.
- **Timing rationale**: Docs freeze the feature surface, so best done right before the v1.0 release tag, not against a moving target.

### Original backlog
- P1: Direct MOVE (currently only copies — user can delete original manually or use Delete)
- P1: EXIF-based date grouping filter for filmstrip
- P2: Custom filename templates (e.g., `{date}-{label1}-{label2}`)
- P2: Persistent thumbnail cache (IndexedDB) across sessions
- P2: RAW file support via wasm decoder
- P2: Star rating widget separate from category icons
- P2: Multi-monitor / detachable viewer window
- P3: Cloud sync of category presets across machines

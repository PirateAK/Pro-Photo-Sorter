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

### v1.1.3 — 2026-02-15 · Adjustable UI text size + filmstrip thumbnails + tagline polish
- ✅ **Global UI Text Size** control in Settings → Appearance. Five presets
  (Compact 90%, Default 100%, **Comfortable 110% — new baseline**,
  Large 125%, Extra Large 140%). Scales every label, button, tab, filmstrip
  caption, tree row, and modal body proportionally via root `<html>` font-size.
  Verified no clipping at 140% because Tailwind sizing is rem-based.
- ✅ **Keyboard shortcuts**: `Ctrl` + `=` bigger, `Ctrl` + `-` smaller,
  `Ctrl` + `0` reset. Snaps to nearest preset then moves one step; toast
  confirms new size.
- ✅ **Filmstrip Thumbnail Size** control in Settings. Four presets:
  Small (96px), **Medium (128px, default)**, Large (176px), Huge (224px).
  Strip row height driven by `--filmstrip-h` CSS variable so the CSS grid
  layout follows the selected size. Verified via computed styles: 96→168,
  128→200, 224→296.
- ✅ **Bottom-right tagline polish**: stacks cleanly on two lines
  ("Built for photographers" tagline / "Pro Photo Sorter" heading) — no
  more mid-phrase wrapping between the middle-dot separator.
- Files touched: `frontend/src/lib/storage.js` (added `uiScale: 1.10`,
  `thumbSize: 128` defaults), `frontend/src/App.js` (root font-size effect,
  `--filmstrip-h` effect, nudgeUiScale/resetUiScale, Ctrl shortcuts, stacked
  tagline block, `size` prop on `<Thumbnail>`), `frontend/src/App.css` (grid
  row uses `var(--filmstrip-h, 200px)`), `frontend/src/components/Thumbnail.jsx`
  (`size` prop with inline styles), `frontend/src/components/SettingsModal.jsx`
  (UI Text Size + Filmstrip Thumbnail Size sections). Version bumped to 1.1.3.

### v1.1.2 — 2026-02-15 · File-tree refresh fix
- ✅ **Source tree stayed on the previous folder after switching drives**
  (destination worked only by coincidence when leaf names differed). Chromium
  exposes `FileSystemDirectoryHandle.name` as the *leaf* only, so keying by
  name collided when two picks shared a folder name (`G:\Photos` vs
  `C:\Users\Kurt\Photos`). Fix: `App.js` maintains `sourceTreeKey` /
  `destTreeKey` counters that bump on every pick path (fresh, recent-pick,
  startup reopen). `FileTree.jsx` folds that counter into its `TreeNode` key,
  guaranteeing a full remount every time.
- ✅ Bumped `frontend/package.json` → `1.1.2` so `pack-app.bat` stamps the
  installer as `Pro Photo Sorter Setup 1.1.2.exe`.
- Files touched: `frontend/src/App.js`, `frontend/src/components/FileTree.jsx`,
  `frontend/src/buildInfo.json`, `frontend/package.json`, `CHANGELOG.md`.

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

### 💡 Captured 2026-02 (Kurt's late-night hiccup, before soccer)

**1. Quick watermark toggle on active image** — Right-click on the main viewer (active selection from filmstrip) to **apply** the saved watermark to that photo, or **X to remove** it. Currently the watermark is only baked into stored files via Settings. This feature would let users preview + toggle per-image before storing, and possibly override the global watermark setting per photo. Design open questions: is this a *preview* overlay only (visual, non-destructive) or does it write a watermarked copy immediately? Rec: preview overlay + a "Store with watermark" quick button so it's non-destructive until stored.

**2. Watermark text field: spell-check autocorrect missing** — When typing the watermark text in Settings, browser spell-check underlines misspellings in red but right-clicking doesn't offer "Change to…" suggestions. This is Electron's default behavior — the native Chromium spell-check dictionary needs to be enabled via `session.defaultSession.setSpellCheckerLanguages(...)` in `electron-shell/main.js` plus a right-click context menu implementation via `electron-context-menu` npm package or manual `webContents.on('context-menu')` handler. Small fix, mostly polish. Nice-to-have.

**3. Font choice for watermark** — Add a font dropdown to the Watermark section in Settings. Suggested options: System (default sans), Serif (Georgia/Times), Monospace (Courier), Script/Handwriting (cursive/Brush Script), Bold Display (Impact). Wire into `paintWatermark`'s `ctx.font` string. Small addition — ~10 min.

**4. Aspect-ratio store buttons** — Under the existing **Store** and **Undo** buttons, add a row of quick-crop-and-resize buttons for common print sizes: **4×6 · 5×7 · 8×10 · 10×12** (any other sizes = custom via edit window). Clicking one would auto-center-crop the current photo to that aspect ratio + optionally resize to print pixels (e.g. 300 DPI: 4×6 = 1800×1200), then store. Design questions: (a) auto-center-crop or open a small crop preview first? (b) resize to a target DPI (300?) or keep original resolution and just crop? (c) preserve orientation (portrait vs landscape auto-detect) or force one? Rec: open a tiny "adjust crop" popover with drag-to-position before store, at native resolution (no DPI resize), auto-detect orientation. Medium feature — one focused session.

### 🐛 Known bugs (fix first next session)
_None outstanding._

### Iteration 26 (2026-02, Resize-for-Print + Watermark Font + Quick WM Toggle + Spellcheck)
- ✅ **Print-size resize buttons** (row under Store/Undo): **4×6 · 5×7 · 8×10 · 10×12 · 16×20** — click a size, a Crop Preview modal opens with the image + a draggable aspect-locked crop box + rule-of-thirds guides. Auto-centered by default, drag to reposition, **Store** confirms → 300 DPI print-ready JPEG (e.g. 4×6 → 1800×1200 px). Filename gets a `_4x6.jpg` suffix so multiple prints of the same photo don't collide. Same folder/filename template as regular Store, honors watermark per-image override.
- ✅ **Watermark font family** picker in Settings: System (Sans) · Serif · Monospace · Script · Display (Bold). Applied consistently in preview, export, and resize paths.
- ✅ **Per-image watermark toggle**: 🎨 WM ON/OFF pill above the resize row shows the current photo's effective state; click flips it. Right-click on the main image also toggles with a toast confirmation. Uses a `watermarkOverrides` state keyed by full image path — undefined = follow global setting, `true/false` = override. Both storeCurrent and storeResized honor the per-image override.
- ✅ **Spellcheck** on the watermark text field + the inline tag popover input: `spellCheck={true}` + `autoCorrect="on"` — Chromium's underline appears while typing.
- ✅ **`ELECTRON-SETUP.md`** — one-time paste-in for `electron-shell/main.js` so right-click on an underlined word shows the "Change to 'X'" suggestions menu (Electron built-in, no npm dep).
- ✅ **Version bump to 0.25.0** (frontend + buildInfo). Kurt's manual step: also bump `electron-shell/package.json` to 0.25.0.
- Files touched: `lib/watermark.js` (WATERMARK_FONTS, fontStackFor, fontFamily option), `lib/resize.js` (new — cropAndResize, PRINT_SIZES, targetDimsFor, cropBoxFor), `components/ResizeCropModal.jsx` (new — draggable crop preview), `components/SettingsModal.jsx` (font dropdown, spellCheck), `components/IconPalette.jsx` (spellCheck on popover), `App.js` (watermarkOverrides state + helpers, storeResized handler, resize button row + WM toggle pill, right-click on main image), `frontend/package.json` + `buildInfo.json` (0.25.0), new `ELECTRON-SETUP.md`.

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


### Iteration 26 — v1.0.0 ship prep (2026-02-15)

**Ship candidate — everything below is what a new tester gets in one clean package.**

- ✅ **Documentation bundle**
  - `USER_GUIDE.md` — full feature manual (~350 lines): layout, file trees, filmstrip, tag packs, sorting flow, star ratings, cull mode, image editor, watermarks, resize-to-print, batch actions, search, recent folders, drive/space info, settings, keyboard shortcuts, bug-reporting.
  - `QUICK_START.md` — ten-minute install + first-use walkthrough.
  - `CHANGELOG.md` — per-version history from v0.10.0 (MVP) → v1.0.0.
  - `README.md` — refreshed with feature highlights, repo layout, install path.
- ✅ **Version bump** — `frontend/package.json` 0.25.0 → 1.0.0; `buildInfo.json` stamped. In-app stamp now reads `v1.0.0 · 2026-02-15` in the destination footer.
- ✅ **Full file-tree upgrade** (delivered here):
  - New **DrivesPanel** modal — click 🖴 next to either Open button. Shows every drive with letter, volume label, total capacity, free space, and a used-percentage bar (color-shifts to amber at 75%, red at 90%).
  - **System-free-space chip** at the bottom of both source and destination panels, auto-refreshes every 60 s.
  - **Per-folder image count on hover** in both file trees — lazily counted when the mouse enters a node, cached for the session.
  - Everything degrades to hidden/graceful when `window.electronAPI` is absent (browser dev mode).
- ✅ **NSIS Windows installer** — `pack-app.bat` now bakes the icon in, copies preload/main.js/package.json from `electron-additions/` into `electron-shell/`, and produces `Pro Photo Sorter Setup 1.0.0.exe` via electron-builder.
- ✅ **App icon** — a 512×512 folder+camera earth-tone PNG at `electron-additions/icon.png`, wired into `webPreferences.icon` and the NSIS installer.
- ✅ **`electron-additions/`** directory — canonical home for the four files Kurt must have in `electron-shell/`: `main.js` (spellcheck + IPC drives bridge), `preload.js` (contextBridge exposing `window.electronAPI.listDrives`), `icon.png`, `package.json` (electron-builder config).
- ✅ **Updated ELECTRON-SETUP.md** — one copy-paste block that syncs all four files into `electron-shell/` and runs `npm install`.
- ✅ **run-app.bat & pack-app.bat** now auto-sync `electron-additions/` → `electron-shell/` on every launch/build, so Kurt never has to manually re-paste after a git pull.

Files touched:
- New: `frontend/src/lib/electronBridge.js`, `frontend/src/components/DrivesPanel.jsx`, `USER_GUIDE.md`, `QUICK_START.md`, `CHANGELOG.md`, `electron-additions/{main.js,preload.js,icon.png,package.json}`.
- Updated: `frontend/src/App.js` (drives button + free-space chip + DrivesPanel modal), `frontend/src/components/TreeNode.jsx` (per-folder image count on hover), `frontend/src/buildInfo.json`, `frontend/package.json`, `README.md`, `ELECTRON-SETUP.md`, `run-app.bat`, `pack-app.bat`.

### Iteration 28 — v1.1.0 shipped (2026-02-15)

**Final version bump: `1.1.0-dev` → `1.1.0`.** Kurt promoted, built the NSIS installer, uninstalled v1.0.5, installed `Pro Photo Sorter Setup 1.1.0.exe` on his PC, verified everything, tagged `v1.1.0` in git, pushed the tag, and published a GitHub Release with the installer attached. v1.0.5 release kept live for history.

### On-deck for v1.2 (deferred by Kurt at end of v1.1.0 session)

- **P0 · Trial-mode enforcement & Licensing** — Gumroad key entry in Help modal; force watermark ON + `_TRIAL` filename suffix until verified. Blocks monetization otherwise.
- **P1 · Default EXIF Location in Settings** *(Kurt, 2026-02-15)* — new field
  in Settings so a user working on a single shoot can set the location value
  once (e.g. "Kenai, Alaska") and have every photo inherit it, without
  re-typing on each new photo or session. Should apply to both the on-viewer
  EXIF chip and any filename token that references location. Persist in
  `settings.defaultLocation`. Consider a "clear" button and a small "using
  default" indicator so the user knows the value is coming from Settings.
- **P1 · Quick Date-Tag Dropdowns in Top Toolbar** *(Kurt, 2026-02-15)* —
  add three compact dropdowns beside the Help button (Month / Day / Year)
  plus an "Apply" button. Selecting a value + clicking Apply appends the
  chosen date parts as filename tags on the current photo (same slot as
  Filename Tag Packs). Pre-populate from the current photo's EXIF date on
  load so the user only tweaks. Empty selections skipped. Nice-to-have:
  keyboard shortcut (`Alt+D`) to focus the Month dropdown.
- **P1 · Multi-Source Roots** — open several source folders stacked in the UI (Kurt's photographers-with-multiple-cards scenario).
- **P1 · Metadata Sidecar (.xmp) export** — round-trip stars/tags with Lightroom.
- **P2 · Hover-Zoom preview on filmstrip thumbs** *(Kurt, 2026-02-15)* —
  hovering any filmstrip thumbnail for ~500ms pops up a 2× (or scaled by
  current thumbSize) preview alongside the cursor, so composition and focus
  can be judged without clicking. Should respect the current filmstrip
  Thumbnail Size preset (Small hover = 2×, Huge hover = 1.2× so it stays
  on screen). Debounce to avoid flicker; hide on any click or when the
  cursor leaves the strip.
- **P2 · First-Run Welcome Modal** — greet new testers with a "try the starter pack" nudge.
- **P2 · In-App Starter-Pack Browser** — one-click imports without folder-diving. Pairs naturally with community text-list packs.
- **P2 · Duplicate pack button** in Tag Manager — spotted during v1.1 build; useful when two packs share ~80% of tags.
- **P3 · AI Auto-Tagging** — offline TensorFlow.js/MobileNet scan. Explicitly deferred by Kurt to "much later".
- **P3 · Per-folder disk size** in the file tree — needs the folder-path bridge; app currently shows image count on hover as the lightweight alternative.

### Waiting on tester feedback
Kurt is going to hand v1.1.0 to fellow photographers and expects "enhancements, not bugs". Any bug reports that come back should be triaged against the current v1.1.0 build; enhancement requests go into the on-deck list above.

---

### v2 Ideas Bin (post-v1.2, longer-term)

**Kurt's v2 additions, captured 2026-02-15 while chatting between sessions:**

#### 🏷️ Third "Tags" bar — Lightroom-style keyword database (P1 for v2)

Add a **third palette row** below the existing Folders and Filename bars,
labeled simply **Tags**. Unlike the other two, these tags do NOT modify the
file path or filename — they attach as *metadata* to each photo for fast
search, filtering, and Lightroom-style keyword workflows.

Design notes:
- Extend the paired-list Tag Pack model to a **triple-list model**:
  `folderItems` + `filenameItems` + `metadataItems`. One pack still drives all
  three bars.
- Storage: keep a `photoTags` map in localStorage keyed by full photo path,
  each value an array of tag IDs. Cheap and instant.
- Search Modal already has the scaffold for tag filtering — extend to filter
  by metadata tags too (with a "match ANY / match ALL" toggle).
- Pairs perfectly with the **XMP Sidecar export** feature (already P1) — write
  these tags into each photo's `.xmp` so they round-trip with Lightroom /
  Bridge / Capture One.
- UI: the third row visually distinguished (maybe a subtle background tint or
  a "META" role icon) so users don't confuse it with the path-shaping bars.
- Text-list format extended with a third section: `# Wedding` → folder tags,
  blank, filename tags, blank, metadata tags. Backward-compatible with v1
  two-section files (no third section = empty metadata list).

Effort estimate: **2–3 days** — data model extension, third IconPalette row,
Search Modal filter expansion, Tag Manager third section, XMP export coupling.

#### 📷 Wireless camera import — pull from camera to filmstrip (P2 for v2)

Let the user connect their WiFi/Bluetooth-enabled camera and have photos
appear in the filmstrip as they're shot or on demand — no card-to-reader
round trip.

Feasible approaches (research needed at build time):

- **A · FTP-server-in-app** (most universal for pro cameras). Many current
  bodies — Canon R5/R6/1DX III, Sony A1/A7/A9, Nikon Z8/Z9, Fujifilm GFX —
  support "FTP push" mode where the camera uploads new shots to an FTP
  target. Pro Photo Sorter runs a small local FTP server (Node has
  `ftp-srv` package, ~200 lines to embed), presents credentials and an IP
  to enter into the camera, and streams incoming shots straight into the
  active source folder. Highest coverage across brands.

- **B · Watch-folder mode** (simplest fallback). User points their
  vendor's WiFi app (Canon Camera Connect, Sony Imaging Edge Mobile, etc.)
  to save to a Windows folder. Pro Photo Sorter watches that folder and
  auto-imports to the filmstrip on new file arrival. Zero protocol work,
  but requires the vendor app to already be set up.

- **C · Vendor SDKs** (per-brand deep integration). Canon EDSDK, Nikon
  SDK, Sony Camera Remote SDK. Powerful (remote shutter, live view,
  settings) but heavyweight, per-brand, and Kurt wouldn't need most of it.
  Skip unless a specific tester requests remote control.

Design notes:
- Bluetooth is impractical for image transfer (single-photo transfers over
  BLE are 30-60 seconds per image). Keep it for camera wake/pairing signals
  only.
- Would need an in-app **Camera Connect** modal walking the user through
  their brand's WiFi setup with copy-paste-ready IP + credentials — Kurt's
  strength is user-facing docs, this is right up his alley.
- Ship with brand-specific setup guides: Canon, Sony, Nikon, Fujifilm.
- Filmstrip should distinguish "just landed from camera" photos with a
  small camera-icon badge so the photographer knows they're fresh.

Effort estimate: **1 week** for approach A (FTP-in-app) + brand docs.
Approach B is **1–2 days** and could ship earlier as a stopgap.

Ordering hint: **Ship B first as a v1.3 "watch folder"**, then A as the
headline v2 feature. That way the least-effort win lands soon and the
big-name feature has time to bake.




### Iteration 27 — v1.1.0-dev · Paired-list Tag Packs (2026-02-15)

Post-v1.0 usability fix. Kurt hit the "identical tags in both bars" problem the moment he sat down to sort real photos with the shipped v1.0.5.

**Problem:** Tag packs held ONE list of tags. Picking "Wildlife" for the Folders bar and "Wildlife" for the Filename bar loaded the same 8 tags in both places, offering no meaningful distinction between folder-level and filename-level tagging.

**Fix:** Restructured tag packs to hold TWO paired lists per pack (`folderItems` + `filenameItems`). One picker on the Folders bar drives both rows. The Filename bar now shows a read-only pack label instead of its own picker.

- ✅ Storage key bumped `pps.state.v2` → `pps.state.v1_1` — clean break, no migration (Kurt approved wiping legacy packs).
- ✅ New `lib/tags.js` helper (`getListKey`, `getItems`, `withItems`, `totalCount`) so palette/manager/search share one source of truth.
- ✅ `IconPalette` reads role-specific list, accepts `hidePicker` prop, drag payload now carries `sourceRole` so intra-pack folder↔filename swaps route correctly.
- ✅ `CategoryManager` (Tag Manager) reworked as a two-section editor: **FOLDER PATH TAGS** and **FILENAME TAGS**, each with its own icon picker, Add button, and tag grid.
- ✅ **Drag-and-drop between sections inside Tag Manager** — grab a card, drop on the other section, tag moves and a toast with **Undo** appears. Verified via native DragEvent + DataTransfer dispatch.
- ✅ Import/export fidelity — new format `formatVersion: 2` carries `folderTags` + `filenameTags`; legacy v1 files auto-import into the folder list (backward-compatible fallback).
- ✅ New default seed pack: single "Wildlife (Example)" showing the paired-list model — Kurt will recreate his own six packs on his side.
- ✅ SearchModal updated to flat-map both lists so all tags remain searchable regardless of role.

Files touched:
- New: `frontend/src/lib/tags.js`.
- Updated: `frontend/src/lib/storage.js`, `frontend/src/components/IconPalette.jsx`, `frontend/src/components/CategoryManager.jsx`, `frontend/src/components/SearchModal.jsx`, `frontend/src/App.js` (Filename palette now takes `foldersCatId` + `hidePicker`), `frontend/src/buildInfo.json`, `frontend/package.json` (→ 1.1.0-dev).

**Also patched during the same session (pre-1.1 UI polish):**
- Watermark toggle moved from the "Resize for print" row header into its own bar directly below the Rate stars bar in the viewer (proper `role="switch"` toggle with © knob and ON/OFF label).
- Tidy © badge in the top-left of the photo when watermark is ON for the current image.
- Nav arrows in the main viewer restyled with `icon-overlay` + heavier stroke for legibility.
- kbd hint chips (`Space` / `Del` / `S` on Skip/Delete/Store) fixed for both dark and light themes.
- Installer version-sync — `pack-app.bat` now stamps `electron-shell/package.json` from `frontend/package.json` before building so the `Setup X.Y.Z.exe` filename can never drift again.
- v1.0.5 tagged in git and published as a GitHub Release with the installer attached.

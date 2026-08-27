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

### Iteration 5 additions
- ✅ **Batch Rename** modal (`Rename` toolbar button): template-based rename with `{n}`, `{nn}`, `{nnn}`, `{nnnn}`, `{N}`, `{date}`, `{stars}`, `{original}`, `{ext}` tokens; 4 presets (Studio, Date+N, Keep original, Stars grouped); live preview table; crash-safe atomic writes (writes final name first, deletes original only after successful write); star-rating keys are remapped so ratings survive rename; EXIF dates parsed for every image during the actual run (not just previews).
- ✅ **Comparison View** (segmented ×1 / ×2 / ×3 control): splits center viewer into 2 or 3 side-by-side panes showing adjacent images with active-pane indicator, per-pane star badges, and a hint prompting to return to ×1 for tagging.
- ✅ **Face-Detection Auto-Rate** (`Auto-Rate` toolbar button): computes Laplacian-variance focus score for every image; when the browser exposes `FaceDetector` API also boosts scoring for photos with detected faces; batches rating updates. Falls back to focus-only with an on-toast hint when face API isn't available.
- ✅ **Contact Sheet PDF** (`Sheet` toolbar button): produces a printable jsPDF (Letter/A4, 3/4/5/6 columns) with earth-toned thumbnails, filenames, and star rows. Save to download, source, or destination. Live rendering progress. Contact sheet uses batch-selected photos when batch mode is active, otherwise the whole filmstrip.
- ✅ Bugfixes from testing: comparison mode retains star rating overlay + hint; all modals close on Escape even while text inputs are focused; rename is crash-safe; contact sheet uses lazy file loading to avoid unhandled promise rejections.


## Backlog / Future Enhancements
- P1: Direct MOVE (currently only copies — user can delete original manually or use Delete)
- P1: EXIF-based date grouping filter for filmstrip
- P2: Custom filename templates (e.g., `{date}-{label1}-{label2}`)
- P2: Persistent thumbnail cache (IndexedDB) across sessions
- P2: RAW file support via wasm decoder
- P2: Star rating widget separate from category icons
- P2: Multi-monitor / detachable viewer window
- P3: Cloud sync of category presets across machines

# Pro Photo Sorter — Product Requirements Document

## Original Problem Statement
A professional photographer needs software to sort thousands of digital photos.

## v1.3.1 — 2026-02-23 · Housekeeping + cross-cat drag + Custom Images Library
- ✅ **Repeat last tags auto-disable** — button greys out with friendly
  tooltip when user is still parked on the just-stored photo.
- ✅ **Top toolbar split into two rows** — EXIF · Edit → Help.
- ✅ **CRITICAL bootRestore fix** — per-key restore actually runs when
  license carries over but state is wiped.
- ✅ **DevTools re-enabled** — F12 / Ctrl+Shift+I toggle DevTools.
- ✅ **"Restore tags from Safety-Backup" button** in Settings.
- ✅ **Cross-Category chip drag** — drag any filename chip onto ANY
  category row in the left rail.
- ✅ **Cleanup helper** — "Delete empty (N)" button in each Category
  header.
- ✅ **Zoom badge polish** — top-center + theme-aware colors.
- ✅ **Date tools grouped** — Month/Day/Year selects + Apply button
  in a tinted pill.
- ✅ **Custom Images Library** — right-rail Icon Holders with Basic
  Icons + Custom Images boxes. Global + Per-Category scopes. Bulk
  import, drag-to-swap, click-to-arm. Export/Import as
  `.pps-iconpack.json` for customer distribution via Gumroad.
- ✅ **Six bundled Starter Icon Packs** — Wildlife, Wedding, Sports,
  Holiday, Family Portrait, Nature/Landscape. 65 total icons
  rendered as SVG-emoji data URLs (works offline, sharp at any size).
  New "Starter packs" button in Custom Images box opens a browser
  modal; one-click installs to Global scope. Files live in
  `frontend/public/starter-icon-packs/` and ship inside the .exe.
- ✅ Regression tests: **94/94 passing** across 10 files.

## v2 Backlog (moved from v1.3.x) — 2026-02-23 checkpoint
Deferred to v2.0 FLAGSHIP build per Kurt's request. Bundling these
here so nothing gets forgotten between now and v2 kickoff:
- **Main Window Icon Palette Sync** — compact popover in the main
  window so grabbing an icon mid-sort doesn't require opening the Tag
  Manager. Foundation is done; just needs the popover UI + drag-source
  wiring. Deferred so it gets a proper design pass.
- **Fancy Contact-Sheet Preview** — in-app PDF preview with page
  navigation (mini-filmstrip pattern like the Image Editor), zoom,
  and edit-in-place: swap thumbnails, drag to reorder before save.
  v1.3.1 opens the PDF in Chromium's viewer window; v2/v3 gets the
  full-fidelity in-app experience.
- **Kurt-only Pack Creator Tool** — separate authoring app (or a
  hidden PPS mode gated by a Kurt-only flag) that lets Captain Kurt
  produce signed .pps-iconpack.json bundles for Gumroad customers with
  author + version + license metadata baked in. Kept OUT of the
  public v1 build because every buyer would see a "sign your pack"
  UI they don't need — Kurt is the sole content creator.
- **Custom Pack Screenshot Tool** — one-click PNG mosaic of the
  current library, ready for Gumroad cover art. Pairs with the
  Pack Creator Tool above.
- **Multi-Source Roots** — open several source folders stacked in the
  left rail for cross-shoot sessions.
- **XMP Sidecars** — export metadata sidecars so stars/tags round-trip
  with Lightroom.
- **Native RAW support** in filmstrip + viewer (CR2 / NEF / ARW / DNG).
- **Face Recognition AI Sort** — face-api.js, the v2 flagship feature.
- **EXIF Write-Back + full EXIF Editor** window (ExifTool.exe bundle).
- **Wireless camera FTP-in-app** & **Watch-folder mode**.
- **Sunrise (blues/grays) + Sunset (golden)** color themes with
  matching icons.
- **Editor Save / Aspect Ratio** — hold edited image in state so user
  can tag before storing (currently auto-writes to /Unsorted).
- **Preserve tags across editor round-trip.**
- **Hover-Zoom preview on filmstrip thumbs.**
- **First-Run Welcome Modal / In-App Starter-Pack Browser polish.**
- **Manual "People" Tag Pack** — hand-typed names, drag-onto-photo
  (stepping stone for v2 face recognition).
- **Print-services integration** (v3 "Super PPS" goal).

## v1.3.0 — 2026-02-21 · CASCADE Tag Manager (Category → Sub-Folder → Filename)
- ✅ Tag Manager reshaped from parallel two-list model to a cascading
  three-level hierarchy: **Category → Sub-Folder → Filename Tag**.
- ✅ Left rail relabeled **"Categories"**. Main pane now shows Sub-Folders
  list at top + dedicated **Filename Tags editor pane** below, populated
  from whichever sub-folder is currently selected.
- ✅ Silent one-shot migration on next load: every legacy folder-path-tag
  becomes an empty sub-folder; existing sub-folders preserved untouched;
  orphan pack-level filename tags land in `_Unsorted filenames`. Zero
  data loss. Idempotent.
- ✅ Header counts auto-update (`N sub-folders · M filename tags`).
- ✅ Regression suite: `frontend/tests/cascadeMigration.test.mjs` (4
  assertions). Full suite 53/53 across 6 files.
- Deferred to v1.3.1: cross-Category chip drag; hide empty FOLDERS chip
  row in main window when no folder-path chips remain (currently just
  shows the Category dropdown alone).


## v1.2.9 (pass 4) — 2026-02-20 · Dockable filmstrip + folder consolidation
- ✅ **Fixed invisible arrows in light mode** — filmstrip prev/next buttons
  now use explicit `text-white` so the chevrons read on every theme.
- ✅ **Dockable filmstrip** — new one-click dock picker at the top-left of
  the strip lets Kurt pop it to bottom / top / left / right. Left and
  right positions reshape the grid to a 4-column vertical layout and
  flip the strip to scroll vertically. `settings.filmstripPosition`
  persists the choice. Auto-scroll of the active thumb is
  orientation-aware.
- ✅ **Consolidated `electron-additions/` → `electron-shell/`** as the
  single source of truth. The duplicate folder was causing
  `pack-app.bat` to silently ship builds without my updated `main.js`.
  Repo now has one canonical build source.

## Backlog captured 2026-02-20 evening (Kurt, sign-off notes)

### Cheer & personality (v2 flavor pass)
- **Lighten the load** — audit copy, empty states, toasts, and hover text to
  add warmth. Fewer "Click Open to browse", more "Ready when you are ⛅".
  Small wins: seasonal footer hints, occasional friendly emoji on
  success toasts, playful loading strings.
- **Two new color themes** (v2):
  - **🌅 Sunrise** — subdued blues/grays, cool morning palette, sunrise
    icon in the theme switcher. Pairs with 5am boat-deck culling.
  - **🌇 Sunset** — warm golden theme built around the primary-earth
    tone, sunset icon in the switcher. Complements the wildlife /
    landscape work PPS is used for.
  - Both should honor the existing CSS-var token system so no component
    styles need touching — just new `[data-theme="sunrise"]` /
    `[data-theme="sunset"]` blocks in `index.css`.

### Print services (v2 → v3)
- **v2**: One-click "Send to print" from the destination pane. Start with
  a single vendor integration (candidate: Bay Photo or Mpix — both have
  a documented order API and pro-photographer market). Payload = the
  selected photo(s) + resize preset + a shipping profile stored in
  Settings. Watermark toggle honored.
- **v3 flagship — "Super PPS"** — an all-in-one shop for working pro
  photographers, PPS as the daily hub:
  - Multiple print-lab integrations (Bay Photo, Mpix, WHCC, ProDPI)
  - Client galleries — publish a batch to a private share link
  - Invoicing hooks (QuickBooks / Stripe) tied to a shoot folder
  - License-and-release capture (embed model releases with photos)
  - Session budgets (frames-per-hour, storage-cost tracking)
  - Optional cloud mirror of the safety-backup (for photographers who
    trust a cloud provider). Keep 100% offline mode as the default.


- ✅ Removed the top-left `© WM` chip and the top-right WM ON/OFF toggle
  from the image overlay. Both now sit side-by-side in the toolbar row,
  right-aligned directly under the 16×20 resize button. The chip shows
  the FULL watermark text (or the trial banner) so at a glance Kurt can
  see exactly what will be stamped onto the photo. Empty state is a
  dashed "click to add" chip that jumps to Settings.


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

## v1.2.9 — 2026-02-20 · Date-stamp toggle + Editor filmstrip + Spring-loaded subfolders + Data-loss-proof updates (LATEST)

### New in this pass (workflow polish)
- ✅ **Date selector defaults to today.** No more auto-pulling EXIF into
  the picker — Kurt is almost always stamping today's date, so today is
  now the resting state. Change the Year dropdown only when working on
  older photos.
- ✅ **Apply toggles Apply / Remove.** Only one date-stamp set per photo,
  ever. Second press of the button reads "Remove" and clears the stamp.
  Stable chip ids (`date-stamp-month`, `-day`, `-year`) make re-applying
  with a different year replace the old stamp instead of stacking.
- ✅ **Tag Manager reorder — Folders → Sub-Folders → Filename.** Editor
  now reads left-to-right in the same shape as the destination path it
  builds.
- ✅ **Spring-loaded sub-folders.** Drag any chip over a collapsed
  sub-folder header; if you hover 500ms it auto-expands so you can drop
  into the nested list. Moving off cancels the timer. Row shows a subtle
  earth-tone tint while armed so you can see it's about to open.
- ✅ **Editor filmstrip.** Prev/Next arrows + horizontal thumb strip at
  the bottom of the Image Editor. Click a thumb to jump to that photo
  without closing the editor. If you have unsaved edits, the existing
  three-way prompt now offers Save-and-jump / Discard-and-jump / Cancel.


- ✅ **P0 FIX**: License key + tag pack wipe after v1.2.8 update fully resolved.
  Root cause: v1.2.8 renamed Electron `productName` → Chromium's `userData`
  folder shifted from `%APPDATA%\electron-shell\` to `%APPDATA%\Pro Photo
  Sorter\`, orphaning Local Storage + IndexedDB. Fixed in three layers:
   1. Pin `userData` path in `main.js` BEFORE `app.whenReady()` so future
      productName renames can't move storage.
   2. One-time boot-migration copies `Local Storage`/`Session Storage`/
      `IndexedDB` from legacy `electron-shell` dir if pinned dir is empty.
   3. Safety-Backup mirror to `Documents\Pro Photo Sorter\Safety-Backups\`
      (latest.json + one dated snapshot/day, 30-day rolling window). Boot
      restores localStorage from mirror before React mounts if `%APPDATA%`
      has been wiped for any reason (uninstall, disk cleanup, another
      rename in future).
- ✅ Help → License panel shows Safety-Backup status + "Open folder" button.
- ✅ Regression suite: `frontend/tests/safetyBackup.test.mjs` (6 tests).
  Full suite green: 44/44 assertions across 4 test files.


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

### v1.1.10 → v1.1.11 — 2026-02-16 · Zoom+Pan main preview + Duplicate tag chip
- ✅ **`ZoomablePreview.jsx`** (new component) wraps the main-viewer `<img>`:
  - Mouse wheel zooms toward cursor (0.25× .. 8×, 1.15× per notch)
  - `=`/`+` and `-` keyboard shortcuts (no modifier)
  - Left-click OR middle-click drag pans when zoomed
  - `zoom-badge` in top-right fades in/out on any change (900ms)
  - `zoom-controls` at bottom-right of viewer: ZoomOut / Fit / ZoomIn buttons
  - Auto-resets to fit on `resetKey` change (wired to `currentImagePath` so
    filmstrip navigation resets zoom)
  - Imperative ref API: `zoomIn()` / `zoomOut()` / `fit()` / `getScale()`
- ✅ Wired into `App.js`: `zoomRef` ref, keyboard handler branches for
  `=`/`+`/`-` (guarded to not fight Ctrl+= UI-scale), zoom-controls JSX,
  replaced raw `<img>` with `<ZoomablePreview>` while preserving the
  watermark right-click toggle. Kept `0` key free for star-rating clear.
- ✅ **Duplicate tag chip** (right-click chip → Duplicate chip).
  `IconPalette.jsx` `duplicateItem()`: copies item at index+1 with new
  `uid`, label suffixed " (copy)" (60-char cap), then opens the inline
  rename popover so user can tweak immediately. Toast confirms with
  hint. Wired via new `onDuplicate` prop on `ContextMenu`.
- Versions bumped: v1.1.10 (zoom+pan) then combined with copy-chip → v1.1.11.

### v1.1.9 — 2026-02-16 · Full-label tooltips on tag chips
- ✅ Every tag chip's `title` attribute now leads with the full label so
  clipped chips (e.g. `Groom's…` on a Wedding pack) reveal the whole name
  on hover. Three renderers touched:
  1. `CategoryManager.jsx` — main pack Folder/Filename tag cards
  2. `CategoryManager.jsx` — SubfolderSection inline chips (also got
     `max-w-[240px]` + `truncate` so long labels stay visually tidy)
  3. `IconPalette.jsx` — palette bar chips in the main window
- Version bumped to 1.1.9.

### v1.1.8 — 2026-02-16 · Visual Sub-Folder Editor
- ✅ **SUB-FOLDERS section** in Tag Manager (`SubfolderSection` component)
  below the Filename tags list. Full CRUD: add (Enter or button), rename
  (double-click name or pencil), reorder (up/down arrows), delete (with
  confirm if it has tags). Chevron expands each row to reveal a mini
  filename-tags editor (Enter to add, hover-x to remove). Empty-state hint
  guides new users. New packs seeded with empty `subfolders: []`. Files
  touched: `frontend/src/components/CategoryManager.jsx` (CRUD handlers
  + `SubfolderSection` component, ~250 lines).
- Version bumped to 1.1.8.

### v1.1.7 — 2026-02-16 · Default Location + Date-Tag Dropdowns + sub-folder migration
- ✅ **Default EXIF Location** in Settings (`settings.defaultLocation`). Fallback
  chain on the Location chip: per-photo override → Settings default → EXIF GPS.
  Chip shows a subtle `default` badge (data-testid `exif-loc-default-badge`)
  when the value comes from Settings, distinct from the green "override"
  style for per-photo values. Placeholder in the edit input hints at the
  default. Files touched: `frontend/src/lib/storage.js` (new setting),
  `frontend/src/components/ExifChip.jsx` (usingDefault prop),
  `frontend/src/App.js` (fallback chain, don't-save-if-equals-default),
  `frontend/src/components/SettingsModal.jsx` (new Default EXIF Location section).
- ✅ **Date-Tag Dropdowns** (`DateTagDropdowns.jsx`) beside Help button.
  Month/Day/Year dropdowns pre-fill from EXIF on photo load. Apply pushes
  non-empty parts as FILENAME tags via `applyIcon(..., "tags")` — Calendar
  icon, one per part. data-testids: `date-tag-dropdowns`, `date-tag-month`,
  `date-tag-day`, `date-tag-year`, `date-tag-apply`.
- ✅ **Auto-migration for existing Sports pack**: `loadState` now seeds the
  demo Baseball/Basketball/Football sub-folders into any Sports pack that
  has zero sub-folders. User's own sub-folders never touched. Fixes the
  "I upgraded but Sports has no sub-folders" issue.
- Version bumped to 1.1.7.

### v1.1.6 — 2026-02-16 · Sub-folders (Inherit model) + A-Z pack sort
- ✅ **Nested Tag Packs**: pack shape gains optional `subfolders: [{ id, name,
  iconName, filenameItems }]`. When the picked pack has sub-folders, a new
  middle **SUB-FOLDER** bar renders between FOLDERS and FILENAME (new
  component `SubfolderBar.jsx`). Clicking a chip sets `activeSubfolderId`
  in App.js; the FILENAME bar swaps to that sub-folder's items via a new
  `overrideItems`/`overrideLabel` prop on IconPalette. Path builder in
  `storeCurrent` and the destination preview both prepend the sub-folder
  name (e.g. `Sports/Baseball/…`). Parent's folder tags stay in the top
  bar (Inherit model — Kurt's pick).
- ✅ **Sports starter pack demo**: Baseball, Basketball, Football sub-folders
  seeded with team-name filename tags so the feature works on first install.
- ✅ **Text-list `##` sub-folder headers** in `tagpackText.js`. Backwards
  compatible: old v1.1.5 files parse identically (no `##` = no sub-folders).
  Round-trip verified via `/app/backend/tests/tagpackText_test.mjs`.
- ✅ **Pack list A→Z sort** everywhere: Tag Manager sidebar AND every
  IconPalette FOLDERS/FILENAME dropdown. Cures Kurt's OCD.
- Files touched: `frontend/src/lib/storage.js` (subfolders on Sports pack +
  defensive migration), `frontend/src/components/SubfolderBar.jsx` (new),
  `frontend/src/App.js` (activeSubfolderId state, SubfolderBar injection,
  path prepend), `frontend/src/components/IconPalette.jsx` (overrideItems
  + overrideLabel + A-Z dropdown), `frontend/src/components/CategoryManager.jsx`
  (A-Z pack sidebar), `frontend/src/lib/tagpackText.js` (## parser +
  subfolder serialize), version bumped to 1.1.6.

### v1.1.5 — 2026-02-15 · Repeat Tags, safer Editor Done, A-Z tag sort
- ✅ **Repeat Last Tags** button + `R` keyboard shortcut. Snapshots the tag
  overlay from the most recently stored photo (folder + filename tags),
  one-click re-applies to the current image. Confirm dialog protects the
  current photo if it already has tags. Snapshot stored in-memory only
  (per-session); great for repetitive shoots. Files touched:
  `frontend/src/App.js` (`lastAppliedTags` state, snapshot inside
  `storeCurrent`, `repeatLastTags` handler, `R` shortcut, UI button in
  destination panel with `data-testid="btn-repeat-tags"`).
- ✅ **A→Z sort toggle** on both Folder and Filename tag bars. Per-pack
  per-role flag stored on the pack shape as `sortAlpha: { folders, filename }`.
  Little `ArrowDownAZ` button next to the pack dropdown; highlights in
  earth-tone when active. `IconPalette.jsx` sorts `items` by `label` before
  render when the flag is on. Persists via `onCategoriesChange`.
- ✅ **Editor Done dialog**: `ImageEditor.jsx` used to silently write an
  `_edit_*.jpg` on Done-with-edits and toast "No changes to save" on
  Done-without-edits. Now a proper three-way inline dialog (`showDonePrompt`
  state) offers **Save changes / Discard / Cancel** when there are edits;
  Done with zero edits still closes silently. Data-testids:
  `editor-done-prompt`, `done-prompt-save`, `done-prompt-discard`,
  `done-prompt-cancel`.
- Version bumped to 1.1.5.

### v1.1.4 — 2026-02-15 · Six starter Tag Packs
- ✅ **Six ready-to-use starter Tag Packs** ship on every fresh install:
  Wildlife, Wedding, Portrait, Landscape, Sports, Real Estate. Each pack has
  5-7 folder-path tags + 6 filename tags with sensible Lucide icons. Total
  seed: 36 folder tags + 36 filename tags across all packs.
- ✅ **Restore Starter Packs** button in Settings (icon: PackagePlus). Merges
  any missing starter packs into the user's library — never touches existing
  packs. Deduplication keyed on stable pack IDs (`cat-starter-*`). Info toast
  when all six already present.
- ✅ **Legacy migration**: existing v1.1.3-and-earlier installs had one pack
  keyed as `cat-default-1` named "Wildlife (Example)". `loadState` now
  auto-retags it to `cat-starter-wildlife` so the dedup logic recognizes it
  as the starter Wildlife pack and doesn't add a duplicate on restore.
  User customizations preserved.
- Files touched: `frontend/src/lib/storage.js` (six starter packs + migration
  + `getStarterPacks`/`STARTER_PACK_IDS` exports), `frontend/src/App.js`
  (`restoreStarterPacks` handler + wired into SettingsModal),
  `frontend/src/components/SettingsModal.jsx` (new Starter Tag Packs section
  with PackagePlus icon), version bumped to 1.1.4.

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

### Iteration 32 — v1.2.3 Auto-update + Auto-backup + Backup All (2026-02-17)

Kurt asked for a scalable path to push updates as he ramps sales — plus
belt-and-suspenders data safety after nearly losing a morning of tag
work. All three shipped in one release:

1. **Full auto-update via `electron-updater`** targeting
   `github.com/PirateAK/Pro-Photo-Sorter/releases/latest`. Opt-in per user.
   Non-silent: user sees a Download button, then an Install & Restart
   button. All user data survives.
2. **Daily tag-pack auto-backup** — plain-text snapshot to
   `<destRoot>/.pps-backups/pps-tagpacks_YYYY-MM-DD.pps-taglist.txt`,
   7-day rolling retention. Opt-out via Settings.
3. **Backup All button** in Tag Manager — one-click zip of every pack
   as JSON + text-list snapshot + bundle manifest.

Files touched:
- `electron-additions/main.js` — rewrote to add `autoUpdater` wiring,
  new IPC handlers: `pps:check-for-updates`, `pps:download-update`,
  `pps:install-update`, `pps:open-external`, `pps:app-version`.
- `electron-additions/preload.js` — exposed the update APIs via
  `window.electronAPI.*` + `onUpdateStatus(cb)` subscription.
- `electron-additions/package.json` — added `electron-updater` dep +
  `publish: [{ provider: "github", owner: "PirateAK",
  repo: "Pro-Photo-Sorter" }]` block so `electron-builder` writes a
  `latest.yml` alongside the `.exe`.
- `frontend/src/lib/electronBridge.js` — thin wrappers over the update
  IPC channels; degrade to no-ops outside Electron.
- `frontend/src/lib/backups.js` — new module. `maybeAutoBackup()`
  guarded by `settings.lastTagBackupDate` so it only writes once per
  calendar day. Retention loop keeps the newest 7.
- `frontend/src/components/UpdateBanner.jsx` — new. Renders inside the
  app-shell alongside the Trial banner. Progress %, Download button,
  Install & Restart button, dismiss X.
- `frontend/src/App.js` — imports and renders UpdateBanner; kicks off
  `maybeAutoBackup()` when destRoot first appears.
- `frontend/src/lib/storage.js` — new default settings:
  `checkForUpdates: false`, `autoBackupTagPacks: true`,
  `lastTagBackupDate: ""`.
- `frontend/src/components/SettingsModal.jsx` — two new sections:
  Auto-Update (opt-in) + Auto-Backup Tag Packs (opt-out).
- `frontend/src/components/CategoryManager.jsx` — new `backupEverything()`
  handler + Backup All button in the footer, next to Bundle…
- `ELECTRON-SETUP.md` — rewritten for v1.2.3 with the critical new step:
  upload BOTH `.exe` and `latest.yml` to every GitHub Release.

**Critical publishing note baked into the release-day workflow:**
`electron-builder` outputs `latest.yml` alongside `Pro Photo Sorter
Setup X.Y.Z.exe`. Attach BOTH to the GitHub Release. Without
`latest.yml`, `electron-updater` can't discover the new version.

### Iteration 31 — v1.2.2 Sub-folder round-trip fix (2026-02-17)

Kurt spent a morning building rich tag packs with sub-folders, then found:
1. "Export pack" (JSON) silently omitted every sub-folder and its filename tags
2. "Import text list" claimed success but discarded parsed sub-folders

Good news: his "Export as text" DID include sub-folders (parser+serializer
already worked), so nothing was lost. The bug was in
`CategoryManager.importFromTextFile` — it copied `folderItems` and
`filenameItems` from the parsed pack but ignored `subfolders`.

Three fixes in this release:
1. `CategoryManager.serializePack()` — includes `subfolders` array
   (formatVersion bumped 2 → 3).
2. `CategoryManager.importFromFile()` — reads `subfolders` from v3 files;
   still parses v2 (folder+filename only) and legacy v1 (single `tags`).
3. `CategoryManager.importFromTextFile()` — passes `p.subfolders` through
   to the new category. This is the one that unblocks Kurt's restore.

New regression at `frontend/tests/tagpackText.roundtrip.test.mjs`
(20 cases, all passing) locks the round-trip contract.

Files touched:
- `frontend/src/components/CategoryManager.jsx`
- `frontend/src/lib/tagpackText.js` (import path fix so tests run)
- `frontend/src/buildInfo.json`, `frontend/package.json` (1.2.1 → 1.2.2)

### Iteration 30 — v1.2.1 Folder-path fix + Applied-chip highlight + Tag Manager drag-swap (2026-02-17)

Kurt reported that when building tag lists during real use, the folder
structure came out reversed: `/Brides family/Ceremony/…` instead of
`/Wedding/Ceremony/Brides family/…`. He also wanted applied chips to stay
highlighted for at-a-glance "what did I tag this photo with?" plus faster
tag-manager UX (drag icon onto chip to swap; copy/move chips between
sub-folders).

**Ships (all four asks landed):**
1. Destination folder order fixed → `[Pack]/[folder tags]/[Subfolder]/`
   via new `composeDestFolderParts()` helper. All 4 store paths use it
   (normal, batch, resize-print, auto-enhance) so files always land at
   the same place. Preview line mirrors the order.
2. Palette chips light up when applied to the current image (earth-tone
   background + checkmark). Click a lit chip to remove it. Applies to
   both Folders and Filename bars, works in batch mode too.
3. Drag from icon picker → drop on any chip → chip's icon swaps in place.
   Works from built-in icon grid AND from the custom image preview tile.
   Targets: main-pack chips + every sub-folder's filename tag chips.
4. Move/copy chips between sub-folders — drag (move), Ctrl+drag (copy),
   right-click for a Move-to.../Copy-to... submenu with every sibling
   sub-folder listed.

**Files touched:**
- `frontend/src/App.js` — new `composeDestFolderParts`, new
  `removeChipFromCurrentImage`, `appliedFolderIds` + `appliedTagIds`
  memos, wired into both IconPalette instances. All 4 store paths patched.
- `frontend/src/components/IconPalette.jsx` — added `appliedIds` +
  `onRemoveApplied` props, lit-chip render, toggle-on-click behavior.
- `frontend/src/components/CategoryManager.jsx` — new handlers
  (`swapItemIcon`, `swapSubfolderItemIcon`, `moveSubfolderItem`), new
  `ChipRow` and `SubfolderItemChip` sub-components, new
  `SubfolderItemContextMenu`. Built-in icon grid + custom image preview
  are now draggable.
- `frontend/src/buildInfo.json` — v1.2.0 → v1.2.1
- `frontend/package.json` — v1.2.0 → v1.2.1
- Regression test at `frontend/tests/folderPath.test.mjs` — 8 cases
  covering the new composer.

**Backward-compat note (from Kurt's chair):** existing files already on
disk under the old `/Subfolder/Pack-folder-chips/…` paths stay where they
are. New stores from v1.2.1 forward go into the new tree
`/Pack/Pack-folder-chips/Subfolder/…`. Kurt can move old files by hand or
leave them — no automatic migration is attempted (would need
FSA-recursive-move which we don't have).

### Iteration 29 — v1.2.0 P0 Trial Mode + Gumroad Licensing shipped (2026-02-17)

**Monetization enforcement is live.** Unlicensed installs run in **Trial Mode**:
every stored photo now gets a forced watermark ("TRIAL - Pro Photo Sorter
(unlicensed)") and a `_TRIAL` filename suffix (applies to normal store, batch
store, and Resize-for-Print flows).

Activation is handled entirely client-side against Gumroad's public
`/v2/licenses/verify` endpoint (no server, no OAuth token in Electron, no
FastAPI proxy — keeps the app 100% infra-free). Product ID
`sxHfeHU-l7nk1-LAdVrQZA==` is hard-coded. One internet ping per install;
result cached in `localStorage` (`gvmaas.license.v1`) forever after.

New files:
- `frontend/src/lib/license.js` — activate / deactivate / trial-suffix
- `frontend/src/components/TrialBanner.jsx` — top-of-app strip when unlicensed
- `frontend/src/components/LicenseSection.jsx` — Help modal License tab
- `frontend/tests/license.trial.test.mjs` — 10-case regression (all passing)

Modified: `frontend/src/App.js` (imports + trial enforcement in both store
flows + banner render + Help-modal open-to-License-tab), `HelpModal.jsx`
(new License tab, print button hidden on License tab), `App.css`
(app-shell wrapper so the banner sits above the grid without breaking the
100vh layout), `frontend/package.json` (v1.1.11 → v1.2.0).

**Deactivation trade-off explicitly chosen (option A):** the in-app
"Deactivate on this PC" button clears local storage only. It does NOT hit
Gumroad's decrement endpoint (that requires the seller's OAuth token,
unshippable in Electron). If a user hits Gumroad's use-count limit after
moving PCs, they email `leaderteamk@gmail.com` and the seller resets it
from the Gumroad Sales dashboard in 30 seconds. Chosen over the cloud-proxy
option (b) to keep the app zero-infra.

Trial watermark deliberately OVERRIDES the user's own watermark text so
trial output is unmistakably trial output — a user setting their own name
in Settings.watermarkText can't accidentally launder trial photos.

### On-deck for v1.2 (deferred by Kurt at end of v1.1.0 session)

- ~~**P0 · Trial-mode enforcement & Licensing**~~ ✅ Shipped v1.2.0 (2026-02-17).
- **🎯 P1 · Manual "People" Tag Pack** *(Kurt, 2026-02-17, v2 stepping stone)* —
  hand-typed list of names that becomes a special tag pack. Same
  drag-onto-photo ergonomics as normal packs, seeded with people's names
  instead of subjects. Zero AI, ships in a day. **When v2.0 face
  recognition launches, this same "People" pack auto-populates with
  detected faces — no lost user data, smooth upgrade path.** Ship target:
  v1.2.6 or v1.2.7.
- **🎨 P2 · Consistent "active-mode" visual language across all toggles**
  *(Kurt, 2026-02-17)* — apply the earth-tone-when-active fill we now
  use on Batch All/None + applied chips to every stateful button in the
  app. First target: **star-rating filter buttons** in the filmstrip
  header — currently show a checkmark but keep the neutral fill. Also
  audit: Watermark toggle, filter buttons, sort toggles, cull-mode
  buttons — anything that has an "on/off" or "N-of-many" mode. Goal:
  one consistent visual language so users immediately know which
  toggles are active.
- **🧰 P2 · Tag Manager housekeeping batch** *(Kurt, 2026-02-17)* — several
  quality-of-life fixes to run together when we next touch the Tag Manager:
  1. **Reorder sections** so the natural path order is reflected:
     `Folders → Sub-Folders → Filename` (currently
     `Folders → Filename → Sub-Folders`). Sub-folders belong next to
     Folders since they inherit folder-tag context.
  2. ~~**Resizable Tag Manager window**~~ ✅ Shipped v1.2.8 (2026-02-17).
     Drag corner handle, size persists per-user.
  3. **Spring-loaded sub-folder open** — when dragging a chip over a
     collapsed sub-folder header for ~500 ms, auto-expand the panel so
     the user can drop into it without a separate click. Follows
     Finder/File Explorer convention.
  4. **Cross-list drag between main lists and sub-folders** — drop a
     main-pack tag onto a sub-folder to move/copy it into that
     sub-folder's filename tags; drop a sub-folder tag onto the main
     Folder or Filename list to promote it up. Uses the same Ctrl-drag
     copy modifier we already ship for cross-subfolder moves.
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
- **P1 · Filmstrip inside the Editor window** *(Kurt, 2026-02-15, late-night)* —
  add a compact filmstrip strip along the bottom of the editor so the user
  can navigate to the next/previous image without closing and reopening.
  Loading a new image auto-resets zoom/pan/sliders to Fit; unsaved edits
  trigger the v1.1.5 Save/Discard/Cancel prompt before switching.
- **P1 · Editor "Save changes" holds image in state, not auto-write** *(Kurt, 2026-02-15)* —
  today the editor's Save writes an `_edit_*.jpg` to source or destination.
  New behavior: Save keeps the edited version as an in-memory "working
  image" so the user can drag folder/filename tags onto it, apply further
  edits, or run the Aspect Ratio buttons — then finally click Store to
  write with the templated path/filename. Preserves the tagging workflow
  the way the rest of the app already does.
- **P1 · Aspect Ratio buttons hold image in state too** *(Kurt, 2026-02-15)* —
  same treatment as the editor Save. Today the 4×6/5×7/8×10/etc. buttons
  immediately write a resized file to the destination `/Unsorted` folder,
  losing the ability to add tags first. New behavior: hold the resized
  bitmap in state as the working image, allow further tagging/editing,
  then Store on user command.
- **P1 · Preserve tags across editor round-trip** *(Kurt, 2026-02-15)* —
  when the user opens the editor with folder/filename tags already dragged
  onto the image, those tags should survive the edit and be attached to
  the newly-saved edited image (or preserved on the original if the user
  discarded). Currently tags are cleared/dropped in the edit process.
- **P1 · Main preview zoom + pan** *(Kurt, 2026-02-15, late-night)* —
  add Lightroom-style Loupe behavior to the main viewer window (NOT just
  the editor):
  - **Mouse wheel** on the preview zooms in/out toward the cursor.
  - **Middle-click + drag** OR **space+drag** pans when zoomed in.
  - **`+` / `-` keyboard** and small on-screen buttons for zoom in / out
    when no mouse wheel is available (laptop trackpad users).
  - **`0`** or a "Fit" button resets to fit-to-window.
  - Zoom level shown as a tiny badge (e.g. `1.4×`) that fades after 1s.
  - Preserves current image between zooms (no re-decode), and resets to
    Fit when navigating to a new image in the filmstrip.
  Complements the existing editor zoom without adding a modal step, so
  Kurt can quickly check focus on a filmstrip pick before deciding to Store.
- **P2 · Tag Bar drag-to-reorder** *(Kurt, 2026-02-15)* — complementary to
  the shipped v1.1.5 A→Z sort toggle. Let the user grab a tag chip and
  drag it left/right within the bar to set a custom order. Needs a small
  grip handle (or long-press) so it doesn't conflict with the existing
  drag-onto-photo behavior.
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

### Waiting on tester feedback
Kurt is going to hand v1.1.0 to fellow photographers and expects "enhancements, not bugs". Any bug reports that come back should be triaged against the current v1.1.0 build; enhancement requests go into the on-deck list above.

---

### v2 Ideas Bin (post-v1.2, longer-term)

## 🎯 v2.0 Flagship Feature — Face Recognition AI Sort *(Kurt, 2026-02-17)*

**Locked in as the top v2.0 priority.** This is the killer feature that
turns the app from a $30 culling tool into a $100+ workflow accelerator.
Justifies a paid v2 upgrade / PRO tier separate from v1.x lifetime buyers.

### Tech stack
- **`face-api.js`** (TensorFlow.js under the hood) — mature, offline, runs
  on CPU, MIT-licensed. Ships with pre-trained models bundled in the
  installer (~15 MB adds to installer size; ~75 MB → ~90 MB).
- No cloud, no internet ever needed for detection or recognition.
- Descriptors are 128-dim Float32Array (~512 bytes/face). 100 known
  people = ~50 KB local storage. IndexedDB persists everything.

### User experience Kurt described
1. User loads a folder → filmstrip populates as usual
2. Background job progressively detects faces on each image (200-500ms/img)
3. Halo circle overlaid on each face in the viewer (transforms with the
   existing ZoomablePreview zoom/pan matrix)
4. Known face → **name tag** floats next to the halo automatically
5. Unknown face → **text-fill input** floats next to the halo — user
   types a name, hits Enter → new Person entry saved
6. Once named, that person is auto-matched on every future image scan
7. **Search by person** — filter filmstrip to only images containing X
   (or X+Y, or X|Y)
8. **Auto-generated "People" tag pack** — every named person becomes a
   draggable chip with their face thumbnail as the icon; works as a
   normal filename tag pack

### Data model additions
```
people: [
  { id, name, descriptors: [Float32Array], thumbUrl?, notes?, seenIn: [imagePaths] }
]
faceIndex: {
  [absoluteImagePath]: [
    { box: {x,y,w,h}, descriptorHash, personId?, confidence? }, ...
  ]
}
```

### Phased build plan (10-15 focused workdays total)
- **Phase 1** (2-3d) — Detection + halos + naming UI + IndexedDB persistence
- **Phase 2** (2-3d) — Recognition + auto-tagging + confidence indicators
- **Phase 3** (1-2d) — Search-by-person filter for filmstrip
- **Phase 4** (1d)   — Auto-generated People tag pack
- **Phase 5** (1-2d) — People manager panel (rename, merge, delete, count)
- **Phase 6** (2-3d) — Polish, performance, edge cases (sunglasses, side
  profiles, group photos, low-power hardware toggle)

### Known constraints / decisions to make
- **RAW files can't be scanned** without conversion → JPEG/PNG/HEIC/WebP
  only in v2.0. Add "convert on-the-fly for face scan" as a v2.1 nice-to-have.
- **False positives** — always require confirm on tentative matches
  (confidence < 0.8). Show percentage.
- **Privacy note** — small mention added to Trial pitch + About page
  ("faces detected locally, never leave your PC")
- **Legal jurisdictions** — some places require face-recog disclosure
  even for personal photos. Keep the "everything local" language front
  and center.
- **Performance toggle** — Settings gains "Face detection: Off / Idle
  only / Always" so old hardware users can opt out.

### Sales / pricing plan
- v1.x lifetime updates stay honored for existing buyers (as promised on Gumroad)
- v2.0 launches as either:
  - **Paid upgrade** (~$XX-$XX above v1.x price, with founder discount for early v1 buyers), OR
  - **PRO tier** ($$$/yr subscription for v2+ features, v1.x stays perpetual)
- **Waitlist strategy** — announce "v2 coming: cull by person, 100% offline" on the Gumroad page NOW to build anticipation while v1.x sales continue

### Stepping stones from v1.x → v2.0
- **v1.2.5 target: manual People tag pack** — no AI, just a hand-typed
  list of names that becomes a special tag pack with the same
  drag-onto-photo ergonomics. Zero risk. When v2.0 face-detection
  launches, the same "People" pack auto-populates with detected faces —
  no lost user data.

---

**Kurt's v2 additions, captured 2026-02-15 while chatting between sessions:**

#### 🖋️ EXIF Write-Back with full EXIF Editor window *(Kurt, 2026-02-15, late-night)*
- **Bundle Phil Harvey's ExifTool.exe** (~10MB) inside the Electron shell so
  Location, Date, Camera, and any custom field values get written directly
  into the file's real EXIF/IPTC/XMP blocks. Windows Explorer → Properties →
  Details, Lightroom, Bridge — every tool will see the values.
- **Full EXIF Edit window** that mirrors the Windows "Properties → Details"
  tab layout: every field grouped by section (Description, Origin, Image,
  Camera, GPS, Advanced), edit-in-place, "Reset field", "Reset all" buttons.
- **RAW support is required, not optional** — CR2/NEF/ARW/DNG all must work,
  because working photographers shoot RAW. This is what makes the app
  competitive vs. the free Windows built-in tools and cheaper JPEG-only
  alternatives.
- Settings toggle: "Write EXIF on Store" (opt-in, so paranoid users can
  audit before enabling). Pairs perfectly with the Default EXIF Location
  setting in v1.2.

#### 📁 Native RAW file support in filmstrip + viewer *(Kurt, 2026-02-15)*
- Today the app only decodes browser-supported formats (JPEG/PNG/WEBP).
- v2 must decode RAW files (CR2, NEF, ARW, DNG, RAF, ORF at minimum) via a
  WASM decoder (`libraw-wasm` or similar) OR by shelling out to ExifTool /
  dcraw in the Electron shell for previews.
- Should show the embedded JPEG preview instantly (all RAW files carry a
  full-size JPEG) for filmstrip + viewer performance, then do the slow
  full-RAW decode only on demand for the editor.

#### 🎨 Drag-to-swap icon on a tag chip *(Kurt, 2026-02-16, late-night)*
- Today: to fix a wrong icon on a tag, you have to delete the tag and
  re-create it with the right icon. That loses the tag's ID and any
  drag-drop associations.
- v2 UX: while inside Tag Manager, allow dragging a Lucide icon (from the
  built-in icon grid, or a custom image from the Custom Image tab) onto
  an existing tag chip. The chip picks up the new icon; label + ID stay
  intact. Works for both the pack's Folder/Filename lists AND for
  sub-folder items. Same behavior on IconPalette bars in the main window
  would be excellent but optional.

#### 🔒 Lock zoom across filmstrip navigation *(Kurt, 2026-02-16, late-night)*
- Today: `ZoomablePreview.jsx` auto-resets to Fit whenever the filmstrip
  advances (`resetKey` = current image path). Great default, but breaks
  the workflow of pixel-peeping the same corner across a burst of frames.
- v2 UX: add a small padlock toggle beside the on-screen Fit button
  (bottom-right of the viewer). Off by default so nothing changes. When
  ON, the current `scale` + `tx` + `ty` values persist across filmstrip
  navigation — you can compare the same detail area frame-to-frame.
  Auto-unlock on any manual Fit click. Consider a subtle status hint in
  the zoom badge ("1.4× locked") to make the state visible.

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


### Iteration 28 — v1.4.0 · Unlimited Nested Sub-folders + Custom Templates + First-run Samples (2026-02-19)

Kurt's testing team delivered three requirements. Batched cleanly in one shot; testing_agent verified 7/7 flows passed with zero UI bugs or console errors.

**1. Unlimited Nested Sub-folders (recursive tree)**
- Data model: each `subfolder` gets an optional `subfolders: []`, unlimited depth. No migration — existing flat data works untouched.
- Main-window UI: replaced single `activeSubfolderId` with `activeSubfolderPath: string[]`. New `SubfolderCascade` component renders one `SubfolderBar` per depth level, appearing only when the current-active chip at that depth has children. Gated behind `settings.enableNestedSubfolders` (default ON).
- Filename inheritance: `deepestWithFilenames(chain)` — if the picked leaf sub-folder has no filename items, the app walks back up to the nearest ancestor that has them (so "container" sub-folders inherit their parent's tag list).
- Tag Manager UI: new `NestedSubfolderEditor` mounts inside each expanded sub-folder row. Supports add/rename/delete + add/delete filename tags per nested child, recursively. Uses `React.createElement` for the self-recursion to sidestep a babel-loader edge case.
- Setting toggle: SettingsModal → "Nested Sub-Folders" section with a checkbox (data-testid `nested-subfolders-toggle`).

**2. Custom Filename Templates (UX picks a2 + b1 + c1)**
- `validateTemplate(template)` in `lib/template.js` scans for unknown `{tokens}`; returns `{ok:false, invalid, suggestions}` with Levenshtein-based "did you mean" hints (distance ≤ 3).
- `autoNameForTemplate(template)` derives a friendly name from the user's own template string (first non-token word, Title-Case, 24 chars max). Fallback = "Custom".
- Settings modal: new "Save Custom" button (gear-style) inline in the Filename Template section. Disabled while validation fails or the current string equals a saved template. On save, appends to `settings.customFilenameTemplates` (LRU cap 5, newest bumps oldest).
- Saved templates render as a chip strip "My Templates (n/5)" — click chip to apply, × to delete.
- Invalid tokens surface a red banner with clickable suggestion buttons that patch the string in place.

**3. First-run Sample Folder (Electron)**
- Bundled six sample photos in `electron-shell/samples/` (added to `extraResources` in `package.json` so they ship with the NSIS installer).
- `main.js` copies them into `%USERPROFILE%\Documents\Pro Photo Sorter\Samples\` on first launch (sentinel file `.samples-copied` prevents re-copies).
- New IPC channels: `pps:samples-info`, `pps:samples-restore`, `pps:samples-open-folder` — exposed to renderer via `electronBridge.js` (`samplesInfo`, `samplesRestore`, `samplesOpenFolder`).
- Help panel (LicenseSection.jsx) gains a "Sample Photos" pane with **Open Samples folder** and **Restore bundled samples** buttons, symmetric with the existing Safety-Backup pane.

**Version bump**
- `frontend/package.json`, `electron-shell/package.json`, and `src/buildInfo.json` all bumped to **1.4.0** (build date 2026-02-19).

**Files touched**
- New: `frontend/src/components/SubfolderCascade.jsx`, `frontend/src/components/NestedSubfolderEditor.jsx`, `frontend/tests/subfolderCascade.test.mjs`, `frontend/tests/customFilenameTemplate.test.mjs`, `electron-shell/samples/{01..06}_sample.jpg`.
- Updated: `frontend/src/App.js` (activeSubfolderPath state, composeDestFolderParts subChain signature), `frontend/src/lib/storage.js` (three new settings fields), `frontend/src/lib/template.js` (validator + autoName), `frontend/src/lib/electronBridge.js` (samples helpers), `frontend/src/components/SubfolderBar.jsx` (nested-aware props), `frontend/src/components/CategoryManager.jsx` (recursive editor mount + replaceSubfolderNode helper), `frontend/src/components/SettingsModal.jsx` (Custom template save UI + Nested Sub-Folders toggle), `frontend/src/components/LicenseSection.jsx` (Sample Photos pane), `frontend/tests/folderPath.test.mjs` (updated for v1.4.0 chain signature), `electron-shell/main.js` (first-run sample copy + IPC handlers), `electron-shell/preload.js` (exposed samples IPC), `electron-shell/package.json` (extraResources + v1.4.0).

**Test posture**
- All prior Node.js `.mjs` unit suites still green (10/10 files).
- 3 new/updated regression tests: 11 folderPath + 6 subfolderCascade + 14 customFilenameTemplate = **31 passing assertions** covering path composition (with & without nesting), chain resolution, fallback logic, template validation, Levenshtein suggestions, and LRU semantics.
- testing_agent Playwright run against the preview URL: **7/7 flows passed** — no ui_bugs, no integration_issues, no console errors.

**Still pending from Kurt**
- Paragraph 4 of the v1.4.0 requirements (not yet received; awaiting on ship-return).
- Optional: proper split of this PRD into PRD.md + CHANGELOG.md + ROADMAP.md (file is now ~1200 lines).

**Deferred to v1.4.x / v2.0**
- Multi-Source Roots (P1)
- XMP Sidecars (P1)
- Editor Save / Aspect Ratio + tag preservation across editor round-trip (P1)
- Face Recognition AI Sort (P0 for v2)
- ExifTool.exe EXIF write-back + full EXIF Editor window
- Native RAW support in filmstrip + viewer (CR2/NEF/ARW/DNG)
- Icon Holders popover on main window
- `.pps-iconpack.json` pack signing
- In-app contact-sheet fancy preview with mini-filmstrip
- Hard-coded trial limit


### Iteration 29 — v1.4.1 · Connection Visibility + Tag→Nest Conversion (2026-02-19)

Kurt discovered that when he wanted `Sports › Baseball (AL) › Boston Red Sox › {player}.jpg`, his existing team names were stored as *filename tags* under Baseball (AL), not as sub-folders — so picking a team didn't drill deeper. Also, nested sub-folder rows didn't visibly show their parent connection.

**Fix batch (UX picks: 1-ii `Baseball (AL) →`, 2-i leave empty after bulk):**

- 🧭 **Connection Visibility** in Tag Manager:
  - Breadcrumb strip above every "Nested sub-folders" section: `Nested under: Sports › Baseball (AL) › …` (last segment bold, earth-tone). Auto-updates at every recursion depth via `ancestorPath` prop.
  - Left tree-line rail with `CornerDownRight` glyphs on every nested row — the tree literally looks like a tree.
- 🧭 **Connection Visibility** on main window:
  - `SubfolderBar` label at depth > 0 now reads `${parentName} →` (arrow-style, e.g. `Baseball (AL) →`) instead of generic `Level 2`.
  - New live breadcrumb pill `subfolder-breadcrumb` above the cascade: `Path: Sports › Baseball (AL) › Boston Red Sox`. Renders only when the user has picked at least one sub-folder.
- 🔁 **Tag → Nested Sub-folder Conversion** — three flavors from one shared seed helper (`tagToNestedSeed`):
  - **Per-tag context menu** in main SubfolderSection: right-click any filename chip → "→ Nest this tag (make it a sub-folder)". Confirms, then moves it into a fresh nested row with same name/icon.
  - **Per-tag inline arrow** in NestedSubfolderEditor: every filename tag chip inside a nested child shows a small `→` button that promotes it into a nested grandchild.
  - **Bulk "Convert all → nested"** in two places (parity):
    1. In the Tag Manager's `Filename tags for …` header (data-testid `subfolder-bulk-nest-<sfid>`).
    2. In the green-tinted callout at the top of the nested editor (data-testid `nested-bulk-convert-<node.id>`).
  - Duplicates skipped by lower-case name match; existing nested children preserved. Custom-image icon data carried through unchanged.

**Version bump**
- All three version stamps → **1.4.1** (build date 2026-02-19).

**Files touched**
- Rewritten: `frontend/src/components/NestedSubfolderEditor.jsx` (breadcrumb + tree-line + promote logic).
- Updated: `frontend/src/components/SubfolderBar.jsx` (arrow-style label), `frontend/src/components/SubfolderCascade.jsx` (breadcrumb pill), `frontend/src/components/CategoryManager.jsx` (bulk header button + right-click Nest menu item), `frontend/src/buildInfo.json`, `frontend/package.json`, `electron-shell/package.json`.
- New: `frontend/tests/tagPromote.test.mjs` (6 assertions covering single/bulk promotion, icon preservation, duplicate skip, empty no-op).

**Test posture**
- All 13 Node `.mjs` regression suites green (43 assertions total from v1.4.0/v1.4.1).
- testing_agent Playwright pass: **100% — 9/9 verified features**, zero ui_bugs, zero regressions from v1.4.0.


### Iteration 30 — v1.4.2 · Multi-Source Roots + Onboarding Coach-Mark (2026-02-19)

Kurt's UX picks: 1-c collapsible accordions in the left rail, 2-c split-filmstrip with two side-by-side strips, 3-c first-launch coach-mark plus a "Show me again" reset in the Help panel. Paragraph 4 archived (Kurt said it was already covered).

**Multi-Source Roots**
- Added `secondary` state slot in `App.js` holding an independent `{root, rootName, treeKey, currentFolder, currentPath, images, loadingImages, expanded}`. Primary state is untouched.
- Left rail split into two accordions: SOURCE A · PRIMARY (top) with existing tree + Open/HardDrive/Recent buttons; SOURCE B · SECONDARY (bottom) with "Add second" button and independent tree.
- New actions in App.js: `pickSecondarySource`, `closeSecondarySource`, `onSelectSecondarySourceFolder`, `swapPrimaryAndSecondary(targetIdx)`.
- Split filmstrip: bottom row splits 50/50 when secondary is loaded. New `SecondaryStrip` component renders the secondary photos with a "Swap" button on top and per-thumb click swap.
- **Atomic swap architecture**: clicking a thumb in the secondary strip fires `swapPrimaryAndSecondary(i)` which atomically exchanges every primary source-state field with the secondary snapshot. This keeps every existing store/delete/tag/EXIF/ratings code path (130+ references) working against the "primary" without any refactor.

**Onboarding Coach-Mark**
- `useEffect` in App.js (~line 592) fires ONCE per install (localStorage sentinel `pps.coachmark.samples.v1`). Gated by `isElectron()` + `samplesInfo().exists`. Uses sonner toast with 20s duration, `Open Samples` action button, `Dismiss` cancel button; either interaction persists the sentinel.
- LicenseSection.jsx: new "Show me again next launch" button in both the licensed samples pane AND (v1.4.2 fix) a new trial-mode samples pane so trial users can access it too. Clicking clears the sentinel and fires a confirmation toast.

**Testing bugs found + fixed same pass**
- testing_agent flagged nested-`<button>` DOM in the accordion headers → refactored outer element to `<div role="button" tabIndex={0}>` with keyboard handler. Verified click on chevron/label toggles cleanly (aria-expanded flips) and Open/Add-second buttons no longer accidentally trigger the accordion.
- Samples pane was licensed-only → added trial-mode pane (`license-samples-panel-trial`) with the same three buttons so trial users can restore samples and reset the coach-mark.

**Version bump**
- All three version stamps → **1.4.2** (build date 2026-02-19).

**Files touched**
- New: `frontend/src/components/SecondaryStrip.jsx`.
- Updated: `frontend/src/App.js` (secondary state + swap + split rail + split strip + coach-mark effect + fixed nested-button DOM), `frontend/src/components/LicenseSection.jsx` (coach-mark reset button in both licensed and trial branches), `frontend/src/buildInfo.json`, `frontend/package.json`, `electron-shell/package.json`.

**Test posture**
- All 13 Node `.mjs` regression suites green (43 unit assertions).
- testing_agent Playwright pass: **95% initial → 100% after fixes** — nested-button DOM issue fixed and re-verified manually via screenshot tool (aria-expanded flips cleanly `true → false → true` on chevron/label clicks; Open button coordinates confirm proper stopPropagation isolation).


### Iteration 35 — v1.4.5d · Chip Trash + Multi-select (bottom pane) (2026-09-26)

**BIG additions Kurt asked for after v1.4.5c smoke-test:**

**Nested filename-tag drag between siblings (Sports → Baltimore Orioles → other-team flow):**
- Each nested filename-tag chip inside `NestedSubfolderEditor` is now `draggable` with an `application/x-pps-nested-tag` payload carrying `{ fromChildId, tagId }`.
- Every nested child row body is a drop target — accepts the payload (collapsed or expanded), shows a primary-earth ring/tint hover, drops trigger `moveTagBetweenChildren(fromChildId, toChildId, tagId, mode)`.
- Ctrl-drag copies; plain drag moves. Duplicate-name in target is skipped with a friendly toast so nothing is silently overwritten.
- Toast: `Moved "Rutschman" to "Boston Red Sox"`.

**Chip Trash / Undo bin (`frontend/src/lib/chipTrash.js`, `TrashPanel` in `CategoryManager`):**
- Every filename-tag delete anywhere in the Tag Manager (bottom Filename Tags pane, inline chevron-expanded chip remove, nested chip remove, plus bulk-delete via multi-select) now pushes the chip into a persistent trash queue in `localStorage["pps.chip-trash"]`.
- Cap 200 items with FIFO evict — never leaks storage.
- New header button "Trash · N" opens a full panel: checkbox list of deleted chips with breadcrumbs ("from Wildlife › Mammals"), relative timestamps ("just now" / "2m ago" / "3d ago"), Select all / Clear / Restore selected / Empty trash, plus per-row Restore.
- Restore walks the current categories tree — if the deepest owner still exists it drops the chip back in place with a collision-safe rename ("`Lynx (restored)`"); if any hop is missing it stays in trash with a helpful error toast.
- `pps:trash-updated` custom event keeps the header count and panel in sync in real time.

**Multi-select on the bottom "Filename Tags" pane (`SubfolderFilenameEditor`):**
- New "Select" toggle in the pane header. Flipping ON shows a checkbox on every chip; ticks accumulate into a `Set<itemId>`.
- Clicking anywhere on a chip in select mode toggles the tick (big-target, injury-friendly).
- Floating action bar appears when ≥1 chip is ticked: `[N tags selected] [Select all] [Clear] [Convert → nested] [Delete]`.
- Bulk **Delete** routes through `removeSubfolderItemsBulk` (single atomic state update + push-many-to-trash) so undo is fully wired.
- Bulk **Convert → nested** routes through `convertSubfolderItemsToNestedBulk` (single atomic patch that promotes ticked chips to sibling nested sub-folders; collision-skipped chips stay behind visible so Kurt can decide).
- Drag any ticked chip → `application/x-pps-sfitem` payload carries `itemIds: []` (the whole selection); receiver can move them all together (existing single-drop path unaffected).
- Selection auto-prunes stale ids when the underlying items change (external delete, folder swap).

**Version bump**
- `frontend/src/buildInfo.json` → **1.4.5d** (build date 2026-09-26). Release band still v1.4.5.

**Files touched**
- New: `frontend/src/lib/chipTrash.js` (pushToTrash / pushManyToTrash / getTrash / restoreChip / locateOwnerNode / emptyTrash / cap constants).
- Updated: `frontend/src/components/CategoryManager.jsx` (Trash button in header, `TrashPanel` component, bulk helpers `removeSubfolderItemsBulk` / `convertSubfolderItemsToNestedBulk`, trash wiring on every delete path, `SubfolderFilenameEditor` overhaul with select mode + bulk bar + multi-drag).
- Updated: `frontend/src/components/NestedSubfolderEditor.jsx` (per-chip drag + row drop target for cross-sibling move, `moveTagBetweenChildren` helper, `trashContext` propagation on recursion, `removeTagFromChild` wired to trash + new bulk variant).
- Updated: `frontend/src/buildInfo.json`.

**Test posture**
- Live Playwright smoke: multi-select mode → tick 3 chips → bulk-bar shows "3 tags selected" → Delete → Trash counter goes to 3 → open Trash panel shows 3 rows with correct breadcrumbs → Select all + Restore → chips return to Mammals, Trash counter back to 0. Cross-sibling nested drag confirmed via dispatchEvent probe in v1.4.5c.

**Still deferred to v1.4.5e (next iteration, Kurt confirmed A + iii + trash):**
- Multi-select mode in the inline chevron-expanded chip area (`SubfolderItemChip` inside each top-level sub-folder row).
- Multi-select mode inside `NestedSubfolderEditor` (nested filename-tag chips per child, e.g. inside Baltimore Orioles).
- Docs refresh remains queued.


### Iteration 36 — v1.4.5e · Multi-select everywhere + bottom pane removed (2026-09-26)

Kurt smoke-tested v1.4.5d and reported (a) he was clicking tags in the chevron-expanded area, not the bottom pane where multi-select lived, and (b) the bottom pane duplicates the chevron-expand area and should go. Answer: kill the bottom pane, put multi-select + click-highlight everywhere, keep the [Select] toggle visible.

**Removed** — `SubfolderFilenameEditor` and its mount point in `CategoryManager`. The middle column's tag work is now 100% inside each sub-folder row's chevron-expanded area — one canonical workspace, no "wait, which list am I editing?" confusion.

**Multi-select in the chevron-expanded chip area (`SubfolderSection` + `SubfolderItemChip`):**
- Per-sub-folder [Select]/[Done] toggle button in the "Filename tags for X" header. Flipping ON reveals a checkbox on every chip; per-sub-folder selection Set so entering/leaving select mode on one sub-folder doesn't disturb another.
- Chip visual states: **ticked** (primary-earth ring + fill), **highlighted** (single-click feedback outside select mode, lighter ring), **drop-target** (icon-swap hover), **default**. `data-ticked` / `data-highlighted` attributes for scripting.
- Bulk-action bar renders inline below the chip grid: `[N tags selected] [Select all] [Clear] [Convert] [Delete]`. Delete pushes each chip to Chip Trash (fully undoable). Convert atomically promotes each selected chip to a nested sub-folder, skipping name collisions with a description toast.
- Multi-drag: dragging any ticked chip attaches `itemIds: []` to the existing `application/x-pps-sfitem` payload so the whole selection travels together (single-drop path unchanged).
- Right-click / X remove / arrow reorder hide in select mode so the UI stays uncluttered.

**Multi-select in the nested chip area (`NestedSubfolderEditor`):**
- Per-nested-child state (Sets keyed by child id) mirrors the same UX at the deeper level — Kurt's Sports → Baseball(AL) → Baltimore Orioles → players view now has [Select], checkboxes, single-click highlight, and a bulk-action bar with the same Delete / Convert / Clear / Select all buttons.
- Bulk delete goes through `removeTagsFromChildBulk` (atomic + trash-aware).
- Bulk convert goes through new `convertTagsFromChildBulk` (atomic multi-promote to grandchild sub-folders, collision-skipped).
- Multi-drag on nested chips extends the `application/x-pps-nested-tag` payload with `tagIds: []` for the whole selection.

**Kurt's requested single-click highlight** (option "b" from his choice):
- Both chevron-expanded chips AND nested chips now respond to a plain click with a single-select ring so Kurt sees "yes, something happened" — even when select mode is OFF. Click the same chip again to un-highlight. Doesn't touch the underlying tag; purely visual feedback.

**Trash bin coverage:**
- All new bulk-delete paths route through `pushManyToTrash` so the Chip Trash header count updates in real time and every chip is recoverable, including from the deepest nested Orioles/Red Sox depth.

**Version bump**
- `frontend/src/buildInfo.json` → **1.4.5e** (build date 2026-09-26).

**Files touched**
- Updated: `frontend/src/components/CategoryManager.jsx` (removed `SubfolderFilenameEditor` def + mount, added multi-select state to `SubfolderSection`, upgraded `SubfolderItemChip` with select/highlight/multi-drag props, wired [Select] toggle + bulk bar inline), `frontend/src/components/NestedSubfolderEditor.jsx` (per-child multi-select state, upgraded chip render, inline bulk bar, `convertTagsFromChildBulk` helper), `frontend/src/buildInfo.json`.

**Test posture**
- Live Playwright smoke: middle column no longer shows bottom pane (`filename-editor-pane` count = 0); single-click on a chevron chip flips `data-highlighted="true"`; [Select] on Mammals reveals 4 checkboxes; ticking 3 → bulk bar reads "3 tags selected"; Delete → Trash counter jumps to 3.


### Iteration 37 — v1.4.5f · Docs refresh + Compare-view nav buttons (2026-09-26)

**Compare-view nav buttons fix:** Left/Right filmstrip arrows were only rendered in the single-view branch of the App.js viewer ternary. Added a matching pair (`nav-prev-compare` / `nav-next-compare`) inside the `compareMode > 1` branch — they call the same `goPrev` / `goNext` handlers, respect the disabled states at either end, and sit at the same 3-o'clock / 9-o'clock overlay position.

**Docs refresh — retail thumb-drive ready:**
- `/app/ReadMe.txt` fully rewritten for v1.4.5 with "What's New in 1.4" covering 10 flagship features, Quick Install, First Launch, Tag Manager cheat-sheet, Keyboard Shortcuts, Trial vs Full, Troubleshooting.
- `/app/QUICK_START.md` fully rewritten. Single-page: Install, First Launch, Top 8 gestures table, Multi-select workflow, Compare view, License.
- `/app/USER_GUIDE.md` appended a comprehensive "New in v1.4" chapter covering every v1.4.x feature.
- `/app/dist-docs/Quick Start.pdf` (77 KB) and `/app/dist-docs/User Guide.pdf` (322 KB) regenerated via `scripts/build-docs-pdf.js`.


### Iteration 38 — v1.4.5g/h · Compare-view polish + Resize orientation toggle (2026-09-26)

**v1.4.5g — Compare-view visual + click reliability fixes** (post-user smoke-test of v1.4.5f):
- **Dark filename pill fix**: Kurt reported the pill at the bottom of each pane in ×2/×3 was hard to read. Root cause was `color-mix(surface 88%, transparent)` resolving to a muddy dark tone on his light theme. Switched to solid `var(--surface)` background with a primary-earth border — matches the ×1 pill treatment, always legible.
- **Click-to-activate reliability**: added `onPointerDown` fallback next to `onClick` on the Pane wrapper. Some Electron builds were swallowing the outer `onClick` when the pointer landed directly on the inner ZoomablePreview image; belt-and-suspenders now fires on either event.
- **ACTIVE ring beefed up**: 4px earth-brown ring + 2px offset + soft glow shadow so the "which pane am I about to act on" indicator pops on any image color.
- **ACTIVE pill upgraded**: rounded-full pill with a surface-colored border and uppercase tracking for clearer visual weight against the pane image.
- **Compare-mode hint reworked**: bottom-center pill now reads "Click any image → makes it ACTIVE · Tags & S store apply to the active pane" so the batch/store affordance is discoverable without a doc.

**v1.4.5h — Resize preview orientation toggle** (Kurt's rediscovered wishlist item):
- `PRINT_SIZES` and `targetDimsFor()` already carried orientation as a runtime concept; extended the API with an explicit `orientation` param that overrides source-aspect auto-detection.
- `ResizeCropModal.jsx` now shows a three-way toggle in the header: **[Auto] [Tall] [Wide]** (with lucide `Wand2`, `RectangleVertical`, `RectangleHorizontal` icons). Auto continues to match source shape; Tall forces portrait; Wide forces landscape.
- Preview canvas re-runs the crop overlay against the chosen orientation so Kurt sees exactly the crop rectangle that will be exported.
- Confirm passes `orientation` through to `cropAndResize`; on disk the filename gets `_wide` or `_tall` suffix (Auto stays uns-suffixed for backwards compat), so exporting a photo as both portrait 4×6 AND landscape 4×6 doesn't collide.
- Store button label updates dynamically: "Store 4×6 wide" / "Store 4×6 tall" so it's obvious what's about to happen.
- Confirmed dimensions readout in the modal now includes the orientation label — e.g. `→ 1800 × 1200 px (300 DPI · landscape)`.

**Version bump**
- `frontend/src/buildInfo.json` → **1.4.5h** (build date 2026-09-26).

**Files touched**
- Updated: `frontend/src/components/ComparisonView.jsx` (pointerDown fallback, ring/shadow, pill styling, filename pill solid bg), `frontend/src/App.js` (compare-mode hint rewrite, confirmResizeStore accepts orientation, filename suffix carries orientation tag), `frontend/src/components/ResizeCropModal.jsx` (orientation state, three-way toggle UI, dependency update on the draw effect), `frontend/src/lib/resize.js` (`orientation` param on targetDimsFor + cropAndResize), `frontend/src/buildInfo.json`.

**Test posture**
- Live preview build clean (webpack: 1 warning, existing).
- Kurt to verify on ship: (a) ×2/×3 pill legibility, (b) click a pane → ACTIVE moves instantly + no filmstrip shift, (c) nav arrows in compare mode, (d) resize-crop modal Auto/Tall/Wide toggle updates the overlay in real time and stamps `_wide` / `_tall` into the exported filename.

**Confirmed not-doing:**
- "Store all in view" batch button — Kurt picked **(a) skip** after the plain-English comparison to the existing Batch feature. Existing Batch covers same-destination bulk; solo `S` per pane covers per-destination without a new button.


**Compare-view nav buttons fix (Kurt reported after v1.4.5e):**
- The Left/Right filmstrip navigation buttons were only rendered inside the single-view (`compareMode === 1`) branch of the App.js viewer ternary and therefore disappeared in ×2 / ×3.
- Added a matching pair (`nav-prev-compare` / `nav-next-compare`) inside the compareMode > 1 branch. They call the same `goPrev` / `goNext` handlers (advancing the active pane's `selectedIdx`), respect the disabled states at either end of the filmstrip, and sit at the same 3-o'clock / 9-o'clock overlay position.

**Docs refresh — the retail thumb-drive gate:**
- `/app/ReadMe.txt` fully rewritten for v1.4.5. Sections: What's New in 1.4 (10 flagship features), Quick Install, First Launch, Tag Manager controls cheat-sheet, Keyboard Shortcuts, Trial vs Full License, Troubleshooting, Support.
- `/app/QUICK_START.md` fully rewritten. Single-page cheat-sheet: Install → First Launch → Top 8 gestures table → Multi-select workflow → Compare view → License. Optimized for print + folded thumb-drive insert.
- `/app/USER_GUIDE.md` appended a comprehensive "New in v1.4 (September 2026)" chapter covering: Splash Screen, First-Run Samples, Multi-Source Roots, Unlimited Nested Sub-Folders, Custom Filename Templates, Smart Paste, Cross-Folder Tag Drag, Multi-Select + Bulk Actions, Chip Trash, Compare View per-pane zoom, Editor Auto-Enhance/Crop-in-Place/Reset-to-Last, Thumbnail Loading + Cache Stats, complete Keyboard Shortcut table.
- Regenerated `/app/dist-docs/Quick Start.pdf` (77 KB) and `/app/dist-docs/User Guide.pdf` (322 KB) via the existing `/app/scripts/build-docs-pdf.js` pipeline (puppeteer-core + Chromium). Both bundle-ready for the next thumb-drive shipment.

**Version bump**
- `frontend/src/buildInfo.json` → **1.4.5f** (build date 2026-09-26).

**Files touched**
- Updated: `frontend/src/App.js` (compare-mode nav buttons), `frontend/src/buildInfo.json`, `ReadMe.txt`, `QUICK_START.md`, `USER_GUIDE.md`.
- Regenerated: `dist-docs/Quick Start.pdf`, `dist-docs/User Guide.pdf`.

**Deferred to v1.4.6:**
- Editor Round-Trip (preserve tags through crop/rotate).
- XMP Sidecars (write stars + tags for Lightroom sync).
- Native RAW Previews (Kurt confirmed dcraw.exe bundle approach — path 4b).


### Backlog — Documentation Refresh (queued for next session, top priority)

Kurt requested (2026-02-19 end of day): Update the thumb-drive retail bundle to reflect v1.4.0 → v1.4.2 changes before the next release.

**Files to refresh:**
- `/app/ReadMe.txt` — Add sections on Multi-Source Roots, nested sub-folders, Custom Filename Templates, First-run Samples, Coach-Mark.
- `/app/dist-docs/Quick Start.pdf` — Regenerate via `/app/scripts/build-docs-pdf.js`. Add: "Add second source", "Convert filename tag → nested sub-folder", "Save Custom template".
- `/app/dist-docs/User Guide.pdf` — Full walkthrough for all v1.4.x features (nested trees, tag→nest conversion, split filmstrip, atomic swap, coach-mark).

**Do BEFORE** any coding on Editor Round-trip / RAW / Paste Roster / XMP Sidecars so retail buyers on the next thumb-drive shipment aren't handed outdated docs.


### Iteration 33 — v1.4.5 · Tag Manager smart-paste + reorder + safety cap (2026-09-26)

**BIG BUG fix (Issue #11):** "New nested sub-folder" text box and "New sub-folder name" input didn't understand comma/newline/semicolon-separated lists — Kurt got either the last entry or the whole list as one row. Both inputs now smart-split into N sub-folders in a single atomic state update, with a compact `PasteRosterButton` popover alongside for full-roster pastes. Same treatment for the "New filename tag" input on the Filename Tags pane at the bottom of Tag Manager.

**Safety fix — huge-paste freeze/lockup:**
- New shared `guardLargePaste(labels, opts)` in `PasteRosterButton.jsx`:
  - `> 250` items → confirm dialog "Large pastes can briefly freeze PPS while it saves. Continue?"
  - `> 2000` items → hard cap with confirm to trim; toasts the drop count so Kurt sees what happened.
- New atomic bulk helpers: `addSubfolders(names[])`, `addSubfolderItemsBulk(sfId, labels[])`, `reorderSubfolderItems(sfId, from, to)`, `moveSubfolderItemWithin(sfId, itemId, dir)`, `convertSubfolderItemToNested(sfId, itemId)` in CategoryManager. Every paste path now commits in ONE `updateCurrentPack` call — fixes the previous per-label loop that dropped state updates under React batching and could freeze the UI on large lists.
- All paste inputs & popovers now accept **commas, semicolons, AND newlines** as separators.

**Filename Tags pane (Convert / Reorder regressions restored):**
- Drag handle (`GripVertical`) on every filename tag chip — drag any tag to reorder within its sub-folder.
- Up/Down arrow buttons on hover (injury-friendly alternative to drag).
- Per-tag **→ Nest** button on hover — promotes a single filename tag into a nested sub-folder under its owning sub-folder (previously only "Convert all → nested" existed).
- Live hint above the grid: "Drag any tag to reorder, or use the ▲ ▼ buttons. Click → Nest to promote a single tag into its own nested sub-folder."

**Nested Sub-Folder editor:**
- Active-parent visual: the currently-expanded nested row gets a `border-primary-earth` ring + light tint so it's obvious which parent your paste will land under.
- New `PasteRosterButton` alongside the "New nested sub-folder under X…" input for popover-driven bulk roster paste.

**Version bump**
- All three version stamps → **1.4.5** (build date 2026-09-26).

**Files touched**
- Updated: `frontend/src/components/PasteRosterButton.jsx` (semicolons + `guardLargePaste` + `SAFE_PASTE_WARN_AT/HARD_CAP` exports), `frontend/src/components/NestedSubfolderEditor.jsx` (smart-split `addChild`, guardLargePaste on bulk tag-add, active-parent ring, PasteRosterButton for child creation), `frontend/src/components/CategoryManager.jsx` (bulk helpers, reorder helper, convert-one helper, `SubfolderFilenameEditor` overhaul with drag+arrows+convert, sub-folder input paste-roster wiring), `frontend/tests/pasteRoster.test.mjs` (16 assertions — semicolons added), `frontend/src/buildInfo.json`, `frontend/package.json`, `electron-shell/package.json`.

**Test posture**
- All 14 Node `.mjs` regression suites green.
- Smoke test via Playwright screenshot tool: bulk-paste "Bear, Fox, Otter" into Mammals → 3 tags added atomically, toast fires, Convert/Up/Down buttons render on every chip (7/7/7 for the 7-tag Mammals list), Paste List popover discoverable at every level.

**Deferred to v1.4.6 (Kurt's explicit next-up request):**
- Multi-select mode for filename tags (checkbox toggle + batch "Move to sub-folder…" / "Convert selected → nested" / "Delete selected") — Kurt asked to smoke-test v1.4.5 before layering this in.
- Docs refresh (`ReadMe.txt`, `Quick Start.pdf`, `User Guide.pdf`) — still the top-priority pre-feature task per v1.4.2 backlog note.


### Iteration 34 — v1.4.5c · Post-smoke-test cleanups (2026-09-26)

Kurt smoke-tested v1.4.5 and reported three regressions/gaps. All fixed in v1.4.5c, still under the v1.4.5 release band.

**Item 3 fix — Compare View: click a pane to zoom, not to scroll the filmstrip**
- Every pane in `ComparisonView` now renders `ZoomablePreview` (previously only the active pane did — inactive panes were plain `<img>`), so each side-by-side image is independently zoomable with mouse wheel / +− controls at rest.
- `App.js` filmstrip auto-scroll `useEffect` now short-circuits when `compareMode > 1`, so clicking a pane in 2×/3× view no longer jerks the filmstrip out from under Kurt.

**Item 6 fix — Editor: crop Cancel button now also exits crop mode**
- The floating "Cancel" pill next to Apply crop now calls both `setCrop(null)` AND `setCropMode(false)`, matching Apply crop's behavior. Previously it discarded the rectangle but left the "Cropping — drag to draw or move" toggle lit.

**Item 11 fix — Tag Manager: cross-folder tag drag + click-to-highlight**
- Filename tag chips in the bottom "FILENAME TAGS for X" pane are now draggable with BOTH `application/x-pps-filename-reorder` (in-list reorder) AND `application/x-pps-sfitem` (cross-folder move) payloads. Whichever drop target hits wins.
- Sub-folder row headers now accept `application/x-pps-sfitem` drops even when collapsed (previously only the expanded body did) — this unblocks the "only one folder open at a time" workflow Kurt described. Ctrl-drag copies; plain drag moves.
- New row highlight state (`data-drop-active`) with primary-earth ring + tint when a tag is hovering the row header, so Kurt sees exactly where the drop will land.
- Filename tag chips now click-to-highlight (single-select, click again to unselect). Selected chip shows a primary-earth ring + tint. Foundation for v1.4.6 multi-select + batch actions.
- Bottom pane grid switched to `grid-cols-1 sm:grid-cols-2` and hover controls converted from `opacity-0` to `hidden group-hover:flex` so labels always take full width at rest and only reveal reorder/convert/remove buttons on hover — fixes cramped layout where labels were squeezed out by always-reserved icon space.
- Toast on drop: "Moved filename tag to '<sub>'" (or "Copied…" on Ctrl-drag) so Kurt sees the drop landed.

**Version bump**
- `frontend/src/buildInfo.json` → **1.4.5c** (build date 2026-09-26). `package.json` files stay at `1.4.5` since the release band is still v1.4.5.

**Files touched**
- `frontend/src/components/ComparisonView.jsx` (all panes zoomable), `frontend/src/App.js` (skip filmstrip auto-scroll in compare mode), `frontend/src/components/ImageEditor.jsx` (crop cancel exits crop mode), `frontend/src/components/CategoryManager.jsx` (row-header drop target, chip cross-folder drag payload, click-to-highlight state, layout de-cramping), `frontend/src/buildInfo.json`.

**Test posture**
- All 16 parseRoster regressions green (14 files total unchanged).
- Live smoke test via Playwright: cross-folder move Mammals → Birds via row-header drop fires the `Moved filename tag to "Birds"` toast; chip labels visible ("action", "feeding", "closeup"); click at label area toggles `data-selected="true"` and shows the ring.


### Iteration 35 — v1.4.5i · Compare Mode: "Active follows click, images stay put" (2026-02-13)

Kurt reported that in ×2 / ×3 compare view, clicking a non-active pane still slid the strip and loaded a new image from the filmstrip on the right. He wants clicks to only move the ACTIVE pill + blue frame — images should slide only under four specific triggers.

**Behavioral spec (Kurt's exact request):**
- Click a visible pane → ACTIVE pill + blue ring move to that pane. Zero image reshuffle.
- Images slide (window shifts) only when:
  1. Store the active image → image leaves, next photo shifts into ACTIVE position, fresh photo loads at rightmost pane.
  2. Delete the active image → same behavior as Store.
  3. Left/Right nav arrows → whole strip shifts one, ACTIVE pane stays fixed in its position.
  4. Filmstrip thumbnail click → the clicked image loads into the currently ACTIVE pane (window auto-shifts to land the click under the pill).

**Implementation**
- `ComparisonView.jsx` made fully controlled — removed internal `start` state and auto-slide `useEffect`s. Component now receives `windowStart` prop from parent and never slides on its own. Pane click still calls `onSelect(idx)` which only updates `selectedIdx` (no window change).
- `App.js` added `compareWindowStart` state (top-level, owned by App). Clamp effect on `[compareMode, images.length, currentSourcePath]` keeps it legal and re-seats when entering compare mode.
- `goPrev` / `goNext` in compare mode shift BOTH `compareWindowStart` AND `selectedIdx` by ±1 in lock-step so the ACTIVE ring stays pinned at the same pane position. Nav buttons now disable at `compareWindowStart === 0` / `>= images.length - compareMode` respectively.
- Filmstrip thumbnail `onClick` in compare mode computes `activePos = selectedIdx - compareWindowStart`, then sets `newStart = clamp(clickedIdx - activePos)` and `selectedIdx = clickedIdx` — the clicked photo lands exactly under the ACTIVE pill.
- Store auto-advance branch (`setSelectedIdx(i+1)`) now skipped in compare mode; instead selectedIdx is clamped to the shrunk array so ACTIVE stays in place and next photo naturally shifts into its position. Clamp effect on `images.length` slides `compareWindowStart` back if the array became too short to fill the panes.

**Version bump**
- `frontend/src/buildInfo.json` → **1.4.5i** (build date 2026-02-13).

**Files touched**
- `frontend/src/components/ComparisonView.jsx` (fully controlled window, removed internal slide effects).
- `frontend/src/App.js` (compareWindowStart state, clamp effect, goPrev/goNext lock-step shift, filmstrip-to-active load, skip auto-advance in compare mode, nav disable bounds).
- `frontend/src/buildInfo.json` (1.4.5h → 1.4.5i).

**Test posture**
- All 14 `.mjs` regression suites green.
- Smoke test: splash shows `v1.4.5i · offline · built for photographers who shoot more than they type`. Compile clean (only pre-existing eslint warnings on unrelated `currentOverlay`).
- Windows verification pending — Kurt to run the packaged `.bat` and test the four slide-only triggers.


### Iteration 36 — v1.4.6 · Editor Round-Trip + XMP Sidecars + Store flourish (2026-02-13)

Kurt greenlit shipping three quick wins together while deferring True RAW decoding + AI search to a v2 release band.

**1. Editor Round-Trip (P1 clear)**
- When `ImageEditor` saves an `<original>_edit_<stamp>.jpg`, App.js now clones the ORIGINAL photo's overlay (`appliedByImage[originalName]`) and star rating (`ratings[${sourcePath}/${originalName}]`) onto the new filename before refreshing the folder listing.
- Chip `uid`s are regenerated on clone so the two photos can be independently reordered without collision.
- Toast: "Edit inherits tags & stars from original" so Kurt sees the round-trip landed.
- No-op path: if the editor closes without saving (`newFileName === null`) or writes back to the same name, nothing changes.

**2. XMP Sidecars — write-only (P1 clear)**
- Added `/app/frontend/src/lib/xmp.js` with `buildXmpPacket({ keywords, stars, version })` and `writeXmpSidecar({ dirHandle, jpegName, keywords, stars, version })`.
- Packet format is Adobe RDF/XML with `xmp:Rating` (integer 0..5, omitted at 0 so Lightroom sees "unrated" instead of "zero stars") and `dc:subject` (deduped, trimmed keyword bag). `xmp:CreatorTool` embeds the Pro Photo Sorter build version.
- Written next to every stored JPEG from BOTH the standard `storeCurrent` loop (single + batch) AND the resize `confirmResizeStore` path. Sidecar naming follows the Adobe-friendly `PhotoName.jpg.xmp` convention.
- Soft-fail: sidecar write errors are console-warned but never abort a Store. Gated by `settings.writeXmpSidecar !== false` for future opt-out.
- New regression suite `tests/xmpSidecar.test.mjs` — 7 assertions covering keyword dedupe/trim, rating clamp+round, zero-star omission, empty-input safety, XML escaping, keyword-object `.label` support, version injection.

**3. Compare-mode Store flourish (Spark)**
- On Store in ×2 / ×3 compare mode (single-photo only — batches skip the pulse to avoid screen spam), App.js snapshots the ACTIVE pane's `getBoundingClientRect()`, then renders a fixed-position green pulse overlay + pop-and-drift "Stored ✓" badge at that spot for 480 ms.
- Overlay is `position: fixed`, so it stays where the pane WAS on screen even after the strip shifts underneath — reads as "that spot got a store, next photo is on deck".
- Two CSS keyframes added to `index.css`: `pps-flash-pulse` (inset emerald glow + inner ring) and `pps-flash-badge` (scale-in pop + upward drift + fade).

**Splash refresh**
- Bumped highlights: "One-shot photo editor" now mentions "tags and star rating follow the edit". "100% offline" is now "100% offline · Lightroom-ready" with a .xmp sidecar callout so Kurt's first-boot users see the flagship v1.4.6 wins immediately.

**Version bump**
- `frontend/src/buildInfo.json` → **1.4.6** (build date 2026-02-13). Package.json files stay at `1.4.5` since the release band is still 1.4.x.

**Files touched**
- Created: `frontend/src/lib/xmp.js`, `frontend/tests/xmpSidecar.test.mjs`.
- Updated: `frontend/src/App.js` (xmp import + write in storeCurrent + confirmResizeStore, editor round-trip on onClose, compareFlash state + trigger + overlay render), `frontend/src/components/SplashScreen.jsx` (highlight copy), `frontend/src/index.css` (2 keyframes), `frontend/src/buildInfo.json`.

**Test posture**
- All 21 `.mjs` regression suites green (14 legacy + 7 new xmp).
- Smoke: splash renders `v1.4.6` with updated highlight copy, no compile errors, only pre-existing `currentOverlay` eslint warnings.
- Windows verification pending — Kurt to run the packaged `.bat` and validate:
  1. Storing in ×2 / ×3 shows the green pulse at the active pane.
  2. Editing a photo produces `*_edit_<stamp>.jpg` with tags and stars intact.
  3. Every stored photo has a companion `.xmp` sidecar readable by Lightroom.

**v2 roadmap (parked)**
- **True RAW decoding** — libraw / dcraw bundled with Electron for accurate CR2 / NEF / ARW / DNG rendering.
- **AI search** — face recognition, subject clustering, and natural-language folder queries as the v2 flagship features.


### Iteration 37 — v1.4.7 · Docs seal + destination path fix (2026-02-13)

Kurt asked to "put v1 to bed" — docs refresh across every user-facing surface plus a small `unsorted`-folder path bug.

**Bug fix — `unsorted` folder inserted into paths with pack + sub-folder context**
- Root cause: `renderTemplate` emits the string `"unsorted"` as a fallback for `{folders}` when the folders row has no chips. `composeDestFolderParts` appended that literal to the path even when the pack name + sub-folder chain already provided full context (e.g. Kurt's `Wildlife/unsorted/Birds/Bald_Eagle.jpg` case).
- Fix (`App.js` `composeDestFolderParts`): strip case-insensitive `"unsorted"` entries from `folderPartsFromTemplate` whenever `activePack?.name` OR `subChain` provides any non-empty segment. Kept the fallback only for the true orphan case (no pack, no sub-folder) so lost photos still land in a labeled bin.
- New regression suite `tests/destFolderCompose.test.mjs` — 8 assertions covering Kurt's exact case, deep sub-folder chains, orphan preservation, case-insensitivity, whitespace filtering.

**Docs seal — v1.4.5e → v1.4.7 refresh across every surface**
- `ReadMe.txt` — rewrote "WHAT'S NEW IN 1.4.7" block with XMP sidecars, Editor Round-Trip, compare-mode active-follows-click, orientation toggle + corner-drag, green pulse flourish, `unsorted` fix, plus a new "COMPARE MODE — SIDE-BY-SIDE SORTING" section and a "LIGHTROOM WORKFLOW (XMP SIDECARS)" section. Installer filename bumped to `1.4.7.exe`.
- `QUICK_START.md` — rewrote with new Compare view spec, Editor round-trip section, Resize crop orientation + corner drag section, XMP sidecar Lightroom setup, plus the mandatory "sidecar drops next to every Store" line in the first-launch walkthrough.
- `USER_GUIDE.md` — brand-new sections replacing the old ones: Compare View (Active Follows Click), Editor Round-Trip, Resize Crop (Orientation + Corner Drag), XMP Sidecars for Lightroom, Compare-Mode Store Flourish. Bug-report version stamp updated to v1.4.7.
- `CHANGELOG.md` — added consolidated **v1.4.7** entry covering the full v1.4.0-v1.4.7 arc grouped under Added / Fixed / Files touched / v2 roadmap.
- `frontend/public/docs/*.md` mirrored so in-app Help modal serves the fresh docs at runtime.
- `dist-docs/Quick Start.pdf` + `User Guide.pdf` regenerated via `node scripts/build-docs-pdf.js`.

**Version stamps synced across the whole build**
- `frontend/src/buildInfo.json` → 1.4.7 (runtime splash + About pill).
- `frontend/package.json` → 1.4.7.
- `electron-shell/package.json` → 1.4.7 (fixes `Pro Photo Sorter Setup 1.4.5.exe` → `Pro Photo Sorter Setup 1.4.7.exe` in `dist/`).

**Files touched**
- Fixed: `frontend/src/App.js` (`composeDestFolderParts` filter).
- Created: `frontend/tests/destFolderCompose.test.mjs` (8 assertions).
- Refreshed: `ReadMe.txt`, `QUICK_START.md`, `USER_GUIDE.md`, `CHANGELOG.md`, `frontend/public/docs/QUICK_START.md`, `frontend/public/docs/USER_GUIDE.md`, `frontend/public/docs/CHANGELOG.md`, `dist-docs/Quick Start.pdf`, `dist-docs/User Guide.pdf`.
- Version bumps: `frontend/src/buildInfo.json`, `frontend/package.json`, `electron-shell/package.json`.

**Test posture**
- All 29 `.mjs` regression suites green (14 legacy + 7 xmp + 8 destFolderCompose).
- Smoke: preview builds, splash renders v1.4.7 with updated highlight copy.

**Marketing kit (draft)** — see next iteration entry.

## Marketing phase — 2026-06 · Landing page for muskegman.com
- ✅ `docs/index.html` — single-file static landing page (earth-tone palette,
  Manrope/IBM Plex/JetBrains Mono, hero + problem strip + 6 features + 4-step
  loop + Lightroom XMP callout + Kurt's Alaska story + $29 pricing vs free
  trial + FAQ + CTA). Buy links → `https://muskegman.gumroad.com/l/gvmaas`;
  trial links → GitHub Releases latest. Contact: leaderteamk@gmail.com (placeholder — confirm).
- ✅ `docs/assets/app-hero.png` (real app splash capture via
  `scripts/capture-hero.js`), `docs/assets/icon.png`, `docs/.nojekyll`.
- ✅ Hosting plan: GitHub Pages from `/docs` on `main`; GoDaddy A records →
  GitHub IPs + `www` CNAME → `pirateak.github.io`. Runbook in
  `MARKETING_KIT.md` §6. CNAME file intentionally NOT committed — GitHub adds
  it when Kurt enters the custom domain in Settings → Pages.
- ✅ Kurt DONE (2026-06): Pages enabled, GoDaddy forwarder to CafePress killed,
  4 GitHub A records + www CNAME live, custom domain saved. https://muskegman.com
  serving the landing page. Enforce HTTPS: tick once cert issued.
- Pending decisions: confirm $29 price matches Gumroad; confirm contact email;
  replace hero screenshot with a real sorting-session screenshot.
- Next marketing items: Playwright demo GIFs, Gumroad listing polish,
  Product Hunt assets.
- ✅ Hero swapped to Kurt's real ×3-compare screenshot (flowers, light theme,
  1922×1017, taskbar cropped). Hero grid now .9fr/1.1fr with shot bleeding 118%.
- ✅ Price confirmed $29 (raise to $39 after first reviews). Contact =
  leaderteamk@gmail.com. Gumroad: v1.4.7 exe + PDFs uploaded, description rewritten (§8).
- ✅ GitHub Release v1.4.7 published with exe/blockmap/latest.yml/PDFs/ReadMe.txt.
- 📌 NEXT SESSION (Kurt paused, late night): traffic plan saved in
  MARKETING_KIT.md §9. Start with: AlternativeTo listing draft, Reddit
  r/wildlifephotography post draft, visitor counter on landing page, Google
  Search Console walkthrough. Kurt has NOT hit Save to GitHub for the eagle
  hero yet — remind him (site updates itself once pushed).
- ✅ 2026-06 (session 2): site gallery section (#gallery, eagle + ×3 compare),
  JSON-LD SoftwareApplication schema ($29, Windows, v1.4.7), canonical tag,
  robots.txt + sitemap.xml, footer AlternativeTo link (URL unconfirmed).
  MARKETING_KIT §11 download-site blurbs, §13 Cloudflare analytics steps.
  AlternativeTo listing approved. Payhip rejected. Reddit post drafted (§10);
  Kurt learning Reddit first (lurk/comment a week before posting).
- ⏳ Kurt: Save to GitHub; confirm AlternativeTo URL; Cloudflare token for
  analytics; Search Console verification; Softpedia/MajorGeeks submissions.

## Parked for v2 (Kurt, 2026-06) — marketing follow-ups deferred
Kurt asked to shelve these; "has other thoughts". Do not propose again until v2 kickoff.
- Cloudflare visitor counter on landing page (MARKETING_KIT §13)
- Google Search Console verification + sitemap submit
- Softpedia / MajorGeeks / Softonic submissions (blurbs ready, §11)
- Demo GIF / Playwright capture scripts for site, Reddit, Gumroad
- Reddit posts (drafts in §10) — Kurt learning Reddit at his own pace
- Product Hunt launch; Facebook groups
- Portable (no-install) build target via electron-builder
- Payhip / dual-verifier license (after ~50 sales)

## v1.5.0 — 2026-06-16 · Un-losable tag library (TPC groundwork) — DONE
- ✅ `lib/packFormat.js`: v4 pack format (recursive subfolders — fixes v3 export
  dropping nested folders), deserialize v1–v4, `numberedName` ("Wildlife 2"),
  `findByName`, `mergeCategory` (recursive, dedupe by label, icon-upgrade rule),
  `applyImport(mode: replace|merge|new)`.
- ✅ `lib/tagHistory.js`: localStorage "pps.tag-history", cap 50 / 90 days,
  `applyEntry(mode restore|keepBoth)`. Event `pps:history-updated`.
- ✅ CategoryManager: ImportDecision overlay (data-testid import-merge/replace/new/
  cancel), HistoryPanel (tagmgr-history-open, history-restore-*, history-keepboth-*,
  history-empty), snapshots on delete-category, delete-subfolder (top + nested via
  `pps:before-destructive` event from NestedSubfolderEditor), paste-roster (>1),
  import replace/merge. uniqueName now "Name 2" style.
- ✅ Tests: packMerge.test.mjs (8), tagHistory.test.mjs (5). Suite 42/42.
- ✅ Version 1.5.0 (frontend + electron-shell + buildInfo), CHANGELOG entry.
- Browser-verified: import → Merge → History → Keep both → Wildlife + Wildlife 2.

## Tag Pack Creator (TPC) — Phase 2 plan (decisions locked 2026-06-16)
- Customer-facing, FREE, own installer/download (non-PPS users can make packs).
  Same repo; shares packFormat.js, icon picker, starter packs. Build: separate
  electron shell dir (e.g. electron-shell-tpc/, productName "Tag Pack Creator")
  loading the same React build with a `#/tpc` hash route; `pack-tpc.bat`.
- Layout (Kurt): title → button row [Category][Folder][Sub-Folder (n)][Filename]
  (toggle color on press, one selection per entry, disabled until text typed;
  Sub-Folder digit increments = nesting depth under MOST RECENTLY CREATED
  sub-folder; deselect resets digit) → path preview line (like PPS "Will store
  to") → tag display: row1 category, row2 sub-folders (nested inline, drag
  reorder), row3 filename tags (drag reorder) → text box (comma list paste,
  cap 20, extras held → after Save ask "paste the rest? (+N)") → filename tag
  box library (same chip UX as PPS: drag, right-click edit, x remove) →
  pack title field (= save filename) → Save · Trash-with-undo.
- Filename tags land in highlighted sub-folder AND appear in tag box library.
- Icons: same picker as PPS Tag Manager (built-ins + custom PNGs), right-click.
- Open existing .pps-tagpack.json to edit/re-save (no auto-load of starters;
  allow importing them).
- Output: v4 pack file; "Install into PPS" nice-to-have later.

## Tag Pack Creator v1.5.0 — 2026-06-16 · BUILT (browser-verified)
- `frontend/src/tpc/TagPackCreator.jsx` (route `#/tpc` via index.js), `tpc/previewCard.jsx`.
- Role buttons w/ depth digit (nests under most-recently-created chain `lastCreated[depth-1]`),
  path preview, 3-row display (drag reorder siblings / tags; drag library tag onto folder = copy),
  20-cap paste hold (`held` + "Add the rest" + prompt after Save), Tag box library,
  IconPicker (BUILTIN_ICONS exported from CategoryManager + PNG upload + rename), Undo stack,
  Open pack (v1–v4), Save (Electron dialog `tpc:save-pack`, browser = download),
  Install into PPS (`tpc:install-pack` → Documents\Pro Photo Sorter\Inbox), Cover PNG 1280×720.
- PPS side: `electron-shell/main.js` + preload `pps:inbox-list/remove`; CategoryManager toasts
  "Tag pack waiting" with Import/Discard on open (uses importPackJson → decision dialog).
- `electron-shell-tpc/` (main.js, preload.js, package.json productName "Tag Pack Creator",
  appId com.muskegman.tagpackcreator, artifact "Tag Pack Creator Setup ${version}.exe"), `pack-tpc.bat`.
- data-testids: tpc-role-*, tpc-depth, tpc-text, tpc-add, tpc-held(-add), tpc-path-preview,
  tpc-folder-*, tpc-tag-*, tpc-lib-*, tpc-category-chip, tpc-icon-picker, tpc-icon-<Name>,
  tpc-title, tpc-author, tpc-save, tpc-install, tpc-cover, tpc-open(-input), tpc-undo.
- ✅ Kurt field-tested TPC on Windows incl. Install into PPS inbox flow: "works brilliantly" (2026-06).
- ✅ Added: theme toggle (tpc.theme), fluid layout, About dialog (tpc-about, tpc-about-gumroad/trial/site).
- Kurt to do: Save to GitHub → pull+build one-liner (pack-app.bat && pack-tpc.bat) → GitHub
  Release v1.5.0 with BOTH installers + latest.yml/blockmap → update Gumroad file → add TPC
  (free) to Gumroad/landing later.

## BUILD ONE-LINER (corrected 2026-06 — pack-app.bat leaves cwd in electron-shell, so use FULL paths)
cd /d C:\Pro-Photo-Sorter && git fetch origin && git reset --hard origin/main && git clean -fd -e "electron-shell/dist/" -e "electron-shell-tpc/dist/" && call C:\Pro-Photo-Sorter\pack-app.bat && call C:\Pro-Photo-Sorter\pack-tpc.bat && start "" "C:\Pro-Photo-Sorter\electron-shell\dist" && start "" "C:\Pro-Photo-Sorter\electron-shell-tpc\dist"
TPC-only rebuild: cd /d C:\Pro-Photo-Sorter && call pack-tpc.bat && start "" "C:\Pro-Photo-Sorter\electron-shell-tpc\dist"
- ✅ 2026-06: Free TPC Gumroad listing live: https://muskegman.gumroad.com/l/PPS-TPC.
  Site: nav "Free Creator", #creator section (CSS mock of the Creator UI), footer link.
  TPC About box: "Tag Pack Creator on Gumroad" share link (tpc-about-creator).
- Parked: shop.muskegman.com → domains.gumroad.com CNAME (Gumroad verify failed; DNS not propagated yet).
- ✅ 2026-06 TPC workflow v2: role-first (Add disabled until role), role persists after Add, Sub-Folder gated on selectedId (toast "Pick a folder first"), clicking folder chip → select + auto role subfolder (unless role=filename), clicking highlighted chip → select parent. Waterfall `levels[]` (tpc-level-N, tpc-folder-row, tpc-subfolder-row-N), depth badge read-only. Sticky footer save bar (tpc-save-row). Toaster top-right. depth/lastCreated state removed.
- 2026-06 BUG FIXED: pack-tpc.bat reused stale frontend/build → shipped old Creator. Now always
  rebuilds React. One-off workaround given to Kurt: rmdir /s /q frontend\build before pack-tpc.bat.

## v2 ROADMAP — Tag Manager = Creator editor (Kurt, 2026-06, after loving TPC workflow v2)
- Replace CategoryManager's right-hand editor with the TPC waterfall + role-first entry
  (same category schema; left rail category list stays).
- Carry over: chip Trash, Custom Images library + icon arming, Tag History, Backup All /
  bundle, starter-pack installer, paste-roster, export/import. Bonus: Cover + Save-as-pack in PPS.
- Approach: lift TagPackCreator's editor into a shared component (props: category, onChange,
  selection) used by both apps; keep TPC standalone shell.

## v1.5.1 — 2026-06-17 (both apps)
- PPS: CategoryManager row + header counts recursive via countPack; Inbox check also on window "focus"
  while Tag Manager open (dedupe via inboxSeen ref, 20s). Root cause of Kurt's "install doesn't work"
  likely Tag Manager already open (only checked on open). Data loss bug was display-only.
- TPC: role defaults "category", autofocus text, category Add → role folder, folder click → role
  filename (unless subfolder) + refocus, toggleRole no longer un-toggles.
- Kurt to build BOTH (pack-app + pack-tpc), new GitHub release v1.5.1 (exe+blockmap+latest.yml +
  TPC exe + PDFs), update Gumroad PPS + PPS-TPC files.
- ✅ 2026-06-17 Kurt confirmed v1.5.1: PPS shows 1.5.1, Inbox prompt "Tag pack waiting: Dogs" fired,
  install works. ROOT CAUSE of earlier "bugs": Kurt's PPS was still 1.4.7 (never installed 1.5.0;
  auto-updater CONFIRMED WORKING 2026-06-17: PPS 1.4.7 offered the 1.5.1 update on launch once the release was published.).
- ✅ TPC arrow-key nav in text box when empty (navKey): ←→ siblings (wrap), ↓ first child, ↑ parent. Hint line updated. In 1.5.1 codebase (Creator rebuild needed).
- ✅ TPC 'New pack' (tpc-new): confirm if work exists, commit(empty) so Undo restores, keeps author, role=category, focus text. Toasts top-center. Save/Install success toasts carry a 'New pack' action.
- ✅ 2026-06-17 site: v1.5.1 refs, hero what's-new line, pricing bullet (Merge/Replace + Tag History), Creator copy role-first + arrow keys, sitemap date.

## 📌 NEXT SESSION (Kurt, 2026-06-17): Move the Creator editor into PPS Tag Manager NOW (not v2)
- Kurt: "it's just that much better that it deserves to be in both."
- Plan: extract TagPackCreator's editor (role-first buttons, text entry, path preview, waterfall
  levels, filename row, tag box, arrow-key nav, icon picker) into a shared component
  `components/PackEditor.jsx` (props: category, onChange, customImages…). TPC keeps its own
  header/save bar; PPS CategoryManager swaps its right-hand editor for PackEditor while keeping
  left rail (categories, Import pack/text), header (Trash, History), Custom Images right rail
  and icon-arming, Backup All / Bundle, starter packs, Export pack / Export as text, Delete empty.
- Keep PPS-only behaviors: chip Trash on tag delete (use chipTrash lib), paste-roster snapshot,
  bulk select/convert? (check what's still needed), NestedSubfolderEditor becomes redundant.
- Ship as PPS v1.6.0. Rebuild BOTH apps (shared code). Update docs/USER_GUIDE + PDFs + site.
- Build one-liner: see "BUILD ONE-LINER (corrected)" above.

## PHASE A (paused 2026-06-20 — Kurt waiting for pay-day; resume here) · PPS v1.6.0
Goal: replace CategoryManager's middle-pane editor with the TPC editor as a shared component.
- Extract from `tpc/TagPackCreator.jsx` → `components/PackEditor.jsx`: tree helpers, Chip,
  IconPicker, role buttons, text entry (+held/20-cap), path preview, waterfall levels, filename
  row, tag box, navKey arrows. Props: `pack`, `onCommit(fn,label)`, `onTagRemoved?(tag, owner)`
  (PPS → chipTrash), `armedIcon?/onConsumeArmed?` (PPS icon-arming), `customImages?`.
  Use `key={pack.id}` to reset selection on pack switch/new.
- TPC: render <PackEditor> ; keep header (About/theme/New pack/Open/Undo) + sticky save bar.
  Drop post-save "paste the rest" confirm (held banner covers it).
- PPS CategoryManager: replace lines ~1653–1695 (`<div className="flex-1 overflow-auto"><SubfolderSection …/>`)
  with <PackEditor key={current.id} pack={current} onCommit={(fn)=>onChange(categories.map(c=>c.id===current.id?fn(c):c))} …/>.
  Keep: category header (name/counts/Export pack/Export as text/Delete empty, ~line 1578),
  left rail, right rail IconPickerBar (armedIcon), footer (Backup All/Bundle/Done), Trash, History,
  Inbox toast, ImportDecision. SubfolderSection + NestedSubfolderEditor become unused (leave file).
- Then: bump 1.6.0 both apps, CHANGELOG, USER_GUIDE/QUICK_START Tag Manager section + PDFs
  (scripts/build-docs-pdf.js), site line. Rebuild BOTH apps.
- Phase B/C definitions: see Kurt's paste in chat 2026-06-20 (shipper bundles + images + link,
  picker dialog w/ pending dropdown, TPC reads PPS Safety-Backup mirror, cross-app detect).

## v1.6.0 — 2026-06-20 · PHASE A DONE (shared editor)
- `components/PackEditor.jsx` (helpers + IconPicker moved from TPC; props pack/onCommit/onTagRemoved/
  armedIcon/onConsumeArmed/hideCategory). `lib/builtinIcons.js` (BUILTIN_ICONS moved out of CategoryManager).
- TPC = shell (header/About/theme/New pack/Open/Undo + sticky save bar) around <PackEditor key={pack.id}>.
- PPS CategoryManager: middle pane = <PackEditor hideCategory …> ; SubfolderSection/NestedSubfolderEditor
  now unused (files kept). Modal default width 1280 (ignores stored <1100); Icon Holders rail w-48, icons 13px.
  Trash wired via pushToTrash in onTagRemoved; icon arming via onConsumeArmed.
- Browser-verified: PPS add tag persists to storage, delete → Trash·1, arm icon+click folder sets icon;
  TPC autofocus, arrows, save v4, New pack, theme. Tests 42/42. Docs + PDFs regenerated; site v1.6.0.
- Kurt: Save to GitHub → build BOTH → release v1.6.0 (both exes + latest.yml + blockmap + PDFs) → Gumroad.
- Phase B/C still queued (see paste 2026-06-20).
- ✅ 2026-06-20 site: all screenshots replaced with Kurt's v1.6.0 captures (app-hero dark eagle, app-tagmanager, app-editor, app-creator); gallery 3-col; Creator mock card removed. public/index.html <title> → Pro Photo Sorter (was Emergent template). Needs Save to GitHub; title fix ships with next PPS build.

## Website expansion — 2026-06 · Plan parked (see memory/WEBSITE_UPGRADE_PLAN.md)
- Inspected: PUBLIC repo PirateAK/Pro-Photo-Sorter, main, GitHub Pages from /docs, fully static.
- Fixed: docs/CNAME (muskegman.com) was missing from workspace though present on GitHub — added.
- Verdict: public gallery/software/about/contact = static on Pages (free). Admin dashboard/login/uploads/secrets = NOT possible on Pages → separate Emergent full-stack project publishing to /docs via GitHub API (paid, after payday).
- Phases: W0 prep → W1 free static gallery → W2 paid admin → W3 enable sales (Gumroad digital, print provider TBD).

## v1.7.0 — 2026-06-21 · Phase B: Tag Pack Shipper + link field (DONE, 46/46 tests)
- `lib/packFormat.js`: `link` on pack files (normalizeLink/linkDomain), `serializeShipper`/`deserializeShipper`/`isShipper`, SHIPPER_LIMITS (3 images, 1200px, ≤350KB, 50 packs). Packs inherit shipper author/link when blank (both directions).
- `components/ShipperDialog.jsx` (shared): ShipperDialog (title/author/link/description, image add w/ canvas shrink, add pack files incl. other shippers, Save + optional extra action) + ShipperPreview (PPS import preview with clash badges).
- `lib/authorPrefs.js`: author/link/description persisted in localStorage (both apps) — Kurt's request "DNS should persist".
- PPS CategoryManager: Bundle… → **Ship…**; Import pack… accepts .pps-shipper.json → preview → queued one-by-one through Merge/Replace/New (importQueue + importPackObjRef effect placed before early return); ImportDecision shows author/link; Inbox regex accepts shipper files.
- TPC: Link field (save bar), **Shipper…** header button (Save / Install into PPS), Open pack… opens shippers, cover PNG prints domain.
- electron-shell/main.js inbox filter: /\.pps-(tagpack|shipper)\.json$/i.
- Version 1.7.0 everywhere (3 package.json, buildInfo, docs/index.html, CHANGELOG, USER_GUIDE). User must Save to GitHub + run the reset/dual-build one-liner.
- Verified: node tests + Playwright smoke (TPC shipper dialog, prefs persist after reload; PPS shipper import → preview → decision).
- NEXT: Phase C (two-way library + cross-app detection). Website plan parked in WEBSITE_UPGRADE_PLAN.md.

## v1.8.0 — 2026-06-22 · Phase C: two-way library + cross-app detection (DONE, 49/49 tests)
- `electron-shell/sharedIpc.js` (copied to `electron-shell-tpc/sharedIpc.js` by pack-tpc.bat; both package.json `files` include it): `registerShared('pps'|'tpc')` → IPCs `apps:info`, `apps:launch`, `library:write`, `library:list`. Writes `Documents\Pro Photo Sorter\apps\<id>.json` {version, exePath(null in dev), lastSeen}. Library = `Documents\Pro Photo Sorter\Library\<pack>.pps-tagpack.json`, pruned on write.
- Preloads expose libraryWrite/appsInfo/appsLaunch (PPS) and libraryList/appsInfo/appsLaunch (TPC). Bridge helpers in electronBridge.js.
- App.js: debounced (1.2s) library mirror effect on `categories` (Electron only).
- `components/OtherAppChip.jsx` (shared): Open <app> / Get <app> / "vX → update" nudge (compareVersions in lib/version.js). PPS: under Import text list in Tag Manager. TPC: header.
- TPC: `From PPS library…` (data-testid tpc-from-library) → LibraryPicker → openJson. Note: `tpc-library` testid belongs to the PackEditor tag box.
- Version 1.8.0 everywhere; CHANGELOG/USER_GUIDE/site/release notes (`dist-docs/RELEASE_NOTES_v1.8.0.md`).
- Verified: node tests (electron stubbed for sharedIpc) + browser smoke (Electron-only buttons hidden in browser by design). Real Electron round trip is for Kurt to test on Windows.
- v1 feature set CONCLUDED per Kurt. Next: v2 or other projects (website plan in WEBSITE_UPGRADE_PLAN.md; v2 backlog earlier in this file).
- 2026-06-22 FIX: artifactName now hyphenated for both shells (`Pro-Photo-Sorter-Setup-${version}.${ext}`, `Tag-Pack-Creator-Setup-${version}.${ext}`) — GitHub turned spaces into dots while latest.yml used hyphens → auto-updater 404'd on every release so far. For v1.8.0 Kurt re-uploads renamed copies.

## v2 backlog addition — 2026-06-22 (from Kurt)
- **Theme toggle inside Tag Manager** — put the light/dark mode swap button in the Tag Manager header too, so you can swap color schemes without closing it. (Kurt: "unless we need other v1.8.0 fixes, do in v2.") Small: reuse the existing toolbar theme toggle component/handler.
- 2026-06-22 Site: swapped v1.8.0 screenshots (app-hero.jpg dark, app-hero-light.jpg, app-tagmanager.jpg, app-creator.jpg — PNG→JPG, old PNGs removed, html refs updated). Added "Show light theme" swap button on first gallery card (data-testid theme-swap). Captions updated to v1.8.0. Kurt still owes a Shipper-dialog screenshot (optional).

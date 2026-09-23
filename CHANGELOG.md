# Changelog

All notable changes to Pro Photo Sorter are tracked here. Dates in YYYY-MM-DD.

## v1.2.9 (pass 7) — 2026-02-20 · Dropped main filmstrip dock feature

### Reverted
- **Main filmstrip dock picker removed.** Left/right positions covered
  the Source/Destination trees, so Kurt asked to drop the feature and
  keep the filmstrip always at the bottom.
- Removed: dock-picker widget, `filmstripPosition` setting, `.strip-*`
  CSS variants, `strip-hidden` state, floating "Show filmstrip" pill,
  and the **T** keyboard shortcut.
- Kept: **arrow visibility fix** (`text-white` chevrons on both prev
  and next), **active-mode audit** on Batch/Cull/Sort/Star-filter, and
  the **editor filmstrip docking** (5-way with hide, works great).

### Files touched (pass 7)
- `frontend/src/App.js` — removed dock UI + show-pill, reverted scroll
  logic to horizontal-only, dropped `T` shortcut.
- `frontend/src/App.css` — restored base `.app-grid` with explicit
  region grid coordinates (fixes region positioning after class
  variants were removed).
- `frontend/src/lib/storage.js` — removed `filmstripPosition` +
  `filmstripWidth` from DEFAULT_SETTINGS.



### Changed
- **Active-Mode audit — unified stateful toggles.** Batch, Cull, Sort A-Z,
  and Star-filter now all wear the same look when active: filled
  primary-earth background with inverse text, primary-earth border, and
  a trailing `Check` icon. Matches the active subfolder chip's language
  so the whole toolbar speaks with one voice.
  - Batch button: was `success-earth` (green), now `primary-earth`
  - Cull button: was neutral even while its modal was open, now lights
    up primary-earth whenever `showCull` is true
  - Sort A-Z button: adds a `Check` next to `ArrowDownAZ` when active
  - Star-filter chip: was outline `primary-earth/20`, now filled
    primary-earth with inverse text + a `Check`

### Added
- **Hide filmstrip.** Both the main filmstrip dock picker and the editor
  filmstrip dock picker gained a 5th "hide" button (`EyeOff` icon).
  When hidden:
  - Main app grid collapses to 3-col × 1-row via `.strip-hidden`, giving
    the photo full-height canvas.
  - A floating **"Show filmstrip"** pill (`Film` icon on `bg-black/80`)
    appears at the bottom-right corner — one click brings it back.
  - The editor filmstrip goes fully collapsed to a similar pill inside
    the editor stage.
  - New keyboard shortcut **T** toggles hide/show for the main
    filmstrip (Lightroom-style).

### Files touched (pass 6)
- `frontend/src/App.js` — batch/cull/star-filter styles, 5th dock
  option, floating show-pill, `T` shortcut.
- `frontend/src/App.css` — `.strip-hidden` grid variant.
- `frontend/src/components/IconPalette.jsx` — Sort A-Z active check.
- `frontend/src/components/ImageEditor.jsx` — editor filmstrip 5th
  dock option, hidden-state show-pill.



### Fixed
- **Editor filmstrip arrows invisible in light mode.** The mini filmstrip
  inside the Image Editor used `text-app` on `bg-app/80`, which blended
  into itself in light theme. Now uses `text-white` on `bg-black/70` so
  the chevrons read cleanly on every theme (same treatment as the main
  filmstrip in pass 4).

### Added
- **Editor filmstrip is now dockable too.** A compact 4-icon picker
  (bottom / top / left / right) lives at the leading edge of the strip.
  Left/right positions flip it to vertical: swaps the arrows to up/down,
  changes the inner scroll axis to y, and lets Kurt move the strip out
  of the way of whatever detail he's editing at the bottom of the photo.
  The choice persists across editor sessions in localStorage
  (`pps.editorstrip.position.v1`).

### Files touched (pass 5)
- `frontend/src/components/ImageEditor.jsx` — `EditorFilmstrip` rewrite
  + Lucide icon imports (`ChevronUp`, `ChevronDown`, `PanelBottom`,
  `PanelTop`, `PanelLeft`, `PanelRight`).



### Fixed
- **Filmstrip prev/next arrows invisible in light mode.** Both scroll
  buttons now use an explicit `text-white` icon color so the chevrons
  read cleanly on ANY theme, dark or light (Kurt reported the arrows
  were nearly invisible against the grass-photo background).

### Added
- **Dockable filmstrip.** A new dock picker sits at the top-left of the
  filmstrip strip with four one-click positions:
  - **Bottom** (default) — the classic look
  - **Top** — filmstrip becomes the top edge, main workspace slides down
  - **Left** — filmstrip goes vertical on the left, panes shift right
  - **Right** — filmstrip goes vertical on the right, panes shift left
  Selection persists per-user via `settings.filmstripPosition`. Vertical
  orientation reshapes the CSS grid, flips the strip's inner scroll axis
  to `overflow-y`, and swaps the prev/next arrows to up/down arrows
  positioned at top/bottom of the vertical rail.
- Auto-scroll of the active thumbnail is orientation-aware — it uses
  `block: center` for vertical mode so the active photo always stays
  centered on the vertical rail.

### Changed
- **Repo consolidation.** `electron-additions/` and `electron-shell/`
  were both floating around in Kurt's local checkout, causing
  `pack-app.bat` to sometimes bundle a stale `main.js` and silently
  ship builds without the safety-mirror IPC handlers. The repo is now
  a **single source of truth**: everything lives in `electron-shell/`
  and `electron-additions/` has been deleted. Kurt's local sync command
  below wipes the duplicate folder so this class of bug can't recur.

### Files touched (pass 4)
- `frontend/src/App.js` — dock picker, orientation-aware scroll logic,
  arrow color fix.
- `frontend/src/App.css` — four `.strip-<pos>` grid variants.
- `frontend/src/lib/storage.js` — `filmstripPosition` + `filmstripWidth`
  settings.
- `electron-shell/` — mirrored from `electron-additions/`, now the
  canonical build source.
- `electron-additions/` — deleted from repo.

### Local cleanup command for Kurt
Paste this into a Command Prompt AFTER pulling the latest to wipe the
duplicate folder on your machine so future `pack-app.bat` builds pick
up only the correct source:

```bat
cd /d C:\Pro-Photo-Sorter && rmdir /S /Q electron-additions 2>nul & rmdir /S /Q electron-shell\dist 2>nul & pack-app.bat && findstr /C:"pps:safety-write" "electron-shell\dist\win-unpacked\resources\app.asar" && echo === BUILD READY ===
```



### Changed
- **Top-left `© WM` chip and top-right `WM ON/OFF` toggle removed from the
  image overlay.** They now live together in the toolbar row, right-aligned
  directly below the 16×20 resize button, so nothing floats on top of the
  photo any more. The chip now shows the FULL watermark text (or the trial
  banner `TRIAL - Pro Photo Sorter (unlicensed)` when unlicensed) instead
  of just the letters "WM". Right-click on the photo still toggles the WM
  for that image as before.
- If no watermark text has been configured, the chip becomes a dashed
  "No watermark set — click to add" affordance that opens Settings.

### Files touched (pass 3)
- `frontend/src/App.js` — removed the two overlay blocks, added a single
  `data-testid="wm-toolbar"` bar inside the `dest-preview-path` row.



### Added
- **Date stamp button is now a true toggle.** DateTagDropdowns default to
  today on mount (no more auto-pulling EXIF into the picker). First press
  of Apply stamps the selected date onto the photo; second press flips
  the button to "Remove" and clears the stamp. Stable palette ids per
  slot (`date-stamp-month|day|year`) guarantee one stamp per photo — if
  you re-apply with a different year, the previous stamp is replaced,
  not duplicated. Regression suite in
  `frontend/tests/dateStampToggle.test.mjs` (5 assertions).
- **Editor filmstrip.** ImageEditor accepts `images` + `currentImageName`
  + `onNavigate` props and renders a prev / next arrow pair with a
  horizontal thumb strip pinned to the bottom of the canvas stage.
  Active thumb auto-scrolls into view. Unsaved edits divert through the
  existing three-way prompt: Save-and-jump keeps the editor open and
  resets the sliders for the next photo, Discard-and-jump throws the
  edits away, Cancel goes back to the current image.

### Changed
- **Tag Manager sections re-ordered to Folders → Sub-Folders → Filename**
  so the editor reads left-to-right in the same shape as the destination
  path it builds (verified in DOM: `section-folderItems` →
  `SUB-FOLDERS` → `section-filenameItems`).
- **Sub-folder rows are spring-loaded.** Dragging any chip over a
  collapsed sub-folder header arms a 500ms timer; if the user keeps
  hovering, the row auto-expands so they can drop into the nested list.
  Moving off cancels the timer. The row shows a subtle earth-tone tint
  while armed so it's clear something's about to happen.

### Files touched (pass 2)
- `frontend/src/components/DateTagDropdowns.jsx` — today-default + toggle.
- `frontend/src/App.js` — `dateStampApplied` memo + rewired onApply/onRemove
  + Editor filmstrip props.
- `frontend/src/components/CategoryManager.jsx` — section reorder +
  spring-load timer on `SubfolderSection`.
- `frontend/src/components/ImageEditor.jsx` — filmstrip + navigate flow.
- `frontend/tests/dateStampToggle.test.mjs` — new regression suite.

### Test summary
- 49/49 assertions across 5 test files. Webpack compiles clean.


## v1.2.9 — 2026-02-20 · Data-loss-proof updates (license + tag pack persistence)

### Fixed (CRITICAL)
- **Update wiped tag lists and license key.** v1.2.8 renamed the app's
  `productName`, which silently moved Electron's `userData` folder from
  `%APPDATA%\electron-shell\` to `%APPDATA%\Pro Photo Sorter\`. The new
  folder was empty, so Chromium's Local Storage + IndexedDB (your tag
  packs AND your Gumroad license) appeared to vanish on next launch.
  Data was never deleted — just orphaned in the old folder.
  v1.2.9 fixes this **three ways**, in layers, so it can never happen
  again regardless of what we (or Windows) do to the app in future:

  1. **Pinned `userData` path.** `main.js` now calls
     `app.setPath('userData', <appData>/Pro Photo Sorter)` synchronously,
     BEFORE `app.whenReady()`. Renaming `productName` in any future
     release will no longer move the storage folder.
  2. **One-time auto-migration on boot.** If the pinned folder has no
     `Local Storage` yet, but a legacy `%APPDATA%\electron-shell\` folder
     exists, we copy `Local Storage`, `Session Storage` and `IndexedDB`
     across. A sentinel file (`.pps-migrated-from-electron-shell`)
     guarantees we never migrate twice. This means anyone who already
     installed v1.2.8 and thought they lost their tag packs will get
     them back automatically on the next launch.
  3. **Safety-Backup mirror outside `%APPDATA%`.** Every state save +
     license change also writes to
     `%USERPROFILE%\Documents\Pro Photo Sorter\Safety-Backups\latest.json`
     (plus one dated snapshot per day, last 30 kept). On boot, if
     localStorage is empty and this file exists, the app hydrates
     itself from the mirror before React even mounts. Uninstall,
     reinstall, disk cleanup, a wiped `%APPDATA%` — none of these can
     lose your tag packs or your license anymore.

### Added
- **License panel now shows Safety-Backup status.** Help → License lists
  the backup folder path, an "Active / Waiting for first save" indicator,
  and an **Open Safety-Backup folder** button so you can see the mirror
  and copy it to another drive if you want a belt-and-braces backup.

### Tests
- `frontend/tests/safetyBackup.test.mjs` — 6 new regression tests covering
  legacy migration (runs once, idempotent, refuses to clobber), safety
  mirror (writes latest + daily snapshots, prunes to 30-day window), and
  boot-restore (hydrates missing keys only, never overwrites existing
  data). All prior test suites still passing (44/44 total).

### Files touched
- `electron-additions/main.js` — pinned userData path + migration +
  safety IPC handlers.
- `electron-additions/preload.js` — exposed `safetyWrite / safetyRead /
  safetyInfo / safetyOpenFolder`.
- `frontend/src/lib/electronBridge.js` — safety helpers.
- `frontend/src/lib/storage.js` — export `STATE_KEY`, mirror on save.
- `frontend/src/lib/license.js` — export `LICENSE_STORAGE_KEY`, mirror on
  save + clear.
- `frontend/src/lib/bootRestore.js` — new; runs before React mounts.
- `frontend/src/index.js` — awaits `bootRestoreFromSafetyIfEmpty()` first.
- `frontend/src/components/LicenseSection.jsx` — safety-status card.

### Release checklist for Kurt
1. `cd /d C:\Pro-Photo-Sorter && git reset --hard HEAD && git clean -fd && git pull && pack-app.bat`
2. Upload BOTH `Pro Photo Sorter Setup 1.2.9.exe` AND `latest.yml` to the
   GitHub release. Without `latest.yml`, `electron-updater` will silently
   fail for your existing customers.
3. This is the last time anyone will lose data on an update. From v1.2.9
   forward, the pinned path + safety mirror handle it automatically.


## v1.2.8 — 2026-02-17 · Resizable Tag Manager + Batch All/None state

### Added
- **Resizable Tag Manager window.** Drag the corner handle (bottom-right,
  next to the "Done" button) to enlarge or shrink the modal. Contents
  reflow live — icon grids widen, chip lists wrap naturally, sub-folder
  sections stretch. Min size 640×400. Max size = viewport minus 40px
  padding. Size persists per-user in `localStorage` (`pps.tagmgr.size.v1`)
  so it opens at your preferred dimensions every time.
- **Batch mode All / None buttons now reflect state.** When every photo
  is selected, the **All** button shows the earth-tone fill (matching
  the active-chip style). When nothing is selected, the **None** button
  shows the earth-tone fill. Partial selection leaves both dim — quick
  visual confirmation of your current pick without having to eyeball
  the count.

### Under the hood
- New size state + pointer-based resize handler in `CategoryManager.jsx`
  (~60 lines). Uses `setPointerCapture` for smooth cross-boundary drags.
  Modal switches from Tailwind fixed-size classes to inline `style`
  width/height so pointer moves translate 1:1 to size updates.
- Batch buttons compute `allSelected` and `noneSelected` inline in
  App.js and swap classes accordingly. Data-attribute `data-active`
  added for future testing.

## v1.2.7 — 2026-02-17 · Tag Manager sticky-header unification

### Fixed
- **Only the pack title bar ("Wedding" / whichever pack you're editing)
  stays pinned at the top now.** The FOLDER PATH TAGS and FILENAME TAGS
  section headers were sticky in v1.2.6 (with the opacity fix) but Kurt
  pointed out that the Sub-Folders block header scrolls inline with
  content — the other two blocks should match. All three block headers
  now behave consistently: they scroll with their content, and only the
  pack title bar at the top of the panel stays pinned.

## v1.2.6 — 2026-02-17 · Tag Manager sticky-header + stale copy fix

### Fixed
- **Tag Manager section headers stayed transparent while scrolling** —
  "FOLDER PATH TAGS" and "FILENAME TAGS" section titles used a 40%-opacity
  background, so as the icon grid scrolled up, icons visibly bled through
  the title bar. Now uses a fully opaque surface background + a subtle
  bottom border and shadow so the sticky header cleanly hides content
  scrolling underneath. Reported by Kurt via screenshot.
- **Stale Sub-Folders help text** — the description under the Sub-Folders
  block still described the v1.1.6 "prepends its name" behavior with a
  `Sports/Baseball/…` example. Updated to reflect the v1.2.1+ ordering:
  "appends its name" with `Wedding/Ceremony/Brides family/…`.

## v1.2.5 — 2026-02-17 · Full-path chips in the on-image overlay

### Added
- **On-image overlay panel now shows every piece of the destination path**,
  not just the chips you dragged. The FOLDERS row now reads left-to-right
  in real path order:
  `[Pack] / [applied folder chips] / [Sub-folder]`
  So a photo tagged with the Wedding pack, Ceremony chip, and Brides
  family sub-folder shows all three inside the overlay next to the image
  — matching what the "Will store to:" preview line has been showing all
  along.
- **Context chips** (pack + sub-folder) look visually distinct from
  clicked chips: dashed border, small pin icon, muted background, no
  remove × button. Clear visual language that these are "from the top
  toolbar / active pack" rather than "I dropped this on this photo."
- Applies only to the FOLDERS row — pack and sub-folder don't contribute
  to filename, so the FILENAME row is unchanged.

### Under the hood
- New `contextFolders` prop on `IconOverlay`, split into `leading` (pack)
  and `trailing` (sub-folder) so path order stays natural
- New `ContextChip` sub-component with the read-only styling
- Overlay visibility check updated so the panel appears whenever there's
  ANY contributor (context or applied), instead of only when applied
  icons exist

## v1.2.4 — 2026-02-17 · Applied-chip highlight prominence

### Fixed
- **Applied tag chips now use the full earth-tone fill** (same styling as
  the active sub-folder button) instead of a 25%-tinted variant that was
  easy to miss at a glance. Clicking a lit chip still toggles it off,
  same behavior — just visually loud enough to actually stand out.
  Reported by Kurt via screenshot: "Ceremony" and "Bride" chips had subtle
  checkmarks but the fill needed to match how "Brides family" popped.

## v1.2.3 — 2026-02-17 · Auto-update + Auto-backup + Backup All button

### Added
- **Full auto-update from GitHub Releases.** Opt-in (Settings → Auto-Update).
  When enabled, PPS checks `github.com/PirateAK/Pro-Photo-Sorter/releases/latest`
  on launch. If a newer version is out, a banner slides in offering a
  one-click Download → Install & Restart flow. The user stays in control:
  no silent downloads, no silent installs. Update mechanism:
  `electron-updater` in the main process, `pps:update-status` IPC channel
  streams progress to the renderer.
- **Daily tag-pack auto-backup.** Once per calendar day, whenever a
  destination drive is connected, PPS silently writes a timestamped
  `pps-tagpacks_YYYY-MM-DD.pps-taglist.txt` snapshot to
  `<destination>/.pps-backups/`. Keeps the last 7 days on rolling
  retention. Opt-out via Settings → Auto-Backup Tag Packs. Restore any
  snapshot via Tag Manager → Import text list.
- **Backup All button** in Tag Manager footer. One-click download of a
  single `.zip` containing:
  - Every pack as a v3 JSON file (`json/<pack>.pps-tagpack.json`)
  - A plain-text snapshot of everything (`text/pps-tagpacks_YYYY-MM-DD.pps-taglist.txt`)
  - A `bundle.json` manifest
  Human-readable text and machine-readable JSON, both restorable.

### Electron shell changes (v1.2.3 setup)
- Added `electron-updater` as a runtime dependency.
- `main.js` — wires `autoUpdater` events to renderer, exposes
  `pps:check-for-updates`, `pps:download-update`, `pps:install-update`,
  and `pps:open-external` IPC handlers.
- `preload.js` — exposes `window.electronAPI.checkForUpdates`,
  `.downloadUpdate`, `.installUpdate`, `.onUpdateStatus`, `.openExternal`,
  `.appVersion`.
- `package.json` — new `publish: [{ provider: "github",
  owner: "PirateAK", repo: "Pro-Photo-Sorter" }]` block so
  `electron-builder` writes a `latest.yml` alongside the `.exe`.

### Under the hood
- New `frontend/src/lib/backups.js` — daily snapshot writer with
  rolling 7-day retention.
- New `frontend/src/components/UpdateBanner.jsx` — top-of-app banner
  parallel to the trial banner. Shows only when an update is pending.
- Extended `frontend/src/lib/electronBridge.js` — thin wrappers around the
  new IPC channels; each is a no-op in dev-server / plain browser.
- New default settings: `checkForUpdates: false` (opt-in),
  `autoBackupTagPacks: true` (opt-out), `lastTagBackupDate: ""` (bookkeeping).

### Publishing v1.2.3 (one-time setup on Kurt's PC)
After pulling + `pack-app.bat`, `electron-builder` produces both
`Pro Photo Sorter Setup 1.2.3.exe` and `latest.yml` in
`electron-shell\dist\`. **Upload BOTH** to the GitHub Release —
`electron-updater` uses `latest.yml` to find the correct `.exe`. This
step is critical: without `latest.yml` alongside the `.exe`, opted-in
users won't see the update.

## v1.2.2 — 2026-02-17 · Sub-folder round-trip fix (Export & Import)

### Fixed
- **JSON pack export now includes sub-folders.** Previously the "Export
  pack" button wrote `folderTags` + `filenameTags` only, silently dropping
  every sub-folder and every filename tag inside them. Pack files now
  carry a `subfolders: [{ name, iconType, iconName, iconData, filenameTags:[…] }]`
  array. File-format version bumped to `formatVersion: 3`.
- **JSON pack import now reads sub-folders.** The importer accepts the new
  v3 field and rebuilds each sub-folder with fresh ids. v2 files (folder +
  filename only) and legacy v1 files (single `tags` list) still import
  cleanly — no breaking changes.
- **Text list import now imports sub-folders.** The parser was already
  correctly extracting `##` sub-folder blocks; the Tag Manager's
  `importFromTextFile` handler was dropping them on the floor when copying
  the parsed pack into a new category. One line added: `subfolders: p.subfolders`.
  Kurt's morning of pack-building can now be restored from the text export
  in a single click.
- **Toasts show sub-folder counts** on both import paths so it's obvious
  when they came across.

### Under the hood
- Added `frontend/tests/tagpackText.roundtrip.test.mjs` — 20 regression
  cases covering parse, serialize, round-trip parity, and legacy backward
  compatibility. All passing.
- Fixed `frontend/src/lib/tagpackText.js` import path (`./storage` →
  `./storage.js`) so the module runs under native Node ESM for tests.
  Webpack build behavior unchanged.

## v1.2.1 — 2026-02-17 · Folder-path fix + Applied-chip highlight + Tag Manager drag-swap

### Fixed
- **Folder path now puts the SUBJECT first.** Order was
  `/[Subfolder]/[folder-tag chips]/…` — hard to browse when you had a lot
  of packs. New order:
  `/[Pack]/[folder-tag chips]/[Subfolder]/[filename].jpg`.
  Example: picking Wedding → clicking Ceremony chip → picking Brides family
  subfolder → clicking Brides mother filename tag now stores as
  `/Wedding/Ceremony/Brides family/…_Brides mother.jpg` (was
  `/Brides family/Ceremony/…`).
  - Applies to normal Store, batch Store, Resize-for-Print Store, and
    Auto-Enhance batch — all four use the same helper `composeDestFolderParts`
  - Live path preview updates to match

### Added
- **Applied tag chips stay highlighted.** Chips in the Folders + Filename
  bars now light up (earth-tone background + checkmark icon) when they've
  been used to tag the active image. Click a lit chip to remove it —
  clicking a dim chip still applies as before.
  - Works in batch mode too (highlights show chips applied to the current
    image; toggle-off applies to every selected image at once)
- **Drag any icon onto any tag chip in the Tag Manager to swap its icon.**
  Works from both the Built-in Icons grid and the Custom Image preview
  tile. Targets both main-pack chips (folder + filename lists) and every
  subfolder's filename tag chips.
- **Copy or move chips between sub-folders.** Three flavors:
  1. **Drag a chip** from one expanded sub-folder → drop on another
     sub-folder's expanded panel → **moved**
  2. **Ctrl+drag** the same way → **copied** (new chip gets a fresh id,
     same label + icon)
  3. **Right-click** any sub-folder chip → context menu with
     **Move to…** / **Copy to…** submenus listing every other sub-folder in
     the pack, plus a Remove item

### Under the hood
- New helper `composeDestFolderParts(activePack, folderParts, activeSub)`
  in `App.js` — single source of truth for destination folder ordering.
  Regression test at `frontend/tests/folderPath.test.mjs` (8 cases,
  all passing).
- `IconPalette` now accepts `appliedIds: Set<string>` + `onRemoveApplied`
  props. Palette chips read `appliedIds.has(it.id)` to decide their state.
- `CategoryManager` gained three new handlers: `swapItemIcon`,
  `swapSubfolderItemIcon`, `moveSubfolderItem` (`"move" | "copy"`).
- New drag payload types: `application/x-pps-iconswap` (icon drops) and
  `application/x-pps-sfitem` (subfolder item drags). Namespaced so they
  don't collide with the existing `application/x-pps-icon` (main image
  drops) or `application/x-pps-tagmgr` (folder ↔ filename list moves).

## v1.2.0 — 2026-02-17 · Trial Mode + Gumroad license activation

### Added
- **Trial Mode** — every unlicensed install now runs in Trial Mode. Stored
  photos automatically get:
  - A forced watermark reading `TRIAL - Pro Photo Sorter (unlicensed)`
    (overrides any custom watermark text the user may have set)
  - A `_TRIAL` suffix appended before the extension of every stored filename
    (e.g. `wedding_bride_smiling.jpg` → `wedding_bride_smiling_TRIAL.jpg`)
  - Both apply to normal store, batch store, and Resize-for-Print store flows
- **Trial banner** across the top of the app when unlicensed, with a
  one-click **"Activate License"** button that jumps straight to the
  License tab in the Help modal.
- **License tab in Help modal** with:
  - License key input (accepts Gumroad's `XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX` format)
  - **Activate** button — POSTs once to Gumroad's public
    `/v2/licenses/verify` endpoint, checks refund/dispute/subscription
    status and product identity, caches result in `localStorage` forever
  - **Buy Now** button — opens the Gumroad product page
    (`https://muskegman.gumroad.com/l/gvmaas`) in the system browser
  - **Deactivate on this PC** button (shown when licensed) — clears the
    local cache so the license can be moved to a new machine. If the user
    hits the Gumroad use-count limit later, a single email to
    `leaderteamk@gmail.com` resets it in 30 seconds.
- **`frontend/src/lib/license.js`** — new module owning:
  - localStorage schema `gvmaas.license.v1`
  - `activateLicense()`, `deactivateLicense()`, `isTrialMode()`,
    `applyTrialSuffix()`, `subscribeLicense()`
  - Hard-coded product ID `sxHfeHU-l7nk1-LAdVrQZA==`
- **Regression test** at `frontend/tests/license.trial.test.mjs`
  (10 cases, plain-node runnable).

### Design notes
- Activation is the ONLY internet call the app ever makes, and only once
  per install. After that, the app is 100% offline forever (matches Kurt's
  bush-plane / satellite / boat use cases).
- Trial output is intentionally hard to launder — both a visible watermark
  AND a filename suffix. Users buying a license get clean output.
- Deactivation client-side does NOT decrement Gumroad's use counter
  (that endpoint requires the seller's OAuth token, which cannot safely
  ship in an Electron app). This is a deliberate trade-off to keep the
  app 100% infra-free — no FastAPI proxy, no cloud services.

## v1.1.11 — 2026-02-16 · Main preview zoom+pan + Duplicate tag chip

### Added
- **Main preview zoom + pan** (`ZoomablePreview.jsx`) — Lightroom-style Loupe
  behavior on the main image viewer:
  - **Mouse wheel** zooms in/out toward the cursor position (clamped 0.25× to 8×)
  - **`=` / `+`** and **`-`** keys zoom in/out (no modifier — Ctrl+`=` still adjusts UI text size)
  - **Left-click drag** or **middle-click drag** pans when zoomed
  - **Small zoom badge** in the top-right of the viewer fades in on any zoom change
  - **Zoom controls** (bottom-right of viewer): ZoomOut · Fit · ZoomIn buttons
  - **Auto-reset to fit** whenever you navigate to a new image in the filmstrip
  - Cursor becomes grab/grabbing when zoomed
- **Duplicate tag chip** — right-click any tag chip in the palette bars →
  new "Duplicate chip" menu item. Creates a copy with same icon + label
  suffixed " (copy)" right after the original, then auto-opens the inline
  rename popover so you can tweak. Perfect for "Bride's Father" →
  "Groom's Father" pairs.

### Notes
- Zoom key `0` is NOT bound (kept free for the "clear star rating"
  shortcut). Use the on-screen Fit button (Maximize icon) to reset.

## v1.1.9 — 2026-02-16 · Full-label tooltips on every tag chip

### Changed
- **Tag chip tooltips now show the full label first.** Hover any chip in
  the Tag Manager (main lists AND sub-folder lists) or the palette bars
  and the browser tooltip pops the whole label — critical when you have
  similar tags like `Groom's Father` and `Groom's Brother` that both
  clip to `Groom's…` in the card.
- Sub-folder inline tag chips also gained a subtle `max-w-[240px]` +
  `truncate` so long labels wrap cleanly to the tooltip rather than
  stretching the row.

## v1.1.8 — 2026-02-16 · Visual Sub-Folder Editor in Tag Manager

### Added
- **SUB-FOLDERS section** in the Tag Manager, below the Filename tags list.
  Complete visual CRUD — no more hand-editing text files:
  - **Add** — type name, hit Enter or click Add
  - **Rename** — double-click the name or click the pencil icon
  - **Reorder** — up/down arrows on each row
  - **Delete** — trash icon (with confirm if the sub-folder has tags)
  - **Expand** — chevron reveals a mini filename-tags editor inside each
    sub-folder (add tag by Enter, remove with hover-x)
- Empty state hints new users toward the pattern
  ("build a hierarchy like Sports → Baseball → team names").
- New pack creation now seeds an empty `subfolders: []` list (previously
  was missing).

## v1.1.7 — 2026-02-16 · Default Location · Date-Tag Dropdowns · Sub-folder migration

### Added
- **Default EXIF Location** field in Settings. Type once (e.g. "Kenai,
  Alaska") and every photo shows it in the on-viewer Location chip. Chip
  shows a subtle `default` badge when using the default, distinct from the
  green "override" style you get when you manually type a per-photo value.
  Fallback chain is:
  1. Per-photo override (green outline, `edited` tooltip)
  2. Settings default (grey outline, `default` badge)
  3. EXIF GPS coords (if any)
- **Quick Date-Tag Dropdowns** beside the Help button in the top toolbar.
  Three compact dropdowns (Month / Day / Year) + an Apply button. Pre-fills
  from the current photo's EXIF date on load, so you only tweak. Apply
  pushes any non-empty parts as FILENAME tags onto the current image
  (e.g. `Aug · 14 · 2024` becomes three tag chips).

### Fixed
- **Existing users' Sports pack** from v1.1.4/v1.1.5 didn't inherit the new
  demo sub-folders (Baseball / Basketball / Football) because migration
  only ran on the wipe-and-reseed path. New auto-migration in `loadState`
  now seeds them into any Sports pack that has zero sub-folders, so
  upgrading users see the feature immediately without deleting anything.
  Sub-folders you've added yourself are never overwritten.

## v1.1.6 — 2026-02-16 · Nested Tag Packs (sub-folders), A-Z pack sort

### Added
- **Sub-folders under Tag Packs**. Each pack can now hold optional sub-folders
  with their own filename tags. When the picked pack has sub-folders, a new
  middle **SUB-FOLDER** bar appears between FOLDERS and FILENAME with a chip
  per sub-folder. Click a chip to:
  1. Prepend the sub-folder's name to the destination folder path
     (e.g. `Sports/Baseball/…`).
  2. Swap the FILENAME bar to show the sub-folder's filename tags.
  The parent pack's FOLDER tags stay in the top bar (inherit model).
  Bars without sub-folders (Wildlife, Portrait, etc.) look unchanged.
- **Demo sub-folders on the Sports starter pack**: Baseball, Basketball,
  Football — each with team-name filename tags. Restore Starter Packs will
  re-add these if needed.
- **Text-list format extended with `##` sub-folder headers**. Backwards
  compatible: old files (no `##`) parse identically to v1.1.5. Hand-editing
  a `.pps-taglist.txt` and importing it is a full path to custom
  sub-folders while the visual Tag Manager editor is being built.

### Changed
- **Tag Pack list always sorted A→Z**. Applied to both the Tag Manager
  sidebar AND the FOLDERS palette dropdown. Kurt's OCD-friendly.
- **Data model**: pack shape gains `subfolders?: [{ id, name, iconName,
  filenameItems: [] }]`. Migration is safe: any pack without the array
  gets an empty array on load, so v1.1.5 data works without change.

### Coming in v1.1.7
- Visual sub-folder editor inside Tag Manager (add / rename / delete /
  reorder sub-folders and their filename tags without editing text files).

## v1.1.5 — 2026-02-15 · Repeat Tags, safer Editor Done, A-Z tag sort

### Added
- **Repeat Last Tags button** in the destination panel (and keyboard
  shortcut `R`). One click re-applies the folder + filename tags from the
  most recently stored photo onto the current image. Perfect for shoots
  where 90% of frames share the same combo (e.g. a wedding ceremony run,
  a real-estate walk-through). The button also shows a live tag count in
  its tooltip so you know what you're about to apply. If the current photo
  already has tags, a confirm dialog protects against accidental overwrite.
- **A→Z sort toggle** on both the Folders and Filename tag bars. Small
  ArrowDownAZ icon button beside each pack picker. Setting is per-pack
  per-bar (so a pack can have Folders sorted A-Z while Filename stays in
  insertion order), and persists to localStorage.

### Changed
- **Editor "Done" now prompts before discarding or writing**. Previously,
  clicking Done with unsaved edits silently wrote an `_edit_*.jpg` next to
  the source. Now you get a three-way dialog:
  - **Save changes** — writes a new `_edit_TIMESTAMP.jpg` (original untouched)
  - **Discard** — closes and throws away edits (original untouched)
  - **Cancel** — back to editing, nothing happens
  Clicking Done with no edits still closes silently.

## v1.1.4 — 2026-02-15 · Six starter Tag Packs

### Added
- **Six ready-to-use starter Tag Packs** ship with every new install:
  - **Wildlife** — Mammals, Birds, Reptiles, Fish, Insects + portrait/action/flying/feeding/distant/closeup
  - **Wedding** — Getting-Ready, Ceremony, Portraits, Details, Reception, First-Dance + candid/formal/moment/wide/close/bw
  - **Portrait** — Headshot, Family, Couple, Kids, Corporate, Fine-Art + studio/environmental/profile/three-quarter/smile/moody
  - **Landscape** — Mountains, Coastal, Forest, Desert, Waterfall, Astro + sunrise/sunset/golden-hour/blue-hour/panorama/long-exposure
  - **Sports** — Game, Practice, Portraits, Team, Sidelines, Awards + action/keeper/celebration/close/wide/sequence
  - **Real Estate** — Exterior, Interior, Kitchen, Bedroom, Bathroom, Yard, Twilight + wide/detail/hdr/straight/lifestyle/aerial
- **Restore Starter Packs** button in Settings. Merges any missing starter
  packs into your library. Existing packs are never touched — only missing
  ones are added, so you can safely restore after deleting one or after
  updating from a v1.1.3-or-earlier install.

### Changed
- Legacy pack id `cat-default-1` from earlier v1.1.x builds is automatically
  retagged as `cat-starter-wildlife` on load so the new restore-dedup logic
  recognizes the pack as "already installed" and doesn't add a duplicate.
  All user customizations to items/labels are preserved.

## v1.1.3 — 2026-02-15 · Adjustable UI text size + filmstrip thumbnails

### Added
- **UI Text Size control** in Settings → Appearance. Five presets:
  Compact (90%), Default (100%), Comfortable (110%, **new default**),
  Large (125%), Extra Large (140%). Scales every label, button, tab,
  filmstrip caption, tree row, and modal body proportionally.
- **Keyboard shortcuts**:
  `Ctrl` + `=` bumps text size up one step,
  `Ctrl` + `-` bumps it down,
  `Ctrl` + `0` resets to Default (110% Comfortable).
- **Filmstrip Thumbnail Size control** in Settings. Four presets:
  Small (96px), **Medium (128px, default)**, Large (176px), Huge (224px).
  Bottom filmstrip row height grows with the thumbs so nothing crops.
- Settings persist to localStorage so they survive app restarts.

### Changed
- Bottom-right tagline now stacks cleanly on two lines: sales-pitch line
  ("Built for photographers") on top, app name ("Pro Photo Sorter") in
  earth-tone heading font below — no more mid-phrase wrapping.

### How it works
Scale is applied to the root `<html>` font-size. Because every Tailwind
size class in the app is `rem`-based (`text-xs`, `p-2`, `gap-1`, `h-8`,
etc.), containers, padding, and gaps grow in lockstep with the text —
nothing clips even at 140%. Icons and hard-coded panel widths intentionally
stay the same size, so your filmstrip, tree structure, and image viewer
keep their proportions. Filmstrip row uses a `--filmstrip-h` CSS variable
so the grid layout follows the selected thumb size.

## v1.1.2 — 2026-02-15 · File-tree refresh fix

### Fixed
- **Source file tree kept showing the previous folder** after switching to a
  new drive. (Destination worked only by luck when the two picks happened to
  have different leaf names.)
  Root cause: the tree remount key was derived from
  `FileSystemDirectoryHandle.name`, which Chromium reports as *only the leaf
  folder name* — not the full path. So picking `G:\Photos` then
  `C:\Users\Kurt\Photos` produced the identical key `"Photos"` and React kept
  the cached tree state.
  Fix: `App.js` now maintains `sourceTreeKey` / `destTreeKey` counters that
  bump on every pick (fresh pick, recent-pick, and startup reopen).
  `FileTree.jsx` folds that counter into its `TreeNode` key, guaranteeing a
  full remount and a fresh directory scan on every pick regardless of name.
- `frontend/package.json` version bumped to **1.1.2** so `pack-app.bat` stamps
  the installer as `Pro Photo Sorter Setup 1.1.2.exe` (previous v1.1.1 build
  was correct code-wise but wore the old version number).

## v1.1.1 — 2026-02-15 · Folder-picker deadlock fix

### Fixed
- **Folder picker deadlock**: after opening any source or destination folder,
  trying to pick a different one threw "File picker already active" and the
  entire session was locked until the app was closed and reopened.
  Root cause: passing a persisted directory handle as `startIn` to Chromium's
  `showDirectoryPicker` marks that handle as in-use, blocking future picks.
  Fix: strip `startIn` at the `fsapi.js` layer entirely — Chromium already
  remembers the last picked directory per-`id`, so no functionality is lost.
- **Chromium-blocked system directories** (`C:\`, `C:\Windows`,
  `C:\Program Files`) now show a specific error message telling the user to
  pick a subfolder (e.g. `C:\Users\YourName\Pictures`) instead of a raw
  browser exception.
- **Recovery "Restart window" button** in the picker-error toast reloads the
  app window in-place — resets Chromium's picker state without closing
  Electron. All tag packs, ratings, and settings survive (they live in
  localStorage, unaffected by a reload).

### Added
- Module-level concurrency lock in `pickDirectory` — a second pick call while
  another is open throws a friendly "PickerBusyError" instead of stacking.
- Longer 12–20 s duration on picker-error toasts so users have time to read
  the recovery instructions.
- USER_GUIDE.md section documenting which system folders Windows blocks and
  how to work around it.

---

## v1.1.0 — 2026-02-15 · Paired-list Tag Packs + In-App Help

### Added
- **Paired-list Tag Packs** — every pack now holds two lists: `Folder path tags`
  and `Filename tags`. Picking a pack from the Folders bar fills both rows at
  once. Fixes the "same tags in both bars" duplication of v1.0.
- **Drag between sections** in Tag Manager — grab a tag card, drop it in the
  other section, it reassigns. Toast confirms with an Undo button.
- **Bulk paste** — a "Paste…" button on each list section accepts a newline-
  separated list of labels and adds them all at once. `//` prefix = comment.
- **Plain-text pack format** (`.pps-taglist.txt`) — author packs in Notepad,
  one column, `# PackName` header, blank line separates folder tags from
  filename tags, multiple packs per file supported.
  - **Import text list…** button in Tag Manager
  - **Export as text** button next to Export pack — turns any pack into a
    shareable `.txt`
- **In-app Help modal** — top-toolbar Help button (or `F1` / `?`) opens a five-
  tab window: Quick Start · User Guide · Shortcuts · Changelog · About.
  Docs bundled into the app so they travel with the installer.
- **Print button** in the Help modal — prints the current tab via the OS print
  dialog. Useful for pinning the Shortcuts sheet next to your desk.
- **Help / About tab** shows version + build date + credit line for bug reports.

### Changed
- Tag Manager UI rebuilt as a two-section editor (`FOLDER PATH TAGS` /
  `FILENAME TAGS`), each with its own icon picker, Add button, Paste button,
  and tag grid.
- Filename palette bar no longer shows a redundant pack-name label; the
  Folders dropdown drives both rows.
- Storage key bumped `pps.state.v2` → `pps.state.v1_1`. Legacy tag packs are
  replaced by a single "Wildlife (Example)" starter (per Captain Kurt's
  approval to wipe on release). Ratings, watermark settings, and other
  preferences are preserved.
- Tag pack export format bumped to `formatVersion: 2` — carries both
  `folderTags` and `filenameTags`. Legacy v1 files auto-import into the
  folder list for backward compatibility.
- `run-app.bat` and `pack-app.bat` now auto-sync `USER_GUIDE.md`,
  `QUICK_START.md`, and `CHANGELOG.md` into `frontend/public/docs/` before
  every build. Doc edits appear in the app on next launch, no manual copy.

### Fixed
- Watermark toggle relocated below the Rate stars bar as a proper switch
  (© knob) instead of a small pill inside the Resize row.
- Tidy © badge on the top-left of the photo when watermark is ON.
- Main viewer left/right nav arrows and the filename pill restyled with the
  `icon-overlay` treatment for better legibility.
- Keyboard hint chips (`Space`, `Del`, `S`) fixed in both dark and light
  themes — previously invisible in light mode.
- Installer version filename now stays in sync with `frontend/package.json`
  via a small `pack-app.bat` step; no more `Setup 1.0.0.exe` when the app is
  actually 1.0.5.

### Storage note
On first launch after upgrading from v1.0.x, your legacy tag packs will be
replaced by the new starter. You can re-import any you exported previously
via **Import pack…** (the v1 JSON format is backward-compatible).

---

## v1.0.5 — 2026-02-15 · UI polish + installer name sync

### Added
- Watermark toggle bar in the viewer with a © knob switch.
- Tidy © badge in the top-left of any photo whose watermark is ON.

### Fixed
- Nav arrows in the main viewer restyled for legibility.
- `Space` / `Del` / `S` hint chips now readable in both themes.
- `pack-app.bat` stamps the installer version from `frontend/package.json`.

---

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

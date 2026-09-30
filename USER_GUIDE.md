# Pro Photo Sorter — User Guide

A fully offline Windows desktop app for photographers who shoot faster than they file. *(The version you're running is shown in the Help window title bar.)*

This guide walks you through every feature. If you just want to install and
start sorting, see **QUICK_START.md** first.

---

## Table of Contents

1. [The Big Picture](#the-big-picture)
2. [Layout at a Glance](#layout-at-a-glance)
3. [File Trees — Source & Destination](#file-trees--source--destination)
4. [The Filmstrip](#the-filmstrip)
5. [Tag Packs & Tags](#tag-packs--tags)
6. [Sorting a Photo](#sorting-a-photo)
7. [Star Ratings](#star-ratings)
8. [Full-Screen Cull Mode](#full-screen-cull-mode)
9. [Image Editor](#image-editor)
10. [Watermarks](#watermarks)
11. [Resize to Print Size](#resize-to-print-size)
12. [Batch Actions](#batch-actions)
13. [Search](#search)
14. [Recent Folders](#recent-folders)
15. [Drive & Space Info](#drive--space-info)
16. [Settings](#settings)
17. [Keyboard Shortcuts](#keyboard-shortcuts)
18. [Reporting Bugs](#reporting-bugs)

---

## The Big Picture

You point the app at a **source** folder (where your unsorted photos live) and
a **destination** folder (where sorted photos should end up). You then click
tags to build a destination path and filename. One click stores the photo,
another skips or deletes it. Repeat until the source is empty.

All work is **local**. No internet needed, no cloud, no upload. Everything
is stored in your local browser storage inside the Electron app.

---

## Layout at a Glance

```
┌───────────────┬──────────────────────────────────────────┬───────────────┐
│               │                                          │               │
│  SOURCE       │           VIEWER FRAME                   │  DESTINATION  │
│  file tree    │        (the current photo)               │  file tree    │
│               │                                          │               │
│               │      + EXIF chips, ratings, actions      │               │
│               │                                          │               │
├───────────────┴──────────────────────────────────────────┴───────────────┤
│                                                                          │
│     TAG BARS  (drag or click to add tags to the photo)                   │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│     FILMSTRIP  (thumbnails of the current source folder)                 │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## File Trees — Source & Destination

Both panels behave the same way:

- **Open** — pick the folder to work with. Windows remembers the last one you
  used per side.
- **Recent Folders** (little clock icon) — reopens folders you've used before.
- **Right-click on a destination folder** — rename, create a subfolder,
  or delete (empty folders only, to be safe).
- **Selection** — click any folder to make it the "current" one. The filmstrip
  updates for the source; the destination tree just highlights.
- **+N badges** — the destination tree shows a green pill next to any folder
  that received photos in your current session, so you can see at a glance
  where your work is going.

### System folders you can't pick

Windows / Chromium blocks a handful of sensitive locations from the folder
picker for security reasons. If you try one, you'll see an error message
naming the block. These are:

- `C:\` (the drive root itself)
- `C:\Windows` and its subfolders
- `C:\Program Files`, `C:\Program Files (x86)`
- Sometimes `C:\Users` root (before you drill into your own user folder)

**Pick a subfolder instead**, e.g.:

- `C:\Users\YourName\Pictures` ✓
- `C:\Users\YourName\Desktop\WeddingShoot` ✓
- `D:\Photos`, `E:\Backup` — non-system drives work at any level ✓
- Any folder you created yourself ✓

If you accidentally try to pick a blocked folder and the picker gets stuck,
**close the app and reopen it** — Chromium's internal picker flag doesn't
reset until the app restarts.

## The Filmstrip

The strip along the bottom shows thumbnails of every image in the currently
selected source folder.

- **Click** a thumb to switch to it.
- **Shift+click** to select a range (for batch actions).
- **Ctrl+click** to add/remove individual thumbs from the batch selection.
- **Star overlay** — quick stars are drawn on top of thumbs you've rated.
- **Autoscroll** — the current thumb always scrolls into view.
- **Arrow keys** — Left / Right walk through the filmstrip.

## Tag Packs & Tags

**Tag Packs** are named collections of tags (icons + text). Think of them as
category groups: "Wedding", "Wildlife", "Real Estate", etc.

**Tags** live inside packs and have:
- an **icon** (from Lucide's icon library — hundreds available)
- a **label** you type in
- a color chip you pick

Two tag bars sit between the viewer and the filmstrip:
- **Folders bar** — tags dropped here build the destination *folder path*.
  Example: `Wedding / Ceremony / Bride` → files land in
  `Wedding\Ceremony\Bride\...`
- **Tags bar** — tags dropped here are appended to the *filename*.
  Example: filename becomes `IMG_0421_bride_smiling.jpg`.

### Managing Tag Packs

Click the **Tags** button in the toolbar to open the Tag Manager:

> **New in v1.6.0 — the editor works the way the Tag Pack Creator does.**
> Pick the category in the left list, then in the middle pane choose **where the text goes first** — **Folder**, **Sub-Folder** or **Filename** — type a name (or paste a comma-separated list, 20 at a time) and press **Enter**. The choice stays lit, so it's type–Enter–type–Enter for a long list.
> The display is a *waterfall*: **FOLDERS** (top level) → **SUB-FOLDERS · X** for whichever folder you highlight → its **FILENAMES**. Click a folder to highlight it (this arms **Filename**); click **Sub-Folder** to nest inside it. With the text box empty, **← →** hop between sibling folders, **↓** steps into one, **↑** steps back out.
> Right-click any chip to rename it or pick an icon. The **Tag box** at the bottom lists every filename tag in the pack — drag one onto a folder to add it there. Deleted tags still go to **Trash**; big changes still snapshot to **History**; the **Icon Holders** rail on the right still works (arm an icon, click a chip).


- **Add pack** / **Rename pack** / **Delete pack**
- **Add tag** inside either list (Folder or Filename), choose icon and label
- **Paste…** button on each list — paste one label per line and click "Add all" to
  bulk-create tags in seconds
- **Right-click a tag** in the palette bar to rename or delete inline
- **Drag a tag** between the Folder and Filename sections in Tag Manager to reassign it
- **Drag a tag** between packs (in the palette bars) to reorganize
- **Import pack** (`.pps-tagpack.json`) or **Export pack** to share as JSON
- **Import text list** (`.pps-taglist.txt`) — plain-text format below, one or more
  packs per file
- **Export as text** — turns any pack into a shareable `.pps-taglist.txt`
- **Export bundle** (`.zip`) to package every pack in one archive
- **Ship…** (v1.7.0) — from the Bundle picker: one `.pps-shipper.json` with the
  ticked packs, up to 3 preview images (auto-shrunk), a title, description,
  your **author** name and **link**. Buyers pick it with **Import pack…**, see a
  preview, click **Import N packs**, and each pack runs through Merge / Replace /
  Create new. Author, link and description are remembered for next time.

### Text-list format (`.pps-taglist.txt`)

Author packs in Notepad and share them as `.txt`. Format:

```
# Wedding                  ← pack name, line starts with #
Ceremony                   ← folder tags, one per line
Reception
Portraits

Bride                      ← BLANK line → filename tags start here
Groom
First-Kiss

# Wildlife                 ← another # starts the next pack
Mammals
Birds
Reptiles

Portrait
Action
Flying

// lines that start with // are comments and get ignored
```

Every imported tag gets the default `Tag` icon — you can promote any of them to
a specific Lucide icon in the Tag Manager later.

Starter packs (`landscape`, `wedding`, `portrait`, `wildlife`, `sports`,
`real-estate`) live in `starter-packs/` inside the app folder. You can also
import them via the Tag Manager.

## Sorting a Photo

The workflow, once you have source, destination, and a tag pack loaded:

1. Click a thumb (or press an arrow key) to select the photo.
2. Drag tags into the **Folders bar** to shape its destination path.
3. Drag tags into the **Tags bar** to shape its filename.
4. Click **Store** — the photo is *copied* into the built path and the
   filmstrip auto-advances.
5. Repeat.

Alternative actions:
- **Move** — same as Store but *deletes* the source file after copy.
- **Skip** — advance without storing.
- **Delete** — remove the source file entirely.

Nothing is destroyed without your click. Store never touches the source.

## Star Ratings

Every photo can carry a 0–5 star rating.

- Set stars from the toolbar or by pressing `0`–`5`.
- Stars persist across sessions.
- Star filters live in the Search modal.
- Use `Auto-Rate` in the toolbar to run a focus/exposure heuristic that
  guesses a rating for the current photo (or your batch selection).

## Full-Screen Cull Mode

Click **Cull** in the toolbar. This gives you:

- Big preview, no chrome
- Left/Right to walk, `1`–`5` to rate, `Delete` to trash
- Great for a quick first-pass rate-and-reject sweep

Press `Esc` to return to the main layout.

## Image Editor

Click **Edit** on the current photo. Non-destructive tweaks:

- Crop with a movable box, ratio-locked or free
- Exposure, contrast, saturation, temperature, tint
- Rotate & flip
- Auto-Tone (analyzes the histogram and adjusts)
- Save the edited version alongside the original with a `_edit` suffix

## Watermarks

The watermark system lives inside the toolbar and Batch modal.

- Set the watermark **text**, **font**, **position** (drag it on the preview),
  **scale**, **opacity**, and **Light/Dark** style.
- Toggle watermark **for this photo only** with the quick pill in the toolbar
  or right-click the viewer.
- Toggle watermark **for the whole batch** with the batch modal switch.

Watermarks are applied at export time — the source file is never changed.

## Resize to Print Size

Aspect-ratio store buttons (in the toolbar): **4×6**, **5×7**, **8×10**,
**11×14**. Click one and a **Resize Crop Preview** modal opens:

- Preview the exact print crop (letterboxed or filled)
- Drag the crop box around the photo to control what's kept
- Pick output DPI (default 300 DPI)
- Click **Store** — a cropped + resized copy lands in the destination

Templates and tags are inherited, so the file still routes correctly.

## Batch Actions

Select multiple thumbs (Shift-click or Ctrl-click), then click **Batch** in
the toolbar. From there:

- Store / Move / Delete / Skip the whole selection
- Apply a watermark to the batch
- Apply an aspect-ratio resize to the batch
- Batch-rename via a template (`{date}_{location}_{n}` etc.)

## Search

Click **Search** in the toolbar. Filters include:

- Filename substring
- Star rating range
- Date range (from EXIF)
- ISO / focal length / aperture ranges
- Camera model

Results appear in a scrollable list; click any hit to jump to that photo.

The search has a **Stop & Load Partial** button for big folders — if you're
already looking at the shot you wanted, you don't have to wait for the full
scan to finish.

## Recent Folders

Next to the **Open** button on both panels, a little dropdown remembers up to
five recent folders per side. Chrome/Electron re-verifies read/write
permission each time you reopen.

## Drive & Space Info

Click the **🖴 Drives** button next to the Open button on either panel to see
a live snapshot of every drive on the system:

- Drive letter and volume label
- Total capacity
- Free space
- Used space with a bar chart

At the bottom of both panels, a small "System free" chip shows the total free
space across all drives so you know at a glance when it's time to plug in
another disk. This information requires the desktop (Electron) build to be
running — in a plain browser, the chip is hidden.

## Settings

The gear icon opens Settings:

- **Theme** — Light / Dark
- **Filename template** — how automatic filenames are built
- **Star rating hotkeys** — enable/disable `0`–`5` shortcuts
- **Default tag packs** for the two bars
- **Auto-Tone toggle** for the Edit modal

## Keyboard Shortcuts

| Key                | Action                                          |
| ------------------ | ----------------------------------------------- |
| `←` / `→`          | Previous / next photo                           |
| `Space`            | Store the current photo                         |
| `M`                | Move (Store + delete source)                    |
| `Del`              | Delete the current photo                        |
| `S`                | Skip                                            |
| `0`–`5`            | Star rating                                     |
| `Ctrl+F`           | Open Search                                     |
| `Ctrl+B`           | Open Batch modal                                |
| `Ctrl+E`           | Open Image Editor                               |
| `Ctrl+Shift+W`     | Toggle watermark for this photo                 |
| `F1` / `?`         | Toggle this Help window                         |
| `Esc`              | Close any modal / exit Cull Mode                |

## Reporting Bugs

The bottom-right corner of the Destination panel shows the version and build
date, e.g. `v1.4.7 · 2026-02-13`. **Please include this string** in any bug
report so we know exactly which build you're on.

Screenshots, the source folder path, and the exact steps to reproduce are
gold — the more you share, the faster the fix.


---


# New in v1.4.7 (February 2026)

Everything below is **added on top** of the v1.3 workflow above — nothing was removed. If your muscle memory is from v1.3, keep doing what you're doing; the new features surface as extra buttons and gestures.

## Splash Screen on Upgrades

The first launch after installing a new version shows a one-page splash listing what changed. Click **Get Started** to dismiss it. A version-keyed sentinel makes sure it doesn't nag you again on subsequent launches — until the next version.

You can force it back at any time from **Settings → Show welcome splash next launch**.


## Sample Photos on First Run

On very first launch we drop a small demo folder of nature photos in your `Documents\Pro Photo Sorter\Samples\` so you can practice sorting before touching your own shoot. When you load your own source, the samples slide out automatically.

Restore or hide the samples any time from **Settings → Sample photos → Show me again next launch**.


## Multi-Source Roots

Your primary source loads with **Load Source** in the top-left. To add a second one alongside it (SD card + archive drive, for example), click the **+ Add another source** row in the same panel.

- The filmstrip splits into two rows — one per source — so you can pull from both without unloading either
- A collapsible accordion header keeps each source tidy
- Cross-source drag works: pull a chip from any source into the tag pipeline; storing writes it wherever you point


## Unlimited Nested Sub-Folders

Sub-folders inside a Category can nest as deep as you want. The Tag Manager renders a tree line rail so you always know how deep you are. Sample flow:

```
Sports  (category)
└─ Baseball (AL)                      ← top-level sub-folder
   ├─ Baltimore Orioles               ← nested (depth 2)
   │  ├─ Adley Rutschman              ← nested (depth 3)
   │  └─ Gunnar Henderson
   └─ Boston Red Sox
      ├─ Rafael Devers
      └─ Trevor Story
```

Every level is renamable (double-click), reorderable (up/down arrows or drag), collapsible (chevron), and its own filename tags carry through the destination path.


## Custom Filename Templates

Settings has a **Filename template** section. Pick a preset (Legacy PPS, Photographer-friendly, Date-first, etc.) or save your own using tokens like:

- `{stars}` — star rating, e.g. `★★★☆☆`
- `{tags}` — every filename tag joined with `_`
- `{date}` — EXIF date in `YYYY-MM-DD`
- `{orig}` — original filename without extension
- `{seq}` — 3-digit sequence within the current run

Templates are validated live — a bad token turns the field red before you can save.


## Smart Paste (Rosters)

Any input labeled "New tag…" or "New sub-folder name…" understands:

- **Commas** — `Devers, Bogaerts, Story`
- **Newlines** — one label per line (Excel column paste works)
- **Semicolons** — `Devers; Bogaerts; Story`

Paste 3 names, hit **Add**, and you get 3 separate chips. The button label updates to `Add 3` so you know how many will be created before you commit.

Alongside the input there's also a dedicated **Paste list** button that opens a big text area for larger rosters. Rosters of 250+ items trigger a "Continue?" confirm dialog so a fat-finger doesn't lock up the app; anything over 2,000 items gets trimmed automatically with a friendly toast.


## Cross-Folder Tag Drag

Drag any filename-tag chip onto another sub-folder row (even one that's collapsed — the row auto-expands after ~500ms). Drop to **move**; hold **Ctrl** while dropping to **copy**. Works in three flavors:

1. **Top-level** — drag a chip out of one top-level sub-folder onto another
2. **Cross-sibling in nested** — inside a nested tree (e.g. Orioles → Red Sox), drag between team siblings
3. **Cross-category** — drag onto any category name in the left rail to send the chip to that pack's `_Unsorted filenames` bucket


## Multi-Select + Bulk Actions

Every sub-folder's chevron-expanded chip area has a **[Select]** toggle button in its header.

Flip it ON:
- A checkbox appears on every chip
- Click any chip (anywhere on it — not just the checkbox) to tick it
- A floating bar slides in below the chips: `[N tags selected] · Select all · Clear · Convert · Delete`

Available bulk actions:
- **Delete** — every ticked chip goes to Chip Trash (undoable)
- **Convert** — every ticked chip becomes its own nested sub-folder under the parent, with icon + name preserved. Collisions are skipped.
- **Drag** — dragging any ticked chip carries the whole selection; drop on another sub-folder row to move them all together

Multi-select works on:
- Top-level sub-folder chips (Wildlife → Mammals → Red Fox / Black Bear / Moose…)
- Nested chips (Sports → Baseball(AL) → Baltimore Orioles → players)

**Single-click highlight**: Even with Select mode OFF, clicking a chip lights it up briefly so you get visual feedback that "yes, PPS heard you". Click again to un-highlight.


## Chip Trash (Undo)

Every filename-tag delete anywhere in the Tag Manager lands in a **Trash** bin. The button lives at the top of the Tag Manager and shows a live count: `Trash · 3`.

Open it to see:
- Every deleted chip with its icon
- Breadcrumb path — `from Wildlife › Mammals`
- Relative timestamp — `just now` / `2m ago` / `3d ago`
- Checkboxes so you can Restore a subset
- **Restore selected** puts them back in their original sub-folder (with `(restored)` suffix if a name collision happens)
- **Empty trash** clears the bin permanently (asks first)

The bin is capped at 200 items with oldest-first evict so it never leaks storage.


## Compare View — Active Follows Click (v1.4.7)

Toolbar buttons **×1 / ×2 / ×3** switch how many images sit side-by-side. In v1.4.7 the compare view has a strict "active follows click, images stay put" rule so you can inspect a fixed set of similar shots without the strip sliding out from under you.

**What clicking a pane does:**
- Moves the ACTIVE ring + label to that pane. Zero image reshuffle.

**When the images slide (four triggers, exactly):**
1. **Store the active photo** — its pane pulses green ("Stored ✓"), the strip shifts one to the left, and a fresh photo lands in the rightmost pane.
2. **Delete the active photo** — same behavior as Store.
3. **Left / Right nav arrow** (or ← / → keys) — whole strip shifts one; ACTIVE stays pinned in the same pane position.
4. **Filmstrip click** — the clicked photo loads into the ACTIVE pane. The window auto-shifts so the click lands under the ring.

**Other compare-mode goodies:**
- Every pane is independently zoomable — mouse wheel over any pane zooms just that one
- Star rating (1-5, 0) still applies to the active (highlighted) pane
- Press **×1** to return to single view for tagging & icon-drag


## Editor Round-Trip (v1.4.6+)

Open a photo in the Editor (Ctrl+E), crop or rotate, hit Save. The new `<original>_edit_<timestamp>.jpg` file **inherits every folder tag, filename tag, and the star rating** from the original photo — no re-tagging after a quick edit.

Also in the Editor:
- **Auto-Enhance toggle** — one click balances tone, saturation, and mild sharpen. Toggle it off to compare against the original.
- **Draw crop region → floating Apply pill** — as soon as you draw a crop rectangle, an Apply/Cancel pill hovers over the top-center of the stage so it's always in reach. Apply crop bakes the crop in-place so you can keep editing on the cropped version.
- **Reset to last** — 10-step history of destructive edits. One click reverts just the most recent bake. **Reset all** wipes every edit and reloads the original.
- Cancel also exits crop mode (the "Draw crop region" toggle un-lights) so you're never stuck in cropping mode.
- **Slider quick-reset** — click the value pill on any slider to snap it back to default.


## Resize Crop — Orientation Toggle & Corner Drag (v1.4.6+)

The Resize modal (open via any 4×6 / 5×7 / 8×10 / etc. button) has been upgraded:

- **Auto / Tall / Wide** buttons in the header force the crop into portrait or landscape shape regardless of the source photo's orientation. Auto = match source.
- **Four corner handles** on the crop rectangle let you shrink the crop to as tight as 20% of the max fit. Aspect ratio stays pinned so the print size is always honoured.
- **Drag inside** the crop to reposition; **Auto-center · Max size** button resets to full-size centered.
- The preview canvas now sizes itself to match the source photo's aspect ratio, so portrait sources no longer letterbox awkwardly inside a fixed landscape frame.
- Live readout in the corner: `size: XX% · center: x XX% · y XX%`.


## XMP Sidecars for Lightroom (v1.4.6+)

Every Store now drops a companion `.xmp` sidecar next to the JPEG. Lightroom, Bridge, and Capture One pick these up automatically.

**What's in the sidecar:**
- `xmp:Rating` — your star rating (1-5, or omitted if you didn't rate)
- `dc:subject` — a keyword bag containing every folder tag AND every filename tag applied to the photo
- `xmp:CreatorTool` — the Pro Photo Sorter version that wrote the file

**Lightroom Classic setup (one-time):**
1. Edit → Preferences → Metadata → tick **Automatically write changes into XMP** *(this is for LR itself; Pro Photo Sorter writes sidecars unconditionally)*
2. Import your Pro Photo Sorter destination folder
3. Right-click the folder → **Read Metadata from Files** to force a scan on first import

After that, every future Store is picked up automatically on your next Sync.

**Sidecar naming:** `PhotoName.jpg` → `PhotoName.jpg.xmp` (the Adobe-preferred full-basename convention).

**Opt-out:** Currently on by default with no UI toggle. If you *don't* want sidecars, edit `%APPDATA%\Pro Photo Sorter\<settings>.json` and set `"writeXmpSidecar": false`. A proper toggle will land in Settings when there's demand.


## Compare-Mode Store Flourish (v1.4.6+)

Storing a photo in ×2 / ×3 view now paints a green "Stored ✓" pulse on the pane you filed before the strip shifts on. Batch stores skip the pulse to avoid spamming the screen.


## Thumbnail Loading + Cache Stats

The filmstrip now shows a dashed-border placeholder with a spinning ring while a thumbnail is being generated. Broken thumbnails get a red X badge so you can spot them at a glance.

Settings → **Thumbnail cache** shows:
- Total cache size in MB
- Number of thumbnails cached
- A **Clear** button that asks for confirmation before wiping (so you don't nuke a warm cache accidentally)


## Keyboard Shortcuts (all)

| Key | Action |
| --- | --- |
| Arrow keys | Previous / next photo (or shift the strip in ×2/×3) |
| 1 – 5 | Set star rating |
| 0 | Clear star rating |
| Space | Toggle repeat-last-tags |
| Ctrl+E | Open Image Editor |
| Ctrl+S | Store current photo |
| Ctrl+Shift+W | Toggle watermark for this photo |
| \\ or \` | Peek original (hold) inside Editor |
| Enter | Commit current tag input |
| Esc | Close pop-over / cancel crop / disarm icon |
| F1 or ? | Toggle Help |
| ×1 / ×2 / ×3 | Cycle compare view |


## Getting Help

- **Splash Screen** — from Settings → Show welcome splash next launch
- **Coach-Mark tour** — from Settings → Show me again next launch (walks you through Load Source, Tag Manager, filmstrip)
- **In-app Help panel** — Help button in the top toolbar
- **Support email** — see ReadMe.txt on your install thumb drive


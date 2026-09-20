# Pro Photo Sorter — User Guide

**Version 1.0.0** · A fully offline Windows desktop app for photographers who
shoot faster than they file.

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

- **Add pack** / **Rename pack** / **Delete pack**
- **Add tag** inside a pack (choose icon, label, color)
- **Right-click a tag** to rename or delete inline
- **Drag a tag** between packs to reorganize
- **Import pack** (`.pps-tagpack.json`) or **Export pack** to share
- **Export bundle** (`.zip`) to package every pack in one archive
- **Import bundle** (`.zip`) to restore an entire library

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
date, e.g. `v1.0.0 · 2026-02-15`. **Please include this string** in any bug
report so we know exactly which build you're on.

Screenshots, the source folder path, and the exact steps to reproduce are
gold — the more you share, the faster the fix.

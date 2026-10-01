# Pro Photo Sorter — Quick Start

**Version 1.4.7 · Fully offline · Windows desktop**

---

## Install (60 seconds)

1. Double-click **Pro-Photo-Sorter-Setup-1.8.0.exe**
2. If Windows shows a blue "SmartScreen" warning: **More info → Run anyway** (indie app, not Microsoft-signed)
3. Wait for the installer to finish. The app opens automatically.

Installed to: `C:\Users\<You>\AppData\Local\Programs\Pro Photo Sorter\`

---

## First launch (2 minutes to a sorted photo)

1. **Splash Screen** welcomes you — click "Get Started". Won't nag again until the next version.
2. **Sample photos** are pre-loaded so you can practice sorting before touching your own.
3. Click **Load Source** (top-left) → pick a folder of photos. They appear in the filmstrip.
4. Click any photo → arrow keys / arrow buttons move through. Press **1–5** to rate.
5. Open **Tag Manager** (toolbar) → pick a Category → press **Folder / Sub-Folder / Filename**, type a name, **Enter** (repeat). Click a folder to work inside it; **← → ↓ ↑** hop around from the text box. The path preview shows where photos will land, e.g. `Wildlife / Bears / Grizzly / Alaska_Trip`.
6. Store the photo with **Ctrl+S** (or the Store button). Originals never overwritten — a fresh JPG is written to your destination **with a matching `.xmp` sidecar** so Lightroom sees your stars + tags on next import.

---

## Top 8 gestures

| Gesture | What it does |
| --- | --- |
| **Click chip** | Highlights it (visual feedback) |
| **[Select] button** in a sub-folder row | Reveals checkboxes for multi-select |
| **Drag chip** | Move to another sub-folder (Ctrl-drag = copy) |
| **Paste list** button | Bulk-add many chips from a comma/newline/semicolon list |
| **Right-click chip** | Move-to / Copy-to menu across every sub-folder |
| **Trash button** (Tag Manager header) | See & restore recently deleted chips |
| **`\`** or **`` ` ``** | Peek the original inside the Editor |
| **1–5** | Star-rate the current photo (0 clears) |

---

## Multi-select workflow

1. Expand a sub-folder chevron in the Tag Manager
2. Click **[Select]** on the right side of its "Filename tags for…" header
3. Click chips to tick them — a floating bar appears: `3 tags selected · Select all · Clear · Convert · Delete`
4. **Delete** sends every ticked chip to Chip Trash (undoable)
5. **Convert** promotes every ticked chip to its own nested sub-folder
6. Or drag any ticked chip → all selected chips move together

---

## Compare view — side-by-side sorting

- Toolbar shows **×1 / ×2 / ×3** — switches how many images sit side-by-side
- **Click any pane** → moves the ACTIVE ring + label there. Images do NOT slide.
- **Store** the active photo → a green "Stored" pulse paints the pane, then the strip shifts one to the left
- **Left/right arrows** → whole strip shifts one; ACTIVE stays pinned in the same pane
- **Filmstrip click** → the clicked photo loads into the ACTIVE pane
- Each pane is independently zoomable (mouse wheel over the pane)

---

## Editor round-trip (v1.4.6+)

Open a photo in the built-in Editor, crop or rotate, hit Save.
The new `<original>_edit_<timestamp>.jpg` inherits **every folder tag, filename tag, and the star rating** from the original — no re-tagging needed.

---

## Resize crop — orientation + corner drag (v1.4.6+)

In the Resize modal:
- **Auto / Tall / Wide** buttons force the crop into portrait or landscape shape regardless of the source
- **Four corner handles** let you shrink the crop to 20% of max fit — aspect ratio stays pinned so the print size is honoured
- **Drag inside** the crop to reposition; **Auto-center** resets to max fit + centered

---

## Lightroom sync (XMP sidecars)

Every Store now drops a `PhotoName.jpg.xmp` next to the JPEG containing your rating + keywords.
- **Lightroom Classic**: enable *Metadata → Read metadata from files*, then right-click the folder → *Read Metadata from Files*
- **Bridge / Capture One**: automatic on next catalog refresh

Your tagging work now travels with the photos.

---

## License / Trial

Every stored file gets `_TRIAL` appended until you paste a license key from Gumroad into Settings. The suffix disappears instantly and you can batch-rename older `_TRIAL` files from the same panel.

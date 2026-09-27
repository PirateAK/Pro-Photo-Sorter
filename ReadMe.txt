========================================================================
              PRO PHOTO SORTER — READ ME FIRST
                      Version 1.4.7  (February 2026)
========================================================================

Thanks for grabbing Pro Photo Sorter. This is a fully offline Windows
desktop app for photographers who shoot faster than they file — no
cloud, no subscription, no accounts. Your photos never leave your
machine.


------------------------------------------------------------------------
  WHAT'S NEW IN 1.4.7  (highlights since 1.4.5)
------------------------------------------------------------------------

  XMP SIDECARS FOR LIGHTROOM
     Every stored photo now drops a matching .xmp file alongside it
     with your star rating and every folder / filename tag inside.
     Lightroom, Bridge, and Capture One pick these up automatically
     on their next catalog import — your tagging work is portable
     across your whole DAM chain.

  EDITOR ROUND-TRIP
     Crop, rotate, or fine-tune a photo in the built-in editor and
     the saved _edit_<stamp>.jpg inherits every folder tag,
     filename tag, and the star rating from the original. No more
     re-tagging after a quick edit.

  COMPARE-MODE STORE FLOURISH
     Store a photo in x2 / x3 view and a green "Stored" pulse
     paints the active pane before the strip shifts on. Confirms
     the store with a satisfying beat instead of a silent hop.

  COMPARE MODE — ACTIVE FOLLOWS CLICK
     Clicking any visible pane in x2 / x3 view now only moves the
     ACTIVE ring + label to that pane. Images do not slide. The
     strip shifts only when you (a) Store the active photo, (b)
     Delete it, (c) hit the left/right nav arrows, or (d) click a
     filmstrip thumb (loads into the active pane).

  RESIZE CROP — ORIENTATION TOGGLE + CORNER DRAG
     The Resize modal now offers Auto / Tall / Wide buttons so you
     can force portrait or landscape crops regardless of the source
     shape. Four corner handles let you shrink the crop to as tight
     as 20% of max fit while the aspect ratio stays pinned.

  CLEANER DESTINATION PATHS
     Fixed a v1.4.6 regression that inserted an "unsorted" folder
     into paths that already had a pack + sub-folder context (e.g.
     Wildlife / unsorted / Birds -> now correctly Wildlife / Birds).

  Plus everything shipped in 1.4.0 -> 1.4.5:
     - Unlimited nested sub-folders
     - Multi-Source Roots (two folders side-by-side)
     - Smart-paste rosters + guardrails for huge lists
     - Cross-folder tag drag + multi-select bulk actions
     - Chip Trash with Restore
     - Per-pane zoom in compare view
     - First-run sample folder + splash on upgrades


------------------------------------------------------------------------
  QUICK INSTALL  (3 steps, about 1 minute)
------------------------------------------------------------------------

  1. Double-click:
        Pro Photo Sorter Setup 1.4.7.exe

  2. If Windows shows a blue "SmartScreen" warning, click
        "More info" -> "Run anyway"
     This is normal for indie apps that aren't Microsoft-signed. The
     software is safe.

  3. Click through the installer. When it finishes, Pro Photo Sorter
     opens automatically. That's it.

  The installer places the app in:
        C:\Users\<You>\AppData\Local\Programs\Pro Photo Sorter\
  A desktop shortcut and a Start-Menu entry are created for you.


------------------------------------------------------------------------
  FIRST LAUNCH  (2 minutes to a sorted photo)
------------------------------------------------------------------------

  1. The Splash Screen greets you with a tour of new features. Click
     "Get Started" to dismiss it (it won't nag you again until the
     next version).

  2. You'll notice a small folder of sample photos already loaded.
     Play with those first if it's your first time. You can restore
     them any time from Settings.

  3. Click "Load Source" at the top-left, then pick a folder full of
     your own photos. The samples slide out and your images appear
     in the filmstrip at the bottom. Add a second source folder from
     the same panel if you want to pull from two drives at once.

  4. Click any photo to see it in the big viewer. Use the arrow keys
     (or the arrow buttons on either side of the viewer) to move
     through. Press 1-5 to rate a photo with stars.

  5. Open the Tag Manager (top toolbar) and pick a Category, then
     drill into its sub-folder tree. Click filename tags to build a
     destination path like:
        Wildlife / Bears / Grizzly / Alaska_Trip
     Photos are stored with their tags applied — original files are
     never overwritten. A matching .xmp sidecar is dropped next to
     each stored JPEG so Lightroom sees your stars + tags on import.


------------------------------------------------------------------------
  TAG MANAGER — WHAT THE CONTROLS DO
------------------------------------------------------------------------

  Every sub-folder row has a chevron on the left. Click it to expand
  and see that folder's filename tags. Inside the expanded area:

     [Select]          Turns on multi-select mode — checkboxes
                       appear on every chip. Tick multiples, then
                       Delete / Convert / drag them together.

     Paste list        Drops open a big text box. Paste a roster
                       (comma, newline, or semicolon separated).
                       Each label becomes its own chip in one shot.

     Convert -> nested Bulk button that turns every filename tag on
                       this sub-folder into its own child folder.
                       Great for "team names" -> "per-team rosters".

     Drag a chip       Move it to another sub-folder (Ctrl-drag
                       copies). Drop on any row header — even
                       collapsed ones.

     Right-click chip  Move-to / Copy-to menu with every other
                       sub-folder listed, plus Remove.

     Trash (header)    See every filename tag you've deleted. Tick
                       the ones you want back, hit Restore.


------------------------------------------------------------------------
  COMPARE MODE — SIDE-BY-SIDE SORTING
------------------------------------------------------------------------

  The toolbar has an x1 / x2 / x3 segmented control. Pick x2 or x3
  to load that many images into the viewer at once.

     Click a pane      Moves ACTIVE ring + label there. Images do
                       not slide. All tags, ratings, and Store
                       apply to the ACTIVE pane.

     Store (active)    Files the active photo AND paints a green
                       "Stored" pulse where it was. The strip
                       shifts one to the left; a fresh photo lands
                       in the rightmost pane.

     Arrow keys / <>   Whole strip shifts one; ACTIVE stays pinned
                       in the same pane position.

     Filmstrip click   The clicked photo loads into the ACTIVE
                       pane. Window auto-shifts so the click lands
                       under the ring.


------------------------------------------------------------------------
  KEYBOARD SHORTCUTS
------------------------------------------------------------------------

  Arrow keys      Previous / next photo (or shift strip in compare)
  1 - 5           Set star rating on current photo
  0               Clear star rating
  Space           Toggle repeat-last-tags on next store
  x1 / x2 / x3    Cycle compare view
  \ or `          Peek original (holds while pressed) in Editor
  Enter           Commit current tag input / add sub-folder
  Esc             Cancel current pop-over / disarm icon


------------------------------------------------------------------------
  LIGHTROOM WORKFLOW (XMP SIDECARS)
------------------------------------------------------------------------

  Every Store writes a companion .xmp file next to the JPEG:

        Bald_Eagle.jpg
        Bald_Eagle.jpg.xmp   <- keywords + rating live here

  In Lightroom Classic:
     1. File > Import Photos and Video
     2. Point at the destination folder from Pro Photo Sorter
     3. Under Metadata Presets, enable "Read metadata from files"

  Your stars and tag keywords appear on every photo automatically.
  Bridge and Capture One follow the same convention.


------------------------------------------------------------------------
  TRIAL vs FULL LICENSE
------------------------------------------------------------------------

  Right out of the box you're in TRIAL MODE. It works the same as the
  full version, with ONE small difference:
     -> Every file you store gets "_TRIAL" appended to its filename.

  When you're ready to remove the suffix, buy your license key from:

        https://gumroad.com/  (search "Pro Photo Sorter")

  Paste the key into the License box in the Settings panel. The
  "_TRIAL" suffix goes away immediately and every previously stored
  file with the suffix can be batch-renamed from that same panel.


------------------------------------------------------------------------
  TROUBLESHOOTING
------------------------------------------------------------------------

  App looks blank on launch
     Usually means the sample folder is still being unpacked. Wait
     10 seconds. If it stays blank, delete
        %APPDATA%\Pro Photo Sorter\
     and relaunch — it'll rebuild fresh.

  Slow filmstrip on huge folders
     The thumbnail cache is per-folder. First browse warms the
     cache; subsequent visits are instant. Settings shows the
     current cache size and lets you clear it (with confirm).

  A tag I deleted came back
     You probably restored it from Chip Trash. Empty the trash
     bin from the Trash panel header to make deletes final.

  Cross-folder drag isn't landing
     Make sure you're dropping ON the row header (not just near
     it). A primary-earth ring lights up when the drop is valid.

  Lightroom isn't picking up my tags
     Make sure "Read metadata from files" is enabled in your
     Lightroom Metadata preferences, AND right-click the folder
     in Lightroom > "Read Metadata from Files" once to force a
     re-scan of the .xmp sidecars.


------------------------------------------------------------------------
  SUPPORT
------------------------------------------------------------------------

  This is a small-team indie tool. Every bug report and suggestion
  is read personally. Reach out at:

        support@prophotosorter.example  (placeholder)

  Include your app version (bottom-right of the main window) and a
  short description of what you were doing. Screenshots help
  enormously.

  Happy sorting.

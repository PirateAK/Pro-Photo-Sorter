========================================================================
              PRO PHOTO SORTER — READ ME FIRST
                      Version 1.4.5e  (September 2026)
========================================================================

Thanks for grabbing Pro Photo Sorter. This is a fully offline Windows
desktop app for photographers who shoot faster than they file — no
cloud, no subscription, no accounts. Your photos never leave your
machine.


------------------------------------------------------------------------
  WHAT'S NEW IN 1.4  (highlights since 1.3.1)
------------------------------------------------------------------------

  UNLIMITED NESTED SUB-FOLDERS
     Categories can now nest sub-folders as deep as you like. Great
     for Sports -> Baseball (AL) -> Baltimore Orioles -> Player name.
     Every level saves and reloads exactly as you left it.

  MULTI-SOURCE ROOTS
     Load a second source folder (thumb drive, NAS mount) alongside
     the primary one. The filmstrip splits so you can pull photos
     from both without unloading either. Great for pairing an SD
     card with your archive.

  FIRST-RUN SAMPLE FOLDER
     On first launch we drop a small folder of demo photos in
     Documents so you can play with sorting before touching your
     own shoot. Restore the samples any time from Settings.

  SMART-PASTE TAGS
     Paste a roster (comma, semicolon, OR newline separated) into
     any "New tag" or "New sub-folder" box and it splits into the
     right number of chips automatically. Works everywhere in the
     Tag Manager. Confirms before adding 250+ chips so you don't
     freeze the app.

  CROSS-FOLDER TAG DRAG
     Drag any filename-tag chip onto another sub-folder row (even
     if it's collapsed) to MOVE it there. Ctrl-drag copies. Works
     across sibling teams inside nested sub-folders too.

  MULTI-SELECT + BULK ACTIONS
     Each sub-folder's chip area has a "Select" toggle. Flip it on
     to reveal checkboxes on every chip. Tick as many as you want,
     then Delete, Convert to nested, or drag them all together.

  CHIP TRASH (UNDO)
     Every deleted filename tag lands in a trash bin at the top of
     the Tag Manager. Restore selected chips back to their original
     sub-folder anytime — capped at 200 items with oldest-first
     evict so it never fills up.

  COMPARE VIEW WITH PER-PANE ZOOM
     Switch to 2x or 3x view and each pane is independently
     zoomable. Mouse wheel over any pane to inspect side-by-side
     without the filmstrip sliding out from under you. Left/right
     arrow buttons still work in compare mode.

  SPLASH SCREEN ON UPGRADES
     A one-time welcome pops on first launch after each version
     bump — highlights what's new, then you're back to work.

  EDITOR AUTO-ENHANCE, CROP-IN-PLACE, RESET-TO-LAST
     One-click auto-enhance with an on/off toggle, floating
     Apply-crop pill so you never lose the OK button, and a 10-
     step history stack for "Reset to last" so a bad edit is one
     click away from being undone.

  THUMBNAIL LOADING PLACEHOLDERS + LIVE CACHE STATS
     Dashed borders + spinners so a slow drive doesn't look
     frozen. Settings shows the exact cache size and a confirm
     dialog before clearing it.


------------------------------------------------------------------------
  QUICK INSTALL  (3 steps, about 1 minute)
------------------------------------------------------------------------

  1. Double-click:
        Pro Photo Sorter Setup 1.4.5.exe

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
     never overwritten.


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
  KEYBOARD SHORTCUTS
------------------------------------------------------------------------

  Arrow keys      Previous / next photo (main window)
  1 - 5           Set star rating on current photo
  0               Clear star rating
  Space           Toggle repeat-last-tags on next store
  \ or `          Peek original (holds while pressed) in Editor
  Enter           Commit current tag input / add sub-folder
  Esc             Cancel current pop-over / disarm icon


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

# Electron Setup — Spell-Check Right-Click Menu

The React inputs now have `spellCheck={true}` on the watermark text field
and the tag popover, so **Chromium underlines misspellings in red while you type**.
To also see a right-click menu with suggestions ("Change to 'MuskegMan'…"),
you need to enable Electron's built-in spellchecker in `electron-shell/main.js`.

## One-time paste-in on Kurt's PC

Open `C:\Pro-Photo-Sorter\electron-shell\main.js` in Notepad and:

### 1) Enable the spellchecker in the BrowserWindow

Find where `new BrowserWindow({...})` is called (usually near the top of the file).
Inside its `webPreferences`, add `spellcheck: true` if it's not already there:

```js
win = new BrowserWindow({
  width: 1400,
  height: 900,
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    spellcheck: true,       // ← add this line
    // ...anything else you already have here
  },
});
```

### 2) Handle the right-click menu

Anywhere in `main.js` (usually right after the BrowserWindow is created), add:

```js
const { Menu, MenuItem } = require('electron');

win.webContents.on('context-menu', (event, params) => {
  const menu = new Menu();

  // Spelling suggestions
  for (const suggestion of params.dictionarySuggestions) {
    menu.append(new MenuItem({
      label: suggestion,
      click: () => win.webContents.replaceMisspelling(suggestion),
    }));
  }

  if (params.misspelledWord) {
    if (params.dictionarySuggestions.length > 0) {
      menu.append(new MenuItem({ type: 'separator' }));
    }
    menu.append(new MenuItem({
      label: 'Add to dictionary',
      click: () => win.webContents.session.addWordToSpellCheckerDictionary(params.misspelledWord),
    }));
    menu.append(new MenuItem({ type: 'separator' }));
  }

  // Standard clipboard actions
  if (params.editFlags.canCut)   menu.append(new MenuItem({ role: 'cut' }));
  if (params.editFlags.canCopy)  menu.append(new MenuItem({ role: 'copy' }));
  if (params.editFlags.canPaste) menu.append(new MenuItem({ role: 'paste' }));

  if (menu.items.length > 0) menu.popup();
});
```

Save the file, close any running Pro Photo Sorter windows, then double-click `run-app.bat`
again. Right-click on the Watermark text or a Tag rename input — you'll now see
spelling suggestions plus Cut/Copy/Paste.

## Notes

- No `npm install` needed — this uses Electron's built-in Chromium spellchecker.
- Default dictionary is en-US. Kurt can add words to the personal dictionary via
  the "Add to dictionary" option and they'll persist across sessions.
- The React `onContextMenu` handler on the main photo image (for "toggle watermark
  for this photo") still works — that handler runs first and calls
  `event.preventDefault()`, so Electron's context-menu event doesn't fire on
  the image. The spellcheck menu only appears where we didn't preempt it —
  i.e. inside text inputs, which is exactly what we want.

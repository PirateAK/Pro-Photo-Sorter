// v1.8.0 — Shared by BOTH Electron shells (PPS + Tag Pack Creator).
// Everything lives under %USERPROFILE%\Documents\Pro Photo Sorter\:
//   Library\<pack>.pps-tagpack.json  — PPS mirrors every tag pack here (TPC opens them)
//   apps\pps.json / apps\tpc.json    — each app writes {version, exePath} on launch
//                                      so the other can offer "Open …" / "update".
const { app, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const ROOT = () => path.join(app.getPath('documents'), 'Pro Photo Sorter');
const LIBRARY_DIR = () => path.join(ROOT(), 'Library');
const APPS_DIR = () => path.join(ROOT(), 'apps');
const safeFile = (s) => String(s || 'pack').replace(/[<>:"/\\|?*]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 80) || 'pack';

function writeAppInfo(id) {
  try {
    fs.mkdirSync(APPS_DIR(), { recursive: true });
    fs.writeFileSync(path.join(APPS_DIR(), `${id}.json`), JSON.stringify({
      id, version: app.getVersion(), exePath: app.isPackaged ? process.execPath : null, lastSeen: new Date().toISOString(),
    }, null, 2), 'utf8');
  } catch { /* best effort */ }
}
function readAppInfo(id) {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(APPS_DIR(), `${id}.json`), 'utf8'));
    return { ...d, installed: !!d.exePath && fs.existsSync(d.exePath) };
  } catch { return null; }
}

// Register the IPCs. `self` = 'pps' | 'tpc'.
function registerShared(self) {
  const other = self === 'pps' ? 'tpc' : 'pps';
  writeAppInfo(self);

  ipcMain.handle('apps:info', () => ({ self: { id: self, version: app.getVersion() }, other: readAppInfo(other) }));
  ipcMain.handle('apps:launch', () => {
    const info = readAppInfo(other);
    if (!info?.installed) return { ok: false, error: 'not-installed' };
    try { spawn(info.exePath, [], { detached: true, stdio: 'ignore' }).unref(); return { ok: true }; }
    catch (e) { return { ok: false, error: e.message }; }
  });

  // Library: PPS writes, TPC reads.
  ipcMain.handle('library:write', (_e, packs) => {
    try {
      fs.mkdirSync(LIBRARY_DIR(), { recursive: true });
      const keep = new Set();
      for (const p of packs || []) {
        const file = `${safeFile(p.name)}.pps-tagpack.json`;
        keep.add(file.toLowerCase());
        fs.writeFileSync(path.join(LIBRARY_DIR(), file), p.json, 'utf8');
      }
      for (const f of fs.readdirSync(LIBRARY_DIR())) {
        if (/\.pps-tagpack\.json$/i.test(f) && !keep.has(f.toLowerCase())) fs.unlinkSync(path.join(LIBRARY_DIR(), f));
      }
      return { ok: true, path: LIBRARY_DIR(), count: keep.size };
    } catch (e) { return { ok: false, error: e.message }; }
  });
  ipcMain.handle('library:list', () => {
    try {
      if (!fs.existsSync(LIBRARY_DIR())) return [];
      return fs.readdirSync(LIBRARY_DIR()).filter((f) => /\.pps-tagpack\.json$/i.test(f)).sort().map((f) => {
        const full = path.join(LIBRARY_DIR(), f);
        return { name: f.replace(/\.pps-tagpack\.json$/i, ''), json: fs.readFileSync(full, 'utf8'), mtime: fs.statSync(full).mtime.toISOString() };
      });
    } catch { return []; }
  });
}

module.exports = { registerShared };

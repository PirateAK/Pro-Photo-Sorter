// v1.2.3 — Auto-backup all tag packs to a `.pps-backups/` folder on the
// destination drive. Fires at most once per calendar day. Silent unless it
// fails. Keeps the last 7 timestamped `.pps-taglist.txt` snapshots.
//
// The backup format is plain-text — same as the "Export as text" button in
// Tag Manager — so restoration is a normal "Import text list…" flow.

import { serializePacks } from "./tagpackText.js";

const BACKUP_DIR = ".pps-backups";
const MAX_KEEP = 7;

const todayKey = () => new Date().toISOString().slice(0, 10); // YYYY-MM-DD

/**
 * Attempt an auto-backup snapshot. Called from App.js on mount whenever
 * settings.autoBackupTagPacks is true AND a destination root handle is
 * connected. No-op if we already backed up today.
 * Returns { ok, wrote, message } where wrote is the filename or null.
 */
export async function maybeAutoBackup({ destRoot, categories, settings, updateSettings }) {
  if (!destRoot || !categories || !Array.isArray(categories) || categories.length === 0) return { ok: false, wrote: null, message: "no dest or packs" };
  if (!settings?.autoBackupTagPacks) return { ok: false, wrote: null, message: "disabled" };
  const today = todayKey();
  if (settings.lastTagBackupDate === today) return { ok: false, wrote: null, message: "already-today" };

  try {
    const dir = await destRoot.getDirectoryHandle(BACKUP_DIR, { create: true });
    const fname = `pps-tagpacks_${today}.pps-taglist.txt`;
    const text = serializePacks(categories);
    const handle = await dir.getFileHandle(fname, { create: true });
    const w = await handle.createWritable();
    await w.write(text);
    await w.close();

    // Retention — keep only the newest MAX_KEEP snapshots (any file matching
    // the timestamped pattern). Anything else in the folder is left alone.
    try {
      const snaps = [];
      for await (const [name, ent] of dir.entries()) {
        if (ent.kind === "file" && /^pps-tagpacks_\d{4}-\d{2}-\d{2}\.pps-taglist\.txt$/.test(name)) {
          snaps.push(name);
        }
      }
      snaps.sort(); // ISO date sorts lexically
      const toDelete = snaps.slice(0, Math.max(0, snaps.length - MAX_KEEP));
      for (const n of toDelete) {
        try { await dir.removeEntry(n); } catch { /* ignore */ }
      }
    } catch { /* retention best-effort */ }

    // Record success so we don't back up again until tomorrow.
    if (typeof updateSettings === "function") {
      updateSettings({ ...settings, lastTagBackupDate: today });
    }
    return { ok: true, wrote: fname, message: `Saved ${fname}` };
  } catch (e) {
    return { ok: false, wrote: null, message: e?.message || "backup failed" };
  }
}

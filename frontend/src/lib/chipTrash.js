// v1.4.5d — Chip Trash / Undo bin.
//
// Every time Kurt deletes a filename-tag chip from the Tag Manager
// (bottom Filename Tags pane, inline chevron-expanded list, or a nested
// sub-folder), we drop the chip in here alongside enough breadcrumb
// context to restore it back to the same parent later.
//
// Storage: window.localStorage["pps.chip-trash"] — a bounded queue
// (FIFO evict at TRASH_CAP) of records:
//   {
//     id: string,           // uid for this trash record (not the chip's own id)
//     ts: number,           // Date.now()
//     chip: {label, iconType, iconName, iconData?}, // full chip snapshot
//     categoryId: string,   // owning category (pack) id
//     sfPath: string[],     // ids from top-level sub-folder → deepest nested owner
//     pathNames: string[],  // human-readable "Wildlife → Mammals" for the trash UI
//     deletedFromLabel: string, // "Baltimore Orioles" or "Mammals"
//   }
//
// Restore semantics: given a trash record, walk the current categories
// tree to find category + sfPath; if the deepest owner still exists,
// re-append the chip there (with a fresh id + label collision safety).
// If ANY hop is missing, we return { ok:false, reason } so the caller
// can prompt Kurt about where to drop it instead.

const KEY = "pps.chip-trash";
export const TRASH_CAP = 200;

const rid = (() => {
  let n = 0;
  return () => `tr_${Date.now().toString(36)}_${(n++).toString(36)}`;
})();

function readAll() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function writeAll(list) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // Storage full or blocked — silently drop the oldest half and retry.
    try {
      window.localStorage.setItem(KEY, JSON.stringify(list.slice(-Math.floor(TRASH_CAP / 2))));
    } catch {
      /* give up */
    }
  }
}

export function getTrash() {
  return readAll();
}
export function getTrashCount() {
  return readAll().length;
}

/**
 * Push a deleted chip into the trash bin. Enforces the FIFO cap.
 * `entry.chip` is required; the rest lets restore recreate the path.
 */
export function pushToTrash(entry) {
  if (!entry || !entry.chip) return null;
  const record = {
    id: rid(),
    ts: Date.now(),
    chip: {
      label: entry.chip.label || "",
      iconType: entry.chip.iconType || "lucide",
      iconName: entry.chip.iconName || "Tag",
      ...(entry.chip.iconData ? { iconData: entry.chip.iconData } : {}),
    },
    categoryId: entry.categoryId || "",
    sfPath: Array.isArray(entry.sfPath) ? entry.sfPath : [],
    pathNames: Array.isArray(entry.pathNames) ? entry.pathNames : [],
    deletedFromLabel: entry.deletedFromLabel || "",
  };
  const list = readAll();
  list.push(record);
  // FIFO evict from the head when we blow past cap.
  while (list.length > TRASH_CAP) list.shift();
  writeAll(list);
  // Emit a browser event so any open Trash panel refreshes.
  try { window.dispatchEvent(new CustomEvent("pps:trash-updated")); } catch { /* jsdom */ }
  return record.id;
}

export function pushManyToTrash(entries) {
  const ids = [];
  for (const e of entries || []) {
    const id = pushToTrash(e);
    if (id) ids.push(id);
  }
  return ids;
}

export function removeFromTrash(id) {
  const list = readAll().filter((r) => r.id !== id);
  writeAll(list);
  try { window.dispatchEvent(new CustomEvent("pps:trash-updated")); } catch { /* jsdom */ }
}
export function removeManyFromTrash(ids) {
  const set = new Set(ids || []);
  const list = readAll().filter((r) => !set.has(r.id));
  writeAll(list);
  try { window.dispatchEvent(new CustomEvent("pps:trash-updated")); } catch { /* jsdom */ }
}
export function emptyTrash() {
  writeAll([]);
  try { window.dispatchEvent(new CustomEvent("pps:trash-updated")); } catch { /* jsdom */ }
}

/**
 * Walk `categories` to find the deepest sub-folder node named by
 * record.sfPath. Returns { category, path[] } where path[] is the
 * chain of sub-folder refs from top-level down (last element = owner).
 * Returns null if any hop is missing.
 */
export function locateOwnerNode(categories, record) {
  if (!Array.isArray(categories) || !record) return null;
  const cat = categories.find((c) => c.id === record.categoryId);
  if (!cat) return null;
  const path = [];
  let level = cat.subfolders || [];
  for (const sfId of record.sfPath) {
    const node = (level || []).find((s) => s.id === sfId);
    if (!node) return null;
    path.push(node);
    level = node.subfolders || [];
  }
  return { category: cat, path };
}

/**
 * Apply a restore. Returns the patched categories array, plus a
 * `{ ok, reason, restoredLabel }` diagnostics envelope. Does NOT mutate.
 * `newId()` is passed in so we don't have to import the storage uid
 * from a headless test — but defaults to a local generator.
 */
export function restoreChip(categories, record, opts = {}) {
  const newId = opts.newId || (() => `it_${Math.random().toString(36).slice(2, 10)}`);
  const found = locateOwnerNode(categories, record);
  if (!found) {
    return { ok: false, reason: "path-missing", categories, restoredLabel: record.chip.label };
  }
  const { category, path } = found;
  const owner = path[path.length - 1]; // deepest node
  const existingLabels = new Set((owner.filenameItems || []).map((t) => (t.label || "").toLowerCase()));
  let label = record.chip.label || "restored";
  // Collision-safe label: append " (restored)" once, then " (restored 2)"…
  if (existingLabels.has(label.toLowerCase())) {
    let n = 1;
    let candidate;
    do {
      candidate = n === 1 ? `${label} (restored)` : `${label} (restored ${n})`;
      n += 1;
    } while (existingLabels.has(candidate.toLowerCase()) && n < 50);
    label = candidate;
  }
  const restoredChip = {
    id: newId("it"),
    label: label.slice(0, 60),
    iconType: record.chip.iconType || "lucide",
    iconName: record.chip.iconName || "Tag",
    ...(record.chip.iconData ? { iconData: record.chip.iconData } : {}),
  };
  // Immutable patch back up the chain.
  const patchSubfolders = (subs, [head, ...rest]) => {
    if (!head) return subs;
    return subs.map((s) => {
      if (s.id !== head.id) return s;
      if (rest.length === 0) {
        return { ...s, filenameItems: [...(s.filenameItems || []), restoredChip] };
      }
      return { ...s, subfolders: patchSubfolders(s.subfolders || [], rest) };
    });
  };
  const nextCategories = categories.map((c) => {
    if (c.id !== category.id) return c;
    return { ...c, subfolders: patchSubfolders(c.subfolders || [], path) };
  });
  return { ok: true, categories: nextCategories, restoredLabel: label };
}

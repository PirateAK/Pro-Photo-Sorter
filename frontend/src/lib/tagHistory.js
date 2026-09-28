// v1.5.0 — Tag History: a trash can for whole-category changes.
//
// Every destructive or bulk change to a category (import Replace / Merge,
// delete category, delete sub-folder, paste roster) drops a snapshot of
// the category *before* the change in here. The History panel in Tag
// Manager lists entries newest-first; each can be applied as
//   • "restore"  — put the category back exactly as it was
//   • "keepBoth" — put it back AND keep the current version as a new
//                  numbered category ("Wildlife 2"), so a bad Replace
//                  becomes a Create-new after the fact.
//
// Storage: localStorage["pps.tag-history"], bounded (HISTORY_CAP entries,
// HISTORY_MAX_AGE_MS). Pure helpers take the store as arguments so node
// tests can run without a DOM; the exported wrappers use localStorage.

import { numberedName } from "./packFormat.js";

const KEY = "pps.tag-history";
export const HISTORY_CAP = 50;
export const HISTORY_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export const ACTION_LABELS = {
  "import-replace": "Replaced by import",
  "import-merge": "Merged import",
  "delete-category": "Deleted category",
  "delete-subfolder": "Deleted sub-folder",
  "paste-roster": "Pasted list",
  "bulk-delete": "Bulk delete",
};

const rid = () => `th_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const emit = () => { try { window.dispatchEvent(new CustomEvent("pps:history-updated")); } catch { /* jsdom */ } };

function readAll() {
  try {
    const arr = JSON.parse(window.localStorage.getItem(KEY) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
function writeAll(list) {
  try { window.localStorage.setItem(KEY, JSON.stringify(list)); }
  catch { try { window.localStorage.setItem(KEY, JSON.stringify(list.slice(-Math.floor(HISTORY_CAP / 2)))); } catch { /* give up */ } }
}

// Pure: append + prune. Exported for tests.
export function pushEntry(list, entry, now = Date.now()) {
  const rec = {
    id: rid(),
    ts: now,
    action: entry.action,
    catId: entry.category?.id || entry.catId || "",
    catName: entry.category?.name || entry.catName || "",
    index: typeof entry.index === "number" ? entry.index : -1,
    before: entry.category ? JSON.parse(JSON.stringify(entry.category)) : null,
    note: entry.note || "",
  };
  const cutoff = now - HISTORY_MAX_AGE_MS;
  const next = [...(list || []).filter((e) => e.ts >= cutoff), rec];
  while (next.length > HISTORY_CAP) next.shift();
  return next;
}

// Pure: apply a history entry to the current categories.
// Returns { categories, restoredName, keptName? }.
export function applyEntry(categories, entry, mode = "restore") {
  if (!entry?.before) return { categories, restoredName: entry?.catName || "" };
  const before = JSON.parse(JSON.stringify(entry.before));
  const idx = categories.findIndex((c) => c.id === before.id);
  const current = idx >= 0 ? categories[idx] : null;
  let next;
  if (idx >= 0) {
    next = categories.map((c, i) => (i === idx ? before : c));
  } else {
    // Category was deleted — re-insert where it used to live.
    const at = entry.index >= 0 ? Math.min(entry.index, categories.length) : categories.length;
    next = [...categories.slice(0, at), before, ...categories.slice(at)];
  }
  let keptName;
  if (mode === "keepBoth" && current) {
    keptName = numberedName(current.name, next.map((c) => c.name));
    const kept = { ...JSON.parse(JSON.stringify(current)), id: `${current.id}-kept-${Date.now().toString(36)}`, name: keptName };
    next = [...next.slice(0, idx + 1), kept, ...next.slice(idx + 1)];
  }
  return { categories: next, restoredName: before.name, keptName };
}

// ── localStorage-backed wrappers ────────────────────────────────────────
export function getHistory() { return readAll().slice().sort((a, b) => b.ts - a.ts); }
export function getHistoryCount() { return readAll().length; }
export function recordHistory(entry) {
  const next = pushEntry(readAll(), entry);
  writeAll(next);
  emit();
  return next[next.length - 1]?.id || null;
}
export function removeHistory(id) { writeAll(readAll().filter((e) => e.id !== id)); emit(); }
export function emptyHistory() { writeAll([]); emit(); }

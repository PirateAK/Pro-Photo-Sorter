// Helpers for working with the cascade tag model (v1.3+).
//
// A Category has ONE child list: `subfolders`. Each sub-folder has its own
// `filenameItems`. Destination path = Category / Sub-Folder / originalname_tags.jpg
//
// Prior versions had two parallel lists at the pack level (folderItems +
// filenameItems). The load-time migration in storage.js folds them into
// subfolders. These legacy helpers now return empty arrays for the
// "folders" role so the FOLDERS bar's chip row simply renders empty,
// while the "filename" role still works when the caller provides an
// overrideItems from the active sub-folder.

// role === "folders"  → the old pack-level folder-path-tags (now empty)
// role === "filename" → the old pack-level filename-tags (also empty; the
//                       UI passes overrideItems from the active sub-folder)
export function getListKey(role) {
  return role === "filename" ? "filenameItems" : "folderItems";
}

export function getItems(cat, role) {
  if (!cat) return [];
  return cat[getListKey(role)] || [];
}

// Return a new category with `items` set at the role-specific key. Legacy
// paths still call this; safe no-op for cascade-shape categories since
// nothing reads back from these keys anymore.
export function withItems(cat, role, items) {
  return { ...cat, [getListKey(role)]: items };
}

// Total tags across a Category = sub-folder count + sum of filename tags.
// Kept identical semantics to legacy so export buttons stay enabled/disabled
// at the right time.
export function totalCount(cat) {
  if (!cat) return 0;
  const subs = cat.subfolders || [];
  const filenameTagCount = subs.reduce((n, s) => n + (s.filenameItems?.length || 0), 0);
  return subs.length + filenameTagCount;
}

// Filename items of a specific sub-folder inside a Category.
export function getSubFilenames(cat, subId) {
  const sub = (cat?.subfolders || []).find((s) => s.id === subId);
  return sub?.filenameItems || [];
}

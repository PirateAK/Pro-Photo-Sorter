// Helpers for working with the paired-list tag pack model.
//
// Each pack has TWO lists — folderItems (used to build destination folder
// paths) and filenameItems (used to build filenames). Palette bars and the
// Tag Manager use these helpers to read/write the correct list based on
// their role.
//
//   role === "folders"  → folderItems
//   role === "filename" → filenameItems

export function getListKey(role) {
  return role === "filename" ? "filenameItems" : "folderItems";
}

export function getItems(cat, role) {
  if (!cat) return [];
  return cat[getListKey(role)] || [];
}

// Return a new category with `items` set at the role-specific key.
export function withItems(cat, role, items) {
  return { ...cat, [getListKey(role)]: items };
}

// Total tags across both lists of a pack.
export function totalCount(cat) {
  if (!cat) return 0;
  return (cat.folderItems?.length || 0) + (cat.filenameItems?.length || 0);
}

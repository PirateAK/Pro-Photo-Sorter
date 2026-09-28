// v1.5.0 — Tag pack file format (v4) + merge helpers. Pure functions, no
// browser deps, so the Tag Pack Creator and the node test-suite share them.
//
// Category shape (runtime):
//   { id, name, subfolders: [ { id, name, iconType, iconName, iconData?,
//                               filenameItems: [{id,label,iconType,iconName,iconData?}],
//                               subfolders: [ ...nested ] } ] }
//
// File shape (formatVersion 4): same tree, minus ids, keys renamed to match
// the v3 files PPS has shipped since 1.2.2 (`filenameTags` inside subfolders)
// PLUS a recursive `subfolders` array on every sub-folder. v3 readers ignore
// the nested key, so v4 files still open in older PPS builds (top level only).

export const PACK_FORMAT_VERSION = 4;
export const PACK_KIND = "pps-tagpack";

const defaultUid = (p = "id") => `${p}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;

const mapTagOut = (it) => ({
  label: it.label,
  iconType: it.iconType || "lucide",
  iconName: it.iconName || null,
  iconData: it.iconData || it.imageDataUrl || null,
});

const mapSubOut = (s) => ({
  name: s.name,
  iconType: s.iconType || "lucide",
  iconName: s.iconName || "Folder",
  iconData: s.iconData || s.imageDataUrl || null,
  filenameTags: (s.filenameItems || []).map(mapTagOut),
  subfolders: (s.subfolders || []).map(mapSubOut),
});

export function serializeCategory(cat, extra = {}) {
  return {
    formatVersion: PACK_FORMAT_VERSION,
    kind: PACK_KIND,
    name: cat.name,
    description: extra.description || "",
    author: extra.author || "",
    exportedAt: extra.exportedAt || new Date().toISOString(),
    folderTags: (cat.folderItems || []).map(mapTagOut),
    filenameTags: (cat.filenameItems || []).map(mapTagOut),
    subfolders: (cat.subfolders || []).map(mapSubOut),
  };
}

// Accepts v1 (tags[]), v2 (folderTags/filenameTags), v3 (+subfolders one
// level), v4 (+nested subfolders). Throws on anything that isn't a pack.
export function deserializePack(data, uid = defaultUid) {
  if (!data || data.kind !== PACK_KIND) throw new Error("Not a valid Pro Photo Sorter tag pack file.");
  const mapIn = (t) => ({
    id: uid("it"),
    label: String(t?.label || "").slice(0, 60),
    iconType: t?.iconType === "image" && t?.iconData ? "image" : "lucide",
    iconName: t?.iconName || "Tag",
    ...(t?.iconType === "image" && t?.iconData ? { iconData: t.iconData } : {}),
  });
  const valid = (arr) => (arr || []).map(mapIn).filter((it) => it.label);
  const mapSubIn = (s) => ({
    id: uid("sf"),
    name: String(s?.name || "Untitled sub-folder").slice(0, 60),
    iconType: s?.iconType === "image" && s?.iconData ? "image" : "lucide",
    iconName: s?.iconName || "Folder",
    ...(s?.iconType === "image" && s?.iconData ? { iconData: s.iconData } : {}),
    filenameItems: valid(s?.filenameTags),
    subfolders: Array.isArray(s?.subfolders) ? s.subfolders.map(mapSubIn) : [],
  });

  let subfolders = [];
  let loose = [];
  if (Array.isArray(data.folderTags) || Array.isArray(data.filenameTags) || Array.isArray(data.subfolders)) {
    subfolders = (data.subfolders || []).map(mapSubIn);
    // v2/v3 pack-level tags: folder tags become empty sub-folders, loose
    // filename tags go to an "_Unsorted filenames" bucket (mirrors loadState).
    const folderSubs = valid(data.folderTags).map((it) => ({
      id: uid("sf"), name: it.label, iconType: it.iconType, iconName: it.iconName,
      ...(it.iconData ? { iconData: it.iconData } : {}), filenameItems: [], subfolders: [],
    }));
    subfolders = [...folderSubs, ...subfolders];
    loose = valid(data.filenameTags);
  } else if (Array.isArray(data.tags)) {
    loose = valid(data.tags);
  } else {
    throw new Error("Tag pack file has no tags to import.");
  }
  if (loose.length > 0) {
    subfolders.push({ id: uid("sf"), name: "_Unsorted filenames", iconType: "lucide", iconName: "Package", filenameItems: loose, subfolders: [] });
  }
  const name = String(data.name || "Imported pack").trim() || "Imported pack";
  return { id: uid("cat"), name, subfolders, description: data.description || "", author: data.author || "" };
}

export function countPack(cat) {
  let subs = 0, tags = 0;
  const walk = (list) => {
    for (const s of list || []) {
      subs += 1;
      tags += (s.filenameItems || []).length;
      walk(s.subfolders);
    }
  };
  walk(cat?.subfolders);
  return { subfolders: subs, tags };
}

const norm = (s) => String(s || "").trim().toLowerCase();

export function findByName(categories, name) {
  const key = norm(name);
  return (categories || []).find((c) => norm(c.name) === key) || null;
}

// "Wildlife" → "Wildlife 2" → "Wildlife 3" … first free number wins.
export function numberedName(base, existingNames) {
  const taken = new Set((existingNames || []).map(norm));
  const clean = String(base || "Pack").trim().replace(/\s+\d+$/, "") || "Pack";
  if (!taken.has(norm(clean))) return clean;
  let n = 2;
  while (taken.has(norm(`${clean} ${n}`))) n++;
  return `${clean} ${n}`;
}

// Prefer an incoming custom image over an existing plain Lucide icon;
// otherwise the existing icon wins (the user may have hand-picked it).
function pickIcon(existing, incoming) {
  if (existing.iconType !== "image" && incoming.iconType === "image" && incoming.iconData) {
    return { iconType: "image", iconName: incoming.iconName, iconData: incoming.iconData };
  }
  return {};
}

function mergeTagLists(existing, incoming) {
  const out = [...(existing || [])];
  const seen = new Set(out.map((t) => norm(t.label)));
  let added = 0;
  for (const t of incoming || []) {
    const key = norm(t.label);
    if (!key || seen.has(key)) {
      const idx = out.findIndex((e) => norm(e.label) === key);
      if (idx >= 0) out[idx] = { ...out[idx], ...pickIcon(out[idx], t) };
      continue;
    }
    seen.add(key);
    out.push(t);
    added += 1;
  }
  return { list: out, added };
}

function mergeSubfolderLists(existing, incoming, stats) {
  const out = [...(existing || [])];
  for (const inc of incoming || []) {
    const idx = out.findIndex((e) => norm(e.name) === norm(inc.name));
    if (idx < 0) {
      out.push(inc);
      const c = countPack({ subfolders: [inc] });
      stats.subfoldersAdded += c.subfolders;
      stats.tagsAdded += c.tags;
      continue;
    }
    const ex = out[idx];
    const tags = mergeTagLists(ex.filenameItems, inc.filenameItems);
    stats.tagsAdded += tags.added;
    out[idx] = {
      ...ex,
      ...pickIcon(ex, inc),
      filenameItems: tags.list,
      subfolders: mergeSubfolderLists(ex.subfolders, inc.subfolders, stats),
    };
  }
  return out;
}

// Merge `incoming` into `existing` (same category). Keeps existing id +
// name. Returns { category, stats: { subfoldersAdded, tagsAdded } }.
export function mergeCategory(existing, incoming) {
  const stats = { subfoldersAdded: 0, tagsAdded: 0 };
  const subfolders = mergeSubfolderLists(existing.subfolders, incoming.subfolders, stats);
  return { category: { ...existing, subfolders }, stats };
}

// Apply an import decision. mode: "replace" | "merge" | "new".
// Returns { categories, category, mode, stats? }.
export function applyImport(categories, incoming, mode, existing) {
  if (!existing || mode === "new") {
    const name = existing ? numberedName(incoming.name, categories.map((c) => c.name)) : incoming.name;
    const category = { ...incoming, name };
    return { categories: [...categories, category], category, mode: existing ? "new" : "add" };
  }
  if (mode === "replace") {
    const category = { ...incoming, id: existing.id, name: existing.name };
    return { categories: categories.map((c) => (c.id === existing.id ? category : c)), category, mode };
  }
  const { category, stats } = mergeCategory(existing, incoming);
  return { categories: categories.map((c) => (c.id === existing.id ? category : c)), category, mode: "merge", stats };
}

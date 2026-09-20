import React, { useState, useRef } from "react";
import * as Lucide from "lucide-react";
import { Plus, Trash2, X, Image as ImageIcon, Palette, Save, Download, Upload, Pencil, Package, FolderTree, Tag as TagIcon, FileText, ClipboardPaste } from "lucide-react";
import JSZip from "jszip";
import { uid } from "../lib/storage";
import { totalCount } from "../lib/tags";
import { parseTagList, serializePack as serializePackText } from "../lib/tagpackText";
import { toast } from "sonner";

// Curated built-in icons
const BUILTIN_ICONS = [
  "Star", "Heart", "Flag", "Bookmark", "Tag", "Award", "Trophy",
  "Camera", "Aperture", "Sun", "Moon", "Cloud", "CloudRain", "Snowflake",
  "Mountain", "Trees", "Tent", "Palmtree", "Flower2", "Leaf", "Sprout",
  "User", "Users", "Baby", "Dog", "Cat", "Bird", "Fish", "Rabbit",
  "Home", "Building", "Church", "Landmark", "Castle",
  "Car", "Plane", "Ship", "Bike", "Rocket", "Train",
  "Coffee", "Utensils", "CakeSlice", "Wine", "Beer",
  "Music", "Guitar", "Piano", "Mic2",
  "Zap", "Sparkles", "Flame", "Waves", "Wind",
  "MapPin", "Compass", "Globe", "Sunrise", "Sunset",
  "Circle", "Square", "Triangle", "Hexagon", "Diamond",
];

function BuiltinIcon({ name, size = 20 }) {
  const Cmp = Lucide[name] || Lucide.Circle;
  return <Cmp size={size} strokeWidth={1.8} />;
}

function IconPreview({ item, size = 20 }) {
  if (item.iconType === "image" && item.iconData) {
    return (
      <img
        src={item.iconData}
        alt={item.label}
        className="rounded object-cover"
        style={{ width: size, height: size }}
        draggable={false}
      />
    );
  }
  return <BuiltinIcon name={item.iconName} size={size} />;
}

export { IconPreview };

export default function CategoryManager({ open, onClose, categories, onChange }) {
  const [activeCat, setActiveCat] = useState(categories[0]?.id || null);
  const [newCatName, setNewCatName] = useState("");
  // Two independent add-form drafts — one per list
  const [drafts, setDrafts] = useState({
    folderItems: { label: "", pickerMode: "builtin", selectedBuiltin: "Folder", selectedImage: null },
    filenameItems: { label: "", pickerMode: "builtin", selectedBuiltin: "Tag", selectedImage: null },
  });
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [bundlePickerOpen, setBundlePickerOpen] = useState(false);
  const [bundleSelected, setBundleSelected] = useState(new Set());
  const folderFileRef = useRef(null);
  const filenameFileRef = useRef(null);
  const importRef = useRef(null);
  const importTextRef = useRef(null);

  if (!open) return null;

  const current = categories.find((c) => c.id === activeCat) || categories[0];

  const addCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    const cat = { id: uid("cat"), name, folderItems: [], filenameItems: [] };
    onChange([...categories, cat]);
    setActiveCat(cat.id);
    setNewCatName("");
  };

  const removeCategory = (id) => {
    const next = categories.filter((c) => c.id !== id);
    onChange(next);
    if (activeCat === id) setActiveCat(next[0]?.id || null);
  };

  // Add a tag to one specific list of the current pack
  const addItem = (listKey) => {
    if (!current) return;
    const d = drafts[listKey];
    const label = d.label.trim();
    if (!label) return;
    const item =
      d.pickerMode === "image" && d.selectedImage
        ? { id: uid("it"), label, iconType: "image", iconData: d.selectedImage }
        : { id: uid("it"), label, iconType: "lucide", iconName: d.selectedBuiltin };
    const next = categories.map((c) =>
      c.id === current.id ? { ...c, [listKey]: [...(c[listKey] || []), item] } : c
    );
    onChange(next);
    setDrafts((cur) => ({
      ...cur,
      [listKey]: { ...cur[listKey], label: "", selectedImage: null },
    }));
  };

  const removeItem = (listKey, itemId) => {
    const next = categories.map((c) =>
      c.id === current.id ? { ...c, [listKey]: (c[listKey] || []).filter((it) => it.id !== itemId) } : c
    );
    onChange(next);
  };

  // Move a tag between the two lists of the CURRENT pack.
  // fromKey / toKey are "folderItems" | "filenameItems". No-op if same.
  const moveTagBetweenLists = (fromKey, toKey, itemId) => {
    if (!current || fromKey === toKey) return;
    const src = current[fromKey] || [];
    const item = src.find((it) => it.id === itemId);
    if (!item) return;
    const next = categories.map((c) => {
      if (c.id !== current.id) return c;
      return {
        ...c,
        [fromKey]: (c[fromKey] || []).filter((it) => it.id !== itemId),
        // Guard against dupes in case of a stray drop
        [toKey]: (c[toKey] || []).some((it) => it.id === itemId)
          ? (c[toKey] || [])
          : [...(c[toKey] || []), item],
      };
    });
    onChange(next);
    toast.success(`Moved "${item.label}"`, {
      description: `${fromKey === "folderItems" ? "Folder" : "Filename"} → ${toKey === "folderItems" ? "Folder" : "Filename"}`,
      action: {
        label: "Undo",
        onClick: () => moveTagBetweenLists(toKey, fromKey, itemId),
      },
    });
  };

  // ── Rename an existing tag pack ─────────────────────────────────────────
  const startRename = (cat) => {
    setRenamingId(cat.id);
    setRenameDraft(cat.name);
  };
  const commitRename = () => {
    const name = renameDraft.trim();
    if (!name || !renamingId) { setRenamingId(null); return; }
    const next = categories.map((c) => (c.id === renamingId ? { ...c, name } : c));
    onChange(next);
    setRenamingId(null);
    toast.success(`Renamed to "${name}"`);
  };

  // ── Auto-suffix a pack name so import is always non-destructive ────────
  const uniqueName = (base) => {
    const existing = new Set(categories.map((c) => c.name));
    if (!existing.has(base)) return base;
    let n = 2;
    while (existing.has(`${base} (${n})`)) n++;
    return `${base} (${n})`;
  };

  // ── Open the bundle picker with everything pre-selected ─────────────
  const openBundlePicker = () => {
    if (categories.length === 0) { toast.error("No packs to bundle"); return; }
    setBundleSelected(new Set(categories.map((c) => c.id)));
    setBundlePickerOpen(true);
  };

  // Serialize a pack to the v1.1 export format (both lists included).
  const serializePack = (cat) => {
    const mapTag = (it) => ({
      label: it.label,
      iconType: it.iconType || "lucide",
      iconName: it.iconName || null,
      iconData: it.iconData || null,
    });
    return {
      formatVersion: 2,
      kind: "pps-tagpack",
      name: cat.name,
      description: "",
      exportedAt: new Date().toISOString(),
      folderTags: (cat.folderItems || []).map(mapTag),
      filenameTags: (cat.filenameItems || []).map(mapTag),
    };
  };

  // ── Bundle export — every SELECTED pack as one downloadable .zip ─────
  const bundleExport = async (idsToBundle) => {
    const picked = categories.filter((c) => idsToBundle.has(c.id));
    if (picked.length === 0) { toast.error("No packs selected"); return; }
    try {
      const zip = new JSZip();
      const stamp = new Date().toISOString().slice(0, 10);
      for (const cat of picked) {
        const payload = serializePack(cat);
        const safe = cat.name.replace(/[^\w\-]+/g, "_").slice(0, 60) || "pack";
        zip.file(`${safe}.pps-tagpack.json`, JSON.stringify(payload, null, 2));
      }
      zip.file("bundle.json", JSON.stringify({
        formatVersion: 2,
        kind: "pps-tagpack-bundle",
        exportedAt: new Date().toISOString(),
        packs: picked.map((c) => ({
          name: c.name,
          folderTagCount: c.folderItems?.length || 0,
          filenameTagCount: c.filenameItems?.length || 0,
        })),
      }, null, 2));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pps-tagpacks_${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setBundlePickerOpen(false);
      toast.success(`Bundled ${picked.length} pack${picked.length !== 1 ? "s" : ""}`, {
        description: `pps-tagpacks_${stamp}.zip`,
      });
    } catch (e) {
      toast.error("Bundle export failed", { description: e.message });
    }
  };

  // ── Export current pack to a downloadable JSON file ────────────────────
  const exportCurrent = () => {
    if (!current) return;
    const payload = serializePack(current);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const safe = current.name.replace(/[^\w\-]+/g, "_").slice(0, 60) || "tagpack";
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}.pps-tagpack.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported "${current.name}"`, {
      description: `${current.folderItems?.length || 0} folder + ${current.filenameItems?.length || 0} filename tags`,
    });
  };

  // ── Export current pack as a plain-text .pps-taglist.txt file ─────────
  const exportCurrentAsText = () => {
    if (!current) return;
    const text = serializePackText(current);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const safe = current.name.replace(/[^\w\-]+/g, "_").slice(0, 60) || "tagpack";
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}.pps-taglist.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported "${current.name}" as text`, {
      description: `${safe}.pps-taglist.txt — plain-text list, easy to share`,
    });
  };

  // ── Import one-or-many packs from a plain-text .txt list ──────────────
  const importFromTextFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseTagList(text); // array of { name, folderItems, filenameItems }
      // Give every pack a unique name & fresh id, then append
      const newCats = parsed.map((p) => ({
        id: uid("cat"),
        name: uniqueName(p.name),
        folderItems: p.folderItems,
        filenameItems: p.filenameItems,
      }));
      onChange([...categories, ...newCats]);
      setActiveCat(newCats[0].id);
      const total = newCats.reduce((n, c) => n + (c.folderItems.length + c.filenameItems.length), 0);
      toast.success(
        `Imported ${newCats.length} pack${newCats.length !== 1 ? "s" : ""}`,
        { description: `${total} tags total — every tag got the default icon (edit any time).` }
      );
    } catch (e) {
      toast.error("Text list import failed", { description: e.message });
    }
  };

  // ── Bulk-paste multiple tag labels (one per line) into a specific list
  //    of the current pack. Called by the ListSection's Paste popover.
  const bulkAddLabels = (listKey, rawText) => {
    if (!current) return 0;
    const labels = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !/^\s*\/\//.test(l))
      .slice(0, 200); // sanity cap
    if (labels.length === 0) return 0;
    const newItems = labels.map((label) => ({
      id: uid("it"),
      label: label.slice(0, 60),
      iconType: "lucide",
      iconName: listKey === "folderItems" ? "Folder" : "Tag",
    }));
    const next = categories.map((c) =>
      c.id === current.id ? { ...c, [listKey]: [...(c[listKey] || []), ...newItems] } : c
    );
    onChange(next);
    return newItems.length;
  };

  // ── Import a pack — always adds, auto-suffixes on name collision.
  // Supports v2 (folderTags + filenameTags) and legacy v1 (single `tags` list).
  const importFromFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.kind !== "pps-tagpack") {
        throw new Error("Not a valid Pro Photo Sorter tag pack file.");
      }
      const mapIn = (t) => ({
        id: uid("it"),
        label: String(t.label || "").slice(0, 60),
        iconType: t.iconType === "image" && t.iconData ? "image" : "lucide",
        iconName: t.iconName || "Tag",
        iconData: t.iconType === "image" ? t.iconData : undefined,
      });
      const filterValid = (arr) => arr.filter((it) => it.label);
      let folderItems = [];
      let filenameItems = [];
      if (Array.isArray(data.folderTags) || Array.isArray(data.filenameTags)) {
        folderItems = filterValid((data.folderTags || []).map(mapIn));
        filenameItems = filterValid((data.filenameTags || []).map(mapIn));
      } else if (Array.isArray(data.tags)) {
        // Legacy v1 format — all tags become folder tags (user can move any to filename later)
        folderItems = filterValid(data.tags.map(mapIn));
      } else {
        throw new Error("Tag pack file has no tags to import.");
      }
      const finalName = uniqueName(String(data.name || "Imported pack").trim() || "Imported pack");
      const newCat = { id: uid("cat"), name: finalName, folderItems, filenameItems };
      onChange([...categories, newCat]);
      setActiveCat(newCat.id);
      toast.success(`Imported "${finalName}"`, {
        description: `${folderItems.length} folder + ${filenameItems.length} filename tags`,
      });
    } catch (e) {
      toast.error("Import failed", { description: e.message });
    }
  };

  const handleImagePick = (listKey, e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      // Downscale to 64x64 for compact storage
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        const r = Math.max(64 / img.width, 64 / img.height);
        const w = img.width * r;
        const h = img.height * r;
        ctx.drawImage(img, (64 - w) / 2, (64 - h) / 2, w, h);
        setDrafts((cur) => ({
          ...cur,
          [listKey]: { ...cur[listKey], selectedImage: canvas.toDataURL("image/png") },
        }));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" data-testid="category-manager">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative pane rounded-lg w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-app">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-primary-earth" />
            <h2 className="font-heading font-semibold text-lg">Tag Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover"
            data-testid="category-manager-close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Categories column */}
          <div className="w-56 border-r border-app flex flex-col">
            <div className="p-3 border-b border-app space-y-2">
              <div className="flex gap-2">
                <input
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                  placeholder="New tag pack…"
                  className="flex-1 bg-app border border-app rounded px-2 py-1 text-sm focus-ring"
                  data-testid="new-category-input"
                />
                <button
                  onClick={addCategory}
                  className="w-8 h-8 rounded bg-primary-earth text-[color:var(--text-inverse)] flex items-center justify-center hover:opacity-90"
                  data-testid="add-category-btn"
                  title="Create a new empty tag pack"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="space-y-1">
                <input
                  ref={importRef}
                  type="file"
                  accept=".json,.pps-tagpack.json,application/json"
                  className="hidden-file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importFromFile(f);
                    e.target.value = ""; // reset so re-picking the same file re-fires
                  }}
                  data-testid="import-pack-input"
                />
                <button
                  onClick={() => importRef.current?.click()}
                  className="w-full px-2 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center justify-center gap-1"
                  data-testid="import-pack-btn"
                  title="Import a .pps-tagpack.json file — always adds as a new pack"
                >
                  <Upload size={12} /> Import pack…
                </button>
                <input
                  ref={importTextRef}
                  type="file"
                  accept=".txt,.pps-taglist.txt,text/plain"
                  className="hidden-file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) importFromTextFile(f);
                    e.target.value = "";
                  }}
                  data-testid="import-textlist-input"
                />
                <button
                  onClick={() => importTextRef.current?.click()}
                  className="w-full px-2 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center justify-center gap-1"
                  data-testid="import-textlist-btn"
                  title="Import a plain-text list (.pps-taglist.txt) — one or more packs in a single file"
                >
                  <FileText size={12} /> Import text list…
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-1">
              {categories.map((c) => (
                <div
                  key={c.id}
                  onClick={() => renamingId !== c.id && setActiveCat(c.id)}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm ${
                    activeCat === c.id ? "bg-primary-earth/20 text-primary-earth" : "hover:bg-surface-hover"
                  }`}
                  data-testid={`category-${c.id}`}
                >
                  {renamingId === c.id ? (
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 bg-app border border-primary-earth rounded px-1 py-0.5 text-sm focus-ring"
                      data-testid={`rename-input-${c.id}`}
                    />
                  ) : (
                    <span className="truncate flex-1">{c.name}</span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startRename(c);
                    }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-surface"
                    data-testid={`rename-category-${c.id}`}
                    title="Rename this tag pack"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCategory(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-surface"
                    data-testid={`remove-category-${c.id}`}
                    title="Delete this tag pack"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Items column */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {current ? (
              <>
                <div className="px-4 py-3 border-b border-app flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold truncate">{current.name}</h3>
                    <p className="text-xs text-dim mt-0.5">
                      {(current.folderItems?.length || 0)} folder tags · {(current.filenameItems?.length || 0)} filename tags
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={exportCurrent}
                      disabled={totalCount(current) === 0}
                      className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1 disabled:opacity-40"
                      data-testid="export-pack-btn"
                      title="Save this tag pack as a .pps-tagpack.json file you can share"
                    >
                      <Download size={12} /> Export pack
                    </button>
                    <button
                      onClick={exportCurrentAsText}
                      disabled={totalCount(current) === 0}
                      className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1 disabled:opacity-40"
                      data-testid="export-pack-text-btn"
                      title="Save this pack as a plain-text .pps-taglist.txt list — easy to edit and share"
                    >
                      <FileText size={12} /> Export as text
                    </button>
                  </div>
                </div>

                {/* Two-section paired list editor */}
                <div className="flex-1 overflow-auto">
                  <ListSection
                    listKey="folderItems"
                    listLabel="Folder path tags"
                    ListIcon={FolderTree}
                    helpText="Dropped onto the Folders bar → build the destination folder path (joined by /)."
                    items={current.folderItems || []}
                    draft={drafts.folderItems}
                    setDraft={(patch) => setDrafts((cur) => ({ ...cur, folderItems: { ...cur.folderItems, ...patch } }))}
                    fileRef={folderFileRef}
                    onAdd={() => addItem("folderItems")}
                    onRemove={(id) => removeItem("folderItems", id)}
                    onImagePick={(e) => handleImagePick("folderItems", e)}
                    onMoveIn={(fromKey, itemId) => moveTagBetweenLists(fromKey, "folderItems", itemId)}
                    onBulkPaste={(text) => bulkAddLabels("folderItems", text)}
                  />
                  <div className="h-px bg-app/60 mx-4" />
                  <ListSection
                    listKey="filenameItems"
                    listLabel="Filename tags"
                    ListIcon={TagIcon}
                    helpText="Dropped onto the Filename bar → appended to the destination filename (joined by _)."
                    items={current.filenameItems || []}
                    draft={drafts.filenameItems}
                    setDraft={(patch) => setDrafts((cur) => ({ ...cur, filenameItems: { ...cur.filenameItems, ...patch } }))}
                    fileRef={filenameFileRef}
                    onAdd={() => addItem("filenameItems")}
                    onRemove={(id) => removeItem("filenameItems", id)}
                    onImagePick={(e) => handleImagePick("filenameItems", e)}
                    onMoveIn={(fromKey, itemId) => moveTagBetweenLists(fromKey, "filenameItems", itemId)}
                    onBulkPaste={(text) => bulkAddLabels("filenameItems", text)}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-dim">
                Create a tag pack to begin.
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-app flex items-center justify-between text-xs text-dim gap-3">
          <div className="flex-1">
            Each pack holds two lists: <span className="text-primary-earth">Folder path tags</span> shape the destination
            folder tree, <span className="text-primary-earth">Filename tags</span> shape the final filename. Pick a pack
            from the Folders bar and both rows fill together.
          </div>
          <button
            onClick={openBundlePicker}
            disabled={categories.length === 0}
            className="px-2.5 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1 shrink-0 disabled:opacity-40"
            data-testid="bundle-export-btn"
            title="Save selected tag packs as a single .zip file — perfect for backup or sharing a curated set"
          >
            <Package size={12} /> Bundle…
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] font-medium text-sm shrink-0"
            data-testid="category-manager-done"
          >
            Done
          </button>
        </div>

        {/* Bundle picker overlay — nested inside the Tag Manager modal */}
        {bundlePickerOpen && (
          <div
            className="absolute inset-0 z-10 bg-black/60 flex items-center justify-center p-6"
            onClick={() => setBundlePickerOpen(false)}
            data-testid="bundle-picker-backdrop"
          >
            <div
              className="pane rounded-lg shadow-2xl border border-app w-full max-w-md flex flex-col max-h-full"
              onClick={(e) => e.stopPropagation()}
              data-testid="bundle-picker"
            >
              <div className="px-4 py-3 border-b border-app flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-semibold text-sm flex items-center gap-1">
                    <Package size={13} className="text-primary-earth" /> Bundle tag packs
                  </h3>
                  <p className="text-xs text-dim mt-0.5">Check the packs you want to include in the .zip</p>
                </div>
                <button
                  onClick={() => setBundlePickerOpen(false)}
                  className="w-7 h-7 rounded hover:bg-surface-hover flex items-center justify-center"
                  data-testid="bundle-picker-close"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="px-4 py-2 border-b border-app flex items-center justify-between text-xs">
                <span className="text-dim">
                  {bundleSelected.size} of {categories.length} selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBundleSelected(new Set(categories.map((c) => c.id)))}
                    className="text-primary-earth hover:underline"
                    data-testid="bundle-select-all"
                  >
                    Select all
                  </button>
                  <span className="text-dim">·</span>
                  <button
                    onClick={() => setBundleSelected(new Set())}
                    className="text-primary-earth hover:underline"
                    data-testid="bundle-select-none"
                  >
                    Select none
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-0.5 min-h-0">
                {categories.map((c) => {
                  const checked = bundleSelected.has(c.id);
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-hover cursor-pointer text-sm"
                      data-testid={`bundle-check-${c.id}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = new Set(bundleSelected);
                          if (e.target.checked) next.add(c.id); else next.delete(c.id);
                          setBundleSelected(next);
                        }}
                        className="w-4 h-4 accent-primary-earth cursor-pointer"
                      />
                      <span className="flex-1 truncate">{c.name}</span>
                      <span className="text-[10px] text-dim font-mono shrink-0">
                        {(c.folderItems?.length || 0)}f · {(c.filenameItems?.length || 0)}n
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="px-4 py-3 border-t border-app flex items-center justify-end gap-2">
                <button
                  onClick={() => setBundlePickerOpen(false)}
                  className="px-3 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs"
                  data-testid="bundle-picker-cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={() => bundleExport(bundleSelected)}
                  disabled={bundleSelected.size === 0}
                  className="px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
                  data-testid="bundle-picker-confirm"
                >
                  <Download size={12} /> Bundle {bundleSelected.size} pack{bundleSelected.size !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** One list section — folder tags OR filename tags — with add form + tag grid.
 *  Supports drag-and-drop MOVE of tags in/out via `onMoveIn(fromKey, itemId)`.
 *  Drop data type: "application/x-pps-tagmgr" carrying { fromKey, itemId }.
 */
function ListSection({ listKey, listLabel, ListIcon, helpText, items, draft, setDraft, fileRef, onAdd, onRemove, onImagePick, onMoveIn, onBulkPaste }) {
  const [dropOver, setDropOver] = React.useState(false);
  const [pasteOpen, setPasteOpen] = React.useState(false);
  const [pasteText, setPasteText] = React.useState("");
  return (
    <div
      className={`border-b border-app/40 last:border-b-0 transition-colors ${dropOver ? "bg-primary-earth/10 ring-1 ring-primary-earth/50" : ""}`}
      data-testid={`section-${listKey}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-pps-tagmgr")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setDropOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDropOver(false);
      }}
      onDrop={(e) => {
        setDropOver(false);
        const raw = e.dataTransfer.getData("application/x-pps-tagmgr");
        if (!raw) return;
        try {
          const { fromKey, itemId } = JSON.parse(raw);
          if (fromKey && itemId && fromKey !== listKey) {
            e.preventDefault();
            onMoveIn?.(fromKey, itemId);
          }
        } catch { /* ignore */ }
      }}
    >
      <div className="px-4 py-2 flex items-center gap-2 bg-app/40 sticky top-0 z-10">
        <ListIcon size={13} className="text-primary-earth" />
        <span className="text-[10px] uppercase tracking-widest font-heading text-app">{listLabel}</span>
        <span className="text-[10px] text-dim font-mono">{items.length}</span>
        <span className="ml-auto text-[10px] text-dim italic">Drag tags between sections to reassign</span>
      </div>

      {/* Add form for this list */}
      <div className="px-4 py-3 space-y-3">
        <p className="text-[11px] text-dim">{helpText}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDraft({ pickerMode: "builtin" })}
            className={`px-3 py-1 rounded text-xs font-medium ${
              draft.pickerMode === "builtin" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-surface text-dim"
            }`}
            data-testid={`${listKey}-mode-builtin`}
          >
            Built-in Icons
          </button>
          <button
            onClick={() => setDraft({ pickerMode: "image" })}
            className={`px-3 py-1 rounded text-xs font-medium ${
              draft.pickerMode === "image" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-surface text-dim"
            }`}
            data-testid={`${listKey}-mode-image`}
          >
            Custom Image
          </button>
        </div>

        {draft.pickerMode === "builtin" ? (
          <div className="grid grid-cols-12 gap-1 max-h-32 overflow-auto pane rounded p-2">
            {BUILTIN_ICONS.map((n) => (
              <button
                key={n}
                onClick={() => setDraft({ selectedBuiltin: n })}
                className={`w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover ${
                  draft.selectedBuiltin === n ? "bg-primary-earth/30 text-primary-earth" : "text-app"
                }`}
                title={n}
                data-testid={`${listKey}-icon-${n}`}
              >
                <BuiltinIcon name={n} size={16} />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded border border-app bg-surface flex items-center justify-center overflow-hidden">
              {draft.selectedImage ? (
                <img src={draft.selectedImage} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={20} className="text-dim" />
              )}
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden-file"
                onChange={onImagePick}
                data-testid={`${listKey}-custom-image-input`}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 rounded bg-surface hover:bg-surface-hover text-sm border border-app"
                data-testid={`${listKey}-pick-image-btn`}
              >
                Choose image…
              </button>
              <p className="text-[10px] text-dim mt-1">Auto cropped to 64×64</p>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            value={draft.label}
            onChange={(e) => setDraft({ label: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && onAdd()}
            placeholder={`New ${listLabel.toLowerCase().replace(/ tags$/, "")} label…`}
            className="flex-1 bg-app border border-app rounded px-2 py-1.5 text-sm focus-ring"
            spellCheck={true}
            autoCorrect="on"
            autoCapitalize="off"
            data-testid={`${listKey}-new-label`}
          />
          <button
            onClick={onAdd}
            className="px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-sm font-medium hover:opacity-90 flex items-center gap-1"
            data-testid={`${listKey}-add-btn`}
          >
            <Save size={14} /> Add
          </button>
          <button
            onClick={() => { setPasteText(""); setPasteOpen(true); }}
            className="px-3 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-sm flex items-center gap-1"
            data-testid={`${listKey}-paste-btn`}
            title="Paste a list of labels — one per line — and add them all at once"
          >
            <ClipboardPaste size={14} /> Paste…
          </button>
        </div>

        {pasteOpen && (
          <div className="mt-2 pane rounded border border-primary-earth/40 p-3 space-y-2" data-testid={`${listKey}-paste-popover`}>
            <div className="text-[10px] uppercase tracking-widest font-heading text-dim">
              Bulk add — one label per line
            </div>
            <textarea
              autoFocus
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.preventDefault(); setPasteOpen(false); }
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  const n = onBulkPaste?.(pasteText) || 0;
                  if (n > 0) {
                    toast.success(`Added ${n} ${listLabel.toLowerCase()}`);
                    setPasteOpen(false);
                    setPasteText("");
                  } else {
                    toast.error("No labels found — one label per line");
                  }
                }
              }}
              placeholder={`Ceremony\nReception\nPortraits\nDetails\n\n(one per line, lines starting with // are ignored)`}
              className="w-full bg-app border border-app rounded px-2 py-1.5 text-sm font-mono focus-ring min-h-[7rem]"
              spellCheck={true}
              data-testid={`${listKey}-paste-textarea`}
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] text-dim">Ctrl+Enter to add all, Esc to cancel</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPasteOpen(false)}
                  className="px-2 py-1 rounded bg-app border border-app hover:bg-surface-hover text-xs"
                  data-testid={`${listKey}-paste-cancel`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const n = onBulkPaste?.(pasteText) || 0;
                    if (n > 0) {
                      toast.success(`Added ${n} ${listLabel.toLowerCase()}`);
                      setPasteOpen(false);
                      setPasteText("");
                    } else {
                      toast.error("No labels found — one label per line");
                    }
                  }}
                  className="px-2 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-semibold flex items-center gap-1"
                  data-testid={`${listKey}-paste-confirm`}
                >
                  <Plus size={12} /> Add all
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tag grid */}
      <div className="px-4 pb-4">
        {items.length === 0 ? (
          <div className="text-center text-dim text-xs py-4 italic">
            No {listLabel.toLowerCase()} yet.
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {items.map((it) => (
              <div
                key={it.id}
                className="pane rounded p-2 flex items-center gap-2 group cursor-grab active:cursor-grabbing"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/x-pps-tagmgr",
                    JSON.stringify({ fromKey: listKey, itemId: it.id })
                  );
                  e.dataTransfer.effectAllowed = "move";
                }}
                title={`Drag to the ${listKey === "folderItems" ? "Filename" : "Folder"} section to reassign`}
                data-testid={`${listKey}-item-${it.id}`}
              >
                <div className="w-9 h-9 rounded bg-app border border-app flex items-center justify-center text-primary-earth shrink-0">
                  <IconPreview item={it} size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{it.label}</div>
                  <div className="text-[10px] text-dim truncate">
                    {it.iconType === "image" ? "custom" : it.iconName}
                  </div>
                </div>
                <button
                  onClick={() => onRemove(it.id)}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded flex items-center justify-center hover:bg-surface-hover text-dim hover:text-danger-earth"
                  data-testid={`${listKey}-remove-${it.id}`}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useRef } from "react";
import * as Lucide from "lucide-react";
import { Plus, Trash2, X, Image as ImageIcon, Palette, Save, Download, Upload, Pencil, Package } from "lucide-react";
import JSZip from "jszip";
import { uid } from "../lib/storage";
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
  const [newItemLabel, setNewItemLabel] = useState("");
  const [pickerMode, setPickerMode] = useState("builtin"); // builtin | image
  const [selectedBuiltin, setSelectedBuiltin] = useState("Star");
  const [selectedImage, setSelectedImage] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const fileRef = useRef(null);
  const importRef = useRef(null);

  if (!open) return null;

  const current = categories.find((c) => c.id === activeCat) || categories[0];

  const addCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    const cat = { id: uid("cat"), name, items: [] };
    onChange([...categories, cat]);
    setActiveCat(cat.id);
    setNewCatName("");
  };

  const removeCategory = (id) => {
    const next = categories.filter((c) => c.id !== id);
    onChange(next);
    if (activeCat === id) setActiveCat(next[0]?.id || null);
  };

  const addItem = () => {
    if (!current) return;
    const label = newItemLabel.trim();
    if (!label) return;
    const item =
      pickerMode === "image" && selectedImage
        ? { id: uid("it"), label, iconType: "image", iconData: selectedImage }
        : { id: uid("it"), label, iconType: "lucide", iconName: selectedBuiltin };
    const next = categories.map((c) =>
      c.id === current.id ? { ...c, items: [...c.items, item] } : c
    );
    onChange(next);
    setNewItemLabel("");
    setSelectedImage(null);
  };

  const removeItem = (itemId) => {
    const next = categories.map((c) =>
      c.id === current.id ? { ...c, items: c.items.filter((it) => it.id !== itemId) } : c
    );
    onChange(next);
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

  // ── Bundle export — every pack as one downloadable .zip ───────────────
  const bundleExport = async () => {
    if (categories.length === 0) { toast.error("No packs to bundle"); return; }
    try {
      const zip = new JSZip();
      const stamp = new Date().toISOString().slice(0, 10);
      for (const cat of categories) {
        const payload = {
          formatVersion: 1,
          kind: "pps-tagpack",
          name: cat.name,
          description: "",
          exportedAt: new Date().toISOString(),
          tags: cat.items.map((it) => ({
            label: it.label,
            iconType: it.iconType || "lucide",
            iconName: it.iconName || null,
            iconData: it.iconData || null,
          })),
        };
        const safe = cat.name.replace(/[^\w\-]+/g, "_").slice(0, 60) || "pack";
        zip.file(`${safe}.pps-tagpack.json`, JSON.stringify(payload, null, 2));
      }
      // Include a small manifest so future importers can round-trip the whole bundle
      zip.file("bundle.json", JSON.stringify({
        formatVersion: 1,
        kind: "pps-tagpack-bundle",
        exportedAt: new Date().toISOString(),
        packs: categories.map((c) => ({ name: c.name, tagCount: c.items.length })),
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
      toast.success(`Bundled ${categories.length} pack${categories.length !== 1 ? "s" : ""}`, {
        description: `pps-tagpacks_${stamp}.zip`,
      });
    } catch (e) {
      toast.error("Bundle export failed", { description: e.message });
    }
  };

  // ── Export current pack to a downloadable JSON file ────────────────────
  const exportCurrent = () => {
    if (!current) return;
    const payload = {
      formatVersion: 1,
      kind: "pps-tagpack",
      name: current.name,
      description: "",
      exportedAt: new Date().toISOString(),
      tags: current.items.map((it) => ({
        label: it.label,
        iconType: it.iconType || "lucide",
        iconName: it.iconName || null,
        iconData: it.iconData || null,
      })),
    };
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
    toast.success(`Exported "${current.name}"`, { description: `${current.items.length} tag${current.items.length !== 1 ? "s" : ""}` });
  };

  // ── Import a pack — always adds, auto-suffixes on name collision ──────
  const importFromFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.kind !== "pps-tagpack" || !Array.isArray(data.tags)) {
        throw new Error("Not a valid Pro Photo Sorter tag pack file.");
      }
      const finalName = uniqueName(String(data.name || "Imported pack").trim() || "Imported pack");
      const newCat = {
        id: uid("cat"),
        name: finalName,
        items: data.tags.map((t) => ({
          id: uid("it"),
          label: String(t.label || "").slice(0, 60),
          iconType: t.iconType === "image" && t.iconData ? "image" : "lucide",
          iconName: t.iconName || "Tag",
          iconData: t.iconType === "image" ? t.iconData : undefined,
        })).filter((it) => it.label),
      };
      onChange([...categories, newCat]);
      setActiveCat(newCat.id);
      toast.success(`Imported "${finalName}"`, { description: `${newCat.items.length} tag${newCat.items.length !== 1 ? "s" : ""}` });
    } catch (e) {
      toast.error("Import failed", { description: e.message });
    }
  };

  const handleImagePick = (e) => {
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
        // cover
        const r = Math.max(64 / img.width, 64 / img.height);
        const w = img.width * r;
        const h = img.height * r;
        ctx.drawImage(img, (64 - w) / 2, (64 - h) / 2, w, h);
        setSelectedImage(canvas.toDataURL("image/png"));
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
              <div>
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
                    <p className="text-xs text-dim mt-0.5">{current.items.length} tags</p>
                  </div>
                  <button
                    onClick={exportCurrent}
                    disabled={current.items.length === 0}
                    className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1 disabled:opacity-40 shrink-0"
                    data-testid="export-pack-btn"
                    title="Save this tag pack as a .pps-tagpack.json file you can share"
                  >
                    <Download size={12} /> Export pack
                  </button>
                </div>

                {/* Add item */}
                <div className="px-4 py-3 border-b border-app space-y-3 bg-app">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPickerMode("builtin")}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        pickerMode === "builtin" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-surface text-dim"
                      }`}
                      data-testid="mode-builtin"
                    >
                      Built-in Icons
                    </button>
                    <button
                      onClick={() => setPickerMode("image")}
                      className={`px-3 py-1 rounded text-xs font-medium ${
                        pickerMode === "image" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-surface text-dim"
                      }`}
                      data-testid="mode-image"
                    >
                      Custom Image
                    </button>
                  </div>

                  {pickerMode === "builtin" ? (
                    <div className="grid grid-cols-12 gap-1 max-h-32 overflow-auto pane rounded p-2">
                      {BUILTIN_ICONS.map((n) => (
                        <button
                          key={n}
                          onClick={() => setSelectedBuiltin(n)}
                          className={`w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover ${
                            selectedBuiltin === n ? "bg-primary-earth/30 text-primary-earth" : "text-app"
                          }`}
                          title={n}
                          data-testid={`icon-${n}`}
                        >
                          <BuiltinIcon name={n} size={16} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded border border-app bg-surface flex items-center justify-center overflow-hidden">
                        {selectedImage ? (
                          <img src={selectedImage} alt="preview" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={20} className="text-dim" />
                        )}
                      </div>
                      <div>
                        <input ref={fileRef} type="file" accept="image/*" className="hidden-file" onChange={handleImagePick} data-testid="custom-image-input" />
                        <button
                          onClick={() => fileRef.current?.click()}
                          className="px-3 py-1.5 rounded bg-surface hover:bg-surface-hover text-sm border border-app"
                          data-testid="pick-image-btn"
                        >
                          Choose image…
                        </button>
                        <p className="text-[10px] text-dim mt-1">Auto cropped to 64×64</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input
                      value={newItemLabel}
                      onChange={(e) => setNewItemLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addItem()}
                      placeholder="Tag label (used in filename/folder)…"
                      className="flex-1 bg-app border border-app rounded px-2 py-1.5 text-sm focus-ring"
                      data-testid="new-item-label"
                    />
                    <button
                      onClick={addItem}
                      className="px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-sm font-medium hover:opacity-90 flex items-center gap-1"
                      data-testid="add-item-btn"
                    >
                      <Save size={14} /> Add
                    </button>
                  </div>
                </div>

                {/* Items grid */}
                <div className="flex-1 overflow-auto p-4">
                  {current.items.length === 0 ? (
                    <div className="text-center text-dim text-sm py-10">No tags yet. Add one above.</div>
                  ) : (
                    <div className="grid grid-cols-4 gap-3">
                      {current.items.map((it) => (
                        <div
                          key={it.id}
                          className="pane rounded p-3 flex items-center gap-2 group"
                          data-testid={`category-item-${it.id}`}
                        >
                          <div className="w-10 h-10 rounded bg-app border border-app flex items-center justify-center text-primary-earth shrink-0">
                            <IconPreview item={it} size={22} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{it.label}</div>
                            <div className="text-[10px] text-dim">
                              {it.iconType === "image" ? "custom" : it.iconName}
                            </div>
                          </div>
                          <button
                            onClick={() => removeItem(it.id)}
                            className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded flex items-center justify-center hover:bg-surface-hover text-dim hover:text-danger-earth"
                            data-testid={`remove-item-${it.id}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
          <div className="flex-1">Tag packs let you swap sets of tags for different photography styles. Drag tags onto the <span className="text-primary-earth">Folders</span> row (nested subfolders joined by /) or the <span className="text-primary-earth">Filename</span> row (joined by _).</div>
          <button
            onClick={bundleExport}
            disabled={categories.length === 0}
            className="px-2.5 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1 shrink-0 disabled:opacity-40"
            data-testid="bundle-export-btn"
            title="Save every one of your tag packs as a single .zip file — perfect for backup or moving to another PC"
          >
            <Package size={12} /> Bundle all…
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] font-medium text-sm shrink-0"
            data-testid="category-manager-done"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef } from "react";
import * as Lucide from "lucide-react";
import { Plus, Trash2, X, Image as ImageIcon, Palette, Save } from "lucide-react";
import { uid } from "../lib/storage";

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
  const fileRef = useRef(null);

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
            <h2 className="font-heading font-semibold text-lg">Category Manager</h2>
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
            <div className="p-3 border-b border-app flex gap-2">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
                placeholder="New list…"
                className="flex-1 bg-app border border-app rounded px-2 py-1 text-sm focus-ring"
                data-testid="new-category-input"
              />
              <button
                onClick={addCategory}
                className="w-8 h-8 rounded bg-primary-earth text-[color:var(--text-inverse)] flex items-center justify-center hover:opacity-90"
                data-testid="add-category-btn"
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-1">
              {categories.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setActiveCat(c.id)}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm ${
                    activeCat === c.id ? "bg-primary-earth/20 text-primary-earth" : "hover:bg-surface-hover"
                  }`}
                  data-testid={`category-${c.id}`}
                >
                  <span className="truncate">{c.name}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCategory(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded hover:bg-surface"
                    data-testid={`remove-category-${c.id}`}
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
                <div className="px-4 py-3 border-b border-app">
                  <h3 className="font-heading font-semibold">{current.name}</h3>
                  <p className="text-xs text-dim mt-0.5">{current.items.length} icons</p>
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
                      placeholder="Label (used in filename/folder)…"
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
                    <div className="text-center text-dim text-sm py-10">No icons yet. Add one above.</div>
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
                Create a category to begin.
              </div>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-app flex items-center justify-between text-xs text-dim">
          <div>Drag icons onto the <span className="text-primary-earth">Folders</span> row (nested subfolders joined by /) or the <span className="text-primary-earth">Filename</span> row (joined by _).</div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] font-medium text-sm"
            data-testid="category-manager-done"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

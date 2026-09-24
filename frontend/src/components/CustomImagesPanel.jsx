// v1.3.1 — Custom Images Library
//
// A persistent, drag-and-droppable gallery of PNG icons the user can
// bulk-import once and then re-use as chip icons throughout Pro Photo
// Sorter. Every image is downscaled to a fixed max dimension so a
// library of ~150 icons still fits comfortably inside localStorage.
//
// Data shape (persisted via lib/storage.js -> state.customImages):
//   [{ id, name, catId (string | null=Global), dataUrl }, ...]
//
// Drag payload matches the existing icon-swap contract used by
// CategoryManager.jsx / IconPalette so any custom image can be dropped
// onto ANY chip's icon area to swap it in place:
//   dataTransfer.setData("application/x-pps-iconswap",
//     JSON.stringify({ iconType: "image", iconData: dataUrl }))

import React, { useMemo, useRef, useState } from "react";
import { Image as ImageIcon, Upload, Trash2, Pencil, Globe, Package, X } from "lucide-react";
import { toast } from "sonner";
import { uid } from "@/lib/storage";

const MAX_DIM = 128; // px — target size for stored icons (fits ~10 KB each)
const MAX_ACCEPTED_MIME = "image/png,image/jpeg,image/webp";

/** Downscale an image File into a square-fit 128×128 PNG data URL. */
async function fileToDownscaledDataUrl(file) {
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = () => rej(new Error("Read failed"));
    r.readAsDataURL(file);
  });
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Decode failed"));
    i.src = dataUrl;
  });
  // Preserve aspect ratio but never exceed MAX_DIM in either dimension.
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const scale = Math.min(1, MAX_DIM / Math.max(w, h));
  const outW = Math.max(1, Math.round(w * scale));
  const outH = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, outW, outH);
  return canvas.toDataURL("image/png");
}

export default function CustomImagesPanel({
  customImages = [],
  onCustomImagesChange,
  activeCatId,
  activeCatName,
}) {
  const [tab, setTab] = useState("global"); // "global" | "category"
  const [busy, setBusy] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const fileRef = useRef(null);

  const scope = tab === "global" ? null : activeCatId;
  const visible = useMemo(
    () => customImages.filter((img) => (img.catId ?? null) === scope),
    [customImages, scope]
  );

  const globalCount = useMemo(
    () => customImages.filter((img) => (img.catId ?? null) === null).length,
    [customImages]
  );
  const catCount = useMemo(
    () => customImages.filter((img) => img.catId === activeCatId).length,
    [customImages, activeCatId]
  );

  const totalBytes = useMemo(() => {
    // Rough estimate: dataUrl length ~= 4/3 of raw bytes.
    return Math.round(
      customImages.reduce((n, img) => n + (img.dataUrl?.length || 0), 0) * 0.75
    );
  }, [customImages]);

  const bulkImport = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    let added = 0;
    let failed = 0;
    const newBatch = [];
    for (const f of Array.from(fileList)) {
      if (!/^image\//i.test(f.type)) { failed++; continue; }
      try {
        const dataUrl = await fileToDownscaledDataUrl(f);
        newBatch.push({
          id: uid("cim"),
          name: f.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Untitled",
          catId: scope, // null = Global; string = per-category
          dataUrl,
        });
        added++;
      } catch {
        failed++;
      }
    }
    if (newBatch.length > 0) {
      onCustomImagesChange?.((prev) => [...(prev || []), ...newBatch]);
    }
    setBusy(false);
    if (added > 0) {
      toast.success(
        `Imported ${added} image${added === 1 ? "" : "s"}${failed ? ` (${failed} skipped)` : ""}`,
        { description: scope ? `Scope: ${activeCatName}` : "Scope: Global — usable across every category" }
      );
    } else if (failed > 0) {
      toast.error(`Import failed`, { description: `${failed} file${failed === 1 ? "" : "s"} were not valid images.` });
    }
  };

  const removeImage = (id, name) => {
    if (!window.confirm(`Delete "${name}" from your Custom Images library?\n\nAlready-applied chip icons on your tags stay untouched — this only removes it from future picks.`)) return;
    onCustomImagesChange?.((prev) => (prev || []).filter((img) => img.id !== id));
    toast(`Deleted "${name}"`);
  };

  const startRename = (img) => {
    setRenamingId(img.id);
    setRenameDraft(img.name);
  };
  const commitRename = () => {
    const trimmed = renameDraft.trim().slice(0, 40);
    if (renamingId && trimmed) {
      onCustomImagesChange?.((prev) =>
        (prev || []).map((img) => (img.id === renamingId ? { ...img, name: trimmed } : img))
      );
    }
    setRenamingId(null);
    setRenameDraft("");
  };

  const emptyMsg = scope
    ? `No custom images in "${activeCatName}" yet. Click "Import PNGs…" above to add some — they'll appear as draggable icons here.`
    : "No global images yet. Click \"Import PNGs…\" to add PNG/JPG/WEBP icons that stay available across every category.";

  return (
    <div className="flex flex-col h-full" data-testid="custom-images-panel">
      {/* Header */}
      <div className="px-4 py-3 border-b border-app bg-surface sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-primary-earth" />
          <h3 className="font-heading font-semibold">Custom Images Library</h3>
          <span className="text-xs text-dim" data-testid="cim-total-count">
            {customImages.length} image{customImages.length === 1 ? "" : "s"} · ~{(totalBytes / 1024).toFixed(0)} KB
          </span>
        </div>
        <p className="text-[11px] text-dim mt-1">
          Bulk-import your favourite PNG icons once, then drag them onto any chip's icon to swap it — no more one-at-a-time file picker.
        </p>

        {/* Tabs */}
        <div className="mt-3 flex items-center gap-1">
          <button
            onClick={() => setTab("global")}
            className={`px-3 py-1.5 rounded-t text-xs flex items-center gap-1.5 border-b-2 transition-colors ${
              tab === "global"
                ? "border-primary-earth text-primary-earth bg-primary-earth/10"
                : "border-transparent text-dim hover:text-app hover:bg-surface-hover"
            }`}
            data-testid="cim-tab-global"
          >
            <Globe size={12} /> Global
            <span className="ml-1 font-mono text-[10px] opacity-70">{globalCount}</span>
          </button>
          <button
            onClick={() => setTab("category")}
            disabled={!activeCatId}
            className={`px-3 py-1.5 rounded-t text-xs flex items-center gap-1.5 border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              tab === "category"
                ? "border-primary-earth text-primary-earth bg-primary-earth/10"
                : "border-transparent text-dim hover:text-app hover:bg-surface-hover"
            }`}
            data-testid="cim-tab-category"
            title={activeCatId ? `Per-category — pick a category first, then bulk-import here` : "Pick a category first"}
          >
            <Package size={12} /> Per-Category: <span className="font-semibold">{activeCatName || "—"}</span>
            <span className="ml-1 font-mono text-[10px] opacity-70">{catCount}</span>
          </button>
          <div className="flex-1" />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy || (tab === "category" && !activeCatId)}
            className="px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="cim-import-btn"
            title={`Import PNG/JPG/WEBP files — multi-select supported. Downscales to ${MAX_DIM}×${MAX_DIM} max.`}
          >
            <Upload size={12} /> {busy ? "Importing…" : "Import PNGs…"}
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={MAX_ACCEPTED_MIME}
            className="hidden-file"
            onChange={(e) => {
              bulkImport(e.target.files);
              e.target.value = "";
            }}
            data-testid="cim-file-input"
          />
        </div>
      </div>

      {/* Gallery */}
      <div className="flex-1 overflow-auto p-4">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-dim">
            <ImageIcon size={40} className="opacity-40 mb-3" />
            <p className="text-sm max-w-md leading-relaxed">{emptyMsg}</p>
          </div>
        ) : (
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))" }}
            data-testid="cim-gallery"
          >
            {visible.map((img) => (
              <div
                key={img.id}
                draggable
                onDragStart={(e) => {
                  // Matches the existing icon-swap contract so this image can
                  // be dropped onto ANY chip in Tag Manager or the main window.
                  e.dataTransfer.setData(
                    "application/x-pps-iconswap",
                    JSON.stringify({ iconType: "image", iconData: img.dataUrl })
                  );
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className="group relative pane rounded-lg overflow-hidden border border-app hover:border-primary-earth transition-colors cursor-grab active:cursor-grabbing"
                title={`${img.name} — drag onto any chip icon to swap`}
                data-testid={`cim-item-${img.id}`}
              >
                <div className="aspect-square flex items-center justify-center bg-surface p-2">
                  <img
                    src={img.dataUrl}
                    alt={img.name}
                    draggable={false}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
                {renamingId === img.id ? (
                  <input
                    autoFocus
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") { setRenamingId(null); setRenameDraft(""); }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-2 py-1 text-[11px] font-mono bg-app border-t border-primary-earth focus-ring"
                    data-testid={`cim-rename-input-${img.id}`}
                  />
                ) : (
                  <button
                    onDoubleClick={() => startRename(img)}
                    className="w-full px-2 py-1 text-[11px] font-mono text-app hover:text-primary-earth border-t border-app truncate text-left"
                    title="Double-click to rename"
                    data-testid={`cim-name-${img.id}`}
                  >
                    {img.name}
                  </button>
                )}
                {/* Hover actions */}
                <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); startRename(img); }}
                    className="w-6 h-6 rounded flex items-center justify-center bg-app/90 border border-app hover:text-primary-earth"
                    data-testid={`cim-rename-btn-${img.id}`}
                    title="Rename"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeImage(img.id, img.name); }}
                    className="w-6 h-6 rounded flex items-center justify-center bg-app/90 border border-app hover:text-danger-earth"
                    data-testid={`cim-delete-btn-${img.id}`}
                    title="Delete from library"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

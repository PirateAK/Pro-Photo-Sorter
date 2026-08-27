import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import exifr from "exifr";
import { Toaster, toast } from "sonner";
import {
  FolderOpen,
  Trash2,
  SkipForward,
  Save,
  Undo2,
  Camera,
  Aperture,
  Calendar,
  MapPin,
  Layers,
  Copy,
  Keyboard,
  Info,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
} from "lucide-react";

import "@/App.css";
import FileTree from "@/components/FileTree";
import Thumbnail from "@/components/Thumbnail";
import CategoryManager from "@/components/CategoryManager";
import IconPalette from "@/components/IconPalette";
import IconOverlay from "@/components/IconOverlay";
import StarRating from "@/components/StarRating";
import SettingsModal from "@/components/SettingsModal";
import ImageEditor from "@/components/ImageEditor";
import { Settings as Cog, MoveRight, Copy as CopyIcon, Star as StarIcon, Scissors } from "lucide-react";
import {
  isFSAccessSupported,
  pickDirectory,
  listImagesInDir,
  getOrCreateSubdir,
  copyFileTo,
  removeEntry,
} from "@/lib/fsapi";
import { loadState, saveState, uid } from "@/lib/storage";
import { renderTemplate } from "@/lib/template";

function usePersistedState() {
  const [state, setState] = useState(() => loadState());
  const persist = (updater) => {
    setState((s) => {
      const next = typeof updater === "function" ? updater(s) : updater;
      saveState(next);
      return next;
    });
  };
  return {
    state,
    setCategories: (cats) => persist((s) => ({ ...s, categories: cats })),
    setSettings: (settings) => persist((s) => ({ ...s, settings })),
    setRatings: (updater) =>
      persist((s) => ({ ...s, ratings: typeof updater === "function" ? updater(s.ratings) : updater })),
  };
}

function extToLower(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i) : "";
}
function baseName(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

export default function App() {
  const { state, setCategories, setSettings, setRatings } = usePersistedState();
  const { categories, settings, ratings } = state;
  const [activeCatId, setActiveCatId] = useState(categories[0]?.id || null);

  // Source
  const [sourceRoot, setSourceRoot] = useState(null);
  const [sourceRootName, setSourceRootName] = useState("");
  const [currentSourceFolder, setCurrentSourceFolder] = useState(null); // handle
  const [currentSourcePath, setCurrentSourcePath] = useState("");
  const [images, setImages] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [exif, setExif] = useState(null);

  // Destination
  const [destRoot, setDestRoot] = useState(null);
  const [destRootName, setDestRootName] = useState("");
  const [destSelected, setDestSelected] = useState(null); // { handle, path }

  // Applied icons on current image (per image, keyed by name in current folder)
  const [appliedByImage, setAppliedByImage] = useState({});
  const currentImage = images[selectedIdx] || null;
  const appliedIcons = currentImage ? appliedByImage[currentImage.name] || [] : [];

  // Batch selection
  const [batchMode, setBatchMode] = useState(false);
  const [batchSelected, setBatchSelected] = useState(new Set());

  // Category manager modal
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // Current image star rating
  const currentImagePath = currentImage ? `${currentSourcePath}/${currentImage.name}` : null;
  const currentStars = currentImagePath ? (ratings[currentImagePath] || 0) : 0;
  const setCurrentStars = (val) => {
    if (!currentImagePath) return;
    setRatings((r) => {
      const next = { ...r };
      if (!val) delete next[currentImagePath];
      else next[currentImagePath] = val;
      return next;
    });
  };

  // Undo history
  const [history, setHistory] = useState([]);

  const imageAreaRef = useRef(null);

  const pickSource = async () => {
    try {
      const h = await pickDirectory();
      setSourceRoot(h);
      setSourceRootName(h.name);
      toast.success(`Loaded source: ${h.name}`);
    } catch (e) {
      if (e?.name !== "AbortError") toast.error(e.message || "Failed to open folder");
    }
  };
  const pickDest = async () => {
    try {
      const h = await pickDirectory();
      setDestRoot(h);
      setDestRootName(h.name);
      toast.success(`Loaded destination: ${h.name}`);
    } catch (e) {
      if (e?.name !== "AbortError") toast.error(e.message || "Failed to open folder");
    }
  };

  // When user clicks a folder in the source tree
  const onSelectSourceFolder = useCallback(async (node, path) => {
    setCurrentSourceFolder(node.handle);
    setCurrentSourcePath(path);
    setSelectedIdx(0);
    setBatchSelected(new Set());
    try {
      const imgs = await listImagesInDir(node.handle);
      setImages(imgs);
      if (imgs.length === 0) toast("No images in this folder");
    } catch (e) {
      setImages([]);
      toast.error("Could not read folder");
    }
  }, []);

  const onSelectDestFolder = useCallback((node, path) => {
    setDestSelected({ handle: node.handle, path });
  }, []);

  // Load preview + EXIF when selection changes
  useEffect(() => {
    let alive = true;
    let url = null;
    (async () => {
      setPreviewUrl(null);
      setExif(null);
      if (!currentImage) return;
      try {
        const file = await currentImage.handle.getFile();
        url = URL.createObjectURL(file);
        if (alive) setPreviewUrl(url);
        // EXIF
        try {
          const data = await exifr.parse(file, {
            gps: true,
            pick: ["DateTimeOriginal", "CreateDate", "Model", "LensModel", "FNumber", "ISO", "ExposureTime", "FocalLength", "latitude", "longitude"],
          });
          if (alive) setExif(data || null);
        } catch {
          if (alive) setExif(null);
        }
      } catch (e) {
        if (alive) toast.error("Could not preview image");
      }
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [currentImage]);

  // Apply an icon to current (or batch) image(s)
  const applyIcon = useCallback(
    (icon) => {
      const decorated = { ...icon, uid: uid("ovl") };
      setAppliedByImage((cur) => {
        const next = { ...cur };
        const targets = batchMode && batchSelected.size > 0
          ? [...batchSelected]
          : currentImage ? [currentImage.name] : [];
        for (const name of targets) {
          next[name] = [...(cur[name] || []), { ...decorated, uid: uid("ovl") }];
        }
        return next;
      });
    },
    [batchMode, batchSelected, currentImage]
  );

  const reorderIcons = (newList) => {
    if (!currentImage) return;
    setAppliedByImage((cur) => ({ ...cur, [currentImage.name]: newList }));
  };
  const removeAppliedIcon = (u) => {
    if (!currentImage) return;
    setAppliedByImage((cur) => ({
      ...cur,
      [currentImage.name]: (cur[currentImage.name] || []).filter((i) => i.uid !== u),
    }));
  };

  // Drag from palette onto image
  const onImageDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-pps-icon");
    if (!raw) return;
    try {
      const item = JSON.parse(raw);
      applyIcon(item);
    } catch {}
  };

  // Actions ---------------------------------------------------------------

  const removeCurrentFromView = () => {
    if (!currentImage) return;
    // "Remove" = drop from the working list (does not touch disk)
    const nm = currentImage.name;
    setHistory((h) => [{ type: "remove-view", name: nm, image: currentImage }, ...h].slice(0, 30));
    setImages((imgs) => imgs.filter((_, i) => i !== selectedIdx));
    setAppliedByImage((cur) => {
      const n = { ...cur };
      delete n[nm];
      return n;
    });
    setSelectedIdx((i) => Math.max(0, Math.min(i, images.length - 2)));
    toast("Removed from list", { description: nm });
  };

  const deleteCurrentFile = async () => {
    if (!currentImage || !currentSourceFolder) return;
    const nm = currentImage.name;
    const ok = window.confirm(`Delete "${nm}" from disk? This cannot be undone.`);
    if (!ok) return;
    try {
      await removeEntry(currentSourceFolder, nm);
      setHistory((h) => [{ type: "delete", name: nm }, ...h].slice(0, 30));
      setImages((imgs) => imgs.filter((_, i) => i !== selectedIdx));
      setAppliedByImage((cur) => {
        const n = { ...cur };
        delete n[nm];
        return n;
      });
      setSelectedIdx((i) => Math.max(0, Math.min(i, images.length - 2)));
      toast.error("Deleted from disk", { description: nm });
    } catch (e) {
      toast.error("Delete failed", { description: e.message });
    }
  };

  const storeCurrent = async () => {
    if (!currentImage) return;
    if (!destRoot) {
      toast.error("Choose a destination drive first");
      return;
    }
    const targets = batchMode && batchSelected.size > 0
      ? images.filter((i) => batchSelected.has(i.name))
      : [currentImage];

    let stored = 0;
    const undoEntries = [];
    const movedNames = [];
    for (const img of targets) {
      const icons = appliedByImage[img.name] || [];
      if (icons.length === 0) {
        toast.error(`No icons on ${img.name}`, { description: "Drag icons to build the path first." });
        continue;
      }
      const imgPath = `${currentSourcePath}/${img.name}`;
      const stars = ratings[imgPath] || 0;
      // We need EXIF date for template; parse quickly for batch items other than current.
      let imgExifDate = null;
      if (img === currentImage) {
        imgExifDate = exif?.DateTimeOriginal || exif?.CreateDate || null;
      } else {
        try {
          const f = await img.handle.getFile();
          const d = await exifr.parse(f, { pick: ["DateTimeOriginal", "CreateDate"] });
          imgExifDate = d?.DateTimeOriginal || d?.CreateDate || null;
        } catch { /* ignore */ }
      }

      const { folderParts, fileName } = renderTemplate(settings.filenameTemplate, {
        icons,
        originalName: img.name,
        exifDate: imgExifDate,
        stars,
      });
      const anchor = destSelected?.handle || destRoot;
      try {
        const targetDir = await getOrCreateSubdir(anchor, folderParts);
        const writtenName = await copyFileTo(img.handle, targetDir, fileName);
        stored++;
        undoEntries.push({
          type: "store",
          sourceName: img.name,
          targetDir,
          writtenName,
          moved: settings.moveMode,
        });
        // Move mode: delete source after successful copy
        if (settings.moveMode && currentSourceFolder) {
          try {
            await removeEntry(currentSourceFolder, img.name);
            movedNames.push(img.name);
          } catch (e) {
            toast.error(`Moved but couldn't remove source: ${img.name}`);
          }
        }
      } catch (e) {
        toast.error(`Store failed: ${img.name}`, { description: e.message });
      }
    }
    if (stored > 0) {
      setHistory((h) => [{ type: "store-batch", entries: undoEntries }, ...h].slice(0, 30));
      const verb = settings.moveMode ? "Moved" : "Stored";
      toast.success(`${verb} ${stored} photo${stored > 1 ? "s" : ""}`, {
        description: destSelected?.path || destRootName,
      });
      // Remove moved files from filmstrip
      if (movedNames.length > 0) {
        const removedSet = new Set(movedNames);
        setImages((imgs) => imgs.filter((im) => !removedSet.has(im.name)));
        setAppliedByImage((cur) => {
          const n = { ...cur };
          for (const nm of movedNames) delete n[nm];
          return n;
        });
        setSelectedIdx((i) => Math.max(0, Math.min(i, images.length - movedNames.length - 1)));
      }
      if (batchMode) setBatchSelected(new Set());
    }
  };

  const undo = async () => {
    const [last, ...rest] = history;
    if (!last) return;
    setHistory(rest);
    if (last.type === "remove-view") {
      setImages((imgs) => {
        const already = imgs.some((i) => i.name === last.name);
        return already ? imgs : [...imgs, last.image].sort((a, b) => a.name.localeCompare(b.name));
      });
      toast("Restored to list", { description: last.name });
    } else if (last.type === "delete") {
      toast("Cannot undo disk deletion", { description: "Use OS trash / Windows Recycle Bin" });
    } else if (last.type === "store-batch") {
      let removed = 0;
      for (const e of last.entries) {
        try {
          await removeEntry(e.targetDir, e.writtenName);
          removed++;
        } catch {}
      }
      toast(`Undo: removed ${removed} copied file${removed !== 1 ? "s" : ""}`);
    }
  };

  // Navigation
  const goPrev = () => setSelectedIdx((i) => Math.max(0, i - 1));
  const goNext = () => setSelectedIdx((i) => Math.min(images.length - 1, i + 1));

  const toggleBatch = () => {
    setBatchMode((v) => !v);
    setBatchSelected(new Set());
  };
  const toggleBatchSel = (name) => {
    setBatchSelected((cur) => {
      const n = new Set(cur);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      // Ignore when typing in an input
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      // Don't hijack while editor is open — editor has its own controls
      if (showEditor) return;
      const isMod = e.metaKey || e.ctrlKey;
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      else if (e.key === "Delete") { e.preventDefault(); deleteCurrentFile(); }
      else if (e.key === " ") { e.preventDefault(); removeCurrentFromView(); }
      else if (e.key === "s" || e.key === "S") { e.preventDefault(); storeCurrent(); }
      else if (isMod && (e.key === "z" || e.key === "Z")) { e.preventDefault(); undo(); }
      else if (e.key === "b" || e.key === "B") { e.preventDefault(); toggleBatch(); }
      else if (e.key === "e" || e.key === "E") { e.preventDefault(); if (currentImage) setShowEditor(true); }
      else if (e.key === "?" ) { e.preventDefault(); setShowHelp((v) => !v); }
      else if (e.key >= "0" && e.key <= "5") { e.preventDefault(); setCurrentStars(parseInt(e.key, 10)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, [images, selectedIdx, currentImage, appliedByImage, destRoot, destSelected, batchMode, batchSelected, history, showEditor, currentImagePath]);

  // Derived date & location strings from EXIF
  const exifDate = useMemo(() => {
    const d = exif?.DateTimeOriginal || exif?.CreateDate;
    if (!d) return null;
    try {
      const dt = d instanceof Date ? d : new Date(d);
      if (isNaN(dt.getTime())) return null;
      return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch { return null; }
  }, [exif]);
  const exifLoc = useMemo(() => {
    if (exif?.latitude != null && exif?.longitude != null) {
      return `${exif.latitude.toFixed(4)}, ${exif.longitude.toFixed(4)}`;
    }
    return null;
  }, [exif]);

  // Sync activeCatId if categories change
  useEffect(() => {
    if (!categories.find((c) => c.id === activeCatId)) {
      setActiveCatId(categories[0]?.id || null);
    }
  }, [categories, activeCatId]);

  const fsSupported = isFSAccessSupported();

  // Preview path for the current image (destination string preview)
  const previewPath = useMemo(() => {
    if (!currentImage) return null;
    const stars = currentImage ? (ratings[`${currentSourcePath}/${currentImage.name}`] || 0) : 0;
    const rendered = renderTemplate(settings.filenameTemplate, {
      icons: appliedIcons,
      originalName: currentImage.name,
      exifDate: exif?.DateTimeOriginal || exif?.CreateDate || null,
      stars,
    });
    if (appliedIcons.length === 0) return null;
    const root = destSelected?.path || destRootName || "…";
    return `${root} / ${rendered.pathPreview}`;
  }, [appliedIcons, currentImage, destSelected, destRootName, settings.filenameTemplate, ratings, currentSourcePath, exif]);

  // ------------------------------------------------------------------------
  // Render

  if (!fsSupported) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-app text-app p-8 text-center">
        <div className="max-w-lg pane rounded-lg p-8">
          <Camera size={40} className="text-primary-earth mx-auto mb-4" />
          <h1 className="font-heading text-2xl font-bold mb-2">Pro Photo Sorter</h1>
          <p className="text-dim text-sm mb-4">
            This app needs the File System Access API to read your drives directly.
            Please open in <strong className="text-primary-earth">Chrome, Edge, Brave, or Opera</strong> —
            or use the packaged desktop build.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-grid text-app" data-testid="app-root">
      <Toaster theme="dark" position="bottom-right" richColors closeButton />

      {/* LEFT — Source drive tree */}
      <div className="region-left">
        <div className="px-3 py-2.5 border-b border-app flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-dim font-heading">Source</div>
            <div className="text-sm font-medium truncate" data-testid="source-root-name">
              {sourceRootName || "Not connected"}
            </div>
          </div>
          <button
            onClick={pickSource}
            className="px-2 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-medium flex items-center gap-1 hover:opacity-90"
            data-testid="pick-source-btn"
          >
            <FolderOpen size={12} /> Open
          </button>
        </div>
        {sourceRoot ? (
          <FileTree
            rootHandle={sourceRoot}
            rootName={sourceRootName}
            onSelectFolder={onSelectSourceFolder}
            selectedPath={currentSourcePath}
            testIdPrefix="source"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-dim text-xs">
            Click <strong className="text-primary-earth">Open</strong> to browse a source folder.
          </div>
        )}
      </div>

      {/* CENTER — toolbar + viewer */}
      <div className="region-center">
        {/* Top toolbar */}
        <div className="border-b border-app bg-surface px-4 py-2 flex flex-col gap-2 shrink-0 z-10">
          {/* Row 1: dropdowns & meta */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 pane rounded px-2 py-1 text-xs" data-testid="exif-date">
              <Calendar size={12} className="text-primary-earth" />
              <span className="text-dim">Date:</span>
              <span className="font-mono">{exifDate || "—"}</span>
            </div>
            <div className="flex items-center gap-1.5 pane rounded px-2 py-1 text-xs" data-testid="exif-loc">
              <MapPin size={12} className="text-primary-earth" />
              <span className="text-dim">Location:</span>
              <span className="font-mono">{exifLoc || "—"}</span>
            </div>
            <div className="flex items-center gap-1.5 pane rounded px-2 py-1 text-xs" data-testid="exif-cam">
              <Aperture size={12} className="text-primary-earth" />
              <span className="text-dim">Cam:</span>
              <span className="font-mono">{exif?.Model || "—"}</span>
            </div>
            <div className="flex-1" />
            {/* Move/Copy mode indicator */}
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium ${
              settings.moveMode ? "bg-danger-earth/20 text-[color:var(--danger)] border border-[color:var(--danger)]/40" : "bg-app border border-app text-dim"
            }`} data-testid="mode-indicator">
              {settings.moveMode ? <MoveRight size={11} /> : <CopyIcon size={11} />}
              {settings.moveMode ? "MOVE" : "COPY"}
            </div>
            <button
              onClick={() => setShowEditor(true)}
              disabled={!currentImage}
              className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="open-editor"
              title="Edit image (E)"
            >
              <Scissors size={12} /> Edit
            </button>
            <button
              onClick={() => setShowCatMgr(true)}
              className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1"
              data-testid="open-category-manager"
            >
              <Layers size={12} /> Categories
            </button>
            <button
              onClick={toggleBatch}
              className={`px-2.5 py-1 rounded border text-xs flex items-center gap-1 ${
                batchMode ? "bg-success-earth text-[color:var(--text-inverse)] border-transparent" : "bg-app hover:bg-surface-hover border-app"
              }`}
              data-testid="toggle-batch"
              title="Batch mode (B)"
            >
              {batchMode ? <CheckSquare size={12} /> : <Square size={12} />} Batch
              {batchMode && batchSelected.size > 0 && (
                <span className="ml-1 font-mono">({batchSelected.size})</span>
              )}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1"
              data-testid="open-settings"
              title="Settings"
            >
              <Cog size={12} /> Settings
            </button>
            <button
              onClick={() => setShowHelp((v) => !v)}
              className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1"
              data-testid="show-help"
              title="Show shortcuts (?)"
            >
              <Keyboard size={12} /> Shortcuts
            </button>
          </div>

          {/* Row 2: icon palette + actions */}
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0 pane rounded px-2 py-1">
              <IconPalette
                categories={categories}
                activeCatId={activeCatId}
                onSetCat={setActiveCatId}
                onApply={applyIcon}
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={removeCurrentFromView}
                className="px-2.5 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1"
                data-testid="btn-skip"
                title="Skip (Space)"
              >
                <SkipForward size={13} /> Skip <span className="kbd ml-1">Space</span>
              </button>
              <button
                onClick={deleteCurrentFile}
                className="px-2.5 py-1.5 rounded bg-danger-earth/20 border border-[color:var(--danger)] text-[color:var(--danger)] hover:bg-danger-earth hover:text-[color:var(--text)] text-xs flex items-center gap-1"
                data-testid="btn-delete"
                title="Delete from disk (Del)"
              >
                <Trash2 size={13} /> Delete <span className="kbd ml-1">Del</span>
              </button>
              <button
                onClick={storeCurrent}
                className="px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] hover:opacity-90 text-xs font-semibold flex items-center gap-1"
                data-testid="btn-store"
                title="Store to destination (S)"
              >
                <Save size={13} /> Store <span className="kbd ml-1" style={{ color: "rgba(26,23,21,0.6)" }}>S</span>
              </button>
              <button
                onClick={undo}
                disabled={history.length === 0}
                className="px-2.5 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="btn-undo"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={13} /> Undo
              </button>
            </div>
          </div>

          {/* Row 3: destination preview path */}
          {previewPath && (
            <div className="flex items-center gap-2 text-[11px] text-dim font-mono border-t border-app pt-1.5" data-testid="dest-preview-path">
              <Copy size={11} />
              <span className="text-dim">Will store to:</span>
              <span className="text-primary-earth truncate">{previewPath}</span>
            </div>
          )}
        </div>

        {/* Image viewer */}
        <div
          ref={imageAreaRef}
          className="flex-1 relative flex items-center justify-center p-6 overflow-hidden bg-deep grain"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("application/x-pps-icon")) e.preventDefault();
          }}
          onDrop={onImageDrop}
          data-testid="image-viewer"
        >
          {currentImage && previewUrl ? (
            <>
              <img
                src={previewUrl}
                alt={currentImage.name}
                className="max-h-full max-w-full object-contain rounded shadow-2xl"
                draggable={false}
              />
              <IconOverlay
                containerRef={imageAreaRef}
                icons={appliedIcons}
                onReorder={reorderIcons}
                onRemove={removeAppliedIcon}
              />
              {/* Nav buttons */}
              <button
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur flex items-center justify-center border border-app"
                data-testid="nav-prev"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur flex items-center justify-center border border-app"
                data-testid="nav-next"
              >
                <ChevronRight size={18} />
              </button>
              {/* Filename */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur border border-app text-xs font-mono flex items-center gap-2">
                <span data-testid="current-image-name">{currentImage.name}</span>
                <span className="text-dim">·</span>
                <span className="text-dim">{selectedIdx + 1} / {images.length}</span>
              </div>
              {/* Star rating overlay (top-right) */}
              <div className="absolute top-3 right-3 icon-overlay rounded-lg px-2 py-1 flex items-center gap-2 z-30" data-testid="rating-overlay">
                <span className="text-[10px] uppercase tracking-widest text-dim font-heading">Rate</span>
                <StarRating value={currentStars} onChange={setCurrentStars} size={16} />
              </div>
            </>
          ) : (
            <div className="text-center text-dim">
              <Camera size={40} className="mx-auto mb-3 text-primary-earth/60" />
              <div className="font-heading text-lg">Pro Photo Sorter</div>
              <p className="text-sm mt-1 max-w-md">
                Open a source folder on the left, then click a folder to load photos.
                Choose a destination on the right, drag category icons onto a photo, and press <span className="kbd">S</span> to store.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Destination tree */}
      <div className="region-right">
        <div className="px-3 py-2.5 border-b border-app flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-dim font-heading">Destination</div>
            <div className="text-sm font-medium truncate" data-testid="dest-root-name">
              {destRootName || "Not connected"}
            </div>
          </div>
          <button
            onClick={pickDest}
            className="px-2 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-medium flex items-center gap-1 hover:opacity-90"
            data-testid="pick-dest-btn"
          >
            <FolderOpen size={12} /> Open
          </button>
        </div>
        {destRoot ? (
          <FileTree
            rootHandle={destRoot}
            rootName={destRootName}
            onSelectFolder={onSelectDestFolder}
            selectedPath={destSelected?.path || ""}
            testIdPrefix="dest"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center p-6 text-center text-dim text-xs">
            Choose a destination drive to sort your photos into.
          </div>
        )}
        <div className="px-3 py-2 border-t border-app text-[10px] text-dim">
          Built for photographers · <span className="text-primary-earth">Pro Photo Sorter</span>
        </div>
      </div>

      {/* BOTTOM — Filmstrip */}
      <div className="region-strip filmstrip flex items-center gap-3 px-6 overflow-x-auto" data-testid="filmstrip">
        {images.length === 0 ? (
          <div className="text-dim text-xs italic">
            {currentSourceFolder ? "No images in this folder." : "Select a folder on the left."}
          </div>
        ) : (
          (() => {
            const visible = images.map((img, i) => ({ img, i }))
              .filter(({ img }) => {
                const s = ratings[`${currentSourcePath}/${img.name}`] || 0;
                return s >= (settings.minStarFilter || 0);
              });
            if (visible.length === 0) {
              return (
                <div className="text-dim text-xs italic">
                  No images match the star filter (≥{settings.minStarFilter}). Adjust in Settings.
                </div>
              );
            }
            return visible.map(({ img, i }) => {
              const s = ratings[`${currentSourcePath}/${img.name}`] || 0;
              return (
                <div key={img.name} className="relative shrink-0">
                  <Thumbnail
                    file={img}
                    cacheKey={`${currentSourcePath}/${img.name}`}
                    active={i === selectedIdx}
                    batchSelected={batchMode && batchSelected.has(img.name)}
                    onClick={() => {
                      if (batchMode) toggleBatchSel(img.name);
                      else setSelectedIdx(i);
                    }}
                    onDoubleClick={() => {
                      setSelectedIdx(i);
                      setBatchMode(false);
                    }}
                  />
                  {s > 0 && (
                    <div className="absolute top-1 left-1 flex gap-0.5 px-1 py-0.5 rounded bg-black/70 backdrop-blur" data-testid={`thumb-stars-${img.name}`}>
                      {Array.from({ length: s }).map((_, k) => (
                        <StarIcon key={k} size={8} className="text-primary-earth" fill="currentColor" />
                      ))}
                    </div>
                  )}
                </div>
              );
            });
          })()
        )}
      </div>

      {/* Modals */}
      <CategoryManager
        open={showCatMgr}
        onClose={() => setShowCatMgr(false)}
        categories={categories}
        onChange={setCategories}
      />

      <SettingsModal
        open={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onChange={setSettings}
      />

      <ImageEditor
        open={showEditor}
        onClose={async (newFileName) => {
          setShowEditor(false);
          // If a new file was saved to the source folder, refresh listing
          if (newFileName && currentSourceFolder) {
            try {
              const imgs = await listImagesInDir(currentSourceFolder);
              setImages(imgs);
            } catch {}
          }
        }}
        imageFileHandle={currentImage?.handle || null}
        imageName={currentImage?.name || ""}
        sourceDirHandle={currentSourceFolder}
        destDirHandle={destSelected?.handle || destRoot}
      />

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" data-testid="help-modal">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowHelp(false)} />
          <div className="relative pane rounded-lg w-full max-w-md p-6">
            <div className="flex items-center gap-2 mb-4">
              <Keyboard size={18} className="text-primary-earth" />
              <h3 className="font-heading font-semibold text-lg">Keyboard Shortcuts</h3>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ["←  /  →", "Previous / Next photo"],
                ["Space", "Skip (remove from list)"],
                ["Delete", "Delete file from disk"],
                ["S", "Store to destination"],
                ["E", "Open image editor"],
                ["1 – 5", "Set star rating"],
                ["0", "Clear star rating"],
                ["Ctrl / ⌘ + Z", "Undo last action"],
                ["B", "Toggle batch mode"],
                ["?", "Show / hide this panel"],
              ].map(([k, d]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-dim">{d}</span>
                  <span className="kbd">{k}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-3 border-t border-app text-xs text-dim flex items-start gap-2">
              <Info size={12} className="mt-0.5 shrink-0 text-primary-earth" />
              <span>
                Drag icons from the palette onto the photo to build the destination path.
                First icon = folder, remaining icons = filename parts (customize in Settings).
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

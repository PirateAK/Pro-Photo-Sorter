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
  X as XIcon,
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
import ExifChip from "@/components/ExifChip";
import { Settings as Cog, Star as StarIcon, Scissors, Wand2, Columns, FileEdit, FileText, Sparkles, Play, ChevronDown as ChevDown } from "lucide-react";
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
import { autoAnalyzeFile } from "@/lib/autoTone";
import { computeAutoRating } from "@/lib/focusScore";
import BatchRenameModal from "@/components/BatchRenameModal";
import ContactSheetModal from "@/components/ContactSheetModal";
import ComparisonView from "@/components/ComparisonView";

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
    setLooks: (looks) =>
      persist((s) => ({ ...s, looks: typeof looks === "function" ? looks(s.looks || []) : looks })),
    setExifOverrides: (updater) =>
      persist((s) => ({
        ...s,
        exifOverrides: typeof updater === "function" ? updater(s.exifOverrides || {}) : updater,
      })),
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
  const { state, setCategories, setSettings, setRatings, setLooks, setExifOverrides } = usePersistedState();
  const { categories, settings, ratings, looks = [], exifOverrides = {} } = state;
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

  // Applied icons on current image — two rows: folders + tags
  // Stored as: appliedByImage[name] = { folders: [icons], tags: [icons] }
  // (Legacy migration from array format handled in getOverlay.)
  const [appliedByImage, setAppliedByImage] = useState({});
  const currentImage = images[selectedIdx] || null;
  const currentOverlay = currentImage
    ? (() => {
        const v = appliedByImage[currentImage.name];
        if (!v) return { folders: [], tags: [] };
        if (Array.isArray(v)) return { folders: v.length > 0 ? [v[0]] : [], tags: v.slice(1) };
        return { folders: v.folders || [], tags: v.tags || [] };
      })()
    : { folders: [], tags: [] };
  const hasAnyIcons = currentOverlay.folders.length + currentOverlay.tags.length > 0;

  // Batch selection
  const [batchMode, setBatchMode] = useState(false);
  const [batchSelected, setBatchSelected] = useState(new Set());
  const [showBatchMenu, setShowBatchMenu] = useState(false);

  // Destination "just stored" tracking — shows +N badges + auto-expands the tree
  const [justStored, setJustStored] = useState({}); // { pathString: count }
  const [destRefreshCounter, setDestRefreshCounter] = useState(0);

  // Category manager modal
  const [showCatMgr, setShowCatMgr] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [compareMode, setCompareMode] = useState(1); // 1 = single, 2/3 = split panes
  const [autoRating, setAutoRating] = useState(false); // in-progress flag

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
  const filmstripRef = useRef(null);
  const [filmstripCanScroll, setFilmstripCanScroll] = useState({ left: false, right: false });

  // Track whether the filmstrip has content off-screen (so we know when to show arrows)
  useEffect(() => {
    const el = filmstripRef.current;
    if (!el) return;
    const update = () => {
      setFilmstripCanScroll({
        left: el.scrollLeft > 2,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2,
      });
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [images.length, settings.minStarFilter, currentSourcePath]);

  const scrollFilmstrip = (dir) => {
    const el = filmstripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.max(200, el.clientWidth * 0.7), behavior: "smooth" });
  };

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    const el = filmstripRef.current;
    if (!el || !currentImage) return;
    const target = el.querySelector(`[data-testid="thumb-${CSS.escape(currentImage.name)}"]`);
    if (!target) return;
    const tRect = target.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    if (tRect.left < eRect.left + 20 || tRect.right > eRect.right - 20) {
      target.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [selectedIdx, currentImage]);

  const pickSource = async () => {
    try {
      const h = await pickDirectory();
      setSourceRoot(h);
      setSourceRootName(h.name);
      // Auto-select root so the filmstrip immediately populates
      onSelectSourceFolder({ name: h.name, handle: h }, h.name);
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
      // Auto-select root so store goes here without a second click
      setDestSelected({ handle: h, path: h.name });
      // Reset any stale "+N" badges from a previous destination
      setJustStored({});
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
    setCompareMode(1); // reset compare view on folder change
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

  // Destination tree housekeeping actions
  const createDestSubfolder = async (parentHandle, parentPath) => {
    const raw = window.prompt("New subfolder name:", "");
    if (!raw || !raw.trim()) return;
    const safe = raw.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, "_").slice(0, 80);
    if (!safe) { toast.error("Invalid folder name"); return; }
    try {
      await parentHandle.getDirectoryHandle(safe, { create: true });
      toast.success(`Created "${safe}"`);
      const newPath = `${parentPath}/${safe}`;
      setJustStored((cur) => ({ ...cur, [newPath]: cur[newPath] || 0 }));
      setDestRefreshCounter((c) => c + 1);
    } catch (e) {
      toast.error("Create failed", { description: e.message });
    }
  };

  const isDirEmpty = async (dirHandle) => {
    // eslint-disable-next-line no-unused-vars
    for await (const _entry of dirHandle.entries()) return false;
    return true;
  };

  const deleteDestFolder = async (parentHandle, folderHandle, name, parentPath) => {
    if (!parentHandle) { toast.error("Can't delete the root folder"); return; }
    try {
      const empty = await isDirEmpty(folderHandle);
      if (!empty) {
        toast.error("Folder is not empty", { description: "Only empty folders can be deleted here." });
        return;
      }
    } catch (e) {
      toast.error("Couldn't inspect folder", { description: e.message });
      return;
    }
    if (!window.confirm(`Delete empty folder "${name}"?`)) return;
    try {
      await parentHandle.removeEntry(name);
      toast.success(`Deleted "${name}"`);
      setJustStored((cur) => ({ ...cur, [parentPath]: cur[parentPath] || 0 }));
      setDestRefreshCounter((c) => c + 1);
    } catch (e) {
      toast.error("Delete failed", { description: e.message });
    }
  };

  const renameDestFolder = async (parentHandle, folderHandle, oldName, parentPath) => {
    if (!parentHandle) { toast.error("Can't rename the root folder"); return; }
    const raw = window.prompt(`Rename "${oldName}" to:`, oldName);
    if (!raw || raw === oldName) return;
    const safe = raw.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, "_").slice(0, 80);
    if (!safe) { toast.error("Invalid folder name"); return; }
    try {
      const empty = await isDirEmpty(folderHandle);
      if (!empty) {
        toast.error("Folder is not empty", { description: "Only empty folders can be renamed here — move contents first." });
        return;
      }
      // Atomic-ish rename: create the new folder FIRST, then remove the old one.
      // If create fails (invalid or duplicate), original is preserved.
      await parentHandle.getDirectoryHandle(safe, { create: true });
      await parentHandle.removeEntry(oldName);
      toast.success(`Renamed to "${safe}"`);
      setJustStored((cur) => ({ ...cur, [`${parentPath}/${safe}`]: cur[`${parentPath}/${safe}`] || 0 }));
      setDestRefreshCounter((c) => c + 1);
    } catch (e) {
      toast.error("Rename failed", { description: e.message });
    }
  };

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

  // Palette target (which row clicks default to). Persisted in memory only.
  const [paletteTarget, setPaletteTarget] = useState("tags"); // 'folders' | 'tags'

  // Helper: read the two-row overlay for an image (with legacy migration from arrays)
  const getOverlay = (state, name) => {
    const v = state[name];
    if (!v) return { folders: [], tags: [] };
    if (Array.isArray(v)) {
      // Legacy migration: first icon = folder, rest = tags
      return {
        folders: v.length > 0 ? [v[0]] : [],
        tags: v.slice(1),
      };
    }
    return { folders: v.folders || [], tags: v.tags || [] };
  };

  // Apply an icon to current (or batch) image(s) — always to a specific row
  const applyIcon = useCallback(
    (icon, row = "tags") => {
      setAppliedByImage((cur) => {
        const next = { ...cur };
        const targets = batchMode && batchSelected.size > 0
          ? [...batchSelected]
          : currentImage ? [currentImage.name] : [];
        for (const name of targets) {
          const prev = getOverlay(cur, name);
          const decorated = { ...icon, uid: uid("ovl") };
          next[name] = {
            folders: row === "folders" ? [...prev.folders, decorated] : prev.folders,
            tags: row === "tags" ? [...prev.tags, decorated] : prev.tags,
          };
        }
        return next;
      });
    },
    [batchMode, batchSelected, currentImage]
  );

  const reorderRow = (row, newList) => {
    if (!currentImage) return;
    setAppliedByImage((cur) => {
      const prev = getOverlay(cur, currentImage.name);
      return {
        ...cur,
        [currentImage.name]: { ...prev, [row]: newList },
      };
    });
  };
  const removeFromRow = (row, uid) => {
    if (!currentImage) return;
    setAppliedByImage((cur) => {
      const prev = getOverlay(cur, currentImage.name);
      return {
        ...cur,
        [currentImage.name]: { ...prev, [row]: prev[row].filter((i) => i.uid !== uid) },
      };
    });
  };

  // Drop directly onto the image (not on a row) → default to current palette target
  const onImageDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-pps-icon");
    if (!raw) return;
    try {
      const item = JSON.parse(raw);
      applyIcon(item, paletteTarget);
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
      const overlay = (() => {
        const v = appliedByImage[img.name];
        if (!v) return { folders: [], tags: [] };
        if (Array.isArray(v)) return { folders: v.length > 0 ? [v[0]] : [], tags: v.slice(1) };
        return { folders: v.folders || [], tags: v.tags || [] };
      })();
      if (overlay.folders.length + overlay.tags.length === 0) {
        toast.error(`No icons on ${img.name}`, { description: "Drag icons to Folders / Filename first." });
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
        folders: overlay.folders,
        tags: overlay.tags,
        originalName: img.name,
        exifDate: imgExifDate,
        stars,
      });
      const anchor = destSelected?.handle || destRoot;
      const anchorPath = destSelected?.path || destRootName;
      try {
        const targetDir = await getOrCreateSubdir(anchor, folderParts);
        const writtenName = await copyFileTo(img.handle, targetDir, fileName);
        stored++;
        // Record which destination folder just received a file (for badge + auto-expand)
        const targetPath = [anchorPath, ...folderParts].filter(Boolean).join("/");
        setJustStored((cur) => ({ ...cur, [targetPath]: (cur[targetPath] || 0) + 1 }));
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
      setDestRefreshCounter((c) => c + 1); // triggers tree to re-read affected branches
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
    setBatchMode((cur) => {
      if (cur) {
        // Turning OFF — clear the selection
        setBatchSelected(new Set());
        return false;
      } else {
        // Turning ON — pre-select every visible thumb (respect star filter)
        const visible = images.filter(
          (im) => (ratings[`${currentSourcePath}/${im.name}`] || 0) >= (settings.minStarFilter || 0)
        );
        setBatchSelected(new Set(visible.map((i) => i.name)));
        return true;
      }
    });
  };
  const selectAllBatch = () => {
    const visible = images.filter(
      (im) => (ratings[`${currentSourcePath}/${im.name}`] || 0) >= (settings.minStarFilter || 0)
    );
    setBatchSelected(new Set(visible.map((i) => i.name)));
  };
  const selectNoneBatch = () => setBatchSelected(new Set());
  const toggleBatchSel = (name) => {
    setBatchSelected((cur) => {
      const n = new Set(cur);
      if (n.has(name)) n.delete(name);
      else n.add(name);
      return n;
    });
  };

  // Auto-rate: analyze each image's focus + faces and set star rating
  const batchAutoRate = async () => {
    const targets = (batchMode && batchSelected.size > 0)
      ? images.filter((i) => batchSelected.has(i.name))
      : images;
    if (targets.length === 0) return;
    setAutoRating(true);
    const t = toast.loading(`Auto-rating 0 / ${targets.length}…`);
    let done = 0;
    const newRatings = {};
    for (const img of targets) {
      try {
        const file = await img.handle.getFile();
        const url = URL.createObjectURL(file);
        const el = await new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = url;
        });
        const r = await computeAutoRating(el);
        URL.revokeObjectURL(url);
        newRatings[`${currentSourcePath}/${img.name}`] = r.stars;
      } catch (e) { /* skip */ }
      done++;
      toast.loading(`Auto-rating ${done} / ${targets.length}…`, { id: t });
    }
    toast.dismiss(t);
    setRatings((cur) => ({ ...cur, ...newRatings }));
    const withFaceHint = window.FaceDetector ? "" : " (focus-only; browser lacks face API)";
    toast.success(`Auto-rated ${done} photo${done !== 1 ? "s" : ""}${withFaceHint}`);
    setAutoRating(false);
    if (batchMode) setBatchSelected(new Set());
  };

  // Batch auto-enhance: iterate over batch-selected images, analyze histogram,
  // apply auto-tone, and save as new JPG next to each source.
  const batchAutoEnhance = async () => {
    if (!batchMode || batchSelected.size === 0) return;
    if (!currentSourceFolder) {
      toast.error("No source folder open");
      return;
    }
    const targets = images.filter((i) => batchSelected.has(i.name));
    let done = 0;
    let failed = 0;
    const t = toast.loading(`Auto-enhancing 0 / ${targets.length}…`);
    for (const img of targets) {
      try {
        const file = await img.handle.getFile();
        const { result, img: loadedImg } = await autoAnalyzeFile(file);

        // Render to a canvas with the suggested filter
        const out = document.createElement("canvas");
        out.width = loadedImg.width;
        out.height = loadedImg.height;
        const ctx = out.getContext("2d");
        ctx.imageSmoothingQuality = "high";
        const parts = [];
        if (result.brightness !== 0) parts.push(`brightness(${1 + result.brightness / 100})`);
        if (result.contrast !== 0) parts.push(`contrast(${1 + result.contrast / 100})`);
        if (result.saturation !== 0) parts.push(`saturate(${1 + result.saturation / 100})`);
        ctx.filter = parts.length ? parts.join(" ") : "none";
        ctx.drawImage(loadedImg, 0, 0);
        ctx.filter = "none";

        const blob = await new Promise((res) => out.toBlob(res, "image/jpeg", 0.92));
        if (!blob) throw new Error("encode failed");

        const dot = img.name.lastIndexOf(".");
        const stem = dot > 0 ? img.name.slice(0, dot) : img.name;
        const outName = `${stem}_auto.jpg`;
        const newHandle = await currentSourceFolder.getFileHandle(outName, { create: true });
        const w = await newHandle.createWritable();
        await w.write(blob);
        await w.close();
        done++;
      } catch (e) {
        failed++;
      }
      toast.loading(`Auto-enhancing ${done + failed} / ${targets.length}…`, { id: t });
    }
    toast.dismiss(t);
    if (done > 0) toast.success(`Auto-enhanced ${done} photo${done > 1 ? "s" : ""}`, { description: failed ? `${failed} failed` : "Saved with _auto suffix" });
    if (done === 0 && failed > 0) toast.error(`All ${failed} failed`);

    // Refresh filmstrip
    try {
      const imgs = await listImagesInDir(currentSourceFolder);
      setImages(imgs);
    } catch {}
    setBatchSelected(new Set());
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
      else if (e.key === "Escape") {
        // Close top-most modal if any
        if (showHelp) { e.preventDefault(); setShowHelp(false); }
        else if (showSettings) { e.preventDefault(); setShowSettings(false); }
        else if (showCatMgr) { e.preventDefault(); setShowCatMgr(false); }
        else if (showRename) { e.preventDefault(); setShowRename(false); }
        else if (showContact) { e.preventDefault(); setShowContact(false); }
      }
      else if (e.key >= "0" && e.key <= "5") { e.preventDefault(); setCurrentStars(parseInt(e.key, 10)); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line
  }, [images, selectedIdx, currentImage, appliedByImage, destRoot, destSelected, batchMode, batchSelected, history, showEditor, currentImagePath, showHelp, showSettings, showCatMgr, showRename, showContact]);

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
      folders: currentOverlay.folders,
      tags: currentOverlay.tags,
      originalName: currentImage.name,
      exifDate: exif?.DateTimeOriginal || exif?.CreateDate || null,
      stars,
    });
    if (!hasAnyIcons) return null;
    const root = destSelected?.path || destRootName || "…";
    return `${root} / ${rendered.pathPreview}`;
  }, [currentOverlay, hasAnyIcons, currentImage, destSelected, destRootName, settings.filenameTemplate, ratings, currentSourcePath, exif]);

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
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] uppercase tracking-widest text-dim font-heading shrink-0" title="Metadata read from the photo — click a field to override">
              EXIF
            </span>
            <ExifChip
              icon={Calendar}
              label="Date"
              testid="exif-date"
              value={(() => {
                const o = currentImagePath ? exifOverrides[currentImagePath]?.date : null;
                return o || exifDate || "";
              })()}
              overridden={!!(currentImagePath && exifOverrides[currentImagePath]?.date)}
              editable={!!currentImage}
              onSave={(val) => {
                if (!currentImagePath) return;
                setExifOverrides((cur) => {
                  const next = { ...cur };
                  const entry = { ...(next[currentImagePath] || {}) };
                  if (val) entry.date = val; else delete entry.date;
                  if (Object.keys(entry).length === 0) delete next[currentImagePath];
                  else next[currentImagePath] = entry;
                  return next;
                });
              }}
              placeholder="e.g. 2024-08-14"
            />
            <ExifChip
              icon={MapPin}
              label="Location"
              testid="exif-loc"
              value={(() => {
                const o = currentImagePath ? exifOverrides[currentImagePath]?.location : null;
                return o || exifLoc || "";
              })()}
              overridden={!!(currentImagePath && exifOverrides[currentImagePath]?.location)}
              editable={!!currentImage}
              onSave={(val) => {
                if (!currentImagePath) return;
                setExifOverrides((cur) => {
                  const next = { ...cur };
                  const entry = { ...(next[currentImagePath] || {}) };
                  if (val) entry.location = val; else delete entry.location;
                  if (Object.keys(entry).length === 0) delete next[currentImagePath];
                  else next[currentImagePath] = entry;
                  return next;
                });
              }}
              placeholder="e.g. Kenai, Alaska"
            />
            <ExifChip
              icon={Aperture}
              label="Cam"
              testid="exif-cam"
              value={(() => {
                const o = currentImagePath ? exifOverrides[currentImagePath]?.camera : null;
                return o || exif?.Model || "";
              })()}
              overridden={!!(currentImagePath && exifOverrides[currentImagePath]?.camera)}
              editable={!!currentImage}
              onSave={(val) => {
                if (!currentImagePath) return;
                setExifOverrides((cur) => {
                  const next = { ...cur };
                  const entry = { ...(next[currentImagePath] || {}) };
                  if (val) entry.camera = val; else delete entry.camera;
                  if (Object.keys(entry).length === 0) delete next[currentImagePath];
                  else next[currentImagePath] = entry;
                  return next;
                });
              }}
              placeholder="e.g. Canon EOS R5"
            />
            <div className="flex-1" />
            <button
              onClick={() => setShowEditor(true)}
              disabled={!currentImage}
              className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="open-editor"
              title="Edit image (E)"
            >
              <Scissors size={12} /> Edit
            </button>
            {/* Comparison mode segmented control */}
            <div className="flex rounded overflow-hidden border border-app" data-testid="compare-mode">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  onClick={() => setCompareMode(n)}
                  disabled={images.length === 0}
                  className={`px-2 py-1 text-xs font-mono border-l first:border-l-0 border-app disabled:opacity-40 ${
                    compareMode === n ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover"
                  }`}
                  data-testid={`compare-${n}`}
                  title={n === 1 ? "Single view" : `${n}-pane comparison`}
                >
                  {n === 1 ? <Columns size={11} /> : `×${n}`}
                </button>
              ))}
            </div>
            <button
              onClick={batchAutoRate}
              disabled={images.length === 0 || autoRating}
              className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="auto-rate-btn"
              title="Auto-rate photos by focus and faces"
            >
              <Sparkles size={12} /> {autoRating ? "Rating…" : "Auto-Rate"}
            </button>
            <button
              onClick={() => setShowRename(true)}
              disabled={images.length === 0 || !currentSourceFolder}
              className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="open-rename"
              title="Batch rename filmstrip"
            >
              <FileEdit size={12} /> Rename
            </button>
            <button
              onClick={() => setShowContact(true)}
              disabled={images.length === 0}
              className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              data-testid="open-contact"
              title="Export contact sheet PDF"
            >
              <FileText size={12} /> Sheet
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
              {batchMode && (
                <span className="ml-1 font-mono">({batchSelected.size}/{images.length})</span>
              )}
            </button>
            {batchMode && (
              <div className="flex rounded overflow-hidden border border-app" data-testid="batch-select-controls">
                <button
                  onClick={selectAllBatch}
                  className="px-1.5 py-1 text-[10px] bg-app hover:bg-surface-hover"
                  data-testid="batch-select-all"
                  title="Select every photo in the filmstrip"
                >
                  All
                </button>
                <button
                  onClick={selectNoneBatch}
                  className="px-1.5 py-1 text-[10px] bg-app hover:bg-surface-hover border-l border-app"
                  data-testid="batch-select-none"
                  title="Deselect all"
                >
                  None
                </button>
              </div>
            )}
            {batchMode && batchSelected.size > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowBatchMenu((v) => !v)}
                  className="px-3 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] hover:opacity-90 text-xs font-semibold flex items-center gap-1"
                  data-testid="run-batch-btn"
                  title="Run an action on the selected photos"
                >
                  <Play size={11} fill="currentColor" /> Run Batch ({batchSelected.size}) <ChevDown size={11} />
                </button>
                {showBatchMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowBatchMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 w-64 pane rounded-lg shadow-2xl z-40 py-1" data-testid="batch-menu">
                      <button
                        onClick={() => { setShowBatchMenu(false); storeCurrent(); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-surface-hover flex items-center gap-2"
                        data-testid="batch-menu-store"
                      >
                        <Save size={12} className="text-primary-earth" />
                        <span className="flex-1">
                          <div className="font-semibold text-app">Store to destination</div>
                          <div className="text-[10px] text-dim">Uses each photo's icons for the path</div>
                        </span>
                      </button>
                      <button
                        onClick={() => { setShowBatchMenu(false); batchAutoEnhance(); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-surface-hover flex items-center gap-2"
                        data-testid="batch-menu-auto-enhance"
                      >
                        <Wand2 size={12} className="text-primary-earth" />
                        <span className="flex-1">
                          <div className="font-semibold text-app">Auto-Enhance</div>
                          <div className="text-[10px] text-dim">Saves _auto.jpg next to each</div>
                        </span>
                      </button>
                      <button
                        onClick={() => { setShowBatchMenu(false); batchAutoRate(); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-surface-hover flex items-center gap-2"
                        data-testid="batch-menu-auto-rate"
                      >
                        <Sparkles size={12} className="text-primary-earth" />
                        <span className="flex-1">
                          <div className="font-semibold text-app">Auto-Rate</div>
                          <div className="text-[10px] text-dim">Focus + faces → star ratings</div>
                        </span>
                      </button>
                      <button
                        onClick={() => { setShowBatchMenu(false); setShowContact(true); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-surface-hover flex items-center gap-2"
                        data-testid="batch-menu-contact"
                      >
                        <FileText size={12} className="text-primary-earth" />
                        <span className="flex-1">
                          <div className="font-semibold text-app">Contact Sheet PDF</div>
                          <div className="text-[10px] text-dim">Print-ready gallery of selected</div>
                        </span>
                      </button>
                      <div className="border-t border-app my-1" />
                      <button
                        onClick={() => { setShowBatchMenu(false); setBatchSelected(new Set()); setBatchMode(false); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-surface-hover flex items-center gap-2 text-dim"
                        data-testid="batch-menu-cancel"
                      >
                        <XIcon size={12} />
                        <span>Exit batch mode</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
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
                target={paletteTarget}
                onSetTarget={setPaletteTarget}
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
            compareMode > 1 ? (
              <>
                <ComparisonView
                  images={images}
                  selectedIdx={selectedIdx}
                  panes={compareMode}
                  onSelect={setSelectedIdx}
                  ratings={ratings}
                  sourcePath={currentSourcePath}
                />
                {/* Star rating overlay stays available for the active pane */}
                <div className="absolute top-3 right-3 icon-overlay rounded-lg px-2 py-1 flex items-center gap-2 z-30" data-testid="rating-overlay">
                  <span className="text-[10px] uppercase tracking-widest text-dim font-heading">Rate</span>
                  <StarRating value={currentStars} onChange={setCurrentStars} size={16} />
                </div>
                {/* Hint that tagging is disabled in compare */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 backdrop-blur border border-app text-[11px] text-dim">
                  Comparison mode · press <span className="kbd">×1</span> to tag & drag icons
                </div>
              </>
            ) : (
            <>
              <img
                src={previewUrl}
                alt={currentImage.name}
                className="max-h-full max-w-full object-contain rounded shadow-2xl"
                draggable={false}
              />
              <IconOverlay
                containerRef={imageAreaRef}
                folders={currentOverlay.folders}
                tags={currentOverlay.tags}
                onReorderFolders={(nl) => reorderRow("folders", nl)}
                onReorderTags={(nl) => reorderRow("tags", nl)}
                onRemoveFolder={(u) => removeFromRow("folders", u)}
                onRemoveTag={(u) => removeFromRow("tags", u)}
                onDropFolder={(icon) => applyIcon(icon, "folders")}
                onDropTag={(icon) => applyIcon(icon, "tags")}
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
            )
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
            justStored={justStored}
            refreshCounter={destRefreshCounter}
            editable
            onCreateSubfolder={createDestSubfolder}
            onRenameFolder={renameDestFolder}
            onDeleteFolder={deleteDestFolder}
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
      <div className="region-strip relative">
        {/* Left scroll button */}
        {filmstripCanScroll.left && (
          <button
            onClick={() => scrollFilmstrip(-1)}
            className="absolute left-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/70 hover:bg-primary-earth hover:text-[color:var(--text-inverse)] backdrop-blur border border-app flex items-center justify-center shadow-lg transition-colors"
            data-testid="filmstrip-scroll-left"
            title="Scroll left"
            aria-label="Scroll filmstrip left"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {/* Right scroll button */}
        {filmstripCanScroll.right && (
          <button
            onClick={() => scrollFilmstrip(1)}
            className="absolute right-1 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/70 hover:bg-primary-earth hover:text-[color:var(--text-inverse)] backdrop-blur border border-app flex items-center justify-center shadow-lg transition-colors"
            data-testid="filmstrip-scroll-right"
            title="Scroll right"
            aria-label="Scroll filmstrip right"
          >
            <ChevronRight size={18} />
          </button>
        )}
        <div
          ref={filmstripRef}
          className="filmstrip flex items-center gap-3 px-6 overflow-x-auto h-full scroll-smooth"
          data-testid="filmstrip"
        >
        {(settings.minStarFilter || 0) > 0 && images.length > 0 && (
          <div
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded bg-primary-earth/20 border border-primary-earth text-primary-earth text-[11px] font-medium"
            data-testid="star-filter-chip"
          >
            <StarIcon size={11} fill="currentColor" />
            <span>≥ {settings.minStarFilter} star{settings.minStarFilter > 1 ? "s" : ""}</span>
            <button
              onClick={() => setSettings({ ...settings, minStarFilter: 0 })}
              className="ml-1 w-4 h-4 rounded flex items-center justify-center hover:bg-primary-earth hover:text-[color:var(--text-inverse)]"
              data-testid="clear-star-filter"
              title="Clear filter"
            >
              <XIcon size={11} />
            </button>
          </div>
        )}
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
                    batchMode={batchMode}
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
        looks={looks}
        onLooksChange={setLooks}
      />

      <BatchRenameModal
        open={showRename}
        onClose={() => setShowRename(false)}
        images={images}
        sourceFolder={currentSourceFolder}
        ratings={ratings}
        sourcePath={currentSourcePath}
        onRatingsRemap={(remap) => {
          setRatings((cur) => {
            const next = { ...cur };
            for (const [oldKey, newKey] of Object.entries(remap)) {
              if (next[oldKey] != null) {
                next[newKey] = next[oldKey];
                delete next[oldKey];
              }
            }
            return next;
          });
        }}
        onDone={async () => {
          if (currentSourceFolder) {
            try {
              const imgs = await listImagesInDir(currentSourceFolder);
              setImages(imgs);
              setSelectedIdx(0);
            } catch {}
          }
        }}
      />

      <ContactSheetModal
        open={showContact}
        onClose={() => setShowContact(false)}
        images={
          (batchMode && batchSelected.size > 0)
            ? images.filter((i) => batchSelected.has(i.name))
            : images
        }
        ratings={ratings}
        sourcePath={currentSourcePath}
        sourceDirHandle={currentSourceFolder}
        destDirHandle={destSelected?.handle || destRoot}
      />

      {showHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" data-testid="help-modal">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowHelp(false)} />
          <div className="relative pane rounded-lg w-full max-w-md p-6">
            <button
              onClick={() => setShowHelp(false)}
              className="absolute top-2 right-2 w-7 h-7 rounded flex items-center justify-center hover:bg-surface-hover text-dim hover:text-app"
              data-testid="help-close"
              aria-label="Close"
            >
              <XIcon size={14} />
            </button>
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
                ["\\  or  `", "Hold to peek original (in editor)"],
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

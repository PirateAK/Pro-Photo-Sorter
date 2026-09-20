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
import { Settings as Cog, Star as StarIcon, Scissors, Wand2, Columns, FileEdit, FileText, Sparkles, Play, ChevronDown as ChevDown, MoveRight, Sun, Moon, Search, Zap, HardDrive, Copyright, HelpCircle } from "lucide-react";
import {
  isFSAccessSupported,
  pickDirectory,
  listImagesInDir,
  getOrCreateSubdir,
  copyFileTo,
  writeBlobTo,
  removeEntry,
} from "@/lib/fsapi";
import { loadState, saveState, uid } from "@/lib/storage";
import { renderTemplate } from "@/lib/template";
import { autoAnalyzeFile } from "@/lib/autoTone";
import { computeAutoRating } from "@/lib/focusScore";
import { writeWithWatermark, canWatermark } from "@/lib/watermark";
import { cropAndResize, PRINT_SIZES } from "@/lib/resize";
import ResizeCropModal from "@/components/ResizeCropModal";
import buildInfo from "./buildInfo.json";
import BatchRenameModal from "@/components/BatchRenameModal";
import ContactSheetModal from "@/components/ContactSheetModal";
import ComparisonView from "@/components/ComparisonView";
import SessionStats from "@/components/SessionStats";
import RecentFoldersDropdown from "@/components/RecentFoldersDropdown";
import SearchModal from "@/components/SearchModal";
import CullMode from "@/components/CullMode";
import DrivesPanel from "@/components/DrivesPanel";
import HelpModal from "@/components/HelpModal";
import { addRecent, reacquire, getRecent } from "@/lib/recentFolders";
import { isElectron, totalFreeBytes, formatBytes } from "@/lib/electronBridge";

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
  // Per-bar category memory (Iter 12) — init from settings, fallback to first category
  const [foldersCatId, setFoldersCatIdRaw] = useState(() =>
    (settings.foldersCatId && categories.find((c) => c.id === settings.foldersCatId))
      ? settings.foldersCatId
      : (categories[0]?.id || null)
  );
  const [tagsCatId, setTagsCatIdRaw] = useState(() =>
    (settings.tagsCatId && categories.find((c) => c.id === settings.tagsCatId))
      ? settings.tagsCatId
      : (categories[0]?.id || null)
  );
  // Wrappers persist the choice to settings so it survives reloads
  const setFoldersCatId = useCallback((id) => {
    setFoldersCatIdRaw(id);
    setSettings({ ...settings, foldersCatId: id });
  }, [settings, setSettings]);
  const setTagsCatId = useCallback((id) => {
    setTagsCatIdRaw(id);
    setSettings({ ...settings, tagsCatId: id });
  }, [settings, setSettings]);

  // Source
  const [sourceRoot, setSourceRoot] = useState(null);
  const [sourceRootName, setSourceRootName] = useState("");
  const [currentSourceFolder, setCurrentSourceFolder] = useState(null); // handle
  const [currentSourcePath, setCurrentSourcePath] = useState("");
  const [images, setImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
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

  // ── Per-image watermark override ──────────────────────────────────────
  // Keyed by full image path ("sourcePath/imageName"). Undefined = use the
  // global settings.watermarkEnabled. true = force on, false = force off.
  const [watermarkOverrides, setWatermarkOverrides] = useState({});

  const globalWatermarkOn = () =>
    settings.watermarkEnabled === true && (settings.watermarkText || "").trim().length > 0;

  const isWatermarkOnFor = (imgPath) => {
    const ov = watermarkOverrides[imgPath];
    if (ov !== undefined) return ov;
    return globalWatermarkOn();
  };

  const toggleWatermarkFor = (imgPath, forced = null) => {
    if (!imgPath) return;
    const globalOn = globalWatermarkOn();
    const currentEffective = isWatermarkOnFor(imgPath);
    const nextEffective = forced !== null ? forced : !currentEffective;
    setWatermarkOverrides((cur) => {
      const next = { ...cur };
      if (nextEffective === globalOn) delete next[imgPath];
      else next[imgPath] = nextEffective;
      return next;
    });
  };
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

  // Session stats — counters reset on manual reset (Iter 8, Feb 2026)
  const [sessionStats, setSessionStats] = useState({
    stored: 0, moved: 0, deleted: 0, skipped: 0, rated: 0, enhanced: 0,
  });
  const bumpStat = useCallback((key, by = 1) => {
    setSessionStats((s) => ({ ...s, [key]: (s[key] || 0) + by }));
  }, []);

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
  const [showSearch, setShowSearch] = useState(false);
  const [showCull, setShowCull] = useState(false);
  const [showDrives, setShowDrives] = useState(false);
  // Total free space across all drives (bytes). null = not-yet-read / unavailable.
  const [totalFree, setTotalFree] = useState(null);
  const [searchMode, setSearchMode] = useState(false); // true when filmstrip holds search results
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

  // Apply theme to <html> root (Iter 8, Feb 2026)
  useEffect(() => {
    const t = settings.theme || "dark";
    document.documentElement.setAttribute("data-theme", t);
  }, [settings.theme]);

  const toggleTheme = () => {
    const next = (settings.theme || "dark") === "dark" ? "light" : "dark";
    setSettings({ ...settings, theme: next });
  };

  // Load results from Search modal into the filmstrip.
  // Puts app into a virtual "search mode" — filmstrip holds results (each with .handle
  // and a .path back to the original destination folder). Store/re-tag work; delete
  // is disabled in search mode (parent handle unknown).
  const loadSearchResults = (matches, rootName) => {
    if (!matches || matches.length === 0) return;
    // Map to image-like entries the filmstrip already understands
    const asImages = matches.map((m) => ({ name: m.name, handle: m.handle, __searchPath: m.path }));
    setImages(asImages);
    setSelectedIdx(0);
    setAppliedByImage({});
    setSearchMode(true);
    setCurrentSourceFolder(null); // disables Delete
    setSourceRootName(`🔍 ${matches.length} results in ${rootName}`);
    setCurrentSourcePath("search");
    // Auto-enter batch mode with all selected
    setBatchMode(true);
    setBatchSelected(new Set(asImages.map((i) => i.name)));
    toast.info(`${matches.length} photo${matches.length !== 1 ? "s" : ""} loaded`, {
      description: "Batch mode ON — all selected. Deselect any you don't want, then Store/Move/Re-tag as usual.",
    });
  };

  const exitSearchMode = () => {
    setSearchMode(false);
    setImages([]);
    setBatchMode(false);
    setBatchSelected(new Set());
    setSourceRootName(sourceRoot?.name || "Not connected");
    setCurrentSourcePath("");
  };

  // On startup, offer to reopen the last-used source + destination folders (Iter 9).
  // Browsers require a user click to grant file-system permission, so we show a
  // dismissable toast with a "Reopen" button rather than auto-loading silently.
  const startupPromptShown = useRef(false);
  useEffect(() => {
    if (startupPromptShown.current) return;
    startupPromptShown.current = true;
    // Respect user preference: skip toast entirely if disabled (Iter 11)
    if (settings.autoReopenLast === false) return;
    // Small delay so sonner's Toaster is fully hydrated and the toast doesn't
    // get dropped on very fast page loads.
    const timer = setTimeout(async () => {
      try {
        const [recentSrc, recentDst] = await Promise.all([
          getRecent("source"),
          getRecent("dest"),
        ]);
        const src = recentSrc[0];
        const dst = recentDst[0];
        // eslint-disable-next-line no-console
        console.log("[PPS] Startup recents check:", { src: src?.name || null, dst: dst?.name || null });
        if (!src && !dst) return;
        const desc = [src ? `Source: ${src.name}` : null, dst ? `Destination: ${dst.name}` : null]
          .filter(Boolean).join(" · ");
        toast("Reopen last session?", {
          description: desc,
          duration: 30000,
          action: {
            label: "Reopen",
            onClick: async () => {
              if (src) await pickRecentSource(src.handle, src.name);
              if (dst) await pickRecentDest(dst.handle, dst.name);
            },
          },
        });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log("[PPS] Startup recents error:", e);
      }
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Poll total-free-space every 60s while the app is open (Electron only).
  // Also refreshes when the user opens the Drives panel or picks a new folder.
  useEffect(() => {
    if (!isElectron()) return;
    let cancelled = false;
    const tick = async () => {
      try {
        const bytes = await totalFreeBytes();
        if (!cancelled) setTotalFree(bytes);
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const refreshFreeSpace = useCallback(async () => {
    if (!isElectron()) return;
    try {
      const bytes = await totalFreeBytes();
      setTotalFree(bytes);
    } catch { /* ignore */ }
  }, []);

  const pickSource = async () => {
    try {
      // Prefer the most recent source as the picker's starting point;
      // otherwise Chrome remembers per-id on its own.
      let startIn = undefined;
      try {
        const recents = await getRecent("source");
        if (recents[0]?.handle) startIn = recents[0].handle;
      } catch { /* ignore */ }
      const h = await pickDirectory({ id: "pps-source", startIn });
      setSourceRoot(h);
      setSourceRootName(h.name);
      onSelectSourceFolder({ name: h.name, handle: h }, h.name);
      toast.success(`Loaded source: ${h.name}`);
      try { await addRecent("source", h, h.name); } catch { /* ignore */ }
    } catch (e) {
      if (e?.name === "AbortError") return; // user cancelled
      // Show longer-duration toast for the "stuck picker" / "system dir" errors
      // so the user has time to read the recovery instructions.
      const isSystemErr = e?.name === "SystemDirectoryBlockedError" || e?.name === "PickerStuckError" || e?.name === "PickerBusyError";
      toast.error(e.message || "Failed to open folder", isSystemErr ? { duration: 12000 } : undefined);
    }
  };
  const pickDest = async () => {
    try {
      let startIn = undefined;
      try {
        const recents = await getRecent("dest");
        if (recents[0]?.handle) startIn = recents[0].handle;
      } catch { /* ignore */ }
      const h = await pickDirectory({ id: "pps-dest", startIn });
      setDestRoot(h);
      setDestRootName(h.name);
      setDestSelected({ handle: h, path: h.name });
      setJustStored({});
      toast.success(`Loaded destination: ${h.name}`);
      try { await addRecent("dest", h, h.name); } catch { /* ignore */ }
    } catch (e) {
      if (e?.name === "AbortError") return;
      const isSystemErr = e?.name === "SystemDirectoryBlockedError" || e?.name === "PickerStuckError" || e?.name === "PickerBusyError";
      toast.error(e.message || "Failed to open folder", isSystemErr ? { duration: 12000 } : undefined);
    }
  };

  // Pick a recent folder (from RecentFoldersDropdown) — reacquires permission first
  const pickRecentSource = async (handle, name) => {
    const h = await reacquire(handle, "readwrite");
    if (!h) { toast.error("Permission denied for that folder"); return; }
    setSourceRoot(h);
    setSourceRootName(name);
    onSelectSourceFolder({ name, handle: h }, name);
    toast.success(`Reopened source: ${name}`);
    try { await addRecent("source", h, name); } catch { /* ignore */ }
  };
  const pickRecentDest = async (handle, name) => {
    const h = await reacquire(handle, "readwrite");
    if (!h) { toast.error("Permission denied for that folder"); return; }
    setDestRoot(h);
    setDestRootName(name);
    setDestSelected({ handle: h, path: name });
    setJustStored({});
    toast.success(`Reopened destination: ${name}`);
    try { await addRecent("dest", h, name); } catch { /* ignore */ }
  };

  // When user clicks a folder in the source tree
  const onSelectSourceFolder = useCallback(async (node, path) => {
    setCurrentSourceFolder(node.handle);
    setCurrentSourcePath(path);
    setSelectedIdx(0);
    setBatchSelected(new Set());
    setCompareMode(1); // reset compare view on folder change
    setImages([]); // clear previous while we scan
    setLoadingImages(true);
    try {
      const imgs = await listImagesInDir(node.handle);
      setImages(imgs);
      if (imgs.length === 0) toast("No images in this folder");
    } catch (e) {
      setImages([]);
      toast.error("Could not read folder");
    } finally {
      setLoadingImages(false);
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

  // Drop directly onto the image (not on a row).
  // The drag payload now carries { item, role } — honor the source bar's role.
  // Fallback to "tags" (Filename) for legacy drops without a role.
  const onImageDrop = (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-pps-icon");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const item = parsed?.item || parsed;
      const role = parsed?.role === "folders" ? "folders" : "tags";
      applyIcon(item, role);
    } catch {}
  };

  // Actions ---------------------------------------------------------------

  // Helper: move a file to `.pps-trash` in the source folder (safer than hard delete).
  // Returns true on success. The trash lives on the source drive; user can dig files
  // back out via File Explorer or the Undo toast the caller shows.
  const TRASH_DIR = ".pps-trash";
  const moveToTrash = async (fileHandle, sourceFolder, name) => {
    try {
      const trash = await sourceFolder.getDirectoryHandle(TRASH_DIR, { create: true });
      const written = await copyFileTo(fileHandle, trash, name);
      await removeEntry(sourceFolder, name);
      return { ok: true, trashHandle: trash, trashedName: written };
    } catch (e) {
      return { ok: false, error: e };
    }
  };

  // Trash counter (Iter 11): count files inside .pps-trash of the current source
  // so the toolbar can show "Trash (N)" and offer one-click empty.
  const [trashCount, setTrashCount] = useState(0);
  const refreshTrashCount = useCallback(async () => {
    if (!currentSourceFolder) { setTrashCount(0); return; }
    try {
      const trash = await currentSourceFolder.getDirectoryHandle(TRASH_DIR, { create: false });
      let n = 0;
      // eslint-disable-next-line no-unused-vars
      for await (const [_name, _h] of trash.entries()) n++;
      setTrashCount(n);
    } catch {
      setTrashCount(0);
    }
  }, [currentSourceFolder]);
  useEffect(() => { refreshTrashCount(); }, [refreshTrashCount, images.length]);

  const emptyTrash = async () => {
    if (!currentSourceFolder || trashCount === 0) return;
    const ok = window.confirm(
      `Permanently delete ${trashCount} file${trashCount > 1 ? "s" : ""} from .pps-trash?\n\n` +
      `This cannot be undone.`
    );
    if (!ok) return;
    try {
      const trash = await currentSourceFolder.getDirectoryHandle(TRASH_DIR, { create: false });
      const names = [];
      for await (const [name, h] of trash.entries()) {
        if (h.kind === "file") names.push(name);
      }
      for (const nm of names) {
        try { await removeEntry(trash, nm); } catch { /* ignore */ }
      }
      // Also remove the .pps-trash folder itself if it's now empty
      try { await removeEntry(currentSourceFolder, TRASH_DIR); } catch { /* ignore */ }
      setTrashCount(0);
      toast.success(`Emptied trash (${names.length} files)`);
    } catch (e) {
      toast.error("Empty trash failed", { description: e.message });
    }
  };

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
    bumpStat("skipped");
    toast("Removed from list", { description: nm });
  };

  const deleteCurrentFile = async () => {
    if (!currentImage || !currentSourceFolder) return;
    const nm = currentImage.name;
    const ok = window.confirm(
      `Move "${nm}" to the .pps-trash folder inside your source drive?\n\n` +
      `You can restore it from that folder any time before you empty it in File Explorer.`
    );
    if (!ok) return;
    const res = await moveToTrash(currentImage.handle, currentSourceFolder, nm);
    if (!res.ok) {
      toast.error("Trash failed", { description: res.error?.message });
      return;
    }
    setHistory((h) => [{
      type: "trash",
      name: nm,
      trashHandle: res.trashHandle,
      trashedName: res.trashedName,
      parentHandle: currentSourceFolder,
    }, ...h].slice(0, 30));
    setImages((imgs) => imgs.filter((_, i) => i !== selectedIdx));
    setAppliedByImage((cur) => {
      const n = { ...cur };
      delete n[nm];
      return n;
    });
    setSelectedIdx((i) => Math.max(0, Math.min(i, images.length - 2)));
    bumpStat("deleted");
    toast("Moved to .pps-trash", {
      description: nm,
      action: {
        label: "Undo",
        onClick: async () => {
          try {
            const trashHandle = res.trashHandle;
            const trashedFileHandle = await trashHandle.getFileHandle(res.trashedName);
            await copyFileTo(trashedFileHandle, currentSourceFolder, res.trashedName);
            await removeEntry(trashHandle, res.trashedName);
            const imgs = await listImagesInDir(currentSourceFolder);
            setImages(imgs);
            toast.success("Restored", { description: res.trashedName });
          } catch (e) {
            toast.error("Undo failed", { description: e.message });
          }
        },
      },
    });
  };

  const storeCurrent = async (opts = {}) => {
    if (!currentImage) return;
    if (!destRoot) {
      toast.error("Choose a destination drive first");
      return;
    }

    const isBatch = batchMode && batchSelected.size > 0;
    let targets = isBatch
      ? images.filter((i) => batchSelected.has(i.name))
      : [currentImage];

    // --- Batch-size limit: chunk large selections ---
    const limit = Math.max(1, parseInt(settings.batchSizeLimit ?? 20, 10) || 20);
    let leftoverNames = null; // names to keep selected for the next run
    if (isBatch && !opts.forceAll && targets.length > limit) {
      const okFirst = window.confirm(
        `${targets.length} photos selected, but your batch limit is ${limit}.\n\n` +
        `Click OK to process the first ${limit} now (the other ${targets.length - limit} will stay selected for the next run).\n\n` +
        `Click Cancel to process ALL ${targets.length} at once (may lag your PC).`
      );
      if (okFirst) {
        leftoverNames = new Set(targets.slice(limit).map((t) => t.name));
        targets = targets.slice(0, limit);
      }
      // If user cancelled (chose "process all"), targets stays full
    }

    // --- Build effective overlay map for this run ---
    let effectiveOverlays = appliedByImage;

    // Auto-apply icons: if this is a batch and only ONE selected photo has icons,
    // offer to copy them to all selected photos.
    if (isBatch && targets.length > 1) {
      const withIcons = targets.filter((t) => {
        const ov = getOverlay(appliedByImage, t.name);
        return ov.folders.length + ov.tags.length > 0;
      });
      if (withIcons.length === 1) {
        const src = withIcons[0];
        const srcOverlay = getOverlay(appliedByImage, src.name);
        const ok = window.confirm(
          `Only "${src.name}" has icons applied.\n\n` +
          `Apply the same icons (folders + filename tags) to all ${targets.length} selected photos?`
        );
        if (!ok) return;
        effectiveOverlays = { ...appliedByImage };
        for (const t of targets) {
          if (t.name === src.name) continue;
          effectiveOverlays[t.name] = {
            folders: srcOverlay.folders.map((f) => ({ ...f, uid: uid("ovl") })),
            tags: srcOverlay.tags.map((f) => ({ ...f, uid: uid("ovl") })),
          };
        }
        setAppliedByImage(effectiveOverlays);
      } else if (withIcons.length === 0) {
        toast.error("No icons applied", { description: "Drag icons onto at least one photo first." });
        return;
      }
    }

    // --- Determine after-action ---
    // Batch: use per-run override → Settings default → "keep"
    // Single: honor legacy moveMode toggle (copy vs move)
    const afterAction = isBatch
      ? (opts.afterAction ?? settings.batchAfterAction ?? "keep")
      : (settings.moveMode ? "move" : "keep");

    // For batch "delete" mode, always confirm.
    if (isBatch && afterAction === "delete") {
      const ok = window.confirm(
        `After storing ${targets.length} photo${targets.length > 1 ? "s" : ""} to destination, DELETE the ` +
        `original${targets.length > 1 ? "s" : ""} from your source drive?\n\n` +
        `This CANNOT be undone.`
      );
      if (!ok) return;
    }

    let stored = 0;
    const undoEntries = [];
    const removedFromFilmstrip = []; // names to remove after loop
    const deletedFromDisk = []; // names deleted from source
    for (const img of targets) {
      const overlay = getOverlay(effectiveOverlays, img.name);
      if (overlay.folders.length + overlay.tags.length === 0) {
        toast.error(`No icons on ${img.name}`, { description: "Drag icons to Folders / Filename first." });
        continue;
      }
      const imgPath = `${currentSourcePath}/${img.name}`;
      const stars = ratings[imgPath] || 0;
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
        const wmEnabled = isWatermarkOnFor(imgPath);
        let writtenName;
        if (wmEnabled && canWatermark(img.name)) {
          const blob = await writeWithWatermark(img.handle, settings.watermarkText.trim(), {
            fontSize: settings.watermarkFontSize || "medium",
            opacity: settings.watermarkOpacity ?? 0.9,
            xPct: settings.watermarkXPct ?? 0.98,
            yPct: settings.watermarkYPct ?? 0.98,
            color: settings.watermarkColor || "white",
            fontFamily: settings.watermarkFontFamily || "sans",
          });
          writtenName = await writeBlobTo(blob, targetDir, fileName);
        } else {
          writtenName = await copyFileTo(img.handle, targetDir, fileName);
        }
        stored++;
        const targetPath = [anchorPath, ...folderParts].filter(Boolean).join("/");
        setJustStored((cur) => ({ ...cur, [targetPath]: (cur[targetPath] || 0) + 1 }));
        // Iter 11: mirror the rating under the destination key so search's
        // min-stars filter finds it. Uses ratings[`${targetPath}/${writtenName}`].
        if (stars > 0) {
          const destKey = `${targetPath}/${writtenName}`;
          setRatings((cur) => ({ ...cur, [destKey]: stars }));
        }
        undoEntries.push({
          type: "store",
          sourceName: img.name,
          targetDir,
          writtenName,
          moved: afterAction === "move" || afterAction === "delete",
        });
        // Handle after-action per image
        if ((afterAction === "move" || afterAction === "delete") && currentSourceFolder) {
          try {
            if (afterAction === "delete") {
              // Batch delete → move to trash (safer than hard-delete)
              const trash = await currentSourceFolder.getDirectoryHandle(TRASH_DIR, { create: true });
              await copyFileTo(img.handle, trash, img.name);
            }
            await removeEntry(currentSourceFolder, img.name);
            deletedFromDisk.push(img.name);
            removedFromFilmstrip.push(img.name);
          } catch (e) {
            toast.error(`Stored but couldn't remove source: ${img.name}`);
          }
        } else if (afterAction === "keep" && isBatch) {
          // In batch keep-mode, remove from filmstrip only (marks as done)
          removedFromFilmstrip.push(img.name);
        }
      } catch (e) {
        toast.error(`Store failed: ${img.name}`, { description: e.message });
      }
    }

    if (stored > 0) {
      setHistory((h) => [{ type: "store-batch", entries: undoEntries }, ...h].slice(0, 30));
      setDestRefreshCounter((c) => c + 1);
      const verb = afterAction === "move" ? "Moved" : afterAction === "delete" ? "Stored + trashed" : "Stored";
      toast.success(`${verb} ${stored} photo${stored > 1 ? "s" : ""}`, {
        description: destSelected?.path || destRootName,
      });
      // Bump session stats
      if (afterAction === "move") bumpStat("moved", stored);
      else if (afterAction === "delete") { bumpStat("stored", stored); bumpStat("deleted", stored); }
      else bumpStat("stored", stored);
      // Auto-advance on single-photo store (Iter 14): move to next photo in filmstrip
      if (!isBatch && settings.autoAdvanceOnStore !== false && removedFromFilmstrip.length === 0) {
        setSelectedIdx((i) => Math.min(images.length - 1, i + 1));
      }
      if (removedFromFilmstrip.length > 0) {
        const removedSet = new Set(removedFromFilmstrip);
        setImages((imgs) => imgs.filter((im) => !removedSet.has(im.name)));
        setAppliedByImage((cur) => {
          const n = { ...cur };
          for (const nm of removedFromFilmstrip) delete n[nm];
          return n;
        });
        setSelectedIdx((i) => Math.max(0, Math.min(i, images.length - removedFromFilmstrip.length - 1)));
      }
      // Preserve leftover selection for the next batch run
      if (isBatch) {
        if (leftoverNames && leftoverNames.size > 0) {
          setBatchSelected(leftoverNames);
          toast.info(`${leftoverNames.size} photo${leftoverNames.size > 1 ? "s" : ""} still selected`, {
            description: "Click 'Run Batch' again to process the next group.",
          });
        } else {
          setBatchSelected(new Set());
        }
      }
    }
  };

  // ── Store a print-sized crop of the current image ────────────────────
  // Opens the crop preview modal; on confirm, crops+resizes+writes to dest
  // with a size suffix (e.g. "IMG_1234_4x6.jpg"). Watermark honored.
  const [resizeModal, setResizeModal] = useState({ open: false, printKey: null });

  const openResizeFor = (printKey) => {
    if (!currentImage) { toast.error("Pick a photo first"); return; }
    if (!destRoot) { toast.error("Choose a destination drive first"); return; }
    setResizeModal({ open: true, printKey });
  };

  const closeResizeModal = () => setResizeModal({ open: false, printKey: null });

  const confirmResizeStore = async ({ centerX, centerY }) => {
    const { printKey } = resizeModal;
    closeResizeModal();
    if (!currentImage || !destRoot || !printKey) return;
    try {
      const overlay = getOverlay(appliedByImage, currentImage.name);
      // Reuse the same template renderer as storeCurrent so folder path,
      // token substitution, and filename tags stay identical.
      const stars = ratings[`${currentSourcePath}/${currentImage.name}`] || 0;
      let imgExifDate = null;
      try {
        const f = await currentImage.handle.getFile();
        const d = await exifr.parse(f, { pick: ["DateTimeOriginal", "CreateDate"] });
        imgExifDate = d?.DateTimeOriginal || d?.CreateDate || null;
      } catch { /* ignore */ }
      const { folderParts, fileName: templatedName } = renderTemplate(settings.filenameTemplate, {
        folders: overlay.folders,
        tags: overlay.tags,
        originalName: currentImage.name,
        exifDate: imgExifDate,
        stars,
      });
      // Force output extension to .jpg (canvas exports as JPEG for print)
      // and append the print-size suffix so multiple prints of the same
      // photo don't collide.
      const base = templatedName.replace(/\.[^.]+$/, "");
      const fileName = `${base}_${printKey}.jpg`;

      const anchor = destSelected?.handle || destRoot;
      const anchorPath = destSelected?.path || destRootName;
      const targetDir = await getOrCreateSubdir(anchor, folderParts);

      const wmEnabled = isWatermarkOnFor(`${currentSourcePath}/${currentImage.name}`);
      const blob = await cropAndResize({
        sourceHandle: currentImage.handle,
        printKey,
        centerX,
        centerY,
        watermarkOpts: wmEnabled ? {
          text: settings.watermarkText.trim(),
          fontSize: settings.watermarkFontSize || "medium",
          opacity: settings.watermarkOpacity ?? 0.9,
          xPct: settings.watermarkXPct ?? 0.98,
          yPct: settings.watermarkYPct ?? 0.98,
          color: settings.watermarkColor || "white",
          fontFamily: settings.watermarkFontFamily || undefined,
        } : null,
      });
      const writtenName = await writeBlobTo(blob, targetDir, fileName);
      const fullPath = [anchorPath, ...folderParts].filter(Boolean).join("/");
      setSessionStats((s) => ({ ...s, stored: s.stored + 1 }));
      setHistory((h) => [
        { type: "store", op: "keep", entries: [{ destDirHandle: targetDir, destPath: fullPath, destName: writtenName, sourceHandle: currentImage.handle, sourceName: currentImage.name }] },
        ...h,
      ]);
      toast.success(`Stored ${printKey}`, { description: `${fullPath}/${writtenName}` });
    } catch (e) {
      toast.error("Resize failed", { description: e.message });
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
    bumpStat("rated", done);
    setAutoRating(false);
    if (batchMode) setBatchSelected(new Set());
  };

  // Batch auto-enhance: iterate over batch-selected images, analyze histogram,
  // apply auto-tone, and save the enhanced JPG to the DESTINATION folder.
  // Destination resolution priority:
  //   1. If ANY batch image has folder icons applied → use those (renderTemplate path)
  //   2. Else if a folder is currently selected in the destination tree → use that
  //   3. Else error out.
  const batchAutoEnhance = async () => {
    if (!batchMode || batchSelected.size === 0) return;
    if (!destRoot) {
      toast.error("Choose a destination drive first");
      return;
    }

    let targets = images.filter((i) => batchSelected.has(i.name));

    // Batch-size limit
    const limit = Math.max(1, parseInt(settings.batchSizeLimit ?? 20, 10) || 20);
    let leftoverNames = null;
    if (targets.length > limit) {
      const okFirst = window.confirm(
        `${targets.length} photos selected for auto-enhance, but your batch limit is ${limit}.\n\n` +
        `Click OK to process the first ${limit} now.\n\n` +
        `Click Cancel to process ALL ${targets.length} at once.`
      );
      if (okFirst) {
        leftoverNames = new Set(targets.slice(limit).map((t) => t.name));
        targets = targets.slice(0, limit);
      }
    }

    // Find a "template" image with icons — first one that has any
    const templateImg = targets.find((t) => {
      const ov = getOverlay(appliedByImage, t.name);
      return ov.folders.length + ov.tags.length > 0;
    });

    if (!templateImg && !destSelected) {
      toast.error("Pick a destination folder", {
        description: "Either drag folder icons onto the first photo, or click a folder in the destination tree.",
      });
      return;
    }

    let done = 0;
    let failed = 0;
    const t = toast.loading(`Auto-enhancing 0 / ${targets.length}…`);
    const removedFromFilmstrip = [];

    for (const img of targets) {
      try {
        const file = await img.handle.getFile();
        const { result, img: loadedImg } = await autoAnalyzeFile(file);

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

        // Build destination path
        const dot = img.name.lastIndexOf(".");
        const stem = dot > 0 ? img.name.slice(0, dot) : img.name;
        const outName = `${stem}_auto.jpg`;

        let targetDir;
        if (templateImg) {
          // Use icons from the template image for every enhanced file
          const overlay = getOverlay(appliedByImage, templateImg.name);
          const anchor = destSelected?.handle || destRoot;
          const { folderParts } = renderTemplate(settings.filenameTemplate, {
            folders: overlay.folders,
            tags: overlay.tags,
            originalName: img.name,
            exifDate: null,
            stars: 0,
          });
          targetDir = await getOrCreateSubdir(anchor, folderParts);
        } else {
          // Save into the selected destination-tree folder
          targetDir = destSelected.handle;
        }

        // Convert blob to a File so we can reuse copyFileTo signature (needs handle-like source).
        // Actually we need to write directly since it's a blob, not a file handle:
        const newHandle = await targetDir.getFileHandle(outName, { create: true });
        const w = await newHandle.createWritable();
        await w.write(blob);
        await w.close();

        done++;
        removedFromFilmstrip.push(img.name);
      } catch (e) {
        failed++;
      }
      toast.loading(`Auto-enhancing ${done + failed} / ${targets.length}…`, { id: t });
    }
    toast.dismiss(t);

    if (done > 0) {
      setDestRefreshCounter((c) => c + 1);
      toast.success(`Auto-enhanced ${done} photo${done > 1 ? "s" : ""}`, {
        description: failed ? `${failed} failed` : `Saved to ${destSelected?.path || destRootName}`,
      });
      bumpStat("enhanced", done);
    }
    if (done === 0 && failed > 0) toast.error(`All ${failed} failed`);

    // Remove processed items from filmstrip
    if (removedFromFilmstrip.length > 0) {
      const removedSet = new Set(removedFromFilmstrip);
      setImages((imgs) => imgs.filter((im) => !removedSet.has(im.name)));
      setAppliedByImage((cur) => {
        const n = { ...cur };
        for (const nm of removedFromFilmstrip) delete n[nm];
        return n;
      });
    }

    // Preserve leftover selection
    if (leftoverNames && leftoverNames.size > 0) {
      setBatchSelected(leftoverNames);
      toast.info(`${leftoverNames.size} photo${leftoverNames.size > 1 ? "s" : ""} still selected`, {
        description: "Click 'Run Batch' again to process the next group.",
      });
    } else {
      setBatchSelected(new Set());
    }
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
      else if (e.key === "F1" ) { e.preventDefault(); setShowHelp((v) => !v); }
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

  // Sync category selections if categories change (deleted, etc.)
  useEffect(() => {
    if (!categories.find((c) => c.id === foldersCatId)) {
      setFoldersCatIdRaw(categories[0]?.id || null);
    }
    if (!categories.find((c) => c.id === tagsCatId)) {
      setTagsCatIdRaw(categories[0]?.id || null);
    }
  }, [categories, foldersCatId, tagsCatId]);

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
      <Toaster theme={settings.theme || "dark"} position="bottom-right" richColors closeButton />

      {/* LEFT — Source drive tree */}
      <div className="region-left">
        <div className="px-3 py-2.5 border-b border-app flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-dim font-heading">Source</div>
            <div className="text-sm font-medium truncate" data-testid="source-root-name">
              {sourceRootName || "Not connected"}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={pickSource}
              className="px-2 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-medium flex items-center gap-1 hover:opacity-90"
              data-testid="pick-source-btn"
            >
              <FolderOpen size={12} /> Open
            </button>
            <button
              onClick={() => { setShowDrives(true); refreshFreeSpace(); }}
              className="w-6 h-6 rounded flex items-center justify-center text-dim hover:text-primary-earth hover:bg-app"
              data-testid="source-drives-btn"
              title="Show drives & free space"
            >
              <HardDrive size={13} />
            </button>
            <RecentFoldersDropdown kind="source" onPick={pickRecentSource} />
          </div>
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
        {totalFree !== null && (
          <div
            className="px-3 py-1.5 border-t border-app text-[10px] text-dim font-mono flex items-center justify-between gap-2 shrink-0"
            data-testid="source-freespace-chip"
            title="Total free space across all drives on this system"
          >
            <span className="flex items-center gap-1">
              <HardDrive size={10} className="text-primary-earth" />
              System free
            </span>
            <span className="text-app">{formatBytes(totalFree)}</span>
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
              <Layers size={12} /> Tags
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
                    <div className="absolute right-0 top-full mt-1 w-72 pane rounded-lg shadow-2xl z-40 py-1" data-testid="batch-menu">
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-dim font-heading border-b border-app">
                        Store to destination
                      </div>
                      <button
                        onClick={() => { setShowBatchMenu(false); storeCurrent(); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-surface-hover flex items-center gap-2"
                        data-testid="batch-menu-store"
                        title={`Uses default: ${settings.batchAfterAction || "keep"}`}
                      >
                        <Save size={12} className="text-primary-earth" />
                        <span className="flex-1">
                          <div className="font-semibold text-app">
                            Store (default: {settings.batchAfterAction === "move" ? "move" : settings.batchAfterAction === "delete" ? "delete originals" : "keep in source"})
                          </div>
                          <div className="text-[10px] text-dim">
                            Limit {settings.batchSizeLimit || 20} per run · uses each photo's icons
                          </div>
                        </span>
                      </button>
                      <button
                        onClick={() => { setShowBatchMenu(false); storeCurrent({ afterAction: "keep" }); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-surface-hover flex items-center gap-2"
                        data-testid="batch-menu-store-keep"
                      >
                        <Copy size={12} className="text-primary-earth" />
                        <span className="flex-1">
                          <div className="font-semibold text-app">Store · Keep in source</div>
                          <div className="text-[10px] text-dim">Originals stay on source drive, removed from filmstrip only</div>
                        </span>
                      </button>
                      <button
                        onClick={() => { setShowBatchMenu(false); storeCurrent({ afterAction: "move" }); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-surface-hover flex items-center gap-2"
                        data-testid="batch-menu-store-move"
                      >
                        <MoveRight size={12} className="text-primary-earth" />
                        <span className="flex-1">
                          <div className="font-semibold text-app">Store · Move originals</div>
                          <div className="text-[10px] text-dim">Deletes source files after successful copy</div>
                        </span>
                      </button>
                      <button
                        onClick={() => { setShowBatchMenu(false); storeCurrent({ afterAction: "delete" }); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-surface-hover flex items-center gap-2"
                        data-testid="batch-menu-store-delete"
                      >
                        <Trash2 size={12} className="text-red-400" />
                        <span className="flex-1">
                          <div className="font-semibold text-app">Store · Delete originals</div>
                          <div className="text-[10px] text-dim">Confirms before deleting from disk</div>
                        </span>
                      </button>
                      <div className="border-t border-app my-1" />
                      <button
                        onClick={() => { setShowBatchMenu(false); batchAutoEnhance(); }}
                        className="w-full text-left px-3 py-2 text-xs hover:bg-surface-hover flex items-center gap-2"
                        data-testid="batch-menu-auto-enhance"
                      >
                        <Wand2 size={12} className="text-primary-earth" />
                        <span className="flex-1">
                          <div className="font-semibold text-app">Auto-Enhance</div>
                          <div className="text-[10px] text-dim">Saves _auto.jpg to destination (using folder icons or selected dest folder)</div>
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
              onClick={() => setShowSearch(true)}
              className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1"
              data-testid="open-search"
              title="Search sorted photos"
            >
              <Search size={12} /> Search
            </button>
            <button
              onClick={() => {
                if (images.length === 0) { toast.error("Load photos first"); return; }
                setShowCull(true);
              }}
              className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1"
              data-testid="open-cull"
              title="Cull Mode — rapid-fire rating with 1-5 keys"
            >
              <Zap size={12} /> Cull
            </button>
            {trashCount > 0 && (
              <button
                onClick={emptyTrash}
                className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-[color:var(--danger)] text-[color:var(--danger)] text-xs flex items-center gap-1"
                data-testid="empty-trash-btn"
                title={`Permanently delete ${trashCount} file${trashCount > 1 ? "s" : ""} from .pps-trash`}
              >
                <Trash2 size={12} /> Trash ({trashCount})
              </button>
            )}
            {searchMode && (
              <button
                onClick={exitSearchMode}
                className="px-2.5 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs flex items-center gap-1"
                data-testid="exit-search-mode"
                title="Exit search mode and clear the filmstrip"
              >
                <XIcon size={12} /> Exit search
              </button>
            )}
            <button
              onClick={toggleTheme}
              className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1"
              data-testid="toggle-theme"
              title={`Switch to ${settings.theme === "light" ? "Earth Dark" : "Earth Light"}`}
              aria-label={`Switch to ${settings.theme === "light" ? "Earth Dark" : "Earth Light"} theme`}
            >
              {settings.theme === "light" ? <Moon size={12} /> : <Sun size={12} />}
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
              title="Help &amp; About (F1 or ?)"
            >
              <HelpCircle size={12} /> Help
            </button>
          </div>

          {/* Row 2: icon palette (folders) + Row 3: icon palette (filename) + actions */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 pane rounded px-2 py-1 flex flex-col gap-1">
              <IconPalette
                role="folders"
                categories={categories}
                activeCatId={foldersCatId}
                onSetCat={setFoldersCatId}
                onApply={applyIcon}
                onCategoriesChange={setCategories}
                onOpenManager={() => setShowCatMgr(true)}
              />
              <div className="h-px bg-app/60" />
              <IconPalette
                role="filename"
                categories={categories}
                activeCatId={foldersCatId}
                onSetCat={setFoldersCatId}
                onApply={applyIcon}
                onCategoriesChange={setCategories}
                onOpenManager={() => setShowCatMgr(true)}
                hidePicker
              />
            </div>
            <div className="grid grid-cols-2 gap-1 shrink-0">
              <button
                onClick={removeCurrentFromView}
                className="px-2.5 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center justify-center gap-1"
                data-testid="btn-skip"
                title="Skip (Space)"
              >
                <SkipForward size={13} /> Skip <span className="kbd ml-1">Space</span>
              </button>
              <button
                onClick={deleteCurrentFile}
                className="px-2.5 py-1.5 rounded bg-danger-earth/20 border border-[color:var(--danger)] text-[color:var(--danger)] hover:bg-danger-earth hover:text-[color:var(--text)] text-xs flex items-center justify-center gap-1"
                data-testid="btn-delete"
                title="Delete from disk (Del)"
              >
                <Trash2 size={13} /> Delete <span className="kbd ml-1">Del</span>
              </button>
              <button
                onClick={storeCurrent}
                className="px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] hover:opacity-90 text-xs font-semibold flex items-center justify-center gap-1"
                data-testid="btn-store"
                title="Store to destination (S)"
              >
                <Save size={13} /> Store <span className="kbd ml-1" style={{ color: "rgba(26,23,21,0.6)" }}>S</span>
              </button>
              <button
                onClick={undo}
                disabled={history.length === 0}
                className="px-2.5 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="btn-undo"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={13} /> Undo
              </button>
            </div>
          </div>

          {/* Row 2b: Print-size resize buttons — auto-center crop + 300 DPI + store */}
          <div className="space-y-1" data-testid="resize-row">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] uppercase tracking-widest text-dim font-heading">Resize for print</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {PRINT_SIZES.map((p) => (
                <button
                  key={p.key}
                  onClick={() => openResizeFor(p.key)}
                  disabled={!currentImage || !destRoot}
                  className="px-2 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-[11px] font-mono flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  data-testid={`btn-resize-${p.key}`}
                  title={`Crop & resize to ${p.key} @ 300 DPI (${p.long}×${p.short}px), then store`}
                >
                  <Save size={11} /> {p.key.replace("x", "×")}
                </button>
              ))}
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
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!currentImage) return;
                  const imgPath = `${currentSourcePath}/${currentImage.name}`;
                  const nextOn = !isWatermarkOnFor(imgPath);
                  toggleWatermarkFor(imgPath);
                  toast.success(`Watermark ${nextOn ? "ON" : "OFF"} for this photo`, {
                    description: nextOn
                      ? "This photo will be stamped when stored"
                      : "This photo will store without a watermark",
                  });
                }}
              />
              {/* Tidy © badge — shows only when watermark is ON for this photo */}
              {currentImagePath && isWatermarkOnFor(currentImagePath) && (
                <div
                  className="absolute top-3 left-3 icon-overlay rounded-lg px-2 py-1 flex items-center gap-1 text-primary-earth text-[11px] font-mono uppercase tracking-widest z-30 pointer-events-none"
                  data-testid="watermark-indicator"
                  title="Watermark will be applied to this photo when stored. Right-click the photo to toggle."
                >
                  <Copyright size={12} />
                  <span>WM</span>
                </div>
              )}
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
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full icon-overlay flex items-center justify-center text-app hover:text-primary-earth transition-colors"
                data-testid="nav-prev"
                title="Previous photo (←)"
              >
                <ChevronLeft size={20} strokeWidth={2.5} />
              </button>
              <button
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full icon-overlay flex items-center justify-center text-app hover:text-primary-earth transition-colors"
                data-testid="nav-next"
                title="Next photo (→)"
              >
                <ChevronRight size={20} strokeWidth={2.5} />
              </button>
              {/* Filename */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full icon-overlay text-xs font-mono flex items-center gap-2 text-app">
                <span data-testid="current-image-name">{currentImage.name}</span>
                <span className="text-dim">·</span>
                <span className="text-dim">{selectedIdx + 1} / {images.length}</span>
              </div>
              {/* Star rating overlay (top-right) */}
              <div className="absolute top-3 right-3 icon-overlay rounded-lg px-2 py-1 flex items-center gap-2 z-30" data-testid="rating-overlay">
                <span className="text-[10px] uppercase tracking-widest text-dim font-heading">Rate</span>
                <StarRating value={currentStars} onChange={setCurrentStars} size={16} />
              </div>
              {/* Watermark toggle bar (sits directly below Rate) */}
              {(() => {
                const wmOn = currentImagePath ? isWatermarkOnFor(currentImagePath) : false;
                return (
                  <div className="absolute top-14 right-3 icon-overlay rounded-lg px-2 py-1 flex items-center gap-2 z-30" data-testid="wm-toggle-bar">
                    <span className="text-[10px] uppercase tracking-widest text-dim font-heading">WM</span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentImagePath) return;
                        const nextOn = !wmOn;
                        toggleWatermarkFor(currentImagePath);
                        toast.success(`Watermark ${nextOn ? "ON" : "OFF"} for this photo`, {
                          description: nextOn
                            ? "This photo will be stamped when stored"
                            : "This photo will store without a watermark",
                        });
                      }}
                      role="switch"
                      aria-checked={wmOn}
                      data-testid="btn-watermark-toggle"
                      title={wmOn ? "Watermark ON — click to turn OFF" : "Watermark OFF — click to turn ON"}
                      className={`relative w-11 h-5 rounded-full transition-colors border ${
                        wmOn
                          ? "bg-primary-earth border-primary-earth"
                          : "bg-app border-app hover:bg-surface-hover"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[color:var(--text-inverse)] shadow transition-transform flex items-center justify-center text-[9px] font-semibold ${
                          wmOn ? "translate-x-6 text-primary-earth" : "translate-x-0 text-dim"
                        }`}
                      >
                        <Copyright size={10} />
                      </span>
                    </button>
                    <span
                      className={`text-[10px] font-mono ${wmOn ? "text-primary-earth" : "text-dim"}`}
                      data-testid="wm-toggle-state"
                    >
                      {wmOn ? "ON" : "OFF"}
                    </span>
                  </div>
                );
              })()}
            </>
            )
          ) : (
            <div className="text-center text-dim">
              <Camera size={40} className="mx-auto mb-3 text-primary-earth/60" />
              <div className="font-heading text-lg">Pro Photo Sorter</div>
              <p className="text-sm mt-1 max-w-md">
                Open a source folder on the left, then click a folder to load photos.
                Choose a destination on the right, drag tags onto a photo, and press <span className="kbd">S</span> to store.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — Destination tree */}
      <div className="region-right">
        <div className="px-3 py-2.5 border-b border-app flex items-center justify-between shrink-0">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-dim font-heading">Destination</div>
            <div className="text-sm font-medium truncate" data-testid="dest-root-name">
              {destRootName || "Not connected"}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={pickDest}
              className="px-2 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-medium flex items-center gap-1 hover:opacity-90"
              data-testid="pick-dest-btn"
            >
              <FolderOpen size={12} /> Open
            </button>
            <button
              onClick={() => { setShowDrives(true); refreshFreeSpace(); }}
              className="w-6 h-6 rounded flex items-center justify-center text-dim hover:text-primary-earth hover:bg-app"
              data-testid="dest-drives-btn"
              title="Show drives & free space"
            >
              <HardDrive size={13} />
            </button>
            <RecentFoldersDropdown kind="dest" onPick={pickRecentDest} />
          </div>
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
        {totalFree !== null && (
          <div
            className="px-3 py-1.5 border-t border-app text-[10px] text-dim font-mono flex items-center justify-between gap-2 shrink-0"
            data-testid="dest-freespace-chip"
            title="Total free space across all drives on this system"
          >
            <span className="flex items-center gap-1">
              <HardDrive size={10} className="text-primary-earth" />
              System free
            </span>
            <span className="text-app">{formatBytes(totalFree)}</span>
          </div>
        )}
        <div className="px-3 py-2 border-t border-app text-[10px] text-dim flex items-center justify-between gap-2">
          <span>
            Built for photographers · <span className="text-primary-earth">Pro Photo Sorter</span>
          </span>
          <span
            className="font-mono opacity-70 shrink-0"
            title={`Version ${buildInfo.version} · Build date ${buildInfo.buildDate}\n\nWhen reporting a bug, please include this so we know which build you're on.`}
            data-testid="build-stamp"
          >
            v{buildInfo.version} · {buildInfo.buildDate}
          </span>
        </div>
      </div>

      {/* BOTTOM — Filmstrip with session stats bar on top */}
      <div className="region-strip relative flex flex-col">
        <SessionStats
          stats={sessionStats}
          onReset={() => setSessionStats({ stored: 0, moved: 0, deleted: 0, skipped: 0, rated: 0, enhanced: 0 })}
        />
        <div className="relative flex-1 min-h-0">
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
            {loadingImages
              ? "Loading images from selected folder…"
              : currentSourceFolder
                ? "No images in this folder."
                : "Select a folder on the left."}
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
      </div>

      {/* Modals */}
      <ResizeCropModal
        open={resizeModal.open}
        imageHandle={currentImage?.handle || null}
        imageName={currentImage?.name || ""}
        printKey={resizeModal.printKey}
        onCancel={closeResizeModal}
        onConfirm={confirmResizeStore}
      />

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
        previewImageHandle={currentImage?.handle || null}
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

      <SearchModal
        open={showSearch}
        onClose={() => setShowSearch(false)}
        destRoot={destRoot}
        destRootName={destRootName}
        categories={categories}
        ratings={ratings}
        onLoadResults={loadSearchResults}
        onLoadResultsToSheet={(matches, rootName) => {
          loadSearchResults(matches, rootName);
          // Slight delay so filmstrip state updates before opening the sheet
          setTimeout(() => setShowContact(true), 80);
        }}
      />

      <CullMode
        open={showCull}
        onClose={() => setShowCull(false)}
        images={images}
        ratings={ratings}
        ratingKeyFor={(im) => `${currentSourcePath}/${im.name}`}
        onRate={(im, stars) => {
          const key = `${currentSourcePath}/${im.name}`;
          setRatings((cur) => ({ ...cur, [key]: stars }));
          if (stars > 0) bumpStat("rated");
        }}
      />

      <DrivesPanel open={showDrives} onClose={() => setShowDrives(false)} />

      <HelpModal open={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

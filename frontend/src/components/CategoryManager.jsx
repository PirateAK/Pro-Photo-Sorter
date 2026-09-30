import React, { useState, useRef, useEffect } from "react";
import * as Lucide from "lucide-react";
import { Plus, Trash2, X, Image as ImageIcon, Palette, Save, Download, Upload, Pencil, Package, FolderTree, Tag as TagIcon, FileText, ClipboardPaste, ChevronDown, ChevronRight, ArrowUp, ArrowDown, FolderPlus, Copy, Sparkles } from "lucide-react";
import JSZip from "jszip";
import { uid } from "../lib/storage";
import { totalCount } from "../lib/tags";
import { parseTagList, serializePack as serializePackText, serializePacks as serializePacksText } from "../lib/tagpackText";
import { toast } from "sonner";
import NestedSubfolderEditor from "./NestedSubfolderEditor";
import PasteRosterButton, { parseRoster, guardLargePaste } from "./PasteRosterButton";
import { ArrowRight, GripVertical, RotateCcw, Undo2 } from "lucide-react";
import {
  pushToTrash,
  pushManyToTrash,
  getTrash,
  getTrashCount,
  restoreChip,
  removeFromTrash,
  removeManyFromTrash,
  emptyTrash,
} from "../lib/chipTrash";
import { serializeCategory, deserializePack, findByName, applyImport, countPack, numberedName, isShipper, deserializeShipper, linkDomain } from "../lib/packFormat";
import ShipperDialog, { ShipperPreview } from "./ShipperDialog";
import { getHistory, getHistoryCount, recordHistory, removeHistory, emptyHistory, applyEntry, ACTION_LABELS } from "../lib/tagHistory";
import { History as HistoryIcon } from "lucide-react";
import { inboxList, inboxRemove, openExternal } from "../lib/electronBridge";
import { BUILTIN_ICONS } from "../lib/builtinIcons";
import PackEditor from "./PackEditor";

// v1.5.0 — Tag History panel. Whole-category snapshots taken before every
// import Replace/Merge, category delete, sub-folder delete or pasted list.
// "Restore" puts the category back as it was; "Keep both" also keeps the
// current version as a numbered copy so nothing is lost either way.
function HistoryPanel({ categories, onChange, onClose }) {
  const [items, setItems] = useState(() => getHistory());
  useEffect(() => {
    const refresh = () => setItems(getHistory());
    window.addEventListener("pps:history-updated", refresh);
    return () => window.removeEventListener("pps:history-updated", refresh);
  }, []);

  const apply = (entry, mode) => {
    const stillThere = categories.some((c) => c.id === entry.catId);
    if (mode === "restore" && stillThere) {
      const when = new Date(entry.ts).toLocaleString();
      if (!window.confirm(`Reset "${entry.catName}" to how it was on ${when}?\n\nEdits made to it since then will be lost. (Use "Keep both" to keep the current version too.)`)) return;
    }
    const { categories: next, restoredName, keptName } = applyEntry(categories, entry, mode);
    onChange(next);
    removeHistory(entry.id);
    toast.success(`Restored "${restoredName}"`, keptName ? { description: `Current version kept as "${keptName}".` } : undefined);
  };

  const doEmpty = () => {
    if (items.length === 0) return;
    if (!window.confirm(`Empty Tag History?\n\n${items.length} snapshot${items.length === 1 ? "" : "s"} will be gone for good.`)) return;
    emptyHistory();
    toast.success("Tag History emptied");
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6" data-testid="history-panel">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative pane rounded-lg shadow-2xl flex flex-col" style={{ width: "min(720px, 100%)", maxHeight: "min(78vh, 720px)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-app">
          <div className="flex items-center gap-2">
            <HistoryIcon size={16} className="text-primary-earth" />
            <h3 className="font-heading font-semibold text-base">Tag History</h3>
            <span className="text-xs text-dim font-mono">{items.length} snapshot{items.length === 1 ? "" : "s"}</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover" data-testid="history-close"><X size={16} /></button>
        </div>
        <div className="px-4 py-2 text-xs text-dim border-b border-app">
          Snapshots are taken before imports that Replace or Merge, deletes, and pasted lists. They stay here until you empty them (newest 50 · 90 days).
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {items.length === 0 ? (
            <div className="text-sm text-dim italic text-center py-10">Nothing here yet — your tag library hasn't had any big changes.</div>
          ) : items.map((e) => {
            const c = countPack(e.before);
            const stillThere = categories.some((x) => x.id === e.catId);
            return (
              <div key={e.id} className="rounded-lg border border-app bg-app p-3 flex items-center gap-3" data-testid={`history-entry-${e.id}`}>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    <span className="text-primary-earth">{ACTION_LABELS[e.action] || e.action}</span> · {e.catName}
                  </div>
                  <div className="text-[11px] text-dim font-mono">
                    {new Date(e.ts).toLocaleString()} · snapshot: {c.subfolders} sub-folder{c.subfolders === 1 ? "" : "s"}, {c.tags} tag{c.tags === 1 ? "" : "s"}{e.note ? ` · ${e.note}` : ""}
                  </div>
                </div>
                <button onClick={() => apply(e, "restore")} className="px-2.5 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-medium shrink-0" data-testid={`history-restore-${e.id}`} title={stillThere ? "Put this category back exactly as it was" : "Bring this deleted category back"}>
                  Restore
                </button>
                {stillThere && (
                  <button onClick={() => apply(e, "keepBoth")} className="px-2.5 py-1.5 rounded bg-surface border border-app hover:bg-surface-hover text-xs shrink-0" data-testid={`history-keepboth-${e.id}`} title="Restore the snapshot AND keep the current version as a numbered copy">
                    Keep both
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-app flex items-center justify-between">
          <button onClick={doEmpty} disabled={items.length === 0} className="px-2.5 py-1.5 rounded border border-app text-xs text-dim hover:text-[color:var(--danger)] hover:border-[color:var(--danger)] disabled:opacity-40" data-testid="history-empty">
            Empty History
          </button>
          <button onClick={onClose} className="px-4 py-1.5 rounded bg-surface border border-app hover:bg-surface-hover text-sm" data-testid="history-done">Done</button>
        </div>
      </div>
    </div>
  );
}

// v1.5.0 — Import decision overlay: the incoming pack's name already exists.
function ImportDecision({ pending, onPick, onCancel }) {
  const inc = countPack(pending.incoming);
  const ex = countPack(pending.existing);
  const domain = linkDomain(pending.incoming.link);
  const Btn = ({ mode, title, body, primary, testId }) => (
    <button onClick={() => onPick(mode)} className={`w-full text-left rounded-lg border p-3 transition-colors ${primary ? "border-primary-earth bg-primary-earth/10 hover:bg-primary-earth/20" : "border-app bg-app hover:bg-surface-hover"}`} data-testid={testId}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-dim mt-0.5">{body}</div>
    </button>
  );
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6" data-testid="import-decision">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative pane rounded-lg shadow-2xl border border-app w-full max-w-md p-5 space-y-3">
        <div className="flex items-center gap-2"><Upload size={16} className="text-primary-earth" /><h3 className="font-heading font-semibold text-base">"{pending.existing.name}" already exists</h3></div>
        {(pending.incoming.author || domain) && (
          <p className="text-xs text-dim flex items-center gap-2 flex-wrap" data-testid="import-decision-meta">
            {pending.incoming.author && <span>Incoming pack by <b className="text-[color:var(--text)]">{pending.incoming.author}</b></span>}
            {domain && <button onClick={() => openExternal(pending.incoming.link)} className="text-primary-earth hover:underline underline-offset-2 font-mono flex items-center gap-1">{domain} <Lucide.ExternalLink size={10} /></button>}
          </p>
        )}
        <p className="text-xs text-dim">
          Incoming pack: {inc.subfolders} sub-folder{inc.subfolders === 1 ? "" : "s"}, {inc.tags} tag{inc.tags === 1 ? "" : "s"} · Yours: {ex.subfolders} sub-folder{ex.subfolders === 1 ? "" : "s"}, {ex.tags} tag{ex.tags === 1 ? "" : "s"}. A snapshot goes to Tag History either way, so you can undo.
        </p>
        <Btn mode="merge" primary testId="import-merge" title="Merge into existing" body="Add the incoming sub-folders and tags to yours. Same names are combined, duplicates skipped, your icons kept." />
        <Btn mode="replace" testId="import-replace" title="Replace existing" body={`Swap your "${pending.existing.name}" for the incoming one. Yours is saved to Tag History first.`} />
        <Btn mode="new" testId="import-new" title="Create new category" body="Keep both, side by side. The incoming pack gets the next free number, e.g. “Wildlife 2”." />
        <div className="flex justify-end"><button onClick={onCancel} className="px-3 py-1.5 rounded text-xs text-dim hover:bg-surface-hover" data-testid="import-cancel">Cancel import</button></div>
      </div>
    </div>
  );
}

// Curated built-in icons
export { BUILTIN_ICONS };

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

// v1.4.5d — Chip Trash panel. Sits on top of the Tag Manager modal
// (its own overlay). Lists every deleted filename tag with breadcrumbs
// so Kurt can pick which ones to restore. Restore walks the current
// categories tree — if the original owner still exists it drops the
// chip back with a label collision guard; otherwise it toasts a
// helpful error so nothing gets silently misplaced.
function TrashPanel({ categories, onChange, onClose }) {
  const [items, setItems] = useState(() => getTrash());
  const [picked, setPicked] = useState(new Set());
  useEffect(() => {
    const refresh = () => setItems(getTrash());
    window.addEventListener("pps:trash-updated", refresh);
    return () => window.removeEventListener("pps:trash-updated", refresh);
  }, []);

  const toggle = (id) => {
    setPicked((cur) => {
      const next = new Set(cur);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const pickAll = () => setPicked(new Set(items.map((r) => r.id)));
  const pickNone = () => setPicked(new Set());

  const doRestore = (ids) => {
    if (ids.length === 0) return;
    let nextCategories = categories;
    const restored = [];
    const failed = [];
    // Restore newest → oldest so a matching label collision numbers
    // stack up predictably.
    const ordered = items.filter((r) => ids.includes(r.id)).sort((a, b) => b.ts - a.ts);
    for (const rec of ordered) {
      const result = restoreChip(nextCategories, rec, { newId: uid });
      if (result.ok) {
        nextCategories = result.categories;
        restored.push({ id: rec.id, label: result.restoredLabel });
      } else {
        failed.push(rec);
      }
    }
    if (restored.length > 0) {
      onChange(nextCategories);
      removeManyFromTrash(restored.map((r) => r.id));
      toast.success(
        `Restored ${restored.length} chip${restored.length === 1 ? "" : "s"}`,
        failed.length > 0
          ? { description: `${failed.length} couldn't be placed — their original sub-folder was removed. Kept in Trash so you can decide.` }
          : undefined,
      );
    } else if (failed.length > 0) {
      toast.error("Couldn't restore any chips", {
        description: "Every original parent has been deleted. Recreate the sub-folder first, then try again.",
      });
    }
    setPicked(new Set());
  };

  const doEmpty = () => {
    if (items.length === 0) return;
    if (!window.confirm(`Empty the Chip Trash?\n\n${items.length} deleted chip${items.length === 1 ? "" : "s"} will be gone for good. This can't be undone.`)) return;
    emptyTrash();
    setPicked(new Set());
    toast.success("Chip Trash emptied");
  };

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6" data-testid="trash-panel">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative pane rounded-lg shadow-2xl flex flex-col" style={{ width: "min(720px, 100%)", maxHeight: "min(78vh, 720px)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-app">
          <div className="flex items-center gap-2">
            <Trash2 size={16} className="text-primary-earth" />
            <h3 className="font-heading font-semibold text-base">Chip Trash</h3>
            <span className="text-xs text-dim font-mono">{items.length} item{items.length === 1 ? "" : "s"}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover"
            data-testid="trash-panel-close"
            title="Close (deleted chips stay in the bin until you restore or empty)"
          >
            <X size={16} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-sm text-dim px-6 py-10 text-center">
            <div>
              <p className="mb-1 font-medium text-app">Chip Trash is empty.</p>
              <p className="text-xs">Deleted filename tags land here so a wrong click doesn't cost you the label. They stick around until you restore or empty the bin.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b border-app/60 flex items-center gap-2 text-xs">
              <button
                onClick={pickAll}
                className="px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app"
                data-testid="trash-pick-all"
              >
                Select all
              </button>
              <button
                onClick={pickNone}
                disabled={picked.size === 0}
                className="px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app disabled:opacity-40"
                data-testid="trash-pick-none"
              >
                Clear
              </button>
              <span className="text-dim ml-1">{picked.size} selected</span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => doRestore(Array.from(picked))}
                  disabled={picked.size === 0}
                  className="px-3 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] font-medium flex items-center gap-1 disabled:opacity-40"
                  data-testid="trash-restore-selected"
                  title={picked.size > 0
                    ? `Restore ${picked.size} chip${picked.size === 1 ? "" : "s"} back to their original sub-folders`
                    : "Pick chips above, then click here to put them back."}
                >
                  <Undo2 size={12} /> Restore selected
                </button>
                <button
                  onClick={doEmpty}
                  className="px-3 py-1 rounded bg-app hover:bg-surface-hover border border-app text-dim hover:text-danger-earth flex items-center gap-1"
                  data-testid="trash-empty"
                  title="Delete every chip in the bin permanently"
                >
                  <Trash2 size={12} /> Empty trash
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto divide-y divide-app/40" data-testid="trash-list">
              {[...items].sort((a, b) => b.ts - a.ts).map((rec) => {
                const isPicked = picked.has(rec.id);
                const when = new Date(rec.ts);
                const ago = timeAgo(rec.ts);
                const trail = (rec.pathNames || []).filter(Boolean).join(" › ") || "(unknown path)";
                return (
                  <label
                    key={rec.id}
                    className={`flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-surface-hover ${isPicked ? "bg-primary-earth/10" : ""}`}
                    data-testid={`trash-row-${rec.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={isPicked}
                      onChange={() => toggle(rec.id)}
                      className="mt-1 accent-[color:var(--primary-earth,#a3835a)]"
                      data-testid={`trash-check-${rec.id}`}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <IconPreview item={rec.chip} size={14} />
                        <span className="font-mono text-sm truncate">{rec.chip.label}</span>
                      </div>
                      <div className="text-[10px] text-dim mt-0.5 truncate" title={trail}>
                        from <span className="text-app">{trail}</span>
                      </div>
                    </div>
                    <div className="text-[10px] text-dim shrink-0 mt-1 font-mono" title={when.toLocaleString()}>
                      {ago}
                    </div>
                    <button
                      onClick={(e) => { e.preventDefault(); doRestore([rec.id]); }}
                      className="opacity-60 hover:opacity-100 text-xs px-1.5 py-0.5 rounded border border-primary-earth/40 text-primary-earth"
                      data-testid={`trash-restore-${rec.id}`}
                      title="Restore just this chip"
                    >
                      Restore
                    </button>
                  </label>
                );
              })}
            </div>
          </>
        )}

        <div className="px-4 py-2 border-t border-app/60 text-[10px] text-dim">
          Trash holds up to 200 chips. Oldest fall off automatically when new ones come in.
        </div>
      </div>
    </div>
  );
}

// Tiny helper — "2m ago", "3h ago", "4d ago". Uses relative units up
// to a week, then falls back to a locale date string.
function timeAgo(ts) {
  const now = Date.now();
  const d = Math.max(0, now - ts);
  const s = Math.floor(d / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const dy = Math.floor(h / 24);
  if (dy < 7) return `${dy}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function CategoryManager({ open, onClose, categories, onChange, customImages = [], onCustomImagesChange }) {
  const [activeCat, setActiveCat] = useState(categories[0]?.id || null);
  // v1.4.5d — Chip Trash. Header shows a live count; clicking opens
  // the panel where Kurt can select which chips to restore or empty.
  const [trashOpen, setTrashOpen] = useState(false);
  const [trashCount, setTrashCount] = useState(() => getTrashCount());
  // v1.5.0 — Tag History + pending import decision
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCount, setHistoryCount] = useState(() => getHistoryCount());
  const [importPending, setImportPending] = useState(null); // { incoming, existing }
  const [importQueue, setImportQueue] = useState([]); // v1.7.0 — packs from a shipper, imported one by one
  const [shipperIncoming, setShipperIncoming] = useState(null); // deserialized shipper awaiting the buyer's OK
  const [shipperOpen, setShipperOpen] = useState(null); // { packs } → ShipperDialog
  useEffect(() => {
    const refresh = () => setHistoryCount(getHistoryCount());
    window.addEventListener("pps:history-updated", refresh);
    if (open) refresh();
    return () => window.removeEventListener("pps:history-updated", refresh);
  }, [open]);
  const inboxImportRef = useRef(() => {});
  // v1.5.0 — packs handed over by the Tag Pack Creator (Documents\Pro Photo
  // Sorter\Inbox). Offer each one when the Tag Manager opens.
  const inboxSeen = useRef(new Set());
  // v1.7.0 — shipper packs go through the same Merge/Replace/New decision, one at a time.
  const importPackObjRef = useRef(() => {});
  useEffect(() => {
    if (importPending || importQueue.length === 0) return;
    const [next, ...rest] = importQueue;
    setImportQueue(rest);
    importPackObjRef.current(next);
  }, [importQueue, importPending]);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const check = async () => {
      const items = await inboxList();
      if (cancelled || items.length === 0) return;
      for (const it of items) {
        if (inboxSeen.current.has(it.name)) continue;
        inboxSeen.current.add(it.name);
        setTimeout(() => inboxSeen.current.delete(it.name), 20000);
        toast(`${/shipper/i.test(it.name) ? "Pack shipment" : "Tag pack"} waiting: ${it.name.replace(/\.pps-(tagpack|shipper)\.json$/i, "")}`, {
          description: "Sent from Tag Pack Creator.",
          duration: 15000,
          action: { label: "Import", onClick: () => { try { inboxImportRef.current(it.json); inboxRemove(it.name); } catch (e) { toast.error("Import failed", { description: e.message }); } } },
          cancel: { label: "Discard", onClick: () => inboxRemove(it.name) },
        });
      }
    };
    check();
    window.addEventListener("focus", check);
    return () => { cancelled = true; window.removeEventListener("focus", check); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const snapshot = (action, cat, note) => {
    if (!cat) return;
    recordHistory({ action, category: cat, index: categories.findIndex((c) => c.id === cat.id), note });
  };
  // v1.5.0 — nested sub-folder deletes (inside NestedSubfolderEditor) announce
  // themselves so we can snapshot the owning category first.
  const currentRef = useRef(null);
  useEffect(() => {
    const onDestructive = (e) => snapshot("delete-subfolder", currentRef.current, e.detail?.note);
    window.addEventListener("pps:before-destructive", onDestructive);
    return () => window.removeEventListener("pps:before-destructive", onDestructive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);
  useEffect(() => {
    const refresh = () => setTrashCount(getTrashCount());
    window.addEventListener("pps:trash-updated", refresh);
    // Also refresh whenever the Tag Manager opens so the count reflects
    // any deletes that happened while it was closed.
    if (open) refresh();
    return () => window.removeEventListener("pps:trash-updated", refresh);
  }, [open]);
  // v1.2.8 — resizable modal. Size persisted to localStorage; defaults tuned
  // to be close to the old fixed size (max-w-4xl / h-80vh).
  const SIZE_KEY = "pps.tagmgr.size.v1";
  const MIN_W = 640;
  const MIN_H = 400;
  const readStoredSize = () => {
    try {
      const raw = localStorage.getItem(SIZE_KEY);
      if (!raw) return null;
      const p = JSON.parse(raw);
      if (p && Number.isFinite(p.w) && Number.isFinite(p.h)) return p;
    } catch { /* ignore */ }
    return null;
  };
  const [size, setSize] = useState(() => {
    const stored = readStoredSize();
    // v1.6.0 — the shared editor wants room; ignore stored widths narrower than 1100.
    if (stored && stored.w >= 1100) return stored;
    const w = typeof window !== "undefined" ? Math.min(window.innerWidth - 80, 1280) : 1280;
    const h = typeof window !== "undefined" ? Math.round(window.innerHeight * 0.8) : 720;
    return { w, h };
  });
  const resizing = useRef(null);
  const onResizeStart = (e) => {
    resizing.current = { startX: e.clientX, startY: e.clientY, startW: size.w, startH: size.h };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onResizeMove = (e) => {
    if (!resizing.current) return;
    const maxW = window.innerWidth - 40;
    const maxH = window.innerHeight - 40;
    const w = Math.max(MIN_W, Math.min(maxW, resizing.current.startW + (e.clientX - resizing.current.startX)));
    const h = Math.max(MIN_H, Math.min(maxH, resizing.current.startH + (e.clientY - resizing.current.startY)));
    setSize({ w, h });
  };
  const onResizeEnd = (e) => {
    if (!resizing.current) return;
    resizing.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    try { localStorage.setItem(SIZE_KEY, JSON.stringify(size)); } catch { /* ignore */ }
  };
  const [newCatName, setNewCatName] = useState("");
  // v1.3 — the cascade model has only ONE draft (filename tags for the
  // currently-selected sub-folder). Old folderItems/filenameItems drafts
  // are gone. Retained here just to satisfy legacy ListSection references
  // that haven't been ripped out yet — safe no-ops.
  const [drafts, setDrafts] = useState({
    folderItems: { label: "", pickerMode: "builtin", selectedBuiltin: "Folder", selectedImage: null },
    filenameItems: { label: "", pickerMode: "builtin", selectedBuiltin: "Tag", selectedImage: null },
  });
  // v1.3 — which sub-folder is currently selected? Drives the Filename Tags
  // editor that renders below the Sub-Folders list. Reset when the Category
  // switches.
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  // v1.3.1 — highlighted category row when a chip is being dragged across
  // categories in the left rail. null when nothing is hovered.
  const [crossDropCatId, setCrossDropCatId] = useState(null);
  // v1.3.1 — "Armed" icon from the Icon Holders bar. When set, clicking
  // ANY chip in the manager applies this icon to that chip. Multi-shot:
  // stays armed until user clicks the same icon again or presses Esc.
  const [armedIcon, setArmedIcon] = useState(null);
  // Esc disarms + a body-level cursor hint while armed.
  useEffect(() => {
    if (!open) return;
    if (armedIcon) {
      document.body.setAttribute("data-pps-armed", "1");
    } else {
      document.body.removeAttribute("data-pps-armed");
    }
    const onKey = (e) => {
      if (e.key === "Escape" && armedIcon) {
        e.preventDefault();
        setArmedIcon(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.removeAttribute("data-pps-armed");
    };
  }, [open, armedIcon]);
  const [bundlePickerOpen, setBundlePickerOpen] = useState(false);
  const [bundleSelected, setBundleSelected] = useState(new Set());
  const folderFileRef = useRef(null);
  const filenameFileRef = useRef(null);
  const importRef = useRef(null);
  const importTextRef = useRef(null);

  if (!open) return null;

  const current = categories.find((c) => c.id === activeCat) || categories[0];
  currentRef.current = current;
  // Auto-clear selection when switching category or when the selected sub-folder disappears.
  const currentSubs = current?.subfolders || [];
  const selectedSub = currentSubs.find((s) => s.id === selectedSubId) || null;

  const addCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    const cat = { id: uid("cat"), name, subfolders: [] };
    onChange([...categories, cat]);
    setActiveCat(cat.id);
    setNewCatName("");
  };

  const removeCategory = (id) => {
    snapshot("delete-category", categories.find((c) => c.id === id));
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

  // ── Sub-folder CRUD (v1.1.8) ────────────────────────────────────────────
  // Sub-folders live inside a pack (`current.subfolders`) and each has its
  // own `filenameItems` list. The parent pack's folderItems are inherited
  // (see main-window SUB-FOLDER bar).
  const updateCurrentPack = (patch) => {
    if (!current) return;
    const next = categories.map((c) => (c.id === current.id ? patch(c) : c));
    onChange(next);
  };
  const addSubfolder = (name) => {
    const nm = (name || "").trim();
    if (!nm) return;
    updateCurrentPack((c) => ({
      ...c,
      subfolders: [
        ...(c.subfolders || []),
        { id: uid("sf"), name: nm, iconType: "lucide", iconName: "Folder", filenameItems: [] },
      ],
    }));
  };
  // v1.4.5 — Bulk add for pasted rosters. Skips names that already exist
  // on this pack (case-insensitive) and returns how many were actually
  // created so callers can toast the right count.
  const addSubfolders = (names) => {
    const clean = (Array.isArray(names) ? names : [])
      .map((n) => (n || "").trim())
      .filter(Boolean);
    if (clean.length === 0) return 0;
    if (clean.length > 1) snapshot("paste-roster", current, `${clean.length} sub-folders`);
    let addedCount = 0;
    updateCurrentPack((c) => {
      const existing = new Set((c.subfolders || []).map((s) => (s.name || "").toLowerCase()));
      const additions = [];
      for (const nm of clean) {
        const key = nm.toLowerCase();
        if (existing.has(key)) continue;
        existing.add(key);
        additions.push({
          id: uid("sf"),
          name: nm.slice(0, 60),
          iconType: "lucide",
          iconName: "Folder",
          filenameItems: [],
        });
      }
      addedCount = additions.length;
      if (additions.length === 0) return c;
      return { ...c, subfolders: [...(c.subfolders || []), ...additions] };
    });
    return addedCount;
  };
  const removeSubfolder = (sfId) => {
    const sf = (current?.subfolders || []).find((s) => s.id === sfId);
    if (!sf) return;
    const n = (sf.filenameItems || []).length;
    if (n > 0 && !window.confirm(`Delete sub-folder "${sf.name}" and its ${n} filename tag${n > 1 ? "s" : ""}?`)) return;
    snapshot("delete-subfolder", current, sf.name);
    updateCurrentPack((c) => ({ ...c, subfolders: (c.subfolders || []).filter((s) => s.id !== sfId) }));
  };
  const renameSubfolder = (sfId, newName) => {
    const nm = (newName || "").trim();
    if (!nm) return;
    updateCurrentPack((c) => ({
      ...c,
      subfolders: (c.subfolders || []).map((s) => (s.id === sfId ? { ...s, name: nm } : s)),
    }));
  };
  const moveSubfolder = (sfId, dir /* -1 = up, +1 = down */) => {
    updateCurrentPack((c) => {
      const list = [...(c.subfolders || [])];
      const idx = list.findIndex((s) => s.id === sfId);
      if (idx < 0) return c;
      const to = idx + dir;
      if (to < 0 || to >= list.length) return c;
      const [item] = list.splice(idx, 1);
      list.splice(to, 0, item);
      return { ...c, subfolders: list };
    });
  };
  const addSubfolderItem = (sfId, label) => {
    const lbl = (label || "").trim();
    if (!lbl) return;
    updateCurrentPack((c) => ({
      ...c,
      subfolders: (c.subfolders || []).map((s) =>
        s.id === sfId
          ? { ...s, filenameItems: [...(s.filenameItems || []), { id: uid("it"), label: lbl.slice(0, 60), iconType: "lucide", iconName: "Tag" }] }
          : s
      ),
    }));
  };
  // v1.4.5 — Bulk add for pasted rosters. Atomic single-update so a
  // 250-name paste doesn't fire 250 setState calls (which used to
  // freeze/lock up PPS). Skips names already on the target sub-folder,
  // case-insensitive, and returns the count that actually landed.
  const addSubfolderItemsBulk = (sfId, labels) => {
    const clean = (Array.isArray(labels) ? labels : [])
      .map((l) => (l || "").trim())
      .filter(Boolean);
    if (clean.length === 0) return 0;
    let added = 0;
    updateCurrentPack((c) => {
      const subs = c.subfolders || [];
      const target = subs.find((s) => s.id === sfId);
      if (!target) return c;
      const existing = new Set((target.filenameItems || []).map((t) => (t.label || "").toLowerCase()));
      const additions = [];
      for (const label of clean) {
        const key = label.toLowerCase();
        if (existing.has(key)) continue;
        existing.add(key);
        additions.push({
          id: uid("it"),
          label: label.slice(0, 60),
          iconType: "lucide",
          iconName: "Tag",
        });
      }
      added = additions.length;
      if (additions.length === 0) return c;
      return {
        ...c,
        subfolders: subs.map((s) =>
          s.id === sfId ? { ...s, filenameItems: [...(s.filenameItems || []), ...additions] } : s
        ),
      };
    });
    return added;
  };
  // v1.4.5 — Reorder a filename tag WITHIN its own sub-folder. `dir`
  // is +1/-1; clamps at ends. Used by the Filename Tags pane arrows.
  const moveSubfolderItemWithin = (sfId, itemId, dir) => {
    updateCurrentPack((c) => ({
      ...c,
      subfolders: (c.subfolders || []).map((s) => {
        if (s.id !== sfId) return s;
        const list = [...(s.filenameItems || [])];
        const idx = list.findIndex((it) => it.id === itemId);
        if (idx < 0) return s;
        const to = idx + dir;
        if (to < 0 || to >= list.length) return s;
        const [row] = list.splice(idx, 1);
        list.splice(to, 0, row);
        return { ...s, filenameItems: list };
      }),
    }));
  };
  // v1.4.5 — Reorder via drag: move item at `fromIdx` to `toIdx` in the
  // filename tag list of `sfId`. Pure array splice; no server call.
  const reorderSubfolderItems = (sfId, fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    updateCurrentPack((c) => ({
      ...c,
      subfolders: (c.subfolders || []).map((s) => {
        if (s.id !== sfId) return s;
        const list = [...(s.filenameItems || [])];
        if (fromIdx < 0 || fromIdx >= list.length) return s;
        const [row] = list.splice(fromIdx, 1);
        const clamped = Math.max(0, Math.min(toIdx, list.length));
        list.splice(clamped, 0, row);
        return { ...s, filenameItems: list };
      }),
    }));
  };
  // v1.4.5 — Convert a SINGLE filename tag into a nested sub-folder
  // under its owning sub-folder (same name + icon). Kurt wanted per-tag
  // "→ Nest" in addition to "Convert all → nested".
  const convertSubfolderItemToNested = (sfId, itemId) => {
    if (!current) return;
    const sf = (current.subfolders || []).find((s) => s.id === sfId);
    const it = sf?.filenameItems?.find((x) => x.id === itemId);
    if (!sf || !it) return;
    if (!window.confirm(`Convert filename tag "${it.label}" into a nested sub-folder under "${sf.name}"?`)) return;
    updateCurrentPack((c) => ({
      ...c,
      subfolders: (c.subfolders || []).map((s) =>
        s.id !== sfId ? s : {
          ...s,
          filenameItems: (s.filenameItems || []).filter((x) => x.id !== itemId),
          subfolders: [
            ...(s.subfolders || []),
            {
              id: uid("sf"),
              name: (it.label || "Nested").slice(0, 60),
              iconType: it.iconType || "lucide",
              iconName: it.iconName || "Folder",
              ...(it.iconData ? { iconData: it.iconData } : {}),
              filenameItems: [],
              subfolders: [],
            },
          ],
        }
      ),
    }));
    toast.success(`Converted "${it.label}" to nested sub-folder`);
  };
  // v1.4.5d — Bulk-convert a SET of filename tags to nested sub-folders
  // in ONE atomic commit. Skips names that would collide with existing
  // nested folders under the same parent so nothing is silently merged.
  const convertSubfolderItemsToNestedBulk = (sfId, itemIds) => {
    if (!current || !Array.isArray(itemIds) || itemIds.length === 0) return 0;
    const sf = (current.subfolders || []).find((s) => s.id === sfId);
    if (!sf) return 0;
    const set = new Set(itemIds);
    const goingUp = (sf.filenameItems || []).filter((it) => set.has(it.id));
    if (goingUp.length === 0) return 0;
    const existingChildNames = new Set((sf.subfolders || []).map((c) => (c.name || "").toLowerCase()));
    const additions = [];
    for (const it of goingUp) {
      const nm = (it.label || "").toLowerCase();
      if (existingChildNames.has(nm)) continue;
      existingChildNames.add(nm);
      additions.push({
        id: uid("sf"),
        name: (it.label || "Nested").slice(0, 60),
        iconType: it.iconType || "lucide",
        iconName: it.iconName || "Folder",
        ...(it.iconData ? { iconData: it.iconData } : {}),
        filenameItems: [],
        subfolders: [],
      });
    }
    if (additions.length === 0) return 0;
    // Only pull the labels we actually promoted out of filenameItems —
    // the collision-skipped ones stay behind so Kurt sees them clearly.
    const promotedLabels = new Set(additions.map((a) => a.name.toLowerCase()));
    updateCurrentPack((c) => ({
      ...c,
      subfolders: (c.subfolders || []).map((s) =>
        s.id !== sfId ? s : {
          ...s,
          filenameItems: (s.filenameItems || []).filter((x) => {
            if (!set.has(x.id)) return true;
            return !promotedLabels.has((x.label || "").toLowerCase());
          }),
          subfolders: [...(s.subfolders || []), ...additions],
        }
      ),
    }));
    return additions.length;
  };
  const removeSubfolderItem = (sfId, itemId) => {
    // v1.4.5d — Snapshot the chip for the Trash bin BEFORE removing.
    // Restore later will find the same sfId inside categoryId and drop
    // the chip back on its original filenameItems list.
    if (current) {
      const sf = (current.subfolders || []).find((s) => s.id === sfId);
      const chip = sf?.filenameItems?.find((it) => it.id === itemId);
      if (chip) {
        pushToTrash({
          chip,
          categoryId: current.id,
          sfPath: [sfId],
          pathNames: [current.name, sf.name],
          deletedFromLabel: sf.name,
        });
      }
    }
    updateCurrentPack((c) => ({
      ...c,
      subfolders: (c.subfolders || []).map((s) =>
        s.id === sfId ? { ...s, filenameItems: (s.filenameItems || []).filter((it) => it.id !== itemId) } : s
      ),
    }));
  };
  // v1.4.5d — Bulk-remove filename tags in ONE atomic state update.
  // Pushes each chip to Trash before removing so multi-delete is fully
  // undoable. Used by the multi-select "Delete selected" action.
  const removeSubfolderItemsBulk = (sfId, itemIds) => {
    if (!current || !Array.isArray(itemIds) || itemIds.length === 0) return 0;
    const sf = (current.subfolders || []).find((s) => s.id === sfId);
    if (!sf) return 0;
    const idSet = new Set(itemIds);
    const goners = (sf.filenameItems || []).filter((it) => idSet.has(it.id));
    if (goners.length === 0) return 0;
    pushManyToTrash(
      goners.map((chip) => ({
        chip,
        categoryId: current.id,
        sfPath: [sfId],
        pathNames: [current.name, sf.name],
        deletedFromLabel: sf.name,
      }))
    );
    updateCurrentPack((c) => ({
      ...c,
      subfolders: (c.subfolders || []).map((s) =>
        s.id === sfId ? { ...s, filenameItems: (s.filenameItems || []).filter((it) => !idSet.has(it.id)) } : s
      ),
    }));
    return goners.length;
  };

  // v1.4.0 — Recursive nested-subfolder tree editor callback. The
  // NestedSubfolderEditor hands back a fully-patched top-level sub-folder
  // node (with all descendants inside) whenever anything in its subtree
  // changes; we splice it back into the pack's subfolders list.
  const replaceSubfolderNode = (sfId, patchedNode) => {
    updateCurrentPack((c) => ({
      ...c,
      subfolders: (c.subfolders || []).map((s) => (s.id === sfId ? patchedNode : s)),
    }));
  };

  // v1.2.1 — Swap the icon on a main-pack tag by dropping an icon from the
  // picker grid onto its chip. `iconPayload` = { iconType, iconName } or
  // { iconType: "image", iconData }.
  const swapItemIcon = (listKey, itemId, iconPayload) => {
    if (!current || !iconPayload) return;
    const next = categories.map((c) => {
      if (c.id !== current.id) return c;
      return {
        ...c,
        [listKey]: (c[listKey] || []).map((it) => {
          if (it.id !== itemId) return it;
          if (iconPayload.iconType === "image" && iconPayload.iconData) {
            return { ...it, iconType: "image", iconData: iconPayload.iconData, iconName: undefined };
          }
          return { ...it, iconType: "lucide", iconName: iconPayload.iconName || "Tag", iconData: undefined };
        }),
      };
    });
    onChange(next);
  };

  // v1.2.1 — same, but for a filename tag inside a subfolder.
  const swapSubfolderItemIcon = (sfId, itemId, iconPayload) => {
    if (!current || !iconPayload) return;
    updateCurrentPack((c) => ({
      ...c,
      subfolders: (c.subfolders || []).map((s) =>
        s.id !== sfId ? s : {
          ...s,
          filenameItems: (s.filenameItems || []).map((it) => {
            if (it.id !== itemId) return it;
            if (iconPayload.iconType === "image" && iconPayload.iconData) {
              return { ...it, iconType: "image", iconData: iconPayload.iconData, iconName: undefined };
            }
            return { ...it, iconType: "lucide", iconName: iconPayload.iconName || "Tag", iconData: undefined };
          }),
        }
      ),
    }));
  };

  // v1.3.1 — swap the sub-folder's OWN icon (not a filename tag).
  const swapSubfolderIcon = (sfId, iconPayload) => {
    if (!current || !iconPayload) return;
    updateCurrentPack((c) => ({
      ...c,
      subfolders: (c.subfolders || []).map((s) => {
        if (s.id !== sfId) return s;
        if (iconPayload.iconType === "image" && iconPayload.iconData) {
          return { ...s, iconType: "image", iconData: iconPayload.iconData, iconName: undefined };
        }
        return { ...s, iconType: "lucide", iconName: iconPayload.iconName || "Folder", iconData: undefined };
      }),
    }));
  };

  // v1.2.1 — Move OR copy a filename tag between subfolders of the current
  // pack. mode = "move" | "copy". Copy assigns a fresh id.
  const moveSubfolderItem = (fromSfId, toSfId, itemId, mode = "move") => {
    if (!current || !fromSfId || !toSfId || !itemId) return;
    if (fromSfId === toSfId && mode === "move") return;
    const fromSub = (current.subfolders || []).find((s) => s.id === fromSfId);
    const item = fromSub?.filenameItems?.find((it) => it.id === itemId);
    if (!item) return;
    const toSub = (current.subfolders || []).find((s) => s.id === toSfId);
    if (!toSub) return;
    // Guard: same-name duplicate in target
    const alreadyThere = (toSub.filenameItems || []).some(
      (it) => it.label.toLowerCase() === item.label.toLowerCase()
    );
    if (alreadyThere) {
      toast.error(`"${item.label}" already exists in "${toSub.name}"`);
      return;
    }
    const cloneOrItem = mode === "copy"
      ? { ...item, id: uid("it") }
      : item;
    updateCurrentPack((c) => ({
      ...c,
      subfolders: (c.subfolders || []).map((s) => {
        if (s.id === fromSfId && mode === "move") {
          return { ...s, filenameItems: (s.filenameItems || []).filter((it) => it.id !== itemId) };
        }
        if (s.id === toSfId) {
          return { ...s, filenameItems: [...(s.filenameItems || []), cloneOrItem] };
        }
        return s;
      }),
    }));
    toast.success(
      mode === "copy" ? `Copied "${item.label}"` : `Moved "${item.label}"`,
      { description: `${fromSub.name} → ${toSub.name}` }
    );
  };

  // v1.3.1 — Cross-Category chip drag.
  // Move / copy a filename chip from a sub-folder in the CURRENT category into
  // ANY other category (by dropping it on that category's row in the left rail).
  // The chip always lands in the target category's `_Unsorted filenames`
  // sub-folder (created on the fly if missing) — the user can then reorganize
  // it into the right sub-folder at their pace.
  const crossMoveSubfolderItem = (fromCatId, fromSfId, toCatId, itemId, mode = "move") => {
    if (!fromCatId || !toCatId || !fromSfId || !itemId) return;
    if (fromCatId === toCatId) return; // within-pack move handled by moveSubfolderItem
    const fromCat = categories.find((c) => c.id === fromCatId);
    const toCat   = categories.find((c) => c.id === toCatId);
    if (!fromCat || !toCat) return;
    const fromSub = (fromCat.subfolders || []).find((s) => s.id === fromSfId);
    const item = fromSub?.filenameItems?.find((it) => it.id === itemId);
    if (!item) return;

    const UNSORTED_NAME = "_Unsorted filenames";
    const existingUnsorted = (toCat.subfolders || []).find(
      (s) => (s.name || "").toLowerCase() === UNSORTED_NAME.toLowerCase()
    );
    const alreadyThere = existingUnsorted
      ? (existingUnsorted.filenameItems || []).some(
          (it) => it.label.toLowerCase() === item.label.toLowerCase()
        )
      : false;
    if (alreadyThere) {
      toast.error(`"${item.label}" already exists in "${toCat.name}"`, {
        description: `Skipped — already in "${UNSORTED_NAME}"`,
      });
      return;
    }
    const cloneOrItem = mode === "copy" ? { ...item, id: uid("it") } : item;

    const next = categories.map((c) => {
      // 1. Source pack — remove the item if we're moving.
      if (c.id === fromCatId && mode === "move") {
        return {
          ...c,
          subfolders: (c.subfolders || []).map((s) =>
            s.id === fromSfId
              ? { ...s, filenameItems: (s.filenameItems || []).filter((it) => it.id !== itemId) }
              : s
          ),
        };
      }
      // 2. Target pack — append into existing _Unsorted or create it.
      if (c.id === toCatId) {
        const subs = c.subfolders || [];
        if (existingUnsorted) {
          return {
            ...c,
            subfolders: subs.map((s) =>
              s.id === existingUnsorted.id
                ? { ...s, filenameItems: [...(s.filenameItems || []), cloneOrItem] }
                : s
            ),
          };
        }
        return {
          ...c,
          subfolders: [
            ...subs,
            {
              id: uid("sf"),
              name: UNSORTED_NAME,
              iconType: "lucide",
              iconName: "Package",
              filenameItems: [cloneOrItem],
            },
          ],
        };
      }
      return c;
    });
    onChange(next);
    toast.success(
      mode === "copy" ? `Copied "${item.label}" to ${toCat.name}` : `Moved "${item.label}" to ${toCat.name}`,
      { description: `${fromCat.name} › ${fromSub.name} → ${toCat.name} › ${UNSORTED_NAME}` }
    );
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
  const uniqueName = (base) => numberedName(base, categories.map((c) => c.name));

  // ── Open the bundle picker with everything pre-selected ─────────────
  const openBundlePicker = () => {
    if (categories.length === 0) { toast.error("No packs to bundle"); return; }
    setBundleSelected(new Set(categories.map((c) => c.id)));
    setBundlePickerOpen(true);
  };

  // v1.5.0 — v4 export format (nested sub-folders survive the round trip).
  const serializePack = (cat) => serializeCategory(cat);

  // v1.2.3 — One-click "Backup Everything Now" — bundles every pack as
  // both v3 JSON files AND a single plain-text `.pps-taglist.txt` snapshot
  // (belt-and-suspenders: text file is human-readable and always restorable
  // even if the JSON schema changes in the future).
  const backupEverything = async () => {
    if (categories.length === 0) { toast.error("No packs to back up"); return; }
    try {
      const zip = new JSZip();
      const stamp = new Date().toISOString().slice(0, 10);
      // JSON packs — one file per pack, all under json/
      for (const cat of categories) {
        const payload = serializePack(cat);
        const safe = cat.name.replace(/[^\w\-]+/g, "_").slice(0, 60) || "pack";
        zip.file(`json/${safe}.pps-tagpack.json`, JSON.stringify(payload, null, 2));
      }
      // Single text snapshot of everything — same format the auto-backup uses
      zip.file(`text/pps-tagpacks_${stamp}.pps-taglist.txt`, serializePacksText(categories));
      // Bundle manifest
      zip.file("bundle.json", JSON.stringify({
        formatVersion: 3,
        kind: "pps-tagpack-bundle",
        exportedAt: new Date().toISOString(),
        packs: categories.map((c) => ({
          name: c.name,
          folderTagCount: c.folderItems?.length || 0,
          filenameTagCount: c.filenameItems?.length || 0,
          subfolderCount: c.subfolders?.length || 0,
        })),
      }, null, 2));
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pps-backup_${stamp}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Backed up ${categories.length} pack${categories.length !== 1 ? "s" : ""}`, {
        description: `pps-backup_${stamp}.zip · JSON + text-list snapshots inside`,
      });
    } catch (e) {
      toast.error("Backup failed", { description: e.message });
    }
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
      const parsed = parseTagList(text); // array of { name, folderItems, filenameItems, subfolders }
      // Give every pack a unique name & fresh id, then append.
      // v1.2.2: also pass through subfolders — the parser was already emitting
      // them from `##` blocks but this handler used to drop them on the floor.
      const newCats = parsed.map((p) => ({
        id: uid("cat"),
        name: uniqueName(p.name),
        folderItems: p.folderItems,
        filenameItems: p.filenameItems,
        subfolders: p.subfolders || [],
      }));
      onChange([...categories, ...newCats]);
      setActiveCat(newCats[0].id);
      const totalTags = newCats.reduce((n, c) => {
        const subTagN = (c.subfolders || []).reduce((k, s) => k + (s.filenameItems?.length || 0), 0);
        return n + c.folderItems.length + c.filenameItems.length + subTagN;
      }, 0);
      const totalSubs = newCats.reduce((n, c) => n + (c.subfolders?.length || 0), 0);
      toast.success(
        `Imported ${newCats.length} pack${newCats.length !== 1 ? "s" : ""}`,
        {
          description:
            `${totalTags} tags total` +
            (totalSubs > 0 ? ` · ${totalSubs} sub-folder${totalSubs !== 1 ? "s" : ""}` : "") +
            ` — every tag got the default icon (edit any time).`,
        }
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

  // ── Import a pack (v1.5.0). Reads v1–v4 files. If a category with the
  // same name exists, ask Replace / Merge / Create-new; otherwise just add.
  const finishImport = (incoming, mode, existing) => {
    if (existing && mode !== "new") snapshot(mode === "replace" ? "import-replace" : "import-merge", existing, `from "${incoming.name}" pack file`);
    const res = applyImport(categories, incoming, mode, existing);
    onChange(res.categories);
    setActiveCat(res.category.id);
    setImportPending(null);
    const c = countPack(res.mode === "merge" ? incoming : res.category);
    const counts = `${c.subfolders} sub-folder${c.subfolders !== 1 ? "s" : ""} · ${c.tags} tag${c.tags !== 1 ? "s" : ""}`;
    if (res.mode === "merge") {
      toast.success(`Merged into "${res.category.name}"`, { description: `Added ${res.stats.subfoldersAdded} sub-folder${res.stats.subfoldersAdded !== 1 ? "s" : ""} and ${res.stats.tagsAdded} tag${res.stats.tagsAdded !== 1 ? "s" : ""}. Previous version saved to Tag History.` });
    } else if (res.mode === "replace") {
      toast.success(`Replaced "${res.category.name}"`, { description: `${counts}. Previous version saved to Tag History.` });
    } else {
      const by = [res.category.author && `by ${res.category.author}`, linkDomain(res.category.link)].filter(Boolean).join(" · ");
      toast.success(`Imported "${res.category.name}"`, { description: by ? `${counts} · ${by}` : counts });
    }
  };
  const importPackObj = (incoming) => {
    const existing = findByName(categories, incoming.name);
    if (existing) setImportPending({ incoming, existing });
    else finishImport(incoming, "new", null);
  };
  importPackObjRef.current = importPackObj;
  const importPackJson = (text) => {
    const data = JSON.parse(text);
    if (isShipper(data)) { setShipperIncoming(deserializeShipper(data, uid)); return; }
    importPackObj(deserializePack(data, uid));
  };
  const importShipper = () => {
    const s = shipperIncoming;
    setShipperIncoming(null);
    setImportQueue((q) => [...q, ...s.packs]);
    toast(`Importing ${s.packs.length} pack${s.packs.length === 1 ? "" : "s"} from “${s.title}”`, { description: s.author ? `by ${s.author}` : undefined });
  };
  const downloadText = (filename, text) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  inboxImportRef.current = importPackJson;
  const importFromFile = async (file) => {
    if (!file) return;
    try { importPackJson(await file.text()); }
    catch (e) { toast.error("Import failed", { description: e.message }); }
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
      <div
        className="relative pane rounded-lg flex flex-col shadow-2xl"
        style={{ width: `${size.w}px`, height: `${size.h}px`, maxWidth: "calc(100vw - 40px)", maxHeight: "calc(100vh - 40px)" }}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-app">
          <div className="flex items-center gap-2">
            <Palette size={18} className="text-primary-earth" />
            <h2 className="font-heading font-semibold text-lg">Tag Manager</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* v1.4.5d — Chip Trash button. Live count updates via the
                pps:trash-updated event. Opens the panel where Kurt can
                selectively restore deleted chips or empty the bin. */}
            <button
              onClick={() => setTrashOpen(true)}
              className={`h-8 px-2.5 rounded flex items-center gap-1.5 text-xs border transition-colors ${
                trashCount > 0
                  ? "border-primary-earth bg-primary-earth/10 text-primary-earth hover:bg-primary-earth/20"
                  : "border-app text-dim hover:bg-surface-hover"
              }`}
              data-testid="tagmgr-trash-open"
              title={trashCount > 0
                ? `${trashCount} deleted chip${trashCount === 1 ? "" : "s"} — click to review or restore`
                : "Chip Trash is empty. Deleted filename tags show up here so you can undo mistakes."}
            >
              <Trash2 size={12} />
              <span>Trash{trashCount > 0 ? ` · ${trashCount}` : ""}</span>
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className={`h-8 px-2.5 rounded flex items-center gap-1.5 text-xs border transition-colors ${
                historyCount > 0
                  ? "border-primary-earth bg-primary-earth/10 text-primary-earth hover:bg-primary-earth/20"
                  : "border-app text-dim hover:bg-surface-hover"
              }`}
              data-testid="tagmgr-history-open"
              title={historyCount > 0
                ? `${historyCount} snapshot${historyCount === 1 ? "" : "s"} — restore a category to how it was before an import, delete or paste`
                : "Tag History is empty. Big changes (import Replace/Merge, deletes, pasted lists) are snapshotted here so you can undo them."}
            >
              <HistoryIcon size={12} />
              <span>History{historyCount > 0 ? ` · ${historyCount}` : ""}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover"
              data-testid="category-manager-close"
            >
              <X size={16} />
            </button>
          </div>
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
                  placeholder="New category…"
                  className="flex-1 bg-app border border-app rounded px-2 py-1 text-sm focus-ring"
                  data-testid="new-category-input"
                />
                <button
                  onClick={addCategory}
                  className="w-8 h-8 rounded bg-primary-earth text-[color:var(--text-inverse)] flex items-center justify-center hover:opacity-90"
                  data-testid="add-category-btn"
                  title="Create a new empty Category"
                >
                  <Plus size={16} />
                </button>
              </div>
              <div className="space-y-1">
                <input
                  ref={importRef}
                  type="file"
                  accept=".json,.pps-tagpack.json,.pps-shipper.json,application/json"
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
                  title="Import a .pps-tagpack.json file, or a .pps-shipper.json with several packs inside"
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
            {/* v1.3 — "Categories" section label above the list */}
            <div className="px-3 pt-2 pb-1 text-[10px] font-heading font-semibold uppercase tracking-widest text-dim border-b border-app/40">
              Categories
            </div>
            <div className="flex-1 overflow-auto p-1">
              {/* v1.1.6 — pack list is auto-sorted A→Z. Fixes Kurt's OCD ask
                  and matches how the palette dropdown will show them too. */}
              {[...categories]
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
                .map((c) => (
                <div
                  key={c.id}
                  onClick={() => renamingId !== c.id && setActiveCat(c.id)}
                  onDragOver={(e) => {
                    // v1.3.1 — cross-category chip drop target.
                    if (e.dataTransfer.types.includes("application/x-pps-sfitem")) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = (e.ctrlKey || e.metaKey) ? "copy" : "move";
                      if (crossDropCatId !== c.id) setCrossDropCatId(c.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) {
                      setCrossDropCatId((cur) => (cur === c.id ? null : cur));
                    }
                  }}
                  onDrop={(e) => {
                    setCrossDropCatId(null);
                    const raw = e.dataTransfer.getData("application/x-pps-sfitem");
                    if (!raw) return;
                    e.preventDefault();
                    try {
                      const { fromSfId, itemId } = JSON.parse(raw);
                      if (!fromSfId || !itemId) return;
                      // The dragged chip always comes from the CURRENT pack
                      // (only the current pack's sub-folders render chips), so
                      // fromCatId = current.id at drag-time.
                      const fromCatId = current?.id;
                      if (!fromCatId || fromCatId === c.id) return; // no cross-move needed
                      const mode = (e.ctrlKey || e.metaKey) ? "copy" : "move";
                      crossMoveSubfolderItem(fromCatId, fromSfId, c.id, itemId, mode);
                    } catch { /* ignore */ }
                  }}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer text-sm transition-colors ${
                    activeCat === c.id
                      ? "bg-primary-earth/20 text-primary-earth"
                      : crossDropCatId === c.id
                      ? "bg-primary-earth/15 ring-1 ring-primary-earth/60"
                      : "hover:bg-surface-hover"
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
                <div className="px-4 py-3 border-b border-app flex items-center justify-between gap-2 bg-surface sticky top-0 z-20 shadow-sm">
                  <div className="min-w-0">
                    <h3 className="font-heading font-semibold truncate">{current.name}</h3>
                    <p className="text-xs text-dim mt-0.5 whitespace-nowrap truncate" data-testid="category-header-counts">
                      {(() => { const c = countPack(current); return `${c.subfolders} sub-folder${c.subfolders === 1 ? "" : "s"} (all levels) · ${c.tags} filename tag${c.tags === 1 ? "" : "s"}`; })()}
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
                    {/* v1.3.1 — CASCADE cleanup helper: one-click deletion of every
                        sub-folder in the CURRENT category that has 0 filename tags.
                        Handy for post-v1.3.0 migration housekeeping where empty
                        legacy folder-path buckets sit alongside populated ones. */}
                    {(() => {
                      const emptySubs = (current.subfolders || []).filter(
                        (s) => (s.filenameItems?.length || 0) === 0
                      );
                      if (emptySubs.length === 0) return null;
                      return (
                        <button
                          onClick={() => {
                            const names = emptySubs.map((s) => `"${s.name}"`).join(", ");
                            if (!window.confirm(
                              `Delete ${emptySubs.length} empty sub-folder${emptySubs.length === 1 ? "" : "s"} from "${current.name}"?\n\n${names}\n\nThis only removes empty ones — nothing with filename tags will be touched.`
                            )) return;
                            const emptyIds = new Set(emptySubs.map((s) => s.id));
                            updateCurrentPack((c) => ({
                              ...c,
                              subfolders: (c.subfolders || []).filter((s) => !emptyIds.has(s.id)),
                            }));
                            if (selectedSubId && emptyIds.has(selectedSubId)) setSelectedSubId(null);
                            toast.success(`Deleted ${emptySubs.length} empty sub-folder${emptySubs.length === 1 ? "" : "s"}`, {
                              description: names,
                            });
                          }}
                          className="px-2.5 py-1 rounded bg-danger-earth/15 hover:bg-danger-earth/25 border border-danger-earth/50 text-danger-earth text-xs flex items-center gap-1"
                          data-testid="delete-empty-subs-btn"
                          title={`Deletes ${emptySubs.length} empty sub-folder${emptySubs.length === 1 ? "" : "s"} (0 tags each) in "${current.name}". Populated sub-folders are safe.`}
                        >
                          <Trash2 size={12} /> Delete empty ({emptySubs.length})
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* v1.3 CASCADE MODEL — Category → Sub-Folders → Filename Tags.
                    The old pack-level "Folder Path Tags" and "Filename Tags"
                    ListSections are gone; every Category now has exactly one
                    child list (Sub-Folders), and each Sub-Folder owns its
                    own Filename Tags list, which is edited in the pane
                    beneath the Sub-Folders list. */}
                <div className="flex-1 overflow-auto p-4" data-testid="tagmgr-pack-editor">
                  <PackEditor
                    key={current.id}
                    pack={current}
                    hideCategory
                    armedIcon={armedIcon}
                    onConsumeArmed={() => setArmedIcon(null)}
                    onTagRemoved={(tag, ownerName, ownerId) => { pushToTrash({ chip: tag, categoryId: current.id, sfPath: ownerId ? [ownerId] : [], pathNames: [current.name, ownerName || ""], deletedFromLabel: ownerName || current.name }); setTrashCount(getTrashCount()); }}
                    onCommit={(fn) => onChange(categories.map((c) => (c.id === current.id ? fn(c) : c)))}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-dim">
                Create a tag pack to begin.
              </div>
            )}
          </div>

          {/* v1.3.1 — Right rail: Icon Holders (Basic Icons + Custom
              Images) stacked vertically. Each box scrolls INDEPENDENTLY
              of the center pane so Kurt's icon library can grow without
              stealing viewport from the sub-folder editor. */}
          <div className="w-48 border-l border-app flex flex-col overflow-hidden shrink-0" data-testid="right-rail-icon-holders">
            <IconPickerBar
              customImages={customImages}
              onCustomImagesChange={onCustomImagesChange}
              activeCatId={current?.id || null}
              activeCatName={current?.name || ""}
              armedIcon={armedIcon}
              onArmIcon={setArmedIcon}
            />
          </div>
        </div>

        <div className="px-5 py-3 border-t border-app flex items-center justify-between text-xs text-dim gap-3">
          <div className="flex-1">
            Cascade: pick a <span className="text-primary-earth">Category</span> → pick a <span className="text-primary-earth">Sub-Folder</span> → its <span className="text-primary-earth">Filename tags</span> load in the editor below. Destination path = <span className="font-mono">Category\Sub-Folder\filename_tags.jpg</span>.
          </div>
          <button
            onClick={backupEverything}
            disabled={categories.length === 0}
            className="px-2.5 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1 shrink-0 disabled:opacity-40"
            data-testid="backup-all-btn"
            title="One-click backup — every pack as JSON + text-list snapshots in a single .zip you can restore from"
          >
            <Download size={12} /> Backup All
          </button>
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

        {/* v1.2.8 — resize handle (bottom-right corner) */}
        <div
          onPointerDown={onResizeStart}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize opacity-70 hover:opacity-100 flex items-end justify-end p-0.5 text-dim hover:text-primary-earth"
          data-testid="category-manager-resize"
          title="Drag to resize"
          aria-label="Resize Tag Manager"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" aria-hidden="true">
            <path d="M0 10 L10 10 L10 0 Z M0 6 L6 0 M3 10 L10 3 M7 10 L10 7" stroke="currentColor" strokeWidth="1" fill="currentColor" />
          </svg>
        </div>

        {/* v1.4.5d — Chip Trash panel. Nested inside the Tag Manager modal
            (not a separate portal) so it inherits our resize + z-index and
            closes cleanly with the manager. */}
        {trashOpen && (
          <TrashPanel
            categories={categories}
            onChange={onChange}
            onClose={() => setTrashOpen(false)}
          />
        )}
        {historyOpen && (
          <HistoryPanel categories={categories} onChange={onChange} onClose={() => setHistoryOpen(false)} />
        )}
        {importPending && (
          <ImportDecision
            pending={importPending}
            onPick={(mode) => finishImport(importPending.incoming, mode, importPending.existing)}
            onCancel={() => setImportPending(null)}
          />
        )}
        {shipperIncoming && !importPending && (
          <ShipperPreview shipper={shipperIncoming} categories={categories} onImport={importShipper} onCancel={() => setShipperIncoming(null)} />
        )}
        {shipperOpen && (
          <ShipperDialog
            initial={{ packs: shipperOpen.packs, author: shipperOpen.packs.find((p) => p.author)?.author || "", link: shipperOpen.packs.find((p) => p.link)?.link || "" }}
            onClose={() => setShipperOpen(null)}
            onSave={(filename, json) => { downloadText(filename, json); setShipperOpen(null); toast.success("Shipper saved", { description: filename }); }}
          />
        )}

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
                  onClick={() => { const picked = categories.filter((c) => bundleSelected.has(c.id)); setBundlePickerOpen(false); setShipperOpen({ packs: picked }); }}
                  disabled={bundleSelected.size === 0}
                  className="px-3 py-1.5 rounded border border-primary-earth text-primary-earth text-xs font-semibold flex items-center gap-1 hover:bg-primary-earth/10 disabled:opacity-40"
                  title="One .pps-shipper.json with these packs, up to 3 preview images, your name and link — buyers import it in one click"
                  data-testid="bundle-picker-ship"
                >
                  <Lucide.Truck size={12} /> Ship…
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
function ListSection({ listKey, listLabel, ListIcon, helpText, items, draft, setDraft, fileRef, onAdd, onRemove, onImagePick, onMoveIn, onBulkPaste, onSwapIcon }) {
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
      <div className="px-4 py-2 flex items-center gap-2 bg-surface border-b border-app/60">
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
          <div className="grid grid-cols-12 gap-1 max-h-32 overflow-auto pane rounded p-2" data-testid={`${listKey}-icon-grid`}>
            {BUILTIN_ICONS.map((n) => (
              <button
                key={n}
                onClick={() => setDraft({ selectedBuiltin: n })}
                draggable
                onDragStart={(e) => {
                  // v1.2.1 — drag an icon from the picker onto any chip's
                  // icon area to swap its icon in place.
                  e.dataTransfer.setData(
                    "application/x-pps-iconswap",
                    JSON.stringify({ iconType: "lucide", iconName: n })
                  );
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className={`w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover cursor-grab active:cursor-grabbing ${
                  draft.selectedBuiltin === n ? "bg-primary-earth/30 text-primary-earth" : "text-app"
                }`}
                title={`${n} — drag onto any chip to swap its icon`}
                data-testid={`${listKey}-icon-${n}`}
              >
                <BuiltinIcon name={n} size={16} />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div
              className={`w-16 h-16 rounded border border-app bg-surface flex items-center justify-center overflow-hidden ${draft.selectedImage ? "cursor-grab active:cursor-grabbing" : ""}`}
              draggable={!!draft.selectedImage}
              onDragStart={(e) => {
                if (!draft.selectedImage) return;
                e.dataTransfer.setData(
                  "application/x-pps-iconswap",
                  JSON.stringify({ iconType: "image", iconData: draft.selectedImage })
                );
                e.dataTransfer.effectAllowed = "copy";
              }}
              title={draft.selectedImage ? "Drag this image onto any chip to swap its icon" : ""}
              data-testid={`${listKey}-custom-preview`}
            >
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
              <ChipRow
                key={it.id}
                it={it}
                listKey={listKey}
                onRemove={onRemove}
                onSwapIcon={onSwapIcon}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


/**
 * A single chip in the ListSection tag grid.
 * v1.2.1: accepts a drop of an icon from the picker grid to swap its icon
 * in place (data type "application/x-pps-iconswap").
 * Also draggable to move between folder/filename lists (existing behavior).
 */
function ChipRow({ it, listKey, onRemove, onSwapIcon }) {
  const [dropOver, setDropOver] = React.useState(false);
  return (
    <div
      className={`pane rounded p-2 flex items-center gap-2 group cursor-grab active:cursor-grabbing transition-colors ${
        dropOver ? "ring-2 ring-primary-earth bg-primary-earth/10" : ""
      }`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(
          "application/x-pps-tagmgr",
          JSON.stringify({ fromKey: listKey, itemId: it.id })
        );
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-pps-iconswap")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDropOver(true);
        }
      }}
      onDragLeave={() => setDropOver(false)}
      onDrop={(e) => {
        setDropOver(false);
        const raw = e.dataTransfer.getData("application/x-pps-iconswap");
        if (!raw) return;
        e.preventDefault();
        e.stopPropagation();
        try {
          const payload = JSON.parse(raw);
          onSwapIcon?.(listKey, it.id, payload);
        } catch { /* ignore */ }
      }}
      title={`${it.label} — drag to the ${listKey === "folderItems" ? "Filename" : "Folder"} section to reassign, or drop an icon here to swap`}
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
  );
}


/* ─────────────────────────────────────────────────────────────────────────
 * SubfolderSection (v1.1.8)
 * Renders the SUB-FOLDERS block inside the Tag Manager for the active pack.
 * Each subfolder is a compact row: chevron toggle · name (double-click to
 * rename) · item count · up/down/delete controls. Expanding shows a mini
 * filename-tags editor for that subfolder.
 * ────────────────────────────────────────────────────────────────────── */
function SubfolderSection({
  pack,
  onAddSubfolder,
  onAddSubfoldersBulk,    // v1.4.5 — bulk atomic add (fn(names[]) → addedCount)
  onRemoveSubfolder,
  onRenameSubfolder,
  onMoveSubfolder,
  onAddItem,
  onAddItemsBulk,          // v1.4.5 — bulk atomic add for filename tags
  onRemoveItem,
  onSwapItemIcon,          // v1.2.1 — fn(sfId, itemId, iconPayload)
  onMoveSubfolderItem,     // v1.2.1 — fn(fromSfId, toSfId, itemId, "move"|"copy")
  onReplaceSubfolderNode,  // v1.4.0 — fn(sfId, patchedNode) — recursive nested editor
  selectedSubId,           // v1.3 — currently selected sub-folder (highlights the row)
  onSelectSubfolder,       // v1.3 — (sfId) => void — click a row to load its filename tags into the editor below
  armedIcon,               // v1.3.1 — armed icon from Icon Holders (may be null)
  onConsumeArmed,          // v1.3.1 — fn({kind:"sub"|"item", sfId, itemId?}) → applies armed icon
  onRemoveItemsBulk,       // v1.4.5e — fn(sfId, itemIds[]) → count (atomic + trash)
  onConvertItemsBulk,      // v1.4.5e — fn(sfId, itemIds[]) → count (atomic multi-convert to nested)
}) {
  const subs = Array.isArray(pack?.subfolders) ? pack.subfolders : [];
  const [draft, setDraft] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [itemDrafts, setItemDrafts] = useState({}); // { [sfId]: label }
  // v1.2.1 — right-click "Move to…/Copy to…" menu on a subfolder item.
  // menu = { x, y, sfId, itemId, item }
  const [ctxMenu, setCtxMenu] = useState(null);
  // v1.2.1 — which subfolder is being drag-hovered over (for highlight)
  const [dropOverSfId, setDropOverSfId] = useState(null);
  // v1.4.5e — Multi-select mode per sub-folder. `selectModeSet` tracks
  // which sub-folder rows have flipped the [Select] toggle on;
  // `selectionByFolder` holds the ticked itemIds for each. Also track
  // `highlightedItemId` per sub-folder for single-click feedback even
  // when select mode is OFF (Kurt asked: "clicking a tag should
  // highlight it").
  const [selectModeSet, setSelectModeSet] = useState(() => new Set());
  const [selectionByFolder, setSelectionByFolder] = useState({}); // { [sfId]: Set<itemId> }
  const [highlightBySf, setHighlightBySf] = useState({}); // { [sfId]: itemId | null }
  const isSelectMode = (sfId) => selectModeSet.has(sfId);
  const toggleSelectMode = (sfId) => {
    setSelectModeSet((cur) => {
      const next = new Set(cur);
      if (next.has(sfId)) {
        next.delete(sfId);
        // Also clear that folder's selection when leaving select mode.
        setSelectionByFolder((s) => ({ ...s, [sfId]: new Set() }));
      } else {
        next.add(sfId);
      }
      return next;
    });
  };
  const getSelection = (sfId) => selectionByFolder[sfId] || new Set();
  const toggleTick = (sfId, itemId) => {
    setSelectionByFolder((cur) => {
      const set = new Set(cur[sfId] || []);
      set.has(itemId) ? set.delete(itemId) : set.add(itemId);
      return { ...cur, [sfId]: set };
    });
  };
  const selectAllInFolder = (sfId, allIds) => {
    setSelectionByFolder((cur) => ({ ...cur, [sfId]: new Set(allIds) }));
  };
  const clearSelectionInFolder = (sfId) => {
    setSelectionByFolder((cur) => ({ ...cur, [sfId]: new Set() }));
  };
  const toggleHighlight = (sfId, itemId) => {
    setHighlightBySf((cur) => ({ ...cur, [sfId]: cur[sfId] === itemId ? null : itemId }));
  };

  // v1.2.9 — Spring-loaded auto-expand. When a chip is dragged over a
  // collapsed subfolder header, start a 500ms timer; when it fires we
  // expand the subfolder so the user can drop into its nested list without
  // clicking. Drag-leave (or drag-end elsewhere) cancels the timer.
  const springTimerRef = React.useRef(null);
  const springTargetRef = React.useRef(null);   // last hovered sfId (for guard)
  const cancelSpring = React.useCallback(() => {
    if (springTimerRef.current) {
      clearTimeout(springTimerRef.current);
      springTimerRef.current = null;
    }
    springTargetRef.current = null;
  }, []);
  const armSpring = React.useCallback((sfId) => {
    if (springTargetRef.current === sfId && springTimerRef.current) return; // already armed
    cancelSpring();
    springTargetRef.current = sfId;
    springTimerRef.current = setTimeout(() => {
      // Guard: only expand if the user is still dragging over the same
      // subfolder. React's setState via the setter is safe post-timeout.
      if (springTargetRef.current === sfId) setExpandedId(sfId);
      springTimerRef.current = null;
    }, 500);
  }, [cancelSpring]);
  useEffect(() => () => cancelSpring(), [cancelSpring]);

  useEffect(() => {
    if (!ctxMenu) return;
    const onDoc = () => setCtxMenu(null);
    const onKey = (e) => { if (e.key === "Escape") setCtxMenu(null); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [ctxMenu]);

  const commitRename = () => {
    if (renamingId) onRenameSubfolder(renamingId, renameDraft);
    setRenamingId(null);
    setRenameDraft("");
  };
  const startRename = (sf) => {
    setRenamingId(sf.id);
    setRenameDraft(sf.name);
  };

  const submitAdd = () => {
    const raw = draft.trim();
    if (!raw) return;
    // v1.4.5 — Smart bulk. If Kurt types/pastes a comma / newline /
    // semicolon separated list into the "New sub-folder" input, create
    // one sub-folder per label in a single atomic commit. Falls back to
    // the single-add path (which also auto-selects the new row) when
    // only one name is present.
    const looksLikeList = /[,;\n]/.test(raw);
    if (looksLikeList && onAddSubfoldersBulk) {
      const parsed = parseRoster(raw);
      const guarded = guardLargePaste(parsed, { targetName: pack?.name });
      if (!guarded.ok) return;
      const added = onAddSubfoldersBulk(guarded.labels) || 0;
      const skipped = guarded.labels.length - added;
      if (added === 0) {
        toast("All those sub-folders already exist here", { icon: "🟰" });
      } else {
        toast.success(
          `Added ${added} sub-folder${added === 1 ? "" : "s"}${pack?.name ? ` to "${pack.name}"` : ""}`,
          skipped > 0 ? { description: `${skipped} were already there.` } : undefined,
        );
      }
      setDraft("");
      return;
    }
    onAddSubfolder(raw);
    setDraft("");
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <FolderPlus size={14} className="text-primary-earth" />
          <h4 className="text-xs font-heading font-semibold uppercase tracking-wider">Sub-Folders</h4>
          <span className="text-[10px] text-dim">({subs.length})</span>
        </div>
      </div>
      <p className="text-xs text-dim mb-3">
        Sub-folders show as chips in the main window's SUB-FOLDER bar. Picking one appends its name to the destination path (e.g. <span className="text-primary-earth">Wedding/Ceremony/Brides family/…</span>) and swaps the Filename bar to its own filename tags. Parent pack's folder tags stay inherited.
      </p>

      {/* Add sub-folder form */}
      <div className="flex items-center gap-1 mb-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitAdd(); } }}
          placeholder="New sub-folder name… (comma or newline for bulk)"
          className="flex-1 bg-app border border-app rounded px-2 py-1.5 text-sm focus-ring"
          data-testid="subfolder-new-name"
        />
        <button
          onClick={submitAdd}
          disabled={!draft.trim()}
          className="px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-medium disabled:opacity-40 flex items-center gap-1"
          data-testid="subfolder-add-btn"
          title={/[,;\n]/.test(draft || "")
            ? `Add ${parseRoster(draft || "").length} sub-folders in one shot`
            : "Add a new sub-folder to this pack"}
        >
          <Plus size={12} /> {/[,;\n]/.test(draft || "")
            ? `Add ${parseRoster(draft || "").length}`
            : "Add"}
        </button>
        {/* v1.4.5 — Paste-roster for sub-folders. Same popover UX as
            filename tags. Kurt can dump a team list here and instantly
            get one sub-folder per team. */}
        {onAddSubfoldersBulk && (
          <PasteRosterButton
            testId={`subfolder-paste-new`}
            targetName={pack?.name}
            buttonLabel="Paste list"
            onCommit={(labels) => onAddSubfoldersBulk(labels) || 0}
          />
        )}
      </div>

      {/* Subfolder list */}
      {subs.length === 0 ? (
        <div className="text-xs text-dim italic px-1 py-2">
          No sub-folders yet. Add one above to build a hierarchy like Sports → Baseball → team names.
        </div>
      ) : (
        <div className="space-y-1">
          {subs.map((sf, i) => {
            const expanded = expandedId === sf.id;
            const items = sf.filenameItems || [];
            const itDraft = itemDrafts[sf.id] || "";
            // v1.3 — highlight when this row is the currently-selected
            // sub-folder (drives the Filename Tags editor pane below).
            const isSelected = selectedSubId === sf.id;
            return (
              <div
                key={sf.id}
                className={`rounded border transition-colors ${
                  dropOverSfId === sf.id
                    ? "border-primary-earth bg-primary-earth/20 ring-2 ring-primary-earth shadow-md"
                    : isSelected
                    ? "border-primary-earth bg-primary-earth/10"
                    : springTargetRef.current === sf.id && !expanded
                    ? "border-primary-earth/70 bg-primary-earth/5"
                    : "border-app bg-app/40"
                }`}
                data-testid={`subfolder-row-${sf.id}`}
                onClick={(e) => {
                  // v1.3.1 — if the Icon Holders have an armed icon,
                  // clicking a sub-folder row applies that icon to the
                  // sub-folder's OWN icon (and still selects the row).
                  if (armedIcon && onConsumeArmed) {
                    onConsumeArmed({ kind: "sub", sfId: sf.id });
                  }
                  // v1.3 — clicking anywhere on the row (except the row's
                  // interactive controls that stopPropagation) selects it.
                  onSelectSubfolder?.(sf.id);
                }}
                onDragOver={(e) => {
                  const types = e.dataTransfer?.types || [];
                  const isSfItem = types.includes?.("application/x-pps-sfitem");
                  const isDraggable =
                    isSfItem ||
                    types.includes?.("application/x-pps-icon") ||
                    types.includes?.("application/x-pps-iconswap") ||
                    types.length > 0;
                  if (!isDraggable) return;
                  // v1.4.5 — Allow tag DROP on the ROW itself (even
                  // collapsed), not just the expanded pane. Kurt can
                  // only have one folder open at a time, so requiring
                  // both source AND target to be expanded made
                  // cross-folder moves impossible.
                  if (isSfItem) {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = (e.ctrlKey || e.metaKey) ? "copy" : "move";
                    setDropOverSfId(sf.id);
                  }
                  // v1.2.9 — spring-load collapsed rows for any drag.
                  if (!expanded) armSpring(sf.id);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget)) {
                    if (springTargetRef.current === sf.id) cancelSpring();
                    if (dropOverSfId === sf.id) setDropOverSfId(null);
                  }
                }}
                onDrop={(e) => {
                  cancelSpring();
                  // v1.4.5 — Accept a filename-tag drop on the row header.
                  // This is what makes cross-folder moves work when Kurt
                  // has only one folder expanded at a time.
                  const raw = e.dataTransfer.getData("application/x-pps-sfitem");
                  if (!raw) return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDropOverSfId(null);
                  try {
                    const { fromSfId, itemId } = JSON.parse(raw);
                    if (!fromSfId || !itemId || fromSfId === sf.id) return;
                    const mode = (e.ctrlKey || e.metaKey) ? "copy" : "move";
                    onMoveSubfolderItem?.(fromSfId, sf.id, itemId, mode);
                    toast.success(
                      mode === "copy"
                        ? `Copied filename tag to "${sf.name}"`
                        : `Moved filename tag to "${sf.name}"`
                    );
                  } catch { /* ignore malformed drops */ }
                }}
                data-drop-active={dropOverSfId === sf.id ? "true" : "false"}
              >
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <button
                    onClick={() => setExpandedId(expanded ? null : sf.id)}
                    className="w-5 h-5 rounded flex items-center justify-center text-dim hover:text-primary-earth"
                    data-testid={`subfolder-toggle-${sf.id}`}
                    title={expanded ? "Collapse" : "Expand to edit filename tags"}
                  >
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  {renamingId === sf.id ? (
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") { setRenamingId(null); setRenameDraft(""); }
                      }}
                      className="flex-1 bg-app border border-primary-earth rounded px-1.5 py-0.5 text-sm focus-ring"
                      data-testid={`subfolder-rename-${sf.id}`}
                    />
                  ) : (
                    <button
                      onDoubleClick={() => startRename(sf)}
                      className="flex-1 text-left text-sm font-medium truncate hover:text-primary-earth"
                      title="Double-click to rename"
                      data-testid={`subfolder-name-${sf.id}`}
                    >
                      {sf.name}
                    </button>
                  )}
                  <span className="text-[10px] text-dim shrink-0 mx-1" title="Direct tags · nested sub-folders / tags inside them">
                    {items.length} tag{items.length !== 1 ? "s" : ""}
                    {(() => { const n = countPack({ subfolders: sf.subfolders || [] }); return n.subfolders > 0 ? <span className="text-primary-earth"> · {n.subfolders} nested{n.tags > 0 ? ` / ${n.tags} tag${n.tags !== 1 ? "s" : ""}` : ""}</span> : null; })()}
                  </span>
                  <button
                    onClick={() => startRename(sf)}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-hover text-dim hover:text-primary-earth"
                    data-testid={`subfolder-rename-btn-${sf.id}`}
                    title="Rename"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    onClick={() => onMoveSubfolder(sf.id, -1)}
                    disabled={i === 0}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-hover text-dim hover:text-primary-earth disabled:opacity-30 disabled:cursor-not-allowed"
                    data-testid={`subfolder-up-${sf.id}`}
                    title="Move up"
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    onClick={() => onMoveSubfolder(sf.id, +1)}
                    disabled={i === subs.length - 1}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-hover text-dim hover:text-primary-earth disabled:opacity-30 disabled:cursor-not-allowed"
                    data-testid={`subfolder-down-${sf.id}`}
                    title="Move down"
                  >
                    <ArrowDown size={11} />
                  </button>
                  <button
                    onClick={() => onRemoveSubfolder(sf.id)}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-surface-hover text-dim hover:text-danger-earth"
                    data-testid={`subfolder-delete-${sf.id}`}
                    title="Delete sub-folder"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

                {expanded && (
                  <div
                    className={`px-3 pb-2 pt-1 border-t border-app/40 transition-colors ${
                      dropOverSfId === sf.id ? "bg-primary-earth/10 ring-1 ring-primary-earth/50 rounded-b" : ""
                    }`}
                    onDragOver={(e) => {
                      if (e.dataTransfer.types.includes("application/x-pps-sfitem")) {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = (e.ctrlKey || e.metaKey) ? "copy" : "move";
                        setDropOverSfId(sf.id);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) setDropOverSfId(null);
                    }}
                    onDrop={(e) => {
                      setDropOverSfId(null);
                      const raw = e.dataTransfer.getData("application/x-pps-sfitem");
                      if (!raw) return;
                      e.preventDefault();
                      try {
                        const { fromSfId, itemId } = JSON.parse(raw);
                        if (!fromSfId || !itemId) return;
                        const mode = (e.ctrlKey || e.metaKey) ? "copy" : "move";
                        onMoveSubfolderItem?.(fromSfId, sf.id, itemId, mode);
                      } catch { /* ignore */ }
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-wider text-dim font-heading mb-1.5 flex items-center justify-between gap-2">
                      <span className="truncate">Filename tags for "{sf.name}"</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* v1.4.1 — Bulk convert filename tags → nested
                            sub-folders. Only surfaces when there is at
                            least one tag to move. */}
                        {items.length > 0 && onReplaceSubfolderNode && (
                          <button
                            onClick={() => {
                              if (!window.confirm(
                                `Convert all ${items.length} filename tag(s) into nested sub-folders under "${sf.name}"?\n\n` +
                                `Each tag becomes a new sub-folder with an empty filename tag list (ready for players / etc.). ` +
                                `Existing nested sub-folders are kept.`
                              )) return;
                              const existing = Array.isArray(sf.subfolders) ? sf.subfolders : [];
                              const seen = new Set(existing.map((c) => (c.name || "").toLowerCase()));
                              const newOnes = [];
                              for (const t of items) {
                                const nm = (t.label || "").toLowerCase();
                                if (seen.has(nm)) continue;
                                seen.add(nm);
                                newOnes.push({
                                  id: uid("sf"),
                                  name: (t.label || "Nested").slice(0, 60),
                                  iconType: t.iconType || "lucide",
                                  iconName: t.iconName || "Folder",
                                  ...(t.iconData ? { iconData: t.iconData } : {}),
                                  filenameItems: [],
                                  subfolders: [],
                                });
                              }
                              onReplaceSubfolderNode(sf.id, {
                                ...sf,
                                filenameItems: [],
                                subfolders: [...existing, ...newOnes],
                              });
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary-earth/15 hover:bg-primary-earth/30 border border-primary-earth/40 text-[10px] normal-case tracking-normal text-primary-earth"
                            data-testid={`subfolder-bulk-nest-${sf.id}`}
                            title={`Move every filename tag on "${sf.name}" into its own nested sub-folder — great for teams → per-team rosters.`}
                          >
                            <FolderPlus size={10} /> Convert all → nested
                          </button>
                        )}
                        <span className="text-[9px] normal-case tracking-normal italic text-dim">
                          Drag chip = move · Ctrl+drag = copy · Right-click = menu
                        </span>
                        {/* v1.4.5e — Select toggle. Per-sub-folder so
                            Kurt can enter select mode on just the one
                            he's working in. */}
                        {items.length > 0 && onRemoveItemsBulk && (
                          <button
                            onClick={() => toggleSelectMode(sf.id)}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] normal-case tracking-normal ${
                              isSelectMode(sf.id)
                                ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent"
                                : "bg-app hover:bg-surface-hover border-app text-app"
                            }`}
                            data-testid={`subfolder-select-toggle-${sf.id}`}
                            title={isSelectMode(sf.id)
                              ? "Exit select mode — hides checkboxes and clears the current selection"
                              : "Enter select mode — tick multiple chips to delete or convert several at once"}
                          >
                            {isSelectMode(sf.id) ? "Done" : "Select"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {items.length === 0 ? (
                        <span className="text-xs text-dim italic">No filename tags yet. Add some below (e.g. team names for Baseball).</span>
                      ) : items.map((it) => {
                        const sel = getSelection(sf.id);
                        const ticked = sel.has(it.id);
                        const highlighted = highlightBySf[sf.id] === it.id && !isSelectMode(sf.id);
                        return (
                          <SubfolderItemChip
                            key={it.id}
                            it={it}
                            sfId={sf.id}
                            onRemove={() => onRemoveItem(sf.id, it.id)}
                            onSwapIcon={(payload) => onSwapItemIcon?.(sf.id, it.id, payload)}
                            armedIcon={armedIcon}
                            onArmedClick={() => onConsumeArmed?.({ kind: "item", sfId: sf.id, itemId: it.id })}
                            onContext={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setCtxMenu({ x: e.clientX, y: e.clientY, sfId: sf.id, itemId: it.id, item: it });
                            }}
                            selectMode={isSelectMode(sf.id)}
                            isTicked={ticked}
                            onToggleTick={(id) => toggleTick(sf.id, id)}
                            isHighlighted={highlighted}
                            onToggleHighlight={(id) => toggleHighlight(sf.id, id)}
                            selectedIds={Array.from(sel)}
                          />
                        );
                      })}
                    </div>
                    {/* v1.4.5e — Floating bulk-action bar inside the
                        expanded sub-folder. Only visible when select
                        mode is ON for THIS sub-folder AND at least one
                        chip is ticked. */}
                    {isSelectMode(sf.id) && getSelection(sf.id).size > 0 && (
                      <div
                        className="mb-2 px-2 py-1.5 rounded border border-primary-earth bg-primary-earth/10 flex items-center gap-1.5 flex-wrap"
                        data-testid={`subfolder-bulkbar-${sf.id}`}
                      >
                        <span className="text-[11px] font-medium text-primary-earth">
                          {getSelection(sf.id).size} tag{getSelection(sf.id).size === 1 ? "" : "s"} selected
                        </span>
                        <div className="ml-auto flex items-center gap-1">
                          <button
                            onClick={() => selectAllInFolder(sf.id, items.map((i) => i.id))}
                            disabled={getSelection(sf.id).size === items.length}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-app hover:bg-surface-hover border border-app disabled:opacity-40"
                            data-testid={`bulkbar-select-all-${sf.id}`}
                            title="Tick every chip in this list"
                          >
                            Select all
                          </button>
                          <button
                            onClick={() => clearSelectionInFolder(sf.id)}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-app hover:bg-surface-hover border border-app"
                            data-testid={`bulkbar-clear-${sf.id}`}
                            title="Uncheck every chip but stay in select mode"
                          >
                            Clear
                          </button>
                          {onConvertItemsBulk && (
                            <button
                              onClick={() => {
                                const ids = Array.from(getSelection(sf.id));
                                if (!window.confirm(
                                  `Convert ${ids.length} tag${ids.length === 1 ? "" : "s"} into nested sub-folders under "${sf.name}"?\n\nEach becomes its own sub-folder.`
                                )) return;
                                const made = onConvertItemsBulk(sf.id, ids) || 0;
                                const skipped = ids.length - made;
                                if (made > 0) toast.success(
                                  `Converted ${made} tag${made === 1 ? "" : "s"} → nested sub-folders`,
                                  skipped > 0 ? { description: `${skipped} were skipped (matching sub-folder already exists).` } : undefined,
                                );
                                else toast("Nothing converted — all names collide with existing sub-folders", { icon: "🟰" });
                                clearSelectionInFolder(sf.id);
                              }}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-app hover:bg-surface-hover border border-primary-earth/50 text-primary-earth flex items-center gap-1"
                              data-testid={`bulkbar-convert-${sf.id}`}
                              title={`Turn each selected tag into its own nested sub-folder under "${sf.name}"`}
                            >
                              <FolderPlus size={9} /> Convert
                            </button>
                          )}
                          <button
                            onClick={() => {
                              const ids = Array.from(getSelection(sf.id));
                              if (!window.confirm(
                                `Delete ${ids.length} filename tag${ids.length === 1 ? "" : "s"} from "${sf.name}"?\n\nThey'll go to the Chip Trash so you can undo the delete from the header.`
                              )) return;
                              const removed = onRemoveItemsBulk ? (onRemoveItemsBulk(sf.id, ids) || 0) : 0;
                              if (removed > 0) toast.success(`Deleted ${removed} tag${removed === 1 ? "" : "s"} — restore from Trash if that was a mistake.`);
                              clearSelectionInFolder(sf.id);
                            }}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-app hover:bg-surface-hover border border-app text-dim hover:text-[color:var(--danger,#c0392b)] flex items-center gap-1"
                            data-testid={`bulkbar-delete-${sf.id}`}
                            title="Send every selected chip to Chip Trash"
                          >
                            <Trash2 size={9} /> Delete
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={itDraft}
                        onChange={(e) => setItemDrafts({ ...itemDrafts, [sf.id]: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            // v1.4.5 — Smart bulk (atomic). Uses the new
                            // onAddItemsBulk helper so a 500-label paste
                            // is ONE state update instead of 500 (which
                            // used to freeze PPS). Falls back to single
                            // onAddItem when only one label is present.
                            const val = itDraft;
                            if (/[,;\n]/.test(val) && onAddItemsBulk) {
                              const parsed = parseRoster(val);
                              const guarded = guardLargePaste(parsed, { targetName: sf.name });
                              if (!guarded.ok) return;
                              const added = onAddItemsBulk(sf.id, guarded.labels) || 0;
                              const skipped = guarded.labels.length - added;
                              if (added > 0) toast.success(
                                `Added ${added} filename tag${added === 1 ? "" : "s"} to "${sf.name}"`,
                                skipped > 0 ? { description: `${skipped} were already there.` } : undefined,
                              );
                              else toast("All those labels already exist here", { icon: "🟰" });
                            } else {
                              onAddItem(sf.id, val);
                            }
                            setItemDrafts({ ...itemDrafts, [sf.id]: "" });
                          }
                        }}
                        placeholder="New filename tag… (comma, semicolon, or newline for bulk)"
                        className="flex-1 bg-app border border-app rounded px-2 py-1 text-xs focus-ring"
                        data-testid={`subfolder-item-input-${sf.id}`}
                      />
                      <button
                        onClick={() => {
                          const val = itDraft;
                          if (/[,;\n]/.test(val) && onAddItemsBulk) {
                            const parsed = parseRoster(val);
                            const guarded = guardLargePaste(parsed, { targetName: sf.name });
                            if (!guarded.ok) return;
                            const added = onAddItemsBulk(sf.id, guarded.labels) || 0;
                            const skipped = guarded.labels.length - added;
                            if (added > 0) toast.success(
                              `Added ${added} filename tag${added === 1 ? "" : "s"} to "${sf.name}"`,
                              skipped > 0 ? { description: `${skipped} were already there.` } : undefined,
                            );
                            else toast("All those labels already exist here", { icon: "🟰" });
                          } else {
                            onAddItem(sf.id, val);
                          }
                          setItemDrafts({ ...itemDrafts, [sf.id]: "" });
                        }}
                        disabled={!itDraft.trim()}
                        className="px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs disabled:opacity-40 flex items-center gap-1"
                        data-testid={`subfolder-item-add-${sf.id}`}
                        title={/[,;\n]/.test(itDraft) ? `Add ${parseRoster(itDraft).length} tags in one shot` : "Add this filename tag"}
                      >
                        <Plus size={11} /> {/[,;\n]/.test(itDraft) ? `Add ${parseRoster(itDraft).length}` : "Add"}
                      </button>
                      {/* v1.4.5 — Paste Roster bulk add via popover. Now
                          wired through onAddItemsBulk so the entire
                          roster commits atomically. Skips labels that
                          already exist here. */}
                      <PasteRosterButton
                        testId={`subfolder-paste-${sf.id}`}
                        targetName={sf.name}
                        onCommit={(labels) => onAddItemsBulk ? (onAddItemsBulk(sf.id, labels) || 0) : 0}
                      />
                    </div>

                    {/* v1.4.0 · v1.4.1 — Unlimited nested sub-folders.
                        Managed by a self-contained recursive editor so the
                        surrounding SubfolderSection stays flat. The
                        ancestorPath starts at the CATEGORY name so nested
                        rows show a full "Sports › Baseball (AL) › …"
                        breadcrumb at every depth. */}
                    {onReplaceSubfolderNode && (
                      <NestedSubfolderEditor
                        node={sf}
                        onChange={(patched) => onReplaceSubfolderNode(sf.id, patched)}
                        ancestorPath={[{ name: pack?.name }]}
                        trashContext={{
                          categoryId: pack?.id,
                          sfIdPath: [sf.id],
                          sfNamePath: [pack?.name, sf.name].filter(Boolean),
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* v1.2.1 — Right-click context menu on subfolder items */}
      {ctxMenu && (
        <SubfolderItemContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          item={ctxMenu.item}
          fromSfId={ctxMenu.sfId}
          allSubs={subs}
          onPick={(toSfId, mode) => {
            onMoveSubfolderItem?.(ctxMenu.sfId, toSfId, ctxMenu.itemId, mode);
            setCtxMenu(null);
          }}
          onRemove={() => {
            onRemoveItem(ctxMenu.sfId, ctxMenu.itemId);
            setCtxMenu(null);
          }}
          onNest={onReplaceSubfolderNode ? () => {
            // v1.4.1 — promote a single filename tag on this sub-folder
            // into a fresh nested sub-folder (same name + icon).
            const sf = subs.find((s) => s.id === ctxMenu.sfId);
            const it = (sf?.filenameItems || []).find((x) => x.id === ctxMenu.itemId);
            if (!sf || !it) { setCtxMenu(null); return; }
            if (!window.confirm(`Convert filename tag "${it.label}" into a nested sub-folder under "${sf.name}"?`)) {
              setCtxMenu(null); return;
            }
            onReplaceSubfolderNode(sf.id, {
              ...sf,
              filenameItems: (sf.filenameItems || []).filter((x) => x.id !== it.id),
              subfolders: [
                ...(sf.subfolders || []),
                {
                  id: uid("sf"),
                  name: (it.label || "Nested").slice(0, 60),
                  iconType: it.iconType || "lucide",
                  iconName: it.iconName || "Folder",
                  ...(it.iconData ? { iconData: it.iconData } : {}),
                  filenameItems: [],
                  subfolders: [],
                },
              ],
            });
            setCtxMenu(null);
          } : null}
        />
      )}
    </div>
  );
}

/**
 * Draggable chip for a filename tag inside a subfolder.
 * v1.2.1: draggable payload "application/x-pps-sfitem" carries { fromSfId, itemId };
 * drop target for "application/x-pps-iconswap" to change its icon;
 * right-click opens a Move-to / Copy-to menu.
 */
function SubfolderItemChip({
  it,
  sfId,
  onRemove,
  onSwapIcon,
  onContext,
  armedIcon,
  onArmedClick,
  // v1.4.5e — Multi-select + click-highlight props. All optional; when
  // omitted the chip behaves exactly like v1.4.5d.
  selectMode = false,
  isTicked = false,
  onToggleTick,       // fn(itemId) — flips the checkbox
  isHighlighted = false,
  onToggleHighlight,  // fn(itemId) — single-click feedback ping when select mode is OFF
  selectedIds = null, // Array<itemId> | null — for multi-drag payload
}) {
  const [dropOver, setDropOver] = React.useState(false);
  return (
    <div
      draggable
      onClick={(e) => {
        // v1.3.1 — armed-icon click-to-apply always wins.
        if (armedIcon && onArmedClick) {
          e.stopPropagation();
          onArmedClick();
          return;
        }
        // v1.4.5e — In select mode, a click ticks/unticks the chip.
        if (selectMode && onToggleTick) {
          e.stopPropagation();
          onToggleTick(it.id);
          return;
        }
        // v1.4.5e — Out of select mode, a plain click gives visual
        // feedback: highlight this chip (single-select ring). Click
        // again to un-highlight. This is what Kurt asked for after the
        // v1.4.5d smoke test — "I clicked a tag and nothing happened".
        if (onToggleHighlight) {
          e.stopPropagation();
          onToggleHighlight(it.id);
        }
      }}
      onDragStart={(e) => {
        // v1.4.5e — Carry the whole selection when Kurt drags a ticked
        // chip while multi-select is on. Receivers can iterate itemIds
        // to move them all together; single-drop code path unchanged.
        const carry = selectMode && isTicked && Array.isArray(selectedIds) && selectedIds.length > 1
          ? selectedIds
          : [it.id];
        e.dataTransfer.setData(
          "application/x-pps-sfitem",
          JSON.stringify({ fromSfId: sfId, itemId: it.id, itemIds: carry })
        );
        e.dataTransfer.effectAllowed = "copyMove";
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-pps-iconswap")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "copy";
          setDropOver(true);
        }
      }}
      onDragLeave={() => setDropOver(false)}
      onDrop={(e) => {
        setDropOver(false);
        const raw = e.dataTransfer.getData("application/x-pps-iconswap");
        if (!raw) return;
        e.preventDefault();
        e.stopPropagation();
        try { onSwapIcon?.(JSON.parse(raw)); } catch { /* ignore */ }
      }}
      onContextMenu={onContext}
      className={`group flex items-center gap-1 px-2 py-0.5 rounded bg-app border text-xs max-w-[240px] transition-colors ${
        armedIcon ? "cursor-crosshair ring-1 ring-primary-earth/40" : selectMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } ${
        dropOver
          ? "ring-2 ring-primary-earth bg-primary-earth/15 border-primary-earth"
          : isTicked
          ? "border-primary-earth bg-primary-earth/20 ring-1 ring-primary-earth"
          : isHighlighted
          ? "border-primary-earth bg-primary-earth/10 ring-1 ring-primary-earth/70"
          : "border-app"
      }`}
      data-testid={`subfolder-item-${sfId}-${it.id}`}
      data-ticked={isTicked ? "true" : "false"}
      data-highlighted={isHighlighted ? "true" : "false"}
      title={armedIcon
        ? `${it.label}  ·  Click to apply the armed icon (or press Esc to disarm)`
        : selectMode
        ? `${it.label}  ·  Click to toggle selection. Drag any ticked chip and all ticked chips travel with it.`
        : `${it.label}  ·  Click to highlight. Drag to another sub-folder to move (Ctrl+drag to copy). Drop an icon here to swap. Right-click for menu.`}
    >
      {/* v1.4.5e — Checkbox visible only in select mode. */}
      {selectMode && (
        <input
          type="checkbox"
          checked={isTicked}
          readOnly
          className="accent-[color:var(--primary-earth,#a3835a)] shrink-0 pointer-events-none"
          tabIndex={-1}
          data-testid={`subfolder-item-check-${sfId}-${it.id}`}
        />
      )}
      <span className="text-primary-earth shrink-0 flex items-center">
        <IconPreview item={it} size={12} />
      </span>
      <span className="font-mono truncate">{it.label}</span>
      {!selectMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
          className="w-4 h-4 rounded flex items-center justify-center text-dim hover:text-danger-earth opacity-0 group-hover:opacity-100"
          data-testid={`subfolder-item-remove-${sfId}-${it.id}`}
          title="Remove (goes to Chip Trash — restore from the header)"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}

/**
 * v1.2.1 — Context menu for a subfolder item.
 * Shows the current subfolder + a list of every OTHER subfolder as
 * Move-to and Copy-to targets, plus a Remove item.
 */
function SubfolderItemContextMenu({ x, y, item, fromSfId, allSubs, onPick, onRemove, onNest }) {
  const others = (allSubs || []).filter((s) => s.id !== fromSfId);
  const style = {
    position: "fixed",
    top: Math.min(y, window.innerHeight - Math.min(400, 120 + others.length * 30)),
    left: Math.min(x, window.innerWidth - 260),
    zIndex: 100,
  };
  return (
    <div
      style={style}
      className="pane rounded-md shadow-2xl border border-app min-w-[240px] py-1"
      data-testid="subfolder-item-ctxmenu"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-dim font-heading truncate">
        {item?.label}
      </div>
      {others.length === 0 ? (
        <div className="px-3 py-2 text-xs text-dim italic">
          No other sub-folders in this pack. Add one to enable copy/move.
        </div>
      ) : (
        <>
          <div className="px-3 pt-1 pb-0.5 text-[10px] font-heading text-dim">Move to…</div>
          {others.map((s) => (
            <button
              key={`move-${s.id}`}
              onClick={() => onPick(s.id, "move")}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-surface-hover text-app"
              data-testid={`subfolder-item-move-${s.id}`}
            >
              <FolderPlus size={12} className="text-primary-earth shrink-0" />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
          <div className="h-px bg-app/60 my-1" />
          <div className="px-3 pt-1 pb-0.5 text-[10px] font-heading text-dim">Copy to…</div>
          {others.map((s) => (
            <button
              key={`copy-${s.id}`}
              onClick={() => onPick(s.id, "copy")}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-surface-hover text-app"
              data-testid={`subfolder-item-copy-${s.id}`}
            >
              <Copy size={12} className="text-primary-earth shrink-0" />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
        </>
      )}
      <div className="h-px bg-app/60 my-1" />
      {onNest && (
        <button
          onClick={onNest}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-surface-hover text-primary-earth"
          data-testid="subfolder-item-ctx-nest"
          title="Convert this filename tag into a nested sub-folder under its current parent."
        >
          <FolderPlus size={12} /> → Nest this tag (make it a sub-folder)
        </button>
      )}
      <button
        onClick={onRemove}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-surface-hover text-[color:var(--danger,#c0392b)]"
        data-testid="subfolder-item-ctx-remove"
      >
        <Trash2 size={12} /> Remove
      </button>
    </div>
  );
}


/**
 * Tiny icon renderer used by chip rows. Reads the item's
 * iconType/iconName/imageDataUrl and renders the correct visual. Falls
 * back to a generic Tag icon.
 */
function TagChipIcon({ item }) {
  if (item?.iconType === "image" && item?.imageDataUrl) {
    return <img src={item.imageDataUrl} alt="" className="w-4 h-4 rounded object-cover" />;
  }
  const Icon = (item?.iconType === "lucide" && item?.iconName && Lucide[item.iconName]) || TagIcon;
  return <Icon size={12} className="text-primary-earth shrink-0" />;
}

/**
 * v1.3.1 — Compact icon picker toolbox that sits at the top of the
 * Tag Manager main pane. TWO side-by-side boxes: Basic Icons + Custom
 * Images library. Each icon supports BOTH interaction modes:
 *   • Drag onto any chip → swaps that chip's icon (existing pattern,
 *     `application/x-pps-iconswap` payload).
 *   • Single-click an icon here → it becomes "armed" (cursor gets a
 *     stuck preview). Next click on any chip applies it. Clicking the
 *     same icon again, or pressing Esc, disarms it.
 */
function IconPickerBar({ customImages = [], onCustomImagesChange, activeCatId, activeCatName, armedIcon, onArmIcon }) {
  const [libraryScope, setLibraryScope] = useState("global"); // "global" | "category"
  const [starterOpen, setStarterOpen] = useState(false);
  const [starterManifest, setStarterManifest] = useState(null);
  const [starterLoading, setStarterLoading] = useState(false);
  const libraryFileRef = useRef(null);
  const libraryImportPackRef = useRef(null);

  const libraryScopeId = libraryScope === "global" ? null : activeCatId;
  const libraryVisible = customImages.filter((img) => (img.catId ?? null) === libraryScopeId);
  const globalCount = customImages.filter((img) => (img.catId ?? null) === null).length;
  const catCount = customImages.filter((img) => img.catId === activeCatId).length;

  const isArmed = (kind, key) => {
    if (!armedIcon) return false;
    if (kind === "lucide") return armedIcon.iconType === "lucide" && armedIcon.iconName === key;
    if (kind === "image") return armedIcon.iconType === "image" && armedIcon.iconData === key;
    return false;
  };

  const importIntoLibrary = async (fileList) => {
    if (!fileList || fileList.length === 0 || !onCustomImagesChange) return;
    const scope = libraryScope === "global" ? null : activeCatId;
    if (libraryScope === "category" && !activeCatId) {
      toast.error("Pick a category first"); return;
    }
    const additions = [];
    let failed = 0;
    for (const f of Array.from(fileList)) {
      if (!/^image\//i.test(f.type)) { failed++; continue; }
      try {
        const dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => {
            const im = new Image();
            im.onload = () => {
              const MAX = 128;
              const s = Math.min(1, MAX / Math.max(im.naturalWidth, im.naturalHeight));
              const w = Math.max(1, Math.round(im.naturalWidth * s));
              const h = Math.max(1, Math.round(im.naturalHeight * s));
              const c = document.createElement("canvas");
              c.width = w; c.height = h;
              c.getContext("2d").drawImage(im, 0, 0, w, h);
              res(c.toDataURL("image/png"));
            };
            im.onerror = () => rej(new Error("decode"));
            im.src = r.result;
          };
          r.onerror = () => rej(new Error("read"));
          r.readAsDataURL(f);
        });
        additions.push({
          id: uid("cim"),
          name: (f.name.replace(/\.[^.]+$/, "").slice(0, 40) || "Untitled"),
          catId: scope,
          dataUrl,
        });
      } catch { failed++; }
    }
    if (additions.length > 0) {
      onCustomImagesChange((prev) => [...(prev || []), ...additions]);
      toast.success(`Imported ${additions.length} image${additions.length === 1 ? "" : "s"}`, {
        description: scope ? `Scope: ${activeCatName}` : "Scope: Global — usable across every category",
      });
    }
    if (failed > 0 && additions.length === 0) {
      toast.error("Import failed", { description: `${failed} file${failed === 1 ? "" : "s"} were not valid images.` });
    }
  };

  const removeLibraryImage = (id, name) => {
    if (!onCustomImagesChange) return;
    onCustomImagesChange((prev) => (prev || []).filter((img) => img.id !== id));
    toast(`Removed "${name}" from library`);
  };

  // v1.3.1 — Starter icon packs bundled with the app in
  //   frontend/public/starter-icon-packs/
  // Each is a normal .pps-iconpack.json — same format Kurt exports for
  // his customers. index.json lists them + provides preview icons.
  const openStarterBrowser = async () => {
    setStarterOpen(true);
    if (starterManifest) return;
    setStarterLoading(true);
    try {
      const res = await fetch("./starter-icon-packs/index.json", { cache: "no-cache" });
      const data = await res.json();
      setStarterManifest(data);
    } catch (e) {
      toast.error("Couldn't load starter packs", { description: e.message });
    } finally {
      setStarterLoading(false);
    }
  };
  const installStarterPack = async (entry) => {
    if (!onCustomImagesChange) return;
    try {
      const res = await fetch(`./starter-icon-packs/${entry.filename}`, { cache: "no-cache" });
      const payload = await res.json();
      if (payload.kind !== "pps-iconpack" || !Array.isArray(payload.images)) {
        throw new Error("Bundled pack has invalid shape.");
      }
      // Starter packs always install to Global scope so they're usable
      // across every category (Kurt's ask).
      const existingDataUrls = new Set(
        customImages.filter((img) => (img.catId ?? null) === null).map((img) => img.dataUrl)
      );
      const additions = [];
      let skipped = 0;
      for (const im of payload.images) {
        if (!im?.dataUrl) { skipped++; continue; }
        if (existingDataUrls.has(im.dataUrl)) { skipped++; continue; }
        additions.push({
          id: uid("cim"),
          name: String(im.name || "Untitled").slice(0, 40),
          catId: null,
          dataUrl: im.dataUrl,
        });
        existingDataUrls.add(im.dataUrl);
      }
      if (additions.length === 0) {
        toast(`${entry.displayName} already installed`, { description: `${skipped} icon${skipped === 1 ? "" : "s"} already in your Global library.` });
        return;
      }
      onCustomImagesChange((prev) => [...(prev || []), ...additions]);
      toast.success(
        `Installed ${entry.displayName} · ${additions.length} icon${additions.length === 1 ? "" : "s"}${skipped ? ` (${skipped} duplicate${skipped === 1 ? "" : "s"} skipped)` : ""}`,
        { description: "Scope: Global — usable across every category" }
      );
    } catch (e) {
      toast.error(`Install failed: ${entry.displayName}`, { description: e.message });
    }
  };

  // v1.3.1 — Export the currently-visible slice of the library as a
  // shareable .pps-iconpack.json file. Scope is baked into the payload so
  // an "import" of a Global export goes back into Global (and same for
  // Per-Category — where the target category is chosen at import time).
  const exportLibrary = () => {
    if (libraryVisible.length === 0) {
      toast.error("Nothing to export — this scope has no images yet.");
      return;
    }
    const payload = {
      kind: "pps-iconpack",
      version: 1,
      scope: libraryScope === "global" ? "global" : "category",
      sourceCategoryName: libraryScope === "category" ? activeCatName : null,
      exportedAt: new Date().toISOString(),
      images: libraryVisible.map((img) => ({ name: img.name, dataUrl: img.dataUrl })),
    };
    const filename = libraryScope === "global"
      ? `Global.pps-iconpack.json`
      : `${(activeCatName || "Category").replace(/[\\/:*?"<>|]/g, "_")}.pps-iconpack.json`;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    toast.success(`Exported ${payload.images.length} icon${payload.images.length === 1 ? "" : "s"}`, {
      description: filename,
    });
  };

  // v1.3.1 — Import a .pps-iconpack.json into the CURRENT scope
  // (Global or the active category). Images are merged into the library
  // and de-duplicated by dataUrl so re-imports don't multiply.
  const importLibrary = async (file) => {
    if (!file || !onCustomImagesChange) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.kind !== "pps-iconpack" || !Array.isArray(data.images)) {
        throw new Error("Not a valid Pro Photo Sorter icon pack file.");
      }
      const scope = libraryScope === "global" ? null : activeCatId;
      if (libraryScope === "category" && !activeCatId) {
        toast.error("Pick a category first"); return;
      }
      const existingDataUrls = new Set(
        customImages
          .filter((img) => (img.catId ?? null) === scope)
          .map((img) => img.dataUrl)
      );
      const additions = [];
      let skipped = 0;
      for (const im of data.images) {
        if (!im?.dataUrl || typeof im.dataUrl !== "string") { skipped++; continue; }
        if (existingDataUrls.has(im.dataUrl)) { skipped++; continue; }
        additions.push({
          id: uid("cim"),
          name: String(im.name || "Untitled").slice(0, 40),
          catId: scope,
          dataUrl: im.dataUrl,
        });
        existingDataUrls.add(im.dataUrl);
      }
      if (additions.length === 0) {
        toast(`No new icons to add`, { description: `${skipped} were already in this library.` });
        return;
      }
      onCustomImagesChange((prev) => [...(prev || []), ...additions]);
      toast.success(
        `Imported ${additions.length} icon${additions.length === 1 ? "" : "s"}${skipped ? ` (${skipped} duplicate${skipped === 1 ? "" : "s"} skipped)` : ""}`,
        { description: scope ? `Scope: ${activeCatName}` : "Scope: Global" }
      );
    } catch (e) {
      toast.error("Import failed", { description: e.message });
    }
  };

  const armLucide = (name) => {
    if (isArmed("lucide", name)) onArmIcon?.(null);
    else onArmIcon?.({ iconType: "lucide", iconName: name });
  };
  const armImage = (dataUrl) => {
    if (isArmed("image", dataUrl)) onArmIcon?.(null);
    else onArmIcon?.({ iconType: "image", iconData: dataUrl });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="icon-picker-bar">
      <div className="px-3 py-2 border-b border-app flex items-center gap-2 shrink-0">
        <ImageIcon size={13} className="text-primary-earth" />
        <span className="text-[10px] uppercase tracking-widest font-heading text-dim">Icon Holders</span>
      </div>
      <div className="px-2 py-1.5 border-b border-app/60 shrink-0">
        <p className="text-[10px] text-dim italic leading-snug">
          {armedIcon
            ? "🎯 Armed — click any chip to apply. Click this icon again or press Esc to disarm."
            : "Drag onto any chip to swap, or click to arm then click a chip."}
        </p>
      </div>

      {/* Two boxes stacked vertically — each scrolls independently. */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* ── Box 1: Basic Icons ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 border-b border-app" data-testid="icon-picker-builtin-box">
          <div className="px-2 py-1 flex items-center gap-2 bg-app/30 border-b border-app/40 shrink-0">
            <Palette size={11} className="text-primary-earth" />
            <span className="text-[10px] uppercase tracking-wider font-heading font-semibold">Basic Icons</span>
            <span className="text-[10px] text-dim font-mono ml-auto">{BUILTIN_ICONS.length}</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(26px,1fr))] gap-0.5 overflow-auto p-1.5 flex-1 min-h-0" data-testid="icon-picker-builtin">
            {BUILTIN_ICONS.map((n) => (
              <button
                key={n}
                draggable
                onClick={() => armLucide(n)}
                onDragStart={(e) => {
                  e.dataTransfer.setData(
                    "application/x-pps-iconswap",
                    JSON.stringify({ iconType: "lucide", iconName: n })
                  );
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className={`w-6 h-6 rounded flex items-center justify-center cursor-grab active:cursor-grabbing transition-colors ${
                  isArmed("lucide", n)
                    ? "bg-primary-earth text-[color:var(--text-inverse)] ring-2 ring-primary-earth"
                    : "hover:bg-primary-earth/20 text-app"
                }`}
                title={`${n} — click to arm, or drag onto any chip to swap`}
                data-testid={`icon-picker-builtin-${n}`}
              >
                <BuiltinIcon name={n} size={13} />
              </button>
            ))}
          </div>
        </div>

        {/* ── Box 2: Custom Images library ───────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0" data-testid="icon-picker-library-box">
          <div className="px-2 py-1 bg-app/30 border-b border-app/40 shrink-0 space-y-1">
            <div className="flex items-center gap-2">
              <ImageIcon size={11} className="text-primary-earth" />
              <span className="text-[10px] uppercase tracking-wider font-heading font-semibold">Custom Images</span>
              <span className="text-[10px] text-dim font-mono ml-auto">{libraryVisible.length}</span>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <button
                onClick={() => setLibraryScope("global")}
                className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 ${libraryScope === "global" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover"}`}
                data-testid="icon-picker-lib-global"
                title="Images available across every category"
              >
                Global <span className="font-mono opacity-70">{globalCount}</span>
              </button>
              <button
                onClick={() => setLibraryScope("category")}
                disabled={!activeCatId}
                className={`px-1.5 py-0.5 rounded text-[10px] flex items-center gap-1 disabled:opacity-40 ${libraryScope === "category" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover"}`}
                data-testid="icon-picker-lib-category"
                title={activeCatId ? `Images limited to ${activeCatName}` : "Pick a category first"}
              >
                {activeCatName ? activeCatName.slice(0, 8) : "—"} <span className="font-mono opacity-70">{catCount}</span>
              </button>
              <input
                ref={libraryFileRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp"
                className="hidden-file"
                onChange={(e) => { importIntoLibrary(e.target.files); e.target.value = ""; }}
                data-testid="icon-picker-lib-input"
              />
              <input
                ref={libraryImportPackRef}
                type="file"
                accept=".json,.pps-iconpack.json,application/json"
                className="hidden-file"
                onChange={(e) => { importLibrary(e.target.files?.[0]); e.target.value = ""; }}
                data-testid="icon-picker-lib-import-pack-input"
              />
              <button
                onClick={() => libraryFileRef.current?.click()}
                disabled={libraryScope === "category" && !activeCatId}
                className="ml-auto px-1.5 py-0.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-[10px] flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="icon-picker-lib-import"
                title="Import PNG/JPG/WEBP files into this library — multi-select supported"
              >
                <Upload size={10} /> Import PNGs
              </button>
              <button
                onClick={() => libraryImportPackRef.current?.click()}
                disabled={libraryScope === "category" && !activeCatId}
                className="px-1.5 py-0.5 rounded bg-app hover:bg-surface-hover border border-app text-[10px] flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="icon-picker-lib-import-pack"
                title="Import a .pps-iconpack.json bundle you saved earlier (or received from someone)"
              >
                <Package size={10} /> Import pack
              </button>
              <button
                onClick={exportLibrary}
                disabled={libraryVisible.length === 0}
                className="px-1.5 py-0.5 rounded bg-app hover:bg-surface-hover border border-app text-[10px] flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="icon-picker-lib-export-pack"
                title={`Save this ${libraryScope === "global" ? "Global" : activeCatName} library as a .pps-iconpack.json file — share it with anyone or use as a starter pack for customers`}
              >
                <Download size={10} /> Export pack
              </button>
              <button
                onClick={openStarterBrowser}
                className="px-1.5 py-0.5 rounded bg-primary-earth/15 hover:bg-primary-earth/30 border border-primary-earth/40 text-primary-earth text-[10px] flex items-center gap-1"
                data-testid="icon-picker-lib-starter-browse"
                title="Browse free starter icon packs bundled with Pro Photo Sorter — one-click install to your Global library"
              >
                <Sparkles size={10} /> Starter packs
              </button>
            </div>
          </div>
          {libraryVisible.length === 0 ? (
            <p className="text-[11px] text-dim italic text-center py-4 px-2 flex-1 flex items-center justify-center">
              {libraryScope === "global"
                ? "No global images yet — click Import to bulk-add PNGs."
                : `No images for "${activeCatName}" — click Import to add some.`}
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(36px,1fr))] gap-1 overflow-auto p-1.5 flex-1 min-h-0" data-testid="icon-picker-lib-grid">
              {libraryVisible.map((img) => (
                <div
                  key={img.id}
                  draggable
                  onClick={() => armImage(img.dataUrl)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "application/x-pps-iconswap",
                      JSON.stringify({ iconType: "image", iconData: img.dataUrl })
                    );
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className={`group relative w-12 h-12 rounded border cursor-grab active:cursor-grabbing overflow-hidden transition-colors ${
                    isArmed("image", img.dataUrl)
                      ? "border-primary-earth ring-2 ring-primary-earth bg-primary-earth/10"
                      : "border-app bg-surface hover:border-primary-earth"
                  }`}
                  title={`${img.name} — click to arm, or drag onto any chip to swap`}
                  data-testid={`icon-picker-lib-item-${img.id}`}
                >
                  <img src={img.dataUrl} alt={img.name} draggable={false} className="w-full h-full object-contain p-0.5" />
                  <button
                    onClick={(e) => { e.stopPropagation(); removeLibraryImage(img.id, img.name); }}
                    className="absolute top-0 right-0 w-4 h-4 rounded-bl bg-app/90 border-l border-b border-app flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-danger-earth transition-opacity"
                    data-testid={`icon-picker-lib-remove-${img.id}`}
                    title="Remove from library"
                  >
                    <X size={8} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* v1.3.1 — Starter icon-pack browser modal */}
      {starterOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => setStarterOpen(false)}
            data-testid="starter-pack-backdrop"
          />
          <div
            className="fixed inset-x-8 top-16 bottom-16 z-50 pane rounded-xl shadow-2xl flex flex-col overflow-hidden"
            data-testid="starter-pack-modal"
          >
            <div className="px-5 py-3 border-b border-app flex items-center gap-2 shrink-0">
              <Sparkles size={16} className="text-primary-earth" />
              <h3 className="font-heading text-lg">Starter Icon Packs</h3>
              <span className="text-xs text-dim">
                {starterManifest ? `${starterManifest.packs.length} bundled packs · install to Global` : ""}
              </span>
              <button
                onClick={() => setStarterOpen(false)}
                className="ml-auto w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover"
                data-testid="starter-pack-close"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              {starterLoading ? (
                <p className="text-center text-dim py-10">Loading…</p>
              ) : !starterManifest ? (
                <p className="text-center text-dim py-10">
                  Couldn't load bundled starter packs. Check that <code className="font-mono">starter-icon-packs/index.json</code> shipped with your build.
                </p>
              ) : (
                <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                  {starterManifest.packs.map((p) => (
                    <div
                      key={p.slug}
                      className="pane rounded-lg border border-app hover:border-primary-earth p-3 flex flex-col gap-2 transition-colors"
                      data-testid={`starter-pack-card-${p.slug}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-semibold">{p.displayName}</span>
                        <span className="text-[10px] text-dim font-mono ml-auto">{p.iconCount}</span>
                      </div>
                      <p className="text-[11px] text-dim leading-snug">{p.description}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        {(p.preview || []).map((im, i) => (
                          <div key={i} className="w-9 h-9 rounded bg-surface border border-app flex items-center justify-center p-1" title={im.name}>
                            <img src={im.dataUrl} alt={im.name} className="w-full h-full object-contain" draggable={false} />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => installStarterPack(p)}
                        className="mt-1 px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-semibold flex items-center justify-center gap-1 hover:opacity-90"
                        data-testid={`starter-pack-install-${p.slug}`}
                      >
                        <Download size={11} /> Install to Global
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 border-t border-app text-[11px] text-dim shrink-0">
              Have your own icon pack? Use <strong>Import pack</strong> in the Custom Images box to load any <code className="font-mono">.pps-iconpack.json</code> file.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

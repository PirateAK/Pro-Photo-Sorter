import React, { useState, useRef, useEffect } from "react";
import { IconPreview } from "./CategoryManager";
import { ChevronDown, FolderTree, Tag, Plus, Pencil, Trash2, Settings2, ArrowLeftFromLine, ArrowRightFromLine } from "lucide-react";
import { uid } from "../lib/storage";
import { toast } from "sonner";

/**
 * A single icon palette row bound to one destination role: "folders" or "filename".
 * Right-click on a chip → context menu (Rename / Add before / Add after / Delete / Manage).
 * Right-click on empty space → context menu (Add tag / Manage categories).
 * Middle-click on a chip → quick delete with an undo toast.
 * Popovers are inline (no big modal), text-only for label. Custom-image icons stay
 * in the full Category Manager. New items get a default Lucide "Tag" icon.
 */
export default function IconPalette({
  role, // "folders" | "filename"
  categories,
  activeCatId,
  onSetCat,
  onApply, // fn(icon, "folders" | "tags")
  onCategoriesChange, // fn(nextCategories) — for quick edits
  onOpenManager,       // fn() — opens the full Category Manager modal
}) {
  const active = categories.find((c) => c.id === activeCatId) || categories[0];
  const roleLabel = role === "folders" ? "Folders" : "Filename";
  const RoleIcon = role === "folders" ? FolderTree : Tag;
  const applyRow = role === "folders" ? "folders" : "tags";

  // Context menu state — { x, y, targetItem?, mode: "chip" | "empty" }
  const [menu, setMenu] = useState(null);
  // Popover state — { x, y, mode: "edit"|"add", targetItem?, insertIndex?, initialLabel }
  const [popover, setPopover] = useState(null);
  // Drop-hover highlight when receiving a chip from the *other* palette bar
  const [barDropOver, setBarDropOver] = useState(false);
  const popRef = useRef(null);

  // Close menu/popover on outside click, Escape
  useEffect(() => {
    if (!menu && !popover) return;
    const onDoc = (e) => {
      if (popover && popRef.current && popRef.current.contains(e.target)) return;
      setMenu(null);
      if (popover) setPopover(null);
    };
    const onKey = (e) => {
      if (e.key === "Escape") { setMenu(null); setPopover(null); }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu, popover]);

  const openChipMenu = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    setPopover(null);
    setMenu({ x: e.clientX, y: e.clientY, targetItem: item, mode: "chip" });
  };

  const openEmptyMenu = (e) => {
    // Only fire when the click is on the bar background, not on a chip
    if (e.target.closest("[data-chip='1']")) return;
    e.preventDefault();
    setPopover(null);
    setMenu({ x: e.clientX, y: e.clientY, targetItem: null, mode: "empty" });
  };

  const startRename = (item) => {
    if (!menu) return;
    setPopover({ x: menu.x, y: menu.y, mode: "edit", targetItem: item, initialLabel: item.label });
    setMenu(null);
  };

  const startAdd = (insertIndex) => {
    if (!menu) return;
    setPopover({ x: menu.x, y: menu.y, mode: "add", insertIndex, initialLabel: "" });
    setMenu(null);
  };

  const deleteItem = (item) => {
    if (!active || !onCategoriesChange) return;
    const next = categories.map((c) =>
      c.id === active.id ? { ...c, items: c.items.filter((i) => i.id !== item.id) } : c
    );
    onCategoriesChange(next);
    setMenu(null);
    // Undo toast — restore full item at original index
    const idx = active.items.findIndex((i) => i.id === item.id);
    toast.success(`Deleted "${item.label}"`, {
      description: `From ${active.name}`,
      action: {
        label: "Undo",
        onClick: () => {
          const restored = categories.map((c) => {
            if (c.id !== active.id) return c;
            const arr = [...c.items];
            arr.splice(Math.max(0, idx), 0, item);
            return { ...c, items: arr };
          });
          onCategoriesChange(restored);
        },
      },
    });
  };

  const savePopover = (label) => {
    const trimmed = (label || "").trim();
    if (!trimmed) { toast.error("Label can't be empty"); return; }
    if (!active || !onCategoriesChange) return;

    if (popover.mode === "edit") {
      const next = categories.map((c) =>
        c.id === active.id
          ? { ...c, items: c.items.map((i) => i.id === popover.targetItem.id ? { ...i, label: trimmed } : i) }
          : c
      );
      onCategoriesChange(next);
    } else if (popover.mode === "add") {
      const newItem = { id: uid("it"), label: trimmed, iconType: "builtin", iconName: "Tag" };
      const next = categories.map((c) => {
        if (c.id !== active.id) return c;
        const arr = [...c.items];
        const at = popover.insertIndex ?? arr.length;
        arr.splice(at, 0, newItem);
        return { ...c, items: arr };
      });
      onCategoriesChange(next);
    }
    setPopover(null);
  };

  return (
    <div
      className={`flex items-center gap-3 min-w-0 rounded transition-colors ${barDropOver ? "bg-primary-earth/15 ring-1 ring-primary-earth/50" : ""}`}
      data-testid={`palette-row-${role}`}
      onContextMenu={openEmptyMenu}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-pps-icon")) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
          setBarDropOver(true);
        }
      }}
      onDragLeave={(e) => {
        // Only clear when leaving the bar entirely, not when crossing children
        if (!e.currentTarget.contains(e.relatedTarget)) setBarDropOver(false);
      }}
      onDrop={(e) => {
        setBarDropOver(false);
        const raw = e.dataTransfer.getData("application/x-pps-icon");
        if (!raw) return;
        let parsed;
        try { parsed = JSON.parse(raw); } catch { return; }
        const item = parsed?.item;
        const sourceCatId = parsed?.sourceCatId;
        if (!item || !sourceCatId || !active || !onCategoriesChange) return;
        // Same category → do nothing (no reorg needed)
        if (sourceCatId === active.id) return;
        e.preventDefault();
        e.stopPropagation();

        const sourceCat = categories.find((c) => c.id === sourceCatId);
        const sourceIdx = sourceCat?.items.findIndex((i) => i.id === item.id) ?? -1;
        // Move: remove from source cat, append to target cat
        const next = categories.map((c) => {
          if (c.id === sourceCatId) return { ...c, items: c.items.filter((i) => i.id !== item.id) };
          if (c.id === active.id) {
            // Avoid duplicate if by chance it already exists
            if (c.items.some((i) => i.id === item.id)) return c;
            return { ...c, items: [...c.items, item] };
          }
          return c;
        });
        onCategoriesChange(next);

        toast.success(`Moved "${item.label}"`, {
          description: `${sourceCat?.name || "?"} → ${active.name}`,
          action: {
            label: "Undo",
            onClick: () => {
              const undo = categories.map((c) => {
                if (c.id === sourceCatId) {
                  const arr = [...c.items.filter((i) => i.id !== item.id)];
                  arr.splice(Math.max(0, sourceIdx), 0, item);
                  return { ...c, items: arr };
                }
                if (c.id === active.id) return { ...c, items: c.items.filter((i) => i.id !== item.id) };
                return c;
              });
              onCategoriesChange(undo);
            },
          },
        });
      }}
    >
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-heading text-dim min-w-[68px]">
          <RoleIcon size={12} className="text-primary-earth" /> {roleLabel}
        </div>
        <div className="relative">
          <select
            value={active?.id || ""}
            onChange={(e) => onSetCat(e.target.value)}
            className="appearance-none bg-app border border-app rounded pl-2 pr-6 py-1 text-xs font-medium focus-ring cursor-pointer"
            data-testid={`palette-${role}-category-select`}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-app">
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-dim" />
        </div>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1">
        {(!active || active.items.length === 0) && (
          <span className="text-xs text-dim italic">
            No tags in this pack — right-click to add one, or open Tag Manager.
          </span>
        )}
        {active?.items.map((it) => (
          <button
            key={it.id}
            data-chip="1"
            draggable
            onDragStart={(e) => {
              // Include the source bar's role AND the source category id so:
              //   - overlay drops route by role (source bar wins over drop location)
              //   - palette-bar drops can identify cross-category moves
              e.dataTransfer.setData(
                "application/x-pps-icon",
                JSON.stringify({ item: it, role: applyRow, sourceCatId: active?.id })
              );
              e.dataTransfer.effectAllowed = "copyMove";
            }}
            onClick={() => onApply(it, applyRow)}
            onContextMenu={(e) => openChipMenu(e, it)}
            onAuxClick={(e) => {
              // Middle-click = quick delete with undo
              if (e.button === 1) { e.preventDefault(); deleteItem(it); }
            }}
            className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app hover:border-primary-earth/60 text-xs transition-colors group cursor-grab active:cursor-grabbing"
            title={`Drag to a row, click to add. Right-click to edit "${it.label}".`}
            data-testid={`palette-${role}-item-${it.id}`}
          >
            <span className="text-primary-earth">
              <IconPreview item={it} size={14} />
            </span>
            <span className="font-mono text-app group-hover:text-primary-earth">{it.label}</span>
          </button>
        ))}
      </div>

      {/* Context menu */}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          mode={menu.mode}
          item={menu.targetItem}
          categoryName={active?.name}
          role={role}
          onRename={() => startRename(menu.targetItem)}
          onAddBefore={() => {
            const idx = active.items.findIndex((i) => i.id === menu.targetItem.id);
            startAdd(Math.max(0, idx));
          }}
          onAddAfter={() => {
            const idx = active.items.findIndex((i) => i.id === menu.targetItem.id);
            startAdd(idx + 1);
          }}
          onAddEnd={() => startAdd(active?.items.length ?? 0)}
          onDelete={() => deleteItem(menu.targetItem)}
          onManage={() => { onOpenManager?.(); setMenu(null); }}
        />
      )}

      {/* Inline label popover */}
      {popover && (
        <LabelPopover
          ref={popRef}
          x={popover.x}
          y={popover.y}
          mode={popover.mode}
          initial={popover.initialLabel}
          onSave={savePopover}
          onCancel={() => setPopover(null)}
          role={role}
        />
      )}
    </div>
  );
}

function ContextMenu({ x, y, mode, item, categoryName, role, onRename, onAddBefore, onAddAfter, onAddEnd, onDelete, onManage }) {
  // Clamp to viewport
  const style = {
    position: "fixed",
    top: Math.min(y, window.innerHeight - 260),
    left: Math.min(x, window.innerWidth - 220),
    zIndex: 100,
  };
  const Row = ({ icon: Icon, label, onClick, danger }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-surface-hover ${danger ? "text-[color:var(--danger,#c0392b)]" : "text-app"}`}
    >
      <Icon size={12} /> {label}
    </button>
  );
  return (
    <div
      style={style}
      className="pane rounded-md shadow-2xl border border-app min-w-[200px] py-1"
      data-testid={`palette-${role}-ctxmenu`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {mode === "chip" && item && (
        <>
          <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-dim font-heading truncate">
            {item.label}
          </div>
          <Row icon={Pencil} label="Rename…" onClick={onRename} />
          <Row icon={ArrowLeftFromLine} label="Add tag before" onClick={onAddBefore} />
          <Row icon={ArrowRightFromLine} label="Add tag after" onClick={onAddAfter} />
          <div className="h-px bg-app/60 my-1" />
          <Row icon={Trash2} label="Delete" onClick={onDelete} danger />
          <div className="h-px bg-app/60 my-1" />
          <Row icon={Settings2} label="Manage tag pack…" onClick={onManage} />
        </>
      )}
      {mode === "empty" && (
        <>
          <div className="px-3 py-1 text-[10px] uppercase tracking-widest text-dim font-heading truncate">
            {categoryName || "Tag pack"}
          </div>
          <Row icon={Plus} label={`Add tag to "${categoryName}"`} onClick={onAddEnd} />
          <div className="h-px bg-app/60 my-1" />
          <Row icon={Settings2} label="Manage tag packs…" onClick={onManage} />
        </>
      )}
    </div>
  );
}

const LabelPopover = React.forwardRef(function LabelPopover({ x, y, mode, initial, onSave, onCancel, role }, ref) {
  const [val, setVal] = useState(initial || "");
  const inputRef = useRef(null);
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.select(), 20);
    return () => clearTimeout(t);
  }, []);
  const style = {
    position: "fixed",
    top: Math.min(y, window.innerHeight - 120),
    left: Math.min(x, window.innerWidth - 280),
    zIndex: 100,
  };
  return (
    <div
      ref={ref}
      style={style}
      className="pane rounded-md shadow-2xl border border-app w-[260px] p-3"
      data-testid={`palette-${role}-popover`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1.5">
        {mode === "edit" ? "Rename tag" : "New tag label"}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onSave(val); }
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
        placeholder={mode === "edit" ? "" : "e.g. ceremony"}
        spellCheck={true}
        autoCorrect="on"
        autoCapitalize="off"
        className="w-full bg-app border border-app rounded px-2 py-1.5 text-sm focus-ring"
        data-testid={`palette-${role}-popover-input`}
      />
      <div className="flex items-center justify-end gap-1 mt-2">
        <button
          onClick={onCancel}
          className="px-2 py-1 rounded bg-app border border-app hover:bg-surface-hover text-xs"
          data-testid={`palette-${role}-popover-cancel`}
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(val)}
          className="px-2 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-semibold"
          data-testid={`palette-${role}-popover-save`}
        >
          {mode === "edit" ? "Save" : "Add"}
        </button>
      </div>
      <div className="text-[10px] text-dim mt-2">
        New tags get a default icon. To choose a custom icon or upload an image,
        open the Tag Manager.
      </div>
    </div>
  );
});

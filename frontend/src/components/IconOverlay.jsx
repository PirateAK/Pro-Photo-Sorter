import React, { useState, useRef, useEffect } from "react";
import { motion, Reorder } from "framer-motion";
import { GripVertical, X, FolderTree, Tag, Pin } from "lucide-react";
import { IconPreview } from "./CategoryManager";

/**
 * v1.2.5 — Small read-only "context" chip used to show the active pack +
 * subfolder inside the FOLDERS overlay row. Looks similar to a normal
 * applied chip but with a pin icon, no remove button, no drag reorder,
 * and a dashed border so the user can tell it's not per-image state.
 */
function ContextChip({ ctx, separator }) {
  return (
    <span
      className="flex items-center gap-1 px-2 py-1 rounded bg-app/40 border border-dashed border-primary-earth/50 text-primary-earth/90 select-none"
      data-testid={`overlay-context-${ctx.source}`}
      title={`From ${ctx.source === "pack" ? "the active pack" : "the active sub-folder"} — set at the top toolbar, not per image`}
    >
      <Pin size={10} className="opacity-70 shrink-0" />
      <span className="text-primary-earth">
        <IconPreview item={ctx} size={14} />
      </span>
      <span className="text-xs font-mono">{ctx.label}</span>
      {separator && <span className="text-dim text-xs ml-0.5">{separator}</span>}
    </span>
  );
}

/**
 * Overlay showing TWO rows of icons applied to the current image:
 *   1. Folders row → becomes destination sub-folder path (nested)
 *   2. Tags row    → becomes the filename (joined by _)
 *
 * The whole overlay can be dragged around the image.
 * Each row supports drop from the palette, drag-to-reorder, and per-icon remove.
 */
function IconRow({ label, Icon, testid, icons, onReorder, onRemove, onDrop, onDropFolders, onDropTags, separator, leadingContext, trailingContext }) {
  const [isOver, setIsOver] = useState(false);
  const hasContext = (leadingContext?.length || 0) > 0 || (trailingContext?.length || 0) > 0;
  const totallyEmpty = icons.length === 0 && !hasContext;
  return (
    <div
      className={`flex items-center gap-2 rounded transition-colors ${isOver ? "bg-primary-earth/25" : ""}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("application/x-pps-icon")) {
          e.preventDefault();
          e.stopPropagation();
          setIsOver(true);
        }
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        setIsOver(false);
        const raw = e.dataTransfer.getData("application/x-pps-icon");
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          const item = parsed?.item || parsed;
          const role = parsed?.role;
          e.preventDefault();
          e.stopPropagation();
          if (role === "folders" && onDropFolders) onDropFolders(item);
          else if (role === "tags" && onDropTags) onDropTags(item);
          else onDrop(item);
        } catch {}
      }}
      data-testid={testid}
    >
      <div className="flex items-center gap-1 shrink-0 text-[10px] uppercase tracking-widest font-heading text-dim min-w-[68px]">
        <Icon size={11} /> {label}
      </div>
      <div className="flex items-center gap-1 flex-wrap min-w-0">
        {(leadingContext || []).map((ctx, i) => (
          <ContextChip
            key={ctx.id}
            ctx={ctx}
            separator={
              // Show separator when there's another leading context after this,
              // or when there are applied icons after all leading context.
              (i < (leadingContext.length - 1) || icons.length > 0 || (trailingContext?.length || 0) > 0)
                ? separator
                : null
            }
          />
        ))}
        {totallyEmpty ? (
          <span className={`text-[10px] italic ${isOver ? "text-primary-earth" : "text-dim/60"}`}>
            {isOver ? "drop here" : "drag icons here…"}
          </span>
        ) : icons.length > 0 ? (
          <Reorder.Group axis="x" values={icons} onReorder={onReorder} className="flex items-center gap-1 flex-wrap">
            {icons.map((ic, idx) => (
              <React.Fragment key={ic.uid}>
                <Reorder.Item
                  value={ic}
                  data-icon-item
                  className="relative group flex items-center gap-1 px-2 py-1 rounded bg-app/60 hover:bg-app cursor-grab active:cursor-grabbing"
                  data-testid={`overlay-icon-${ic.uid}`}
                  whileDrag={{ scale: 1.08 }}
                >
                  <div className="text-primary-earth">
                    <IconPreview item={ic} size={16} />
                  </div>
                  <span className="text-xs font-mono text-app">{ic.label}</span>
                  <button
                    data-remove
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(ic.uid);
                    }}
                    className="ml-0.5 w-4 h-4 rounded flex items-center justify-center text-dim hover:text-danger-earth opacity-0 group-hover:opacity-100"
                    data-testid={`remove-overlay-icon-${ic.uid}`}
                  >
                    <X size={11} />
                  </button>
                </Reorder.Item>
                {separator && (idx < icons.length - 1 || (trailingContext?.length || 0) > 0) && (
                  <span className="text-dim text-xs select-none">{separator}</span>
                )}
              </React.Fragment>
            ))}
          </Reorder.Group>
        ) : null}
        {(trailingContext || []).map((ctx, i) => (
          <ContextChip
            key={ctx.id}
            ctx={ctx}
            separator={i < (trailingContext.length - 1) ? separator : null}
          />
        ))}
      </div>
    </div>
  );
}

export default function IconOverlay({
  containerRef,
  folders,
  tags,
  contextFolders,   // v1.2.5 — read-only chips (pack, subfolder) shown in FOLDERS row
  onReorderFolders,
  onReorderTags,
  onRemoveFolder,
  onRemoveTag,
  onDropFolder,
  onDropTag,
}) {
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const barRef = useRef(null);
  const dragging = useRef(null);

  useEffect(() => {
    setPos({ x: 24, y: 24 });
  }, [containerRef]);

  const onPointerDown = (e) => {
    if (e.target.closest("[data-icon-item]") || e.target.closest("[data-remove]")) return;
    if (!barRef.current || !containerRef.current) return;
    const barRect = barRef.current.getBoundingClientRect();
    dragging.current = {
      dx: e.clientX - barRect.left,
      dy: e.clientY - barRect.top,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!dragging.current || !containerRef.current || !barRef.current) return;
    const cRect = containerRef.current.getBoundingClientRect();
    const barRect = barRef.current.getBoundingClientRect();
    let nx = e.clientX - cRect.left - dragging.current.dx;
    let ny = e.clientY - cRect.top - dragging.current.dy;
    nx = Math.max(0, Math.min(nx, cRect.width - barRect.width));
    ny = Math.max(0, Math.min(ny, cRect.height - barRect.height));
    setPos({ x: nx, y: ny });
  };

  const onPointerUp = (e) => {
    dragging.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // v1.2.5 — Split context chips into leading (before applied chips) and
  // trailing (after applied chips) so path order stays natural:
  // pack → folder-chips → subfolder
  const leadingCtx = (contextFolders || []).filter((c) => c.position === "leading");
  const trailingCtx = (contextFolders || []).filter((c) => c.position === "trailing");

  // Hide overlay entirely only when NOTHING would show (no icons AND no context).
  const totalFolderContent = (folders?.length || 0) + leadingCtx.length + trailingCtx.length;
  if (totalFolderContent === 0 && (tags?.length || 0) === 0) return null;

  return (
    <motion.div
      ref={barRef}
      className="icon-overlay absolute rounded-lg px-2 py-1.5 flex flex-col gap-1 no-select cursor-grab active:cursor-grabbing z-30 min-w-[280px]"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      data-testid="icon-overlay-bar"
    >
      <div className="flex items-center gap-1">
        <GripVertical size={14} className="text-dim shrink-0" />
        <IconRow
          label="Folders"
          Icon={FolderTree}
          testid="overlay-row-folders"
          icons={folders || []}
          onReorder={onReorderFolders}
          onRemove={onRemoveFolder}
          onDrop={onDropFolder}
          onDropFolders={onDropFolder}
          onDropTags={onDropTag}
          separator="/"
          leadingContext={leadingCtx}
          trailingContext={trailingCtx}
        />
      </div>
      <div className="flex items-center gap-1">
        <div className="w-[14px] shrink-0" />
        <IconRow
          label="Filename"
          Icon={Tag}
          testid="overlay-row-tags"
          icons={tags || []}
          onReorder={onReorderTags}
          onRemove={onRemoveTag}
          onDrop={onDropTag}
          onDropFolders={onDropFolder}
          onDropTags={onDropTag}
          separator="_"
        />
      </div>
    </motion.div>
  );
}

import React, { useState, useRef, useEffect } from "react";
import { motion, Reorder } from "framer-motion";
import { GripVertical, X, FolderTree, Tag } from "lucide-react";
import { IconPreview } from "./CategoryManager";

/**
 * Overlay showing TWO rows of icons applied to the current image:
 *   1. Folders row → becomes destination sub-folder path (nested)
 *   2. Tags row    → becomes the filename (joined by _)
 *
 * The whole overlay can be dragged around the image.
 * Each row supports drop from the palette, drag-to-reorder, and per-icon remove.
 */
function IconRow({ label, Icon, testid, icons, onReorder, onRemove, onDrop, separator }) {
  const [isOver, setIsOver] = useState(false);
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
          const item = JSON.parse(raw);
          e.preventDefault();
          e.stopPropagation();
          onDrop(item);
        } catch {}
      }}
      data-testid={testid}
    >
      <div className="flex items-center gap-1 shrink-0 text-[10px] uppercase tracking-widest font-heading text-dim min-w-[68px]">
        <Icon size={11} /> {label}
      </div>
      {icons.length === 0 ? (
        <span className={`text-[10px] italic ${isOver ? "text-primary-earth" : "text-dim/60"}`}>
          {isOver ? "drop here" : "drag icons here…"}
        </span>
      ) : (
        <Reorder.Group axis="x" values={icons} onReorder={onReorder} className="flex items-center gap-1">
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
              {separator && idx < icons.length - 1 && (
                <span className="text-dim text-xs select-none">{separator}</span>
              )}
            </React.Fragment>
          ))}
        </Reorder.Group>
      )}
    </div>
  );
}

export default function IconOverlay({
  containerRef,
  folders,
  tags,
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

  // Hide overlay entirely only when neither row has icons
  if ((folders?.length || 0) === 0 && (tags?.length || 0) === 0) return null;

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
          separator="/"
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
          separator="_"
        />
      </div>
    </motion.div>
  );
}

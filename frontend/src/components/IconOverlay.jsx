import React, { useState, useRef, useEffect } from "react";
import { motion, Reorder } from "framer-motion";
import { GripVertical, X } from "lucide-react";
import { IconPreview } from "./CategoryManager";

/**
 * Draggable, repositionable overlay bar containing icons applied to the current image.
 * - Whole bar can be dragged to any position over the image
 * - Icons within can be reordered by drag (Reorder)
 * - Each icon can be removed
 */
export default function IconOverlay({ containerRef, icons, onReorder, onRemove }) {
  const [pos, setPos] = useState({ x: 24, y: 24 });
  const barRef = useRef(null);
  const dragging = useRef(null);

  // Reset position when container changes size significantly (new image)
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

  if (icons.length === 0) return null;

  return (
    <motion.div
      ref={barRef}
      className="icon-overlay absolute rounded-lg px-2 py-1.5 flex items-center gap-1 no-select cursor-grab active:cursor-grabbing z-30"
      style={{ left: pos.x, top: pos.y }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      data-testid="icon-overlay-bar"
    >
      <GripVertical size={14} className="text-dim shrink-0" />
      <Reorder.Group
        axis="x"
        values={icons}
        onReorder={onReorder}
        className="flex items-center gap-1"
      >
        {icons.map((ic) => (
          <Reorder.Item
            key={ic.uid}
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
        ))}
      </Reorder.Group>
    </motion.div>
  );
}

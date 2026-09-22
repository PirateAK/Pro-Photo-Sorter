import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from "react";

/**
 * ZoomablePreview (v1.1.10)
 * Wraps the main-window <img> with mouse-wheel zoom, drag-to-pan, and
 * imperative zoomIn/zoomOut/fit methods for keyboard shortcuts.
 *
 * Behavior:
 *   • Mouse wheel scrolls IN toward the cursor position, OUT toward the
 *     opposite direction. Zoom clamped 0.25× .. 8×.
 *   • Left-mouse drag pans when scale > 1 (also space+drag as accessibility).
 *   • Cursor becomes grab/grabbing when zoomed.
 *   • A small badge in the top-right fades in on any zoom change and fades
 *     out ~900 ms after the last change.
 *   • Auto-reset to fit whenever `resetKey` changes (e.g. filmstrip advance).
 *
 * Props:
 *   src, alt         — image source
 *   onContextMenu    — right-click handler (forwarded to img)
 *   resetKey         — any value; when it changes we reset to fit
 *   children         — overlay markup rendered ABOVE the image
 *
 * Ref API:
 *   ref.current.zoomIn()   — bump scale up one step
 *   ref.current.zoomOut()  — bump scale down one step
 *   ref.current.fit()      — reset to scale 1, no pan
 *   ref.current.getScale() — read current scale
 */

const MIN_SCALE = 0.25;
const MAX_SCALE = 8;
const STEP = 1.15; // 15% per wheel notch / keyboard press

const ZoomablePreview = forwardRef(function ZoomablePreview(
  { src, alt, onContextMenu, resetKey, children, imgClassName = "" },
  ref
) {
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [badgeVisible, setBadgeVisible] = useState(false);
  const badgeTimer = useRef(null);

  const pingBadge = useCallback(() => {
    setBadgeVisible(true);
    if (badgeTimer.current) clearTimeout(badgeTimer.current);
    badgeTimer.current = setTimeout(() => setBadgeVisible(false), 900);
  }, []);

  // Reset on image change
  useEffect(() => {
    setScale(1); setTx(0); setTy(0);
  }, [resetKey]);

  // Wheel zoom — zoom toward cursor
  const onWheel = useCallback((e) => {
    if (!containerRef.current) return;
    e.preventDefault();
    const dir = e.deltaY < 0 ? +1 : -1;
    const factor = dir > 0 ? STEP : 1 / STEP;
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    if (nextScale === scale) return;
    // Compute cursor position relative to container center — the transform
    // origin is the container's center, so we adjust translate accordingly.
    const rect = containerRef.current.getBoundingClientRect();
    const cx = e.clientX - (rect.left + rect.width / 2);
    const cy = e.clientY - (rect.top + rect.height / 2);
    const k = nextScale / scale;
    // New pan = k * old pan + (1 - k) * cursor position (relative to center)
    setTx((prev) => k * prev + (1 - k) * cx);
    setTy((prev) => k * prev + (1 - k) * cy);
    setScale(nextScale);
    pingBadge();
  }, [scale, pingBadge]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // Drag to pan (any mouse button when zoomed, or middle-button always)
  const dragState = useRef(null);
  const onMouseDown = (e) => {
    // Ignore context menu / right-click
    if (e.button === 2) return;
    // Only pan if zoomed OR middle-click
    if (scale <= 1 && e.button !== 1) return;
    e.preventDefault();
    dragState.current = { x0: e.clientX, y0: e.clientY, tx0: tx, ty0: ty };
    const move = (ev) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.x0;
      const dy = ev.clientY - dragState.current.y0;
      setTx(dragState.current.tx0 + dx);
      setTy(dragState.current.ty0 + dy);
    };
    const up = () => {
      dragState.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  // Imperative API for keyboard shortcuts / buttons
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      setScale((s) => {
        const n = Math.min(MAX_SCALE, s * STEP);
        if (n !== s) pingBadge();
        return n;
      });
    },
    zoomOut: () => {
      setScale((s) => {
        const n = Math.max(MIN_SCALE, s / STEP);
        if (n !== s) {
          pingBadge();
          // If we're back to fit, also center
          if (n <= 1.001) { setTx(0); setTy(0); }
        }
        return n;
      });
    },
    fit: () => {
      setScale(1); setTx(0); setTy(0);
      pingBadge();
    },
    getScale: () => scale,
  }), [scale, pingBadge]);

  const zoomed = scale > 1.001;
  const grabCursor = zoomed ? (dragState.current ? "grabbing" : "grab") : "default";

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden select-none"
      onMouseDown={onMouseDown}
      style={{ cursor: grabCursor }}
      data-testid="zoomable-preview"
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        draggable={false}
        onContextMenu={onContextMenu}
        className={`max-h-full max-w-full object-contain rounded shadow-2xl pointer-events-auto ${imgClassName}`}
        style={{
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: "center center",
          transition: dragState.current ? "none" : "transform 90ms ease-out",
          willChange: "transform",
        }}
      />
      {/* Zoom badge — fades in on any change, out after 900ms */}
      <div
        className={`absolute top-3 right-3 z-30 pointer-events-none px-2 py-0.5 rounded-full bg-black/70 backdrop-blur border border-primary-earth/60 text-primary-earth text-[11px] font-mono transition-opacity duration-300 ${
          badgeVisible ? "opacity-100" : "opacity-0"
        }`}
        data-testid="zoom-badge"
      >
        {scale.toFixed(scale >= 10 ? 0 : 2)}×
      </div>
      {children}
    </div>
  );
});

export default ZoomablePreview;

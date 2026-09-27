import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Star } from "lucide-react";
import ZoomablePreview from "./ZoomablePreview";

/**
 * ComparisonView (v1.4.5)
 * ---------------------------------------------------------------------------
 * Renders N adjacent images side-by-side for direct comparison. Clicking a
 * non-active pane re-designates it as the active image but leaves the
 * visible set untouched — Kurt no longer sees the strip slide when he
 * wants to compare a fixed set of similar shots.
 *
 * v1.4.5 additions:
 *   • Sticky window: internal `start` state caches the leftmost visible
 *     index. It only recomputes when the parent externally jumps the
 *     selection outside the current window (e.g. clicking a filmstrip
 *     thumb far away, arrow-key navigation past the edge, or the image
 *     list itself changes because Kurt swapped sources).
 *   • Active pane is a full ZoomablePreview — mouse-wheel + keyboard
 *     +/- zoom now work in comparison mode, targeted on the active pane
 *     only. Inactive panes stay as lightweight <img> tags so the layout
 *     doesn't jitter when zooming.
 *   • Imperative handle forwarded so App.js can drive `+/-` shortcuts
 *     through the same `zoomRef` it uses in single-view.
 *   • Active pane border upgraded to a two-tone ring (outer earth + inner
 *     translucent) so the "which one is active" answer is obvious at any
 *     screen size, and the ACTIVE pill floats above that ring.
 */

const Pane = forwardRef(function Pane({ img, active, onClick, stars, zoomResetKey }, ref) {
  const [url, setUrl] = useState(null);
  const zoomRef = useRef(null);
  useEffect(() => {
    let alive = true;
    let objectUrl = null;
    if (!img) { setUrl(null); return; }
    img.handle.getFile().then((f) => {
      if (!alive) return;
      objectUrl = URL.createObjectURL(f);
      setUrl(objectUrl);
    }).catch(() => setUrl(null));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [img]);

  // Forward the zoom API from the inner ZoomablePreview when this pane
  // is active. Inactive panes hand back a no-op so the parent doesn't
  // have to null-check.
  useImperativeHandle(ref, () => ({
    zoomIn:  () => zoomRef.current?.zoomIn?.(),
    zoomOut: () => zoomRef.current?.zoomOut?.(),
    fit:     () => zoomRef.current?.fit?.(),
    getScale: () => zoomRef.current?.getScale?.() ?? 1,
  }), []);

  return (
    <div
      onClick={onClick}
      // v1.4.5g — Belt-and-suspenders: pointerDown also triggers activate.
      // On some Electron/Windows builds the inner ZoomablePreview swallowed
      // the outer onClick when the mouse landed on the image itself, which
      // left the ACTIVE ring stuck on pane 0. Firing on pointerDown too
      // makes clicking any pane feel instant AND keeps the accessibility
      // click-handler intact for keyboard users.
      onPointerDown={(e) => { if (e.button === 0 && !active) onClick?.(e); }}
      className={`relative flex-1 min-w-0 h-full flex items-center justify-center overflow-hidden cursor-pointer transition-all rounded ${
        active
          ? "ring-4 ring-primary-earth ring-offset-2 ring-offset-[color:var(--app-bg,#1a1a1a)] shadow-[0_0_24px_-4px_var(--primary-earth,#a3835a)]"
          : "ring-2 ring-transparent hover:ring-primary-earth/40 border border-transparent"
      }`}
      data-testid={`compare-pane-${img?.name || "empty"}`}
      data-active={active ? "true" : "false"}
    >
      {url ? (
        // v1.4.5 — ALL panes render ZoomablePreview (not just the active
        // one) so Kurt can zoom into any of the side-by-side images
        // independently with mouse wheel / +− controls. Clicking a
        // pane still marks it active so keyboard shortcuts drive that
        // pane, but the images no longer "slide left" the way a plain
        // <img> switch used to feel.
        <ZoomablePreview
          ref={zoomRef}
          src={url}
          alt={img?.name || ""}
          resetKey={zoomResetKey || img?.name}
          imgClassName=""
        />
      ) : (
        // v1.4.5 — Matching loading placeholder so compare panes tell
        // Kurt they're working instead of looking frozen.
        <div className="flex flex-col items-center justify-center gap-2 p-6 rounded border-2 border-dashed border-primary-earth/50 animate-pulse" data-testid="compare-pane-loading">
          <div className="w-8 h-8 border-2 border-primary-earth border-t-transparent rounded-full animate-spin" />
          <span className="text-[10px] uppercase tracking-widest text-primary-earth font-heading">
            Loading photo…
          </span>
        </div>
      )}
      {img && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-2.5 py-1 rounded-full backdrop-blur-md text-[10px] font-mono flex items-center gap-1.5 shadow-md border"
          style={{
            // v1.4.5g — Kurt reported the filename pill was dark/unreadable
            // in ×2 / ×3. Root cause: color-mix(surface 88%) resolved to a
            // dark olive against his light theme when compared to the ×1
            // pill (which uses a solid app-bg white). Switch to solid
            // --surface with a strong dark ring so it reads on any image
            // color, matching the treatment the ×1 pill gets.
            background: "var(--surface, #f8f4ec)",
            color: "var(--text, #1a1a1a)",
            borderColor: "var(--primary-earth, #a3835a)",
          }}
          data-testid="compare-pane-filename"
        >
          {stars > 0 && (
            <span className="flex items-center gap-0.5 text-primary-earth">
              {Array.from({ length: stars }).map((_, k) => (
                <Star key={k} size={9} fill="currentColor" />
              ))}
            </span>
          )}
          <span className="truncate max-w-[16rem]">{img.name}</span>
        </div>
      )}
      {active && (
        <div
          className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-primary-earth text-[color:var(--text-inverse)] text-[10px] font-mono font-bold pointer-events-none z-20 shadow-md border-2 border-[color:var(--surface,#f8f4ec)] uppercase tracking-widest"
          data-testid="compare-active-pill"
        >
          Active
        </div>
      )}
    </div>
  );
});

const ComparisonView = forwardRef(function ComparisonView(
  { images, selectedIdx, panes, onSelect, ratings, sourcePath },
  ref
) {
  // ── Sticky visible window ────────────────────────────────────────────
  // The window follows `selectedIdx` only when the selection would fall
  // OUTSIDE the current visible slice — otherwise clicking a pane just
  // re-tags active without triggering the slide-and-load animation.
  const [start, setStart] = useState(() =>
    Math.max(0, Math.min(selectedIdx, Math.max(0, images.length - panes)))
  );

  // Keep the window in a legal range whenever pane count changes or the
  // source images array is swapped.
  useEffect(() => {
    setStart((s) => Math.max(0, Math.min(s, Math.max(0, images.length - panes))));
  }, [images, panes]);

  // If parent jumps selection outside the current window (filmstrip
  // click / arrow navigation past the edge), slide the window so the
  // selection is visible. If it's already inside, leave the window put.
  useEffect(() => {
    if (selectedIdx < start) {
      setStart(Math.max(0, selectedIdx));
    } else if (selectedIdx >= start + panes) {
      setStart(Math.max(0, Math.min(selectedIdx - panes + 1, images.length - panes)));
    }
  }, [selectedIdx, panes, start, images.length]);

  const visible = images.slice(start, start + panes);

  // Track the active pane's ref so we can forward the zoom imperative
  // API to whoever holds the outer ref (App.js's zoomRef).
  const activePaneRef = useRef(null);
  useImperativeHandle(ref, () => ({
    zoomIn:  () => activePaneRef.current?.zoomIn?.(),
    zoomOut: () => activePaneRef.current?.zoomOut?.(),
    fit:     () => activePaneRef.current?.fit?.(),
    getScale: () => activePaneRef.current?.getScale?.() ?? 1,
  }), []);

  return (
    <div className="w-full h-full flex items-stretch gap-2 p-2" data-testid="comparison-view">
      {visible.map((img, i) => {
        const idx = start + i;
        const isActive = idx === selectedIdx;
        return (
          <Pane
            key={img.name}
            ref={isActive ? activePaneRef : null}
            img={img}
            active={isActive}
            onClick={() => onSelect(idx)}
            stars={ratings?.[`${sourcePath}/${img.name}`] || 0}
            zoomResetKey={`${sourcePath}/${img.name}`}
          />
        );
      })}
    </div>
  );
});

export default ComparisonView;

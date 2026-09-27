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
      className={`relative flex-1 min-w-0 h-full flex items-center justify-center overflow-hidden cursor-pointer transition-all rounded ${
        active
          ? "ring-4 ring-primary-earth ring-offset-1 ring-offset-transparent shadow-[0_0_0_1px_var(--surface)_inset]"
          : "ring-2 ring-transparent hover:ring-app border border-transparent"
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
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none px-2 py-0.5 rounded-full backdrop-blur border text-[10px] font-mono flex items-center gap-1.5 shadow-sm"
          style={{
            // v1.4.5 — was `bg-black/60` which read as dark-on-dark in
            // light mode. Now mirrors the zoom badge's approach: mostly
            // opaque surface + regular text so both themes stay legible.
            background: "color-mix(in srgb, var(--surface) 88%, transparent)",
            color: "var(--text)",
            borderColor: "color-mix(in srgb, var(--text) 20%, transparent)",
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
          className="absolute top-2 left-2 px-2 py-0.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-[10px] font-mono font-bold pointer-events-none z-20"
          data-testid="compare-active-pill"
        >
          ACTIVE
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

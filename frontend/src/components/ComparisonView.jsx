import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Star } from "lucide-react";
import ZoomablePreview from "./ZoomablePreview";

/**
 * ComparisonView (v1.4.5i)
 * ---------------------------------------------------------------------------
 * Renders N adjacent images side-by-side for direct comparison. The visible
 * window is FULLY controlled by the parent via the `windowStart` prop —
 * this component never slides the strip on its own.
 *
 * v1.4.5i change (Kurt's request):
 *   • Clicking a non-active pane ONLY moves the ACTIVE pill + blue ring
 *     to that pane. Images never slide left. The strip slides only when
 *     the parent explicitly changes `windowStart` (arrow navigation,
 *     Store/Delete auto-shift, or a filmstrip-to-active load).
 *
 * Earlier v1.4.5 additions still in place:
 *   • Active pane is a full ZoomablePreview — mouse-wheel + keyboard
 *     +/- zoom work in comparison mode, targeted on the active pane
 *     only. Inactive panes render ZoomablePreview too so Kurt can zoom
 *     into any pane independently.
 *   • Imperative handle forwarded so App.js can drive `+/-` shortcuts
 *     through the same `zoomRef` it uses in single-view.
 *   • Active pane border is a two-tone ring (outer earth + inner
 *     translucent) so the "which one is active" answer is obvious at
 *     any screen size, and the ACTIVE pill floats above that ring.
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
      // v1.4.5j — Kurt reported "lots of flashing lights" when the ACTIVE
      // ring hopped between panes. Root cause: `transition-all` was
      // animating ring width, ring offset, box-shadow glow AND border
      // simultaneously on every click — a full frame worth of property
      // transitions per pane, times two panes, per click = disco.
      // Fix: drop the transition entirely on the active swap. The ring
      // + glow now snap INSTANTLY to the newly-clicked pane. The hover
      // affordance still fades softly (transition-colors duration-150)
      // so the pane doesn't feel dead when the mouse enters it.
      className={`relative flex-1 min-w-0 h-full flex items-center justify-center overflow-hidden cursor-pointer rounded ${
        active
          ? "ring-4 ring-primary-earth ring-offset-2 ring-offset-[color:var(--app-bg,#1a1a1a)] shadow-[0_0_24px_-4px_var(--primary-earth,#a3835a)]"
          : "ring-2 ring-transparent border border-transparent hover:ring-primary-earth/40 transition-colors duration-150"
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
  { images, selectedIdx, panes, windowStart, onSelect, ratings, sourcePath },
  ref
) {
  // ── Fully controlled visible window ─────────────────────────────────
  // v1.4.5i — The parent (App.js) owns `compareWindowStart`. This
  // component NEVER slides on its own. Clicking a pane only re-tags
  // ACTIVE; arrow navigation, Store/Delete, and filmstrip-to-active
  // loads are the only things that can move the window, and they do
  // it by changing the `windowStart` prop from the parent.
  const start = Math.max(0, Math.min(windowStart ?? 0, Math.max(0, images.length - panes)));
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

// SecondaryStrip (v1.4.2)
// -----------------------------------------------------------------------------
// The right-hand filmstrip shown when Kurt has opened a second source root.
// Read-only: clicks trigger `onThumbClick(index)` which is expected to fire
// `swapPrimaryAndSecondary(index)` in App.js — the atomic swap keeps every
// downstream code path (Store, Delete, tag apply, EXIF fetch, keyboard
// shortcuts) working on primary state without any refactor.
//
// The strip mirrors the primary strip visually (same Thumbnail component,
// same star badges, same nav arrows) so users don't have to relearn anything.
import React, { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ArrowLeftRight, Star as StarIcon } from "lucide-react";
import Thumbnail from "./Thumbnail";

export default function SecondaryStrip({
  images,
  loading,
  rootName,
  currentPath,
  ratings,
  minStarFilter,
  thumbSize,
  onThumbClick,      // fn(idx) — expected to call swapPrimaryAndSecondary(idx)
  onSwap,            // fn() — quick swap without picking a specific thumb
}) {
  const stripRef = useRef(null);
  const [canScroll, setCanScroll] = useState({ left: false, right: false });

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const update = () => setCanScroll({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
    update();
    el.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [images]);

  const scroll = (dir) => {
    const el = stripRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: "smooth" });
  };

  const visible = (images || [])
    .map((img, i) => ({ img, i }))
    .filter(({ img }) => {
      const s = ratings[`${currentPath}/${img.name}`] || 0;
      return s >= (minStarFilter || 0);
    });

  return (
    <div className="relative flex-1 min-w-0 border-l border-app flex flex-col" data-testid="secondary-filmstrip-wrap">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-app/60 shrink-0 bg-primary-earth/5">
        <ArrowLeftRight size={11} className="text-primary-earth" />
        <span className="text-[10px] uppercase tracking-widest text-dim font-heading truncate">
          Source B ·
        </span>
        <span className="text-[11px] font-medium truncate flex-1" title={currentPath}>
          {rootName}{currentPath && currentPath !== rootName ? ` › …${currentPath.split("/").slice(-1)[0]}` : ""}
        </span>
        <button
          onClick={onSwap}
          className="px-1.5 py-0.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-[10px] font-medium hover:opacity-90"
          data-testid="secondary-strip-swap-btn"
          title="Swap: make Source B the primary. Store/Delete then act on it."
        >
          Swap
        </button>
      </div>
      <div className="relative flex-1 min-h-0">
        {canScroll.left && (
          <button
            onClick={() => scroll(-1)}
            className="absolute z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-primary-earth text-white backdrop-blur border border-app flex items-center justify-center shadow-lg transition-colors left-1 top-1/2 -translate-y-1/2"
            data-testid="secondary-filmstrip-scroll-left"
            title="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {canScroll.right && (
          <button
            onClick={() => scroll(1)}
            className="absolute z-20 w-8 h-8 rounded-full bg-black/70 hover:bg-primary-earth text-white backdrop-blur border border-app flex items-center justify-center shadow-lg transition-colors right-1 top-1/2 -translate-y-1/2"
            data-testid="secondary-filmstrip-scroll-right"
            title="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        )}
        <div
          ref={stripRef}
          className="filmstrip flex items-center gap-3 scroll-smooth h-full px-4 overflow-x-auto"
          data-testid="secondary-filmstrip"
        >
          {loading ? (
            <div className="text-dim text-xs italic">Loading Source B images…</div>
          ) : visible.length === 0 ? (
            <div className="text-dim text-xs italic">
              {(images || []).length === 0
                ? "No images in the selected Source B folder."
                : `No images in Source B match the star filter (≥${minStarFilter}).`}
            </div>
          ) : (
            visible.map(({ img, i }) => {
              const s = ratings[`${currentPath}/${img.name}`] || 0;
              return (
                <div key={img.name} className="relative shrink-0">
                  <Thumbnail
                    file={img}
                    cacheKey={`${currentPath}/${img.name}`}
                    active={false}
                    size={thumbSize || 128}
                    onClick={() => onThumbClick(i)}
                    onDoubleClick={() => onThumbClick(i)}
                  />
                  {s > 0 && (
                    <div className="absolute top-1 left-1 flex gap-0.5 px-1 py-0.5 rounded bg-black/70 backdrop-blur">
                      {Array.from({ length: s }).map((_, k) => (
                        <StarIcon key={k} size={8} className="text-primary-earth" fill="currentColor" />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

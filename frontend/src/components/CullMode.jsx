import React, { useEffect, useState } from "react";
import { X, Zap } from "lucide-react";

/**
 * Cull Mode — a full-screen rapid-rating workflow.
 *
 * Shows the current photo full-screen. Keyboard:
 *   1-5     rate the photo that many stars, auto-advance
 *   0 or `  set rating to 0, auto-advance
 *   Space   skip without rating (advance)
 *   ← / →   previous / next
 *   Esc     exit
 *
 * Props:
 *   open, onClose
 *   images    — the array to cull (filmstrip contents)
 *   ratings   — current ratings map (keyed however App.js keys them)
 *   ratingKeyFor(image) → string  — how to key the rating in the map
 *   onRate(image, stars) — rating handler
 *   onlyUnrated — if true, filters to photos with no rating first
 */
export default function CullMode({ open, onClose, images, ratings, ratingKeyFor, onRate, onlyUnrated = true }) {
  const [idx, setIdx] = useState(0);
  const [pool, setPool] = useState([]);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!open) return;
    const filtered = onlyUnrated
      ? images.filter((im) => !(ratings[ratingKeyFor(im)] > 0))
      : [...images];
    setPool(filtered);
    setIdx(0);
  }, [open, images, ratings, ratingKeyFor, onlyUnrated]);

  const current = pool[idx];

  // Load a preview URL for the current photo
  useEffect(() => {
    let alive = true;
    let url = null;
    if (!current) { setPreview(null); return; }
    (async () => {
      try {
        const file = await current.handle.getFile();
        url = URL.createObjectURL(file);
        if (alive) setPreview(url);
      } catch { /* ignore */ }
    })();
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [current]);

  const rate = (stars) => {
    if (!current) return;
    onRate(current, stars);
    if (idx < pool.length - 1) setIdx(idx + 1);
    else onClose();
  };

  const advance = (delta) => {
    const next = idx + delta;
    if (next < 0 || next >= pool.length) return;
    setIdx(next);
  };

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === " ") { e.preventDefault(); advance(1); return; }
      if (e.key === "ArrowLeft") { e.preventDefault(); advance(-1); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); advance(1); return; }
      if (/^[0-5]$/.test(e.key)) { e.preventDefault(); rate(parseInt(e.key, 10)); return; }
      if (e.key === "`") { e.preventDefault(); rate(0); return; }
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idx, pool.length]);

  if (!open) return null;

  const stars = current ? (ratings[ratingKeyFor(current)] || 0) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col" data-testid="cull-mode">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-app border-b border-app">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-primary-earth" />
          <span className="font-heading font-semibold text-sm">Cull Mode</span>
          <span className="text-xs text-dim">
            {pool.length === 0
              ? "Nothing to cull"
              : `${idx + 1} / ${pool.length} · ${onlyUnrated ? "unrated only" : "all photos"}`}
          </span>
        </div>
        <button onClick={onClose}
                className="px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1"
                data-testid="cull-close">
          <X size={12} /> Exit <span className="kbd ml-1">Esc</span>
        </button>
      </div>

      {/* Photo */}
      <div className="flex-1 min-h-0 flex items-center justify-center p-4">
        {current ? (
          preview ? (
            <img src={preview} alt={current.name}
                 className="max-w-full max-h-full object-contain"
                 data-testid="cull-photo" />
          ) : (
            <div className="text-dim">Loading…</div>
          )
        ) : (
          <div className="text-center text-dim">
            <div className="text-lg mb-2">All done!</div>
            <div className="text-sm">No more {onlyUnrated ? "unrated " : ""}photos in this batch.</div>
          </div>
        )}
      </div>

      {/* Footer with filename + rating hint */}
      <div className="px-4 py-3 bg-app border-t border-app flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-xs font-mono truncate text-app" data-testid="cull-filename">
            {current?.name || "—"}
          </div>
          <div className="text-[10px] text-dim mt-1 flex gap-2 flex-wrap">
            <span><span className="kbd">1</span>–<span className="kbd">5</span> rate</span>
            <span><span className="kbd">0</span> clear</span>
            <span><span className="kbd">Space</span> / <span className="kbd">→</span> skip</span>
            <span><span className="kbd">←</span> back</span>
            <span><span className="kbd">Esc</span> exit</span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0" data-testid="cull-stars">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => rate(n)}
              className={`w-9 h-9 rounded flex items-center justify-center text-lg ${
                n <= stars
                  ? "bg-primary-earth text-[color:var(--text-inverse)]"
                  : "bg-app hover:bg-surface-hover border border-app text-dim"
              }`}
              data-testid={`cull-star-${n}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

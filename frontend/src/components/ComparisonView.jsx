import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";

/**
 * ComparisonView - renders N adjacent images side-by-side with a common ratings badge.
 * Click a pane to select it as the active image.
 */
function Pane({ img, active, onClick, stars }) {
  const [url, setUrl] = useState(null);
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

  return (
    <div
      onClick={onClick}
      className={`relative flex-1 min-w-0 h-full flex items-center justify-center overflow-hidden border-2 cursor-pointer transition-colors ${
        active ? "border-primary-earth" : "border-transparent hover:border-app"
      }`}
      data-testid={`compare-pane-${img?.name || "empty"}`}
    >
      {url ? (
        <img
          src={url}
          alt={img?.name || ""}
          className="max-w-full max-h-full object-contain"
          draggable={false}
        />
      ) : (
        <div className="text-dim text-xs italic">Loading…</div>
      )}
      {img && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur text-[10px] font-mono flex items-center gap-1.5">
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
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-[10px] font-mono font-bold">
          ACTIVE
        </div>
      )}
    </div>
  );
}

export default function ComparisonView({ images, selectedIdx, panes, onSelect, ratings, sourcePath }) {
  const start = Math.max(0, Math.min(selectedIdx, images.length - panes));
  const visible = images.slice(start, start + panes);
  return (
    <div className="w-full h-full flex items-stretch gap-2 p-2" data-testid="comparison-view">
      {visible.map((img, i) => {
        const idx = start + i;
        return (
          <Pane
            key={img.name}
            img={img}
            active={idx === selectedIdx}
            onClick={() => onSelect(idx)}
            stars={ratings?.[`${sourcePath}/${img.name}`] || 0}
          />
        );
      })}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { getThumbnail } from "../lib/thumbCache";
import { Image as ImageIcon, CheckSquare, Square } from "lucide-react";

export default function Thumbnail({ file, cacheKey, active, batchMode, batchSelected, onClick, onDoubleClick, size = 128 }) {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    setSrc(null);
    setErr(false);
    getThumbnail(file.handle, cacheKey)
      .then((d) => {
        if (alive) {
          if (d) setSrc(d);
          else setErr(true);
        }
      })
      .catch(() => alive && setErr(true));
    return () => {
      alive = false;
    };
  }, [file, cacheKey]);

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`relative shrink-0 rounded cursor-pointer transition-all ${
        active ? "selected-thumb" : "opacity-80 hover:opacity-100"
      } ${batchSelected ? "ring-2 ring-success-earth ring-offset-2 ring-offset-[#110F0E]" : ""}`}
      style={{ height: size, minWidth: Math.round(size * 0.625) }}
      data-testid={`thumb-${file.name}`}
      title={file.name}
    >
      {src ? (
        <img src={src} alt={file.name} style={{ height: size }} className="w-auto object-cover rounded" draggable={false} />
      ) : (
        <div
          style={{ height: size, width: Math.round(size * 0.75) }}
          className={`rounded flex flex-col items-center justify-center gap-1.5 ${
            err
              ? "bg-surface border-2 border-dashed border-danger-earth/50"
              : "bg-surface border-2 border-dashed border-primary-earth/50 animate-pulse"
          }`}
          data-testid={`thumb-loading-${file.name}`}
        >
          {err ? (
            <>
              <ImageIcon size={Math.min(24, size / 5)} className="text-danger-earth" />
              <span className="text-[9px] uppercase tracking-widest text-danger-earth font-heading px-1 text-center leading-tight">
                Can't read
              </span>
            </>
          ) : (
            <>
              <div className="w-5 h-5 border-2 border-primary-earth border-t-transparent rounded-full animate-spin" />
              {/* v1.4.5 — Explicit label so Kurt (and every future user)
                  never mistakes a re-generating thumb for a frozen app.
                  Especially matters right after clearing the cache. */}
              <span className="text-[9px] uppercase tracking-widest text-primary-earth font-heading px-1 text-center leading-tight">
                Generating<br />thumbnail…
              </span>
            </>
          )}
        </div>
      )}

      {batchMode && (
        <div
          className={`absolute top-1 right-1 w-6 h-6 rounded flex items-center justify-center backdrop-blur border shadow ${
            batchSelected ? "bg-success-earth text-[color:var(--text-inverse)] border-transparent" : "bg-black/60 text-app border-app"
          }`}
          data-testid={`thumb-check-${file.name}`}
          aria-label={batchSelected ? "Selected for batch" : "Not selected"}
        >
          {batchSelected ? <CheckSquare size={14} strokeWidth={2.2} /> : <Square size={14} strokeWidth={2.2} />}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/60 rounded-b text-[10px] font-mono truncate text-app">
        {file.name}
      </div>
    </div>
  );
}

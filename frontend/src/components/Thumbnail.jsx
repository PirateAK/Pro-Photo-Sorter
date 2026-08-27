import React, { useEffect, useState } from "react";
import { getThumbnail } from "../lib/thumbCache";
import { Image as ImageIcon, CheckSquare, Square } from "lucide-react";

export default function Thumbnail({ file, cacheKey, active, batchMode, batchSelected, onClick, onDoubleClick }) {
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
      className={`relative shrink-0 h-32 rounded cursor-pointer transition-all ${
        active ? "selected-thumb" : "opacity-80 hover:opacity-100"
      } ${batchSelected ? "ring-2 ring-success-earth ring-offset-2 ring-offset-[#110F0E]" : ""}`}
      style={{ minWidth: 80 }}
      data-testid={`thumb-${file.name}`}
      title={file.name}
    >
      {src ? (
        <img src={src} alt={file.name} className="h-32 w-auto object-cover rounded" draggable={false} />
      ) : (
        <div className="h-32 w-32 bg-surface rounded flex items-center justify-center">
          {err ? (
            <ImageIcon size={20} className="text-dim" />
          ) : (
            <div className="w-4 h-4 border-2 border-primary-earth border-t-transparent rounded-full animate-spin" />
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

import React, { useEffect, useState, useRef } from "react";
import { ChevronDown, Clock, X } from "lucide-react";
import { getRecent, removeRecent } from "../lib/recentFolders";

// Small dropdown arrow that sits next to an "Open" button.  Reveals up to 5 recent folders.
// Props:
//   kind: "source" | "dest"
//   onPick(handle, name): called when user clicks a recent
export default function RecentFoldersDropdown({ kind, onPick }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const wrapRef = useRef(null);

  // Load on open
  useEffect(() => {
    if (!open) return;
    (async () => setRows(await getRecent(kind)))();
  }, [open, kind]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const removeOne = async (e, name) => {
    e.stopPropagation();
    await removeRecent(kind, name);
    setRows(await getRecent(kind));
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="px-1.5 py-1 rounded border border-app bg-app hover:bg-surface-hover text-xs flex items-center"
        data-testid={`recent-${kind}-toggle`}
        title="Recent folders"
      >
        <ChevronDown size={12} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-64 pane rounded-lg shadow-2xl z-40 py-1"
          data-testid={`recent-${kind}-menu`}
        >
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-dim font-heading border-b border-app flex items-center gap-1">
            <Clock size={10} /> Recent {kind === "source" ? "sources" : "destinations"}
          </div>
          {rows.length === 0 ? (
            <div className="px-3 py-3 text-xs text-dim italic">
              None yet — pick a folder to add one.
            </div>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 px-2 py-1.5 hover:bg-surface-hover cursor-pointer group"
                onClick={() => {
                  setOpen(false);
                  onPick(r.handle, r.name);
                }}
                data-testid={`recent-${kind}-item`}
              >
                <span className="flex-1 truncate text-xs font-mono text-app" title={r.name}>
                  {r.name}
                </span>
                <button
                  onClick={(e) => removeOne(e, r.name)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-app text-dim"
                  title="Remove from recents"
                  data-testid={`recent-${kind}-remove`}
                >
                  <X size={10} />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

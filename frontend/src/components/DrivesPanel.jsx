import React, { useEffect, useState, useCallback } from "react";
import { HardDrive, RefreshCw, X as XIcon } from "lucide-react";
import { listDrives, formatBytes, isElectron } from "../lib/electronBridge";

export default function DrivesPanel({ open, onClose }) {
  const [drives, setDrives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const list = await listDrives();
      setDrives(list);
      if (list.length === 0 && !isElectron()) {
        setErr("Drive info is only available inside the desktop app (Electron build).");
      }
    } catch (e) {
      setErr(e?.message || "Failed to read drives");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      data-testid="drives-panel"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-app rounded-lg shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="px-4 py-3 border-b border-app flex items-center justify-between">
          <div className="flex items-center gap-2 text-app font-semibold">
            <HardDrive size={16} className="text-primary-earth" />
            <span>System Drives</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={refresh}
              className="px-2 py-1 rounded text-xs flex items-center gap-1 hover:bg-surface-hover text-dim hover:text-app"
              data-testid="drives-refresh-btn"
              title="Refresh"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded flex items-center justify-center hover:bg-surface-hover text-dim hover:text-app"
              data-testid="drives-close-btn"
              title="Close"
            >
              <XIcon size={14} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-auto">
          {err ? (
            <div className="text-sm text-dim italic" data-testid="drives-error">{err}</div>
          ) : loading && drives.length === 0 ? (
            <div className="text-sm text-dim italic">Reading drives…</div>
          ) : drives.length === 0 ? (
            <div className="text-sm text-dim italic">No drives reported.</div>
          ) : (
            <div className="space-y-3">
              {drives.map((d) => {
                const total = Number(d.totalBytes) || 0;
                const free = Number(d.freeBytes) || 0;
                const used = Math.max(0, total - free);
                const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
                const barColor =
                  pct >= 90 ? "bg-danger-earth" : pct >= 75 ? "bg-amber-500" : "bg-primary-earth";
                return (
                  <div
                    key={d.letter}
                    className="border border-app rounded p-3 bg-app/40"
                    data-testid={`drive-row-${d.letter.replace(":", "")}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <HardDrive size={14} className="text-primary-earth" />
                        <span className="font-mono font-semibold text-app">{d.letter}</span>
                        {d.label ? (
                          <span className="text-xs text-dim">({d.label})</span>
                        ) : null}
                      </div>
                      <div className="text-xs font-mono text-dim">
                        <span className="text-app">{formatBytes(free)}</span> free of{" "}
                        {formatBytes(total)}
                      </div>
                    </div>
                    <div className="h-2 rounded bg-black/25 overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all`}
                        style={{ width: `${pct}%` }}
                        title={`${pct.toFixed(1)}% used`}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-dim font-mono flex justify-between">
                      <span>Used: {formatBytes(used)}</span>
                      <span>{pct.toFixed(1)}% full</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-app text-[10px] text-dim">
          Tip: photos need roughly the same space in the destination as they take in the source.
          Keep at least 10% headroom on any drive you're writing to.
        </div>
      </div>
    </div>
  );
}

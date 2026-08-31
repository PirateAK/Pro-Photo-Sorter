import React from "react";
import { Save, MoveRight, Trash2, Star, SkipForward, Wand2 } from "lucide-react";

// Live session counter strip.  Displayed just above the filmstrip.
// Purely presentational — App.js owns the counters state.
export default function SessionStats({ stats, onReset }) {
  const items = [
    { key: "stored", label: "Stored", Icon: Save, value: stats.stored, color: "text-primary-earth" },
    { key: "moved", label: "Moved", Icon: MoveRight, value: stats.moved, color: "text-primary-earth" },
    { key: "deleted", label: "Trashed", Icon: Trash2, value: stats.deleted, color: "text-red-400" },
    { key: "skipped", label: "Skipped", Icon: SkipForward, value: stats.skipped, color: "text-dim" },
    { key: "rated", label: "Rated", Icon: Star, value: stats.rated, color: "text-primary-earth" },
    { key: "enhanced", label: "Enhanced", Icon: Wand2, value: stats.enhanced, color: "text-primary-earth" },
  ];
  const total = items.reduce((s, i) => s + (i.value || 0), 0);

  return (
    <div
      className="flex items-center gap-3 px-3 py-1 border-b border-app bg-deep text-[11px] font-mono select-none"
      data-testid="session-stats-strip"
    >
      <span className="uppercase tracking-widest text-[9px] text-dim font-heading font-semibold shrink-0">
        Session
      </span>
      {items.map((i) => (
        <div
          key={i.key}
          className={`flex items-center gap-1 ${i.value ? "opacity-100" : "opacity-50"}`}
          data-testid={`stat-${i.key}`}
          title={i.label}
        >
          <i.Icon size={11} className={i.color} />
          <span className="text-app">{i.value || 0}</span>
          <span className="text-dim text-[10px] hidden sm:inline">{i.label}</span>
        </div>
      ))}
      <span className="text-dim mx-1">·</span>
      <span className="text-dim">Total actions: <span className="text-app">{total}</span></span>
      {total > 0 && (
        <button
          onClick={onReset}
          className="ml-auto text-[10px] px-2 py-0.5 rounded border border-app hover:bg-surface-hover text-dim shrink-0"
          data-testid="session-stats-reset"
          title="Reset session counters"
        >
          Reset
        </button>
      )}
    </div>
  );
}

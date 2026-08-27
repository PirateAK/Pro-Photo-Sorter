import React from "react";
import { IconPreview } from "./CategoryManager";
import { ChevronDown, Layers, FolderTree, Tag } from "lucide-react";

export default function IconPalette({ categories, activeCatId, onSetCat, onApply, target, onSetTarget }) {
  const active = categories.find((c) => c.id === activeCatId) || categories[0];
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="flex items-center gap-2 shrink-0">
        <Layers size={14} className="text-dim" />
        <div className="relative">
          <select
            value={active?.id || ""}
            onChange={(e) => onSetCat(e.target.value)}
            className="appearance-none bg-app border border-app rounded pl-2 pr-6 py-1 text-xs font-medium focus-ring cursor-pointer"
            data-testid="palette-category-select"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-app">
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-dim" />
        </div>
        {/* Target selector: which row clicks (and default drops) go to */}
        <div className="flex rounded overflow-hidden border border-app shrink-0" title="Where do clicks go?">
          <button
            onClick={() => onSetTarget("folders")}
            className={`px-2 py-1 text-[10px] flex items-center gap-1 ${
              target === "folders" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover text-dim"
            }`}
            data-testid="palette-target-folders"
            title="Click adds to Folders row"
          >
            <FolderTree size={11} />
          </button>
          <button
            onClick={() => onSetTarget("tags")}
            className={`px-2 py-1 text-[10px] flex items-center gap-1 ${
              target === "tags" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover text-dim"
            }`}
            data-testid="palette-target-tags"
            title="Click adds to Filename row"
          >
            <Tag size={11} />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1">
        {active?.items.length === 0 && (
          <span className="text-xs text-dim italic">No icons in this list — open Category Manager to add.</span>
        )}
        {active?.items.map((it) => (
          <button
            key={it.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-pps-icon", JSON.stringify(it));
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onApply(it, target)}
            className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app hover:border-primary-earth/60 text-xs transition-colors group cursor-grab active:cursor-grabbing"
            title={`Drag to a row, or click to add "${it.label}" to ${target === "folders" ? "Folders" : "Filename"}`}
            data-testid={`palette-item-${it.id}`}
          >
            <span className="text-primary-earth">
              <IconPreview item={it} size={14} />
            </span>
            <span className="font-mono text-app group-hover:text-primary-earth">{it.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

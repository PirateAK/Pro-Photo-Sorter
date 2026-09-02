import React from "react";
import { IconPreview } from "./CategoryManager";
import { ChevronDown, FolderTree, Tag } from "lucide-react";

/**
 * A single icon palette row bound to one destination role: "folders" or "filename".
 * Each row picks its own category, and its icons are dragged/clicked into the
 * matching row of the image overlay.
 */
export default function IconPalette({
  role, // "folders" | "filename"
  categories,
  activeCatId,
  onSetCat,
  onApply, // fn(icon, "folders" | "tags")
}) {
  const active = categories.find((c) => c.id === activeCatId) || categories[0];
  const roleLabel = role === "folders" ? "Folders" : "Filename";
  const RoleIcon = role === "folders" ? FolderTree : Tag;
  const applyRow = role === "folders" ? "folders" : "tags";

  return (
    <div className="flex items-center gap-3 min-w-0" data-testid={`palette-row-${role}`}>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-heading text-dim min-w-[68px]">
          <RoleIcon size={12} className="text-primary-earth" /> {roleLabel}
        </div>
        <div className="relative">
          <select
            value={active?.id || ""}
            onChange={(e) => onSetCat(e.target.value)}
            className="appearance-none bg-app border border-app rounded pl-2 pr-6 py-1 text-xs font-medium focus-ring cursor-pointer"
            data-testid={`palette-${role}-category-select`}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-app">
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-dim" />
        </div>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1">
        {(!active || active.items.length === 0) && (
          <span className="text-xs text-dim italic">
            No icons in this list — open Category Manager to add.
          </span>
        )}
        {active?.items.map((it) => (
          <button
            key={it.id}
            draggable
            onDragStart={(e) => {
              // Include the source bar's role so drops always route correctly
              // (source bar wins over drop location).
              e.dataTransfer.setData(
                "application/x-pps-icon",
                JSON.stringify({ item: it, role: applyRow })
              );
              e.dataTransfer.effectAllowed = "copy";
            }}
            onClick={() => onApply(it, applyRow)}
            className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app hover:border-primary-earth/60 text-xs transition-colors group cursor-grab active:cursor-grabbing"
            title={`Drag to a row, or click to add "${it.label}" to ${roleLabel}`}
            data-testid={`palette-${role}-item-${it.id}`}
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

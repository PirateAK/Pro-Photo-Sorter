import React from "react";
import { IconPreview } from "./CategoryManager";
import { FolderPlus, ChevronRight } from "lucide-react";

/**
 * SubfolderBar (v1.1.6 · v1.4.0 nested-aware)
 * A single row of sub-folder chips scoped to one parent. Multiple bars are
 * stacked by <SubfolderCascade/> to render an unlimited-depth cascade.
 *
 * Props:
 *   subfolders          — array of sub-folder objects to render as chips
 *   activeSubId         — id of the currently selected chip at this level
 *   depth               — 0-indexed level (drives the label prefix)
 *   onPick              — fn(subId | null) — null clears this level
 *   parentPathLabels    — array of ancestor names for the aria/title hint
 */
export default function SubfolderBar({
  subfolders,
  activeSubId,
  depth = 0,
  onPick,
  parentPathLabels = [],
}) {
  const subs = Array.isArray(subfolders) ? subfolders : [];
  if (subs.length === 0) return null;

  const label = depth === 0 ? "Sub-Folder" : `Level ${depth + 1}`;
  const pathHint = parentPathLabels.filter(Boolean).join(" › ");

  return (
    <div
      className="flex items-center gap-3 min-w-0 rounded"
      data-testid={`palette-row-subfolder-l${depth}`}
    >
      <div className="flex items-center gap-2 shrink-0">
        <div
          className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-heading text-dim min-w-[68px]"
          title={pathHint ? `Nested under: ${pathHint}` : undefined}
        >
          <FolderPlus size={12} className="text-primary-earth" /> {label}
        </div>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1">
        {subs.map((sf) => {
          const isActive = activeSubId === sf.id;
          return (
            <button
              key={sf.id}
              onClick={() => onPick(isActive ? null : sf.id)}
              className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded border text-xs transition-colors ${
                isActive
                  ? "bg-primary-earth text-[color:var(--text-inverse)] border-primary-earth"
                  : "bg-app hover:bg-surface-hover border-app hover:border-primary-earth/60 text-app"
              }`}
              data-testid={`subfolder-${sf.id}`}
              title={isActive
                ? `Sub-folder "${sf.name}" is ACTIVE — click to clear`
                : `Pick "${sf.name}" — its filename tags load below and the folder path becomes "…/${sf.name}/…"`}
            >
              <span className={isActive ? "text-[color:var(--text-inverse)]" : "text-primary-earth"}>
                <IconPreview item={{ iconType: sf.iconType || "lucide", iconName: sf.iconName || "Folder" }} size={14} />
              </span>
              <span className="font-mono">{sf.name}</span>
              {isActive && <ChevronRight size={10} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

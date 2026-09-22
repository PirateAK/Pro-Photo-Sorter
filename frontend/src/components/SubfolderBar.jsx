import React from "react";
import { IconPreview } from "./CategoryManager";
import { FolderPlus, ChevronRight } from "lucide-react";

/**
 * SubfolderBar (v1.1.6) — the middle "SUB-FOLDER" bar in the main window.
 * Only renders when the currently-active tag pack has one or more subfolders.
 *
 * Behavior:
 *   • Shows a chip for each subfolder in the active pack (icon + name).
 *   • Radio-selection: clicking a chip sets it as the active subfolder;
 *     clicking the same chip again clears it.
 *   • Highlighted state in earth-tone when active.
 *
 * Effects (wired in App.js):
 *   • Active subfolder name prepends to the destination folder path
 *     (e.g. "Sports/Baseball/…").
 *   • The FILENAME bar swaps to that subfolder's filenameItems.
 */
export default function SubfolderBar({
  active,              // the active pack
  activeSubfolderId,   // currently selected subfolder id, or null
  onSetSubfolder,      // fn(subfolderId | null)
}) {
  const subs = Array.isArray(active?.subfolders) ? active.subfolders : [];
  if (!active || subs.length === 0) return null;

  return (
    <div
      className="flex items-center gap-3 min-w-0 rounded"
      data-testid="palette-row-subfolder"
    >
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-heading text-dim min-w-[68px]">
          <FolderPlus size={12} className="text-primary-earth" /> Sub-Folder
        </div>
      </div>
      <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1">
        {subs.map((sf) => {
          const active = activeSubfolderId === sf.id;
          return (
            <button
              key={sf.id}
              onClick={() => onSetSubfolder(active ? null : sf.id)}
              className={`shrink-0 flex items-center gap-1.5 px-2 py-1 rounded border text-xs transition-colors ${
                active
                  ? "bg-primary-earth text-[color:var(--text-inverse)] border-primary-earth"
                  : "bg-app hover:bg-surface-hover border-app hover:border-primary-earth/60 text-app"
              }`}
              data-testid={`subfolder-${sf.id}`}
              title={active
                ? `Sub-folder "${sf.name}" is ACTIVE — click to clear`
                : `Pick "${sf.name}" — its filename tags load below and the folder path becomes "…/${sf.name}/…"`}
            >
              <span className={active ? "text-[color:var(--text-inverse)]" : "text-primary-earth"}>
                <IconPreview item={{ iconType: sf.iconType || "lucide", iconName: sf.iconName || "Folder" }} size={14} />
              </span>
              <span className="font-mono">{sf.name}</span>
              {active && <ChevronRight size={10} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

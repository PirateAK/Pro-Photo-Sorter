// SubfolderCascade (v1.4.0)
// -----------------------------------------------------------------------------
// Renders one or more <SubfolderBar/> rows so Kurt can drill unlimited depth
// into nested sub-folders. The first row always shows the pack's top-level
// sub-folders; every deeper row appears only when the current-active chip
// at that depth has children of its own.
//
// Contract with App.js:
//   • `activeSubfolderPath` is an array of sub-folder IDs from top → bottom.
//     Empty array means "no sub-folder selected".
//   • Picking a chip at depth D truncates the path to depth D+1.
//   • Clearing a chip at depth D truncates the path to depth D (that chip's
//     ancestor row).
//   • The DEEPEST selected sub-folder drives the filename-tag override in
//     App.js. If that deepest sub-folder's filenameItems is empty, App.js
//     falls back to the nearest ancestor that DOES have filenameItems (so
//     "container" sub-folders inherit their parent's tag list).
//
// The `enableNestedSubfolders` setting toggles anything past depth 0.
import React from "react";
import SubfolderBar from "./SubfolderBar";

export function resolveSubChain(pack, activeSubfolderPath) {
  const chain = [];
  let node = pack;
  for (const id of activeSubfolderPath || []) {
    const subs = Array.isArray(node?.subfolders) ? node.subfolders : [];
    const next = subs.find((s) => s.id === id);
    if (!next) break;
    chain.push(next);
    node = next;
  }
  return chain;
}

/**
 * Deepest sub-folder in the chain that has filename items. Falls back to the
 * highest ancestor's filenameItems, else null (meaning "use the pack default").
 */
export function deepestWithFilenames(chain) {
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    if (Array.isArray(chain[i].filenameItems) && chain[i].filenameItems.length > 0) {
      return chain[i];
    }
  }
  return null;
}

export default function SubfolderCascade({
  pack,                         // active category
  activeSubfolderPath,          // array of sub-folder IDs, top → bottom
  onSetPath,                    // fn(newPath: string[])
  enableNestedSubfolders = true // when false only depth-0 row renders
}) {
  const rootSubs = Array.isArray(pack?.subfolders) ? pack.subfolders : [];
  if (rootSubs.length === 0) return null;

  const chain = resolveSubChain(pack, activeSubfolderPath);
  // Build the list of rows we need. Row at index `i` shows the sub-folders
  // available at depth `i`. Depth 0 = pack.subfolders. Depth i+1 =
  // chain[i].subfolders (only rendered when it has children).
  const rows = [{ subs: rootSubs, parentLabels: [pack?.name].filter(Boolean) }];
  if (enableNestedSubfolders) {
    for (let i = 0; i < chain.length; i += 1) {
      const nextSubs = Array.isArray(chain[i].subfolders) ? chain[i].subfolders : [];
      if (nextSubs.length === 0) break;
      rows.push({
        subs: nextSubs,
        parentLabels: [pack?.name, ...chain.slice(0, i + 1).map((s) => s.name)].filter(Boolean),
      });
    }
  }

  return (
    <div className="flex flex-col gap-1 min-w-0 flex-1" data-testid="subfolder-cascade">
      {rows.map((row, depth) => {
        const activeSubId = activeSubfolderPath[depth] || null;
        return (
          <SubfolderBar
            key={`subrow-${depth}`}
            subfolders={row.subs}
            activeSubId={activeSubId}
            depth={depth}
            parentPathLabels={row.parentLabels}
            onPick={(subId) => {
              const next = activeSubfolderPath.slice(0, depth);
              if (subId) next.push(subId);
              onSetPath(next);
            }}
          />
        );
      })}
    </div>
  );
}

// NestedSubfolderEditor (v1.4.0 · v1.4.1 connection-visible + tag→nest)
// -----------------------------------------------------------------------------
// A recursive UI mounted inside each expanded Tag Manager sub-folder row to
// let Kurt build unlimited-depth children AND clearly see how each nested
// child relates to its parents.
//
// v1.4.1 additions:
//   • Breadcrumb strip: "Nested under: Sports › Baseball (AL) › Yankees"
//     printed above the section so the relationship is never implicit.
//   • Left tree lines (└──) on nested rows so the tree literally looks like
//     a tree.
//   • Per-tag "→ Nest" button — converts a single filename tag into a
//     nested sub-folder (same name + icon, empty items ready for players).
//   • Bulk "Convert all → nested" button — moves every filename tag on the
//     current node into new nested sub-folders in one shot. Great for
//     turning a whole team roster tag list into per-team sub-folders.
//   • The parent's own filename tags are also editable inline here (delete)
//     so the tag→nest conversion works at every depth without popping back
//     up to the surrounding SubfolderSection.
//
// Contract with the caller:
//   • `node` — the sub-folder whose children this editor manages. The
//     editor DOES NOT mutate `node.filenameItems` (those are owned by the
//     surrounding SubfolderSection) — with ONE exception: the tag→nest
//     conversion, which moves items out of `filenameItems` and into new
//     `subfolders[]` entries as a single atomic patch.
//   • `onChange(newNode)` — a fully-patched replacement node.
//   • `ancestorPath` — array of { name } from the ROOT category down through
//     each ancestor, EXCLUDING `node` itself. Used only for the breadcrumb
//     display (never mutated).
import React, { useState } from "react";
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight, FolderPlus, CornerDownRight, ArrowRight, MoveRight } from "lucide-react";
import { uid } from "../lib/storage";
import PasteRosterButton from "./PasteRosterButton";

function makeNested(name, seed = {}) {
  return {
    id: uid("sf"),
    name: (name || "Nested").slice(0, 60),
    iconType: seed.iconType || "lucide",
    iconName: seed.iconName || "Folder",
    // Preserve custom image data if the tag being promoted had one.
    ...(seed.iconData ? { iconData: seed.iconData } : {}),
    filenameItems: [],
    subfolders: [],
  };
}

export function patchAtPath(node, path, update) {
  if (!path || path.length === 0) return update(node);
  const [head, ...rest] = path;
  const subs = Array.isArray(node.subfolders) ? node.subfolders : [];
  return {
    ...node,
    subfolders: subs.map((s) => (s.id === head ? patchAtPath(s, rest, update) : s)),
  };
}

/** Convert a filename tag object into a nested sub-folder seed. */
function tagToNestedSeed(tag) {
  return makeNested(tag.label || tag.name || "Nested", {
    iconType: tag.iconType,
    iconName: tag.iconName,
    iconData: tag.iconData,
  });
}

export default function NestedSubfolderEditor({
  node,
  onChange,
  depth = 1,
  maxDepthHint = 8,
  ancestorPath = [],   // v1.4.1 — [{name}] from root category down to but excluding node
}) {
  const [draft, setDraft] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [tagDrafts, setTagDrafts] = useState({});

  const children = Array.isArray(node.subfolders) ? node.subfolders : [];
  const parentTags = Array.isArray(node.filenameItems) ? node.filenameItems : [];
  const fullPath = [...ancestorPath.map((a) => a.name).filter(Boolean), node?.name].filter(Boolean);

  const addChild = () => {
    const nm = draft.trim();
    if (!nm) return;
    onChange({ ...node, subfolders: [...children, makeNested(nm)] });
    setDraft("");
  };
  const removeChild = (childId) => {
    const child = children.find((c) => c.id === childId);
    if (!child) return;
    const kidCount = (child.subfolders || []).length;
    const tagCount = (child.filenameItems || []).length;
    if ((kidCount || tagCount) && !window.confirm(
      `Delete "${child.name}"?\n${tagCount} filename tag(s) and ${kidCount} nested sub-folder(s) will be removed.`
    )) return;
    onChange({ ...node, subfolders: children.filter((c) => c.id !== childId) });
  };
  const renameChild = (childId, name) => {
    const nm = (name || "").trim();
    if (!nm) return;
    onChange({
      ...node,
      subfolders: children.map((c) => (c.id === childId ? { ...c, name: nm.slice(0, 60) } : c)),
    });
  };
  const addTagToChild = (childId) => {
    const lbl = (tagDrafts[childId] || "").trim();
    if (!lbl) return;
    onChange({
      ...node,
      subfolders: children.map((c) => (c.id === childId
        ? { ...c, filenameItems: [...(c.filenameItems || []), { id: uid("it"), label: lbl.slice(0, 60), iconType: "lucide", iconName: "Tag" }] }
        : c)),
    });
    setTagDrafts({ ...tagDrafts, [childId]: "" });
  };
  const removeTagFromChild = (childId, tagId) => {
    onChange({
      ...node,
      subfolders: children.map((c) => (c.id === childId
        ? { ...c, filenameItems: (c.filenameItems || []).filter((t) => t.id !== tagId) }
        : c)),
    });
  };
  const patchChildNode = (childId, patchedChild) => {
    onChange({ ...node, subfolders: children.map((c) => (c.id === childId ? patchedChild : c)) });
  };

  // ── v1.4.1 tag→nest conversions ─────────────────────────────────────────
  // Promote ONE filename tag on the CURRENT node into a nested sub-folder.
  const promoteTagToNested = (tagId) => {
    const tag = parentTags.find((t) => t.id === tagId);
    if (!tag) return;
    onChange({
      ...node,
      filenameItems: parentTags.filter((t) => t.id !== tagId),
      subfolders: [...children, tagToNestedSeed(tag)],
    });
  };
  // Bulk: promote EVERY filename tag on the current node into nested
  // sub-folders. Order preserved. Duplicates de-duped by label.
  const bulkPromoteAllTags = () => {
    if (parentTags.length === 0) return;
    if (!window.confirm(
      `Convert all ${parentTags.length} filename tag(s) into nested sub-folders under "${node.name}"?\n\n` +
      `Each tag becomes a new sub-folder with an empty filename tag list (ready for players / etc.). ` +
      `Existing nested sub-folders are kept.`
    )) return;
    const seen = new Set(children.map((c) => (c.name || "").toLowerCase()));
    const newOnes = [];
    for (const tag of parentTags) {
      const nm = (tag.label || "").toLowerCase();
      if (seen.has(nm)) continue;
      seen.add(nm);
      newOnes.push(tagToNestedSeed(tag));
    }
    onChange({
      ...node,
      filenameItems: [],
      subfolders: [...children, ...newOnes],
    });
  };

  return (
    <div
      className="mt-2 pt-2 border-t border-app/30"
      style={{ paddingLeft: Math.min(depth, 4) * 6 }}
      data-testid={`nested-editor-d${depth}`}
    >
      {/* v1.4.1 — Breadcrumb strip. Makes the parent-child relationship
          visible at every depth so Kurt never has to guess where he is. */}
      <div className="flex items-center flex-wrap gap-1 mb-1.5 text-[11px]">
        <FolderPlus size={11} className="text-primary-earth" />
        <span className="text-[9px] uppercase tracking-widest font-heading text-dim shrink-0">
          Nested under:
        </span>
        {fullPath.map((seg, i) => (
          <React.Fragment key={i}>
            <span className={i === fullPath.length - 1 ? "font-semibold text-primary-earth" : "text-app"}>
              {seg}
            </span>
            {i < fullPath.length - 1 && <span className="text-dim">›</span>}
          </React.Fragment>
        ))}
        <span className="ml-auto text-[10px] text-dim">
          {children.length} nested · {parentTags.length} filename tag{parentTags.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* v1.4.1 — Convert-all bulk action. Only surfaces when the current
          node still owns filename tags. */}
      {parentTags.length > 0 && (
        <div className="mb-2 flex items-start gap-2 rounded bg-primary-earth/10 border border-primary-earth/40 px-2 py-1.5">
          <MoveRight size={12} className="text-primary-earth mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[11px] leading-snug">
              Turn all <span className="font-semibold">{parentTags.length}</span> filename tag{parentTags.length === 1 ? "" : "s"} on "{node.name}" into nested sub-folders.
              <span className="text-dim"> Great for teams → per-team player rosters.</span>
            </div>
          </div>
          <button
            onClick={bulkPromoteAllTags}
            className="shrink-0 px-2 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] text-[11px] font-medium hover:opacity-90"
            data-testid={`nested-bulk-convert-${node.id}`}
            title="Move every filename tag on this sub-folder into its own nested sub-folder."
          >
            Convert all → nested
          </button>
        </div>
      )}

      {/* Add form */}
      <div className="flex items-center gap-1 mb-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addChild(); }}
          placeholder={`New nested sub-folder under "${node.name}"…`}
          className="flex-1 bg-app border border-app rounded px-2 py-1 text-xs focus-ring"
          data-testid={`nested-add-input-${node.id}`}
        />
        <button
          onClick={addChild}
          disabled={!draft.trim()}
          className="px-2 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] text-[11px] font-medium disabled:opacity-40 flex items-center gap-1"
          data-testid={`nested-add-btn-${node.id}`}
          title="Add a nested sub-folder"
        >
          <Plus size={10} /> Nest
        </button>
      </div>

      {children.length === 0 ? (
        <div className="text-[11px] text-dim italic px-1 py-1">
          No nested sub-folders yet. Add one above (e.g. Wedding › Ceremony › <span className="text-primary-earth">Bride's family</span>).
        </div>
      ) : (
        <div className="space-y-1">
          {children.map((c, idx) => {
            const isLast = idx === children.length - 1;
            const expanded = expandedId === c.id;
            const tags = c.filenameItems || [];
            const grandKids = c.subfolders || [];
            const isRenaming = renamingId === c.id;
            return (
              <div key={c.id} className="flex items-stretch" data-testid={`nested-row-${c.id}`}>
                {/* v1.4.1 — Tree-line rail (└── / ├──). Purely visual; screen
                    readers ignore via aria-hidden. */}
                <div
                  aria-hidden
                  className="w-4 shrink-0 flex flex-col items-center text-primary-earth/50 select-none"
                  style={{ fontFamily: "monospace", lineHeight: 1 }}
                >
                  <div className={`w-px flex-1 ${isLast ? "h-3" : "h-full"} bg-primary-earth/30`} />
                  <div className="text-[10px] leading-none pb-0.5">
                    <CornerDownRight size={10} />
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-primary-earth/30" />}
                </div>

                <div className="flex-1 rounded border border-app bg-app/40 min-w-0">
                  <div className="flex items-center gap-1 px-2 py-1">
                    <button
                      onClick={() => setExpandedId(expanded ? null : c.id)}
                      className="w-5 h-5 rounded flex items-center justify-center text-dim hover:text-primary-earth"
                      title={expanded ? "Collapse" : "Expand to edit"}
                      data-testid={`nested-toggle-${c.id}`}
                    >
                      {expanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                    </button>
                    {isRenaming ? (
                      <input
                        autoFocus
                        value={renameDraft}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onBlur={() => { renameChild(c.id, renameDraft); setRenamingId(null); }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { renameChild(c.id, renameDraft); setRenamingId(null); }
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                        className="flex-1 bg-app border border-primary-earth rounded px-1.5 py-0.5 text-xs focus-ring"
                        data-testid={`nested-rename-input-${c.id}`}
                      />
                    ) : (
                      <button
                        onDoubleClick={() => { setRenamingId(c.id); setRenameDraft(c.name); }}
                        className="flex-1 text-left text-xs font-medium truncate hover:text-primary-earth"
                        title="Double-click to rename"
                        data-testid={`nested-name-${c.id}`}
                      >
                        {c.name}
                      </button>
                    )}
                    <span className="text-[9px] text-dim shrink-0 mx-1">
                      {tags.length} tag{tags.length !== 1 ? "s" : ""}
                      {grandKids.length > 0 && ` · ${grandKids.length} nested`}
                    </span>
                    <button
                      onClick={() => { setRenamingId(c.id); setRenameDraft(c.name); }}
                      className="w-5 h-5 rounded flex items-center justify-center hover:bg-surface-hover text-dim hover:text-primary-earth"
                      data-testid={`nested-rename-btn-${c.id}`}
                      title="Rename"
                    >
                      <Pencil size={10} />
                    </button>
                    <button
                      onClick={() => removeChild(c.id)}
                      className="w-5 h-5 rounded flex items-center justify-center hover:bg-surface-hover text-dim hover:text-danger-earth"
                      data-testid={`nested-delete-${c.id}`}
                      title="Delete this nested sub-folder"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>

                  {expanded && (
                    <div className="px-3 pb-2 pt-1 border-t border-app/30">
                      <div className="text-[9px] uppercase tracking-widest text-dim font-heading mb-1">
                        Filename tags for "{c.name}"
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {tags.length === 0 ? (
                          <span className="text-[11px] text-dim italic">
                            No filename tags. Sub-folders without tags inherit the parent's list.
                          </span>
                        ) : tags.map((t) => (
                          <span
                            key={t.id}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-app border border-app text-[11px]"
                            data-testid={`nested-tag-${t.id}`}
                          >
                            <span className="font-mono">{t.label}</span>
                            <button
                              onClick={() => {
                                // v1.4.1 — Promote THIS tag into a nested
                                // sub-folder under its owning sub-folder.
                                // Same pattern as the parent-level promotion.
                                if (!window.confirm(`Convert filename tag "${t.label}" into a nested sub-folder under "${c.name}"?`)) return;
                                patchChildNode(c.id, {
                                  ...c,
                                  filenameItems: (c.filenameItems || []).filter((x) => x.id !== t.id),
                                  subfolders: [...(c.subfolders || []), tagToNestedSeed(t)],
                                });
                              }}
                              className="text-primary-earth hover:text-primary-earth/80"
                              title={`Promote "${t.label}" to a nested sub-folder`}
                              data-testid={`nested-tag-promote-${t.id}`}
                            >
                              <ArrowRight size={9} />
                            </button>
                            <button
                              onClick={() => removeTagFromChild(c.id, t.id)}
                              className="text-dim hover:text-danger-earth"
                              title="Remove tag"
                            >
                              <Trash2 size={9} />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={tagDrafts[c.id] || ""}
                          onChange={(e) => setTagDrafts({ ...tagDrafts, [c.id]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === "Enter") addTagToChild(c.id); }}
                          placeholder="New filename tag…"
                          className="flex-1 bg-app border border-app rounded px-2 py-1 text-[11px] focus-ring"
                          data-testid={`nested-tag-input-${c.id}`}
                        />
                        <button
                          onClick={() => addTagToChild(c.id)}
                          disabled={!(tagDrafts[c.id] || "").trim()}
                          className="px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app text-[11px] disabled:opacity-40 flex items-center gap-1"
                          data-testid={`nested-tag-add-${c.id}`}
                        >
                          <Plus size={10} /> Tag
                        </button>
                        {/* v1.4.3-hotfix — Paste roster into this nested
                            child. Bulk-adds filename tags atomically via a
                            single onChange to keep undo/redo clean. */}
                        <PasteRosterButton
                          testId={`nested-paste-${c.id}`}
                          targetName={c.name}
                          compact
                          onCommit={(labels) => {
                            const existing = new Set((c.filenameItems || []).map((t) => (t.label || "").toLowerCase()));
                            const additions = labels
                              .filter((l) => !existing.has(l.toLowerCase()))
                              .map((label) => ({
                                id: uid("it"),
                                label: label.slice(0, 60),
                                iconType: "lucide",
                                iconName: "Tag",
                              }));
                            if (additions.length === 0) return 0;
                            patchChildNode(c.id, {
                              ...c,
                              filenameItems: [...(c.filenameItems || []), ...additions],
                            });
                            return additions.length;
                          }}
                        />
                      </div>

                      {depth < maxDepthHint ? (
                        React.createElement(NestedSubfolderEditor, {
                          node: c,
                          depth: depth + 1,
                          onChange: (patched) => patchChildNode(c.id, patched),
                          ancestorPath: [...ancestorPath, { name: node?.name }],
                        })
                      ) : (
                        <div className="mt-2 text-[10px] text-dim italic">
                          Depth {depth + 1}+ hidden here for readability. Everything still saves.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

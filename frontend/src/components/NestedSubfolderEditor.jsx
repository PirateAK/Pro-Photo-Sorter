// NestedSubfolderEditor (v1.4.0)
// -----------------------------------------------------------------------------
// A recursive UI mounted inside each expanded Tag Manager sub-folder row to
// let Kurt build unlimited-depth children. Kept intentionally lightweight
// (add/rename/delete + add/delete filename tags) so the main SubfolderSection
// stays untouched. Anything more advanced (icon-swap drag/drop, move up/down,
// spring-load) can bolt on later without touching this file.
//
// Contract:
//   • Takes a single sub-folder `node` (the one currently expanded above it)
//     and calls back with a WHOLE replacement node whenever anything inside
//     the subtree changes.
//   • Recursion happens because the same component renders itself for each
//     child, calling back up through the tree.
//   • Nothing here mutates the parent's own filename tags — those are still
//     managed by the surrounding SubfolderSection. This editor only owns the
//     sub-folder's `subfolders[]` (its nested children).
//
// All state (which rows are expanded, rename drafts, input drafts) is
// LOCAL — nothing is persisted. A remount safely returns everything to
// collapsed. Callers only need to provide `node` + `onChange`.
import React, { useState } from "react";
import { Plus, Trash2, Pencil, ChevronDown, ChevronRight, FolderPlus } from "lucide-react";
import { uid } from "../lib/storage";

function makeNested(name) {
  return {
    id: uid("sf"),
    name: (name || "Nested").slice(0, 60),
    iconType: "lucide",
    iconName: "Folder",
    filenameItems: [],
    subfolders: [],
  };
}

/**
 * Update an item within a subfolder subtree by walking a path of IDs. Returns
 * a new node. If the path is empty, `update(node)` is called on the root.
 */
export function patchAtPath(node, path, update) {
  if (!path || path.length === 0) return update(node);
  const [head, ...rest] = path;
  const subs = Array.isArray(node.subfolders) ? node.subfolders : [];
  return {
    ...node,
    subfolders: subs.map((s) => (s.id === head ? patchAtPath(s, rest, update) : s)),
  };
}

export default function NestedSubfolderEditor({
  node,          // the sub-folder whose *children* this editor manages
  onChange,      // fn(newNode) — replaces `node` in the parent tree
  depth = 1,     // 1 for the first nested level; used for a subtle indent
  maxDepthHint = 8, // soft hint only; unlimited is enforced at model level
}) {
  const [draft, setDraft] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [tagDrafts, setTagDrafts] = useState({}); // { [childId]: string }

  const children = Array.isArray(node.subfolders) ? node.subfolders : [];

  const addChild = () => {
    const nm = draft.trim();
    if (!nm) return;
    const next = { ...node, subfolders: [...children, makeNested(nm)] };
    setDraft("");
    onChange(next);
  };
  const removeChild = (childId) => {
    const child = children.find((c) => c.id === childId);
    if (!child) return;
    const kidCount = (child.subfolders || []).length;
    const tagCount = (child.filenameItems || []).length;
    const warn = kidCount || tagCount;
    if (warn && !window.confirm(
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
    // Recursive step: the grandchild's onChange calls back with a fully
    // replaced child, and we splice it back into our own list.
    onChange({
      ...node,
      subfolders: children.map((c) => (c.id === childId ? patchedChild : c)),
    });
  };

  return (
    <div
      className="mt-2 pt-2 border-t border-app/30"
      style={{ paddingLeft: Math.min(depth, 4) * 6 }}
      data-testid={`nested-editor-d${depth}`}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <FolderPlus size={11} className="text-primary-earth" />
        <div className="text-[9px] uppercase tracking-widest font-heading text-dim">
          Nested sub-folders {depth > 1 && <span className="text-[8px]">· level {depth + 1}</span>}
        </div>
        <span className="text-[10px] text-dim">({children.length})</span>
      </div>

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
          {children.map((c) => {
            const expanded = expandedId === c.id;
            const tags = c.filenameItems || [];
            const grandKids = c.subfolders || [];
            const isRenaming = renamingId === c.id;
            return (
              <div
                key={c.id}
                className="rounded border border-app bg-app/40"
                data-testid={`nested-row-${c.id}`}
              >
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
                    {/* Filename tags for this nested child */}
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
                    </div>

                    {/* Recurse — this is how unlimited depth works. Uses
                        React.createElement directly to sidestep a babel
                        traversal edge-case in react-refresh with JSX
                        self-references. */}
                    {depth < maxDepthHint ? (
                      React.createElement(NestedSubfolderEditor, {
                        node: c,
                        depth: depth + 1,
                        onChange: (patched) => patchChildNode(c.id, patched),
                      })
                    ) : (
                      <div className="mt-2 text-[10px] text-dim italic">
                        Depth {depth + 1}+ hidden here for readability. Everything still saves —
                        expand this branch in a fresh window if you need to dig further.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

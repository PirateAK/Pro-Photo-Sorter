// v1.6.0 — Shared pack editor used by BOTH the Tag Pack Creator and PPS's Tag Manager.
// Role-first entry (Category · Folder · Sub-Folder · Filename), waterfall display,
// tag box, arrow-key navigation, right-click icon picker.
import React, { useMemo, useRef, useState, useEffect } from "react";
import * as Lucide from "lucide-react";
import { toast } from "sonner";
import { uid } from "../lib/storage";
import { BUILTIN_ICONS } from "../lib/builtinIcons";

const PASTE_CAP = 20;
const ROLE_LABEL = { category: "Category", folder: "Folder", subfolder: "Sub-Folder", filename: "Filename" };

const newNode = (name, extra = {}) => ({ id: uid("sf"), name: name.slice(0, 60), iconType: "lucide", iconName: "Folder", filenameItems: [], subfolders: [], ...extra });
const newTag = (label, extra = {}) => ({ id: uid("it"), label: label.slice(0, 60), iconType: "lucide", iconName: "Tag", ...extra });

// ── tree helpers (immutable) ─────────────────────────────────────────────
function findPath(nodes, id, path = []) {
  for (const n of nodes || []) {
    if (n.id === id) return [...path, n];
    const deeper = findPath(n.subfolders, id, [...path, n]);
    if (deeper) return deeper;
  }
  return null;
}
function updateNode(nodes, id, fn) {
  return (nodes || []).map((n) => (n.id === id ? fn(n) : { ...n, subfolders: updateNode(n.subfolders, id, fn) }));
}
function removeNode(nodes, id) {
  return (nodes || []).filter((n) => n.id !== id).map((n) => ({ ...n, subfolders: removeNode(n.subfolders, id) }));
}
function flatten(nodes, depth = 0, out = []) {
  for (const n of nodes || []) { out.push({ node: n, depth }); flatten(n.subfolders, depth + 1, out); }
  return out;
}
function allTags(pack) {
  const out = [...(pack.filenameItems || []).map((t) => ({ tag: t, ownerId: null, ownerName: pack.name }))];
  for (const { node } of flatten(pack.subfolders)) for (const t of node.filenameItems || []) out.push({ tag: t, ownerId: node.id, ownerName: node.name });
  return out;
}
function moveInList(list, fromId, toId) {
  const a = list.findIndex((x) => x.id === fromId), b = list.findIndex((x) => x.id === toId);
  if (a < 0 || b < 0 || a === b) return list;
  const next = [...list]; const [it] = next.splice(a, 1); next.splice(b, 0, it); return next;
}
const splitEntries = (text) => text.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).filter((v, i, arr) => arr.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i);

// ── small UI bits ────────────────────────────────────────────────────────
function Icon({ item, size = 13 }) {
  if (item?.iconType === "image" && item.iconData) return <img src={item.iconData} alt="" style={{ width: size, height: size }} className="rounded-sm object-cover" />;
  const C = Lucide[item?.iconName] || Lucide.Tag;
  return <C size={size} />;
}

function Chip({ item, active, onClick, onRemove, onContext, draggable, onDragStart, onDragOver, onDrop, depth = 0, testId, muted }) {
  return (
    <div
      draggable={draggable}
      onDragStart={onDragStart} onDragOver={(e) => { e.preventDefault(); onDragOver?.(e); }} onDrop={onDrop}
      onClick={onClick} onContextMenu={(e) => { e.preventDefault(); onContext?.(e); }}
      className={`group inline-flex items-center gap-1.5 pl-2 pr-1 h-7 rounded border text-xs cursor-pointer select-none transition-colors ${active ? "border-primary-earth bg-primary-earth/15 text-primary-earth" : muted ? "border-app bg-app text-dim hover:bg-surface-hover" : "border-app bg-surface hover:bg-surface-hover"}`}
      style={depth ? { marginLeft: depth * 6 } : undefined}
      title={`${item.label || item.name} · right-click for icon / rename`}
      data-testid={testId}
    >
      {depth > 0 && <span className="text-dim font-mono text-[10px]">{"›".repeat(depth)}</span>}
      <Icon item={item} />
      <span className="max-w-[min(180px,40vw)] truncate font-mono">{item.label || item.name}</span>
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove(); }} className="w-4 h-4 rounded flex items-center justify-center text-dim opacity-0 group-hover:opacity-100 hover:text-[color:var(--danger)]" title="Remove"><Lucide.X size={11} /></button>
      )}
    </div>
  );
}

function IconPicker({ target, onPick, onRename, onClose }) {
  const [q, setQ] = useState("");
  const [name, setName] = useState(target.label ?? target.name ?? "");
  const fileRef = useRef(null);
  const icons = BUILTIN_ICONS.filter((n) => n.toLowerCase().includes(q.toLowerCase()));
  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas"); c.width = c.height = 64;
        const ctx = c.getContext("2d"); const s = Math.max(64 / img.width, 64 / img.height);
        ctx.drawImage(img, (64 - img.width * s) / 2, (64 - img.height * s) / 2, img.width * s, img.height * s);
        onPick({ iconType: "image", iconName: "Image", iconData: c.toDataURL("image/png") });
      };
      img.src = r.result;
    };
    r.readAsDataURL(f);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" data-testid="tpc-icon-picker">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative pane rounded-lg shadow-2xl border border-app w-full max-w-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onRename(name)} className="flex-1 h-8 px-2 rounded bg-app border border-app text-sm font-mono" data-testid="tpc-picker-rename" />
          <button onClick={() => onRename(name)} className="h-8 px-3 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-medium">Rename</button>
        </div>
        <div className="flex items-center gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search icons…" className="flex-1 h-8 px-2 rounded bg-app border border-app text-sm" />
          <button onClick={() => fileRef.current?.click()} className="h-8 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover" data-testid="tpc-picker-upload"><Lucide.Image size={12} /> Your PNG</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
        </div>
        <div className="grid grid-cols-10 gap-1 max-h-64 overflow-y-auto">
          {icons.map((n) => { const C = Lucide[n]; if (!C) return null; return (
            <button key={n} onClick={() => onPick({ iconType: "lucide", iconName: n, iconData: undefined })} title={n} className={`h-9 rounded flex items-center justify-center hover:bg-surface-hover ${target.iconName === n && target.iconType !== "image" ? "bg-primary-earth/20 text-primary-earth" : ""}`} data-testid={`tpc-icon-${n}`}><C size={16} /></button>
          ); })}
        </div>
        <div className="flex justify-end"><button onClick={onClose} className="px-3 py-1.5 rounded text-xs text-dim hover:bg-surface-hover">Close</button></div>
      </div>
    </div>
  );
}


const iconPatch = (a) => (a?.iconType === "image" && a.iconData ? { iconType: "image", iconData: a.iconData, iconName: undefined } : { iconType: "lucide", iconName: a?.iconName || "Tag", iconData: undefined });
// props: pack, onCommit(fn,label), onTagRemoved?(tag, ownerName), armedIcon?, onConsumeArmed?(),
//        hideCategory? (PPS names categories in its left rail), textRef? (external focus)
export default function PackEditor({ pack, onCommit, onTagRemoved, armedIcon, onConsumeArmed, hideCategory = false, textRef: extRef, onRoleChange }) {
  const [role, setRoleState] = useState(hideCategory ? "folder" : "category");
  const [text, setText] = useState("");
  const [held, setHeld] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [picker, setPicker] = useState(null);
  const dragRef = useRef(null);
  const innerRef = useRef(null);
  const textRef = extRef || innerRef;
  const setRole = (r) => { setRoleState(r); onRoleChange?.(r); };
  const focus = () => setTimeout(() => textRef.current?.focus(), 0);
  const commit = (fn, label) => onCommit(fn, label);
  useEffect(() => { focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedPath = useMemo(() => (selectedId ? findPath(pack.subfolders, selectedId) : null), [pack, selectedId]);
  useEffect(() => { if (selectedId && !selectedPath) setSelectedId(null); }, [selectedId, selectedPath]);
  const owner = selectedPath ? selectedPath.at(-1) : pack;
  const depth = selectedPath ? selectedPath.length : 0;
  const pathPreview = `${[pack.name || "Category", ...(selectedPath || []).map((n) => n.name)].join("/")}/${(owner.filenameItems || [])[0]?.label || "filename_tag"}.jpg`;
  const canAct = text.trim().length > 0;

  const toggleRole = (r) => {
    if (r === "subfolder" && !selectedId) { toast("Pick a folder first", { description: "Click the folder the new sub-folder should live in." }); return; }
    setRole(r); focus();
  };
  const selectNode = (id) => {
    if (armedIcon && onConsumeArmed) { onConsumeArmed(); commit((p) => ({ ...p, subfolders: updateNode(p.subfolders, id, (n) => ({ ...n, ...iconPatch(armedIcon), ...(iconPatch(armedIcon).iconType === "lucide" ? { iconName: armedIcon.iconName || "Folder" } : {}) })) })); return; }
    if (selectedId === id) { const path = findPath(pack.subfolders, id); setSelectedId(path && path.length > 1 ? path[path.length - 2].id : null); }
    else { setSelectedId(id); if (role !== "subfolder") setRole("filename"); }
    focus();
  };
  const navKey = (e) => {
    if (text.length > 0 || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return false;
    e.preventDefault();
    const path = selectedPath || [];
    const siblings = path.length > 1 ? (path[path.length - 2].subfolders || []) : pack.subfolders;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      if (!siblings.length) return true;
      const idx = siblings.findIndex((n) => n.id === selectedId), step = e.key === "ArrowRight" ? 1 : -1;
      const next = idx < 0 ? (step > 0 ? 0 : siblings.length - 1) : (idx + step + siblings.length) % siblings.length;
      setSelectedId(siblings[next].id); if (role !== "subfolder") setRole("filename");
    } else if (e.key === "ArrowDown") {
      const kids = selectedId ? (path.at(-1)?.subfolders || []) : pack.subfolders;
      if (kids.length) { setSelectedId(kids[0].id); if (role !== "subfolder") setRole("filename"); }
    } else { setSelectedId(path.length > 1 ? path[path.length - 2].id : null); if (path.length <= 1 && role === "subfolder") setRole("folder"); }
    return true;
  };
  const apply = (entriesIn) => {
    const all = entriesIn ?? splitEntries(text);
    if (!all.length || !role) return;
    const now = all.slice(0, PASTE_CAP), rest = all.slice(PASTE_CAP);
    if (rest.length) setHeld((h) => [...h, ...rest]);
    if (role === "category") { commit((p) => ({ ...p, name: now[0].slice(0, 60) })); setRole("folder"); }
    else if (role === "folder") commit((p) => ({ ...p, subfolders: [...p.subfolders, ...now.map((n) => newNode(n))] }));
    else if (role === "subfolder") { const nodes = now.map((n) => newNode(n)); commit((p) => selectedId ? { ...p, subfolders: updateNode(p.subfolders, selectedId, (n) => ({ ...n, subfolders: [...(n.subfolders || []), ...nodes] })) } : { ...p, subfolders: [...p.subfolders, ...nodes] }); }
    else { const tags = now.map((l) => newTag(l)); commit((p) => selectedId ? { ...p, subfolders: updateNode(p.subfolders, selectedId, (n) => ({ ...n, filenameItems: [...(n.filenameItems || []), ...tags] })) } : { ...p, filenameItems: [...(p.filenameItems || []), ...tags] }); }
    setText(""); focus();
    if (rest.length) toast(`Added ${now.length} — ${rest.length} more held`, { description: "Click “Add the rest” when you're ready." });
  };
  const addHeld = () => { const next = held.slice(0, PASTE_CAP); setHeld(held.slice(PASTE_CAP)); apply(next); };

  const removeFolder = (id) => commit((p) => ({ ...p, subfolders: removeNode(p.subfolders, id) }), "Folder removed — Undo available");
  const removeTag = (ownerId, tagId) => {
    const own = ownerId ? findPath(pack.subfolders, ownerId)?.at(-1) : pack;
    const tag = (own?.filenameItems || []).find((t) => t.id === tagId);
    if (tag && onTagRemoved) onTagRemoved(tag, own?.name, ownerId);
    commit((p) => ownerId ? { ...p, subfolders: updateNode(p.subfolders, ownerId, (n) => ({ ...n, filenameItems: n.filenameItems.filter((t) => t.id !== tagId) })) } : { ...p, filenameItems: (p.filenameItems || []).filter((t) => t.id !== tagId) });
  };
  const reorderSiblings = (fromId, toId) => {
    const pf = findPath(pack.subfolders, fromId), pt = findPath(pack.subfolders, toId);
    if (!pf || !pt) return;
    const parentF = pf.length > 1 ? pf[pf.length - 2].id : null, parentT = pt.length > 1 ? pt[pt.length - 2].id : null;
    if (parentF !== parentT) return;
    commit((p) => parentF ? { ...p, subfolders: updateNode(p.subfolders, parentF, (n) => ({ ...n, subfolders: moveInList(n.subfolders, fromId, toId) })) } : { ...p, subfolders: moveInList(p.subfolders, fromId, toId) });
  };
  const reorderTags = (ownerId, fromId, toId) => commit((p) => ownerId ? { ...p, subfolders: updateNode(p.subfolders, ownerId, (n) => ({ ...n, filenameItems: moveInList(n.filenameItems, fromId, toId) })) } : { ...p, filenameItems: moveInList(p.filenameItems, fromId, toId) });
  const copyTagToFolder = (tag, toId) => commit((p) => ({ ...p, subfolders: updateNode(p.subfolders, toId, (n) => n.filenameItems.some((t) => t.label.toLowerCase() === tag.label.toLowerCase()) ? n : ({ ...n, filenameItems: [...n.filenameItems, newTag(tag.label, { iconType: tag.iconType, iconName: tag.iconName, iconData: tag.iconData })] })) }), `“${tag.label}” added`);

  const pickerTarget = useMemo(() => {
    if (!picker) return null;
    if (picker.kind === "pack") return { name: pack.name, iconName: pack.iconName, iconType: pack.iconType };
    if (picker.kind === "node") return findPath(pack.subfolders, picker.id)?.at(-1);
    const own = picker.ownerId ? findPath(pack.subfolders, picker.ownerId)?.at(-1) : pack;
    return (own?.filenameItems || []).find((t) => t.id === picker.id);
  }, [picker, pack]);
  const patchTarget = (patch) => commit((p) => {
    if (picker.kind === "pack") return { ...p, ...patch };
    if (picker.kind === "node") return { ...p, subfolders: updateNode(p.subfolders, picker.id, (n) => ({ ...n, ...patch })) };
    const fn = (list) => list.map((t) => (t.id === picker.id ? { ...t, ...patch } : t));
    return picker.ownerId ? { ...p, subfolders: updateNode(p.subfolders, picker.ownerId, (n) => ({ ...n, filenameItems: fn(n.filenameItems) })) } : { ...p, filenameItems: fn(p.filenameItems || []) };
  });
  const tagClick = (ownerId, tagId) => {
    if (armedIcon && onConsumeArmed) { onConsumeArmed(); const fn = (l) => l.map((t) => (t.id === tagId ? { ...t, ...iconPatch(armedIcon) } : t)); commit((p) => ownerId ? { ...p, subfolders: updateNode(p.subfolders, ownerId, (n) => ({ ...n, filenameItems: fn(n.filenameItems) })) } : { ...p, filenameItems: fn(p.filenameItems || []) }); return true; }
    return false;
  };

  const levels = [{ parent: null, label: "Folders", nodes: pack.subfolders || [], activeId: selectedPath?.[0]?.id || null }];
  (selectedPath || []).forEach((n, i) => levels.push({ parent: n, label: `Sub-folders · ${n.name}`, nodes: n.subfolders || [], activeId: selectedPath[i + 1]?.id || null }));
  const library = allTags(pack);
  const RoleBtn = ({ r, children }) => (
    <button onClick={() => toggleRole(r)} className={`h-9 px-4 rounded-full border text-sm font-medium transition-colors ${role === r ? "bg-primary-earth text-[color:var(--text-inverse)] border-primary-earth" : r === "subfolder" && !selectedId ? "border-app bg-surface text-dim opacity-50" : "border-app bg-surface hover:bg-surface-hover"}`} data-testid={`tpc-role-${r}`}>{children}</button>
  );

  return (
    <div className="space-y-4" data-testid="pack-editor">
      <section className="flex flex-wrap items-center gap-2" data-testid="tpc-role-row">
        {!hideCategory && <RoleBtn r="category">Category</RoleBtn>}
        <RoleBtn r="folder">Folder</RoleBtn>
        <div className="flex items-center">
          <RoleBtn r="subfolder">Sub-Folder</RoleBtn>
          <span title={selectedId ? `New sub-folders go inside “${owner.name}” (level ${depth})` : "Highlight a folder to nest inside it"} className={`ml-1 h-9 w-9 rounded-full border font-mono text-sm flex items-center justify-center ${selectedId ? "bg-primary-earth/20 border-primary-earth text-primary-earth" : "border-app text-dim"}`} data-testid="tpc-depth">{selectedId ? depth : "·"}</span>
        </div>
        <RoleBtn r="filename">Filename</RoleBtn>
        <span className="text-xs text-dim ml-2" data-testid="tpc-hint">
          {!role ? "Pick where the text goes, then type" : ((pack.subfolders || []).length > 0 && text.length === 0 && role !== "category") ? "← → pick a folder · ↓ into it · ↑ back out · then type" : role === "category" ? "Type the category (pack) name" : role === "folder" ? "Type folder names — commas add several" : role === "subfolder" ? `Type sub-folder names → inside “${owner.name}”` : `Type filename tags → ${owner === pack ? "category level" : `inside “${owner.name}”`}`}
        </span>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <input ref={textRef} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (navKey(e)) return; if (e.key === "Enter" && role) apply(); }}
            placeholder={role ? `${ROLE_LABEL[role]} name — or paste a comma-separated list (20 at a time)` : "Choose Folder, Sub-Folder or Filename above first"} className="flex-1 min-w-0 h-10 px-3 rounded bg-surface border border-app text-sm font-mono" data-testid="tpc-text" />
          <button onClick={() => apply()} disabled={!canAct || !role} className="h-10 px-4 rounded bg-primary-earth text-[color:var(--text-inverse)] text-sm font-medium disabled:opacity-35" data-testid="tpc-add">Add</button>
        </div>
        {held.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 rounded border border-primary-earth/60 bg-primary-earth/10 text-xs" data-testid="tpc-held">
            <span><b>{held.length}</b> item{held.length === 1 ? "" : "s"} held from your paste (first {PASTE_CAP} were added).</span>
            <div className="flex gap-2">
              <button onClick={addHeld} disabled={!role} className="px-2.5 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] font-medium disabled:opacity-35" data-testid="tpc-held-add">Add the rest{held.length > PASTE_CAP ? ` (next ${PASTE_CAP})` : ""}</button>
              <button onClick={() => setHeld([])} className="px-2.5 py-1 rounded border border-app text-dim">Discard</button>
            </div>
          </div>
        )}
      </section>

      <div className="font-mono text-xs px-3 py-2 rounded border border-app bg-surface flex items-center gap-2" data-testid="tpc-path-preview">
        <Lucide.FolderTree size={12} className="text-primary-earth" /> <span className="text-dim">Will store to:</span> <span className="text-primary-earth">{pathPreview}</span>
      </div>

      <section className="rounded-lg border border-app bg-surface divide-y divide-[color:var(--border)]" data-testid="tpc-display">
        <div className="px-3 py-2 flex items-center gap-3">
          <span className="w-28 shrink-0 text-[10px] uppercase tracking-wider text-dim">Category</span>
          {pack.name ? <Chip item={{ label: pack.name, iconName: pack.iconName || "FolderTree", iconType: pack.iconType, iconData: pack.iconData }} active={!selectedId} onClick={() => { setSelectedId(null); if (role === "subfolder") setRole("folder"); focus(); }} onContext={() => setPicker({ kind: "pack" })} testId="tpc-category-chip" /> : <span className="text-xs text-dim italic">Press Category, type a name, Add</span>}
        </div>
        {levels.map((lvl, li) => (
          <div key={lvl.parent?.id || "root"} className="px-3 py-2 flex items-start gap-3" data-testid={`tpc-level-${li}`}>
            <span className="w-28 shrink-0 pt-1.5 text-[10px] uppercase tracking-wider text-dim truncate" title={lvl.label}>{lvl.label}</span>
            <div className="flex flex-wrap gap-1.5 min-h-[28px] min-w-0 flex-1" data-testid={li === 0 ? "tpc-folder-row" : `tpc-subfolder-row-${li}`}>
              {lvl.nodes.length === 0 && <span className="text-xs text-dim italic pt-1">{li === 0 ? "Press Folder, type names, Add" : `No sub-folders in “${lvl.parent.name}” — press Sub-Folder to nest some`}</span>}
              {lvl.nodes.map((node) => (
                <Chip key={node.id} item={node} active={lvl.activeId === node.id} draggable onClick={() => selectNode(node.id)} onRemove={() => removeFolder(node.id)} onContext={() => setPicker({ kind: "node", id: node.id })}
                  onDragStart={(e) => { dragRef.current = { kind: "node", id: node.id }; e.dataTransfer.effectAllowed = "move"; }}
                  onDrop={() => { const d0 = dragRef.current; dragRef.current = null; if (!d0) return; if (d0.kind === "node") reorderSiblings(d0.id, node.id); if (d0.kind === "tag") copyTagToFolder(d0.tag, node.id); }}
                  testId={`tpc-folder-${node.id}`} />
              ))}
            </div>
          </div>
        ))}
        <div className="px-3 py-2 flex items-start gap-3">
          <span className="w-28 shrink-0 pt-1.5 text-[10px] uppercase tracking-wider text-dim truncate">Filenames · {owner === pack ? "category" : owner.name}</span>
          <div className="flex flex-wrap gap-1.5 min-h-[28px] min-w-0 flex-1" data-testid="tpc-filename-row">
            {(owner.filenameItems || []).length === 0 && <span className="text-xs text-dim italic pt-1">No filename tags here yet</span>}
            {(owner.filenameItems || []).map((t) => (
              <Chip key={t.id} item={t} draggable onClick={() => tagClick(selectedId, t.id)} onRemove={() => removeTag(selectedId, t.id)} onContext={() => setPicker({ kind: "tag", id: t.id, ownerId: selectedId })}
                onDragStart={(e) => { dragRef.current = { kind: "tag", id: t.id, ownerId: selectedId, tag: t }; e.dataTransfer.effectAllowed = "copyMove"; }}
                onDrop={() => { const d0 = dragRef.current; dragRef.current = null; if (d0?.kind === "tag" && d0.ownerId === selectedId) reorderTags(selectedId, d0.id, t.id); }}
                testId={`tpc-tag-${t.id}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-app bg-surface p-3" data-testid="tpc-library">
        <div className="flex items-center justify-between mb-2 gap-3">
          <div className="text-[10px] uppercase tracking-wider text-dim">Tag box · every filename tag in this pack ({library.length})</div>
          <div className="text-[11px] text-dim text-right">Drag a tag onto a folder to add it there · click a tag to jump to its folder · right-click to rename / set icon</div>
        </div>
        <div className="flex flex-wrap gap-1.5 min-h-[32px]">
          {library.length === 0 && <span className="text-xs text-dim italic">Filename tags you add show up here</span>}
          {library.map(({ tag, ownerId }) => (
            <Chip key={tag.id} item={tag} muted draggable onRemove={() => removeTag(ownerId, tag.id)} onContext={() => setPicker({ kind: "tag", id: tag.id, ownerId })}
              onClick={() => { if (!tagClick(ownerId, tag.id)) { setSelectedId(ownerId); focus(); } }} onDragStart={(e) => { dragRef.current = { kind: "tag", id: tag.id, ownerId, tag }; e.dataTransfer.effectAllowed = "copy"; }}
              testId={`tpc-lib-${tag.id}`} />
          ))}
        </div>
      </section>

      {picker && pickerTarget && (
        <IconPicker target={pickerTarget} onClose={() => setPicker(null)}
          onPick={(patch) => { patchTarget(patch); setPicker(null); }}
          onRename={(nm) => { const v = nm.trim(); if (!v) return; patchTarget(picker.kind === "tag" ? { label: v.slice(0, 60) } : { name: v.slice(0, 60) }); setPicker(null); }} />
      )}
    </div>
  );
}

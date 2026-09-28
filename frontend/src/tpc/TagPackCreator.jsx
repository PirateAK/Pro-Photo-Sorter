// v1.5.0 — Tag Pack Creator (TPC). Standalone authoring app for
// .pps-tagpack.json files. Lives in the same React bundle as PPS (route
// #/tpc) so it shares the pack schema, icon list and merge rules.
import React, { useMemo, useRef, useState, useEffect } from "react";
import * as Lucide from "lucide-react";
import { Toaster, toast } from "sonner";
import { uid } from "../lib/storage";
import { serializeCategory, deserializePack, countPack } from "../lib/packFormat";
import { BUILTIN_ICONS } from "../components/CategoryManager";
import { isElectron, tpcInstallPack, tpcSavePack } from "../lib/electronBridge";
import buildInfo from "../buildInfo.json";
import { renderPreviewCard } from "./previewCard";

const PASTE_CAP = 20;
const ROLES = ["category", "folder", "subfolder", "filename"];
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


const LINKS = {
  gumroad: "https://muskegman.gumroad.com/l/gvmaas",
  site: "https://muskegman.com",
  releases: "https://github.com/PirateAK/Pro-Photo-Sorter/releases/latest",
  creator: "https://muskegman.gumroad.com/l/PPS-TPC",
};
// Opens in the system browser inside Electron, new tab in the browser.
const openLink = (url) => { if (window.electronAPI?.openExternal) window.electronAPI.openExternal(url); else window.open(url, "_blank", "noopener"); };

function AboutDialog({ onClose }) {
  const Link = ({ href, children, primary, testId }) => (
    <button onClick={() => openLink(href)} data-testid={testId}
      className={`h-9 px-3 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${primary ? "bg-primary-earth text-[color:var(--text-inverse)] hover:opacity-90" : "border border-app hover:bg-surface-hover"}`}>
      {children} <Lucide.ExternalLink size={11} />
    </button>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" data-testid="tpc-about-dialog">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative pane rounded-lg shadow-2xl border border-app w-full max-w-xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-earth flex items-center justify-center text-[color:var(--text-inverse)]"><Lucide.Package size={20} /></div>
            <div>
              <h2 className="font-heading font-bold text-base leading-tight">Tag Pack Creator</h2>
              <div className="text-[11px] text-dim font-mono">v{buildInfo.version} · free companion to Pro Photo Sorter</div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover" data-testid="tpc-about-close"><Lucide.X size={16} /></button>
        </div>

        <div className="text-sm space-y-3 leading-relaxed">
          <p>
            This tool builds <span className="font-mono text-xs">.pps-tagpack.json</span> files — the tag libraries that
            <b> Pro Photo Sorter</b> uses to file thousands of photos with a click, a drag and one key. Make a pack for your
            niche, share it with friends, sell it, or install it straight into your own copy of PPS.
          </p>
          <div className="rounded-lg border border-app bg-app p-3 space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-dim">About Pro Photo Sorter</div>
            <p className="text-dim text-[13px]">
              An offline Windows photo organizer for photographers who shoot more than they type. Unlimited nested tag
              folders, side-by-side compare, a built-in editor, print-ready resize and Lightroom-compatible XMP sidecars —
              so the culling you do on a memory card in the field shows up in Lightroom already rated and tagged.
              No cloud, no subscription, no telemetry. <b>$29 once.</b> Free full-featured trial.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href={LINKS.gumroad} primary testId="tpc-about-gumroad"><Lucide.ShoppingBag size={12} /> Get Pro Photo Sorter on Gumroad</Link>
              <Link href={LINKS.releases} testId="tpc-about-trial"><Lucide.Download size={12} /> Free trial</Link>
              <Link href={LINKS.site} testId="tpc-about-site"><Lucide.Globe size={12} /> muskegman.com</Link>
            </div>
          </div>
          <div className="rounded-lg border border-app bg-app p-3 space-y-1.5">
            <div className="text-[10px] uppercase tracking-wider text-dim">Who made this</div>
            <p className="text-dim text-[13px]">
              I'm <b>Captain Kurt</b> — wildlife and sports photographer, working weeks at a time off a ship in Alaska
              where the internet isn't worth the name. I built Pro Photo Sorter because Lightroom's cloud features were
              useless out there and every other tool made me type folder names by hand — thousands of times. Then I broke
              my back and both elbows, and typing went from tedious to painful. So sorting became a click, a drag and one
              key. This Creator exists so <em>you</em> can build the tag libraries you wish someone had already made.
            </p>
            <p className="text-dim text-[13px]">Questions, bugs, pack ideas: <button onClick={() => openLink("mailto:leaderteamk@gmail.com")} className="text-primary-earth underline-offset-2 hover:underline">leaderteamk@gmail.com</button></p>
            <p className="text-[12px] text-dim italic">Fair winds — Kurt</p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link href={LINKS.creator} testId="tpc-about-creator"><Lucide.Gift size={12} /> Tag Pack Creator on Gumroad (free — share this link)</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── main app ─────────────────────────────────────────────────────────────
export default function TagPackCreator() {
  const [pack, setPack] = useState(() => ({ id: uid("cat"), name: "", author: "", description: "", subfolders: [], filenameItems: [] }));
  const [role, setRole] = useState(null);
  const [depth, setDepth] = useState(0);            // Sub-Folder nesting digit (0 = off)
  const [text, setText] = useState("");
  const [held, setHeld] = useState([]);             // overflow from a >20 paste
  const [selectedId, setSelectedId] = useState(null); // highlighted folder node
  const [lastCreated, setLastCreated] = useState([]); // chain of most recently created folders by depth
  const [picker, setPicker] = useState(null);       // { kind: "node"|"tag"|"pack", id, ownerId }
  const [undo, setUndo] = useState([]);              // stack of previous packs
  const [title, setTitle] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [theme, setTheme] = useState(() => { try { return window.localStorage.getItem("tpc.theme") || "dark"; } catch { return "dark"; } });
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); try { window.localStorage.setItem("tpc.theme", theme); } catch { /* private mode */ } }, [theme]);
  const dragRef = useRef(null);
  const fileRef = useRef(null);

  const commit = (fn, label) => { setUndo((u) => [...u.slice(-29), pack]); setPack((p) => fn(p)); if (label) toast.success(label); };
  const doUndo = () => { if (!undo.length) return; const prev = undo[undo.length - 1]; setUndo((u) => u.slice(0, -1)); setPack(prev); toast("Undone"); };

  const selectedPath = useMemo(() => (selectedId ? findPath(pack.subfolders, selectedId) : null), [pack, selectedId]);
  const pathPreview = useMemo(() => {
    const parts = [pack.name || "Category", ...(selectedPath || []).map((n) => n.name)];
    const owner = selectedPath ? selectedPath[selectedPath.length - 1] : pack;
    const firstTag = (owner.filenameItems || [])[0]?.label || "filename_tag";
    return `${parts.join("/")}/${firstTag}.jpg`;
  }, [pack, selectedPath]);

  const canAct = text.trim().length > 0;
  const toggleRole = (r) => { if (!canAct && role !== r) return; if (role === r) { setRole(null); if (r === "subfolder") setDepth(0); } else { setRole(r); if (r === "subfolder" && depth === 0) setDepth(1); } };
  const bumpDepth = () => { if (role !== "subfolder") { if (!canAct) return; setRole("subfolder"); setDepth(1); return; } setDepth((d) => Math.min(d + 1, Math.max(1, lastCreated.length + 1))); };

  // Apply the typed text with the active role. Returns how many were added.
  const apply = (entriesIn) => {
    const all = entriesIn ?? splitEntries(text);
    if (!all.length || !role) return;
    const now = all.slice(0, PASTE_CAP), rest = all.slice(PASTE_CAP);
    if (rest.length) setHeld((h) => [...h, ...rest]);
    if (role === "category") { commit((p) => ({ ...p, name: now[0].slice(0, 60) })); if (!title) setTitle(now[0]); }
    else if (role === "folder") {
      const nodes = now.map((n) => newNode(n));
      commit((p) => ({ ...p, subfolders: [...p.subfolders, ...nodes] }));
      setLastCreated([nodes[nodes.length - 1]?.id]); setSelectedId(nodes[nodes.length - 1]?.id);
    } else if (role === "subfolder") {
      const parentId = lastCreated[depth - 1];
      const nodes = now.map((n) => newNode(n));
      if (!parentId) { commit((p) => ({ ...p, subfolders: [...p.subfolders, ...nodes] })); setLastCreated([nodes.at(-1).id]); }
      else { commit((p) => ({ ...p, subfolders: updateNode(p.subfolders, parentId, (n) => ({ ...n, subfolders: [...(n.subfolders || []), ...nodes] })) })); setLastCreated((c) => [...c.slice(0, depth), nodes.at(-1).id]); }
      setSelectedId(nodes.at(-1).id);
    } else if (role === "filename") {
      const tags = now.map((l) => newTag(l));
      commit((p) => selectedId
        ? { ...p, subfolders: updateNode(p.subfolders, selectedId, (n) => ({ ...n, filenameItems: [...(n.filenameItems || []), ...tags] })) }
        : { ...p, filenameItems: [...(p.filenameItems || []), ...tags] });
    }
    setText("");
    if (rest.length) toast(`Added ${now.length} — ${rest.length} more held`, { description: "Click “Add the rest” when you're ready." });
  };
  const addHeld = () => { const next = held.slice(0, PASTE_CAP); setHeld(held.slice(PASTE_CAP)); apply(next); };

  // ── removals / reorder ──
  const removeFolder = (id) => commit((p) => ({ ...p, subfolders: removeNode(p.subfolders, id) }), "Folder removed — Undo available");
  const removeTag = (ownerId, tagId) => commit((p) => ownerId
    ? { ...p, subfolders: updateNode(p.subfolders, ownerId, (n) => ({ ...n, filenameItems: n.filenameItems.filter((t) => t.id !== tagId) })) }
    : { ...p, filenameItems: p.filenameItems.filter((t) => t.id !== tagId) });
  const reorderSiblings = (fromId, toId) => {
    const pf = findPath(pack.subfolders, fromId), pt = findPath(pack.subfolders, toId);
    if (!pf || !pt) return;
    const parentF = pf.length > 1 ? pf[pf.length - 2].id : null, parentT = pt.length > 1 ? pt[pt.length - 2].id : null;
    if (parentF !== parentT) return; // only reorder among siblings
    commit((p) => parentF ? { ...p, subfolders: updateNode(p.subfolders, parentF, (n) => ({ ...n, subfolders: moveInList(n.subfolders, fromId, toId) })) } : { ...p, subfolders: moveInList(p.subfolders, fromId, toId) });
  };
  const reorderTags = (ownerId, fromId, toId) => commit((p) => ownerId
    ? { ...p, subfolders: updateNode(p.subfolders, ownerId, (n) => ({ ...n, filenameItems: moveInList(n.filenameItems, fromId, toId) })) }
    : { ...p, filenameItems: moveInList(p.filenameItems, fromId, toId) });
  const copyTagToFolder = (tag, toId) => commit((p) => ({ ...p, subfolders: updateNode(p.subfolders, toId, (n) => n.filenameItems.some((t) => t.label.toLowerCase() === tag.label.toLowerCase()) ? n : ({ ...n, filenameItems: [...n.filenameItems, newTag(tag.label, { iconType: tag.iconType, iconName: tag.iconName, iconData: tag.iconData })] })) }), `“${tag.label}” added`);

  // ── icon picker plumbing ──
  const pickerTarget = useMemo(() => {
    if (!picker) return null;
    if (picker.kind === "pack") return { name: pack.name, iconName: pack.iconName, iconType: pack.iconType };
    if (picker.kind === "node") return findPath(pack.subfolders, picker.id)?.at(-1);
    const owner = picker.ownerId ? findPath(pack.subfolders, picker.ownerId)?.at(-1) : pack;
    return (owner?.filenameItems || []).find((t) => t.id === picker.id);
  }, [picker, pack]);
  const patchTarget = (patch) => commit((p) => {
    if (picker.kind === "pack") return { ...p, ...patch };
    if (picker.kind === "node") return { ...p, subfolders: updateNode(p.subfolders, picker.id, (n) => ({ ...n, ...patch })) };
    const fn = (list) => list.map((t) => (t.id === picker.id ? { ...t, ...patch } : t));
    return picker.ownerId ? { ...p, subfolders: updateNode(p.subfolders, picker.ownerId, (n) => ({ ...n, filenameItems: fn(n.filenameItems) })) } : { ...p, filenameItems: fn(p.filenameItems) };
  });

  // ── file I/O ──
  const safeTitle = () => (title || pack.name || "tag-pack").replace(/[^\w\-]+/g, "_").slice(0, 60);
  const packJson = () => JSON.stringify(serializeCategory({ ...pack, name: pack.name || title || "Untitled pack" }, { author: pack.author, description: pack.description }), null, 2);
  const download = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([packJson()], { type: "application/json" })); a.download = `${safeTitle()}.pps-tagpack.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  const save = async () => {
    if (!pack.name && !title) { toast.error("Give the pack a title first"); return; }
    const res = await tpcSavePack(`${safeTitle()}.pps-tagpack.json`, packJson());
    if (res.ok) toast.success("Pack saved", { description: res.path }); else if (res.error === "not-electron") { download(); toast.success("Pack downloaded"); } else if (res.error !== "cancelled") toast.error("Save failed", { description: res.error });
    if (held.length && window.confirm(`Do you want to paste the rest of the list? (+${held.length} items)`)) addHeld();
  };
  const install = async () => {
    if (!pack.name && !title) { toast.error("Give the pack a title first"); return; }
    const res = await tpcInstallPack(`${safeTitle()}.pps-tagpack.json`, packJson());
    if (res.ok) toast.success("Handed to Pro Photo Sorter", { description: "Open PPS → Tag Manager. It will offer to import this pack." });
    else if (res.error === "not-electron") { download(); toast("Downloaded instead", { description: "One-click install works in the desktop app. In PPS use Tag Manager → Import pack…" }); }
    else toast.error("Install failed", { description: res.error });
  };
  const openFile = async (f) => {
    if (!f) return;
    try { const cat = deserializePack(JSON.parse(await f.text()), uid); commit(() => ({ ...cat, filenameItems: [] })); setTitle(cat.name); setSelectedId(null); setLastCreated([]); toast.success(`Opened “${cat.name}”`); }
    catch (e) { toast.error("Couldn't open", { description: e.message }); }
  };
  const previewCard = async () => {
    try { const url = await renderPreviewCard({ ...pack, name: pack.name || title || "Untitled pack" }); const a = document.createElement("a"); a.href = url; a.download = `${safeTitle()}_cover.png`; a.click(); toast.success("Cover image downloaded", { description: "1280×720 PNG — drop it straight into Gumroad." }); }
    catch (e) { toast.error("Preview failed", { description: e.message }); }
  };

  const flat = flatten(pack.subfolders);
  const owner = selectedPath ? selectedPath.at(-1) : pack;
  const library = allTags(pack);
  const counts = countPack(pack);
  useEffect(() => { document.title = "Tag Pack Creator"; }, []);

  const RoleBtn = ({ r, children }) => (
    <button onClick={() => toggleRole(r)} disabled={!canAct && role !== r}
      className={`h-9 px-4 rounded-full border text-sm font-medium transition-colors disabled:opacity-35 ${role === r ? "bg-primary-earth text-[color:var(--text-inverse)] border-primary-earth" : "border-app bg-surface hover:bg-surface-hover"}`}
      data-testid={`tpc-role-${r}`}>{children}</button>
  );

  return (
    <div className="min-h-screen bg-app text-[color:var(--text)] font-body" data-testid="tpc-app">
      <Toaster position="bottom-right" theme={theme} richColors />
      <header className="px-[3vw] py-3 border-b border-app flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-earth flex items-center justify-center text-[color:var(--text-inverse)]"><Lucide.Package size={18} /></div>
          <div>
            <h1 className="font-heading font-bold text-lg leading-tight">Tag Pack Creator</h1>
            <div className="text-[11px] text-dim font-mono">v{buildInfo.version} · builds .pps-tagpack.json files for Pro Photo Sorter</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAboutOpen(true)} className="h-8 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover" data-testid="tpc-about"><Lucide.Info size={12} /> About</button>
          <button onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))} className="h-8 w-8 rounded border border-app flex items-center justify-center hover:bg-surface-hover" title={`Switch to ${theme === "light" ? "Earth Dark" : "Earth Light"}`} data-testid="tpc-toggle-theme">
            {theme === "light" ? <Lucide.Moon size={13} /> : <Lucide.Sun size={13} />}
          </button>
          <button onClick={() => fileRef.current?.click()} className="h-8 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover" data-testid="tpc-open"><Lucide.FolderOpen size={12} /> Open pack…</button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ""; }} data-testid="tpc-open-input" />
          <button onClick={doUndo} disabled={!undo.length} className="h-8 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover disabled:opacity-35" data-testid="tpc-undo"><Lucide.Undo2 size={12} /> Undo{undo.length ? ` · ${undo.length}` : ""}</button>
        </div>
      </header>

      <main className="w-full px-[3vw] py-5 space-y-4" style={{ maxWidth: "min(100%, 1600px)", margin: "0 auto" }}>
        {/* Role buttons */}
        <section className="flex flex-wrap items-center gap-2" data-testid="tpc-role-row">
          <RoleBtn r="category">Category</RoleBtn>
          <RoleBtn r="folder">Folder</RoleBtn>
          <div className="flex items-center">
            <RoleBtn r="subfolder">Sub-Folder</RoleBtn>
            <button onClick={bumpDepth} disabled={!canAct && role !== "subfolder"} title="Nesting depth — click again to nest one level deeper under the most recently created sub-folder"
              className={`ml-1 h-9 w-9 rounded-full border font-mono text-sm disabled:opacity-35 ${depth > 0 ? "bg-primary-earth/20 border-primary-earth text-primary-earth" : "border-app text-dim"}`} data-testid="tpc-depth">{depth > 0 ? depth : "·"}</button>
          </div>
          <RoleBtn r="filename">Filename</RoleBtn>
          <span className="text-xs text-dim ml-2">{canAct ? (role ? `Press Enter to add as ${ROLE_LABEL[role]}${role === "subfolder" ? ` (depth ${depth})` : ""}` : "Pick what the text becomes") : "Type below to enable"}</span>
        </section>

        {/* Path preview */}
        <div className="font-mono text-xs px-3 py-2 rounded border border-app bg-surface flex items-center gap-2" data-testid="tpc-path-preview">
          <Lucide.FolderTree size={12} className="text-primary-earth" /> <span className="text-dim">Will store to:</span> <span className="text-primary-earth">{pathPreview}</span>
        </div>

        {/* Tag display */}
        <section className="rounded-lg border border-app bg-surface divide-y divide-[color:var(--border)]" data-testid="tpc-display">
          <div className="px-3 py-2 flex items-center gap-3">
            <span className="w-24 text-[10px] uppercase tracking-wider text-dim">Category</span>
            {pack.name ? <Chip item={{ label: pack.name, iconName: pack.iconName || "FolderTree", iconType: pack.iconType, iconData: pack.iconData }} active={!selectedId} onClick={() => setSelectedId(null)} onContext={() => setPicker({ kind: "pack" })} testId="tpc-category-chip" /> : <span className="text-xs text-dim italic">Type a name, press Category</span>}
          </div>
          <div className="px-3 py-2 flex items-start gap-3">
            <span className="w-24 pt-1.5 text-[10px] uppercase tracking-wider text-dim shrink-0">Sub-folders</span>
            <div className="flex flex-wrap gap-1.5 min-h-[28px] min-w-0 flex-1" data-testid="tpc-folder-row">
              {flat.length === 0 && <span className="text-xs text-dim italic pt-1">Folder = top level · Sub-Folder (n) = nested under the last one you made</span>}
              {flat.map(({ node, depth: d }) => (
                <Chip key={node.id} item={node} depth={d} active={selectedId === node.id} draggable
                  onClick={() => setSelectedId(node.id)} onRemove={() => removeFolder(node.id)} onContext={() => setPicker({ kind: "node", id: node.id })}
                  onDragStart={(e) => { dragRef.current = { kind: "node", id: node.id }; e.dataTransfer.effectAllowed = "move"; }}
                  onDrop={() => { const d0 = dragRef.current; dragRef.current = null; if (!d0) return; if (d0.kind === "node") reorderSiblings(d0.id, node.id); if (d0.kind === "tag") copyTagToFolder(d0.tag, node.id); }}
                  testId={`tpc-folder-${node.id}`} />
              ))}
            </div>
          </div>
          <div className="px-3 py-2 flex items-start gap-3">
            <span className="w-24 pt-1.5 text-[10px] uppercase tracking-wider text-dim shrink-0">Filename · {owner === pack ? "category" : owner.name}</span>
            <div className="flex flex-wrap gap-1.5 min-h-[28px] min-w-0 flex-1" data-testid="tpc-filename-row">
              {(owner.filenameItems || []).length === 0 && <span className="text-xs text-dim italic pt-1">No filename tags here yet</span>}
              {(owner.filenameItems || []).map((t) => (
                <Chip key={t.id} item={t} draggable onRemove={() => removeTag(selectedId, t.id)} onContext={() => setPicker({ kind: "tag", id: t.id, ownerId: selectedId })}
                  onDragStart={(e) => { dragRef.current = { kind: "tag", id: t.id, ownerId: selectedId, tag: t }; e.dataTransfer.effectAllowed = "copyMove"; }}
                  onDrop={() => { const d0 = dragRef.current; dragRef.current = null; if (d0?.kind === "tag" && d0.ownerId === selectedId) reorderTags(selectedId, d0.id, t.id); }}
                  testId={`tpc-tag-${t.id}`} />
              ))}
            </div>
          </div>
        </section>

        {/* Text entry */}
        <section className="space-y-2">
          <div className="flex items-center gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && role) apply(); }}
              placeholder="Type a tag name — or paste a comma-separated list (20 at a time)" className="flex-1 min-w-0 h-10 px-3 rounded bg-surface border border-app text-sm font-mono" data-testid="tpc-text" />
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

        {/* Tag box library */}
        <section className="rounded-lg border border-app bg-surface p-3" data-testid="tpc-library">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] uppercase tracking-wider text-dim">Tag box · every filename tag in this pack ({library.length})</div>
            <div className="text-[11px] text-dim">Drag a tag onto a sub-folder to add it there · right-click to rename / set icon</div>
          </div>
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {library.length === 0 && <span className="text-xs text-dim italic">Filename tags you add show up here</span>}
            {library.map(({ tag, ownerId, ownerName }) => (
              <Chip key={tag.id} item={tag} muted draggable onRemove={() => removeTag(ownerId, tag.id)} onContext={() => setPicker({ kind: "tag", id: tag.id, ownerId })}
                onClick={() => setSelectedId(ownerId)} onDragStart={(e) => { dragRef.current = { kind: "tag", id: tag.id, ownerId, tag }; e.dataTransfer.effectAllowed = "copy"; }}
                testId={`tpc-lib-${tag.id}`} />
            ))}
          </div>
        </section>

        {/* Save row */}
        <section className="rounded-lg border border-app bg-surface p-3 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end" data-testid="tpc-save-row">
          <label className="text-xs text-dim">Pack title <span className="font-mono">(= file name)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={pack.name || "My Wildlife Pack"} className="mt-1 w-full h-9 px-3 rounded bg-app border border-app text-sm font-mono" data-testid="tpc-title" />
          </label>
          <label className="text-xs text-dim">Author <span className="font-mono">(optional, shows on the cover)</span>
            <input value={pack.author || ""} onChange={(e) => setPack((p) => ({ ...p, author: e.target.value }))} placeholder="Muskegman Photography" className="mt-1 w-full h-9 px-3 rounded bg-app border border-app text-sm" data-testid="tpc-author" />
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={previewCard} className="h-9 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover" title="1280×720 cover PNG for Gumroad" data-testid="tpc-cover"><Lucide.ImageDown size={12} /> Cover</button>
            <button onClick={install} className="h-9 px-3 rounded border border-primary-earth text-primary-earth text-xs flex items-center gap-1 hover:bg-primary-earth/10" title={isElectron() ? "Hand this pack to Pro Photo Sorter on this PC" : "In the desktop app this installs straight into PPS"} data-testid="tpc-install"><Lucide.Send size={12} /> Install into PPS</button>
            <button onClick={save} className="h-9 px-4 rounded bg-primary-earth text-[color:var(--text-inverse)] text-sm font-medium flex items-center gap-1" data-testid="tpc-save"><Lucide.Save size={13} /> Save</button>
          </div>
          <div className="md:col-span-3 text-[11px] text-dim font-mono">{counts.subfolders} sub-folder{counts.subfolders === 1 ? "" : "s"} · {library.length} filename tag{library.length === 1 ? "" : "s"} · format v4</div>
        </section>
      </main>

      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
      {picker && pickerTarget && (
        <IconPicker target={pickerTarget} onClose={() => setPicker(null)}
          onPick={(patch) => { patchTarget(patch); setPicker(null); }}
          onRename={(nm) => { const v = nm.trim(); if (!v) return; patchTarget(picker.kind === "tag" ? { label: v.slice(0, 60) } : { name: v.slice(0, 60) }); setPicker(null); }} />
      )}
    </div>
  );
}

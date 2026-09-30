// v1.7.0 — Tag Pack Shipper. Shared by PPS (Bundle… → Ship) and the Tag Pack
// Creator (Shipper… button). Several packs + up to 3 preview images + author
// and link in one .pps-shipper.json. ShipperPreview is what PPS shows before
// importing one.
import React, { useRef, useState } from "react";
import * as Lucide from "lucide-react";
import { toast } from "sonner";
import { uid } from "../lib/storage";
import { openExternal } from "../lib/electronBridge";
import { serializeShipper, deserializeShipper, deserializePack, isShipper, countPack, linkDomain, dataUrlBytes, SHIPPER_LIMITS } from "../lib/packFormat";
import { loadAuthorPrefs, saveAuthorPrefs } from "../lib/authorPrefs";

const kb = (b) => `${Math.round(b / 1024)} KB`;
const safeFile = (s) => String(s || "shipper").replace(/[^\w\-]+/g, "_").slice(0, 60) || "shipper";

// Resize to ≤ maxSide, re-encode as JPEG, step quality down until under the byte cap.
async function fitImage(file) {
  const src = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error(`${file.name} is not a readable image`)); i.src = src; });
  const s = Math.min(1, SHIPPER_LIMITS.maxSide / Math.max(img.width, img.height));
  const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s));
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  let q = 0.85, dataUrl = c.toDataURL("image/jpeg", q);
  while (dataUrlBytes(dataUrl) > SHIPPER_LIMITS.maxImageBytes && q > 0.4) { q -= 0.1; dataUrl = c.toDataURL("image/jpeg", q); }
  if (dataUrlBytes(dataUrl) > SHIPPER_LIMITS.maxImageBytes) throw new Error(`${file.name} is still over ${kb(SHIPPER_LIMITS.maxImageBytes)} after shrinking`);
  return { name: file.name, dataUrl, width: c.width, height: c.height };
}

const Field = ({ label, hint, children }) => (
  <label className="text-xs text-dim block">{label} {hint && <span className="font-mono">({hint})</span>}{children}</label>
);
const inputCls = "mt-1 w-full h-9 px-3 rounded bg-app border border-app text-sm";

function PackRow({ p, onRemove, badge, testId }) {
  const c = countPack(p);
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-app bg-app text-sm" data-testid={testId}>
      <Lucide.Package size={13} className="text-primary-earth shrink-0" />
      <span className="flex-1 truncate">{p.name}</span>
      {badge}
      <span className="text-[10px] text-dim font-mono shrink-0">{c.subfolders} folders · {c.tags} tags</span>
      {onRemove && <button onClick={onRemove} className="w-6 h-6 rounded flex items-center justify-center text-dim hover:text-[color:var(--danger)]" title="Remove from shipper"><Lucide.X size={12} /></button>}
    </div>
  );
}

// props: initial { title, author, link, description, images, packs (runtime categories) },
//        onClose, onSave(filename, json) → Promise|void, extraAction? { label, icon, run(filename, json) }
export default function ShipperDialog({ initial = {}, onClose, onSave, extraAction }) {
  const prefs = loadAuthorPrefs();
  const [title, setTitle] = useState(initial.title || "");
  const [author, setAuthor] = useState(initial.author || prefs.author);
  const [link, setLink] = useState(initial.link || prefs.link);
  const [description, setDescription] = useState(initial.description || prefs.description);
  const [images, setImages] = useState(initial.images || []);
  const [packs, setPacks] = useState(initial.packs || []);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef(null), packRef = useRef(null);

  const addImages = async (files) => {
    const room = SHIPPER_LIMITS.maxImages - images.length;
    if (room <= 0) { toast.error(`Up to ${SHIPPER_LIMITS.maxImages} images per shipper`); return; }
    const out = [];
    for (const f of Array.from(files).slice(0, room)) { try { out.push(await fitImage(f)); } catch (e) { toast.error("Image skipped", { description: e.message }); } }
    if (out.length) setImages((im) => [...im, ...out]);
    if (files.length > room) toast(`Only ${room} more image${room === 1 ? "" : "s"} fit — the rest were skipped`);
  };
  const addPacks = async (files) => {
    let added = 0;
    for (const f of Array.from(files)) {
      try {
        const data = JSON.parse(await f.text());
        const incoming = isShipper(data) ? deserializeShipper(data, uid).packs : [deserializePack(data, uid)];
        setPacks((ps) => [...ps, ...incoming.filter((p) => !ps.some((e) => e.name.toLowerCase() === p.name.toLowerCase()))]);
        added += incoming.length;
      } catch (e) { toast.error(`Couldn't read ${f.name}`, { description: e.message }); }
    }
    if (added) toast.success(`${added} pack${added === 1 ? "" : "s"} added`);
  };
  const build = () => {
    const json = JSON.stringify(serializeShipper({ title, author, link, description, images, packs }), null, 2);
    return { filename: `${safeFile(title || packs[0]?.name || "tag-packs")}.pps-shipper.json`, json };
  };
  const run = async (fn) => {
    if (!packs.length) { toast.error("Add at least one pack"); return; }
    setBusy(true);
    try { const { filename, json } = build(); saveAuthorPrefs({ author, link, description }); await fn(filename, json); } finally { setBusy(false); }
  };
  const imgBytes = images.reduce((a, im) => a + dataUrlBytes(im.dataUrl), 0);
  const domain = linkDomain(link);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" data-testid="shipper-dialog">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative pane rounded-lg shadow-2xl border border-app w-full max-w-2xl flex flex-col max-h-[92vh]">
        <div className="px-5 py-3 border-b border-app flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading font-semibold text-base flex items-center gap-2"><Lucide.Truck size={16} className="text-primary-earth" /> Tag Pack Shipper</h3>
            <p className="text-xs text-dim mt-0.5">Several packs, a few preview images and your link — one <span className="font-mono">.pps-shipper.json</span> your buyers import in one go.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover" data-testid="shipper-close"><Lucide.X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Shipment title" hint="= file name"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={packs[0]?.name ? `${packs[0].name} collection` : "Alaska Wildlife Collection"} className={`${inputCls} font-mono`} data-testid="shipper-title" /></Field>
            <Field label="Author"><input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Muskegman Photography" className={inputCls} data-testid="shipper-author" /></Field>
            <Field label="Link" hint={domain || "your site or shop"}><input value={link} onChange={(e) => setLink(e.target.value)} placeholder="muskegman.com" className={`${inputCls} font-mono`} data-testid="shipper-link" /></Field>
          </div>
          <Field label="Description" hint="optional, shows to the buyer before import">
            <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} rows={2} placeholder="What's inside, who it's for…" className="mt-1 w-full px-3 py-2 rounded bg-app border border-app text-sm resize-none" data-testid="shipper-description" />
          </Field>

          <section className="space-y-2" data-testid="shipper-images">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] uppercase tracking-wider text-dim">Preview images · {images.length}/{SHIPPER_LIMITS.maxImages} · {kb(imgBytes)}</div>
              <button onClick={() => imgRef.current?.click()} disabled={images.length >= SHIPPER_LIMITS.maxImages} className="h-8 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover disabled:opacity-35" data-testid="shipper-add-image"><Lucide.ImagePlus size={12} /> Add image</button>
              <input ref={imgRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addImages(e.target.files || []); e.target.value = ""; }} data-testid="shipper-image-input" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {images.length === 0 && <span className="text-xs text-dim italic">Optional — cover art or a screenshot. Auto-shrunk to {SHIPPER_LIMITS.maxSide}px and ≤ {kb(SHIPPER_LIMITS.maxImageBytes)} each.</span>}
              {images.map((im, i) => (
                <div key={i} className="relative group rounded border border-app overflow-hidden" style={{ width: 132, height: 88 }} data-testid={`shipper-image-${i}`}>
                  <img src={im.dataUrl} alt={im.name} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 px-1.5 py-0.5 bg-black/60 text-[10px] text-white font-mono truncate">{im.width}×{im.height} · {kb(dataUrlBytes(im.dataUrl))}</div>
                  <button onClick={() => setImages((l) => l.filter((_, j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 rounded bg-black/70 text-white flex items-center justify-center opacity-0 group-hover:opacity-100" title="Remove"><Lucide.X size={11} /></button>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2" data-testid="shipper-packs">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] uppercase tracking-wider text-dim">Packs inside · {packs.length}</div>
              <button onClick={() => packRef.current?.click()} className="h-8 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover" data-testid="shipper-add-pack"><Lucide.FolderOpen size={12} /> Add pack files…</button>
              <input ref={packRef} type="file" accept=".json,application/json" multiple className="hidden" onChange={(e) => { addPacks(e.target.files || []); e.target.value = ""; }} data-testid="shipper-pack-input" />
            </div>
            <div className="space-y-1">
              {packs.length === 0 && <span className="text-xs text-dim italic">No packs yet — add .pps-tagpack.json files (or another shipper).</span>}
              {packs.map((p) => <PackRow key={p.id} p={p} onRemove={() => setPacks((ps) => ps.filter((x) => x.id !== p.id))} testId={`shipper-pack-${p.id}`} />)}
            </div>
          </section>
        </div>

        <div className="px-5 py-3 border-t border-app flex items-center justify-end gap-2 flex-wrap">
          <span className="text-[11px] text-dim font-mono mr-auto">{packs.length} pack{packs.length === 1 ? "" : "s"} · {images.length} image{images.length === 1 ? "" : "s"}{author ? ` · by ${author}` : ""}{domain ? ` · ${domain}` : ""}</span>
          <button onClick={onClose} className="px-3 py-1.5 rounded text-xs text-dim hover:bg-surface-hover" data-testid="shipper-cancel">Cancel</button>
          {extraAction && <button onClick={() => run(extraAction.run)} disabled={busy || !packs.length} className="h-9 px-3 rounded border border-primary-earth text-primary-earth text-xs flex items-center gap-1 hover:bg-primary-earth/10 disabled:opacity-35" data-testid="shipper-extra">{extraAction.icon} {extraAction.label}</button>}
          <button onClick={() => run(onSave)} disabled={busy || !packs.length} className="h-9 px-4 rounded bg-primary-earth text-[color:var(--text-inverse)] text-sm font-medium flex items-center gap-1 disabled:opacity-35" data-testid="shipper-save"><Lucide.Save size={13} /> Save shipper</button>
        </div>
      </div>
    </div>
  );
}

// PPS side: what the buyer sees before the packs land in their Tag Manager.
export function ShipperPreview({ shipper, categories, onImport, onCancel }) {
  const domain = linkDomain(shipper.link);
  const clashes = shipper.packs.filter((p) => (categories || []).some((c) => c.name.trim().toLowerCase() === p.name.trim().toLowerCase())).length;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center p-6" data-testid="shipper-preview">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative pane rounded-lg shadow-2xl border border-app w-full max-w-xl flex flex-col max-h-full">
        <div className="px-5 py-4 space-y-3 overflow-y-auto min-h-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-earth flex items-center justify-center text-[color:var(--text-inverse)] shrink-0"><Lucide.Truck size={20} /></div>
            <div className="min-w-0">
              <h3 className="font-heading font-semibold text-base leading-tight truncate" data-testid="shipper-preview-title">{shipper.title}</h3>
              <div className="text-xs text-dim flex items-center gap-2 flex-wrap mt-0.5" data-testid="shipper-preview-meta">
                {shipper.author && <span>by <b className="text-[color:var(--text)]">{shipper.author}</b></span>}
                {domain && <button onClick={() => openExternal(shipper.link)} className="text-primary-earth hover:underline underline-offset-2 flex items-center gap-1 font-mono" data-testid="shipper-preview-link">{domain} <Lucide.ExternalLink size={10} /></button>}
              </div>
            </div>
          </div>
          {shipper.description && <p className="text-sm text-dim leading-relaxed" data-testid="shipper-preview-description">{shipper.description}</p>}
          {shipper.images.length > 0 && (
            <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${shipper.images.length}, minmax(0, 1fr))` }} data-testid="shipper-preview-images">
              {shipper.images.map((im, i) => <img key={i} src={im.dataUrl} alt={im.name || `preview ${i + 1}`} className="w-full rounded border border-app object-cover" style={{ aspectRatio: "3 / 2" }} draggable={false} />)}
            </div>
          )}
          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-dim">Packs · {shipper.packs.length}</div>
            {shipper.packs.map((p) => {
              const clash = (categories || []).some((c) => c.name.trim().toLowerCase() === p.name.trim().toLowerCase());
              return <PackRow key={p.id} p={p} testId={`shipper-preview-pack-${p.id}`} badge={clash ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-earth/15 text-primary-earth shrink-0">already have one</span> : null} />;
            })}
          </div>
          <p className="text-xs text-dim">
            {clashes > 0 ? `${clashes} pack${clashes === 1 ? "" : "s"} share a name with one you already have — you'll be asked Merge / Replace / Keep both for each. ` : ""}Every change is undoable from Tag History.
          </p>
        </div>
        <div className="px-5 py-3 border-t border-app flex items-center justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 rounded text-xs text-dim hover:bg-surface-hover" data-testid="shipper-preview-cancel">Cancel</button>
          <button onClick={onImport} className="h-9 px-4 rounded bg-primary-earth text-[color:var(--text-inverse)] text-sm font-medium flex items-center gap-1" data-testid="shipper-preview-import"><Lucide.Download size={13} /> Import {shipper.packs.length} pack{shipper.packs.length === 1 ? "" : "s"}</button>
        </div>
      </div>
    </div>
  );
}

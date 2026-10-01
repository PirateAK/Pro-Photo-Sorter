// v1.5.0 — Tag Pack Creator (TPC). Standalone authoring app for
// .pps-tagpack.json files. Lives in the same React bundle as PPS (route
// #/tpc) so it shares the pack schema, icon list and merge rules.
import React, { useRef, useState, useEffect } from "react";
import * as Lucide from "lucide-react";
import { Toaster, toast } from "sonner";
import { uid } from "../lib/storage";
import { serializeCategory, deserializePack, deserializeShipper, isShipper, countPack, linkDomain } from "../lib/packFormat";
import PackEditor from "../components/PackEditor";
import ShipperDialog from "../components/ShipperDialog";
import { loadAuthorPrefs, saveAuthorPrefs } from "../lib/authorPrefs";
import { isElectron, tpcInstallPack, tpcSavePack, libraryList } from "../lib/electronBridge";
import buildInfo from "../buildInfo.json";
import { renderPreviewCard } from "./previewCard";
import OtherAppChip from "../components/OtherAppChip";

// v1.8.0 — packs PPS mirrors to Documents\Pro Photo Sorter\Library\
function LibraryPicker({ onPick, onClose }) {
  const [items, setItems] = useState(null);
  useEffect(() => { libraryList().then(setItems); }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" data-testid="tpc-library-picker">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative pane rounded-lg shadow-2xl border border-app w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="px-4 py-3 border-b border-app flex items-center justify-between">
          <div>
            <h3 className="font-heading font-semibold text-sm flex items-center gap-1.5"><Lucide.Library size={14} className="text-primary-earth" /> Pro Photo Sorter library</h3>
            <p className="text-xs text-dim mt-0.5">Packs PPS keeps in <span className="font-mono">Documents\Pro Photo Sorter\Library</span>. Edit here, then Install into PPS.</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded hover:bg-surface-hover flex items-center justify-center" data-testid="tpc-library-close"><Lucide.X size={14} /></button>
        </div>
        <div className="flex-1 overflow-auto p-2 space-y-0.5 min-h-0">
          {items === null && <div className="text-xs text-dim italic p-2">Looking…</div>}
          {items?.length === 0 && <div className="text-xs text-dim p-3 leading-relaxed">Nothing here yet. Open Pro Photo Sorter once (v1.8.0 or newer) — it fills this folder automatically.</div>}
          {items?.map((it) => {
            let counts = ""; try { const c = countPack(deserializePack(JSON.parse(it.json))); counts = `${c.subfolders} folders · ${c.tags} tags`; } catch { counts = "unreadable"; }
            return (
              <button key={it.name} onClick={() => onPick(it)} className="w-full text-left flex items-center gap-2 px-2 py-2 rounded hover:bg-surface-hover text-sm" data-testid={`tpc-library-item-${it.name.replace(/[^\w-]+/g, "_")}`}>
                <Lucide.Package size={13} className="text-primary-earth shrink-0" />
                <span className="flex-1 truncate">{it.name}</span>
                <span className="text-[10px] text-dim font-mono shrink-0">{counts}</span>
              </button>
            );
          })}
        </div>
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
  const [pack, setPack] = useState(() => { const p = loadAuthorPrefs(); return { id: uid("cat"), name: "", author: p.author, link: p.link, description: "", subfolders: [], filenameItems: [] }; });
  const [undo, setUndo] = useState([]);
  const [title, setTitle] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [shipper, setShipper] = useState(null); // v1.7.0 — { packs, title, author, link, description, images }
  const [libraryOpen, setLibraryOpen] = useState(false); // v1.8.0
  const [theme, setTheme] = useState(() => { try { return window.localStorage.getItem("tpc.theme") || "dark"; } catch { return "dark"; } });
  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); try { window.localStorage.setItem("tpc.theme", theme); } catch { /* private mode */ } }, [theme]);
  const fileRef = useRef(null);
  const commit = (fn, label) => { setUndo((u) => [...u.slice(-29), pack]); setPack((p) => fn(p)); if (label) toast.success(label); };
  const doUndo = () => { if (!undo.length) return; const prev = undo[undo.length - 1]; setUndo((u) => u.slice(0, -1)); setPack(prev); toast("Undone"); };

  // ── file I/O ──
  const safeTitle = () => (title || pack.name || "tag-pack").replace(/[^\w\-]+/g, "_").slice(0, 60);
  const packJson = () => JSON.stringify(serializeCategory({ ...pack, name: pack.name || title || "Untitled pack" }, { author: pack.author, link: pack.link, description: pack.description }), null, 2);
  const download = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([packJson()], { type: "application/json" })); a.download = `${safeTitle()}.pps-tagpack.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
  const save = async () => {
    if (!pack.name && !title) { toast.error("Give the pack a title first"); return; }
    const res = await tpcSavePack(`${safeTitle()}.pps-tagpack.json`, packJson());
    if (res.ok) toast.success("Pack saved", { description: res.path, action: { label: "New pack", onClick: () => newPack(true) } }); else if (res.error === "not-electron") { download(); toast.success("Pack downloaded"); } else if (res.error !== "cancelled") toast.error("Save failed", { description: res.error });
  };
  const install = async () => {
    if (!pack.name && !title) { toast.error("Give the pack a title first"); return; }
    const res = await tpcInstallPack(`${safeTitle()}.pps-tagpack.json`, packJson());
    if (res.ok) toast.success("Handed to Pro Photo Sorter", { description: "Open PPS → Tag Manager. It will offer to import this pack.", action: { label: "New pack", onClick: () => newPack(true) } });
    else if (res.error === "not-electron") { download(); toast("Downloaded instead", { description: "One-click install works in the desktop app. In PPS use Tag Manager → Import pack…" }); }
    else toast.error("Install failed", { description: res.error });
  };
  // New pack: wipe the workspace (undo-able) and put the cursor back on Category.
  const newPack = (silent) => {
    const empty = { id: uid("cat"), name: "", author: pack.author || "", link: pack.link || "", description: "", subfolders: [], filenameItems: [] };
    const hasWork = pack.name || pack.subfolders.length || (pack.filenameItems || []).length;
    if (hasWork && !silent && !window.confirm("Start a new pack?\n\nThe current one is cleared (Undo brings it back). Make sure you've saved or installed it first.")) return;
    commit(() => empty);
    setTitle("");
    if (!silent) toast("Ready for a new pack", { description: "Author and link kept. Undo restores the previous pack." });
  };
  const openFile = async (f) => {
    if (!f) return;
    try { openJson(await f.text()); }
    catch (e) { toast.error("Couldn't open", { description: e.message }); }
  };
  const openJson = (text) => {
    const data = JSON.parse(text);
    if (isShipper(data)) { setShipper(deserializeShipper(data, uid)); toast.success("Shipper opened", { description: "Edit it in the Shipper window, then Save." }); return; }
    const cat = deserializePack(data, uid); commit(() => ({ ...cat, filenameItems: [] })); setTitle(cat.name); toast.success(`Opened “${cat.name}”`);
  };
  const openFromLibrary = (it) => {
    const hasWork = pack.name || pack.subfolders.length || (pack.filenameItems || []).length;
    if (hasWork && !window.confirm(`Open “${it.name}” from the PPS library?\n\nThe current pack is replaced (Undo brings it back).`)) return;
    setLibraryOpen(false);
    try { openJson(it.json); } catch (e) { toast.error("Couldn't open", { description: e.message }); }
  };
  // Shipper: start from the current pack (if it has a name) and the author/link already typed.
  const openShipper = () => {
    const hasPack = pack.name || pack.subfolders.length;
    setShipper({ packs: hasPack ? [{ ...pack, name: pack.name || title || "Untitled pack" }] : [], author: pack.author || "", link: pack.link || "" });
  };
  const saveShipper = async (filename, json) => {
    const res = await tpcSavePack(filename, json);
    if (res.ok) { toast.success("Shipper saved", { description: res.path }); setShipper(null); }
    else if (res.error === "not-electron") { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([json], { type: "application/json" })); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast.success("Shipper downloaded"); setShipper(null); }
    else if (res.error !== "cancelled") toast.error("Save failed", { description: res.error });
  };
  const installShipper = async (filename, json) => {
    const res = await tpcInstallPack(filename, json);
    if (res.ok) { toast.success("Handed to Pro Photo Sorter", { description: "Open PPS → Tag Manager. It will offer to import the whole shipment." }); setShipper(null); }
    else if (res.error === "not-electron") toast("Desktop app only", { description: "Save the shipper instead, then Tag Manager → Import pack… in PPS." });
    else toast.error("Install failed", { description: res.error });
  };
  const previewCard = async () => {
    try { const url = await renderPreviewCard({ ...pack, name: pack.name || title || "Untitled pack" }); const a = document.createElement("a"); a.href = url; a.download = `${safeTitle()}_cover.png`; a.click(); toast.success("Cover image downloaded", { description: "1280×720 PNG — drop it straight into Gumroad." }); }
    catch (e) { toast.error("Preview failed", { description: e.message }); }
  };

  // Waterfall: top-level folders, then one row per highlighted level showing its children.
  const counts = countPack(pack);
  const tagTotal = counts.tags + (pack.filenameItems || []).length;
  useEffect(() => { document.title = "Tag Pack Creator"; }, []);


  return (
    <div className="min-h-screen bg-app text-[color:var(--text)] font-body flex flex-col" data-testid="tpc-app">
      <Toaster position="top-center" theme={theme} richColors />
      <header className="px-[3vw] py-3 border-b border-app flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary-earth flex items-center justify-center text-[color:var(--text-inverse)]"><Lucide.Package size={18} /></div>
          <div>
            <h1 className="font-heading font-bold text-lg leading-tight">Tag Pack Creator</h1>
            <div className="text-[11px] text-dim font-mono">v{buildInfo.version} · builds .pps-tagpack.json files for Pro Photo Sorter</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <OtherAppChip other="pps" />
          <button onClick={() => setAboutOpen(true)} className="h-8 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover" data-testid="tpc-about"><Lucide.Info size={12} /> About</button>
          <button onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))} className="h-8 w-8 rounded border border-app flex items-center justify-center hover:bg-surface-hover" title={`Switch to ${theme === "light" ? "Earth Dark" : "Earth Light"}`} data-testid="tpc-toggle-theme">
            {theme === "light" ? <Lucide.Moon size={13} /> : <Lucide.Sun size={13} />}
          </button>
          <button onClick={() => newPack(false)} className="h-8 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover" title="Clear the workspace and start another pack" data-testid="tpc-new"><Lucide.FilePlus2 size={12} /> New pack</button>
          <button onClick={() => fileRef.current?.click()} className="h-8 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover" data-testid="tpc-open"><Lucide.FolderOpen size={12} /> Open pack…</button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => { openFile(e.target.files?.[0]); e.target.value = ""; }} data-testid="tpc-open-input" />
          {isElectron() && <button onClick={() => setLibraryOpen(true)} className="h-8 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover" title="Open a pack straight from Pro Photo Sorter's library on this PC" data-testid="tpc-from-library"><Lucide.Library size={12} /> From PPS library…</button>}
          <button onClick={openShipper} className="h-8 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover" title="Bundle several packs + up to 3 preview images + your link into one .pps-shipper.json" data-testid="tpc-shipper"><Lucide.Truck size={12} /> Shipper…</button>
          <button onClick={doUndo} disabled={!undo.length} className="h-8 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover disabled:opacity-35" data-testid="tpc-undo"><Lucide.Undo2 size={12} /> Undo{undo.length ? ` · ${undo.length}` : ""}</button>
        </div>
      </header>

      <main className="w-full flex-1 px-[3vw] py-5 space-y-4" style={{ maxWidth: "min(100%, 1600px)", margin: "0 auto" }}>
        <PackEditor key={pack.id} pack={pack} onCommit={(fn, label) => { commit(fn, label); setPack((p) => { if (p.name && !title) setTitle(p.name); return p; }); }} />
      </main>

      {/* Save bar — pinned to the bottom so it never scrolls away */}
      <footer className="sticky bottom-0 z-30 border-t border-app bg-app/95 backdrop-blur px-[3vw] py-3" data-testid="tpc-save-row">
        <section className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end" style={{ maxWidth: "min(100%, 1600px)", margin: "0 auto" }}>
          <label className="text-xs text-dim">Pack title <span className="font-mono">(= file name)</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={pack.name || "My Wildlife Pack"} className="mt-1 w-full h-9 px-3 rounded bg-app border border-app text-sm font-mono" data-testid="tpc-title" />
          </label>
          <label className="text-xs text-dim">Author <span className="font-mono">(optional, shows on the cover)</span>
            <input value={pack.author || ""} onChange={(e) => { setPack((p) => ({ ...p, author: e.target.value })); saveAuthorPrefs({ author: e.target.value }); }} placeholder="Muskegman Photography" className="mt-1 w-full h-9 px-3 rounded bg-app border border-app text-sm" data-testid="tpc-author" />
          </label>
          <label className="text-xs text-dim">Link <span className="font-mono">({linkDomain(pack.link) || "your site or shop, optional"})</span>
            <input value={pack.link || ""} onChange={(e) => { setPack((p) => ({ ...p, link: e.target.value })); saveAuthorPrefs({ link: e.target.value }); }} placeholder="muskegman.com" className="mt-1 w-full h-9 px-3 rounded bg-app border border-app text-sm font-mono" data-testid="tpc-link" />
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={previewCard} className="h-9 px-3 rounded border border-app text-xs flex items-center gap-1 hover:bg-surface-hover" title="1280×720 cover PNG for Gumroad" data-testid="tpc-cover"><Lucide.ImageDown size={12} /> Cover</button>
            <button onClick={install} className="h-9 px-3 rounded border border-primary-earth text-primary-earth text-xs flex items-center gap-1 hover:bg-primary-earth/10" title={isElectron() ? "Hand this pack to Pro Photo Sorter on this PC" : "In the desktop app this installs straight into PPS"} data-testid="tpc-install"><Lucide.Send size={12} /> Install into PPS</button>
            <button onClick={save} className="h-9 px-4 rounded bg-primary-earth text-[color:var(--text-inverse)] text-sm font-medium flex items-center gap-1" data-testid="tpc-save"><Lucide.Save size={13} /> Save</button>
          </div>
          <div className="md:col-span-4 text-[11px] text-dim font-mono">{counts.subfolders} folder{counts.subfolders === 1 ? "" : "s"} · {tagTotal} filename tag{tagTotal === 1 ? "" : "s"} · format v4</div>
        </section>
      </footer>

      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
      {libraryOpen && <LibraryPicker onPick={openFromLibrary} onClose={() => setLibraryOpen(false)} />}
      {shipper && (
        <ShipperDialog initial={shipper} onClose={() => setShipper(null)} onSave={saveShipper}
          extraAction={isElectron() ? { label: "Install into PPS", icon: <Lucide.Send size={12} />, run: installShipper } : undefined} />
      )}
    </div>
  );
}

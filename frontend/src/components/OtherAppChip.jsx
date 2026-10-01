// v1.8.0 — "Open the other app" chip, shared by PPS (Tag Manager) and the
// Tag Pack Creator (header). Reads Documents\Pro Photo Sorter\apps\<id>.json:
//   installed            → Open <app>            (launches the exe)
//   not installed        → Get <app> (link)
//   other app older      → small "update" nudge → GitHub Releases
import React, { useEffect, useState } from "react";
import * as Lucide from "lucide-react";
import { toast } from "sonner";
import { appsInfo, appsLaunch, openExternal, isElectron } from "../lib/electronBridge";
import { compareVersions } from "../lib/version";

export const APP_META = {
  pps: { name: "Pro Photo Sorter", short: "PPS", get: "https://muskegman.gumroad.com/l/gvmaas", getLabel: "Get Pro Photo Sorter", icon: Lucide.Images },
  tpc: { name: "Tag Pack Creator", short: "Creator", get: "https://muskegman.gumroad.com/l/PPS-TPC", getLabel: "Get Tag Pack Creator (free)", icon: Lucide.Package },
};
const RELEASES = "https://github.com/PirateAK/Pro-Photo-Sorter/releases/latest";

// other: "pps" | "tpc" — which app this chip points at. Renders nothing in the browser.
export default function OtherAppChip({ other, className = "" }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!isElectron()) return;
    let live = true;
    const load = async () => { const r = await appsInfo(); if (live) setInfo(r); };
    load();
    window.addEventListener("focus", load);
    return () => { live = false; window.removeEventListener("focus", load); };
  }, []);
  if (!isElectron() || !info) return null;
  const meta = APP_META[other];
  const Icon = meta.icon;
  const o = info.other;
  const behind = o?.installed && compareVersions(o.version, info.self.version) < 0;
  const launch = async () => {
    const r = await appsLaunch();
    if (r.ok) toast(`Opening ${meta.name}…`);
    else toast.error(`Couldn't open ${meta.name}`, { description: r.error === "not-installed" ? "It isn't installed on this PC any more." : r.error });
  };
  const base = "h-8 px-3 rounded border text-xs flex items-center gap-1.5 transition-colors";
  return (
    <div className={`flex items-center gap-1.5 ${className}`} data-testid={`other-app-${other}`}>
      {o?.installed ? (
        <button onClick={launch} className={`${base} border-app hover:bg-surface-hover`} title={`${meta.name} v${o.version} · ${o.exePath}`} data-testid={`other-app-${other}-open`}>
          <Icon size={12} className="text-primary-earth" /> Open {meta.name}
        </button>
      ) : (
        <button onClick={() => openExternal(meta.get)} className={`${base} border-primary-earth/60 text-primary-earth hover:bg-primary-earth/10`} title={`${meta.name} isn't installed on this PC`} data-testid={`other-app-${other}-get`}>
          <Icon size={12} /> {meta.getLabel} <Lucide.ExternalLink size={10} />
        </button>
      )}
      {behind && (
        <button onClick={() => openExternal(RELEASES)} className="h-8 px-2 rounded bg-primary-earth/15 text-primary-earth text-[11px] flex items-center gap-1 hover:bg-primary-earth/25" title={`${meta.name} is v${o.version}; you're on v${info.self.version}. Get the matching build.`} data-testid={`other-app-${other}-update`}>
          <Lucide.ArrowUpCircle size={11} /> v{o.version} → update
        </button>
      )}
    </div>
  );
}

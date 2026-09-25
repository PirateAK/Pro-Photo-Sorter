import React, { useEffect, useState } from "react";
import { KeyRound, CheckCircle2, ExternalLink, ShoppingCart, LogOut, ShieldCheck, FolderOpen, LifeBuoy, Images } from "lucide-react";
import {
  getLicense,
  isTrialMode,
  activateLicense,
  deactivateLicense,
  subscribeLicense,
  GUMROAD_PRODUCT_URL,
} from "@/lib/license";
import { isElectron, safetyInfo, safetyOpenFolder, safetyReadLatest, samplesInfo, samplesRestore, samplesOpenFolder } from "@/lib/electronBridge";
import { STATE_KEY } from "@/lib/storage";
import { toast } from "sonner";

/**
 * License management panel rendered inside the Help modal.
 * Two states:
 *   - Unlicensed (Trial): input field + Activate + Buy Now buttons.
 *   - Licensed: activation info + Deactivate button.
 */
export default function LicenseSection() {
  const [license, setLicense] = useState(() => getLicense());
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [safety, setSafety] = useState(null);
  const [samples, setSamples] = useState(null);

  useEffect(() => subscribeLicense(() => setLicense(getLicense())), []);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await safetyInfo();
      if (!cancelled && res?.ok) setSafety(res);
      const s = await samplesInfo();
      if (!cancelled && s?.ok) setSamples(s);
    })();
    return () => { cancelled = true; };
  }, [license]);

  const openSafetyFolder = async () => { await safetyOpenFolder(); };
  const openSamplesFolder = async () => { await samplesOpenFolder(); };
  const restoreSamples = async () => {
    const res = await samplesRestore();
    if (res?.ok) {
      toast.success(`Restored ${res.copied} sample photo${res.copied === 1 ? "" : "s"}`, {
        icon: "🖼️",
        description: `They're now in ${res.samplesDir}. Open the folder to load them in the app.`,
      });
      // Refresh info
      const s = await samplesInfo();
      if (s?.ok) setSamples(s);
    } else {
      toast.error("Sample restore failed", { description: res?.error || "unknown" });
    }
  };

  // v1.3.1 — Manual "Restore from Safety-Backup" recovery hatch.
  // Reads Documents\Pro Photo Sorter\Safety-Backups\latest.json and writes
  // the state key back into localStorage. Belt-and-suspenders alongside the
  // automatic boot-restore fix, and the only recourse if the user is
  // already inside the app with an empty tag library (Kurt's v1.3.1
  // install scenario).
  const restoreFromSafety = async () => {
    if (!window.confirm(
      "Restore tag packs from Safety-Backup?\n\n" +
      "This will OVERWRITE your current tag library with the last saved copy from\n" +
      "Documents\\Pro Photo Sorter\\Safety-Backups\\latest.json.\n\n" +
      "The app will reload immediately after."
    )) return;
    const res = await safetyReadLatest();
    if (!res?.data?.state || typeof res.data.state !== "string") {
      toast.error("No Safety-Backup found", {
        description: "Documents\\Pro Photo Sorter\\Safety-Backups\\latest.json is missing or empty.",
      });
      return;
    }
    try {
      JSON.parse(res.data.state); // sanity-check parseable
    } catch (e) {
      toast.error("Safety-Backup is corrupted", { description: e.message });
      return;
    }
    localStorage.setItem(STATE_KEY, res.data.state);
    toast.success("Restored — reloading…");
    setTimeout(() => window.location.reload(), 800);
  };

  const openBuyPage = () => {
    // Electron: main process opens in default browser via preload bridge if
    // wired; otherwise plain window.open works in dev + Electron with
    // shell.openExternal fallback.
    if (isElectron() && window.electronAPI?.openExternal) {
      window.electronAPI.openExternal(GUMROAD_PRODUCT_URL);
    } else {
      window.open(GUMROAD_PRODUCT_URL, "_blank", "noopener,noreferrer");
    }
  };

  const handleActivate = async () => {
    setBusy(true); setError(""); setOkMsg("");
    const res = await activateLicense(key);
    setBusy(false);
    if (res.ok) {
      setKey("");
      setOkMsg("License activated — trial mode disabled on this PC. Thank you!");
    } else {
      setError(res.error || "Activation failed.");
    }
  };

  const handleDeactivate = () => {
    if (!window.confirm(
      "Deactivate on this PC?\n\n" +
      "This removes the license from THIS computer only. Gumroad still counts this " +
      "as an activated seat — if you hit your use-count limit later, email " +
      "leaderteamk@gmail.com and I'll reset it in 30 seconds."
    )) return;
    deactivateLicense();
    setOkMsg("Deactivated. Trial mode is now active on this PC.");
    setError("");
  };

  // ── Activated state ─────────────────────────────────────────────────────
  if (license && !isTrialMode()) {
    const activated = new Date(license.activatedAt);
    return (
      <div className="space-y-4" data-testid="license-panel-activated">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={20} className="text-green-600 dark:text-green-400" />
          <h2 className="font-heading text-lg">Licensed</h2>
        </div>
        <p className="text-sm text-app">
          Thank you for supporting Pro Photo Sorter. Trial mode is off on this PC —
          photos store without a watermark and without the <code className="px-1 rounded bg-surface-hover font-mono text-xs">_TRIAL</code> suffix.
        </p>
        <div className="pane rounded p-3 space-y-1 text-sm font-mono">
          <div><span className="text-dim">Product:</span> {license.productName || "Pro Photo Sorter"}</div>
          {license.email && (<div><span className="text-dim">Purchase email:</span> {license.email}</div>)}
          {license.orderNumber != null && (<div><span className="text-dim">Order #:</span> {license.orderNumber}</div>)}
          <div><span className="text-dim">Activated:</span> {activated.toLocaleDateString()} {activated.toLocaleTimeString()}</div>
          <div><span className="text-dim">Key:</span> <span title={license.key}>{maskKey(license.key)}</span></div>
        </div>

        {isElectron() && safety?.safetyDir && (
          <div className="pane rounded p-3 space-y-2 text-xs" data-testid="license-safety-backup">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck size={16} className="text-green-600 dark:text-green-400" />
              <strong>Safety-Backup: {safety.latestExists ? "Active" : "Waiting for first save"}</strong>
            </div>
            <p className="text-dim leading-relaxed">
              Your license + tag packs are mirrored to a stable folder outside <code className="font-mono">%APPDATA%</code>.
              This means <strong>updates, reinstalls, and userData renames can no longer wipe your data</strong> — on next launch the app auto-restores from here.
            </p>
            <div className="font-mono text-dim break-all">{safety.safetyDir}</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openSafetyFolder}
                data-testid="license-open-safety-btn"
                className="px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app inline-flex items-center gap-1"
              >
                <FolderOpen size={12} /> Open Safety-Backup folder
              </button>
              <button
                onClick={restoreFromSafety}
                disabled={!safety.latestExists}
                data-testid="license-restore-safety-btn"
                title={safety.latestExists
                  ? "Overwrite current tag library with the last saved copy from latest.json"
                  : "Waiting for first save — no backup on disk yet"}
                className="px-2 py-1 rounded bg-primary-earth/20 hover:bg-primary-earth/40 border border-primary-earth/60 text-primary-earth inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <LifeBuoy size={12} /> Restore tags from Safety-Backup
              </button>
            </div>
          </div>
        )}

        {isElectron() && samples?.samplesDir && (
          <div className="pane rounded p-3 space-y-2 text-xs" data-testid="license-samples-panel">
            <div className="flex items-center gap-2 text-sm">
              <Images size={16} className="text-primary-earth" />
              <strong>Sample Photos: {samples.fileCount > 0 ? `${samples.fileCount} on disk` : "Missing"}</strong>
            </div>
            <p className="text-dim leading-relaxed">
              Six bundled starter photos live in your Documents folder so you always have something to
              practise on. If you deleted them, restore anytime — no internet needed.
            </p>
            <div className="font-mono text-dim break-all">{samples.samplesDir}</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={openSamplesFolder}
                data-testid="license-open-samples-btn"
                className="px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app inline-flex items-center gap-1"
              >
                <FolderOpen size={12} /> Open Samples folder
              </button>
              <button
                onClick={restoreSamples}
                data-testid="license-restore-samples-btn"
                title="Copies the six bundled sample photos back into your Documents\Pro Photo Sorter\Samples\ folder."
                className="px-2 py-1 rounded bg-primary-earth/20 hover:bg-primary-earth/40 border border-primary-earth/60 text-primary-earth inline-flex items-center gap-1"
              >
                <Images size={12} /> Restore bundled samples
              </button>
              <button
                onClick={() => {
                  // v1.4.2 — Coach-mark reset. Clears the sentinel so the
                  // next app reload fires the first-run "starter photos are
                  // waiting" toast again.
                  localStorage.removeItem("pps.coachmark.samples.v1");
                  toast.success("Coach-mark reset", {
                    description: "The starter-photos welcome toast will fire again the next time you launch the app.",
                  });
                }}
                data-testid="license-reset-coachmark-btn"
                title="Re-arms the first-run welcome toast so it fires on your next app launch."
                className="px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app inline-flex items-center gap-1"
              >
                <LifeBuoy size={12} /> Show me again next launch
              </button>
            </div>
          </div>
        )}

        {okMsg && (
          <div className="text-xs text-green-700 dark:text-green-400" data-testid="license-msg-ok">{okMsg}</div>
        )}

        <div className="pt-2 border-t border-app">
          <button
            onClick={handleDeactivate}
            data-testid="license-deactivate-btn"
            className="px-3 py-2 rounded bg-app hover:bg-surface-hover border border-app text-sm flex items-center gap-2"
          >
            <LogOut size={14} /> Deactivate on this PC
          </button>
          <p className="text-xs text-dim mt-2 leading-relaxed">
            Moving to a new computer? Deactivate here, then activate on the new PC with the same key.
            If Gumroad reports "use limit exceeded," email <a href="mailto:leaderteamk@gmail.com" className="text-primary-earth underline">leaderteamk@gmail.com</a> and
            I'll reset your key in 30 seconds.
          </p>
        </div>
      </div>
    );
  }

  // ── Trial state (needs activation) ──────────────────────────────────────
  return (
    <div className="space-y-4" data-testid="license-panel-trial">
      <div className="flex items-center gap-2">
        <KeyRound size={20} className="text-amber-600 dark:text-amber-400" />
        <h2 className="font-heading text-lg">Activate License</h2>
      </div>
      <p className="text-sm text-app">
        You're running in <strong>Trial Mode</strong>. Stored photos get a watermark and a
        {" "}<code className="px-1 rounded bg-surface-hover font-mono text-xs">_TRIAL</code> filename suffix so you can try
        every feature before buying. Paste your Gumroad license key below to remove both.
      </p>

      <div className="space-y-2">
        <label htmlFor="license-key-input" className="text-xs text-dim font-mono">
          License key (from your Gumroad receipt email)
        </label>
        <input
          id="license-key-input"
          data-testid="license-key-input"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
          className="w-full px-3 py-2 rounded bg-app border border-app text-sm font-mono focus:outline-none focus:border-primary-earth"
          onKeyDown={(e) => { if (e.key === "Enter" && !busy && key.trim()) handleActivate(); }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleActivate}
          disabled={busy || !key.trim()}
          data-testid="license-activate-btn"
          className="px-4 py-2 rounded bg-primary-earth hover:bg-primary-earth/90 text-white text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <CheckCircle2 size={14} /> {busy ? "Verifying…" : "Activate"}
        </button>
        <button
          onClick={openBuyPage}
          data-testid="license-buy-btn"
          className="px-4 py-2 rounded bg-app hover:bg-surface-hover border border-app text-sm flex items-center gap-2"
        >
          <ShoppingCart size={14} /> Buy Now <ExternalLink size={12} className="opacity-60" />
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-600 dark:text-red-400 leading-relaxed" data-testid="license-msg-err">
          {error}
        </div>
      )}
      {okMsg && (
        <div className="text-xs text-green-700 dark:text-green-400" data-testid="license-msg-ok">{okMsg}</div>
      )}

      <div className="pt-3 border-t border-app text-xs text-dim leading-relaxed space-y-2">
        <p><strong>One-time internet ping.</strong> Activation calls Gumroad exactly once to verify the key. After that, the app runs 100% offline forever — perfect for boats, bush planes, and satellite internet.</p>
        <p><strong>Can't find your key?</strong> Check your Gumroad receipt email or visit your Gumroad library at <a href="https://gumroad.com/library" onClick={(e) => { e.preventDefault(); openBuyPage(); }} className="text-primary-earth underline">gumroad.com/library</a>.</p>
      </div>
    </div>
  );
}

function maskKey(k) {
  if (!k || k.length < 8) return "••••••••";
  return `${k.slice(0, 4)}••••••••••••${k.slice(-4)}`;
}

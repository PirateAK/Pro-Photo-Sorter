import React, { useEffect, useState } from "react";
import { Download, RefreshCw, CheckCircle2, X as XIcon } from "lucide-react";
import { subscribeUpdateStatus, checkForUpdates, downloadUpdate, installUpdate } from "@/lib/electronBridge";

/**
 * v1.2.3 — In-app auto-update banner. Only visible when the user opted in
 * (settings.checkForUpdates === true), running inside Electron, and there
 * is a newer version available on GitHub Releases.
 *
 * Flow (per-launch, once):
 *   1. mount → checkForUpdates() → main-process autoUpdater fires status events
 *   2. "available" → banner shows "vX.Y.Z available · Download"
 *   3. user clicks Download → downloadUpdate() → progress % shown in banner
 *   4. "downloaded" → banner flips to "Install & Restart"
 *   5. user clicks Install → app quits, NSIS installer runs, app relaunches
 *
 * Dismiss with the × icon; banner stays hidden until next launch.
 */
export default function UpdateBanner({ enabled }) {
  const [status, setStatus] = useState(null); // { state, version, percent, ... }
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const unsub = subscribeUpdateStatus((payload) => setStatus(payload));
    // Kick off the check once on mount.
    checkForUpdates();
    return unsub;
  }, [enabled]);

  if (!enabled || dismissed || !status) return null;
  const s = status.state;
  // Silent states — no banner
  if (s === "checking" || s === "up-to-date" || s === "error") return null;

  const isAvailable = s === "available";
  const isDownloading = s === "downloading";
  const isReady = s === "downloaded";

  const handleDownload = async () => {
    setBusy(true);
    await downloadUpdate();
    setBusy(false);
  };
  const handleInstall = async () => {
    setBusy(true);
    await installUpdate();
    // App quits from here — no cleanup needed.
  };

  return (
    <div
      data-testid="update-banner"
      className="w-full flex items-center justify-center gap-3 px-3 py-1.5 text-xs bg-primary-earth/15 border-b border-primary-earth/40 text-primary-earth"
    >
      {isReady ? (
        <CheckCircle2 size={14} className="shrink-0" />
      ) : (
        <RefreshCw size={14} className={`shrink-0 ${isDownloading ? "animate-spin" : ""}`} />
      )}
      <span className="truncate">
        {isAvailable && (
          <>
            <strong>Update available — v{status.version}</strong> · Download it now to keep sorting
          </>
        )}
        {isDownloading && (
          <>
            <strong>Downloading v{status.version || ""}…</strong> {Math.max(0, Math.min(100, Math.round(status.percent || 0)))}%
          </>
        )}
        {isReady && (
          <>
            <strong>v{status.version} is ready.</strong> Click Install &amp; Restart to apply.
          </>
        )}
      </span>
      {isAvailable && (
        <button
          onClick={handleDownload}
          disabled={busy}
          data-testid="update-banner-download-btn"
          className="ml-1 px-2 py-0.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-semibold shrink-0 flex items-center gap-1 disabled:opacity-50"
        >
          <Download size={12} /> Download
        </button>
      )}
      {isReady && (
        <button
          onClick={handleInstall}
          disabled={busy}
          data-testid="update-banner-install-btn"
          className="ml-1 px-2 py-0.5 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-semibold shrink-0 flex items-center gap-1 disabled:opacity-50"
        >
          <CheckCircle2 size={12} /> Install &amp; Restart
        </button>
      )}
      <button
        onClick={() => setDismissed(true)}
        data-testid="update-banner-dismiss-btn"
        title="Dismiss until next launch"
        className="w-5 h-5 rounded flex items-center justify-center hover:bg-primary-earth/20 shrink-0"
      >
        <XIcon size={12} />
      </button>
    </div>
  );
}

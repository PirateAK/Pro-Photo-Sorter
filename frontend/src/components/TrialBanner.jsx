import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { isTrialMode, subscribeLicense } from "@/lib/license";

/**
 * Slim banner across the top of the app when running unlicensed.
 * Clicking "Activate License" opens the Help modal on the License tab.
 */
export default function TrialBanner({ onActivateClick }) {
  const [trial, setTrial] = useState(() => isTrialMode());
  useEffect(() => subscribeLicense(() => setTrial(isTrialMode())), []);
  if (!trial) return null;

  return (
    <div
      data-testid="trial-banner"
      className="w-full flex items-center justify-center gap-3 px-3 py-1.5 text-xs bg-amber-500/15 border-b border-amber-500/40 text-amber-900 dark:text-amber-100"
    >
      <AlertTriangle size={14} className="shrink-0" />
      <span className="truncate">
        <strong>Trial Mode</strong> — stored photos get a watermark and a{" "}
        <code className="px-1 rounded bg-amber-500/25 font-mono">_TRIAL</code> filename suffix
      </span>
      <button
        onClick={onActivateClick}
        data-testid="trial-banner-activate-btn"
        className="ml-1 px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shrink-0"
      >
        Activate License
      </button>
    </div>
  );
}

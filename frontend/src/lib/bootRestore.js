// Boot-time restore from the Safety-Backup mirror.
//
// v1.2.9 — safety net that runs BEFORE React mounts. If Chromium's
// localStorage is empty (fresh userData folder — e.g. because Electron's
// productName changed, the app was reinstalled, or %APPDATA% was wiped)
// AND a Safety-Backup exists in %USERPROFILE%\Documents\Pro Photo Sorter\
// Safety-Backups\latest.json, we hydrate localStorage from it so the user
// keeps their tag packs and their activated license.
//
// This is intentionally silent on success. If a hostile actor edits the JSON
// they'd only be able to inject a state we're already trusting from disk,
// same trust level as localStorage itself.

import { isElectron, safetyReadLatest } from "./electronBridge.js";
import { STATE_KEY } from "./storage.js";
import { LICENSE_STORAGE_KEY } from "./license.js";

export async function bootRestoreFromSafetyIfEmpty() {
  if (!isElectron()) return { restored: false, reason: "not-electron" };

  const hasState = !!localStorage.getItem(STATE_KEY);
  const hasLicense = !!localStorage.getItem(LICENSE_STORAGE_KEY);
  if (hasState && hasLicense) return { restored: false, reason: "already-populated" };

  const res = await safetyReadLatest();
  const data = res?.data;
  if (!data) return { restored: false, reason: "no-safety-backup" };

  let restoredState = false;
  let restoredLicense = false;

  // Restore tag packs / settings / ratings if missing.
  if (!hasState && typeof data.state === "string" && data.state.length > 0) {
    try {
      // Validate it's parseable JSON before injecting.
      JSON.parse(data.state);
      localStorage.setItem(STATE_KEY, data.state);
      restoredState = true;
    } catch { /* corrupted mirror — leave empty so DEFAULT_STATE kicks in */ }
  }

  // Restore license if missing.
  if (!hasLicense && data.license && typeof data.license === "object" && data.license.key) {
    try {
      localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(data.license));
      restoredLicense = true;
    } catch { /* ignore */ }
  }

  return { restored: restoredState || restoredLicense, restoredState, restoredLicense };
}

// Electron bridge — safe accessor for the desktop APIs the preload script exposes.
//
// When the app runs inside the packaged Electron shell, `window.electronAPI`
// is available (see electron-shell/preload.js). In a plain browser dev build
// (yarn start), that global is missing, so every export here degrades to a
// no-op or an empty result. That way React components can call these
// functions unconditionally without crashing outside Electron.

export function isElectron() {
  return typeof window !== "undefined" && !!window.electronAPI;
}

// Returns an array of drives:
//   [{ letter: "C:", label: "OS", totalBytes, freeBytes, usedBytes }, ...]
// Empty array on the browser / on any failure.
export async function listDrives() {
  if (!isElectron()) return [];
  try {
    const drives = await window.electronAPI.listDrives();
    return Array.isArray(drives) ? drives : [];
  } catch {
    return [];
  }
}

// Total free space across every drive, in bytes. 0 if unavailable.
export async function totalFreeBytes() {
  const drives = await listDrives();
  return drives.reduce((sum, d) => sum + (Number(d.freeBytes) || 0), 0);
}

// Human-friendly byte formatting: 1234567 -> "1.2 MB"
export function formatBytes(n) {
  const b = Number(n) || 0;
  if (b < 1024) return `${b} B`;
  const units = ["KB", "MB", "GB", "TB", "PB"];
  let v = b / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

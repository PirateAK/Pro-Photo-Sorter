// v1.7.0 — Remember the author / link / shipper description so Kurt never
// retypes them. Shared by PPS and the Tag Pack Creator (same localStorage
// origin inside each app).
const KEY = "pps.authorPrefs";

export function loadAuthorPrefs() {
  try { const v = JSON.parse(window.localStorage.getItem(KEY) || "{}"); return { author: v.author || "", link: v.link || "", description: v.description || "" }; }
  catch { return { author: "", link: "", description: "" }; }
}

export function saveAuthorPrefs(patch) {
  try { window.localStorage.setItem(KEY, JSON.stringify({ ...loadAuthorPrefs(), ...patch })); } catch { /* private mode */ }
}

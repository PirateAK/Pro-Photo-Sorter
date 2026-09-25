// Filename/path template renderer.
//
// NEW context (iteration 10+):
//   { folders: [{label}, ...], tags: [{label}, ...], originalName, exifDate, stars }
//
// Legacy (single-list) callers may pass { icons: [...] } instead — the first
// icon becomes the sole folder and the rest become tags (matches previous v1
// behavior).
//
// Tokens:
//   {folders}      folder labels joined by "/"
//   {folder1}..N   Nth folder label (empty if missing)
//   {tags}         tag labels joined by "_"
//   {tag1}..N      Nth tag label
//   Legacy:
//     {folder}   = {folder1}
//     {labels}   = {tags}
//     {label1}..N = {tagN}
//     {allLabels} = folders + tags joined by "_"
//   {date}    EXIF date YYYY-MM-DD
//   {stars}   0..5
//   {original} original filename stem
//   {ext}     extension incl. dot

import { sanitizeName } from "./fsapi";

function pad2(n) { return n < 10 ? "0" + n : "" + n; }

function fmtDate(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

export function extToLower(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i).toLowerCase() : "";
}

export function baseName(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

function coerce(ctx) {
  // Accept both legacy { icons } and new { folders, tags }
  if (Array.isArray(ctx.icons)) {
    const icons = ctx.icons;
    return {
      folders: icons.length > 0 ? [icons[0]] : [],
      tags: icons.slice(1),
    };
  }
  return {
    folders: Array.isArray(ctx.folders) ? ctx.folders : [],
    tags: Array.isArray(ctx.tags) ? ctx.tags : [],
  };
}

export function renderTemplate(template, ctx) {
  const {
    originalName = "photo.jpg",
    exifDate = null,
    stars = 0,
  } = ctx;
  const { folders, tags } = coerce(ctx);
  const ext = extToLower(originalName);
  const stem = baseName(originalName);
  const folderLabels = folders.map((i) => sanitizeName(i.label)).filter(Boolean);
  const tagLabels = tags.map((i) => sanitizeName(i.label)).filter(Boolean);

  const folderPath = folderLabels.length ? folderLabels.join("/") : "unsorted";
  const tagsJoined = tagLabels.length ? tagLabels.join("_") : stem;
  const allJoined = [...folderLabels, ...tagLabels].length
    ? [...folderLabels, ...tagLabels].join("_")
    : stem;
  const dateStr = fmtDate(exifDate) || fmtDate(new Date());

  let out = template || "{folders}/{tags}{ext}";
  out = out.replace(/\{(\w+)\}/g, (_, key) => {
    if (key === "folders") return folderPath;
    if (key === "tags") return tagsJoined;
    if (key === "allLabels") return allJoined;
    if (key === "date") return dateStr;
    if (key === "stars") return String(stars || 0);
    if (key === "original") return stem;
    if (key === "ext") return ext;

    // Legacy compatibility
    if (key === "folder") return folderLabels[0] || "";
    if (key === "labels") return tagsJoined;

    let m = key.match(/^folder(\d+)$/);
    if (m) return folderLabels[parseInt(m[1], 10) - 1] || "";
    m = key.match(/^tag(\d+)$/);
    if (m) return tagLabels[parseInt(m[1], 10) - 1] || "";
    m = key.match(/^label(\d+)$/); // legacy label1..N maps to tag1..N
    if (m) return tagLabels[parseInt(m[1], 10) - 1] || "";
    return "";
  });

  // Collapse repeated underscores and slashes from missing tokens
  out = out.replace(/_+/g, "_").replace(/\/+/g, "/").replace(/^\/+/, "");
  out = out.replace(/_\./g, ".").replace(/\/_/g, "/").replace(/_\//g, "/");

  const parts = out.split("/").map((p) => p.trim()).filter(Boolean);
  const fileName = parts.pop() || `photo${ext}`;
  const safeFolders = parts.map(sanitizeName).filter(Boolean);
  const dot = fileName.lastIndexOf(".");
  const safeName =
    dot > 0
      ? `${sanitizeName(fileName.slice(0, dot))}${fileName.slice(dot).toLowerCase()}`
      : sanitizeName(fileName);

  return {
    folderParts: safeFolders,
    fileName: safeName || `photo${ext}`,
    pathPreview: [...safeFolders, safeName].join("/"),
  };
}

export const TEMPLATE_TOKENS = [
  { token: "{folders}", desc: "All folder icons joined by /" },
  { token: "{folder1}", desc: "First folder icon" },
  { token: "{folder2}", desc: "Second folder icon" },
  { token: "{tags}", desc: "All filename icons joined by _" },
  { token: "{tag1}", desc: "First filename icon" },
  { token: "{tag2}", desc: "Second filename icon" },
  { token: "{date}", desc: "EXIF date YYYY-MM-DD" },
  { token: "{stars}", desc: "Star rating 0-5" },
  { token: "{original}", desc: "Original filename stem" },
  { token: "{ext}", desc: "Extension incl. dot" },
];

export const TEMPLATE_PRESETS = [
  { name: "Default (folders / tags)", value: "{folders}/{tags}{ext}" },
  { name: "Date-first", value: "{folders}/{date}_{tags}{ext}" },
  { name: "Star culling", value: "{stars}stars/{folders}/{tags}{ext}" },
  { name: "Studio format", value: "{date}-{folders}-{tags}{ext}" },
  { name: "Original preserved", value: "{folders}/{tags}_{original}{ext}" },
];

// v1.4.0 — Valid tokens for the Custom Filename Template validator. Kept in
// sync with the switch in renderTemplate() above. Any {token} on the input
// that isn't in this list (or the numbered folderN/tagN/labelN patterns) is
// flagged as invalid so bad templates never silently produce empty paths.
export const TEMPLATE_TOKEN_NAMES = new Set([
  "folders", "tags", "allLabels", "date", "stars", "original", "ext",
  // Legacy aliases still supported
  "folder", "labels",
]);
export const NUMBERED_TOKEN_RE = /^(?:folder|tag|label)\d+$/;

/**
 * Scan a template string for unknown {tokens}. Returns:
 *   { ok: true }                 if every token is valid,
 *   { ok: false, invalid: [...], suggestions: {...} } otherwise.
 * Suggestions map each bad token to its closest valid token (Levenshtein
 * distance ≤ 3) so the caller can offer "did you mean {folders}?" hints.
 */
export function validateTemplate(template) {
  const text = template || "";
  const tokens = [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const invalid = [];
  const validList = [...TEMPLATE_TOKEN_NAMES];
  for (const t of tokens) {
    if (TEMPLATE_TOKEN_NAMES.has(t)) continue;
    if (NUMBERED_TOKEN_RE.test(t)) continue;
    invalid.push(t);
  }
  if (invalid.length === 0) return { ok: true };
  const suggestions = {};
  for (const bad of invalid) {
    let best = null;
    let bestDist = Infinity;
    for (const good of validList) {
      const d = levenshtein(bad.toLowerCase(), good.toLowerCase());
      if (d < bestDist) { bestDist = d; best = good; }
    }
    if (best && bestDist <= 3) suggestions[bad] = best;
  }
  return { ok: false, invalid, suggestions };
}

// Small self-contained edit distance so we don't need a dependency.
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

/**
 * Auto-name a custom template using the user's own string. Uses the first
 * non-token word (case-preserving), else falls back to "Custom".
 */
export function autoNameForTemplate(template) {
  const stripped = (template || "").replace(/\{[^}]+\}/g, " ").replace(/[^A-Za-z0-9]+/g, " ").trim();
  const first = stripped.split(/\s+/).find(Boolean);
  const name = (first || "Custom").slice(0, 24);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

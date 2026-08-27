// Filename/path template renderer.
// Tokens:
//   {folder}      first icon label (or "unsorted")
//   {labels}      remaining icon labels joined by "_" (or original stem)
//   {label1}..{labelN}  individual icon labels (empty string if missing)
//   {allLabels}   all icon labels joined by "_"
//   {date}        YYYY-MM-DD from EXIF (falls back to today)
//   {stars}       "5" or "0" as text
//   {original}    original filename stem
//   {ext}         extension including dot (".jpg")
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

export function renderTemplate(template, ctx) {
  const {
    icons = [],
    originalName = "photo.jpg",
    exifDate = null,
    stars = 0,
  } = ctx;

  const ext = extToLower(originalName);
  const stem = baseName(originalName);
  const labels = icons.map((i) => sanitizeName(i.label)).filter(Boolean);
  const folder = labels[0] || "unsorted";
  const rest = labels.slice(1);
  const restJoined = rest.length ? rest.join("_") : stem;
  const allJoined = labels.length ? labels.join("_") : stem;
  const dateStr = fmtDate(exifDate) || fmtDate(new Date());

  let out = template || "{folder}/{labels}{ext}";
  out = out.replace(/\{(\w+)\}/g, (_, key) => {
    if (key === "folder") return folder;
    if (key === "labels") return restJoined;
    if (key === "allLabels") return allJoined;
    if (key === "date") return dateStr;
    if (key === "stars") return String(stars || 0);
    if (key === "original") return stem;
    if (key === "ext") return ext;
    const m = key.match(/^label(\d+)$/);
    if (m) {
      const idx = parseInt(m[1], 10) - 1;
      return labels[idx] || "";
    }
    return "";
  });

  // Collapse repeated underscores and slashes from missing tokens
  out = out.replace(/_+/g, "_").replace(/\/+/g, "/").replace(/^\/+/, "");
  out = out.replace(/_\./g, ".").replace(/\/_/g, "/").replace(/_\//g, "/");

  // Split into folder parts + filename
  const parts = out.split("/").map((p) => p.trim()).filter(Boolean);
  const fileName = parts.pop() || `photo${ext}`;
  const safeFolders = parts.map(sanitizeName).filter(Boolean);
  // Sanitize filename but preserve dot for extension
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
  { token: "{folder}", desc: "First icon label (subfolder)" },
  { token: "{labels}", desc: "Remaining icons joined by _" },
  { token: "{label1}", desc: "First icon label" },
  { token: "{label2}", desc: "Second icon label" },
  { token: "{allLabels}", desc: "All icon labels joined by _" },
  { token: "{date}", desc: "EXIF date YYYY-MM-DD" },
  { token: "{stars}", desc: "Star rating 0-5" },
  { token: "{original}", desc: "Original filename stem" },
  { token: "{ext}", desc: "Extension incl. dot" },
];

export const TEMPLATE_PRESETS = [
  { name: "Default (folder / labels)", value: "{folder}/{labels}{ext}" },
  { name: "Date-first", value: "{folder}/{date}_{labels}{ext}" },
  { name: "Star culling", value: "{stars}stars/{folder}/{labels}{ext}" },
  { name: "Studio format", value: "{date}-{folder}-{labels}{ext}" },
  { name: "Original preserved", value: "{folder}/{labels}_{original}{ext}" },
];

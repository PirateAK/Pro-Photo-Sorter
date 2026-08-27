// Rename template renderer (separate from destination template).
// Tokens:
//   {n}, {nn}, {nnn}, {nnnn}  index (1-based, zero-padded)
//   {N}                       total count
//   {date}                    EXIF date YYYY-MM-DD (falls back to today)
//   {stars}                   star rating (0-5)
//   {original}                original stem
//   {ext}                     extension incl. dot
import { sanitizeName } from "./fsapi";

function pad2(n) { return n < 10 ? "0" + n : "" + n; }
function padN(n, w) {
  const s = "" + n;
  return s.length >= w ? s : "0".repeat(w - s.length) + s;
}

function fmtDate(d) {
  if (!d) return "";
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return "";
  return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
}

export function renderRenameTemplate(template, ctx) {
  const {
    index = 1,
    total = 1,
    originalName = "photo.jpg",
    exifDate = null,
    stars = 0,
  } = ctx;
  const dot = originalName.lastIndexOf(".");
  const stem = dot > 0 ? originalName.slice(0, dot) : originalName;
  const ext = dot > 0 ? originalName.slice(dot).toLowerCase() : "";
  const dateStr = fmtDate(exifDate) || fmtDate(new Date());

  let out = template || "{original}{ext}";
  out = out.replace(/\{(\w+)\}/g, (_, key) => {
    if (key === "n") return String(index);
    if (key === "nn") return padN(index, 2);
    if (key === "nnn") return padN(index, 3);
    if (key === "nnnn") return padN(index, 4);
    if (key === "N") return String(total);
    if (key === "date") return dateStr;
    if (key === "stars") return String(stars || 0);
    if (key === "original") return stem;
    if (key === "ext") return ext;
    return "";
  });
  out = out.replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  // preserve extension in the final name
  const finalDot = out.lastIndexOf(".");
  if (finalDot > 0) {
    return `${sanitizeName(out.slice(0, finalDot))}${out.slice(finalDot).toLowerCase()}`;
  }
  return `${sanitizeName(out)}${ext}`;
}

export const RENAME_PRESETS = [
  { name: "Studio", value: "shoot_{nnn}{ext}" },
  { name: "Date + N", value: "{date}_{nnn}{ext}" },
  { name: "Keep original", value: "{original}_{nn}{ext}" },
  { name: "Stars grouped", value: "{stars}star_{nnn}{ext}" },
];

export const RENAME_TOKENS = [
  { token: "{n}", desc: "Index (1, 2, 3…)" },
  { token: "{nn}", desc: "2-digit index (01, 02…)" },
  { token: "{nnn}", desc: "3-digit index (001…)" },
  { token: "{nnnn}", desc: "4-digit index (0001…)" },
  { token: "{N}", desc: "Total photo count" },
  { token: "{date}", desc: "EXIF date YYYY-MM-DD" },
  { token: "{stars}", desc: "Star rating 0-5" },
  { token: "{original}", desc: "Original filename stem" },
  { token: "{ext}", desc: "Extension incl. dot" },
];

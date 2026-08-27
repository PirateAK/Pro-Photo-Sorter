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

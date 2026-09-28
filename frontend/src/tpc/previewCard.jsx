// v1.5.0 — Gumroad-ready cover image for a tag pack (1280×720 PNG).
// Renders pack name, author, an icon mosaic of the sub-folders/tags and
// the counts on the PPS earth-tone palette. Lucide icons are turned into
// SVG data-URLs via react-dom/server so they can be drawn on a canvas.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as Lucide from "lucide-react";
import { countPack } from "../lib/packFormat";

const W = 1280, H = 720;
const C = { bg: "#1A1715", surface: "#26221F", border: "#423A35", primary: "#C68A53", text: "#F2EBE5", dim: "#A69C95", deep: "#110F0E" };

function iconSrc(item) {
  if (item?.iconType === "image" && item.iconData) return item.iconData;
  const Cmp = Lucide[item?.iconName] || Lucide.Tag;
  const svg = renderToStaticMarkup(<Cmp size={64} color={C.primary} strokeWidth={1.75} />);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
const load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

export async function renderPreviewCard(pack) {
  const canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  // subtle grain
  for (let i = 0; i < 2600; i++) { ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; ctx.fillRect(Math.random() * W, Math.random() * H, 2, 2); }

  // left text block
  ctx.fillStyle = C.primary; ctx.font = "600 18px 'JetBrains Mono', monospace"; ctx.fillText("PRO PHOTO SORTER · TAG PACK", 72, 96);
  ctx.fillStyle = C.text; ctx.font = "800 64px Manrope, sans-serif";
  const name = pack.name || "Untitled pack";
  const words = name.split(" "); let line = "", y = 190;
  for (const w of words) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > 560 && line) { ctx.fillText(line, 72, y); y += 72; line = w; } else line = t; }
  ctx.fillText(line, 72, y); y += 48;
  if (pack.author) { ctx.fillStyle = C.dim; ctx.font = "500 24px 'IBM Plex Sans', sans-serif"; ctx.fillText(`by ${pack.author}`, 72, y + 12); y += 44; }

  // counts pills
  const counts = countPack(pack);
  const tagTotal = counts.tags + (pack.filenameItems || []).length;
  const pills = [`${counts.subfolders} sub-folder${counts.subfolders === 1 ? "" : "s"}`, `${tagTotal} tag${tagTotal === 1 ? "" : "s"}`, "Lightroom-ready XMP", "100% offline"];
  let px = 72; const py = H - 150;
  ctx.font = "500 18px 'IBM Plex Sans', sans-serif";
  for (const p of pills) { const w = ctx.measureText(p).width + 36; ctx.fillStyle = C.surface; rr(ctx, px, py, w, 40, 20); ctx.fill(); ctx.strokeStyle = C.border; ctx.stroke(); ctx.fillStyle = C.text; ctx.fillText(p, px + 18, py + 26); px += w + 12; }
  ctx.fillStyle = C.dim; ctx.font = "400 16px 'JetBrains Mono', monospace"; ctx.fillText("muskegman.com  ·  .pps-tagpack.json", 72, H - 60);

  // path sample
  const first = (pack.subfolders || [])[0];
  const firstTag = first?.filenameItems?.[0]?.label || (pack.filenameItems || [])[0]?.label || "tag";
  ctx.fillStyle = C.deep; rr(ctx, 72, py - 64, 560, 44, 8); ctx.fill(); ctx.strokeStyle = C.border; ctx.stroke();
  ctx.fillStyle = C.primary; ctx.font = "500 17px 'JetBrains Mono', monospace";
  ctx.fillText(`${name}/${first?.name || "Folder"}/${firstTag}.jpg`.slice(0, 48), 90, py - 36);

  // icon mosaic (right)
  const items = [];
  const walk = (nodes) => { for (const n of nodes || []) { items.push(n); for (const t of n.filenameItems || []) items.push(t); walk(n.subfolders); } };
  walk(pack.subfolders); for (const t of pack.filenameItems || []) items.push(t);
  const cols = 4, size = 104, gap = 18, gx = W - 72 - cols * size - (cols - 1) * gap, gy = 96;
  const shown = items.slice(0, 20);
  for (let i = 0; i < 20; i++) {
    const x = gx + (i % cols) * (size + gap), yy = gy + Math.floor(i / cols) * (size + gap);
    ctx.fillStyle = C.surface; rr(ctx, x, yy, size, size, 16); ctx.fill(); ctx.strokeStyle = C.border; ctx.lineWidth = 1; ctx.stroke();
    const it = shown[i];
    if (!it) continue;
    try { const img = await load(iconSrc(it)); ctx.drawImage(img, x + 20, yy + 14, 64, 64); } catch { /* skip */ }
    ctx.fillStyle = C.dim; ctx.font = "500 12px 'IBM Plex Sans', sans-serif"; ctx.textAlign = "center";
    ctx.fillText((it.label || it.name || "").slice(0, 14), x + size / 2, yy + size - 12); ctx.textAlign = "left";
  }
  if (items.length > 20) { ctx.fillStyle = C.dim; ctx.font = "500 16px 'IBM Plex Sans', sans-serif"; ctx.textAlign = "right"; ctx.fillText(`+${items.length - 20} more`, W - 72, gy + 5 * (size + gap) - 6); ctx.textAlign = "left"; }
  return canvas.toDataURL("image/png");
}

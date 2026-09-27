// Crop-and-resize helper for print-sized exports.
// Given a source image handle, an aspect ratio, and a target pixel size,
// crops the image to the aspect ratio (positioned by centerX/centerY as
// percentages 0..1) and resizes to the target dimensions. Returns a Blob
// ready to be written to disk via lib/fsapi.writeBlobTo.

import { paintWatermark } from "./watermark";

// ISO 300 DPI print sizes. Orientation-agnostic here — the caller decides
// whether the photo is portrait or landscape and swaps target dims to match.
export const PRINT_SIZES = [
  { key: "4x6",   short: 1200, long: 1800, aspectShort: 4, aspectLong: 6 },
  { key: "5x7",   short: 1500, long: 2100, aspectShort: 5, aspectLong: 7 },
  { key: "8x10",  short: 2400, long: 3000, aspectShort: 8, aspectLong: 10 },
  { key: "10x12", short: 3000, long: 3600, aspectShort: 10, aspectLong: 12 },
  { key: "16x20", short: 4800, long: 6000, aspectShort: 16, aspectLong: 20 },
];

export function getPrintSize(key) {
  return PRINT_SIZES.find((p) => p.key === key) || null;
}

// Compute target width/height in pixels for the given print size, matching
// the photo's orientation (landscape / portrait).
// v1.4.5h — `orientation` override lets the caller FORCE the crop to be
// portrait or landscape regardless of the source aspect. "auto" (or
// omitted) preserves the historical behavior of matching source shape.
export function targetDimsFor({ printKey, sourceW, sourceH, orientation = "auto" }) {
  const p = getPrintSize(printKey);
  if (!p) return null;
  let landscape;
  if (orientation === "landscape") landscape = true;
  else if (orientation === "portrait") landscape = false;
  else landscape = sourceW >= sourceH;
  const w = landscape ? p.long : p.short;
  const h = landscape ? p.short : p.long;
  return { w, h, aspectW: landscape ? p.aspectLong : p.aspectShort, aspectH: landscape ? p.aspectShort : p.aspectLong };
}

// Given source dims and target aspect, return the max crop box (in source
// pixels) that fits inside the source at the target aspect ratio.
export function cropBoxFor({ sourceW, sourceH, aspectW, aspectH }) {
  const sourceAspect = sourceW / sourceH;
  const targetAspect = aspectW / aspectH;
  let cw, ch;
  if (sourceAspect > targetAspect) {
    // Source is wider than target → limited by height
    ch = sourceH;
    cw = ch * targetAspect;
  } else {
    // Source is taller (or equal) → limited by width
    cw = sourceW;
    ch = cw / targetAspect;
  }
  return { cw: Math.floor(cw), ch: Math.floor(ch) };
}

// Load a source handle and decode it. Returns { img, url }. Caller must
// URL.revokeObjectURL(url) when done.
export async function loadImageFromHandle(sourceHandle) {
  const file = await sourceHandle.getFile();
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  return { img, url, file };
}

// Do the crop + resize + optional watermark. Returns a Blob.
// centerX / centerY are 0..1 percentages of where the crop box's CENTER
// should sit inside the source image (0.5 = middle).
// v1.4.5h — orientation forwarded to targetDimsFor so the exported blob
// matches whatever preview the user confirmed.
// v1.4.5k — sizeFrac (0.2..1.0) shrinks the max-fit crop while the aspect
// ratio stays pinned, so Kurt's tighter compositions from the modal's
// corner-drag handles export exactly what he saw.
export async function cropAndResize({
  sourceHandle,
  printKey,
  centerX = 0.5,
  centerY = 0.5,
  orientation = "auto",
  sizeFrac = 1,
  watermarkOpts = null, // { text, fontSize, opacity, xPct, yPct, color, fontFamily }
  mime = "image/jpeg",
  quality = 0.92,
}) {
  const { img, url } = await loadImageFromHandle(sourceHandle);
  try {
    const sourceW = img.naturalWidth;
    const sourceH = img.naturalHeight;
    const dims = targetDimsFor({ printKey, sourceW, sourceH, orientation });
    if (!dims) throw new Error(`Unknown print size: ${printKey}`);
    const maxCrop = cropBoxFor({ sourceW, sourceH, aspectW: dims.aspectW, aspectH: dims.aspectH });
    const frac = Math.max(0.2, Math.min(1, sizeFrac));
    const cw = maxCrop.cw * frac;
    const ch = maxCrop.ch * frac;

    // Clamp centerX/centerY so the crop box never goes off the source image
    const halfW = cw / 2;
    const halfH = ch / 2;
    const centerPxX = Math.max(halfW, Math.min(sourceW - halfW, centerX * sourceW));
    const centerPxY = Math.max(halfH, Math.min(sourceH - halfH, centerY * sourceH));
    const sx = Math.round(centerPxX - halfW);
    const sy = Math.round(centerPxY - halfH);

    const canvas = document.createElement("canvas");
    canvas.width = dims.w;
    canvas.height = dims.h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, cw, ch, 0, 0, dims.w, dims.h);

    if (watermarkOpts?.text) {
      paintWatermark(ctx, watermarkOpts.text, {
        width: dims.w,
        height: dims.h,
        fontSize: watermarkOpts.fontSize,
        opacity: watermarkOpts.opacity,
        xPct: watermarkOpts.xPct,
        yPct: watermarkOpts.yPct,
        color: watermarkOpts.color,
        fontFamily: watermarkOpts.fontFamily,
      });
    }

    return await new Promise((res) => canvas.toBlob(res, mime, quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

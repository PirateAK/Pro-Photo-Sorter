// Watermark helper — loads a source image via FSA handle, draws it on a canvas,
// stamps the given text at the configured position, and returns a Blob.
//
// Options:
//   fontSize:  "small" | "medium" | "large"    (default "medium" — 1.6% of long edge)
//   opacity:   0..1                            (default 0.9)
//   xPct/yPct: 0..1 — anchor point on the image
//              (default 0.98, 0.98 → bottom-right corner with small padding)
//   mime:      output MIME (auto-detected from source extension if omitted)
//   quality:   0..1 JPEG/WebP quality (default 0.92)

function mimeForName(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

// Font size fraction of the long edge.
export const FONT_SIZE_FRACTION = {
  small: 0.010,   // ~1.0% — subtle
  medium: 0.016,  // ~1.6% — default
  large: 0.024,   // ~2.4% — prominent
};

// Compute { fs, padding, textAlign, textBaseline, drawX, drawY } from options
// and canvas dimensions. Shared by writeWithWatermark and any live preview so
// they render identically.
export function computeStampGeom({ width, height, fontSize = "medium", xPct = 0.98, yPct = 0.98, scale = 1 }) {
  const frac = FONT_SIZE_FRACTION[fontSize] ?? FONT_SIZE_FRACTION.medium;
  const fs = Math.max(8, Math.round(Math.max(width, height) * frac * scale));
  const padding = Math.round(fs * 0.9);

  const x = Math.round(xPct * width);
  const y = Math.round(yPct * height);

  // Auto-align so text reads well against edges. Split the image into thirds:
  //   left third → left-align  · middle → center · right third → right-align
  //   top third → top baseline · middle → middle · bottom third → alphabetic
  let textAlign = "center";
  if (xPct < 0.34) textAlign = "left";
  else if (xPct > 0.66) textAlign = "right";
  let textBaseline = "middle";
  if (yPct < 0.34) textBaseline = "top";
  else if (yPct > 0.66) textBaseline = "alphabetic";

  // Nudge inward from edges by `padding` so text doesn't kiss the border.
  let drawX = x;
  let drawY = y;
  if (textAlign === "left") drawX = Math.max(padding, x);
  if (textAlign === "right") drawX = Math.min(width - padding, x);
  if (textBaseline === "top") drawY = Math.max(padding, y);
  if (textBaseline === "alphabetic") drawY = Math.min(height - padding, y);

  return { fs, padding, textAlign, textBaseline, drawX, drawY };
}

// Paint the watermark on an existing 2D context. Extracted so previews and
// exports can share pixel-identical rendering.
export function paintWatermark(ctx, text, { width, height, fontSize = "medium", opacity = 0.9, xPct = 0.98, yPct = 0.98, scale = 1, color = "white" }) {
  const { fs, textAlign, textBaseline, drawX, drawY } = computeStampGeom({ width, height, fontSize, xPct, yPct, scale });
  const isBlack = color === "black";
  ctx.save();
  ctx.font = `600 ${fs}px system-ui, -apple-system, "Segoe UI", Inter, sans-serif`;
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
  // Contrast halo: dark text gets a light halo, light text gets a dark halo.
  ctx.shadowColor = isBlack ? "rgba(255, 255, 255, 0.65)" : "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = Math.max(4, fs * 0.25);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 1;
  const rgb = isBlack ? "0, 0, 0" : "255, 255, 255";
  ctx.fillStyle = `rgba(${rgb}, ${Math.max(0, Math.min(1, opacity))})`;
  ctx.fillText(text, drawX, drawY);
  ctx.restore();
}

export async function writeWithWatermark(sourceHandle, text, opts = {}) {
  const file = await sourceHandle.getFile();
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);

    paintWatermark(ctx, text, {
      width: c.width,
      height: c.height,
      fontSize: opts.fontSize,
      opacity: opts.opacity,
      xPct: opts.xPct,
      yPct: opts.yPct,
      color: opts.color,
    });

    const mime = opts.mime || mimeForName(sourceHandle.name || file.name || "");
    const quality = mime === "image/png" ? undefined : (opts.quality ?? 0.92);
    return await new Promise((res) => c.toBlob(res, mime, quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

const WM_EXT_RE = /\.(jpe?g|png|webp)$/i;
export function canWatermark(name) {
  return WM_EXT_RE.test(name || "");
}

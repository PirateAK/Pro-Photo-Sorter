// Watermark helper — loads a source image via FSA handle, draws it on a canvas,
// stamps the given text in the bottom-right corner, and returns a Blob.
// Text is white with a subtle dark shadow so it stays legible over any background.
//
// The output MIME type is matched to the source extension where possible so
// PNGs stay lossless and JPEGs stay JPEGs (92% quality).

function mimeForName(name) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  // gif/bmp/heic/heif fall back to jpeg (canvas can't encode heic anyway).
  return "image/jpeg";
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

    // Font size ~1.6% of the long edge, min 14px
    const fs = Math.max(14, Math.round(Math.max(c.width, c.height) * 0.016));
    const padding = Math.round(fs * 0.9);
    ctx.font = `600 ${fs}px system-ui, -apple-system, "Segoe UI", Inter, sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";

    // Subtle dark shadow behind text for legibility
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = Math.max(4, fs * 0.25);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fillText(text, c.width - padding, c.height - padding);

    ctx.shadowBlur = 0;

    const mime = opts.mime || mimeForName(sourceHandle.name || file.name || "");
    const quality = mime === "image/png" ? undefined : (opts.quality ?? 0.92);
    return await new Promise((res) => c.toBlob(res, mime, quality));
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Whether a given filename is a raster type we can watermark via canvas.
const WM_EXT_RE = /\.(jpe?g|png|webp)$/i;
export function canWatermark(name) {
  return WM_EXT_RE.test(name || "");
}

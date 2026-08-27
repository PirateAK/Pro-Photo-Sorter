// Auto-tone analysis: examines a small sampled canvas of an HTMLImageElement
// (or canvas) and suggests brightness/contrast/saturation adjustments.

export function autoAnalyze(imgEl) {
  const src = imgEl;
  const c = document.createElement("canvas");
  const size = 256;
  const r = Math.min(size / src.width, size / src.height, 1);
  c.width = Math.max(1, Math.round(src.width * r));
  c.height = Math.max(1, Math.round(src.height * r));
  const ctx = c.getContext("2d");
  ctx.drawImage(src, 0, 0, c.width, c.height);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;

  const hist = new Uint32Array(256);
  let satSum = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    const R = data[i], G = data[i + 1], B = data[i + 2];
    const y = Math.round(0.2126 * R + 0.7152 * G + 0.0722 * B);
    hist[y]++;
    const mx = Math.max(R, G, B);
    const mn = Math.min(R, G, B);
    const s = mx === 0 ? 0 : (mx - mn) / mx;
    satSum += s;
    n++;
  }

  const total = n;
  let cum = 0;
  let p1 = 0, p50 = 128, p99 = 255;
  let foundP1 = false, foundP50 = false;
  for (let i = 0; i < 256; i++) {
    cum += hist[i];
    const frac = cum / total;
    if (!foundP1 && frac >= 0.01) { p1 = i; foundP1 = true; }
    if (!foundP50 && frac >= 0.5) { p50 = i; foundP50 = true; }
    if (frac >= 0.99) { p99 = i; break; }
  }
  const avgSat = total ? satSum / total : 0.3;

  const range = Math.max(1, p99 - p1);
  const contrast = Math.max(-50, Math.min(50, Math.round(((255 / range) - 1) * 50)));
  const brightness = Math.max(-80, Math.min(80, Math.round(((128 - p50) / 128) * 40)));
  // Bump saturation if scene is muted; slight dial-down if oversaturated
  const target = 0.45;
  const saturation = Math.max(-100, Math.min(100, Math.round((target - avgSat) * 140)));
  return { brightness, contrast, saturation };
}

// Convenience: analyze a File object (used by batch auto-enhance)
export async function autoAnalyzeFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = url;
    });
    return { result: autoAnalyze(img), img };
  } finally {
    URL.revokeObjectURL(url);
  }
}

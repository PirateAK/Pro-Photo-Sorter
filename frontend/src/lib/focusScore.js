// Focus and face detection helpers for auto-rating.
// - Laplacian variance = classical sharpness proxy
// - Uses window.FaceDetector when available (Chrome/Edge); falls back gracefully.

const HAS_FACE_DETECTOR = typeof window !== "undefined" && "FaceDetector" in window;

// Compute a normalized focus score (0..1) via Laplacian variance on a downsampled grayscale image.
export function computeFocusScore(imgEl) {
  const canvas = document.createElement("canvas");
  const size = 320;
  const r = Math.min(size / imgEl.width, size / imgEl.height, 1);
  canvas.width = Math.max(1, Math.round(imgEl.width * r));
  canvas.height = Math.max(1, Math.round(imgEl.height * r));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(imgEl, 0, 0, canvas.width, canvas.height);
  const { data, width: w, height: h } = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Grayscale
  const gray = new Float32Array(w * h);
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    gray[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }

  // Laplacian (4-neighbor) variance
  let sum = 0, sum2 = 0, n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const c = gray[y * w + x];
      const l = 4 * c - gray[(y - 1) * w + x] - gray[(y + 1) * w + x]
                       - gray[y * w + (x - 1)] - gray[y * w + (x + 1)];
      sum += l;
      sum2 += l * l;
      n++;
    }
  }
  const mean = sum / n;
  const variance = sum2 / n - mean * mean;
  // Empirical normalization: variance of well-focused photos is typically 500-3000+
  // Map log10(var) linearly to 0..1 (log10 100 -> 0, log10 4000 -> 1)
  const lv = Math.log10(Math.max(1, variance));
  const norm = Math.max(0, Math.min(1, (lv - 2.0) / 1.6));
  return norm;
}

// Try to detect faces; returns count or null if unsupported.
export async function detectFaces(imgEl) {
  if (!HAS_FACE_DETECTOR) return null;
  try {
    // eslint-disable-next-line no-undef
    const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 10 });
    const faces = await detector.detect(imgEl);
    return faces?.length || 0;
  } catch {
    return null;
  }
}

// Combined auto-rating (1..5). Faces provide a boost; focus is the base.
export async function computeAutoRating(imgEl) {
  const focus = computeFocusScore(imgEl); // 0..1
  const faces = await detectFaces(imgEl); // null | number

  // Base stars from focus: 0.0->1, 0.3->2, 0.55->3, 0.75->4, 0.9->5
  let base = 1;
  if (focus >= 0.9) base = 5;
  else if (focus >= 0.75) base = 4;
  else if (focus >= 0.55) base = 3;
  else if (focus >= 0.3) base = 2;

  // Face boost: at least 3 stars if faces & focus is decent
  if (faces && faces > 0 && focus >= 0.4) base = Math.max(base, 3);
  if (faces && faces > 0 && focus >= 0.6) base = Math.max(base, 4);
  if (faces && faces >= 2 && focus >= 0.5) base = Math.max(base, 4);

  return {
    stars: base,
    focus: Math.round(focus * 100),
    faces,
    faceApiAvailable: faces !== null,
  };
}

export function isFaceApiAvailable() {
  return HAS_FACE_DETECTOR;
}

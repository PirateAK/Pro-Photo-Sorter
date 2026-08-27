// Simple in-memory thumbnail cache keyed by folder+name.
// Not persisted — but very fast during a session.
const cache = new Map();
const inflight = new Map();

const THUMB_SIZE = 220;

export async function getThumbnail(fileHandle, key) {
  if (cache.has(key)) return cache.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const p = (async () => {
    try {
      const file = await fileHandle.getFile();
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ratio = Math.min(THUMB_SIZE / img.width, THUMB_SIZE / img.height, 1);
      canvas.width = Math.max(1, Math.round(img.width * ratio));
      canvas.height = Math.max(1, Math.round(img.height * ratio));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      cache.set(key, dataUrl);
      return dataUrl;
    } catch (e) {
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

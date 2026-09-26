// Persistent thumbnail cache using IndexedDB, with in-memory fast layer.
// Key: `${folderPath}::${fileName}::${size}`
const DB_NAME = "pps-thumbs";
const STORE = "thumbs";
const THUMB_SIZE = 220;

const mem = new Map();
const inflight = new Map();
let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function idbGet(key) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const r = store.get(key);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => reject(r.error);
    });
  } catch {
    return null;
  }
}

async function idbSet(key, value) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    // ignore
  }
}

export async function clearThumbCache() {
  mem.clear();
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

// v1.4.5 — Stats for the "clear cache" confirmation. Counts entries and
// estimates on-disk size by summing every data-URL string length (which
// approximates base64 payload bytes closely enough for a user prompt).
// Returns { count, bytes, formatted } — `formatted` is a friendly
// display like "1,247 thumbs · 43.2 MB".
export async function getThumbCacheStats() {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      let count = 0;
      let bytes = 0;
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          count += 1;
          const v = cursor.value;
          if (typeof v === "string") bytes += v.length;
          cursor.continue();
        } else {
          resolve({ count, bytes, formatted: formatStats(count, bytes) });
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return { count: 0, bytes: 0, formatted: "0 thumbs · 0 B" };
  }
}

function formatStats(count, bytes) {
  const units = ["B", "KB", "MB", "GB"];
  let n = bytes;
  let u = 0;
  while (n >= 1024 && u < units.length - 1) { n /= 1024; u += 1; }
  const size = n >= 100 || u === 0 ? Math.round(n) : n.toFixed(1);
  return `${count.toLocaleString()} thumb${count === 1 ? "" : "s"} · ${size} ${units[u]}`;
}

export async function getThumbnail(fileHandle, key) {
  if (mem.has(key)) return mem.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const p = (async () => {
    // 1) IDB hit?
    const cached = await idbGet(key);
    if (cached) {
      mem.set(key, cached);
      return cached;
    }
    // 2) Generate from file
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
      mem.set(key, dataUrl);
      idbSet(key, dataUrl);
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

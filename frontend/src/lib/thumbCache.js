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

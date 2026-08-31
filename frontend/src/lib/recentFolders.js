// Recent folder handles — stored in IndexedDB (FileSystemHandles can't go in localStorage).
// Two rings: "source" and "dest". Max 5 entries each, most-recent-first.
const DB = "pps-recent";
const STORE = "folders";
const MAX = 5;

function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function readAll(kind) {
  try {
    const db = await open();
    return await new Promise((res) => {
      const tx = db.transaction(STORE, "readonly").objectStore(STORE);
      const r = tx.getAll();
      r.onsuccess = () => {
        const rows = (r.result || []).filter((x) => x.kind === kind);
        rows.sort((a, b) => b.ts - a.ts);
        res(rows);
      };
      r.onerror = () => res([]);
    });
  } catch {
    return [];
  }
}

async function writeAll(kind, rows) {
  try {
    const db = await open();
    await new Promise((res) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      // Delete existing kind rows
      const cur = store.openCursor();
      cur.onsuccess = () => {
        const c = cur.result;
        if (c) {
          if (c.value.kind === kind) c.delete();
          c.continue();
        } else {
          for (const r of rows) store.put(r);
        }
      };
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch { /* ignore */ }
}

export async function getRecent(kind) {
  return await readAll(kind);
}

export async function addRecent(kind, handle, name) {
  const existing = await readAll(kind);
  const filtered = existing.filter((r) => r.name !== name);
  const next = [{ id: `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, kind, name, handle, ts: Date.now() }, ...filtered].slice(0, MAX);
  await writeAll(kind, next);
}

export async function removeRecent(kind, name) {
  const existing = await readAll(kind);
  await writeAll(kind, existing.filter((r) => r.name !== name));
}

// Verify + request permission for a stored handle. Returns the handle if ok, null otherwise.
export async function reacquire(handle, mode = "readwrite") {
  try {
    if (!handle) return null;
    if ((await handle.queryPermission({ mode })) === "granted") return handle;
    if ((await handle.requestPermission({ mode })) === "granted") return handle;
  } catch { /* ignore */ }
  return null;
}

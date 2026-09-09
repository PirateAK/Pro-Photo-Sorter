// Wrappers around the File System Access API.
// Works in Chromium browsers (Chrome, Edge, Brave, Opera).

export function isFSAccessSupported() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export async function pickDirectory(opts = {}) {
  if (!isFSAccessSupported()) {
    throw new Error(
      "Your browser does not support the File System Access API. Please use Chrome, Edge, or the packaged desktop app."
    );
  }
  const options = { mode: opts.mode || "readwrite" };
  if (opts.id) options.id = opts.id;
  if (opts.startIn) options.startIn = opts.startIn;
  // eslint-disable-next-line no-undef
  return await window.showDirectoryPicker(options);
}

const IMAGE_EXTS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "tif", "tiff", "heic", "heif", "avif"];

export function isImageName(name) {
  const ext = name.split(".").pop()?.toLowerCase();
  return IMAGE_EXTS.includes(ext);
}

export async function listChildren(dirHandle) {
  const dirs = [];
  const files = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === "directory") dirs.push({ name, handle });
    else files.push({ name, handle });
  }
  dirs.sort((a, b) => a.name.localeCompare(b.name));
  files.sort((a, b) => a.name.localeCompare(b.name));
  return { dirs, files };
}

export async function listImagesInDir(dirHandle) {
  const out = [];
  for await (const [name, handle] of dirHandle.entries()) {
    if (handle.kind === "file" && isImageName(name)) {
      out.push({ name, handle });
    }
  }
  out.sort((a, b) => a.name.localeCompare(b.name));
  return out;
}

export async function getOrCreateSubdir(rootHandle, pathParts) {
  let cur = rootHandle;
  for (const part of pathParts) {
    const safe = sanitizeName(part);
    if (!safe) continue;
    cur = await cur.getDirectoryHandle(safe, { create: true });
  }
  return cur;
}

export function sanitizeName(s) {
  return String(s || "")
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
}

export async function copyFileTo(sourceHandle, destDirHandle, destName) {
  const srcFile = await sourceHandle.getFile();
  const uniqueName = await findUniqueName(destDirHandle, destName);
  const newHandle = await destDirHandle.getFileHandle(uniqueName, { create: true });
  const writable = await newHandle.createWritable();
  await writable.write(srcFile);
  await writable.close();
  return uniqueName;
}

// Write an arbitrary Blob (e.g. a watermarked canvas export) to a directory,
// keeping the same unique-name behaviour as copyFileTo.
export async function writeBlobTo(blob, destDirHandle, destName) {
  const uniqueName = await findUniqueName(destDirHandle, destName);
  const newHandle = await destDirHandle.getFileHandle(uniqueName, { create: true });
  const writable = await newHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  return uniqueName;
}

async function findUniqueName(dirHandle, name) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let candidate = name;
  let i = 1;
  // Try existence check
  while (await exists(dirHandle, candidate)) {
    candidate = `${base}_${i}${ext}`;
    i++;
    if (i > 999) break;
  }
  return candidate;
}

async function exists(dirHandle, name) {
  try {
    await dirHandle.getFileHandle(name);
    return true;
  } catch {
    try {
      await dirHandle.getDirectoryHandle(name);
      return true;
    } catch {
      return false;
    }
  }
}

export async function removeEntry(parentDirHandle, name) {
  await parentDirHandle.removeEntry(name);
}

export function readAsObjectURL(fileHandle) {
  return fileHandle.getFile().then((f) => URL.createObjectURL(f));
}

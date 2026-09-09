// Recursive photo search over the FSA API.  Yields matches progressively so
// the UI can show live counters.  Skips the .pps-trash folder.
import exifr from "exifr";

const IMG_RE = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i;

// Strip file extension for token matching.
function stem(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i).toLowerCase() : name.toLowerCase();
}

// Split a filename stem into tokens.  We split on any of: - _ . space + camel case boundaries.
function tokens(name) {
  const s = stem(name);
  return s.split(/[-_.\s+()]+/).filter(Boolean);
}

// A path segment (folder name) is a "folder token".
function pathTokens(path) {
  return path.split("/").map((s) => s.toLowerCase()).filter(Boolean);
}

// Check the "star rating baked in filename" heuristic — matches _star3_ or -star4- etc.
function parseStarsFromName(name) {
  const m = stem(name).match(/star[-_]?([0-5])/);
  return m ? parseInt(m[1], 10) : 0;
}

function match(entry, filters) {
  const {
    folderTokens = [],
    filenameTokens = [],
    logic = "any",
    minStars = 0,
    dateFrom = null,
    dateTo = null,
    text = "",
  } = filters;

  const fLower = folderTokens.map((t) => t.toLowerCase());
  const nLower = filenameTokens.map((t) => t.toLowerCase());
  const textLower = text.trim().toLowerCase();

  const pathT = pathTokens(entry.path);
  const nameT = tokens(entry.name);

  // Free-text: must match somewhere in path or name (contains)
  if (textLower) {
    const haystack = (entry.path + "/" + entry.name).toLowerCase();
    if (!haystack.includes(textLower)) return false;
  }

  // Folder token filter
  if (fLower.length > 0) {
    const hits = fLower.filter((t) => pathT.some((p) => p.includes(t)));
    if (logic === "all" && hits.length !== fLower.length) return false;
    if (logic === "any" && hits.length === 0) return false;
  }

  // Filename token filter
  if (nLower.length > 0) {
    const hits = nLower.filter((t) => nameT.some((p) => p.includes(t)));
    if (logic === "all" && hits.length !== nLower.length) return false;
    if (logic === "any" && hits.length === 0) return false;
  }

  // Star rating: prefer persisted rating from `ratings` map (destination-key),
  // fall back to _starN_ heuristic in filename.
  if (minStars > 0) {
    const destKey = `${entry.path}/${entry.name}`;
    const persisted = filters.ratings?.[destKey] || 0;
    const heur = parseStarsFromName(entry.name);
    const effective = Math.max(persisted, heur);
    if (effective < minStars) return false;
  }

  // Date range check happens lazily upstream because it needs to parse EXIF
  return true;
}

// Async generator that walks a directory recursively and yields matching photos.
export async function* searchPhotos(rootHandle, rootPath, filters, opts = {}) {
  const { signal, onProgress } = opts;
  let scanned = 0;

  async function* walk(dir, pathSoFar) {
    for await (const [name, handle] of dir.entries()) {
      if (signal?.aborted) return;
      if (handle.kind === "directory") {
        if (name === ".pps-trash" || name.startsWith(".")) continue;
        yield* walk(handle, pathSoFar + "/" + name);
      } else if (handle.kind === "file" && IMG_RE.test(name)) {
        scanned++;
        onProgress?.({ scanned, matched: null });
        const entry = { name, handle, path: pathSoFar };

        if (!match(entry, filters)) continue;

        // Optional EXIF date range check (do this lazily since it parses a file)
        if (filters.dateFrom || filters.dateTo) {
          try {
            const f = await handle.getFile();
            const meta = await exifr.parse(f, { pick: ["DateTimeOriginal", "CreateDate"] });
            const d = meta?.DateTimeOriginal || meta?.CreateDate;
            if (!d) continue;
            const t = d instanceof Date ? d.getTime() : new Date(d).getTime();
            if (filters.dateFrom && t < new Date(filters.dateFrom).getTime()) continue;
            if (filters.dateTo && t > new Date(filters.dateTo).getTime() + 86400000) continue;
            entry.exifDate = d;
          } catch {
            continue; // skip files where EXIF fails
          }
        }
        yield entry;
      }
    }
  }
  yield* walk(rootHandle, rootPath);
}

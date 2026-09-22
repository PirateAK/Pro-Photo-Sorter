// Parser + serializer for the plain-text tag-list format.
//
// Format (one column, minimal syntax):
//
//   # PackName             ← header, starts a new pack
//   folderTag1             ← folder tags (one per line)
//   folderTag2
//                          ← BLANK LINE = section boundary
//   filenameTag1           ← filename tags (one per line)
//   filenameTag2
//
//   ## SubfolderName       ← v1.1.6: sub-folder within the current pack.
//   filenameTag1           ← subfolder filename tags (inherit parent's folder tags)
//   filenameTag2
//
//   ## AnotherSubfolder
//   ...
//
//   # NextPack             ← another # header starts the next pack
//   ...
//
//   // this is a comment   ← lines starting with // are ignored
//
// Whitespace on each line is trimmed. Blank lines outside the boundary role
// are ignored. Missing sections (e.g. no folder tags at all) are allowed.
// Old files (no `##` headers) parse identically to v1.1.5 behavior.

import { uid } from "./storage";

const isBlank = (l) => l.trim() === "";
const isComment = (l) => /^\s*\/\//.test(l);
const isPackHeader = (l) => /^\s*#[^#]/.test(l) || /^\s*#\s*$/.test(l); // exactly one #
const isSubfolderHeader = (l) => /^\s*##\s*\S/.test(l);
const packHeaderName = (l) => l.replace(/^\s*#\s*/, "").trim();
const subfolderHeaderName = (l) => l.replace(/^\s*##\s*/, "").trim();

/**
 * Parse a text file into an array of pack objects:
 *   [{ name, folderItems, filenameItems, subfolders:[{name, filenameItems}] }, ...]
 * Throws on empty/malformed input.
 */
export function parseTagList(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Empty text list");
  }
  const rawLines = text.split(/\r?\n/);
  const packs = [];
  let current = null;
  let currentSub = null; // when non-null, appended items go into this subfolder's filenameItems
  let phase = "folder"; // "folder" | "filename"
  let sawBlankInPack = false;

  const startPack = (name) => {
    if (current) packs.push(current);
    current = { name: name || "Untitled pack", folderItems: [], filenameItems: [], subfolders: [] };
    currentSub = null;
    phase = "folder";
    sawBlankInPack = false;
  };

  const startSubfolder = (name) => {
    if (!current) startPack("Imported pack");
    currentSub = {
      id: uid("sf"),
      name: name || "Untitled sub-folder",
      iconType: "lucide",
      iconName: "Folder",
      filenameItems: [],
    };
    current.subfolders.push(currentSub);
  };

  const makeTag = (label) => ({
    id: uid("it"),
    label: label.slice(0, 60),
    iconType: "lucide",
    iconName: "Tag",
  });

  for (const raw of rawLines) {
    if (isComment(raw)) continue;
    // Sub-folder headers must be checked BEFORE pack headers so `##` doesn't
    // match the single-# rule.
    if (isSubfolderHeader(raw)) {
      startSubfolder(subfolderHeaderName(raw));
      continue;
    }
    if (isPackHeader(raw)) {
      startPack(packHeaderName(raw));
      continue;
    }
    if (isBlank(raw)) {
      // First blank line inside a pack (before any subfolder) toggles from
      // folder → filename. Blank lines inside a subfolder are ignored.
      if (current && !currentSub && phase === "folder" && !sawBlankInPack) {
        sawBlankInPack = true;
        phase = "filename";
      }
      continue;
    }
    const label = raw.trim();
    if (!label) continue;
    if (!current) startPack("Imported pack");
    if (currentSub) {
      // Everything under a ## header is a filename tag for that subfolder
      currentSub.filenameItems.push(makeTag(label));
    } else if (phase === "folder") {
      current.folderItems.push(makeTag(label));
    } else {
      current.filenameItems.push(makeTag(label));
    }
  }
  if (current) packs.push(current);
  if (packs.length === 0) throw new Error("No packs found in text list");
  // Reject truly empty packs
  const filtered = packs.filter((p) => {
    const subTotal = (p.subfolders || []).reduce((n, s) => n + (s.filenameItems?.length || 0), 0);
    return p.folderItems.length + p.filenameItems.length + subTotal > 0;
  });
  if (filtered.length === 0) throw new Error("Text list contained no tags");
  return filtered;
}

/**
 * Serialize a pack object → text-list string.
 * The pack argument is a { name, folderItems, filenameItems, subfolders? } shape.
 * Subfolders (v1.1.6) are emitted as `## Name` blocks after the pack's
 * filename tags. Backwards compatible: a pack with no subfolders serializes
 * identically to the v1.1.5 format.
 */
export function serializePack(pack) {
  const lines = [];
  lines.push(`# ${pack.name || "Untitled pack"}`);
  for (const it of pack.folderItems || []) lines.push(it.label);
  lines.push(""); // boundary blank line
  for (const it of pack.filenameItems || []) lines.push(it.label);
  for (const sf of pack.subfolders || []) {
    lines.push(""); // blank line before each subfolder
    lines.push(`## ${sf.name || "Untitled sub-folder"}`);
    for (const it of sf.filenameItems || []) lines.push(it.label);
  }
  return lines.join("\n") + "\n";
}

/** Serialize multiple packs into one text file separated by blank lines. */
export function serializePacks(packs) {
  return packs.map(serializePack).join("\n");
}

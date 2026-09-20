// Parser + serializer for the plain-text tag-list format.
//
// Format (one column, minimal syntax):
//
//   # PackName            ← header, starts a new pack
//   folderTag1            ← folder tags (one per line)
//   folderTag2
//                         ← BLANK LINE = boundary
//   filenameTag1          ← filename tags (one per line)
//   filenameTag2
//
//   # NextPack            ← another # header starts the next pack
//   ...
//
//   // this is a comment  ← lines starting with // are ignored
//
// Whitespace on each line is trimmed. Blank lines outside the boundary role
// are ignored. Missing sections (e.g. no folder tags at all) are allowed.

import { uid } from "./storage";

const isBlank = (l) => l.trim() === "";
const isComment = (l) => /^\s*\/\//.test(l);
const isHeader = (l) => /^\s*#\s*\S/.test(l);
const headerName = (l) => l.replace(/^\s*#\s*/, "").trim();

/**
 * Parse a text file into an array of pack objects:
 *   [{ name, folderItems:[{id,label,iconType,iconName}], filenameItems:[...] }, ...]
 * Throws on empty/malformed input.
 */
export function parseTagList(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Empty text list");
  }
  const rawLines = text.split(/\r?\n/);
  const packs = [];
  let current = null;
  let phase = "folder"; // "folder" | "filename"
  let sawBlankInPack = false;

  const startPack = (name) => {
    if (current) packs.push(current);
    current = { name: name || "Untitled pack", folderItems: [], filenameItems: [] };
    phase = "folder";
    sawBlankInPack = false;
  };

  const makeTag = (label) => ({
    id: uid("it"),
    label: label.slice(0, 60),
    iconType: "lucide",
    iconName: "Tag",
  });

  for (const raw of rawLines) {
    if (isComment(raw)) continue;
    if (isHeader(raw)) {
      startPack(headerName(raw));
      continue;
    }
    if (isBlank(raw)) {
      // First blank line inside a pack toggles from folder → filename
      if (current && phase === "folder" && !sawBlankInPack) {
        sawBlankInPack = true;
        phase = "filename";
      }
      // Additional blank lines are ignored
      continue;
    }
    // Content line
    const label = raw.trim();
    if (!label) continue;
    if (!current) {
      // Content with no header seen — put in an anonymous pack
      startPack("Imported pack");
    }
    if (phase === "folder") current.folderItems.push(makeTag(label));
    else current.filenameItems.push(makeTag(label));
  }
  if (current) packs.push(current);
  if (packs.length === 0) throw new Error("No packs found in text list");
  // Reject truly empty packs
  const filtered = packs.filter((p) => p.folderItems.length + p.filenameItems.length > 0);
  if (filtered.length === 0) throw new Error("Text list contained no tags");
  return filtered;
}

/**
 * Serialize a pack object → text-list string.
 * The pack argument is a { name, folderItems, filenameItems } shape.
 */
export function serializePack(pack) {
  const lines = [];
  lines.push(`# ${pack.name || "Untitled pack"}`);
  for (const it of pack.folderItems || []) lines.push(it.label);
  lines.push(""); // boundary blank line
  for (const it of pack.filenameItems || []) lines.push(it.label);
  return lines.join("\n") + "\n";
}

/** Serialize multiple packs into one text file separated by blank lines. */
export function serializePacks(packs) {
  return packs.map(serializePack).join("\n");
}

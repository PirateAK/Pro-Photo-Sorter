// Regression tests for the tag-list text round-trip.
// Run: node /app/frontend/tests/tagpackText.roundtrip.test.mjs
//
// Locks in v1.2.2 fix: parseTagList must emit subfolders from `##` blocks
// AND serializePack must include those subfolders in its output.

import { parseTagList, serializePack } from "../src/lib/tagpackText.js";

let pass = 0, fail = 0;
const expect = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`PASS  ${label}`); }
  else { fail++; console.log(`FAIL  ${label}${extra ? `\n      ${extra}` : ""}`); }
};

// ─── 1. Parse — subfolder blocks emit `subfolders` on the pack ──────────
const src = `# Wedding
Ceremony
Reception
Rehearsal

bride
groom
ring

## Brides family
mother
father
sister

## Grooms family
mother
father
brother
`;

const parsed = parseTagList(src);
expect("one pack parsed", parsed.length === 1);
const w = parsed[0];
expect("pack name = Wedding", w.name === "Wedding");
expect("3 folder tags parsed", (w.folderItems || []).length === 3);
expect("3 filename tags parsed", (w.filenameItems || []).length === 3);
expect("2 subfolders parsed", (w.subfolders || []).length === 2);
expect(
  "Brides family has 3 filename tags",
  w.subfolders[0].name === "Brides family" && w.subfolders[0].filenameItems.length === 3
);
expect(
  "Grooms family has 3 filename tags",
  w.subfolders[1].name === "Grooms family" && w.subfolders[1].filenameItems.length === 3
);
expect(
  "subfolder filename label is 'mother'",
  w.subfolders[0].filenameItems[0].label === "mother"
);

// ─── 2. Serialize — emits `## Name` blocks ─────────────────────────────
const text = serializePack(w);
expect("serialized text contains '# Wedding'", text.includes("# Wedding"));
expect("serialized text contains '## Brides family'", text.includes("## Brides family"));
expect("serialized text contains '## Grooms family'", text.includes("## Grooms family"));
expect("serialized text contains 'Ceremony' folder tag", text.includes("Ceremony"));
expect("serialized text contains 'mother' subfolder tag", text.includes("mother"));

// ─── 3. Round-trip parity — parse → serialize → parse yields same shape ──
const reparsed = parseTagList(text);
expect("round-trip pack count = 1", reparsed.length === 1);
expect(
  "round-trip folder tag count preserved",
  reparsed[0].folderItems.length === w.folderItems.length
);
expect(
  "round-trip filename tag count preserved",
  reparsed[0].filenameItems.length === w.filenameItems.length
);
expect(
  "round-trip subfolder count preserved",
  reparsed[0].subfolders.length === w.subfolders.length
);
expect(
  "round-trip subfolder tags preserved",
  reparsed[0].subfolders[0].filenameItems.length === w.subfolders[0].filenameItems.length
);

// ─── 4. Backward compat — old v1.1.5 files (no ##) still parse ─────────
const legacy = `# LegacyPack
folder1
folder2

fname1
fname2
`;
const legacyParsed = parseTagList(legacy);
expect("legacy file still parses", legacyParsed[0].folderItems.length === 2 && legacyParsed[0].filenameItems.length === 2);
expect("legacy file has empty subfolders", (legacyParsed[0].subfolders || []).length === 0);

console.log(`\n${pass}/${pass + fail} passing${fail ? ` - ${fail} failure(s)` : ""}`);
process.exit(fail === 0 ? 0 : 1);

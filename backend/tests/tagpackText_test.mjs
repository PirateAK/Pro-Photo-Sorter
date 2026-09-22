// Round-trip test for the v1.1.6 subfolder text-list format.
// Run manually: node /app/backend/tests/tagpackText_test.mjs

// Inline minimal uid so we don't drag in the whole storage module
const uid = (p = "id") => `${p}-${Math.random().toString(36).slice(2, 7)}`;
globalThis.__uid = uid;

// Inline the parser+serializer for the test (mirrors /app/frontend/src/lib/tagpackText.js)
const isBlank = (l) => l.trim() === "";
const isComment = (l) => /^\s*\/\//.test(l);
const isPackHeader = (l) => /^\s*#[^#]/.test(l) || /^\s*#\s*$/.test(l);
const isSubfolderHeader = (l) => /^\s*##\s*\S/.test(l);
const packHeaderName = (l) => l.replace(/^\s*#\s*/, "").trim();
const subfolderHeaderName = (l) => l.replace(/^\s*##\s*/, "").trim();

function parseTagList(text) {
  const rawLines = text.split(/\r?\n/);
  const packs = [];
  let current = null;
  let currentSub = null;
  let phase = "folder";
  let sawBlank = false;
  const makeTag = (l) => ({ id: uid("it"), label: l.slice(0, 60), iconType: "lucide", iconName: "Tag" });
  const startPack = (n) => { if (current) packs.push(current); current = { name: n || "Untitled pack", folderItems: [], filenameItems: [], subfolders: [] }; currentSub = null; phase = "folder"; sawBlank = false; };
  const startSub = (n) => { if (!current) startPack("Imported"); currentSub = { id: uid("sf"), name: n || "Sub", iconType: "lucide", iconName: "Folder", filenameItems: [] }; current.subfolders.push(currentSub); };
  for (const raw of rawLines) {
    if (isComment(raw)) continue;
    if (isSubfolderHeader(raw)) { startSub(subfolderHeaderName(raw)); continue; }
    if (isPackHeader(raw)) { startPack(packHeaderName(raw)); continue; }
    if (isBlank(raw)) { if (current && !currentSub && phase === "folder" && !sawBlank) { sawBlank = true; phase = "filename"; } continue; }
    const label = raw.trim();
    if (!label) continue;
    if (!current) startPack("Imported");
    if (currentSub) currentSub.filenameItems.push(makeTag(label));
    else if (phase === "folder") current.folderItems.push(makeTag(label));
    else current.filenameItems.push(makeTag(label));
  }
  if (current) packs.push(current);
  return packs;
}

function serializePack(p) {
  const lines = [`# ${p.name}`];
  for (const it of p.folderItems || []) lines.push(it.label);
  lines.push("");
  for (const it of p.filenameItems || []) lines.push(it.label);
  for (const sf of p.subfolders || []) {
    lines.push("");
    lines.push(`## ${sf.name}`);
    for (const it of sf.filenameItems || []) lines.push(it.label);
  }
  return lines.join("\n") + "\n";
}

const sample = `# Sports
Game
Practice

action
keeper

## Baseball
Yankees
RedSox

## Basketball
Lakers
Celtics

# Wedding
Ceremony

candid
formal
`;

const packs = parseTagList(sample);
console.log("PARSE:");
for (const p of packs) {
  console.log(`  ${p.name} — f:${p.folderItems.length} fn:${p.filenameItems.length} sub:${p.subfolders.length}`);
  for (const sf of p.subfolders) console.log(`    · ${sf.name} → ${sf.filenameItems.map(i=>i.label).join(", ")}`);
}
const back = packs.map(serializePack).join("\n");
const re = parseTagList(back);
const strip = (arr) => arr.map(p => ({ n: p.name, f: p.folderItems.map(i=>i.label), fn: p.filenameItems.map(i=>i.label), s: (p.subfolders||[]).map(sf => ({n: sf.name, f: sf.filenameItems.map(i=>i.label)})) }));
console.log("\nROUND TRIP:", JSON.stringify(strip(re)) === JSON.stringify(strip(packs)) ? "OK" : "MISMATCH");

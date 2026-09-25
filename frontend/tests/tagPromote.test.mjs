// v1.4.1 — Tests for the tag→nested-sub-folder promotion logic used by
// both the per-tag context menu, per-tag "→" chip button, and bulk
// "Convert all → nested" button. Mirrors the transformations in
// NestedSubfolderEditor.jsx + CategoryManager.jsx (bulk button).
// Run: node /app/frontend/tests/tagPromote.test.mjs

function tagToNestedSeed(tag) {
  return {
    // id omitted — real code stamps a uid; tests only compare shape
    name: (tag.label || tag.name || "Nested").slice(0, 60),
    iconType: tag.iconType || "lucide",
    iconName: tag.iconName || "Folder",
    ...(tag.iconData ? { iconData: tag.iconData } : {}),
    filenameItems: [],
    subfolders: [],
  };
}

// Single tag → nested (per-tag context menu path)
function promoteSingle(node, tagId) {
  const tag = (node.filenameItems || []).find((t) => t.id === tagId);
  if (!tag) return node;
  return {
    ...node,
    filenameItems: (node.filenameItems || []).filter((t) => t.id !== tagId),
    subfolders: [...(node.subfolders || []), { id: `sf-${tagId}`, ...tagToNestedSeed(tag) }],
  };
}

// Bulk convert — matches both the button in SubfolderSection AND the
// bulkPromoteAllTags callback inside NestedSubfolderEditor. Skips tags
// whose name already exists as a nested child (case-insensitive) so we
// never create duplicates on re-run.
function bulkPromote(node) {
  const parentTags = node.filenameItems || [];
  const existing = node.subfolders || [];
  if (parentTags.length === 0) return node;
  const seen = new Set(existing.map((c) => (c.name || "").toLowerCase()));
  const newOnes = [];
  for (const t of parentTags) {
    const nm = (t.label || "").toLowerCase();
    if (seen.has(nm)) continue;
    seen.add(nm);
    newOnes.push({ id: `sf-${t.id}`, ...tagToNestedSeed(t) });
  }
  return {
    ...node,
    filenameItems: [],
    subfolders: [...existing, ...newOnes],
  };
}

const baseline = {
  id: "sf-baseball",
  name: "Baseball (AL)",
  filenameItems: [
    { id: "t-redsox", label: "Boston Red Sox", iconType: "lucide", iconName: "Trophy" },
    { id: "t-yankees", label: "Yankees" },
    { id: "t-orioles", label: "Orioles" },
  ],
  subfolders: [],
};

// ── Single-tag promotion ────────────────────────────────────────────────
{
  const out = promoteSingle(baseline, "t-redsox");
  const ok =
    out.filenameItems.length === 2 &&
    !out.filenameItems.find((t) => t.id === "t-redsox") &&
    out.subfolders.length === 1 &&
    out.subfolders[0].name === "Boston Red Sox" &&
    out.subfolders[0].iconType === "lucide" &&
    out.subfolders[0].iconName === "Trophy" &&
    out.subfolders[0].filenameItems.length === 0 &&
    out.subfolders[0].subfolders.length === 0;
  console.log(`${ok ? "PASS" : "FAIL"}  single tag promotion preserves icon + empties new subfolder`);
  if (!ok) console.log("       got:", JSON.stringify(out, null, 2));
  process.exitCode = ok ? (process.exitCode || 0) : 1;
}

// Bogus id returns node unchanged
{
  const out = promoteSingle(baseline, "t-bogus");
  const ok = out === baseline;
  console.log(`${ok ? "PASS" : "FAIL"}  unknown tag id returns node reference unchanged`);
  if (!ok) process.exitCode = 1;
}

// ── Bulk promotion ──────────────────────────────────────────────────────
{
  const out = bulkPromote(baseline);
  const names = out.subfolders.map((s) => s.name);
  const ok =
    out.filenameItems.length === 0 &&
    out.subfolders.length === 3 &&
    JSON.stringify(names) === JSON.stringify(["Boston Red Sox", "Yankees", "Orioles"]) &&
    out.subfolders.every((s) => s.filenameItems.length === 0);
  console.log(`${ok ? "PASS" : "FAIL"}  bulk convert empties filename tags and creates 3 nested with preserved order`);
  if (!ok) {
    console.log("       names:", names);
    console.log("       remaining tags:", out.filenameItems.length);
    process.exitCode = 1;
  }
}

// Bulk with existing nested — no duplicates by name
{
  const with_existing = {
    ...baseline,
    subfolders: [{ id: "sf-existing", name: "Yankees", filenameItems: [{ id: "old", label: "Judge" }], subfolders: [] }],
  };
  const out = bulkPromote(with_existing);
  const names = out.subfolders.map((s) => s.name);
  const yankeesEntries = out.subfolders.filter((s) => s.name === "Yankees");
  const ok =
    out.filenameItems.length === 0 &&
    yankeesEntries.length === 1 &&
    yankeesEntries[0].filenameItems.length === 1 && // existing Yankees kept intact
    names.includes("Boston Red Sox") &&
    names.includes("Orioles");
  console.log(`${ok ? "PASS" : "FAIL"}  bulk convert skips duplicates (case-insensitive) and preserves existing nested's tags`);
  if (!ok) {
    console.log("       final subfolders:", JSON.stringify(out.subfolders.map((s) => ({ name: s.name, tags: s.filenameItems.length })), null, 2));
    process.exitCode = 1;
  }
}

// Empty tag list — no-op
{
  const empty = { ...baseline, filenameItems: [] };
  const out = bulkPromote(empty);
  const ok = out === empty;
  console.log(`${ok ? "PASS" : "FAIL"}  bulk convert with zero tags returns node reference unchanged`);
  if (!ok) process.exitCode = 1;
}

// Icon data (custom PNG) survives promotion
{
  const withImg = {
    ...baseline,
    filenameItems: [{ id: "t-img", label: "CustomChip", iconType: "image", iconName: "custom", iconData: "data:image/png;base64,AAAA" }],
  };
  const out = bulkPromote(withImg);
  const ok =
    out.subfolders.length === 1 &&
    out.subfolders[0].iconType === "image" &&
    out.subfolders[0].iconData === "data:image/png;base64,AAAA";
  console.log(`${ok ? "PASS" : "FAIL"}  custom image icon data carries through to the new nested sub-folder`);
  if (!ok) process.exitCode = 1;
}

if (!process.exitCode) console.log("\nAll v1.4.1 tag-promotion tests passed.");
process.exit(process.exitCode || 0);

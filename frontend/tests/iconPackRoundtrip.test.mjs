// v1.3.1 — Icon-pack export/import round-trip tests.
//
// Mirrors the pure JSON shape used by IconPickerBar in CategoryManager.jsx.
// Guards the contract Kurt relies on to hand pre-built icon packs to
// customers: the exported file is human-readable JSON, imports
// de-duplicate by dataUrl, and scope survives the round-trip.
//
// Run with: node frontend/tests/iconPackRoundtrip.test.mjs

let seq = 0;
const uid = (p) => `${p}-${++seq}`;

function buildExport({ visible, scope, sourceCategoryName }) {
  return {
    kind: "pps-iconpack",
    version: 1,
    scope,
    sourceCategoryName: scope === "category" ? sourceCategoryName : null,
    exportedAt: new Date().toISOString(),
    images: visible.map((img) => ({ name: img.name, dataUrl: img.dataUrl })),
  };
}

function importPack(existing, payload, { targetScope, activeCatId }) {
  if (!payload || payload.kind !== "pps-iconpack" || !Array.isArray(payload.images)) {
    return { ok: false, reason: "invalid" };
  }
  const scope = targetScope === "global" ? null : activeCatId;
  if (targetScope === "category" && !activeCatId) return { ok: false, reason: "no-active-cat" };
  const existingSameScope = new Set(
    existing.filter((img) => (img.catId ?? null) === scope).map((img) => img.dataUrl)
  );
  const additions = [];
  let skipped = 0;
  for (const im of payload.images) {
    if (!im?.dataUrl) { skipped++; continue; }
    if (existingSameScope.has(im.dataUrl)) { skipped++; continue; }
    additions.push({
      id: uid("cim"),
      name: String(im.name || "Untitled").slice(0, 40),
      catId: scope,
      dataUrl: im.dataUrl,
    });
    existingSameScope.add(im.dataUrl);
  }
  return { ok: true, additions, skipped, merged: [...existing, ...additions] };
}

let pass = 0, fail = 0;
function assert(name, cond) {
  if (cond) { console.log(`✓ ${name}`); pass++; }
  else      { console.log(`✗ ${name}`); fail++; }
}

// Fixture: three global icons + two per-category (Wildlife).
const startLibrary = [
  { id: "cim-1", name: "star", catId: null,       dataUrl: "data:image/png;base64,AAA1" },
  { id: "cim-2", name: "flag", catId: null,       dataUrl: "data:image/png;base64,AAA2" },
  { id: "cim-3", name: "heart", catId: null,      dataUrl: "data:image/png;base64,AAA3" },
  { id: "cim-4", name: "paw",  catId: "cat-wild", dataUrl: "data:image/png;base64,BBB1" },
  { id: "cim-5", name: "fur",  catId: "cat-wild", dataUrl: "data:image/png;base64,BBB2" },
];

// Test 1: export → JSON has correct shape + counts + scope.
{
  const visible = startLibrary.filter((i) => (i.catId ?? null) === null);
  const payload = buildExport({ visible, scope: "global" });
  assert("export.kind is pps-iconpack", payload.kind === "pps-iconpack");
  assert("export.version is 1",        payload.version === 1);
  assert("export.scope is global",     payload.scope === "global");
  assert("export.images has 3 entries", payload.images.length === 3);
  assert("images strip ids on export (leak-proof)", !("id" in payload.images[0]));
  assert("JSON stringifies without error", typeof JSON.stringify(payload) === "string");
}

// Test 2: round-trip global — import back into an empty library.
{
  const visible = startLibrary.filter((i) => (i.catId ?? null) === null);
  const payload = buildExport({ visible, scope: "global" });
  const round = importPack([], payload, { targetScope: "global", activeCatId: null });
  assert("round-trip global: ok", round.ok === true);
  assert("round-trip global: 3 additions", round.additions.length === 3);
  assert("round-trip global: 0 skipped", round.skipped === 0);
  assert("round-trip global: all landed in null scope", round.additions.every((a) => a.catId === null));
  assert("round-trip global: names preserved", round.additions[0].name === "star");
}

// Test 3: round-trip category — import into a different category.
{
  const visible = startLibrary.filter((i) => i.catId === "cat-wild");
  const payload = buildExport({ visible, scope: "category", sourceCategoryName: "Wildlife" });
  const round = importPack([], payload, { targetScope: "category", activeCatId: "cat-sports" });
  assert("round-trip category: ok", round.ok === true);
  assert("round-trip category: 2 additions", round.additions.length === 2);
  assert("round-trip category: landed in target cat-sports, NOT the source", round.additions.every((a) => a.catId === "cat-sports"));
}

// Test 4: import de-duplicates by dataUrl within same scope.
{
  const visible = startLibrary.filter((i) => (i.catId ?? null) === null);
  const payload = buildExport({ visible, scope: "global" });
  const round = importPack(startLibrary, payload, { targetScope: "global", activeCatId: null });
  assert("dedup: ok",             round.ok === true);
  assert("dedup: 0 additions",     round.additions.length === 0);
  assert("dedup: 3 skipped",       round.skipped === 3);
  assert("dedup: library unchanged size", round.merged.length === startLibrary.length);
}

// Test 5: invalid JSON is rejected safely.
{
  const round = importPack([], { kind: "something-else", images: [] }, { targetScope: "global", activeCatId: null });
  assert("invalid payload rejected", !round.ok && round.reason === "invalid");
  const round2 = importPack([], { kind: "pps-iconpack", images: "not-an-array" }, { targetScope: "global", activeCatId: null });
  assert("bad images field rejected", !round2.ok);
}

// Test 6: category scope without activeCatId fails cleanly.
{
  const payload = buildExport({ visible: startLibrary, scope: "global" });
  const round = importPack([], payload, { targetScope: "category", activeCatId: null });
  assert("no-active-cat rejection", !round.ok && round.reason === "no-active-cat");
}

console.log(`\n${pass}/${pass + fail} passing`);
if (fail > 0) process.exit(1);

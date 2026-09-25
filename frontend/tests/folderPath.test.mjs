// Regression test for the v1.2.1 · v1.4.0 folder-path composer.
// Run manually: node /app/frontend/tests/folderPath.test.mjs
//
// Mirrors composeDestFolderParts() defined in /app/frontend/src/App.js.
// v1.4.0 signature: the third argument is `subChain` (an ARRAY of nested
// sub-folder nodes, top → bottom). Empty array = no sub-folder picked.
// If you change the logic in App.js, update the mirror below too.

function composeDestFolderParts(activePack, folderPartsFromTemplate, subChain) {
  const chainNames = Array.isArray(subChain) ? subChain.map((s) => s?.name) : [];
  return [
    activePack?.name,
    ...(folderPartsFromTemplate || []),
    ...chainNames,
  ].filter((p) => p && String(p).trim().length > 0);
}

const cases = [
  {
    name: "pack + folder tags + single subfolder",
    pack: { name: "Wedding" },
    parts: ["Ceremony"],
    chain: [{ name: "Brides family" }],
    want: ["Wedding", "Ceremony", "Brides family"],
  },
  {
    name: "pack + folder tags only (no subfolder)",
    pack: { name: "Wedding" },
    parts: ["Ceremony"],
    chain: [],
    want: ["Wedding", "Ceremony"],
  },
  {
    name: "pack + single subfolder only (no folder tags)",
    pack: { name: "Sports" },
    parts: [],
    chain: [{ name: "Baseball" }],
    want: ["Sports", "Baseball"],
  },
  {
    name: "pack alone",
    pack: { name: "Wildlife" },
    parts: [],
    chain: [],
    want: ["Wildlife"],
  },
  {
    name: "nothing selected → empty parts",
    pack: null,
    parts: [],
    chain: [],
    want: [],
  },
  {
    name: "pack undefined + folder tags exist",
    pack: undefined,
    parts: ["A", "B"],
    chain: [],
    want: ["A", "B"],
  },
  {
    name: "whitespace-only names filtered out",
    pack: { name: "  " },
    parts: ["Ceremony", "   ", "Reception"],
    chain: [{ name: "" }],
    want: ["Ceremony", "Reception"],
  },
  {
    name: "multiple folder chips preserved in order",
    pack: { name: "Wedding" },
    parts: ["Ceremony", "Bride", "Groom"],
    chain: [{ name: "Brides family" }],
    want: ["Wedding", "Ceremony", "Bride", "Groom", "Brides family"],
  },
  // v1.4.0 — Nested sub-folder cascade
  {
    name: "v1.4.0 nested chain: Sports → Baseball → Yankees → Home Games",
    pack: { name: "Sports" },
    parts: [],
    chain: [
      { name: "Baseball" },
      { name: "Yankees" },
      { name: "Home Games" },
    ],
    want: ["Sports", "Baseball", "Yankees", "Home Games"],
  },
  {
    name: "v1.4.0 nested chain with folder tags in the middle",
    pack: { name: "Wedding" },
    parts: ["2024"],
    chain: [
      { name: "Ceremony" },
      { name: "Brides side" },
    ],
    want: ["Wedding", "2024", "Ceremony", "Brides side"],
  },
  {
    name: "v1.4.0 empty-named nested nodes get filtered",
    pack: { name: "Portrait" },
    parts: [],
    chain: [{ name: "Family" }, { name: "" }, { name: "Winter 2025" }],
    want: ["Portrait", "Family", "Winter 2025"],
  },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const got = composeDestFolderParts(c.pack, c.parts, c.chain);
  const ok = JSON.stringify(got) === JSON.stringify(c.want);
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}`);
  if (!ok) console.log(`      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify(c.want)}`);
}
console.log(`\n${pass}/${pass + fail} passing${fail ? ` - ${fail} failure(s)` : ""}`);
process.exit(fail === 0 ? 0 : 1);

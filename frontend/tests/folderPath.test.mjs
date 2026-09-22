// Regression test for the v1.2.1 folder-path composer.
// Run manually: node /app/frontend/tests/folderPath.test.mjs
//
// Mirrors composeDestFolderParts() defined in /app/frontend/src/App.js.
// If you change the logic in App.js, update the mirror below too.

function composeDestFolderParts(activePack, folderPartsFromTemplate, activeSub) {
  return [
    activePack?.name,
    ...(folderPartsFromTemplate || []),
    activeSub?.name,
  ].filter((p) => p && String(p).trim().length > 0);
}

const cases = [
  {
    name: "pack + folder tags + subfolder",
    pack: { name: "Wedding" },
    parts: ["Ceremony"],
    sub: { name: "Brides family" },
    want: ["Wedding", "Ceremony", "Brides family"],
  },
  {
    name: "pack + folder tags only (no subfolder)",
    pack: { name: "Wedding" },
    parts: ["Ceremony"],
    sub: null,
    want: ["Wedding", "Ceremony"],
  },
  {
    name: "pack + subfolder only (no folder tags)",
    pack: { name: "Sports" },
    parts: [],
    sub: { name: "Baseball" },
    want: ["Sports", "Baseball"],
  },
  {
    name: "pack alone",
    pack: { name: "Wildlife" },
    parts: [],
    sub: null,
    want: ["Wildlife"],
  },
  {
    name: "nothing selected → empty parts",
    pack: null,
    parts: [],
    sub: null,
    want: [],
  },
  {
    name: "pack undefined + folder tags exist",
    pack: undefined,
    parts: ["A", "B"],
    sub: null,
    want: ["A", "B"],
  },
  {
    name: "whitespace-only names filtered out",
    pack: { name: "  " },
    parts: ["Ceremony", "   ", "Reception"],
    sub: { name: "" },
    want: ["Ceremony", "Reception"],
  },
  {
    name: "multiple folder chips preserved in order",
    pack: { name: "Wedding" },
    parts: ["Ceremony", "Bride", "Groom"],
    sub: { name: "Brides family" },
    want: ["Wedding", "Ceremony", "Bride", "Groom", "Brides family"],
  },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const got = composeDestFolderParts(c.pack, c.parts, c.sub);
  const ok = JSON.stringify(got) === JSON.stringify(c.want);
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}`);
  if (!ok) console.log(`      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify(c.want)}`);
}
console.log(`\n${pass}/${pass + fail} passing${fail ? ` - ${fail} failure(s)` : ""}`);
process.exit(fail === 0 ? 0 : 1);

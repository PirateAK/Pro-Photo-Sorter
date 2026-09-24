// v1.4.0 — Tests for SubfolderCascade's resolveSubChain + deepestWithFilenames.
// Run manually: node /app/frontend/tests/subfolderCascade.test.mjs
//
// Mirrors the helpers in /app/frontend/src/components/SubfolderCascade.jsx.
// If those helpers change, update the mirrors below.

function resolveSubChain(pack, activeSubfolderPath) {
  const chain = [];
  let node = pack;
  for (const id of activeSubfolderPath || []) {
    const subs = Array.isArray(node?.subfolders) ? node.subfolders : [];
    const next = subs.find((s) => s.id === id);
    if (!next) break;
    chain.push(next);
    node = next;
  }
  return chain;
}
function deepestWithFilenames(chain) {
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    if (Array.isArray(chain[i].filenameItems) && chain[i].filenameItems.length > 0) {
      return chain[i];
    }
  }
  return null;
}

const pack = {
  id: "pack-1",
  name: "Sports",
  subfolders: [
    {
      id: "sf-baseball",
      name: "Baseball",
      filenameItems: [{ id: "t1", label: "portrait" }],
      subfolders: [
        {
          id: "sf-yankees",
          name: "Yankees",
          filenameItems: [], // empty → inherits parent tags
          subfolders: [
            {
              id: "sf-yankees-home",
              name: "Home Games",
              filenameItems: [{ id: "t2", label: "night-game" }],
              subfolders: [],
            },
          ],
        },
      ],
    },
    { id: "sf-basketball", name: "Basketball", filenameItems: [], subfolders: [] },
  ],
};

const cases = [
  {
    name: "empty path → empty chain, null deepest",
    path: [],
    wantChain: [],
    wantDeepestId: null,
  },
  {
    name: "single-level path resolves top sub-folder",
    path: ["sf-baseball"],
    wantChain: ["sf-baseball"],
    wantDeepestId: "sf-baseball",
  },
  {
    name: "two-level path resolves nested Yankees (empty items) → falls back to Baseball for filenames",
    path: ["sf-baseball", "sf-yankees"],
    wantChain: ["sf-baseball", "sf-yankees"],
    wantDeepestId: "sf-baseball", // Yankees has empty filenameItems → falls back
  },
  {
    name: "three-level path resolves Yankees Home Games (has own items)",
    path: ["sf-baseball", "sf-yankees", "sf-yankees-home"],
    wantChain: ["sf-baseball", "sf-yankees", "sf-yankees-home"],
    wantDeepestId: "sf-yankees-home",
  },
  {
    name: "invalid mid-path id truncates chain",
    path: ["sf-baseball", "sf-DOES-NOT-EXIST", "sf-yankees-home"],
    wantChain: ["sf-baseball"],
    wantDeepestId: "sf-baseball",
  },
  {
    name: "invalid top id gives empty chain",
    path: ["sf-BOGUS"],
    wantChain: [],
    wantDeepestId: null,
  },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const chain = resolveSubChain(pack, c.path);
  const chainIds = chain.map((n) => n.id);
  const deepest = deepestWithFilenames(chain);
  const deepestId = deepest ? deepest.id : null;
  const ok = JSON.stringify(chainIds) === JSON.stringify(c.wantChain)
          && deepestId === c.wantDeepestId;
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}`);
  if (!ok) {
    console.log(`      chain got:    ${JSON.stringify(chainIds)}\n      chain want:   ${JSON.stringify(c.wantChain)}`);
    console.log(`      deepest got:  ${deepestId}\n      deepest want: ${c.wantDeepestId}`);
  }
}
console.log(`\n${pass}/${pass + fail} passing${fail ? ` - ${fail} failure(s)` : ""}`);
process.exit(fail === 0 ? 0 : 1);

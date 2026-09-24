// v1.3.1 — Cross-category chip drag regression tests.
//
// Mirrors the pure state-transform logic in CategoryManager.jsx's
// `crossMoveSubfolderItem` so the algorithm can be tested in Node.
// If you refactor the reducer, update this file too.
//
// Run with: node frontend/tests/crossCategoryMove.test.mjs

const UNSORTED_NAME = "_Unsorted filenames";
let seq = 0;
const uid = (p) => `${p}-${++seq}`;

function crossMove(categories, { fromCatId, fromSfId, toCatId, itemId, mode = "move" }) {
  if (!fromCatId || !toCatId || fromCatId === toCatId) return { categories, ok: false, reason: "same-or-missing-cat" };
  const fromCat = categories.find((c) => c.id === fromCatId);
  const toCat   = categories.find((c) => c.id === toCatId);
  if (!fromCat || !toCat) return { categories, ok: false, reason: "cat-not-found" };
  const fromSub = (fromCat.subfolders || []).find((s) => s.id === fromSfId);
  const item = fromSub?.filenameItems?.find((it) => it.id === itemId);
  if (!item) return { categories, ok: false, reason: "item-not-found" };

  const existingUnsorted = (toCat.subfolders || []).find(
    (s) => (s.name || "").toLowerCase() === UNSORTED_NAME.toLowerCase()
  );
  const dupInTarget = existingUnsorted
    ? (existingUnsorted.filenameItems || []).some(
        (it) => it.label.toLowerCase() === item.label.toLowerCase()
      )
    : false;
  if (dupInTarget) return { categories, ok: false, reason: "duplicate" };

  const cloneOrItem = mode === "copy" ? { ...item, id: uid("it") } : item;

  const next = categories.map((c) => {
    if (c.id === fromCatId && mode === "move") {
      return {
        ...c,
        subfolders: (c.subfolders || []).map((s) =>
          s.id === fromSfId
            ? { ...s, filenameItems: (s.filenameItems || []).filter((it) => it.id !== itemId) }
            : s
        ),
      };
    }
    if (c.id === toCatId) {
      const subs = c.subfolders || [];
      if (existingUnsorted) {
        return {
          ...c,
          subfolders: subs.map((s) =>
            s.id === existingUnsorted.id
              ? { ...s, filenameItems: [...(s.filenameItems || []), cloneOrItem] }
              : s
          ),
        };
      }
      return {
        ...c,
        subfolders: [
          ...subs,
          {
            id: uid("sf"),
            name: UNSORTED_NAME,
            iconType: "lucide",
            iconName: "Package",
            filenameItems: [cloneOrItem],
          },
        ],
      };
    }
    return c;
  });
  return { categories: next, ok: true };
}

let pass = 0, fail = 0;
function assert(name, cond) {
  if (cond) { console.log(`✓ ${name}`); pass++; }
  else      { console.log(`✗ ${name}`); fail++; }
}

// Fixture
const makeCats = () => [
  {
    id: "cat-wildlife",
    name: "Wildlife",
    subfolders: [
      {
        id: "sf-bears",
        name: "Bears",
        filenameItems: [
          { id: "it-brown", label: "brown" },
          { id: "it-polar", label: "polar" },
        ],
      },
    ],
  },
  {
    id: "cat-sports",
    name: "Sports",
    subfolders: [
      { id: "sf-baseball", name: "Baseball", filenameItems: [{ id: "it-mets", label: "mets" }] },
    ],
  },
  {
    id: "cat-empty",
    name: "Empty",
    subfolders: [],
  },
];

// Test 1: move creates _Unsorted in a category that has none, and removes from source.
{
  const { categories, ok } = crossMove(makeCats(), {
    fromCatId: "cat-wildlife", fromSfId: "sf-bears", toCatId: "cat-empty", itemId: "it-brown",
  });
  assert("move to empty target creates _Unsorted and removes from source", ok);
  const empty = categories.find((c) => c.id === "cat-empty");
  const wild = categories.find((c) => c.id === "cat-wildlife");
  const bears = wild.subfolders.find((s) => s.id === "sf-bears");
  assert("target now has _Unsorted filenames sub-folder", empty.subfolders.length === 1 && empty.subfolders[0].name === "_Unsorted filenames");
  assert("_Unsorted contains the moved item", empty.subfolders[0].filenameItems[0].label === "brown");
  assert("source sub-folder no longer has the item", !bears.filenameItems.some((it) => it.id === "it-brown"));
}

// Test 2: move into a category that already has _Unsorted appends without creating a duplicate sub-folder.
{
  const cats = makeCats();
  // Pre-seed cat-sports with an _Unsorted sub-folder
  cats[1].subfolders.push({ id: "sf-unsorted-sports", name: "_Unsorted filenames", filenameItems: [] });
  const { categories, ok } = crossMove(cats, {
    fromCatId: "cat-wildlife", fromSfId: "sf-bears", toCatId: "cat-sports", itemId: "it-polar",
  });
  assert("move into pre-existing _Unsorted appends (not new sub-folder)", ok);
  const sports = categories.find((c) => c.id === "cat-sports");
  const unsortedSubs = sports.subfolders.filter((s) => s.name === "_Unsorted filenames");
  assert("only one _Unsorted sub-folder exists after move", unsortedSubs.length === 1);
  assert("polar landed in existing _Unsorted", unsortedSubs[0].filenameItems.some((it) => it.label === "polar"));
}

// Test 3: copy leaves the source untouched and gives a fresh id in target.
{
  const { categories, ok } = crossMove(makeCats(), {
    fromCatId: "cat-wildlife", fromSfId: "sf-bears", toCatId: "cat-empty", itemId: "it-brown", mode: "copy",
  });
  assert("copy succeeds", ok);
  const wild = categories.find((c) => c.id === "cat-wildlife");
  const bears = wild.subfolders.find((s) => s.id === "sf-bears");
  assert("source still has original item after copy", bears.filenameItems.some((it) => it.id === "it-brown"));
  const empty = categories.find((c) => c.id === "cat-empty");
  const copied = empty.subfolders[0].filenameItems[0];
  assert("copied item has a fresh id", copied.id !== "it-brown");
  assert("copied item preserves label", copied.label === "brown");
}

// Test 4: duplicate label in target's _Unsorted is refused.
{
  const cats = makeCats();
  cats[2].subfolders.push({ id: "sf-unsorted-empty", name: "_Unsorted filenames", filenameItems: [{ id: "it-existing", label: "brown" }] });
  const { ok, reason } = crossMove(cats, {
    fromCatId: "cat-wildlife", fromSfId: "sf-bears", toCatId: "cat-empty", itemId: "it-brown",
  });
  assert("duplicate label in target is refused", !ok);
  assert("refusal reason is 'duplicate'", reason === "duplicate");
}

// Test 5: same-category cross-move is a no-op (should use in-pack move instead).
{
  const { ok, reason } = crossMove(makeCats(), {
    fromCatId: "cat-wildlife", fromSfId: "sf-bears", toCatId: "cat-wildlife", itemId: "it-brown",
  });
  assert("same-category cross-move is refused", !ok);
  assert("refusal reason is 'same-or-missing-cat'", reason === "same-or-missing-cat");
}

console.log(`\n${pass}/${pass + fail} passing`);
if (fail > 0) process.exit(1);

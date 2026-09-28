// v1.5.0 — Tag History: snapshot push/prune + restore / keep-both.
// Run: node --test frontend/tests/tagHistory.test.mjs
import { strict as assert } from "node:assert";
import { test } from "node:test";

const { pushEntry, applyEntry, HISTORY_CAP, HISTORY_MAX_AGE_MS } = await import("../src/lib/tagHistory.js");

const cat = (id, name, subs = ["A"]) => ({
  id, name, subfolders: subs.map((s) => ({ id: `${id}-${s}`, name: s, iconType: "lucide", iconName: "Folder", filenameItems: [], subfolders: [] })),
});

test("pushEntry snapshots a deep copy and caps the list", () => {
  const original = cat("w", "Wildlife");
  let list = pushEntry([], { action: "import-replace", category: original, index: 0 });
  original.name = "MUTATED";
  assert.equal(list[0].before.name, "Wildlife");
  assert.equal(list[0].catName, "Wildlife");
  for (let i = 0; i < HISTORY_CAP + 10; i++) list = pushEntry(list, { action: "delete-category", category: cat(`c${i}`, `C${i}`) });
  assert.equal(list.length, HISTORY_CAP);
});

test("pushEntry prunes entries older than the max age", () => {
  const now = 10_000_000_000_000;
  let list = pushEntry([], { action: "delete-category", category: cat("old", "Old") }, now - HISTORY_MAX_AGE_MS - 1);
  list = pushEntry(list, { action: "delete-category", category: cat("new", "New") }, now);
  assert.deepEqual(list.map((e) => e.catName), ["New"]);
});

test("restore puts a replaced category back in place", () => {
  const before = cat("w", "Wildlife", ["Birds", "Mammals"]);
  const list = pushEntry([], { action: "import-replace", category: before, index: 0 });
  const current = [cat("w", "Wildlife", ["Fish"]), cat("s", "Sports")];
  const { categories, restoredName } = applyEntry(current, list[0], "restore");
  assert.equal(restoredName, "Wildlife");
  assert.equal(categories.length, 2);
  assert.deepEqual(categories[0].subfolders.map((s) => s.name), ["Birds", "Mammals"]);
  assert.equal(categories[1].id, "s");
});

test("keepBoth restores previous AND keeps the current version as 'Name 2'", () => {
  const before = cat("w", "Wildlife", ["Birds"]);
  const list = pushEntry([], { action: "import-replace", category: before, index: 0 });
  const current = [cat("w", "Wildlife", ["Fish"]), cat("s", "Sports")];
  const { categories, keptName } = applyEntry(current, list[0], "keepBoth");
  assert.equal(keptName, "Wildlife 2");
  assert.deepEqual(categories.map((c) => c.name), ["Wildlife", "Wildlife 2", "Sports"]);
  assert.deepEqual(categories[0].subfolders.map((s) => s.name), ["Birds"]);
  assert.deepEqual(categories[1].subfolders.map((s) => s.name), ["Fish"]);
  assert.notEqual(categories[1].id, categories[0].id);
});

test("restore re-inserts a deleted category at its old index", () => {
  const gone = cat("m", "Middle");
  const list = pushEntry([], { action: "delete-category", category: gone, index: 1 });
  const current = [cat("a", "A"), cat("c", "C")];
  const { categories } = applyEntry(current, list[0], "restore");
  assert.deepEqual(categories.map((c) => c.name), ["A", "Middle", "C"]);
  // keepBoth on a deleted category has nothing extra to keep
  const kb = applyEntry(current, list[0], "keepBoth");
  assert.deepEqual(kb.categories.map((c) => c.name), ["A", "Middle", "C"]);
  assert.equal(kb.keptName, undefined);
});

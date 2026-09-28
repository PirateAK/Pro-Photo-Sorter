// v1.5.0 — pack format v4 round-trip + Replace / Merge / Create-new rules.
// Run: node --test frontend/tests/packMerge.test.mjs
import { strict as assert } from "node:assert";
import { test } from "node:test";

const { serializeCategory, deserializePack, mergeCategory, applyImport, numberedName, findByName, countPack } =
  await import("../src/lib/packFormat.js");

let n = 0;
const uid = (p) => `${p}-${++n}`;

const tag = (label, extra = {}) => ({ id: uid("it"), label, iconType: "lucide", iconName: "Tag", ...extra });
const sub = (name, filenameItems = [], subfolders = [], extra = {}) => ({ id: uid("sf"), name, iconType: "lucide", iconName: "Folder", filenameItems, subfolders, ...extra });

const wildlife = () => ({
  id: "cat-wild",
  name: "Wildlife",
  subfolders: [
    sub("Birds", [tag("flying"), tag("perched")], [sub("Eagles", [tag("bald")])]),
    sub("Mammals", [tag("bear")]),
  ],
});

test("v4 export keeps nested sub-folders and re-imports identically", () => {
  const file = serializeCategory(wildlife());
  assert.equal(file.formatVersion, 4);
  assert.equal(file.subfolders[0].subfolders[0].name, "Eagles");
  assert.equal(file.subfolders[0].subfolders[0].filenameTags[0].label, "bald");
  const back = deserializePack(JSON.parse(JSON.stringify(file)), uid);
  assert.equal(back.name, "Wildlife");
  assert.deepEqual(countPack(back), { subfolders: 3, tags: 4 });
  assert.equal(back.subfolders[0].subfolders[0].filenameItems[0].label, "bald");
});

test("v3 file (no nested key) still imports", () => {
  const v3 = { formatVersion: 3, kind: "pps-tagpack", name: "Old", folderTags: [], filenameTags: [{ label: "loose" }],
    subfolders: [{ name: "A", iconName: "Folder", filenameTags: [{ label: "x" }] }] };
  const cat = deserializePack(v3, uid);
  assert.equal(cat.subfolders[0].name, "A");
  assert.equal(cat.subfolders[1].name, "_Unsorted filenames");
  assert.equal(cat.subfolders[1].filenameItems[0].label, "loose");
});

test("rejects non-pack files", () => {
  assert.throws(() => deserializePack({ kind: "pps-iconpack" }, uid), /Not a valid/);
});

test("numberedName picks the first free number without parentheses", () => {
  assert.equal(numberedName("Wildlife", ["Sports"]), "Wildlife");
  assert.equal(numberedName("Wildlife", ["Wildlife"]), "Wildlife 2");
  assert.equal(numberedName("Wildlife", ["wildlife", "Wildlife 2"]), "Wildlife 3");
  assert.equal(numberedName("Wildlife 2", ["Wildlife", "Wildlife 2"]), "Wildlife 3");
});

test("findByName is case-insensitive", () => {
  assert.equal(findByName([wildlife()], " wildLIFE ").id, "cat-wild");
  assert.equal(findByName([wildlife()], "Sports"), null);
});

test("merge appends new tags/sub-folders, skips duplicates, recurses", () => {
  const incoming = {
    id: "cat-in", name: "Wildlife",
    subfolders: [
      sub("birds", [tag("Flying"), tag("nesting")], [sub("Eagles", [tag("golden")]), sub("Owls", [tag("barn")])]),
      sub("Fish", [tag("salmon")]),
    ],
  };
  const { category, stats } = mergeCategory(wildlife(), incoming);
  assert.equal(category.id, "cat-wild");
  const birds = category.subfolders.find((s) => s.name === "Birds");
  assert.deepEqual(birds.filenameItems.map((t) => t.label), ["flying", "perched", "nesting"]);
  assert.deepEqual(birds.subfolders.map((s) => s.name), ["Eagles", "Owls"]);
  assert.deepEqual(birds.subfolders[0].filenameItems.map((t) => t.label), ["bald", "golden"]);
  assert.ok(category.subfolders.find((s) => s.name === "Fish"));
  assert.equal(stats.subfoldersAdded, 2); // Owls + Fish
  assert.equal(stats.tagsAdded, 4); // nesting, golden, barn, salmon
});

test("merge upgrades a plain icon to an incoming custom image, never the reverse", () => {
  const ex = { id: "c", name: "P", subfolders: [sub("A", [tag("x")])] };
  const inc = { id: "i", name: "P", subfolders: [sub("A", [tag("x", { iconType: "image", iconData: "data:img" })], [], { iconType: "image", iconData: "data:sf" })] };
  const { category } = mergeCategory(ex, inc);
  assert.equal(category.subfolders[0].iconType, "image");
  assert.equal(category.subfolders[0].filenameItems[0].iconData, "data:img");
  const back = mergeCategory(category, { id: "j", name: "P", subfolders: [sub("A", [tag("x")])] }).category;
  assert.equal(back.subfolders[0].filenameItems[0].iconType, "image");
});

test("applyImport: add / new / replace / merge", () => {
  const cats = [wildlife()];
  const incoming = { id: "cat-in", name: "Wildlife", subfolders: [sub("Fish", [tag("salmon")])] };

  const added = applyImport(cats, { ...incoming, name: "Sports" }, "new", null);
  assert.equal(added.mode, "add");
  assert.equal(added.categories.length, 2);

  const asNew = applyImport(cats, incoming, "new", cats[0]);
  assert.equal(asNew.category.name, "Wildlife 2");
  assert.equal(asNew.categories.length, 2);

  const replaced = applyImport(cats, incoming, "replace", cats[0]);
  assert.equal(replaced.categories.length, 1);
  assert.equal(replaced.categories[0].id, "cat-wild");
  assert.deepEqual(replaced.categories[0].subfolders.map((s) => s.name), ["Fish"]);

  const merged = applyImport(cats, incoming, "merge", cats[0]);
  assert.equal(merged.categories.length, 1);
  assert.deepEqual(merged.categories[0].subfolders.map((s) => s.name), ["Birds", "Mammals", "Fish"]);
  assert.equal(merged.stats.tagsAdded, 1);
});

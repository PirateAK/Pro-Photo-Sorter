// v1.7.0 — Shipper format (several packs + images + author/link) + link field on packs.
// Run: node --test frontend/tests/shipper.test.mjs
import { strict as assert } from "node:assert";
import { test } from "node:test";

const { serializeCategory, deserializePack, serializeShipper, deserializeShipper, isShipper, normalizeLink, linkDomain, dataUrlBytes, SHIPPER_LIMITS } =
  await import("../src/lib/packFormat.js");

let n = 0;
const uid = (p) => `${p}-${++n}`;
const tag = (label) => ({ id: uid("it"), label, iconType: "lucide", iconName: "Tag" });
const sub = (name, tags = [], subfolders = []) => ({ id: uid("sf"), name, iconType: "lucide", iconName: "Folder", filenameItems: tags.map(tag), subfolders });
const cat = (name, extra = {}) => ({ id: uid("cat"), name, subfolders: [sub("Eagles", ["soaring", "perched"]), sub("Bears", ["fishing"])], filenameItems: [], ...extra });

// 1×1 JPEG, tiny
const PX = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AN//Z";

test("normalizeLink adds https:// to bare domains, keeps schemes, trims", () => {
  assert.equal(normalizeLink(" muskegman.com "), "https://muskegman.com");
  assert.equal(normalizeLink("http://x.y/z"), "http://x.y/z");
  assert.equal(normalizeLink(""), "");
  assert.equal(linkDomain("https://www.muskegman.gumroad.com/l/abc"), "muskegman.gumroad.com");
  assert.equal(linkDomain(null), "");
});

test("pack file carries author + link and they survive the round trip", () => {
  const out = serializeCategory(cat("Alaska", { author: "Kurt", link: "muskegman.com" }));
  assert.equal(out.author, "Kurt");
  assert.equal(out.link, "https://muskegman.com");
  const back = deserializePack(JSON.parse(JSON.stringify(out)), uid);
  assert.equal(back.author, "Kurt");
  assert.equal(back.link, "https://muskegman.com");
  // explicit extra wins over the category's own field
  assert.equal(serializeCategory(cat("A", { author: "x" }), { author: "Y" }).author, "Y");
});

test("shipper: packs inherit author/link when blank, images capped at 3, round-trips", () => {
  const packs = [cat("Alaska"), cat("Wedding", { author: "Someone Else" })];
  const s = serializeShipper({ title: "Kurt's Collection", author: "Kurt", link: "muskegman.com", description: "two packs", images: [1, 2, 3, 4].map((i) => ({ name: `i${i}`, dataUrl: PX, width: 1, height: 1 })), packs });
  assert.equal(s.kind, "pps-shipper");
  assert.equal(s.images.length, SHIPPER_LIMITS.maxImages);
  assert.equal(s.packs.length, 2);
  assert.equal(s.packs[0].author, "Kurt");
  assert.equal(s.packs[0].link, "https://muskegman.com");
  assert.equal(s.packs[1].author, "Someone Else");
  assert.ok(isShipper(s));
  assert.ok(!isShipper(s.packs[0]));

  const back = deserializeShipper(JSON.parse(JSON.stringify(s)), uid);
  assert.equal(back.title, "Kurt's Collection");
  assert.equal(back.link, "https://muskegman.com");
  assert.equal(back.images.length, 3);
  assert.deepEqual(back.packs.map((p) => p.name), ["Alaska", "Wedding"]);
  assert.equal(back.packs[0].subfolders.length, 2);
  assert.equal(back.packs[0].subfolders[0].filenameItems.length, 2);
});

test("shipper: rejects non-shipper, empty, and drops oversize / non-image entries", () => {
  assert.throws(() => deserializeShipper({ kind: "pps-tagpack" }, uid), /Not a Pro Photo Sorter shipper/);
  assert.throws(() => deserializeShipper({ kind: "pps-shipper", packs: [] }, uid), /no tag packs/);
  const big = `data:image/jpeg;base64,${"A".repeat(Math.ceil((SHIPPER_LIMITS.maxImageBytes + 10) * 4 / 3))}`;
  assert.ok(dataUrlBytes(big) > SHIPPER_LIMITS.maxImageBytes);
  const s = serializeShipper({ packs: [cat("A")], images: [{ dataUrl: big }, { dataUrl: "http://evil/x.png" }, { dataUrl: PX }] });
  assert.equal(s.images.length, 1);
  assert.equal(s.title, "A collection");
  // read side inherits too (hand-made files)
  const back = deserializeShipper({ kind: "pps-shipper", author: "K", link: "muskegman.com", packs: [{ kind: "pps-tagpack", name: "X", tags: [{ label: "a" }] }] }, uid);
  assert.equal(back.packs[0].author, "K");
  assert.equal(back.packs[0].link, "https://muskegman.com");
});

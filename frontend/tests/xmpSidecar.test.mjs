// Regression suite for the XMP sidecar builder (v1.4.6).
// Verifies keyword deduping, rating clamp, XML escaping, and the
// "no rating element when stars=0" contract.
import { strict as assert } from "node:assert";
import { test } from "node:test";

// Dynamic import: xmp.js has no browser deps so it loads in plain node.
const { buildXmpPacket } = await import("../src/lib/xmp.js");

test("packet contains dc:subject with unique trimmed keywords", () => {
  const out = buildXmpPacket({
    keywords: ["Wedding", "  bride  ", "wedding", "", "  ", "groom"],
    stars: 3,
    version: "1.4.6",
  });
  assert.match(out, /<dc:subject>/, "packet must include dc:subject");
  assert.match(out, /<rdf:li>Wedding<\/rdf:li>/, "Wedding kept as-is");
  assert.match(out, /<rdf:li>bride<\/rdf:li>/, "bride trimmed");
  assert.match(out, /<rdf:li>groom<\/rdf:li>/, "groom present");
  // Duplicate 'wedding' should be dropped (case-sensitive dedupe by design)
  const bridgeMatches = out.match(/<rdf:li>bride<\/rdf:li>/g) || [];
  assert.equal(bridgeMatches.length, 1, "bride only once");
});

test("rating clamps into 0..5 and rounds", () => {
  assert.match(buildXmpPacket({ stars: 4.7 }), /<xmp:Rating>5<\/xmp:Rating>/);
  assert.match(buildXmpPacket({ stars: 3 }),   /<xmp:Rating>3<\/xmp:Rating>/);
  assert.match(buildXmpPacket({ stars: 99 }),  /<xmp:Rating>5<\/xmp:Rating>/);
});

test("zero-star omits xmp:Rating so Lightroom treats it as unrated", () => {
  const out = buildXmpPacket({ keywords: ["dog"], stars: 0 });
  assert.doesNotMatch(out, /<xmp:Rating>/, "no rating element when stars=0");
  assert.match(out, /<rdf:li>dog<\/rdf:li>/, "keywords still present");
});

test("empty keywords + zero stars still produces a valid packet", () => {
  const out = buildXmpPacket({});
  assert.match(out, /<x:xmpmeta/);
  assert.match(out, /Pro Photo Sorter/);
  assert.doesNotMatch(out, /<dc:subject>/);
  assert.doesNotMatch(out, /<xmp:Rating>/);
});

test("keyword objects with .label are accepted", () => {
  const out = buildXmpPacket({
    keywords: [{ label: "Alaska" }, { label: "Cruise" }, "Sunset"],
  });
  assert.match(out, /<rdf:li>Alaska<\/rdf:li>/);
  assert.match(out, /<rdf:li>Cruise<\/rdf:li>/);
  assert.match(out, /<rdf:li>Sunset<\/rdf:li>/);
});

test("XML special characters are escaped", () => {
  const out = buildXmpPacket({ keywords: ['Bob & Sue', 'Q<A>', 'quote"here'] });
  assert.match(out, /Bob &amp; Sue/);
  assert.match(out, /Q&lt;A&gt;/);
  assert.match(out, /quote&quot;here/);
  assert.doesNotMatch(out, /<rdf:li>[^<]*&(?!amp;|lt;|gt;|quot;|apos;)/, "no bare '&'");
});

test("version string flows into CreatorTool", () => {
  const out = buildXmpPacket({ version: "1.4.6" });
  assert.match(out, /<xmp:CreatorTool>Pro Photo Sorter 1\.4\.6<\/xmp:CreatorTool>/);
});

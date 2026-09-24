// v1.4.0 — Tests for the custom filename template validator + auto-namer.
// Run manually: node /app/frontend/tests/customFilenameTemplate.test.mjs
//
// Mirrors the helpers in /app/frontend/src/lib/template.js. Keep in sync.

const TEMPLATE_TOKEN_NAMES = new Set([
  "folders", "tags", "allLabels", "date", "stars", "original", "ext",
  "folder", "labels",
]);
const NUMBERED_TOKEN_RE = /^(?:folder|tag|label)\d+$/;

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}

function validateTemplate(template) {
  const text = template || "";
  const tokens = [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
  const invalid = [];
  const validList = [...TEMPLATE_TOKEN_NAMES];
  for (const t of tokens) {
    if (TEMPLATE_TOKEN_NAMES.has(t)) continue;
    if (NUMBERED_TOKEN_RE.test(t)) continue;
    invalid.push(t);
  }
  if (invalid.length === 0) return { ok: true };
  const suggestions = {};
  for (const bad of invalid) {
    let best = null;
    let bestDist = Infinity;
    for (const good of validList) {
      const d = levenshtein(bad.toLowerCase(), good.toLowerCase());
      if (d < bestDist) { bestDist = d; best = good; }
    }
    if (best && bestDist <= 3) suggestions[bad] = best;
  }
  return { ok: false, invalid, suggestions };
}

function autoNameForTemplate(template) {
  const stripped = (template || "").replace(/\{[^}]+\}/g, " ").replace(/[^A-Za-z0-9]+/g, " ").trim();
  const first = stripped.split(/\s+/).find(Boolean);
  const name = (first || "Custom").slice(0, 24);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const cases = [
  // Validator — valid inputs
  { name: "default template is valid", tpl: "{folders}/{tags}{ext}", wantOk: true },
  { name: "date + stars valid", tpl: "{stars}stars/{date}_{tags}{ext}", wantOk: true },
  { name: "numbered folder1/tag1 valid", tpl: "{folder1}-{folder2}/{tag1}_{tag2}{ext}", wantOk: true },
  { name: "legacy {folder} alias valid", tpl: "{folder}/{labels}{ext}", wantOk: true },
  { name: "empty template counts as ok (no tokens)", tpl: "", wantOk: true },
  { name: "plain literal path with no tokens", tpl: "raw_photos/photo.jpg", wantOk: true },

  // Validator — invalid inputs (c1: refuse to save + red error)
  { name: "typo {foldres} flagged", tpl: "{foldres}/{tags}{ext}", wantOk: false, wantInvalid: ["foldres"], wantSuggest: { foldres: "folders" } },
  { name: "typo {tgs} flagged", tpl: "{folders}/{tgs}{ext}", wantOk: false, wantInvalid: ["tgs"], wantSuggest: { tgs: "tags" } },
  { name: "unknown {rating} flagged", tpl: "{rating}/{ext}", wantOk: false, wantInvalid: ["rating"] },
  { name: "multiple bad tokens all listed", tpl: "{foo}/{bar}{baz}", wantOk: false, wantInvalid: ["foo", "bar", "baz"] },
  { name: "numbered typo tag01a not accepted", tpl: "{tag01a}{ext}", wantOk: false, wantInvalid: ["tag01a"] },

  // autoNameForTemplate
  { name: "autoName picks first literal word", tplName: "{folders}/wedding_{tags}{ext}", want: "Wedding" },
  { name: "autoName ignores tokens", tplName: "{folders}/{tags}_{original}{ext}", want: "Custom" },
  { name: "autoName cleans separators", tplName: "raw-photos/{tags}{ext}", want: "Raw" },
];

let pass = 0, fail = 0;
for (const c of cases) {
  if (c.tpl !== undefined) {
    const res = validateTemplate(c.tpl);
    let ok = res.ok === c.wantOk;
    if (ok && c.wantInvalid) {
      ok = JSON.stringify(res.invalid.sort()) === JSON.stringify(c.wantInvalid.slice().sort());
    }
    if (ok && c.wantSuggest) {
      for (const [bad, good] of Object.entries(c.wantSuggest)) {
        if (res.suggestions?.[bad] !== good) ok = false;
      }
    }
    ok ? pass++ : fail++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}`);
    if (!ok) console.log(`      got:  ${JSON.stringify(res)}`);
  } else if (c.tplName !== undefined) {
    const got = autoNameForTemplate(c.tplName);
    const ok = got === c.want;
    ok ? pass++ : fail++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}`);
    if (!ok) console.log(`      got: "${got}"  want: "${c.want}"`);
  }
}

console.log(`\n${pass}/${pass + fail} passing${fail ? ` - ${fail} failure(s)` : ""}`);
process.exit(fail === 0 ? 0 : 1);

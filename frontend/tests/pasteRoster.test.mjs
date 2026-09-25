// v1.4.3 — Paste-Roster parser regression. Mirrors parseRoster() in
// /app/frontend/src/components/PasteRosterButton.jsx. If you change the
// parser, mirror it here. Run: node /app/frontend/tests/pasteRoster.test.mjs

function parseRoster(text) {
  if (!text || typeof text !== "string") return [];
  const cleaned = text
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      return t && !t.startsWith("//") && !t.startsWith("#");
    })
    .join(",");
  const parts = cleaned.split(/[,\n]/);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const label = p.trim().slice(0, 60);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

const cases = [
  { name: "comma-separated roster", input: "Devers, Bogaerts, Story, Duran", want: ["Devers", "Bogaerts", "Story", "Duran"] },
  { name: "newline roster", input: "Devers\nBogaerts\nStory\nDuran", want: ["Devers", "Bogaerts", "Story", "Duran"] },
  { name: "mixed commas + newlines", input: "Devers, Bogaerts\nStory, Duran", want: ["Devers", "Bogaerts", "Story", "Duran"] },
  { name: "whitespace only entries skipped", input: "Devers, , , Story", want: ["Devers", "Story"] },
  { name: "case-insensitive dedupe keeps first spelling", input: "Devers, DEVERS, devers, Bogaerts", want: ["Devers", "Bogaerts"] },
  { name: "// comment lines ignored", input: "// AL East\nDevers\n// starters\nBogaerts", want: ["Devers", "Bogaerts"] },
  { name: "# comment lines ignored", input: "# roster\nDevers\nBogaerts", want: ["Devers", "Bogaerts"] },
  { name: "label capped at 60 chars", input: "a".repeat(80), want: ["a".repeat(60)] },
  { name: "empty input returns empty array", input: "", want: [] },
  { name: "only commas returns empty", input: ",,,,", want: [] },
  { name: "windows CRLF line endings", input: "Devers\r\nBogaerts\r\nStory", want: ["Devers", "Bogaerts", "Story"] },
  { name: "trailing/leading commas OK", input: ", Devers, Bogaerts, ", want: ["Devers", "Bogaerts"] },
  { name: "tab in the middle preserved as part of label", input: "Rafael\tDevers, Bogaerts", want: ["Rafael\tDevers", "Bogaerts"] },
];

let pass = 0, fail = 0;
for (const c of cases) {
  const got = parseRoster(c.input);
  const ok = JSON.stringify(got) === JSON.stringify(c.want);
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.name}`);
  if (!ok) console.log(`      got:  ${JSON.stringify(got)}\n      want: ${JSON.stringify(c.want)}`);
}
console.log(`\n${pass}/${pass + fail} passing${fail ? ` - ${fail} failure(s)` : ""}`);
process.exit(fail === 0 ? 0 : 1);

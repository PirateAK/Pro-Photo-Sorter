// Regression test for /app/frontend/src/lib/license.js — trial filename helper.
// Run manually with: node /app/frontend/tests/license.trial.test.mjs
//
// Kept as a plain node script (not jest) so it can run without extra tooling
// and works fine in Kurt's offline dev environment.

import { applyTrialSuffix, TRIAL_WATERMARK_TEXT } from "../src/lib/license.js";

const cases = [
  ["photo.jpg",              "photo_TRIAL.jpg"],
  ["photo.JPG",              "photo_TRIAL.JPG"],
  ["wedding_2024_bride.jpg", "wedding_2024_bride_TRIAL.jpg"],
  ["IMG_1234.CR2",           "IMG_1234_TRIAL.CR2"],
  ["long.name.with.dots.png","long.name.with.dots_TRIAL.png"],
  ["NoExtension",            "NoExtension_TRIAL"],
  [".hiddenfile",            ".hiddenfile_TRIAL"],
  ["",                       ""],
  [null,                     null],
];

let pass = 0, fail = 0;
for (const [inp, want] of cases) {
  const got = applyTrialSuffix(inp);
  const ok = got === want;
  ok ? pass++ : fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  applyTrialSuffix(${JSON.stringify(inp)}) -> ${JSON.stringify(got)}${ok ? "" : ` (want ${JSON.stringify(want)})`}`);
}

// Sanity — the trial watermark constant is a non-empty string.
if (typeof TRIAL_WATERMARK_TEXT !== "string" || TRIAL_WATERMARK_TEXT.length < 4) {
  console.log("FAIL  TRIAL_WATERMARK_TEXT should be a non-empty string");
  fail++;
} else {
  console.log(`PASS  TRIAL_WATERMARK_TEXT = ${JSON.stringify(TRIAL_WATERMARK_TEXT)}`);
  pass++;
}

console.log(`\n${pass}/${pass + fail} passing${fail ? ` - ${fail} failure(s)` : ""}`);
process.exit(fail === 0 ? 0 : 1);

// v1.3.1 — Source-level guard for the bootRestore.js off-by-one bug.
//
// The existing tests in safetyBackup.test.mjs use their own inline
// implementation of bootRestoreCore, which means a divergence between
// the test's inline logic and the real production module can slip
// through. That's exactly what happened with Kurt's install: the
// inline test had `hasState && hasLicense`, the real module had
// `hasState || hasLicense`, and the wrong operator wiped his tags
// when only the license carried over.
//
// This test reads the real file and pins the operator so we can't
// regress silently again.
//
// Run with: node frontend/tests/bootRestoreSource.test.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bootRestorePath = path.join(__dirname, '..', 'src', 'lib', 'bootRestore.js');
const src = fs.readFileSync(bootRestorePath, 'utf8');

let pass = 0, fail = 0;
function assert(name, cond) {
  if (cond) { console.log(`✓ ${name}`); pass++; }
  else      { console.log(`✗ ${name}`); fail++; }
}

// 1. The early-return gate MUST use && (both populated), never || (either).
// The || form causes half-populated stores (license surviving, state wiped)
// to never restore — Kurt's bug.
assert(
  "bootRestore gates the eager-mirror on `hasState && hasLicense`",
  /if\s*\(\s*hasState\s*&&\s*hasLicense\s*\)/.test(src)
);
assert(
  "bootRestore does NOT gate on `hasState || hasLicense` (regression guard)",
  !/if\s*\(\s*hasState\s*\|\|\s*hasLicense\s*\)/.test(src)
);

// 2. The per-key restore blocks must still exist so half-populated stores
// recover the missing half from the safety mirror.
assert(
  "per-key state restore block present (!hasState guard)",
  /if\s*\(\s*!hasState\s*&&/.test(src)
);
assert(
  "per-key license restore block present (!hasLicense guard)",
  /if\s*\(\s*!hasLicense\s*&&/.test(src)
);

console.log(`\n${pass}/${pass + fail} passing`);
if (fail > 0) process.exit(1);

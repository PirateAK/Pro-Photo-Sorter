// Regression tests for v1.2.9 Safety-Backup + boot-restore data-persistence
// hardening. Run with `node frontend/tests/safetyBackup.test.mjs`.
//
// We test two independent paths:
//   1. The `main.js` migration + safety mirror is a Node function set — we
//      inline a copy of the fs helpers here and prove they:
//        a) migrate Local Storage from a legacy 'electron-shell' folder ONLY
//           when the pinned dir has no data yet,
//        b) never migrate twice (sentinel file),
//        c) write latest.json + one daily snapshot per day,
//        d) prune snapshots older than the 30-day window.
//   2. `bootRestoreFromSafetyIfEmpty` in isolation: given a fake
//      localStorage + a fake electronAPI, it restores state + license only
//      when the keys are missing.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

// ─── Section 1: replicate the fs helpers used in main.js ─────────────────
function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirSync(s, d);
    else if (entry.isFile()) fs.copyFileSync(s, d);
  }
}

function migrateFromLegacyElectronShellSync({ appDataRoot, pinnedDir }) {
  const legacyPath = path.join(appDataRoot, 'electron-shell');
  const legacyLocalStorage = path.join(legacyPath, 'Local Storage');
  const pinnedLocalStorage = path.join(pinnedDir, 'Local Storage');
  const sentinel = path.join(pinnedDir, '.pps-migrated-from-electron-shell');
  if (fs.existsSync(sentinel)) return false;
  if (!fs.existsSync(legacyLocalStorage)) return false;
  if (fs.existsSync(pinnedLocalStorage)) return false;
  fs.mkdirSync(pinnedDir, { recursive: true });
  for (const sub of ['Local Storage', 'Session Storage', 'IndexedDB']) {
    const from = path.join(legacyPath, sub);
    const to = path.join(pinnedDir, sub);
    if (fs.existsSync(from) && !fs.existsSync(to)) copyDirSync(from, to);
  }
  fs.writeFileSync(sentinel, `migrated ${new Date().toISOString()}`, 'utf8');
  return true;
}

function safetyWriteSync({ safetyDir, payload, today }) {
  fs.mkdirSync(safetyDir, { recursive: true });
  const latestPath = path.join(safetyDir, 'latest.json');
  const json = JSON.stringify(payload, null, 2);
  fs.writeFileSync(latestPath, json, 'utf8');
  const daily = path.join(safetyDir, `snapshot-${today}.json`);
  if (!fs.existsSync(daily)) fs.writeFileSync(daily, json, 'utf8');
  const files = fs.readdirSync(safetyDir)
    .filter((f) => f.startsWith('snapshot-') && f.endsWith('.json'))
    .sort();
  while (files.length > 30) {
    const oldest = files.shift();
    fs.unlinkSync(path.join(safetyDir, oldest));
  }
}

// ─── Test 1: legacy migration copies data ─────────────────────────────────
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pps-test-'));
  const legacy = path.join(tmp, 'electron-shell', 'Local Storage');
  fs.mkdirSync(legacy, { recursive: true });
  fs.writeFileSync(path.join(legacy, 'leveldb.txt'), 'user tag packs', 'utf8');
  const pinned = path.join(tmp, 'Pro Photo Sorter');

  const ranFirst = migrateFromLegacyElectronShellSync({ appDataRoot: tmp, pinnedDir: pinned });
  const migratedFile = path.join(pinned, 'Local Storage', 'leveldb.txt');
  assert.equal(ranFirst, true, 'first migration should run');
  assert.equal(fs.readFileSync(migratedFile, 'utf8'), 'user tag packs', 'legacy leveldb copied');
  assert.ok(fs.existsSync(path.join(pinned, '.pps-migrated-from-electron-shell')), 'sentinel written');

  // Idempotency: running again is a no-op even after the sentinel is present.
  const ranAgain = migrateFromLegacyElectronShellSync({ appDataRoot: tmp, pinnedDir: pinned });
  assert.equal(ranAgain, false, 'second migration must skip');
  console.log('✓ legacy electron-shell migration copies once and is idempotent');
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ─── Test 2: does NOT clobber existing data in pinned dir ─────────────────
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pps-test-'));
  const legacy = path.join(tmp, 'electron-shell', 'Local Storage');
  const pinned = path.join(tmp, 'Pro Photo Sorter', 'Local Storage');
  fs.mkdirSync(legacy, { recursive: true });
  fs.mkdirSync(pinned, { recursive: true });
  fs.writeFileSync(path.join(legacy, 'x.txt'), 'legacy', 'utf8');
  fs.writeFileSync(path.join(pinned, 'x.txt'), 'current', 'utf8');
  const ran = migrateFromLegacyElectronShellSync({ appDataRoot: tmp, pinnedDir: path.dirname(pinned) });
  assert.equal(ran, false, 'must skip when pinned dir already has Local Storage');
  assert.equal(fs.readFileSync(path.join(pinned, 'x.txt'), 'utf8'), 'current', 'pinned data untouched');
  console.log('✓ migration refuses to overwrite existing pinned data');
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ─── Test 3: safety mirror writes latest + daily + prunes to 30 ──────────
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pps-test-'));
  const safetyDir = path.join(tmp, 'Safety-Backups');
  fs.mkdirSync(safetyDir, { recursive: true });

  // Seed 30 fake old snapshots so the newest write should trigger pruning.
  for (let i = 0; i < 30; i++) {
    const day = String(i + 1).padStart(2, '0');
    fs.writeFileSync(path.join(safetyDir, `snapshot-2025-01-${day}.json`), '{}', 'utf8');
  }
  safetyWriteSync({ safetyDir, payload: { license: { key: 'ABC' } }, today: '2026-02-20' });

  const snaps = fs.readdirSync(safetyDir).filter((f) => f.startsWith('snapshot-')).sort();
  assert.equal(snaps.length, 30, 'snapshots capped at 30 after prune');
  assert.equal(snaps[snaps.length - 1], 'snapshot-2026-02-20.json', 'newest snapshot present');
  assert.equal(snaps[0], 'snapshot-2025-01-02.json', 'oldest snapshot pruned');
  assert.ok(fs.existsSync(path.join(safetyDir, 'latest.json')), 'latest.json written');
  const latest = JSON.parse(fs.readFileSync(path.join(safetyDir, 'latest.json'), 'utf8'));
  assert.equal(latest.license.key, 'ABC', 'latest.json contains payload');
  console.log('✓ safety mirror writes latest + one snapshot/day + prunes to 30');
  fs.rmSync(tmp, { recursive: true, force: true });
}

// ─── Section 2: bootRestoreFromSafetyIfEmpty logic ─────────────────────────
//
// We can't import the real module (it depends on the frontend @-alias
// resolver and Chromium's localStorage) so we inline the same logic here.
function bootRestoreCore({ store, safetyPayload }) {
  const STATE_KEY = 'pps.state.v1_1';
  const LICENSE_KEY = 'gvmaas.license.v1';
  const hasState = !!store[STATE_KEY];
  const hasLicense = !!store[LICENSE_KEY];
  if (hasState && hasLicense) return { restored: false, reason: 'already-populated' };
  if (!safetyPayload) return { restored: false, reason: 'no-safety-backup' };
  let restoredState = false;
  let restoredLicense = false;
  if (!hasState && typeof safetyPayload.state === 'string' && safetyPayload.state.length > 0) {
    JSON.parse(safetyPayload.state);
    store[STATE_KEY] = safetyPayload.state;
    restoredState = true;
  }
  if (!hasLicense && safetyPayload.license && safetyPayload.license.key) {
    store[LICENSE_KEY] = JSON.stringify(safetyPayload.license);
    restoredLicense = true;
  }
  return { restored: restoredState || restoredLicense, restoredState, restoredLicense };
}

// Test 4: empty store + valid safety → restores both
{
  const store = {};
  const res = bootRestoreCore({
    store,
    safetyPayload: {
      state: JSON.stringify({ categories: [{ id: 'foo', name: 'Foo' }] }),
      license: { key: 'AAAA-BBBB-CCCC-DDDD', activatedAt: '2026-02-20T00:00:00Z' },
    },
  });
  assert.equal(res.restored, true);
  assert.equal(res.restoredState, true);
  assert.equal(res.restoredLicense, true);
  assert.ok(store['pps.state.v1_1'].includes('Foo'));
  assert.ok(store['gvmaas.license.v1'].includes('AAAA-BBBB'));
  console.log('✓ boot-restore hydrates empty localStorage from safety mirror');
}

// Test 5: populated store → does nothing
{
  const store = {
    'pps.state.v1_1': JSON.stringify({ categories: [] }),
    'gvmaas.license.v1': JSON.stringify({ key: 'EXISTING' }),
  };
  const before = { ...store };
  const res = bootRestoreCore({ store, safetyPayload: { state: '{}', license: { key: 'OTHER' } } });
  assert.equal(res.restored, false);
  assert.deepEqual(store, before, 'existing state must not be overwritten');
  console.log('✓ boot-restore refuses to overwrite existing localStorage');
}

// Test 6: half-populated (license missing but state present) → only license restores
{
  const store = { 'pps.state.v1_1': JSON.stringify({ categories: [] }) };
  const res = bootRestoreCore({
    store,
    safetyPayload: {
      state: JSON.stringify({ categories: [{ id: 'ignored' }] }),
      license: { key: 'ONLY-LICENSE' },
    },
  });
  assert.equal(res.restoredState, false, 'state was already present — must not overwrite');
  assert.equal(res.restoredLicense, true, 'license was missing — must restore');
  assert.ok(!store['pps.state.v1_1'].includes('ignored'), 'existing state untouched');
  assert.ok(store['gvmaas.license.v1'].includes('ONLY-LICENSE'));
  console.log('✓ boot-restore is per-key: half-populated stores restore only what is missing');
}

console.log('\nAll v1.2.9 Safety-Backup + boot-restore tests passed.');

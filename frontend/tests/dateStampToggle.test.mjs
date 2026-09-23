// Regression tests for v1.2.9 Date-stamp toggle + one-stamp-per-photo rule.
// Simulates the toggle logic that DateTagDropdowns + App.js implement:
//   • Empty overlay + apply(labels)     → 3 date-stamp chips added
//   • Apply again (same overlay!)       → old chips removed, new ones added (still 3)
//   • Toggle (isApplied=true → remove)  → 0 date-stamp chips left
//   • Foreign chips (non date-stamp)    → NEVER touched by the date logic

import assert from 'node:assert/strict';

const DATE_STAMP_IDS = {
  month: 'date-stamp-month',
  day: 'date-stamp-day',
  year: 'date-stamp-year',
};
const DATE_IDS_SET = new Set(Object.values(DATE_STAMP_IDS));

function applyDateStamp(overlayTags, labels) {
  // Mirrors App.js onApply path: strip prior date stamps, then add new ones.
  const stripped = overlayTags.filter((c) => !DATE_IDS_SET.has(c.id));
  const added = labels.map(({ id, label }) => ({
    id, label, iconType: 'lucide', iconName: 'Calendar', uid: `uid-${id}`,
  }));
  return [...stripped, ...added];
}
function removeDateStamp(overlayTags) {
  return overlayTags.filter((c) => !DATE_IDS_SET.has(c.id));
}
function isDateStampApplied(overlayTags) {
  return overlayTags.some((c) => DATE_IDS_SET.has(c.id));
}

// ─── Test 1: apply on empty overlay adds exactly 3 chips ──────────────────
{
  const labels = [
    { id: DATE_STAMP_IDS.month, label: 'Sep' },
    { id: DATE_STAMP_IDS.day, label: '23' },
    { id: DATE_STAMP_IDS.year, label: '2026' },
  ];
  const after = applyDateStamp([], labels);
  assert.equal(after.length, 3);
  assert.equal(isDateStampApplied(after), true);
  const ids = after.map((c) => c.id);
  assert.deepEqual(ids.sort(), [...DATE_IDS_SET].sort());
  console.log('✓ apply on empty overlay adds exactly the three date-stamp chips');
}

// ─── Test 2: apply again with a different date does NOT duplicate ────────
{
  const firstLabels = [
    { id: DATE_STAMP_IDS.month, label: 'Sep' },
    { id: DATE_STAMP_IDS.day, label: '23' },
    { id: DATE_STAMP_IDS.year, label: '2026' },
  ];
  let overlay = applyDateStamp([], firstLabels);
  // User changes year and re-applies
  const secondLabels = [
    { id: DATE_STAMP_IDS.month, label: 'Sep' },
    { id: DATE_STAMP_IDS.day, label: '23' },
    { id: DATE_STAMP_IDS.year, label: '2024' },
  ];
  overlay = applyDateStamp(overlay, secondLabels);
  const yearChips = overlay.filter((c) => c.id === DATE_STAMP_IDS.year);
  assert.equal(yearChips.length, 1, 'must be exactly one year chip, not two');
  assert.equal(yearChips[0].label, '2024', 'must be the fresh year, old wiped');
  assert.equal(overlay.length, 3, 'total date-stamp chips still capped at 3');
  console.log('✓ re-applying with a new date replaces the old stamp (one stamp per photo)');
}

// ─── Test 3: partial apply — user leaves day blank ────────────────────────
{
  // The component filters undefined slots before invoking onApply, so we
  // simulate that pre-filter.
  const labels = [
    { id: DATE_STAMP_IDS.month, label: 'Sep' },
    { id: DATE_STAMP_IDS.year, label: '2026' },
  ];
  const after = applyDateStamp([], labels);
  assert.equal(after.length, 2);
  assert.equal(after.some((c) => c.id === DATE_STAMP_IDS.day), false, 'no day chip');
  assert.equal(after.some((c) => c.id === DATE_STAMP_IDS.month), true);
  assert.equal(after.some((c) => c.id === DATE_STAMP_IDS.year), true);
  console.log('✓ partial stamps (e.g. month + year, no day) supported');
}

// ─── Test 4: toggle-off removes stamp but preserves other chips ──────────
{
  const foreign = [
    { id: 'wildlife-mammals', label: 'Mammals', iconType: 'lucide', iconName: 'Squirrel' },
    { id: 'wildlife-portrait', label: 'portrait', iconType: 'lucide', iconName: 'User' },
  ];
  const withStamp = applyDateStamp(foreign, [
    { id: DATE_STAMP_IDS.month, label: 'Sep' },
    { id: DATE_STAMP_IDS.day, label: '23' },
    { id: DATE_STAMP_IDS.year, label: '2026' },
  ]);
  assert.equal(withStamp.length, 5, '2 foreign + 3 stamp');
  assert.equal(isDateStampApplied(withStamp), true);
  const removed = removeDateStamp(withStamp);
  assert.equal(removed.length, 2, 'stamps gone, foreign chips untouched');
  assert.deepEqual(removed.map((c) => c.id).sort(), ['wildlife-mammals', 'wildlife-portrait']);
  assert.equal(isDateStampApplied(removed), false);
  console.log('✓ toggle-off removes only date-stamp chips, foreign chips preserved');
}

// ─── Test 5: isDateStampApplied is per-image (empty overlay = false) ─────
{
  assert.equal(isDateStampApplied([]), false);
  assert.equal(isDateStampApplied([{ id: 'foo', label: 'Bar' }]), false);
  assert.equal(isDateStampApplied([{ id: DATE_STAMP_IDS.month, label: 'Sep' }]), true);
  console.log('✓ isDateStampApplied ignores non-stamp chips and empty overlays');
}

console.log('\nAll v1.2.9 Date-stamp toggle tests passed.');

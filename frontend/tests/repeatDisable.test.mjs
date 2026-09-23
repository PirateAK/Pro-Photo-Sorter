// v1.3.1 — "Repeat last tags" auto-disable regression tests
//
// The Repeat button in App.js should grey out when there is nothing new to
// repeat. This test mirrors the pure predicate used by the UI so the
// disable/tooltip logic stays honest across refactors.
//
// Run with: node frontend/tests/repeatDisable.test.mjs

// Pure predicate — kept in sync with App.js's inline IIFE.
function computeRepeatState({ currentImage, lastAppliedTags, lastStoredPhotoName }) {
  const isSameAsLastStored =
    !!(currentImage && lastStoredPhotoName && currentImage.name === lastStoredPhotoName);
  const disabled = !lastAppliedTags || !currentImage || isSameAsLastStored;
  const reason = !currentImage
    ? "no-photo"
    : !lastAppliedTags
    ? "no-snapshot"
    : isSameAsLastStored
    ? "same-as-last-stored"
    : "ready";
  return { disabled, reason };
}

let pass = 0, fail = 0;
function assert(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { console.log(`✓ ${name}`); pass++; }
  else    { console.log(`✗ ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`); fail++; }
}

// no photo loaded → always disabled
assert("no photo → disabled (no-photo)",
  computeRepeatState({ currentImage: null, lastAppliedTags: null, lastStoredPhotoName: null }),
  { disabled: true, reason: "no-photo" });

// photo loaded but never stored anything with tags yet
assert("photo but no snapshot → disabled (no-snapshot)",
  computeRepeatState({
    currentImage: { name: "DSC_0001.jpg" },
    lastAppliedTags: null,
    lastStoredPhotoName: null,
  }),
  { disabled: true, reason: "no-snapshot" });

// user is still parked on the just-stored photo (the exact bug Kurt hit
// on the last image of a filmstrip)
assert("still on last-stored photo → disabled (same-as-last-stored)",
  computeRepeatState({
    currentImage: { name: "DSC_0099.jpg" },
    lastAppliedTags: { folders: [{ id: "a" }], tags: [] },
    lastStoredPhotoName: "DSC_0099.jpg",
  }),
  { disabled: true, reason: "same-as-last-stored" });

// user advanced to the next photo → button re-enables
assert("advanced to next photo → enabled (ready)",
  computeRepeatState({
    currentImage: { name: "DSC_0100.jpg" },
    lastAppliedTags: { folders: [{ id: "a" }], tags: [{ id: "b" }] },
    lastStoredPhotoName: "DSC_0099.jpg",
  }),
  { disabled: false, reason: "ready" });

// snapshot exists but never stored a photo (edge case: manually set)
assert("snapshot exists, no lastStored → enabled",
  computeRepeatState({
    currentImage: { name: "DSC_0001.jpg" },
    lastAppliedTags: { folders: [], tags: [{ id: "b" }] },
    lastStoredPhotoName: null,
  }),
  { disabled: false, reason: "ready" });

console.log(`\n${pass}/${pass + fail} passing`);
if (fail > 0) process.exit(1);

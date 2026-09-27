// Regression suite for `composeDestFolderParts` — the helper that decides
// the final destination folder chain from (pack name, template-derived
// folder parts, sub-folder cascade).
//
// v1.4.7 bug: Kurt picked pack "Wildlife" + sub-folder "Birds" + filename
// tag "Bald Eagle" (no folder chips). The template stage emitted "unsorted"
// as the {folders} fallback and the helper appended it verbatim, producing
// `Wildlife/unsorted/Birds/Bald_Eagle.jpg`. The fix strips "unsorted"
// whenever we already have folder context (pack or sub-folder). Kept the
// "unsorted" bin only for the true orphan case (no pack, no sub-folder).
import { strict as assert } from "node:assert";
import { test } from "node:test";

// Grab composeDestFolderParts from App.js. It's not exported (private
// module helper), so replicate the current implementation here for the
// test. This mirror MUST stay in sync with the App.js definition; any
// future refactor should either export it or update both copies.
function composeDestFolderParts(activePack, folderPartsFromTemplate, subChain) {
  const chainNames = Array.isArray(subChain) ? subChain.map((s) => s?.name) : [];
  const hasFolderContext = !!activePack?.name || chainNames.some((n) => n && String(n).trim().length > 0);
  const cleanedTemplateParts = (folderPartsFromTemplate || []).filter((p) => {
    if (!hasFolderContext) return true;
    return String(p).trim().toLowerCase() !== "unsorted";
  });
  return [
    activePack?.name,
    ...cleanedTemplateParts,
    ...chainNames,
  ].filter((p) => p && String(p).trim().length > 0);
}

test("Kurt's Wildlife > Birds bug: 'unsorted' is stripped when pack + subfolder are set", () => {
  const parts = composeDestFolderParts(
    { name: "Wildlife" },
    ["unsorted"],               // template emitted the fallback because folders row was empty
    [{ name: "Birds" }],
  );
  assert.deepEqual(parts, ["Wildlife", "Birds"]);
});

test("pack + folder chip + subfolder: template parts pass through", () => {
  const parts = composeDestFolderParts(
    { name: "Wildlife" },
    ["Mammals"],
    [{ name: "Bears" }],
  );
  assert.deepEqual(parts, ["Wildlife", "Mammals", "Bears"]);
});

test("no pack, no subfolder: 'unsorted' orphan bin is preserved", () => {
  const parts = composeDestFolderParts(
    null,
    ["unsorted"],
    [],
  );
  assert.deepEqual(parts, ["unsorted"]);
});

test("subfolder only (no pack): sub-folder provides context, 'unsorted' stripped", () => {
  const parts = composeDestFolderParts(
    null,
    ["unsorted"],
    [{ name: "Birds" }],
  );
  assert.deepEqual(parts, ["Birds"]);
});

test("pack only (no subfolder, no template parts): 'unsorted' stripped", () => {
  const parts = composeDestFolderParts(
    { name: "Wildlife" },
    ["unsorted"],
    [],
  );
  assert.deepEqual(parts, ["Wildlife"]);
});

test("case-insensitive: 'Unsorted' or 'UNSORTED' also stripped", () => {
  assert.deepEqual(
    composeDestFolderParts({ name: "Wildlife" }, ["Unsorted"], [{ name: "Birds" }]),
    ["Wildlife", "Birds"],
  );
  assert.deepEqual(
    composeDestFolderParts({ name: "Wildlife" }, ["UNSORTED"], [{ name: "Birds" }]),
    ["Wildlife", "Birds"],
  );
});

test("deep sub-folder chain composes cleanly with pack and clean template parts", () => {
  const parts = composeDestFolderParts(
    { name: "Sports" },
    ["Baseball"],
    [{ name: "AL" }, { name: "Yankees" }],
  );
  assert.deepEqual(parts, ["Sports", "Baseball", "AL", "Yankees"]);
});

test("empty / whitespace subfolder names dropped", () => {
  const parts = composeDestFolderParts(
    { name: "Wildlife" },
    ["unsorted"],
    [{ name: "  " }, { name: "Birds" }],
  );
  assert.deepEqual(parts, ["Wildlife", "Birds"]);
});

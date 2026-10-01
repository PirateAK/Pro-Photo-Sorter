// v1.8.0 — cross-app version nudge + sharedIpc library/apps round-trip (electron stubbed).
// Run: node --test frontend/tests/crossApp.test.mjs
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { compareVersions } = await import("../src/lib/version.js");

test("compareVersions", () => {
  assert.equal(compareVersions("1.8.0", "1.7.2"), 1);
  assert.equal(compareVersions("1.7.0", "1.8.0"), -1);
  assert.equal(compareVersions("1.8", "1.8.0"), 0);
  assert.equal(compareVersions(undefined, "0"), 0);
});

// Stub `electron` so sharedIpc.js can be exercised in plain node.
const docs = fs.mkdtempSync(path.join(os.tmpdir(), "pps-docs-"));
const handlers = {};
const require = createRequire(import.meta.url);
const Module = require("node:module");
const origLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === "electron") return {
    app: { getPath: () => docs, getVersion: () => "1.8.0", isPackaged: false },
    ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
  };
  return origLoad.call(this, request, ...rest);
};
const { registerShared } = require("../../electron-shell/sharedIpc.js");
registerShared("pps");

test("apps:info writes own file; other missing → null; launch refuses when not installed", async () => {
  assert.ok(fs.existsSync(path.join(docs, "Pro Photo Sorter", "apps", "pps.json")));
  const info = await handlers["apps:info"]();
  assert.deepEqual(info.self, { id: "pps", version: "1.8.0" });
  assert.equal(info.other, null);
  fs.writeFileSync(path.join(docs, "Pro Photo Sorter", "apps", "tpc.json"), JSON.stringify({ id: "tpc", version: "1.7.0", exePath: "C:/nope/tpc.exe" }));
  const info2 = await handlers["apps:info"]();
  assert.equal(info2.other.version, "1.7.0");
  assert.equal(info2.other.installed, false);
  assert.equal(compareVersions(info2.other.version, info2.self.version), -1); // → "update" nudge
  assert.deepEqual(await handlers["apps:launch"](), { ok: false, error: "not-installed" });
});

test("library:write mirrors packs, prunes removed ones; library:list reads them back", async () => {
  const w = await handlers["library:write"](null, [{ name: "Wildlife", json: '{"a":1}' }, { name: "Bad/Name: x", json: "{}" }]);
  assert.equal(w.ok, true); assert.equal(w.count, 2);
  let list = await handlers["library:list"]();
  assert.deepEqual(list.map((x) => x.name).sort(), ["Bad_Name_ x", "Wildlife"]);
  assert.equal(list.find((x) => x.name === "Wildlife").json, '{"a":1}');
  await handlers["library:write"](null, [{ name: "Wildlife", json: '{"a":2}' }]);
  list = await handlers["library:list"]();
  assert.deepEqual(list.map((x) => x.name), ["Wildlife"]);
  assert.equal(list[0].json, '{"a":2}');
  fs.rmSync(docs, { recursive: true, force: true });
});

// Unit test of template renderer tokens (iteration 10)
import fs from "fs";

// inline sanitizeName copy substitute: load fsapi's sanitizeName by regex-free import shim
const tplSrc = fs.readFileSync("/app/frontend/src/lib/template.js", "utf8");
const fsapiSrc = fs.readFileSync("/app/frontend/src/lib/fsapi.js", "utf8");

const sanMatch = fsapiSrc.match(/export function sanitizeName[\s\S]*?\n}/)[0];
const shim = sanMatch.replace("export function", "function");
const code = tplSrc.replace(/import \{ sanitizeName \} from "\.\/fsapi";/, shim);
fs.writeFileSync("/tmp/template_inlined.mjs", code);
const { renderTemplate, TEMPLATE_PRESETS } = await import("/tmp/template_inlined.mjs");

let pass = 0, fail = 0;
function eq(name, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { pass++; console.log(`PASS ${name}`); }
  else { fail++; console.log(`FAIL ${name}\n  expected ${e}\n  actual   ${a}`); }
}

const F = (...l) => l.map((label) => ({ label }));

// New tokens
eq("{folders} nested + {tags} joined",
  renderTemplate("{folders}/{tags}{ext}", {
    folders: F("2024", "weddings", "smith-family"),
    tags: F("ceremony", "outdoor"),
    originalName: "IMG_1.JPG",
  }),
  { folderParts: ["2024", "weddings", "smith-family"], fileName: "ceremony_outdoor.jpg", pathPreview: "2024/weddings/smith-family/ceremony_outdoor.jpg" });

eq("{folder1}{folder2}{tag1}{tag2}",
  renderTemplate("{folder1}/{folder2}/{tag1}-{tag2}{ext}", {
    folders: F("a", "b"), tags: F("x", "y"), originalName: "p.jpg",
  }).pathPreview, "a/b/x-y.jpg");

// Legacy tokens
eq("legacy {folder}/{labels}",
  renderTemplate("{folder}/{labels}{ext}", { folders: F("a", "b"), tags: F("x", "y"), originalName: "p.jpg" }).pathPreview,
  "a/x_y.jpg");

eq("legacy {label1}/{label2} == tag1/tag2",
  renderTemplate("{label1}_{label2}{ext}", { folders: F("a"), tags: F("x", "y"), originalName: "p.jpg" }).fileName,
  "x_y.jpg");

// Legacy { icons } shape (SettingsModal)
eq("legacy icons shape",
  renderTemplate("{folders}/{tags}{ext}", { icons: F("beach", "sunset", "wide"), originalName: "photo.jpg" }).pathPreview,
  "beach/sunset_wide.jpg");

// Empty rows
eq("no folders -> unsorted", renderTemplate("{folders}/{tags}{ext}", { folders: [], tags: F("x"), originalName: "p.jpg" }).pathPreview, "unsorted/x.jpg");
eq("no tags -> original stem", renderTemplate("{folders}/{tags}{ext}", { folders: F("a"), tags: [], originalName: "myphoto.JPG" }).pathPreview, "a/myphoto.jpg");
eq("empty ctx no crash", typeof renderTemplate(undefined, { originalName: "p.jpg" }).pathPreview, "string");

// stars/date/original
const r = renderTemplate("{stars}stars/{folders}/{tags}{ext}", { folders: F("a"), tags: F("x"), originalName: "p.jpg", stars: 4 });
eq("stars preset", r.pathPreview, "4stars/a/x.jpg");
const d = renderTemplate("{folders}/{date}_{tags}{ext}", { folders: F("a"), tags: F("x"), originalName: "p.jpg", exifDate: new Date("2024-05-06T10:00:00Z") });
eq("date preset", d.pathPreview, "a/2024-05-06_x.jpg");

// presets use new tokens
eq("presets default", TEMPLATE_PRESETS[0].value, "{folders}/{tags}{ext}");
eq("presets all use new tokens", TEMPLATE_PRESETS.every(p => /\{folders\}|\{tags\}/.test(p.value)), true);

// sanitization of unsafe labels
eq("sanitize labels", renderTemplate("{folders}/{tags}{ext}", { folders: F("a/b:c"), tags: F("x*y"), originalName: "p.jpg" }).pathPreview.includes(":"), false);

console.log(`\nRESULT pass=${pass} fail=${fail}`);
if (fail) process.exitCode = 1;

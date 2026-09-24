// scripts/build-docs-pdf.js
//
// Converts the customer-facing markdown docs into polished PDFs so
// they can ride along on retail thumb drives (or be attached to
// support emails). Uses puppeteer-core with the system Chrome so
// we don't drag in a 200 MB bundled Chromium — anyone building
// PDFs locally needs Google Chrome or Chromium installed.
//
// Run with: node scripts/build-docs-pdf.js
// Outputs:  dist-docs/*.pdf

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");
const { marked } = require("marked");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist-docs");
fs.mkdirSync(OUT, { recursive: true });

const DOCS = [
  { md: "QUICK_START.md", pdf: "Quick Start.pdf", title: "Pro Photo Sorter — Quick Start" },
  { md: "USER_GUIDE.md",  pdf: "User Guide.pdf",  title: "Pro Photo Sorter — User Guide"  },
];

// Locate the system Chrome — walk a small list of common paths.
function findChrome() {
  const CANDIDATES = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/root/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  for (const p of CANDIDATES) {
    try { if (fs.existsSync(p)) return p; } catch {}
  }
  throw new Error(
    "Chrome/Chromium not found. Install Google Chrome, or set CHROME_PATH env var to the executable."
  );
}

// Tight, print-friendly stylesheet inspired by the app's earth palette.
const CSS = `
@page { size: Letter; margin: 0.6in 0.7in 0.75in 0.7in; }
* { box-sizing: border-box; }
html, body {
  font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  color: #2a2321;
  font-size: 10.5pt;
  line-height: 1.5;
  margin: 0;
}
h1 {
  font-size: 22pt;
  color: #a8542a;
  margin: 0 0 6pt 0;
  border-bottom: 2px solid #a8542a;
  padding-bottom: 6pt;
  page-break-after: avoid;
}
h2 {
  font-size: 15pt;
  color: #6a3010;
  margin: 18pt 0 6pt 0;
  page-break-after: avoid;
}
h3 {
  font-size: 12.5pt;
  color: #5a2810;
  margin: 12pt 0 4pt 0;
  page-break-after: avoid;
}
h4 {
  font-size: 11pt;
  color: #5a2810;
  margin: 10pt 0 3pt 0;
  page-break-after: avoid;
}
p, li { margin: 2pt 0 6pt 0; }
strong { color: #6a3010; }
code, kbd {
  font-family: "Consolas", "Menlo", monospace;
  background: #f4ecdd;
  border: 1px solid #e5d8bc;
  border-radius: 3px;
  padding: 1pt 4pt;
  font-size: 9.5pt;
}
pre {
  background: #f4ecdd;
  border: 1px solid #e5d8bc;
  border-left: 3px solid #a8542a;
  border-radius: 4px;
  padding: 8pt 10pt;
  font-size: 9pt;
  overflow-x: auto;
  page-break-inside: avoid;
}
pre code { background: transparent; border: 0; padding: 0; }
blockquote {
  margin: 8pt 0;
  padding: 6pt 12pt;
  border-left: 3px solid #a8542a;
  background: #faf5eb;
  color: #4a3020;
}
table { border-collapse: collapse; margin: 8pt 0; width: 100%; page-break-inside: avoid; }
th, td { border: 1px solid #d8c9a8; padding: 4pt 8pt; text-align: left; font-size: 10pt; }
th { background: #f4ecdd; color: #6a3010; }
ul, ol { padding-left: 20pt; }
hr { border: 0; border-top: 1px solid #d8c9a8; margin: 14pt 0; }
a { color: #6a3010; text-decoration: none; border-bottom: 1px dotted #a8542a; }
img { max-width: 100%; }
.footer {
  position: fixed; bottom: -0.45in; left: 0.7in; right: 0.7in;
  border-top: 1px solid #d8c9a8;
  padding-top: 4pt;
  font-size: 8pt;
  color: #8a7a68;
  display: flex; justify-content: space-between;
}
`;

function wrapHtml(title, bodyHtml) {
  return `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>${title}</title>
<style>${CSS}</style>
</head><body>
${bodyHtml}
<div class="footer">
  <span>Pro Photo Sorter</span>
  <span>© Captain Kurt — All rights reserved</span>
</div>
</body></html>`;
}

(async () => {
  const chromePath = findChrome();
  console.log(`Using Chrome: ${chromePath}\n`);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    for (const doc of DOCS) {
      const mdPath = path.join(ROOT, doc.md);
      if (!fs.existsSync(mdPath)) {
        console.warn(`⚠  Skipping ${doc.md} — file not found.`);
        continue;
      }
      const md = fs.readFileSync(mdPath, "utf8");
      const html = marked.parse(md);
      const full = wrapHtml(doc.title, html);
      const page = await browser.newPage();
      await page.setContent(full, { waitUntil: "domcontentloaded" });
      const outPath = path.join(OUT, doc.pdf);
      await page.pdf({
        path: outPath,
        format: "Letter",
        printBackground: true,
        margin: { top: "0.6in", bottom: "0.75in", left: "0.7in", right: "0.7in" },
        displayHeaderFooter: false,
      });
      await page.close();
      const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(0);
      console.log(`✓ ${doc.pdf}  (${sizeKb} KB)`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\nOutput: ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });

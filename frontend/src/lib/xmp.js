// XMP sidecar writer (v1.4.6)
// -----------------------------------------------------------------------------
// Writes an Adobe-standard XMP sidecar file next to a stored JPEG so that
// Lightroom / Bridge / Capture One will pick up Pro Photo Sorter's star
// rating and keyword tags automatically on next catalog import. This is
// write-only — we do not read existing .xmp files back on load (that's
// on the roadmap as a separate two-way sync feature).
//
// The XMP payload follows the RDF/XML format specified in
// https://www.adobe.com/devnet/xmp.html:
//   • <xmp:Rating>N</xmp:Rating>            — integer 0..5
//   • <dc:subject><rdf:Bag>…</rdf:Bag></dc:subject> — keywords list
//   • <xmp:CreatorTool>Pro Photo Sorter …</xmp:CreatorTool>
//
// Sidecar naming convention (Adobe-compatible):
//   • PhotoName.jpg  →  PhotoName.jpg.xmp   (works everywhere)
// Some tools prefer the "stem.xmp" flavor (PhotoName.xmp) — we intentionally
// use the "full basename + .xmp" flavor because Lightroom Classic + Bridge
// both accept it and it's unambiguous when the same stem exists with
// different extensions (e.g. RAW + JPEG).

const XML_ESCAPE = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&apos;",
};

const xmlEscape = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => XML_ESCAPE[c]);

// Build the RDF/XML payload for a set of keywords + a star rating.
// keywords: array of strings (deduped + trimmed inside).
// stars: integer 0..5. When 0 the rating element is omitted so the field
// stays "unset" in Lightroom (rather than showing 0 stars).
// version: build version string, embedded into xmp:CreatorTool.
export function buildXmpPacket({ keywords = [], stars = 0, version = "" } = {}) {
  const clean = Array.from(
    new Set(
      keywords
        .map((k) => (typeof k === "string" ? k : k?.label))
        .filter((k) => typeof k === "string" && k.trim().length > 0)
        .map((k) => k.trim())
    )
  );

  const subjectBlock = clean.length
    ? `      <dc:subject>
        <rdf:Bag>
${clean.map((k) => `          <rdf:li>${xmlEscape(k)}</rdf:li>`).join("\n")}
        </rdf:Bag>
      </dc:subject>
`
    : "";

  const ratingBlock = stars > 0 ? `      <xmp:Rating>${Math.min(5, Math.max(0, Math.round(stars)))}</xmp:Rating>\n` : "";
  const creatorLine = version
    ? `      <xmp:CreatorTool>Pro Photo Sorter ${xmlEscape(version)}</xmp:CreatorTool>\n`
    : `      <xmp:CreatorTool>Pro Photo Sorter</xmp:CreatorTool>\n`;

  return `<?xpacket begin="\ufeff" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/" x:xmptk="Pro Photo Sorter">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about=""
        xmlns:xmp="http://ns.adobe.com/xap/1.0/"
        xmlns:dc="http://purl.org/dc/elements/1.1/">
${creatorLine}${ratingBlock}${subjectBlock}    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
}

// Write the XMP sidecar to disk next to the given filename.
// dirHandle: FileSystemDirectoryHandle
// jpegName:  the filename of the just-written photo (e.g. "IMG_0001.jpg")
// Returns the sidecar filename ("IMG_0001.jpg.xmp") on success or null on
// failure (soft-fail: we don't want a sidecar hiccup to blow up a store).
export async function writeXmpSidecar({ dirHandle, jpegName, keywords, stars, version }) {
  if (!dirHandle || !jpegName) return null;
  try {
    const xmp = buildXmpPacket({ keywords, stars, version });
    const sidecarName = `${jpegName}.xmp`;
    const handle = await dirHandle.getFileHandle(sidecarName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(new Blob([xmp], { type: "application/rdf+xml" }));
    await writable.close();
    return sidecarName;
  } catch (e) {
    // Sidecar failures are non-fatal — Kurt's photo already stored fine.
    // eslint-disable-next-line no-console
    console.warn("XMP sidecar write failed for", jpegName, e);
    return null;
  }
}

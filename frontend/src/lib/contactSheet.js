// Contact sheet PDF generator (uses jsPDF).
// Given an array of image file handles + metadata, produce a printable PDF.
import { jsPDF } from "jspdf";

const PAGE_SIZES = {
  Letter: { w: 8.5, h: 11 },
  A4: { w: 8.27, h: 11.69 },
};

/**
 * Build the contact sheet PDF and return a Blob.
 * options: { pageSize: 'Letter'|'A4', columns, title, entries: [{file, name, stars}] }
 */
export async function buildContactSheet(options, onProgress) {
  const {
    pageSize = "Letter",
    columns = 4,
    title = "Contact Sheet",
    entries = [],
  } = options;

  const dim = PAGE_SIZES[pageSize] || PAGE_SIZES.Letter;
  const inchToPt = 72;
  const pageW = dim.w * inchToPt;
  const pageH = dim.h * inchToPt;
  const marginX = 36;
  const marginY = 48;
  const titleH = 24;
  const gap = 8;
  const cols = Math.max(2, Math.min(6, columns));

  const cellW = (pageW - 2 * marginX - gap * (cols - 1)) / cols;
  // Portrait-ish cell: 3:2 with room for caption
  const captionH = 26;
  const imgH = cellW * 0.7;
  const cellH = imgH + captionH;
  const rows = Math.max(1, Math.floor((pageH - 2 * marginY - titleH) / (cellH + gap)));
  const perPage = cols * rows;

  const pdf = new jsPDF({ unit: "pt", format: [pageW, pageH] });
  const totalPages = Math.max(1, Math.ceil(entries.length / perPage));

  const drawHeader = (pageIdx) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(30, 25, 22);
    pdf.text(title, marginX, marginY);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(120, 110, 100);
    const stamp = new Date().toLocaleString();
    pdf.text(`${stamp}  ·  Page ${pageIdx + 1} / ${totalPages}`, pageW - marginX, marginY, { align: "right" });
  };

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) pdf.addPage([pageW, pageH]);
    drawHeader(p);

    const start = p * perPage;
    const pageEntries = entries.slice(start, start + perPage);
    for (let i = 0; i < pageEntries.length; i++) {
      const e = pageEntries[i];
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = marginX + col * (cellW + gap);
      const y = marginY + titleH + row * (cellH + gap);

      // Render the thumbnail on a canvas
      let dataUrl = null;
      try {
        const file = await e.loadFile();
        const url = URL.createObjectURL(file);
        const img = await new Promise((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = rej;
          im.src = url;
        });
        URL.revokeObjectURL(url);
        const cv = document.createElement("canvas");
        const ratio = Math.min((cellW * 2) / img.width, (imgH * 2) / img.height);
        cv.width = Math.max(1, Math.round(img.width * ratio));
        cv.height = Math.max(1, Math.round(img.height * ratio));
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        dataUrl = cv.toDataURL("image/jpeg", 0.82);
      } catch (err) {
        // draw placeholder box
      }

      // Cell background
      pdf.setDrawColor(220, 210, 200);
      pdf.setFillColor(250, 246, 240);
      pdf.roundedRect(x, y, cellW, cellH, 4, 4, "FD");

      if (dataUrl) {
        // Center image within imgH
        try {
          const iw = cellW - 8;
          const ih = imgH - 8;
          pdf.addImage(dataUrl, "JPEG", x + 4, y + 4, iw, ih, undefined, "FAST");
        } catch (err) { /* ignore */ }
      } else {
        pdf.setTextColor(160, 150, 140);
        pdf.setFontSize(9);
        pdf.text("(no preview)", x + cellW / 2, y + imgH / 2, { align: "center" });
      }

      // Caption
      const cy = y + imgH + 4;
      pdf.setTextColor(30, 25, 22);
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      const nameText = pdf.splitTextToSize(e.name, cellW - 8)[0];
      pdf.text(nameText, x + 4, cy + 8);

      // Stars
      pdf.setFont("helvetica", "normal");
      const stars = e.stars || 0;
      const starStr = "★".repeat(stars) + "☆".repeat(5 - stars);
      pdf.setTextColor(198, 138, 83);
      pdf.setFontSize(10);
      pdf.text(starStr, x + 4, cy + 20);

      if (onProgress) onProgress(start + i + 1, entries.length);
    }
  }

  return pdf.output("blob");
}

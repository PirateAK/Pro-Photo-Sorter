import React, { useState, useEffect } from "react";
import { X, FileText, Download } from "lucide-react";
import { buildContactSheet } from "../lib/contactSheet";
import { toast } from "sonner";

export default function ContactSheetModal({ open, onClose, images, ratings, sourcePath, destDirHandle, sourceDirHandle, isBatchSelection, totalFilmstripCount }) {
  const [columns, setColumns] = useState(4);
  const [pageSize, setPageSize] = useState("Letter");
  const [title, setTitle] = useState("Contact Sheet");
  const [saveTarget, setSaveTarget] = useState("download"); // download | source | destination
  // v1.3.1 — optional "preview after generate" — builds the PDF, opens
  // it in a Chromium viewer window, and switches the modal into a
  // Save/Do-Over review state so Kurt can eyeball before committing.
  // When off: original behavior (build → save → close).
  const [previewAfter, setPreviewAfter] = useState(true);
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  // v1.3.1 — review state after a preview build. Holds the blob, its
  // preview URL, and the intended filename so Save/Do-Over can act on
  // it without re-rendering.
  const [preview, setPreview] = useState(null); // { blob, url, filename } | null

  // Whether the images list came from batch selection (for the UI badge).
  // The parent passes filtered images, so we only need a name-length
  // heuristic — but a clearer approach is: parent tells us via a prop.
  // Simplest: infer at open time from a data attribute (not exposed).
  // Keeping the count-driven message for now; App.js already filters upstream.

  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape" && !building) { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose, building]);

  if (!open) return null;

  const generate = async () => {
    setBuilding(true);
    setProgress({ done: 0, total: images.length });
    try {
      const entries = images.map((img) => ({
        loadFile: () => img.handle.getFile(),
        name: img.name,
        stars: ratings?.[`${sourcePath}/${img.name}`] || 0,
      }));
      const blob = await buildContactSheet(
        { pageSize, columns, title, entries },
        (done, total) => setProgress({ done, total })
      );
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filename = `contact-sheet_${stamp}.pdf`;

      // v1.3.1 — Preview path: hold the blob, open a preview window,
      // and let Kurt hit Save or Do-Over before we commit anywhere.
      if (previewAfter) {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setPreview({ blob, url, filename });
        setBuilding(false);
        return; // Do NOT close the modal — waiting on Save/Do-Over.
      }

      // Direct save path (unchanged legacy behavior).
      await commitSave(blob, filename);
      onClose();
    } catch (e) {
      toast.error("Failed to build contact sheet", { description: e.message });
    } finally {
      setBuilding(false);
    }
  };

  // v1.3.1 — shared blob-save logic used by both the "no preview" direct
  // path AND the "Save" button that appears after a preview build.
  const commitSave = async (blob, filename) => {
    if (saveTarget === "download") {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      toast.success("Contact sheet downloaded", { description: filename });
    } else {
      const dir = saveTarget === "destination" ? destDirHandle : sourceDirHandle;
      if (!dir) {
        toast.error("Chosen folder is not available");
        throw new Error("no-dir");
      }
      const h = await dir.getFileHandle(filename, { create: true });
      const w = await h.createWritable();
      await w.write(blob);
      await w.close();
      toast.success("Contact sheet saved", { description: filename });
    }
  };

  const savePreviewedSheet = async () => {
    if (!preview) return;
    try {
      await commitSave(preview.blob, preview.filename);
      // Revoke shortly so any still-open preview window can keep displaying.
      setTimeout(() => URL.revokeObjectURL(preview.url), 5 * 60 * 1000);
      setPreview(null);
      onClose();
    } catch { /* toast already fired */ }
  };

  const doOverPreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
    // Modal stays open on the settings screen so Kurt can tweak & regen.
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" data-testid="contact-sheet-modal">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={building ? undefined : onClose} />
      <div className="relative pane rounded-lg w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-app">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary-earth" />
            <h2 className="font-heading font-semibold text-lg">Export Contact Sheet</h2>
          </div>
          <button
            onClick={onClose}
            disabled={building}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover disabled:opacity-40"
            data-testid="contact-close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* v1.3.1 — Heads-up banner. Makes it obvious whether the
              sheet will contain every filmstrip photo or only the ones
              Kurt has batch-checked, and nudges the workflow if he
              wants a subset. */}
          <div
            className={`rounded p-3 text-xs leading-snug border ${
              isBatchSelection
                ? "bg-primary-earth/10 border-primary-earth/50 text-primary-earth"
                : "bg-app border-app text-app"
            }`}
            data-testid="contact-scope-banner"
          >
            {isBatchSelection ? (
              <>
                <span className="font-medium">🎯 Batch selection active</span> —{" "}
                <strong>{images.length}</strong> of{" "}
                <strong>{totalFilmstripCount ?? images.length}</strong>{" "}
                filmstrip photo{(totalFilmstripCount ?? images.length) === 1 ? "" : "s"} will land on this sheet
                (only the ones you've checked).
              </>
            ) : (
              <>
                <span className="font-medium">📁 Full filmstrip</span> — all{" "}
                <strong>{images.length}</strong> loaded photo{images.length === 1 ? "" : "s"} will be included.{" "}
                <span className="text-dim">
                  Want only some? Close this, hit <strong className="text-app">Batch</strong> in the toolbar, tick the images you want, then re-open Sheet.
                </span>
              </>
            )}
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-app border border-app rounded px-2 py-1.5 text-sm focus-ring"
              data-testid="contact-title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1 block">Page</label>
              <div className="flex gap-1">
                {["Letter", "A4"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setPageSize(s)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs border ${
                      pageSize === s ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent" : "bg-app border-app hover:bg-surface-hover"
                    }`}
                    data-testid={`contact-page-${s}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1 block">Columns</label>
              <div className="flex gap-1">
                {[3, 4, 5, 6].map((c) => (
                  <button
                    key={c}
                    onClick={() => setColumns(c)}
                    className={`flex-1 px-2 py-1.5 rounded text-xs font-mono border ${
                      columns === c ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent" : "bg-app border-app hover:bg-surface-hover"
                    }`}
                    data-testid={`contact-cols-${c}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1 block">Save to</label>
            <div className="flex gap-1">
              <button
                onClick={() => setSaveTarget("download")}
                className={`flex-1 px-2 py-1.5 rounded text-xs border ${
                  saveTarget === "download" ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent" : "bg-app border-app hover:bg-surface-hover"
                }`}
                data-testid="contact-target-download"
              >
                Download
              </button>
              <button
                onClick={() => setSaveTarget("source")}
                disabled={!sourceDirHandle}
                className={`flex-1 px-2 py-1.5 rounded text-xs border ${
                  saveTarget === "source" ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent" : "bg-app border-app hover:bg-surface-hover"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                data-testid="contact-target-source"
              >
                Source folder
              </button>
              <button
                onClick={() => setSaveTarget("destination")}
                disabled={!destDirHandle}
                className={`flex-1 px-2 py-1.5 rounded text-xs border ${
                  saveTarget === "destination" ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent" : "bg-app border-app hover:bg-surface-hover"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
                data-testid="contact-target-destination"
              >
                Destination
              </button>
            </div>
          </div>

          <div className="pane rounded p-3 bg-app text-xs text-dim">
            <div className="mb-1">
              <span className="text-app font-medium">{images.length}</span> photo{images.length !== 1 ? "s" : ""}
              {isBatchSelection ? (
                <span className="ml-1 px-1.5 py-0.5 rounded bg-primary-earth/20 text-primary-earth text-[10px] font-medium">batch-selected</span>
              ) : (
                <span className="ml-1 text-[11px] italic">from filmstrip</span>
              )}
              {" · "}{pageSize} · {columns} col
            </div>
            <div>
              Estimated ~{Math.max(1, Math.ceil(images.length / (columns * 3)))} page{Math.ceil(images.length / (columns * 3)) !== 1 ? "s" : ""}
            </div>
          </div>

          {/* v1.3.1 — Preview toggle */}
          <label className="flex items-start gap-2 select-none cursor-pointer" data-testid="contact-preview-label">
            <input
              type="checkbox"
              checked={previewAfter}
              onChange={(e) => setPreviewAfter(e.target.checked)}
              disabled={building}
              className="mt-0.5 accent-[color:var(--primary-earth)] w-4 h-4"
              data-testid="contact-preview-checkbox"
            />
            <span className="text-xs leading-snug">
              <span className="text-app font-medium">Preview before saving</span>
              <span className="text-dim"> — opens the PDF in a viewer window; you then hit <strong>Save</strong> or <strong>Do over</strong>. When off, generate saves and closes in one step.</span>
            </span>
          </label>

          {building && (
            <div>
              <div className="text-xs text-dim mb-1">
                Rendering… {progress.done} / {progress.total}
              </div>
              <div className="w-full h-1.5 bg-app rounded overflow-hidden">
                <div className="h-full bg-primary-earth transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-app flex items-center justify-end gap-2">
          {preview ? (
            <>
              <div className="mr-auto text-xs text-primary-earth flex items-center gap-1.5" data-testid="contact-preview-hint">
                <FileText size={12} /> Preview open — save it or start over?
              </div>
              <button
                onClick={doOverPreview}
                className="px-3 py-1.5 rounded bg-app border border-app hover:bg-surface-hover text-sm"
                data-testid="contact-do-over"
                title="Discard this preview and go back to the settings to regenerate"
              >
                Do over
              </button>
              <button
                onClick={savePreviewedSheet}
                className="px-4 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] font-medium text-sm flex items-center gap-1"
                data-testid="contact-save-previewed"
              >
                <Download size={12} /> Save
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                disabled={building}
                className="px-3 py-1.5 rounded bg-app border border-app hover:bg-surface-hover text-sm disabled:opacity-40"
                data-testid="contact-cancel"
              >
                Cancel
              </button>
              <button
                onClick={generate}
                disabled={building || images.length === 0}
                className="px-4 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] font-medium text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="contact-generate"
              >
                <Download size={12} /> {building ? "Building…" : (previewAfter ? "Generate preview" : "Generate")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

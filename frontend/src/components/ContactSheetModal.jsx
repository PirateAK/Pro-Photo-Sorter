import React, { useState, useEffect } from "react";
import { X, FileText, Download } from "lucide-react";
import { buildContactSheet } from "../lib/contactSheet";
import { toast } from "sonner";

export default function ContactSheetModal({ open, onClose, images, ratings, sourcePath, destDirHandle, sourceDirHandle }) {
  const [columns, setColumns] = useState(4);
  const [pageSize, setPageSize] = useState("Letter");
  const [title, setTitle] = useState("Contact Sheet");
  const [saveTarget, setSaveTarget] = useState("download"); // download | source | destination
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

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
          setBuilding(false);
          return;
        }
        const h = await dir.getFileHandle(filename, { create: true });
        const w = await h.createWritable();
        await w.write(blob);
        await w.close();
        toast.success("Contact sheet saved", { description: filename });
      }
      onClose();
    } catch (e) {
      toast.error("Failed to build contact sheet", { description: e.message });
    } finally {
      setBuilding(false);
    }
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
              <span className="text-app font-medium">{images.length}</span> photo{images.length !== 1 ? "s" : ""} · {pageSize} · {columns} col
            </div>
            <div>
              Estimated ~{Math.max(1, Math.ceil(images.length / (columns * 3)))} page{Math.ceil(images.length / (columns * 3)) !== 1 ? "s" : ""}
            </div>
          </div>

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
            <Download size={12} /> {building ? "Building…" : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}

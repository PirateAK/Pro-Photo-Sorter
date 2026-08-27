import React, { useState, useMemo, useEffect } from "react";
import { X, FileEdit, Info, Play } from "lucide-react";
import { renderRenameTemplate, RENAME_PRESETS, RENAME_TOKENS } from "../lib/rename";
import { toast } from "sonner";
import exifr from "exifr";

/**
 * BatchRenameModal - rename filmstrip (or batch-selected) files in place using a template.
 * Requires writable directory handle (source folder).
 */
export default function BatchRenameModal({ open, onClose, images, sourceFolder, ratings, sourcePath, onRatingsRemap, onDone }) {
  const [template, setTemplate] = useState("shoot_{nnn}{ext}");
  const [scope, setScope] = useState("all"); // 'all' or 'selected' (currently only 'all' from filmstrip)
  const [previews, setPreviews] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!open) return;
    // Compute previews — sample-only date parsing for perf, but full run will re-parse.
    (async () => {
      const total = images.length;
      const rows = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const stars = ratings?.[`${sourcePath}/${img.name}`] || 0;
        let exifDate = null;
        // Parse EXIF only for first 8 in the preview (perf); the actual run below parses ALL.
        if (i < 8 && /\{date\}/.test(template)) {
          try {
            const f = await img.handle.getFile();
            const d = await exifr.parse(f, { pick: ["DateTimeOriginal", "CreateDate"] });
            exifDate = d?.DateTimeOriginal || d?.CreateDate || null;
          } catch {}
        }
        const newName = renderRenameTemplate(template, {
          index: i + 1,
          total,
          originalName: img.name,
          exifDate,
          stars,
        });
        rows.push({ original: img.name, newName, exifDate });
      }
      setPreviews(rows);
    })();
  }, [open, template, images, ratings, sourcePath]);

  const dupCount = useMemo(() => {
    const seen = new Set();
    let d = 0;
    for (const p of previews) {
      if (seen.has(p.newName)) d++;
      else seen.add(p.newName);
    }
    return d;
  }, [previews]);

  const runRename = async () => {
    if (!sourceFolder) {
      toast.error("Source folder not writable");
      return;
    }
    setRunning(true);
    setProgress(0);
    let renamed = 0, failed = 0;
    const total = images.length;
    const useDateToken = /\{date\}/.test(template);
    const ratingRemap = {}; // { oldKey: newKey }

    // Crash-safe strategy per file:
    //   1) Compute final target name (re-parse EXIF if template uses {date})
    //   2) If target == original, skip
    //   3) Write new file with target name (create:true)
    //   4) Delete original ONLY after successful write
    //   5) Record rating key remap
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      try {
        // Freshly compute name (esp. for {date}) — do NOT rely on preview for photos >= 8
        let exifDate = null;
        if (useDateToken) {
          try {
            const f = await img.handle.getFile();
            const d = await exifr.parse(f, { pick: ["DateTimeOriginal", "CreateDate"] });
            exifDate = d?.DateTimeOriginal || d?.CreateDate || null;
          } catch {}
        }
        const stars = ratings?.[`${sourcePath}/${img.name}`] || 0;
        const finalName = renderRenameTemplate(template, {
          index: i + 1,
          total,
          originalName: img.name,
          exifDate,
          stars,
        });

        if (finalName === img.name) {
          setProgress(i + 1);
          continue;
        }

        // Write final name (create only if doesn't exist)
        let target = finalName;
        try {
          await sourceFolder.getFileHandle(target);
          // Already exists — bail with a numeric suffix to avoid overwrite
          const dot = target.lastIndexOf(".");
          const stem = dot > 0 ? target.slice(0, dot) : target;
          const ext = dot > 0 ? target.slice(dot) : "";
          let n = 1;
          while (true) {
            const candidate = `${stem}_${n}${ext}`;
            try {
              await sourceFolder.getFileHandle(candidate);
              n++;
            } catch {
              target = candidate;
              break;
            }
            if (n > 999) break;
          }
        } catch { /* target doesn't exist — good */ }

        const srcFile = await img.handle.getFile();
        const newHandle = await sourceFolder.getFileHandle(target, { create: true });
        const writable = await newHandle.createWritable();
        await writable.write(srcFile);
        await writable.close();
        // Only now delete original
        await sourceFolder.removeEntry(img.name);

        ratingRemap[`${sourcePath}/${img.name}`] = `${sourcePath}/${target}`;
        renamed++;
      } catch (e) {
        failed++;
      }
      setProgress(i + 1);
    }

    // Remap ratings so star ratings survive the rename
    if (onRatingsRemap && Object.keys(ratingRemap).length > 0) {
      onRatingsRemap(ratingRemap);
    }

    setRunning(false);
    if (renamed > 0) toast.success(`Renamed ${renamed} file${renamed !== 1 ? "s" : ""}`);
    if (failed > 0) toast.error(`${failed} rename${failed !== 1 ? "s" : ""} failed`);
    onDone?.();
    onClose();
  };

  // Local Escape handler (works even when input is focused)
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape" && !running) { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose, running]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" data-testid="batch-rename-modal">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={running ? undefined : onClose} />
      <div className="relative pane rounded-lg w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-app">
          <div className="flex items-center gap-2">
            <FileEdit size={18} className="text-primary-earth" />
            <h2 className="font-heading font-semibold text-lg">Batch Rename</h2>
            <span className="text-xs text-dim">{images.length} file{images.length !== 1 ? "s" : ""}</span>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover disabled:opacity-40"
            data-testid="rename-close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-auto flex-1">
          <div>
            <div className="flex flex-wrap gap-1 mb-2">
              {RENAME_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setTemplate(p.value)}
                  className={`px-2 py-1 rounded text-[11px] border ${
                    template === p.value ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent" : "bg-app border-app hover:bg-surface-hover"
                  }`}
                  data-testid={`rename-preset-${p.name.replace(/\s+/g, "-").toLowerCase()}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            <input
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              className="w-full bg-app border border-app rounded px-3 py-2 text-sm font-mono focus-ring"
              placeholder="shoot_{nnn}{ext}"
              data-testid="rename-template-input"
            />
            <details className="mt-2 text-xs">
              <summary className="text-dim hover:text-app cursor-pointer flex items-center gap-1">
                <Info size={11} /> Available tokens
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-1.5 pane rounded p-3 bg-app">
                {RENAME_TOKENS.map((t) => (
                  <div key={t.token} className="flex items-baseline gap-2">
                    <button
                      onClick={() => setTemplate(template + t.token)}
                      className="font-mono text-primary-earth hover:underline text-[11px]"
                    >
                      {t.token}
                    </button>
                    <span className="text-dim text-[11px]">{t.desc}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-2">Preview</div>
            <div className="pane rounded p-2 bg-app max-h-64 overflow-auto">
              {previews.length === 0 ? (
                <div className="text-dim text-xs italic p-2">No files.</div>
              ) : (
                <table className="w-full text-[11px] font-mono">
                  <thead>
                    <tr className="text-dim">
                      <th className="text-left px-2 py-1">Original</th>
                      <th className="text-left px-2 py-1">→ New name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previews.slice(0, 30).map((p, i) => (
                      <tr key={i} className="border-t border-app">
                        <td className="px-2 py-1 text-dim truncate max-w-xs">{p.original}</td>
                        <td className="px-2 py-1 text-primary-earth truncate max-w-xs" data-testid={`rename-preview-${i}`}>{p.newName}</td>
                      </tr>
                    ))}
                    {previews.length > 30 && (
                      <tr>
                        <td colSpan={2} className="px-2 py-1 text-dim italic">
                          + {previews.length - 30} more…
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
            {dupCount > 0 && (
              <p className="text-[11px] text-[color:var(--danger)] mt-2">
                ⚠ {dupCount} name collision{dupCount !== 1 ? "s" : ""} detected. Refine the template.
              </p>
            )}
          </div>

          {running && (
            <div>
              <div className="text-xs text-dim mb-1">
                Renaming… {progress} / {images.length}
              </div>
              <div className="w-full h-1.5 bg-app rounded overflow-hidden">
                <div
                  className="h-full bg-primary-earth transition-all"
                  style={{ width: `${(progress / images.length) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-app flex items-center justify-between text-xs text-dim">
          <div>Files are renamed in place. Original names are lost.</div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={running}
              className="px-3 py-1.5 rounded bg-app border border-app hover:bg-surface-hover text-sm disabled:opacity-40"
              data-testid="rename-cancel"
            >
              Cancel
            </button>
            <button
              onClick={runRename}
              disabled={running || images.length === 0 || dupCount > 0}
              className="px-4 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] font-medium text-sm flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="rename-run"
            >
              <Play size={12} /> {running ? "Renaming…" : `Rename ${images.length}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

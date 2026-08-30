import React, { useState, useEffect } from "react";
import { Settings as Cog, X, Info, Trash2, MoveRight, Copy, Star, Layers } from "lucide-react";
import { TEMPLATE_TOKENS, TEMPLATE_PRESETS, renderTemplate } from "../lib/template";
import { clearThumbCache } from "../lib/thumbCache";
import { toast } from "sonner";

export default function SettingsModal({ open, onClose, settings, onChange }) {
  const [local, setLocal] = useState(settings);

  // Re-sync local state whenever the modal is (re)opened.
  useEffect(() => {
    if (open) setLocal(settings);
  }, [open, settings]);

  // Local Escape handler — bypasses App.js keyboard guard when typing in input
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const applyAndClose = () => {
    onChange(local);
    onClose();
  };

  const preview = renderTemplate(local.filenameTemplate, {
    folders: [{ label: "2024" }, { label: "weddings" }],
    tags: [{ label: "ceremony" }, { label: "outdoor" }],
    originalName: "IMG_2043.JPG",
    exifDate: new Date("2024-08-14T18:22:00"),
    stars: 4,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6" data-testid="settings-modal">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative pane rounded-lg w-full max-w-2xl max-h-[85vh] overflow-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-3 border-b border-app sticky top-0 bg-surface z-10">
          <div className="flex items-center gap-2">
            <Cog size={18} className="text-primary-earth" />
            <h2 className="font-heading font-semibold text-lg">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover"
            data-testid="settings-close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Move / Copy toggle */}
          <section>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading font-semibold text-sm mb-1">Store Mode</h3>
                <p className="text-xs text-dim">
                  Copy leaves the original file in place. Move deletes it after a successful write.
                </p>
              </div>
              <div className="flex rounded overflow-hidden border border-app shrink-0">
                <button
                  onClick={() => setLocal({ ...local, moveMode: false })}
                  className={`px-3 py-1.5 text-xs flex items-center gap-1 ${
                    !local.moveMode ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover"
                  }`}
                  data-testid="mode-copy"
                >
                  <Copy size={12} /> Copy
                </button>
                <button
                  onClick={() => setLocal({ ...local, moveMode: true })}
                  className={`px-3 py-1.5 text-xs flex items-center gap-1 ${
                    local.moveMode ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover"
                  }`}
                  data-testid="mode-move"
                >
                  <MoveRight size={12} /> Move
                </button>
              </div>
            </div>
          </section>

          {/* Filename template */}
          <section>
            <h3 className="font-heading font-semibold text-sm mb-2">Filename Template</h3>
            <p className="text-xs text-dim mb-3">
              Controls the destination path built from your Folders and Filename rows.
            </p>

            <div className="flex flex-wrap gap-1 mb-3">
              {TEMPLATE_PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setLocal({ ...local, filenameTemplate: p.value })}
                  className={`px-2 py-1 rounded text-[11px] border ${
                    local.filenameTemplate === p.value
                      ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent"
                      : "bg-app border-app hover:bg-surface-hover"
                  }`}
                  data-testid={`preset-${p.name.replace(/\s+/g, "-").toLowerCase()}`}
                  title={p.value}
                >
                  {p.name}
                </button>
              ))}
            </div>

            <input
              value={local.filenameTemplate}
              onChange={(e) => setLocal({ ...local, filenameTemplate: e.target.value })}
              className="w-full bg-app border border-app rounded px-3 py-2 text-sm font-mono focus-ring"
              placeholder="{folders}/{tags}{ext}"
              data-testid="template-input"
            />

            <div className="mt-3 pane rounded p-3 bg-app">
              <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1">
                Live preview
              </div>
              <div className="text-xs text-dim mb-1">
                Folders: <span className="font-mono text-app">2024 / weddings</span> ·
                Tags: <span className="font-mono text-app">ceremony_outdoor</span> ·
                Original: <span className="font-mono text-app">IMG_2043.JPG</span> ·
                Date: <span className="font-mono text-app">2024-08-14</span> ·
                Stars: <span className="font-mono text-app">4</span>
              </div>
              <div className="text-sm font-mono text-primary-earth break-all" data-testid="template-preview">
                {preview.pathPreview || "(empty)"}
              </div>
            </div>

            <details className="mt-3 text-xs">
              <summary className="text-dim hover:text-app cursor-pointer flex items-center gap-1">
                <Info size={11} /> Available tokens
              </summary>
              <div className="mt-2 grid grid-cols-2 gap-1.5 pane rounded p-3 bg-app">
                {TEMPLATE_TOKENS.map((t) => (
                  <div key={t.token} className="flex items-baseline gap-2">
                    <button
                      onClick={() =>
                        setLocal({
                          ...local,
                          filenameTemplate: local.filenameTemplate + t.token,
                        })
                      }
                      className="font-mono text-primary-earth hover:underline text-[11px]"
                    >
                      {t.token}
                    </button>
                    <span className="text-dim text-[11px]">{t.desc}</span>
                  </div>
                ))}
              </div>
            </details>
          </section>

          {/* Star filter */}
          <section>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading font-semibold text-sm mb-1 flex items-center gap-1">
                  <Star size={13} className="text-primary-earth" /> Minimum Star Filter
                </h3>
                <p className="text-xs text-dim">
                  Hide filmstrip thumbs below this rating (0 = show all).
                </p>
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setLocal({ ...local, minStarFilter: n })}
                    className={`w-8 h-8 rounded text-xs font-mono border ${
                      local.minStarFilter === n
                        ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent"
                        : "bg-app border-app hover:bg-surface-hover"
                    }`}
                    data-testid={`star-filter-${n}`}
                  >
                    {n === 0 ? "All" : `≥${n}`}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Thumbnail cache */}
          <section>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading font-semibold text-sm mb-1">Thumbnail Cache</h3>
                <p className="text-xs text-dim">
                  Thumbnails are cached on disk (IndexedDB) so folders load instantly next time.
                </p>
              </div>
              <button
                onClick={async () => {
                  await clearThumbCache();
                  toast.success("Thumbnail cache cleared");
                }}
                className="px-3 py-1.5 rounded bg-app border border-app hover:bg-surface-hover text-xs flex items-center gap-1 shrink-0"
                data-testid="clear-thumb-cache"
              >
                <Trash2 size={12} /> Clear cache
              </button>
            </div>
          </section>

          {/* Batch behavior */}
          <section>
            <h3 className="font-heading font-semibold text-sm mb-1 flex items-center gap-1">
              <Layers size={13} className="text-primary-earth" /> Batch Behavior
            </h3>
            <p className="text-xs text-dim mb-3">
              Controls how "Run Batch" processes many photos at once. You can still override the
              default in the Run Batch dropdown per-run.
            </p>

            <div className="pane rounded p-3 bg-app space-y-4">
              {/* Batch size limit */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-medium text-app">Max photos per batch</div>
                  <div className="text-[11px] text-dim">
                    Prevents PC lag on large filmstrips. If selection exceeds this, you'll be
                    asked whether to process the first N or all.
                  </div>
                </div>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={local.batchSizeLimit ?? 20}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      // Allow empty while typing; will be clamped on blur.
                      setLocal({ ...local, batchSizeLimit: "" });
                      return;
                    }
                    const n = Math.max(1, Math.min(500, parseInt(raw, 10)));
                    if (!Number.isNaN(n)) setLocal({ ...local, batchSizeLimit: n });
                  }}
                  onBlur={() => {
                    if (local.batchSizeLimit === "" || Number.isNaN(local.batchSizeLimit)) {
                      setLocal({ ...local, batchSizeLimit: 20 });
                    }
                  }}
                  className="w-20 bg-surface border border-app rounded px-2 py-1 text-sm font-mono text-right focus-ring"
                  data-testid="batch-size-limit-input"
                />
              </div>

              {/* Default after-action */}
              <div>
                <div className="text-xs font-medium text-app mb-1">
                  After batch store, source photos should:
                </div>
                <div className="text-[11px] text-dim mb-2">
                  Default action after each batch. Individual runs can override this from the
                  Run Batch dropdown.
                </div>
                <div className="flex rounded overflow-hidden border border-app">
                  {[
                    { v: "keep", label: "Keep in source", hint: "Remove from filmstrip only" },
                    { v: "move", label: "Move", hint: "Delete originals after copy" },
                    { v: "delete", label: "Delete", hint: "Confirms first" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setLocal({ ...local, batchAfterAction: o.v })}
                      className={`flex-1 px-3 py-1.5 text-xs ${
                        (local.batchAfterAction ?? "keep") === o.v
                          ? "bg-primary-earth text-[color:var(--text-inverse)]"
                          : "bg-surface hover:bg-surface-hover"
                      }`}
                      data-testid={`batch-after-${o.v}`}
                      title={o.hint}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-dim mt-1.5">
                  {local.batchAfterAction === "delete" && "You'll be asked to confirm every time a batch delete runs."}
                  {local.batchAfterAction === "move" && "Originals removed after successful copy to destination."}
                  {(local.batchAfterAction === "keep" || !local.batchAfterAction) && "Safest option — originals stay on your source drive."}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="px-5 py-3 border-t border-app flex items-center justify-end gap-2 sticky bottom-0 bg-surface">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-app border border-app hover:bg-surface-hover text-sm"
            data-testid="settings-cancel"
          >
            Cancel
          </button>
          <button
            onClick={applyAndClose}
            className="px-4 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] font-medium text-sm"
            data-testid="settings-save"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

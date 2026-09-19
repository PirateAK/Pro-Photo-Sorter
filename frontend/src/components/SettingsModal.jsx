import React, { useState, useEffect, useRef } from "react";
import { Settings as Cog, X, Info, Trash2, MoveRight, Copy, Star, Layers, Sun, Moon, Type } from "lucide-react";
import { TEMPLATE_TOKENS, TEMPLATE_PRESETS, renderTemplate } from "../lib/template";
import { clearThumbCache } from "../lib/thumbCache";
import { paintWatermark } from "../lib/watermark";
import { toast } from "sonner";

export default function SettingsModal({ open, onClose, settings, onChange, previewImageHandle }) {
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
          {/* Theme */}
          <section>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading font-semibold text-sm mb-1">Appearance</h3>
                <p className="text-xs text-dim">
                  Earth Dark is easy on the eyes in low light; Earth Light is warm parchment
                  for daylight editing. Also toggle-able from the top-toolbar sun/moon button.
                </p>
              </div>
              <div className="flex rounded overflow-hidden border border-app shrink-0">
                <button
                  onClick={() => setLocal({ ...local, theme: "dark" })}
                  className={`px-3 py-1.5 text-xs flex items-center gap-1 ${
                    (local.theme ?? "dark") === "dark"
                      ? "bg-primary-earth text-[color:var(--text-inverse)]"
                      : "bg-app hover:bg-surface-hover"
                  }`}
                  data-testid="theme-dark"
                >
                  <Moon size={12} /> Earth Dark
                </button>
                <button
                  onClick={() => setLocal({ ...local, theme: "light" })}
                  className={`px-3 py-1.5 text-xs flex items-center gap-1 ${
                    local.theme === "light"
                      ? "bg-primary-earth text-[color:var(--text-inverse)]"
                      : "bg-app hover:bg-surface-hover"
                  }`}
                  data-testid="theme-light"
                >
                  <Sun size={12} /> Earth Light
                </button>
              </div>
            </div>
          </section>

          {/* Startup */}
          <section>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading font-semibold text-sm mb-1">Workflow</h3>
                <p className="text-xs text-dim">
                  When enabled, storing a single photo automatically advances to the next photo in
                  the filmstrip — great for rapid single-photo sorting sessions.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={local.autoAdvanceOnStore !== false}
                  onChange={(e) => setLocal({ ...local, autoAdvanceOnStore: e.target.checked })}
                  className="w-4 h-4 accent-primary-earth cursor-pointer"
                  data-testid="auto-advance-toggle"
                />
                <span className="text-xs">Auto-advance after Store</span>
              </label>
            </div>
          </section>

          {/* Startup toast */}
          <section>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading font-semibold text-sm mb-1">Startup</h3>
                <p className="text-xs text-dim">
                  When enabled, the app offers to reopen your last-used source and destination
                  folders each time you launch it. Disable if you share the app with friends.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0" data-testid="auto-reopen-toggle-label">
                <input
                  type="checkbox"
                  checked={local.autoReopenLast !== false}
                  onChange={(e) => setLocal({ ...local, autoReopenLast: e.target.checked })}
                  className="w-4 h-4 accent-primary-earth cursor-pointer"
                  data-testid="auto-reopen-toggle"
                />
                <span className="text-xs">Reopen last folders on launch</span>
              </label>
            </div>
          </section>

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

          {/* Watermark */}
          <section>
            <h3 className="font-heading font-semibold text-sm mb-1 flex items-center gap-1">
              <Type size={13} className="text-primary-earth" /> Watermark on Store
            </h3>
            <p className="text-xs text-dim mb-3">
              When enabled, every stored JPG / PNG / WebP is baked with your text at the position
              you set below. White text with a soft shadow so it stays readable on any background.
              Originals on your source drive are never touched.
            </p>

            <div className="pane rounded p-3 bg-app space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={local.watermarkEnabled === true}
                  onChange={(e) => setLocal({ ...local, watermarkEnabled: e.target.checked })}
                  className="w-4 h-4 accent-primary-earth cursor-pointer"
                  data-testid="watermark-toggle"
                />
                <span className="text-xs">Bake watermark into stored photos</span>
              </label>

              <div>
                <div className="text-[11px] text-dim mb-1">Watermark text</div>
                <input
                  type="text"
                  value={local.watermarkText ?? ""}
                  onChange={(e) => setLocal({ ...local, watermarkText: e.target.value })}
                  placeholder="© 2026 MuskegMan Photography"
                  disabled={local.watermarkEnabled !== true}
                  className="w-full bg-surface border border-app rounded px-2 py-1.5 text-sm focus-ring disabled:opacity-40"
                  data-testid="watermark-text"
                />
              </div>

              {/* Font size preset */}
              <div>
                <div className="text-[11px] text-dim mb-1">Font size</div>
                <div className="flex rounded overflow-hidden border border-app">
                  {[
                    { v: "small", label: "Small", hint: "~1% of long edge" },
                    { v: "medium", label: "Medium", hint: "~1.6% (default)" },
                    { v: "large", label: "Large", hint: "~2.4% — prominent" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setLocal({ ...local, watermarkFontSize: o.v })}
                      disabled={local.watermarkEnabled !== true}
                      className={`flex-1 px-2 py-1.5 text-xs ${
                        (local.watermarkFontSize ?? "medium") === o.v
                          ? "bg-primary-earth text-[color:var(--text-inverse)]"
                          : "bg-surface hover:bg-surface-hover"
                      } disabled:opacity-40`}
                      data-testid={`watermark-size-${o.v}`}
                      title={o.hint}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity slider */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[11px] text-dim">Opacity</div>
                  <span className="text-[11px] font-mono text-primary-earth">
                    {Math.round((local.watermarkOpacity ?? 0.9) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="30"
                  max="100"
                  step="5"
                  value={Math.round((local.watermarkOpacity ?? 0.9) * 100)}
                  onChange={(e) => setLocal({ ...local, watermarkOpacity: parseInt(e.target.value, 10) / 100 })}
                  disabled={local.watermarkEnabled !== true}
                  className="w-full accent-[color:var(--primary)] disabled:opacity-40"
                  data-testid="watermark-opacity"
                />
              </div>

              {/* Drag preview */}
              <WatermarkPreview
                enabled={local.watermarkEnabled === true}
                text={(local.watermarkText || "").trim()}
                fontSize={local.watermarkFontSize || "medium"}
                opacity={local.watermarkOpacity ?? 0.9}
                xPct={local.watermarkXPct ?? 0.98}
                yPct={local.watermarkYPct ?? 0.98}
                imageHandle={previewImageHandle}
                onPositionChange={(xPct, yPct) => setLocal({ ...local, watermarkXPct: xPct, watermarkYPct: yPct })}
              />

              {local.watermarkEnabled === true && (local.watermarkText || "").trim().length === 0 && (
                <div className="text-[11px] text-amber-500">
                  Enter some text — an empty watermark disables the stamp.
                </div>
              )}
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

// Live preview of the watermark. If a source photo handle is provided we render
// it downsized; otherwise we fall back to an earth-tone gradient so the drag
// affordance is still testable without a photo loaded.
function WatermarkPreview({ enabled, text, fontSize, opacity, xPct, yPct, imageHandle, onPositionChange }) {
  const canvasRef = useRef(null);
  const [bg, setBg] = useState(null); // { img, w, h } | null (null → gradient)
  const dragging = useRef(false);

  // Fixed display size for the preview canvas (CSS px). Drawing buffer is HiDPI.
  const CSS_W = 380;
  const CSS_H = 220;

  // Load the source image (if any) once per handle
  useEffect(() => {
    let alive = true;
    if (!imageHandle) { setBg(null); return; }
    (async () => {
      try {
        const file = await imageHandle.getFile();
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(url);
          if (alive) setBg({ img, w: img.naturalWidth, h: img.naturalHeight });
        };
        img.onerror = () => URL.revokeObjectURL(url);
        img.src = url;
      } catch { /* ignore */ }
    })();
    return () => { alive = false; };
  }, [imageHandle]);

  // Redraw whenever anything changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = CSS_W * dpr;
    canvas.height = CSS_H * dpr;
    canvas.style.width = CSS_W + "px";
    canvas.style.height = CSS_H + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, CSS_W, CSS_H);

    // Background — real photo scaled to fit, or fallback gradient
    if (bg?.img) {
      const scale = Math.min(CSS_W / bg.w, CSS_H / bg.h);
      const dw = bg.w * scale;
      const dh = bg.h * scale;
      const dx = (CSS_W - dw) / 2;
      const dy = (CSS_H - dh) / 2;
      ctx.fillStyle = "#1a1512";
      ctx.fillRect(0, 0, CSS_W, CSS_H);
      ctx.drawImage(bg.img, dx, dy, dw, dh);
    } else {
      const g = ctx.createLinearGradient(0, 0, CSS_W, CSS_H);
      g.addColorStop(0, "#3a2f26");
      g.addColorStop(0.5, "#6b5642");
      g.addColorStop(1, "#2a2018");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CSS_W, CSS_H);
    }

    // Paint watermark at current position — pass the CSS-space dimensions so
    // the stamp uses the same math as the export path.
    if (enabled && text) {
      paintWatermark(ctx, text, {
        width: CSS_W,
        height: CSS_H,
        fontSize,
        opacity,
        xPct,
        yPct,
      });
    }

    // Draggable hit-indicator: small dot at the anchor point when hovered
    // (only visible if enabled & has text)
    if (enabled && text) {
      ctx.save();
      ctx.strokeStyle = "rgba(198, 138, 83, 0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(xPct * CSS_W, yPct * CSS_H, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }, [bg, enabled, text, fontSize, opacity, xPct, yPct]);

  const setFromEvent = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onPositionChange(x, y);
  };

  const onPointerDown = (e) => {
    if (!enabled) return;
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromEvent(e);
  };
  const onPointerMove = (e) => {
    if (!dragging.current) return;
    setFromEvent(e);
  };
  const onPointerUp = (e) => {
    dragging.current = false;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] text-dim">
          {bg?.img ? "Preview (drag the text to position it)" : "Preview — no photo loaded, using placeholder"}
        </div>
        <button
          onClick={() => onPositionChange(0.98, 0.98)}
          disabled={!enabled}
          className="text-[11px] text-primary-earth hover:underline disabled:opacity-40"
          data-testid="watermark-reset-position"
          title="Reset to bottom-right"
        >
          reset ↘
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`w-full rounded border border-app ${enabled ? "cursor-move" : "cursor-not-allowed opacity-60"}`}
        data-testid="watermark-preview-canvas"
      />
      <div className="text-[10px] text-dim mt-1 font-mono">
        Position: x {Math.round(xPct * 100)}% · y {Math.round(yPct * 100)}%
      </div>
    </div>
  );
}

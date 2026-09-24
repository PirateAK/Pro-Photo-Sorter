import React, { useState, useEffect, useRef } from "react";
import { Settings as Cog, X, Info, Trash2, MoveRight, Copy, Star, Layers, Sun, Moon, Type, PackagePlus, MapPin, Save as SaveIcon, AlertCircle } from "lucide-react";
import { TEMPLATE_TOKENS, TEMPLATE_PRESETS, renderTemplate, validateTemplate, autoNameForTemplate } from "../lib/template";
import { clearThumbCache } from "../lib/thumbCache";
import { paintWatermark, WATERMARK_FONTS } from "../lib/watermark";
import { toast } from "sonner";

export default function SettingsModal({ open, onClose, settings, onChange, previewImageHandle, onRestoreStarterPacks }) {
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

          {/* UI Text Size (v1.1.3) */}
          <section>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-heading font-semibold text-sm mb-1 flex items-center gap-2">
                  <Type size={14} className="text-primary-earth" /> UI Text Size
                </h3>
                <p className="text-xs text-dim">
                  Scales every label, button, and tab in the app. Icons and panel
                  widths stay put. Also adjustable with keyboard: <kbd className="px-1 rounded border border-app text-[0.65rem]">Ctrl</kbd>{" "}
                  <kbd className="px-1 rounded border border-app text-[0.65rem]">+</kbd>{" "}
                  bigger, <kbd className="px-1 rounded border border-app text-[0.65rem]">Ctrl</kbd>{" "}
                  <kbd className="px-1 rounded border border-app text-[0.65rem]">-</kbd>{" "}
                  smaller, <kbd className="px-1 rounded border border-app text-[0.65rem]">Ctrl</kbd>{" "}
                  <kbd className="px-1 rounded border border-app text-[0.65rem]">0</kbd> reset.
                </p>
              </div>
              <div className="flex flex-wrap gap-1 shrink-0" data-testid="ui-scale-group">
                {[
                  { v: 0.90, label: "Compact",     pct: "90%"  },
                  { v: 1.00, label: "Default",     pct: "100%" },
                  { v: 1.10, label: "Comfortable", pct: "110%" },
                  { v: 1.25, label: "Large",       pct: "125%" },
                  { v: 1.40, label: "Extra Large", pct: "140%" },
                ].map((opt) => {
                  const cur = typeof local.uiScale === "number" ? local.uiScale : 1.10;
                  const active = Math.abs(cur - opt.v) < 0.005;
                  return (
                    <button
                      key={opt.v}
                      onClick={() => setLocal({ ...local, uiScale: opt.v })}
                      className={`px-2.5 py-1.5 text-xs rounded border ${
                        active
                          ? "bg-primary-earth text-[color:var(--text-inverse)] border-primary-earth"
                          : "bg-app hover:bg-surface-hover border-app"
                      }`}
                      data-testid={`ui-scale-${Math.round(opt.v * 100)}`}
                      title={`${opt.label} · ${opt.pct}`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Filmstrip Thumbnail Size (v1.1.3) */}
          <section>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-heading font-semibold text-sm mb-1 flex items-center gap-2">
                  <Layers size={14} className="text-primary-earth" /> Filmstrip Thumbnail Size
                </h3>
                <p className="text-xs text-dim">
                  Sets how big each photo thumbnail is along the bottom filmstrip.
                  Larger thumbs make composition easier to judge without opening
                  every frame; smaller thumbs fit more photos on screen at once.
                </p>
              </div>
              <div className="flex flex-wrap gap-1 shrink-0" data-testid="thumb-size-group">
                {[
                  { v:  96, label: "Small"  },
                  { v: 128, label: "Medium" },
                  { v: 176, label: "Large"  },
                  { v: 224, label: "Huge"   },
                ].map((opt) => {
                  const cur = typeof local.thumbSize === "number" ? local.thumbSize : 128;
                  const active = cur === opt.v;
                  return (
                    <button
                      key={opt.v}
                      onClick={() => setLocal({ ...local, thumbSize: opt.v })}
                      className={`px-2.5 py-1.5 text-xs rounded border ${
                        active
                          ? "bg-primary-earth text-[color:var(--text-inverse)] border-primary-earth"
                          : "bg-app hover:bg-surface-hover border-app"
                      }`}
                      data-testid={`thumb-size-${opt.v}`}
                      title={`${opt.label} · ${opt.v}px`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Default EXIF Location (v1.1.7) */}
          <section>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <h3 className="font-heading font-semibold text-sm mb-1 flex items-center gap-2">
                  <MapPin size={14} className="text-primary-earth" /> Default EXIF Location
                </h3>
                <p className="text-xs text-dim">
                  Set once — every photo you open will show this location in
                  the on-viewer Location chip (unless you've typed a different
                  one for that specific photo). Handy for a full shoot in a
                  single place. Leave blank to disable the default.
                </p>
              </div>
              <input
                type="text"
                value={local.defaultLocation || ""}
                onChange={(e) => setLocal({ ...local, defaultLocation: e.target.value })}
                placeholder="e.g. Kenai, Alaska"
                className="shrink-0 w-64 bg-app border border-app rounded px-2 py-1.5 text-xs font-mono focus-ring"
                data-testid="settings-default-location"
                spellCheck={false}
              />
            </div>
          </section>

          {/* Restore Starter Packs (v1.1.4) */}
          {onRestoreStarterPacks && (
            <section>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="font-heading font-semibold text-sm mb-1 flex items-center gap-2">
                    <PackagePlus size={14} className="text-primary-earth" /> Starter Tag Packs
                  </h3>
                  <p className="text-xs text-dim">
                    Pro Photo Sorter ships with six ready-to-use packs:
                    <span className="text-app"> Wildlife · Wedding · Portrait · Landscape · Sports · Real Estate</span>.
                    Click Restore below to merge any missing starter packs into your library.
                    Your existing packs are never touched — only missing ones are added.
                  </p>
                </div>
                <button
                  onClick={() => {
                    onRestoreStarterPacks();
                  }}
                  className="shrink-0 px-3 py-1.5 rounded border border-primary-earth bg-primary-earth text-[color:var(--text-inverse)] text-xs hover:opacity-90 flex items-center gap-1.5"
                  data-testid="restore-starter-packs"
                  title="Merges any missing starter packs — does not modify your existing packs"
                >
                  <PackagePlus size={12} /> Restore starter packs
                </button>
              </div>
            </section>
          )}

          {/* Workflow */}
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

          {/* v1.4.0 — Nested Sub-folders toggle */}
          <section>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading font-semibold text-sm mb-1">Nested Sub-Folders</h3>
                <p className="text-xs text-dim">
                  When enabled, drilling into a sub-folder that has children of its own reveals a
                  deeper SUB-FOLDER row so you can pick from any level in the tree
                  (e.g. Wedding › Ceremony › Bride's family). Turn off to stick with the classic
                  single sub-folder row.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0" data-testid="nested-subfolders-toggle-label">
                <input
                  type="checkbox"
                  checked={local.enableNestedSubfolders !== false}
                  onChange={(e) => setLocal({ ...local, enableNestedSubfolders: e.target.checked })}
                  className="w-4 h-4 accent-primary-earth cursor-pointer"
                  data-testid="nested-subfolders-toggle"
                />
                <span className="text-xs">Show deeper sub-folder rows</span>
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

          {/* v1.2.3 — Auto-update opt-in */}
          <section>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading font-semibold text-sm mb-1">Auto-Update</h3>
                <p className="text-xs text-dim">
                  When enabled, Pro Photo Sorter checks GitHub Releases once per launch and offers
                  to download + install the latest version if one is out. One tiny internet call
                  per launch; otherwise the app stays fully offline.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0" data-testid="check-updates-toggle-label">
                <input
                  type="checkbox"
                  checked={local.checkForUpdates === true}
                  onChange={(e) => setLocal({ ...local, checkForUpdates: e.target.checked })}
                  className="w-4 h-4 accent-primary-earth cursor-pointer"
                  data-testid="check-updates-toggle"
                />
                <span className="text-xs">Check for updates on launch</span>
              </label>
            </div>
          </section>

          {/* v1.2.3 — Tag-pack auto-backup */}
          <section>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-heading font-semibold text-sm mb-1">Auto-Backup Tag Packs</h3>
                <p className="text-xs text-dim">
                  Once per calendar day, drops a plain-text snapshot of every tag pack into
                  <code className="px-1 rounded bg-surface-hover font-mono text-[10px] mx-1">&lt;destination&gt;/.pps-backups/</code>.
                  Keeps the last 7 days. Restore any time via Tag Manager → Import text list.
                </p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer shrink-0" data-testid="auto-backup-toggle-label">
                <input
                  type="checkbox"
                  checked={local.autoBackupTagPacks !== false}
                  onChange={(e) => setLocal({ ...local, autoBackupTagPacks: e.target.checked })}
                  className="w-4 h-4 accent-primary-earth cursor-pointer"
                  data-testid="auto-backup-toggle"
                />
                <span className="text-xs">Daily tag-pack backup to destination</span>
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
                  spellCheck={true}
                  autoCorrect="on"
                  autoCapitalize="on"
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

              {/* Color: Light (white text, dark halo) vs Dark (black text, light halo) */}
              <div>
                <div className="text-[11px] text-dim mb-1">Text color</div>
                <div className="flex rounded overflow-hidden border border-app">
                  {[
                    { v: "white", label: "Light", hint: "White text with a soft dark halo — good on darker photos" },
                    { v: "black", label: "Dark", hint: "Black text with a soft light halo — good on brighter photos" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setLocal({ ...local, watermarkColor: o.v })}
                      disabled={local.watermarkEnabled !== true}
                      className={`flex-1 px-2 py-1.5 text-xs ${
                        (local.watermarkColor ?? "white") === o.v
                          ? "bg-primary-earth text-[color:var(--text-inverse)]"
                          : "bg-surface hover:bg-surface-hover"
                      } disabled:opacity-40`}
                      data-testid={`watermark-color-${o.v}`}
                      title={o.hint}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font family */}
              <div>
                <div className="text-[11px] text-dim mb-1">Font</div>
                <select
                  value={local.watermarkFontFamily || "sans"}
                  onChange={(e) => setLocal({ ...local, watermarkFontFamily: e.target.value })}
                  disabled={local.watermarkEnabled !== true}
                  className="w-full bg-surface border border-app rounded px-2 py-1.5 text-sm focus-ring disabled:opacity-40"
                  data-testid="watermark-font-family"
                >
                  {WATERMARK_FONTS.map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
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
                color={local.watermarkColor || "white"}
                fontFamily={local.watermarkFontFamily || "sans"}
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

            {/* v1.4.0 — Custom Filename Templates. Kurt saves up to 5
                favourite strings. Newest bumps the oldest out (LRU). Invalid
                tokens refuse to save with a red inline error (never silently
                produces empty paths). Name auto-derives from the input text. */}
            {(() => {
              const validation = validateTemplate(local.filenameTemplate);
              const savedList = Array.isArray(local.customFilenameTemplates)
                ? local.customFilenameTemplates
                : [];
              const alreadySaved = savedList.some((t) => t.template === local.filenameTemplate);
              const canSave = validation.ok && !alreadySaved && (local.filenameTemplate || "").trim().length > 0;
              const saveCustom = () => {
                if (!canSave) return;
                const nextName = autoNameForTemplate(local.filenameTemplate);
                const entry = { id: `tpl-${Date.now().toString(36)}`, name: nextName, template: local.filenameTemplate };
                // LRU: newest first, cap at 5 (b1)
                const dedup = savedList.filter((t) => t.template !== local.filenameTemplate);
                const next = [entry, ...dedup].slice(0, 5);
                setLocal({ ...local, customFilenameTemplates: next });
                toast.success(`Saved template "${nextName}"`, { icon: "⚙️" });
              };
              const deleteSaved = (id) => {
                setLocal({
                  ...local,
                  customFilenameTemplates: savedList.filter((t) => t.id !== id),
                });
              };
              return (
                <div className="mt-2">
                  {!validation.ok && (
                    <div
                      className="flex items-start gap-1.5 text-[11px] text-red-400 bg-red-500/10 border border-red-500/40 rounded px-2 py-1.5 mb-2"
                      data-testid="template-error"
                    >
                      <AlertCircle size={12} className="shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold">
                          Unknown token{validation.invalid.length > 1 ? "s" : ""}: {validation.invalid.map((t) => `{${t}}`).join(", ")}
                        </div>
                        {Object.keys(validation.suggestions || {}).length > 0 && (
                          <div className="mt-0.5 text-red-300">
                            Did you mean {Object.entries(validation.suggestions).map(([bad, good], i, arr) => (
                              <button
                                key={bad}
                                onClick={() => setLocal({
                                  ...local,
                                  filenameTemplate: local.filenameTemplate.replace(
                                    new RegExp(`\\{${bad}\\}`, "g"),
                                    `{${good}}`
                                  ),
                                })}
                                className="font-mono underline hover:text-red-200"
                                data-testid={`template-suggest-${bad}`}
                                title={`Replace {${bad}} with {${good}}`}
                              >
                                {`{${good}}`}
                              </button>
                            )).reduce((acc, el, i, arr) => acc.concat(i > 0 ? [", ", el] : [el]), [])}?
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={saveCustom}
                      disabled={!canSave}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                      data-testid="template-save-custom-btn"
                      title={
                        !validation.ok
                          ? "Fix the invalid token(s) before saving."
                          : alreadySaved
                          ? "This template is already in your saved list."
                          : !(local.filenameTemplate || "").trim().length
                          ? "Type a template first."
                          : `Save "${autoNameForTemplate(local.filenameTemplate)}" — keeps your last 5.`
                      }
                    >
                      <SaveIcon size={11} /> Save Custom
                    </button>
                    {savedList.length > 0 && (
                      <span className="text-[10px] uppercase tracking-widest text-dim font-heading">
                        My Templates ({savedList.length}/5)
                      </span>
                    )}
                  </div>

                  {savedList.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1" data-testid="template-custom-chips">
                      {savedList.map((t) => {
                        const active = local.filenameTemplate === t.template;
                        return (
                          <div
                            key={t.id}
                            className={`inline-flex items-center gap-1 rounded border text-[11px] transition-colors ${
                              active
                                ? "bg-primary-earth text-[color:var(--text-inverse)] border-transparent"
                                : "bg-app border-app hover:bg-surface-hover"
                            }`}
                            data-testid={`template-custom-chip-${t.id}`}
                          >
                            <button
                              onClick={() => setLocal({ ...local, filenameTemplate: t.template })}
                              className="pl-2 py-1 font-mono"
                              title={t.template}
                            >
                              {t.name}
                            </button>
                            <button
                              onClick={() => deleteSaved(t.id)}
                              className={`pr-1.5 py-1 opacity-70 hover:opacity-100 ${
                                active ? "" : "text-dim hover:text-danger-earth"
                              }`}
                              title="Delete this saved template"
                              data-testid={`template-custom-delete-${t.id}`}
                            >
                              <X size={10} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

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
function WatermarkPreview({ enabled, text, fontSize, opacity, color, fontFamily, xPct, yPct, imageHandle, onPositionChange }) {
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
    // the stamp uses the same math as the export path. Preview uses scale:3
    // so the Small/Medium/Large differences are clearly visible on the tiny
    // canvas (real export uses scale:1 with true photo dimensions).
    if (enabled && text) {
      paintWatermark(ctx, text, {
        width: CSS_W,
        height: CSS_H,
        fontSize,
        opacity,
        xPct,
        yPct,
        scale: 3,
        color,
        fontFamily,
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
  }, [bg, enabled, text, fontSize, opacity, color, fontFamily, xPct, yPct]);

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

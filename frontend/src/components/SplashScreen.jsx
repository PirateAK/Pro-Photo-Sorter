// SplashScreen (v1.4.5)
// -----------------------------------------------------------------------------
// First-run welcome overlay. Fires ONCE per install via the localStorage
// sentinel `pps.splash.v1` (dismissed on any close). Kurt can re-open it
// any time from Help panel → "View welcome splash". This component is
// intentionally content-agnostic — a future rev can swap the hero copy
// for release notes, product-family cross-promos, or a "what's new"
// tour without touching the mount code in App.js.
//
// Design language matches the rest of the app: earth-tone accent, mono
// heading, generous negative space, ARIA-modal semantics for a11y.
import React, { useEffect, useRef } from "react";
import { Camera, X, Sparkles, ChevronRight, Package, FolderTree, Wand2, Layers } from "lucide-react";
import buildInfo from "../buildInfo.json";

const HIGHLIGHTS = [
  {
    icon: FolderTree,
    title: "Unlimited nested folders",
    body: "Categorise like Lightroom — Sports › Baseball › AL › Yankees. Right-click any tag to promote it into its own sub-folder in one click.",
  },
  {
    icon: Wand2,
    title: "One-shot photo editor",
    body: "Auto-Enhance, crop, rotate, fine-tune. Your tags and star rating follow the edit so nothing gets wiped on the way out.",
  },
  {
    icon: Layers,
    title: "Multi-source workflow",
    body: "Open two source folders side-by-side. Swap active roots with one tap so Store and Delete always know which shoot you're on.",
  },
  {
    icon: Package,
    title: "100% offline · Lightroom-ready",
    body: "Runs off satellite, off-grid, off the boat. Every Store also drops a .xmp sidecar so Lightroom / Bridge pick up your stars + tags automatically.",
  },
];

export default function SplashScreen({ open, onClose, onOpenSamples }) {
  const dialogRef = useRef(null);

  // ESC to close (bypasses the App.js keyboard guard).
  useEffect(() => {
    if (!open) return;
    const h = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose?.(); }
    };
    window.addEventListener("keydown", h);
    // Focus the primary CTA when the dialog opens for keyboard users.
    setTimeout(() => dialogRef.current?.querySelector("[data-splash-cta]")?.focus(), 30);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
      data-testid="splash-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="splash-title"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-[min(720px,95vw)] max-h-[92vh] overflow-y-auto rounded-2xl border-2 border-primary-earth shadow-2xl grain"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--surface) 96%, transparent) 0%, color-mix(in srgb, var(--surface) 88%, var(--primary) 6%) 100%)",
        }}
        data-testid="splash-screen"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center bg-app hover:bg-surface-hover border border-app z-10"
          data-testid="splash-close"
          title="Close welcome screen"
          aria-label="Close welcome screen"
        >
          <X size={16} />
        </button>

        {/* Hero */}
        <div className="px-6 pt-10 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-earth text-[color:var(--text-inverse)] mb-3 shadow-lg">
            <Camera size={28} />
          </div>
          <div className="text-[10px] uppercase tracking-[0.4em] font-heading text-primary-earth mb-1">
            Welcome aboard
          </div>
          <h1
            id="splash-title"
            className="font-heading font-bold text-2xl sm:text-3xl leading-tight"
          >
            Pro Photo Sorter
          </h1>
          <div className="mt-1 text-xs text-dim font-mono">
            v{buildInfo.version} · offline · built for photographers who shoot more than they type
          </div>
        </div>

        {/* Highlights */}
        <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="pane rounded-lg border border-app p-3 hover:border-primary-earth/60 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded flex items-center justify-center bg-primary-earth/15 text-primary-earth shrink-0">
                  <Icon size={14} />
                </div>
                <h3 className="font-heading font-semibold text-sm">{title}</h3>
              </div>
              <p className="text-xs text-dim leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Footer / CTAs */}
        <div className="px-6 pt-2 pb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 justify-between">
          <div className="text-[11px] text-dim">
            <Sparkles size={11} className="inline-block mr-1 text-primary-earth" />
            You can re-open this welcome anytime from Help → View welcome splash.
          </div>
          <div className="flex gap-2 shrink-0">
            {onOpenSamples && (
              <button
                onClick={() => { onOpenSamples(); onClose(); }}
                className="px-3 py-2 rounded-lg bg-app border border-app hover:bg-surface-hover text-sm flex items-center gap-1"
                data-testid="splash-open-samples"
                title="Open the bundled Samples folder in Explorer so you have photos to try immediately."
              >
                Try the samples
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-primary-earth text-[color:var(--text-inverse)] font-medium text-sm flex items-center gap-1 hover:opacity-90"
              data-testid="splash-get-started"
              data-splash-cta="true"
            >
              Get started <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

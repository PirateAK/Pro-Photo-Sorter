// PasteRosterButton (v1.4.3-hotfix)
// -----------------------------------------------------------------------------
// Compact "Paste list" button that opens a tiny popover for bulk-adding
// filename tags. Kurt pastes a Lightroom-style roster —
//   "Devers, Bogaerts, Story, Duran"
// — OR one-per-line
//   Devers
//   Bogaerts
//   Story
//   Duran
// — and hits Ctrl+Enter (or the Add button) to tag them all at once.
//
// Splitting rules:
//   • Commas AND newlines both work as separators (mixed is fine).
//   • Lines starting with `//` or `#` are ignored (comments).
//   • Each entry is trimmed and capped at 60 chars (matching the manual add).
//   • Duplicates within the paste are de-duped case-insensitively BEFORE
//     the caller receives them. The caller is expected to skip labels that
//     already exist on the target, if it cares.
//
// Contract:
//   onCommit(labels: string[])  ← called with the parsed labels array;
//                                  returns the number ACTUALLY added so we
//                                  can toast the right count.
import React, { useState, useRef, useEffect } from "react";
import { ClipboardPaste } from "lucide-react";
import { toast } from "sonner";

export function parseRoster(text) {
  if (!text || typeof text !== "string") return [];
  // Strip comment lines first
  const cleaned = text
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      return t && !t.startsWith("//") && !t.startsWith("#");
    })
    .join(",");
  const parts = cleaned.split(/[,\n]/);
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const label = p.trim().slice(0, 60);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

export default function PasteRosterButton({
  onCommit,               // fn(labels: string[]) → number added
  testId,                 // e.g. `subfolder-paste-<sfid>`
  buttonLabel = "Paste list",
  targetName,             // for placeholder / toast context (e.g. sub-folder name)
  compact = false,        // when true, icon-only trigger
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const taRef = useRef(null);

  useEffect(() => {
    if (open) setTimeout(() => taRef.current?.focus(), 20);
  }, [open]);

  const commit = () => {
    const labels = parseRoster(text);
    if (labels.length === 0) {
      toast.error("No labels found", { description: "Separate with commas or new lines." });
      return;
    }
    const added = onCommit(labels) ?? labels.length;
    if (added === 0) {
      toast("All those labels already exist on this sub-folder", { icon: "🟰" });
    } else if (added < labels.length) {
      toast.success(`Added ${added} of ${labels.length}`, {
        description: `${labels.length - added} were already there.`,
      });
    } else {
      toast.success(`Added ${added} filename tag${added === 1 ? "" : "s"}${targetName ? ` to "${targetName}"` : ""}`);
    }
    setText("");
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={compact
          ? "px-1.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-[10px] flex items-center gap-1"
          : "px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1"}
        data-testid={testId}
        title={`Paste a comma- or newline-separated list to bulk-add filename tags${targetName ? ` to "${targetName}"` : ""}. Comments starting with // or # are ignored.`}
      >
        <ClipboardPaste size={compact ? 10 : 11} /> {compact ? "Paste" : buttonLabel}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
            data-testid={`${testId}-backdrop`}
          />
          <div
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(520px,90vw)] rounded-lg shadow-2xl bg-surface border border-app p-3 space-y-2"
            data-testid={`${testId}-popover`}
          >
            <div className="text-[10px] uppercase tracking-widest font-heading text-dim flex items-center justify-between">
              <span>
                Paste roster{targetName ? <> · <span className="text-primary-earth normal-case tracking-normal font-semibold">{targetName}</span></> : null}
              </span>
              <span className="text-[9px] normal-case tracking-normal text-dim">Ctrl+Enter to commit · Esc to cancel</span>
            </div>
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commit(); }
              }}
              placeholder={"Devers, Bogaerts, Story, Duran\n\nOR one per line:\nDevers\nBogaerts\nStory\nDuran\n\n// lines starting with // or # are ignored"}
              className="w-full bg-app border border-app rounded px-2 py-1.5 text-sm font-mono focus-ring min-h-[10rem]"
              spellCheck={true}
              data-testid={`${testId}-textarea`}
            />
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] text-dim">
                {(() => {
                  const preview = parseRoster(text);
                  return preview.length === 0
                    ? "Waiting for labels…"
                    : `Ready to add ${preview.length} tag${preview.length === 1 ? "" : "s"}`;
                })()}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setOpen(false)}
                  className="px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs"
                  data-testid={`${testId}-cancel`}
                >Cancel</button>
                <button
                  onClick={commit}
                  disabled={parseRoster(text).length === 0}
                  className="px-3 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] text-xs font-medium disabled:opacity-40"
                  data-testid={`${testId}-commit`}
                >Add all</button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

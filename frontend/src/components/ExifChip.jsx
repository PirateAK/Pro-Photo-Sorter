import React, { useState, useEffect, useRef } from "react";
import { Pencil, Check, X } from "lucide-react";

/**
 * Editable EXIF chip. Shows icon + label + value. Click to edit.
 * - If value overflows, native title tooltip reveals the full string on hover.
 * - Enter saves, Escape cancels.
 * - "overridden" is true when the displayed value came from the user (not the file EXIF).
 */
export default function ExifChip({ icon: Icon, label, value, placeholder, onSave, testid, overridden, editable = true }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) {
      setDraft(value || "");
      // Focus and select on next tick
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  const save = () => {
    const v = draft.trim();
    onSave(v === "" ? null : v); // null clears any override
    setEditing(false);
  };
  const cancel = () => setEditing(false);

  const displayed = value || "";
  const isPlaceholder = !value;
  const shown = displayed || placeholder || "—";
  // Match the visual truncation cap (max-w-[16ch]) so tooltip fires whenever clipped
  const truncated = displayed.length > 16;

  if (editing) {
    return (
      <div
        className="flex items-center gap-1.5 pane rounded px-2 py-1 text-xs border border-primary-earth"
        data-testid={`${testid}-editing`}
      >
        <Icon size={12} className="text-primary-earth shrink-0" />
        <span className="text-dim shrink-0">{label}:</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          className="bg-app border border-app rounded px-1.5 py-0.5 text-xs font-mono focus-ring min-w-0 w-40"
          placeholder={placeholder}
          data-testid={`${testid}-input`}
        />
        <button
          onClick={save}
          className="w-5 h-5 rounded flex items-center justify-center text-success-earth hover:bg-surface-hover"
          data-testid={`${testid}-save`}
          title="Save (Enter)"
        >
          <Check size={12} />
        </button>
        <button
          onClick={cancel}
          className="w-5 h-5 rounded flex items-center justify-center text-dim hover:bg-surface-hover"
          data-testid={`${testid}-cancel`}
          title="Cancel (Esc)"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-1.5 pane rounded px-2 py-1 text-xs ${
        editable ? "cursor-pointer hover:border-primary-earth/60" : ""
      } ${overridden ? "border-primary-earth/60" : ""}`}
      onClick={() => editable && setEditing(true)}
      data-testid={testid}
      title={truncated ? `${label}: ${displayed}${overridden ? "  (edited)" : ""}` : undefined}
    >
      <Icon size={12} className={overridden ? "text-success-earth" : "text-primary-earth"} />
      <span className="text-dim">{label}:</span>
      <span className={`font-mono truncate max-w-[16ch] ${overridden ? "text-success-earth" : ""} ${isPlaceholder ? "italic text-dim/70" : ""}`}>
        {shown}
      </span>
      {editable && (
        <Pencil size={10} className="text-dim opacity-0 group-hover:opacity-100 shrink-0" />
      )}
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { CalendarPlus, CalendarMinus, Camera } from "lucide-react";

/**
 * DateTagDropdowns (v1.2.9) — compact Month/Day/Year dropdowns + Apply button
 * that sits beside the Help button in the top toolbar.
 *
 * v1.2.9 changes:
 *   • Defaults to TODAY on mount (not to the photo's EXIF date). Kurt found
 *     the auto-EXIF prefill unhelpful — he's usually stamping "today", and
 *     only wants to change the year when working on older photos.
 *   • Apply is now a TOGGLE. First press stamps the current selection onto
 *     the image; second press removes those stamps. The button label and
 *     icon flip to "Remove" when a stamp is currently on the image, so the
 *     photo can carry at most one date-stamp set at a time.
 *
 * Each stamp chip uses a STABLE palette id (`date-stamp-month`, `-day`,
 * `-year`) so we can reliably detect and remove the previous stamp when
 * the user toggles it off, even if the label changed (e.g. Jan → Feb).
 *
 * Props:
 *   isApplied   : boolean     - true when at least one date-stamp chip is
 *                               currently on the active image (parent
 *                               computes from its overlay state)
 *   disabled    : boolean     - true if no photo is loaded
 *   onApply(labelsWithIds)    - called with [{id,label}...] on stamp
 *   onRemove()                - called to clear the current stamp
 */
const MONTHS = [
  { v: "01", label: "Jan" }, { v: "02", label: "Feb" }, { v: "03", label: "Mar" },
  { v: "04", label: "Apr" }, { v: "05", label: "May" }, { v: "06", label: "Jun" },
  { v: "07", label: "Jul" }, { v: "08", label: "Aug" }, { v: "09", label: "Sep" },
  { v: "10", label: "Oct" }, { v: "11", label: "Nov" }, { v: "12", label: "Dec" },
];
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 25 }, (_, i) => String(CURRENT_YEAR - i));

// v1.2.9 — stable palette ids so parent can detect + remove existing stamps.
export const DATE_STAMP_IDS = {
  month: "date-stamp-month",
  day: "date-stamp-day",
  year: "date-stamp-year",
};

function todayParts() {
  const d = new Date();
  return {
    month: MONTHS[d.getMonth()].label,
    day: String(d.getDate()).padStart(2, "0"),
    year: String(d.getFullYear()),
  };
}

export default function DateTagDropdowns({ isApplied = false, disabled, onApply, onRemove, exifDateParts = null }) {
  // Default to today on mount. We deliberately do NOT re-sync when the
  // active image changes: Kurt wants the picker to hold his last choice
  // until he changes it, not shift around with each thumbnail.
  const initial = todayParts();
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const [year, setYear] = useState(initial.year);

  const nothingSelected = !month && !day && !year;

  // v1.3.1 — Load EXIF button. Grabs the machine-readable date parts
  // computed upstream from the photo's EXIF DateTimeOriginal (or
  // CreateDate fallback) and drops them straight into the M/D/Y
  // selects. Handy when the photographer wants the original shoot
  // date in the filename instead of the picker's default of "today".
  const loadExif = () => {
    if (!exifDateParts) return;
    setMonth(exifDateParts.month);
    setDay(exifDateParts.day);
    setYear(exifDateParts.year);
  };
  const canLoadExif = !!exifDateParts && !disabled;
  const exifMatches = exifDateParts &&
    month === exifDateParts.month &&
    day   === exifDateParts.day &&
    year  === exifDateParts.year;

  const handleClick = () => {
    if (isApplied) {
      onRemove?.();
      return;
    }
    if (nothingSelected) return;
    const labels = [
      month && { id: DATE_STAMP_IDS.month, label: month },
      day && { id: DATE_STAMP_IDS.day, label: day },
      year && { id: DATE_STAMP_IDS.year, label: year },
    ].filter(Boolean);
    onApply?.(labels);
  };

  const cls = "bg-app border border-app rounded px-1.5 py-1 text-xs font-mono focus-ring disabled:opacity-40";

  const btnClass = isApplied
    ? "px-2 py-1 rounded bg-primary-earth text-[color:var(--text-inverse)] border border-primary-earth text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
    : "px-2 py-1 rounded bg-primary-earth/15 hover:bg-primary-earth/30 border border-primary-earth/50 text-primary-earth text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div
      className="flex items-center gap-1 shrink-0 pane rounded-md border border-primary-earth/30 bg-primary-earth/5 px-1.5 py-1"
      data-testid="date-tag-dropdowns"
      title="Date-stamp toolset — pick a month/day/year, then Apply to stamp this photo"
    >
      <span className="text-[10px] uppercase tracking-widest font-heading text-primary-earth px-1 shrink-0" aria-hidden="true">
        Date
      </span>
      {/* v1.3.1 — one-click "Load EXIF" that fills M/D/Y from the current
          photo's shoot date. Hides when no photo is loaded / no EXIF
          date is available. Highlights orange when the current picker
          values already match the EXIF date. */}
      <button
        onClick={loadExif}
        disabled={!canLoadExif}
        className={`px-1.5 py-1 rounded text-xs flex items-center gap-1 border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
          exifMatches
            ? "bg-primary-earth text-[color:var(--text-inverse)] border-primary-earth"
            : "bg-app hover:bg-surface-hover border-app text-app"
        }`}
        data-testid="date-tag-load-exif"
        title={
          !exifDateParts
            ? "This photo has no EXIF date"
            : exifMatches
            ? `Picker already set to EXIF date: ${exifDateParts.month} ${exifDateParts.day}, ${exifDateParts.year}`
            : `Load EXIF date: ${exifDateParts.month} ${exifDateParts.day}, ${exifDateParts.year}`
        }
      >
        <Camera size={11} /> EXIF
      </button>
      <select
        value={month}
        onChange={(e) => setMonth(e.target.value)}
        disabled={disabled}
        className={cls}
        data-testid="date-tag-month"
        title="Month"
      >
        <option value="">Mon</option>
        {MONTHS.map((m) => (
          <option key={m.v} value={m.label}>{m.label}</option>
        ))}
      </select>
      <select
        value={day}
        onChange={(e) => setDay(e.target.value)}
        disabled={disabled}
        className={cls}
        data-testid="date-tag-day"
        title="Day"
      >
        <option value="">Day</option>
        {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <select
        value={year}
        onChange={(e) => setYear(e.target.value)}
        disabled={disabled}
        className={cls}
        data-testid="date-tag-year"
        title="Year"
      >
        <option value="">Year</option>
        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button
        onClick={handleClick}
        disabled={disabled || (!isApplied && nothingSelected)}
        className={btnClass}
        data-testid="date-tag-apply"
        title={isApplied
          ? "Remove the date stamp from this photo"
          : "Stamp the selected date onto this photo (one stamp per photo)"}
      >
        {isApplied
          ? (<><CalendarMinus size={12} /> Remove</>)
          : (<><CalendarPlus size={12} /> Apply</>)}
      </button>
    </div>
  );
}

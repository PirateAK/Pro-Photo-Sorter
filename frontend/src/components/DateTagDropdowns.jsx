import React, { useEffect, useState } from "react";
import { CalendarPlus } from "lucide-react";

/**
 * DateTagDropdowns (v1.1.7) — compact Month/Day/Year dropdowns + Apply button
 * that sits beside the Help button in the top toolbar.
 *
 * • Preselects from the current photo's EXIF date on mount / photo change.
 * • Clicking Apply pushes the selected date parts as FILENAME tags onto the
 *   current image via `onApply(labels)` — main app decides where they land.
 * • Any empty dropdown is skipped, so the user can add e.g. only the year.
 * • Month is shown as short name (Jan, Feb...) — most readable, most useful
 *   as a filename token for a working photographer.
 *
 * Props:
 *   exifDate     : Date | null - initial pre-fill from current image EXIF
 *   disabled     : boolean     - true if no photo is loaded
 *   onApply(labels) : called with an array of tag labels (e.g. ["Aug", "14", "2024"])
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

export default function DateTagDropdowns({ exifDate, disabled, onApply }) {
  const [month, setMonth] = useState(""); // stores label, e.g. "Aug"
  const [day, setDay] = useState("");     // "01".."31"
  const [year, setYear] = useState("");   // "2024"

  // Pre-fill from EXIF whenever the active image changes.
  useEffect(() => {
    if (!exifDate) { setMonth(""); setDay(""); setYear(""); return; }
    try {
      const d = exifDate instanceof Date ? exifDate : new Date(exifDate);
      if (isNaN(d.getTime())) return;
      const mi = d.getMonth(); // 0..11
      setMonth(MONTHS[mi].label);
      setDay(String(d.getDate()).padStart(2, "0"));
      setYear(String(d.getFullYear()));
    } catch { /* ignore */ }
  }, [exifDate]);

  const apply = () => {
    const labels = [month, day, year].filter(Boolean);
    if (labels.length === 0) return;
    onApply(labels);
  };

  const cls = "bg-app border border-app rounded px-1.5 py-1 text-xs font-mono focus-ring disabled:opacity-40";

  return (
    <div className="flex items-center gap-1 shrink-0" data-testid="date-tag-dropdowns">
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
        onClick={apply}
        disabled={disabled || (!month && !day && !year)}
        className="px-2 py-1 rounded bg-primary-earth/15 hover:bg-primary-earth/30 border border-primary-earth/50 text-primary-earth text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
        data-testid="date-tag-apply"
        title="Apply selected parts as filename tags on the current photo"
      >
        <CalendarPlus size={12} /> Apply
      </button>
    </div>
  );
}

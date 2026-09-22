import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { HelpCircle, X as XIcon, Printer, ExternalLink, FileText, Rocket, Keyboard, History, Info, KeyRound } from "lucide-react";
import buildInfo from "../buildInfo.json";
import LicenseSection from "@/components/LicenseSection";

/**
 * In-app Help / About modal.
 *
 * Docs are loaded from `/docs/<name>.md` (copied into public/docs/ by
 * run-app.bat and pack-app.bat before every build). This means the docs
 * travel with the installed .exe — no need to ship the .md files next
 * to the executable.
 */
const TABS = [
  { key: "quickstart", label: "Quick Start", icon: Rocket,      docPath: "QUICK_START.md" },
  { key: "guide",      label: "User Guide",  icon: FileText,    docPath: "USER_GUIDE.md" },
  { key: "shortcuts",  label: "Shortcuts",   icon: Keyboard,    docPath: null }, // hard-coded table below
  { key: "changelog",  label: "Changelog",   icon: History,     docPath: "CHANGELOG.md" },
  { key: "license",    label: "License",     icon: KeyRound,    docPath: null },
  { key: "about",      label: "About",       icon: Info,        docPath: null },
];

// docPath → cached markdown text (per session)
const docCache = new Map();

export default function HelpModal({ open, onClose, initialTab }) {
  const [tab, setTab] = useState(initialTab || "quickstart");
  const [docText, setDocText] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // When the modal is opened, jump to the requested initialTab (if any).
  useEffect(() => {
    if (open && initialTab) setTab(initialTab);
  }, [open, initialTab]);

  const activeTab = useMemo(() => TABS.find((t) => t.key === tab) || TABS[0], [tab]);

  // Fetch the doc for the active tab (if it has one)
  useEffect(() => {
    if (!open) return;
    if (!activeTab.docPath) { setDocText(""); setErr(""); return; }
    if (docCache.has(activeTab.docPath)) {
      setDocText(docCache.get(activeTab.docPath));
      setErr("");
      return;
    }
    setLoading(true);
    setErr("");
    fetch(`${process.env.PUBLIC_URL || ""}/docs/${activeTab.docPath}`, { cache: "no-cache" })
      .then((r) => { if (!r.ok) throw new Error(`Doc not found (${r.status})`); return r.text(); })
      .then((text) => {
        docCache.set(activeTab.docPath, text);
        setDocText(text);
      })
      .catch((e) => setErr(e.message || "Failed to load doc"))
      .finally(() => setLoading(false));
  }, [open, activeTab]);

  // Escape to close, F1 also closes (matches "opens" toggle in App.js)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key === "F1") { e.preventDefault(); onClose(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handlePrint = () => {
    // Open a plain, print-friendly window with just the current tab's content.
    // Works in both Electron and dev browser. Uses window.print() so the user
    // gets the OS print dialog.
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return;
    const title = `Pro Photo Sorter — ${activeTab.label}`;
    // Build content based on tab
    let bodyHtml = "";
    if (activeTab.key === "shortcuts") {
      bodyHtml = renderShortcutsForPrint();
    } else if (activeTab.key === "about") {
      bodyHtml = renderAboutForPrint();
    } else {
      // Convert markdown to a minimal, print-friendly HTML block.
      // We embed the raw markdown into a <pre>-like renderer via marked-lite:
      // actually just render markdown by re-using react-markdown wouldn't work
      // in the new window, so we hand-roll a very small markdown → HTML for print.
      bodyHtml = mdToHtml(docText);
    }
    w.document.open();
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: letter; margin: 0.75in; }
  html, body { font-family: Georgia, "Times New Roman", serif; color: #222; line-height: 1.5; }
  body { max-width: 7in; margin: 0 auto; padding: 0.25in 0; }
  h1 { font-size: 22pt; border-bottom: 2px solid #333; padding-bottom: 4pt; margin-top: 0; }
  h2 { font-size: 16pt; border-bottom: 1px solid #999; padding-bottom: 2pt; margin-top: 20pt; }
  h3 { font-size: 13pt; margin-top: 16pt; }
  h4 { font-size: 11pt; }
  p, li { font-size: 11pt; }
  code { font-family: "Courier New", monospace; background: #f0f0f0; padding: 1pt 3pt; border-radius: 2pt; font-size: 10pt; }
  pre { font-family: "Courier New", monospace; background: #f5f5f5; padding: 8pt; border: 1pt solid #ccc; border-radius: 3pt; font-size: 9.5pt; white-space: pre-wrap; word-break: break-word; }
  pre code { background: transparent; padding: 0; font-size: inherit; }
  table { border-collapse: collapse; margin: 8pt 0; width: 100%; }
  th, td { border: 1px solid #999; padding: 4pt 8pt; text-align: left; font-size: 10.5pt; vertical-align: top; }
  th { background: #eee; }
  blockquote { border-left: 3pt solid #999; margin: 8pt 0; padding: 2pt 8pt; color: #444; }
  ul, ol { padding-left: 20pt; }
  .footer { margin-top: 24pt; padding-top: 8pt; border-top: 1px solid #999; font-size: 9pt; color: #666; text-align: center; }
</style>
</head><body>
<h1>${escapeHtml(title)}</h1>
${bodyHtml}
<div class="footer">Pro Photo Sorter v${escapeHtml(buildInfo.version)} · ${escapeHtml(buildInfo.buildDate)}</div>
</body></html>`);
    w.document.close();
    // Give the new window a beat to render before triggering print
    setTimeout(() => { try { w.focus(); w.print(); } catch { /* user can Ctrl+P */ } }, 250);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      data-testid="help-modal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="pane rounded-lg shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col">
        <div className="px-4 py-3 border-b border-app flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <HelpCircle size={18} className="text-primary-earth shrink-0" />
            <h2 className="font-heading font-semibold text-lg truncate">Help &amp; About</h2>
            <span className="text-[10px] font-mono text-dim ml-1">v{buildInfo.version}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {tab !== "license" && (
              <button
                onClick={handlePrint}
                className="px-2.5 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1"
                data-testid="help-print-btn"
                title="Print the current tab"
              >
                <Printer size={12} /> Print
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded flex items-center justify-center hover:bg-surface-hover"
              data-testid="help-close-btn"
              title="Close (Esc)"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Tabs column */}
          <div className="w-40 border-r border-app py-2 shrink-0">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    active ? "bg-primary-earth/20 text-primary-earth" : "hover:bg-surface-hover text-app"
                  }`}
                  data-testid={`help-tab-${t.key}`}
                >
                  <Icon size={14} className="shrink-0" />
                  <span className="truncate">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content pane */}
          <div className="flex-1 overflow-auto p-6" data-testid={`help-panel-${tab}`}>
            {tab === "shortcuts" ? (
              <ShortcutsView />
            ) : tab === "about" ? (
              <AboutView />
            ) : tab === "license" ? (
              <LicenseSection />
            ) : loading ? (
              <div className="text-dim italic text-sm">Loading…</div>
            ) : err ? (
              <div className="text-sm text-dim italic">
                Couldn't load this doc: {err}
                <div className="mt-2 text-xs">Docs live in <code className="bg-surface-hover px-1 rounded">public/docs/</code>. If you're running from a plain <code className="bg-surface-hover px-1 rounded">yarn start</code>, run <code className="bg-surface-hover px-1 rounded">run-app.bat</code> once to sync them.</div>
              </div>
            ) : (
              <div className="prose-md">
                <ReactMarkdown>{docText}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shortcuts view (also used for print) ──────────────────────────────────
const SHORTCUTS = [
  ["←  /  →", "Previous / next photo"],
  ["Space", "Skip (advance without storing)"],
  ["M", "Move (Store + delete source)"],
  ["Del", "Delete the current photo"],
  ["S", "Store the current photo"],
  ["0 – 5", "Star rating (0 clears)"],
  ["Ctrl+F", "Open Search"],
  ["Ctrl+B", "Open Batch modal"],
  ["Ctrl+E", "Open Image Editor"],
  ["Ctrl+Shift+W", "Toggle watermark for this photo"],
  ["F1", "Toggle this Help window"],
  ["Esc", "Close any modal / exit Cull Mode"],
];

function ShortcutsView() {
  return (
    <div>
      <h2 className="font-heading text-lg mb-3">Keyboard Shortcuts</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-dim text-xs uppercase tracking-widest">
            <th className="pb-2 font-heading">Key</th>
            <th className="pb-2 font-heading">Action</th>
          </tr>
        </thead>
        <tbody>
          {SHORTCUTS.map(([key, action]) => (
            <tr key={key} className="border-t border-app/40">
              <td className="py-2 pr-4"><span className="kbd">{key}</span></td>
              <td className="py-2 text-app">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-dim mt-4">
        Click <strong>Print</strong> above to get a paper copy for your desk.
      </p>
    </div>
  );
}

function AboutView() {
  return (
    <div className="space-y-4">
      <h2 className="font-heading text-lg">Pro Photo Sorter</h2>
      <p className="text-sm text-app">
        A fully offline Windows desktop app for photographers who shoot faster than they file.
        Built with React + Electron. No cloud, no upload, no internet needed.
      </p>
      <div className="pane rounded p-3 space-y-1 text-sm font-mono">
        <div><span className="text-dim">Version:</span> <span className="text-primary-earth">v{buildInfo.version}</span></div>
        <div><span className="text-dim">Build:</span> {buildInfo.buildDate}</div>
        <div><span className="text-dim">Storage:</span> localStorage (offline)</div>
      </div>
      <p className="text-xs text-dim">
        Built for Captain Kurt. Icons: Lucide. Markdown: react-markdown.
      </p>
      <p className="text-xs text-dim">
        Report bugs by including the version string above. Screenshots + steps to reproduce speed the fix.
      </p>
    </div>
  );
}

// ── Print helpers ─────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// Tiny markdown → HTML converter for the print window. Handles the subset
// used in our docs: headings, bold, italic, inline code, fenced code blocks,
// unordered/ordered lists, tables (pipe format), links, horizontal rules.
function mdToHtml(md) {
  if (!md) return "";
  const lines = md.split(/\r?\n/);
  let html = "";
  let inCode = false;
  let inList = false;
  let listTag = "ul";
  let inTable = false;
  let tableRows = [];

  const flushList = () => { if (inList) { html += `</${listTag}>`; inList = false; } };
  const flushTable = () => {
    if (!inTable) return;
    inTable = false;
    if (tableRows.length < 2) { tableRows = []; return; }
    const header = tableRows[0];
    const bodyRows = tableRows.slice(2); // skip separator row
    html += "<table><thead><tr>" +
      header.map((c) => `<th>${inlineMd(c.trim())}</th>`).join("") + "</tr></thead><tbody>";
    for (const r of bodyRows) {
      html += "<tr>" + r.map((c) => `<td>${inlineMd(c.trim())}</td>`).join("") + "</tr>";
    }
    html += "</tbody></table>";
    tableRows = [];
  };

  const inlineMd = (t) => {
    return escapeHtml(t)
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  };

  for (let raw of lines) {
    // Fenced code
    if (/^```/.test(raw)) {
      flushList(); flushTable();
      if (!inCode) { inCode = true; html += "<pre><code>"; }
      else { inCode = false; html += "</code></pre>"; }
      continue;
    }
    if (inCode) { html += escapeHtml(raw) + "\n"; continue; }

    // Table row?
    if (/^\|.*\|\s*$/.test(raw)) {
      flushList();
      const cells = raw.trim().replace(/^\||\|$/g, "").split("|");
      if (!inTable) inTable = true;
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headings
    let m = raw.match(/^(#{1,6})\s+(.*)$/);
    if (m) { flushList(); html += `<h${m[1].length}>${inlineMd(m[2])}</h${m[1].length}>`; continue; }

    // HR
    if (/^-{3,}\s*$/.test(raw)) { flushList(); html += "<hr />"; continue; }

    // Unordered list
    if (/^\s*[-*]\s+/.test(raw)) {
      if (!inList || listTag !== "ul") { flushList(); html += "<ul>"; inList = true; listTag = "ul"; }
      html += `<li>${inlineMd(raw.replace(/^\s*[-*]\s+/, ""))}</li>`;
      continue;
    }
    // Ordered list
    if (/^\s*\d+\.\s+/.test(raw)) {
      if (!inList || listTag !== "ol") { flushList(); html += "<ol>"; inList = true; listTag = "ol"; }
      html += `<li>${inlineMd(raw.replace(/^\s*\d+\.\s+/, ""))}</li>`;
      continue;
    }

    // Blank line
    if (raw.trim() === "") { flushList(); html += ""; continue; }

    flushList();
    html += `<p>${inlineMd(raw)}</p>`;
  }
  flushList();
  flushTable();
  if (inCode) html += "</code></pre>";
  return html;
}

function renderShortcutsForPrint() {
  const rows = SHORTCUTS.map(
    ([k, a]) => `<tr><td><code>${escapeHtml(k)}</code></td><td>${escapeHtml(a)}</td></tr>`
  ).join("");
  return `<table><thead><tr><th style="width:30%">Key</th><th>Action</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderAboutForPrint() {
  return `
    <p>A fully offline Windows desktop app for photographers who shoot faster than they file. Built with React + Electron. No cloud, no upload, no internet needed.</p>
    <table>
      <tr><th>Version</th><td>v${escapeHtml(buildInfo.version)}</td></tr>
      <tr><th>Build date</th><td>${escapeHtml(buildInfo.buildDate)}</td></tr>
      <tr><th>Storage</th><td>localStorage (offline)</td></tr>
    </table>
    <p><em>Built for Captain Kurt. Icons: Lucide. Markdown: react-markdown.</em></p>
  `;
}

import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, Search, FolderOpen, Play, Save, Star, Trash2, RotateCcw } from "lucide-react";
import { pickDirectory } from "../lib/fsapi";
import { searchPhotos } from "../lib/photoSearch";
import { toast } from "sonner";

const SAVED_KEY = "pps.savedSearches.v1";

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
}
function persistSaved(arr) {
  try { localStorage.setItem(SAVED_KEY, JSON.stringify(arr)); } catch { /* ignore */ }
}

/**
 * Search modal — configure filters, run a recursive scan, load matches into filmstrip.
 *
 * Props:
 *   open, onClose
 *   destRoot, destRootName (default search root)
 *   categories (for building the token multi-select)
 *   onLoadResults(matches[]) — matches will populate the filmstrip in batch mode
 */
export default function SearchModal({ open, onClose, destRoot, destRootName, categories, onLoadResults }) {
  const [searchRoot, setSearchRoot] = useState(null); // { handle, name }
  const [folderTokens, setFolderTokens] = useState([]);
  const [filenameTokens, setFilenameTokens] = useState([]);
  const [logic, setLogic] = useState("any"); // "any" | "all"
  const [minStars, setMinStars] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [text, setText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ scanned: 0, matched: 0 });
  const [results, setResults] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);
  const [saveName, setSaveName] = useState("");
  const abortRef = useRef(null);

  // Initialise search root from destination on open
  useEffect(() => {
    if (!open) return;
    setSavedSearches(loadSaved());
    if (destRoot && !searchRoot) {
      setSearchRoot({ handle: destRoot, name: destRootName });
    }
  }, [open, destRoot, destRootName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Escape closes
  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && !scanning && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, scanning, onClose]);

  // Cancel scan on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const allItems = useMemo(() => {
    return categories.flatMap((c) => c.items.map((it) => ({ ...it, catName: c.name })));
  }, [categories]);

  const changeRoot = async () => {
    try {
      const h = await pickDirectory({ id: "pps-search-root", startIn: searchRoot?.handle });
      setSearchRoot({ handle: h, name: h.name });
    } catch (e) {
      if (e?.name !== "AbortError") toast.error(e.message || "Couldn't pick folder");
    }
  };

  const toggleToken = (list, setList, label) => {
    setList(list.includes(label) ? list.filter((t) => t !== label) : [...list, label]);
  };

  const runSearch = async () => {
    if (!searchRoot?.handle) { toast.error("Pick a search root first"); return; }
    setScanning(true);
    setResults([]);
    setProgress({ scanned: 0, matched: 0 });
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const filters = {
      folderTokens, filenameTokens, logic, minStars,
      dateFrom: dateFrom || null, dateTo: dateTo || null,
      text: text || "",
    };
    const found = [];
    try {
      for await (const entry of searchPhotos(searchRoot.handle, searchRoot.name, filters, {
        signal: ctrl.signal,
        onProgress: (p) => setProgress((cur) => ({ ...cur, scanned: p.scanned })),
      })) {
        found.push(entry);
        setResults([...found]);
        setProgress({ scanned: found.length > 0 ? Math.max(found.length, progress.scanned) : progress.scanned, matched: found.length });
      }
      toast.success(`Found ${found.length} photo${found.length !== 1 ? "s" : ""}`, {
        description: `Scanned in ${searchRoot.name}`,
      });
    } catch (e) {
      if (e.name !== "AbortError") toast.error("Search error: " + e.message);
    } finally {
      setScanning(false);
    }
  };

  const cancelSearch = () => { abortRef.current?.abort(); setScanning(false); };

  const loadIntoFilmstrip = () => {
    if (results.length === 0) return;
    onLoadResults(results, searchRoot?.name || "Search results");
    onClose();
  };

  const currentQuery = () => ({
    folderTokens, filenameTokens, logic, minStars, dateFrom, dateTo, text,
  });

  const saveCurrent = () => {
    if (!saveName.trim()) { toast.error("Give your search a name"); return; }
    const q = { id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: saveName.trim(), ...currentQuery() };
    const next = [q, ...savedSearches.filter((s) => s.name !== saveName.trim())].slice(0, 20);
    setSavedSearches(next);
    persistSaved(next);
    setSaveName("");
    toast.success(`Saved: ${q.name}`);
  };

  const loadSavedQuery = (s) => {
    setFolderTokens(s.folderTokens || []);
    setFilenameTokens(s.filenameTokens || []);
    setLogic(s.logic || "any");
    setMinStars(s.minStars || 0);
    setDateFrom(s.dateFrom || "");
    setDateTo(s.dateTo || "");
    setText(s.text || "");
    toast.info(`Loaded: ${s.name}`);
  };

  const deleteSavedQuery = (id) => {
    const next = savedSearches.filter((s) => s.id !== id);
    setSavedSearches(next);
    persistSaved(next);
  };

  const resetFilters = () => {
    setFolderTokens([]);
    setFilenameTokens([]);
    setLogic("any");
    setMinStars(0);
    setDateFrom("");
    setDateTo("");
    setText("");
    setResults([]);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      data-testid="search-modal"
    >
      <div className="pane rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-app">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-primary-earth" />
            <h2 className="font-heading font-semibold">Search Photos</h2>
          </div>
          <button onClick={onClose} disabled={scanning}
                  className="p-1 rounded hover:bg-surface-hover disabled:opacity-40"
                  data-testid="search-close">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-auto flex-1 p-4 space-y-4">
          {/* Search root */}
          <section>
            <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1">Search in</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 pane rounded px-2 py-1.5 text-xs font-mono truncate" title={searchRoot?.name || "None"}>
                {searchRoot?.name || <span className="text-dim italic">No folder selected</span>}
              </div>
              <button onClick={changeRoot}
                      className="px-2 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1"
                      data-testid="search-pick-root">
                <FolderOpen size={12} /> Change
              </button>
            </div>
          </section>

          {/* Free text */}
          <section>
            <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1">Text search</div>
            <input
              type="text"
              placeholder="Match anywhere in the file path or name…"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full bg-app border border-app rounded px-2 py-1.5 text-xs focus-ring"
              data-testid="search-text"
            />
          </section>

          {/* Token pickers */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1">Match Folders</div>
              <div className="pane rounded p-2 flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {allItems.length === 0 && <span className="text-xs text-dim italic">No categories defined.</span>}
                {allItems.map((it) => (
                  <button
                    key={"f-" + it.id}
                    onClick={() => toggleToken(folderTokens, setFolderTokens, it.label)}
                    className={`px-2 py-0.5 rounded text-xs border ${
                      folderTokens.includes(it.label)
                        ? "bg-primary-earth text-[color:var(--text-inverse)] border-primary-earth"
                        : "bg-app border-app hover:bg-surface-hover"
                    }`}
                    data-testid={`search-folder-token-${it.id}`}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1">Match Filename</div>
              <div className="pane rounded p-2 flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {allItems.length === 0 && <span className="text-xs text-dim italic">No categories defined.</span>}
                {allItems.map((it) => (
                  <button
                    key={"n-" + it.id}
                    onClick={() => toggleToken(filenameTokens, setFilenameTokens, it.label)}
                    className={`px-2 py-0.5 rounded text-xs border ${
                      filenameTokens.includes(it.label)
                        ? "bg-primary-earth text-[color:var(--text-inverse)] border-primary-earth"
                        : "bg-app border-app hover:bg-surface-hover"
                    }`}
                    data-testid={`search-filename-token-${it.id}`}
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Logic + Stars + Dates */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1">Match logic</div>
              <div className="flex rounded overflow-hidden border border-app">
                <button
                  onClick={() => setLogic("any")}
                  className={`flex-1 px-2 py-1 text-xs ${logic === "any" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover"}`}
                  data-testid="search-logic-any"
                >ANY (or)</button>
                <button
                  onClick={() => setLogic("all")}
                  className={`flex-1 px-2 py-1 text-xs ${logic === "all" ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover"}`}
                  data-testid="search-logic-all"
                >ALL (and)</button>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1 flex items-center gap-1">
                <Star size={10} /> Min stars (from filename)
              </div>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMinStars(n)}
                    className={`w-8 py-1 text-xs rounded ${minStars === n ? "bg-primary-earth text-[color:var(--text-inverse)]" : "bg-app hover:bg-surface-hover border border-app"}`}
                    data-testid={`search-stars-${n}`}
                  >{n === 0 ? "any" : `${n}+`}</button>
                ))}
              </div>
              <div className="text-[10px] text-dim mt-0.5">Only works if photos were saved with _star3_ style in the filename.</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1">EXIF date range</div>
              <div className="flex items-center gap-1">
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                       className="flex-1 bg-app border border-app rounded px-2 py-1 text-xs focus-ring"
                       data-testid="search-date-from" />
                <span className="text-dim text-xs">–</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                       className="flex-1 bg-app border border-app rounded px-2 py-1 text-xs focus-ring"
                       data-testid="search-date-to" />
              </div>
              <div className="text-[10px] text-dim mt-0.5">Reads EXIF DateTimeOriginal (slower — only enable if needed).</div>
            </div>
          </section>

          {/* Saved searches */}
          <section>
            <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1">Saved searches</div>
            {savedSearches.length === 0 ? (
              <div className="text-xs text-dim italic">None saved yet.</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {savedSearches.map((s) => (
                  <div key={s.id}
                       className="flex items-center gap-1 pl-2 pr-1 py-0.5 rounded border border-app bg-app text-xs group">
                    <button onClick={() => loadSavedQuery(s)} className="hover:text-primary-earth"
                            data-testid={`search-saved-load-${s.id}`}>
                      {s.name}
                    </button>
                    <button onClick={() => deleteSavedQuery(s.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-hover text-dim"
                            data-testid={`search-saved-delete-${s.id}`}>
                      <X size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1 mt-1">
              <input type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)}
                     placeholder="Save current query as…"
                     className="flex-1 bg-app border border-app rounded px-2 py-1 text-xs focus-ring"
                     data-testid="search-save-name" />
              <button onClick={saveCurrent}
                      className="px-2 py-1 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1"
                      data-testid="search-save-btn">
                <Save size={12} /> Save
              </button>
            </div>
          </section>

          {/* Results preview */}
          {(scanning || results.length > 0) && (
            <section>
              <div className="text-[10px] uppercase tracking-widest text-dim font-heading mb-1">
                Results
              </div>
              <div className="text-xs text-dim mb-2" data-testid="search-progress">
                {scanning ? "Scanning…" : "Done."} {progress.scanned} photos scanned, <span className="text-app font-semibold">{results.length} matches</span>
              </div>
              <div className="pane rounded p-2 max-h-40 overflow-y-auto space-y-0.5">
                {results.slice(0, 100).map((r) => (
                  <div key={r.path + "/" + r.name} className="text-xs font-mono truncate text-dim">
                    {r.path}/<span className="text-app">{r.name}</span>
                  </div>
                ))}
                {results.length > 100 && (
                  <div className="text-xs text-dim italic pt-1">…and {results.length - 100} more.</div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-app flex items-center justify-between gap-2">
          <button onClick={resetFilters} disabled={scanning}
                  className="px-2.5 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1 disabled:opacity-40"
                  data-testid="search-reset">
            <RotateCcw size={12} /> Reset filters
          </button>
          <div className="flex items-center gap-2">
            {scanning ? (
              <button onClick={cancelSearch}
                      className="px-3 py-1.5 rounded bg-app hover:bg-surface-hover border border-app text-xs flex items-center gap-1"
                      data-testid="search-cancel">
                <X size={12} /> Cancel scan
              </button>
            ) : (
              <button onClick={runSearch}
                      className="px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] hover:opacity-90 text-xs font-semibold flex items-center gap-1"
                      data-testid="search-run">
                <Play size={12} /> Run search
              </button>
            )}
            <button onClick={loadIntoFilmstrip} disabled={scanning || results.length === 0}
                    className="px-3 py-1.5 rounded bg-primary-earth text-[color:var(--text-inverse)] hover:opacity-90 text-xs font-semibold flex items-center gap-1 disabled:opacity-40"
                    data-testid="search-load">
              <Play size={12} /> Load {results.length > 0 ? results.length : ""} into filmstrip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

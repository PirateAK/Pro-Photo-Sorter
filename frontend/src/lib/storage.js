// LocalStorage-backed persistence for categories, settings, ratings.
// v1.1 (Feb 2026): paired-list tag packs. Each pack has folderItems +
// filenameItems. Bumping the key wipes any legacy v2 data so users start
// with a clean paired-list model instead of migrating mismatched shapes.
const KEY = "pps.state.v1_1";

const DEFAULT_SETTINGS = {
  moveMode: false,
  filenameTemplate: "{folders}/{tags}{ext}",
  minStarFilter: 0,
  // Batch controls (Feb 2026)
  batchSizeLimit: 20, // max photos processed per batch run
  batchAfterAction: "keep", // "keep" | "move" | "delete" - fate of source after batch Store
  // Theme (Feb 2026 – Iter 8)
  theme: "dark", // "dark" | "light"
  // Startup behavior (Feb 2026 – Iter 11)
  autoReopenLast: true, // show the "Reopen last session?" toast on launch
  // Per-bar category memory (Feb 2026 – Iter 12)
  foldersCatId: null,
  tagsCatId: null,
  // Workflow (Feb 2026 – Iter 14)
  autoAdvanceOnStore: true, // after storing a single photo, advance to the next in the filmstrip
  // Watermark (Feb 2026 – Iter 15)
  watermarkEnabled: false,
  watermarkText: "© Your Studio",
};

const DEFAULT_STATE = {
  categories: [
    {
      id: "cat-default-1",
      name: "Wildlife (Example)",
      // Folder-path tags — used to build the destination folder tree
      folderItems: [
        { id: "wf-1", label: "Mammals",  iconType: "lucide", iconName: "Rabbit" },
        { id: "wf-2", label: "Birds",    iconType: "lucide", iconName: "Bird" },
        { id: "wf-3", label: "Reptiles", iconType: "lucide", iconName: "Triangle" },
        { id: "wf-4", label: "Fish",     iconType: "lucide", iconName: "Fish" },
      ],
      // Filename tags — appended to the destination filename
      filenameItems: [
        { id: "wn-1", label: "portrait", iconType: "lucide", iconName: "Aperture" },
        { id: "wn-2", label: "action",   iconType: "lucide", iconName: "Zap" },
        { id: "wn-3", label: "flying",   iconType: "lucide", iconName: "Wind" },
        { id: "wn-4", label: "feeding",  iconType: "lucide", iconName: "Utensils" },
        { id: "wn-5", label: "distant",  iconType: "lucide", iconName: "MapPin" },
        { id: "wn-6", label: "closeup",  iconType: "lucide", iconName: "Sparkles" },
      ],
    },
  ],
  settings: DEFAULT_SETTINGS,
  ratings: {}, // { [imagePath]: 1-5 }
  looks: [
    // { id, name, brightness, contrast, saturation, sharpness }
  ],
  exifOverrides: {}, // { [imagePath]: { date?, location?, camera? } }
};

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE; // No migration from older keys — v1.1 is a clean break
    const parsed = JSON.parse(raw);
    const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
    // Migrate legacy default template so existing users get nested-folder support
    if (settings.filenameTemplate === "{folder}/{labels}{ext}") {
      settings.filenameTemplate = "{folders}/{tags}{ext}";
    }
    // Defensive: any pack missing one of the two lists gets an empty one
    const categories = (parsed.categories || DEFAULT_STATE.categories).map((c) => ({
      ...c,
      folderItems: Array.isArray(c.folderItems) ? c.folderItems : [],
      filenameItems: Array.isArray(c.filenameItems) ? c.filenameItems : [],
    }));
    return {
      ...DEFAULT_STATE,
      ...parsed,
      categories,
      settings,
      ratings: parsed.ratings || {},
      looks: parsed.looks || [],
      exifOverrides: parsed.exifOverrides || {},
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("save failed", e);
  }
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export { DEFAULT_SETTINGS };

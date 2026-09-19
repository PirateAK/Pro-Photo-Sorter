// LocalStorage-backed persistence for categories, settings, ratings.
const KEY = "pps.state.v2";

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
      name: "Subjects (Basic)",
      items: [
        { id: "it-1", label: "portrait", iconType: "lucide", iconName: "User" },
        { id: "it-2", label: "landscape", iconType: "lucide", iconName: "Mountain" },
        { id: "it-3", label: "wildlife", iconType: "lucide", iconName: "Bird" },
        { id: "it-4", label: "macro", iconType: "lucide", iconName: "Flower2" },
        { id: "it-5", label: "action", iconType: "lucide", iconName: "Zap" },
        { id: "it-6", label: "group", iconType: "lucide", iconName: "Users" },
        { id: "it-7", label: "closeup", iconType: "lucide", iconName: "Aperture" },
        { id: "it-8", label: "night", iconType: "lucide", iconName: "Moon" },
      ],
    },
    {
      id: "cat-default-2",
      name: "Ratings",
      items: [
        { id: "it-r1", label: "pick", iconType: "lucide", iconName: "Star" },
        { id: "it-r2", label: "keep", iconType: "lucide", iconName: "Heart" },
        { id: "it-r3", label: "reject", iconType: "lucide", iconName: "X" },
        { id: "it-r4", label: "best", iconType: "lucide", iconName: "Trophy" },
        { id: "it-r5", label: "star3", iconType: "lucide", iconName: "Star" },
        { id: "it-r6", label: "star4", iconType: "lucide", iconName: "Star" },
        { id: "it-r7", label: "star5", iconType: "lucide", iconName: "Star" },
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
    if (!raw) {
      // Try to migrate from v1
      const v1 = localStorage.getItem("pps.state.v1");
      if (v1) {
        const parsed = JSON.parse(v1);
        return {
          ...DEFAULT_STATE,
          categories: parsed.categories || DEFAULT_STATE.categories,
        };
      }
      return DEFAULT_STATE;
    }
    const parsed = JSON.parse(raw);
    const settings = { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) };
    // Migrate legacy default template so existing users get nested-folder support
    if (settings.filenameTemplate === "{folder}/{labels}{ext}") {
      settings.filenameTemplate = "{folders}/{tags}{ext}";
    }
    return {
      ...DEFAULT_STATE,
      ...parsed,
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

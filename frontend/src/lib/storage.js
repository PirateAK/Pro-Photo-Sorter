// LocalStorage-backed persistence for categories, settings, ratings.
const KEY = "pps.state.v2";

const DEFAULT_SETTINGS = {
  moveMode: false,
  filenameTemplate: "{folders}/{tags}{ext}",
  minStarFilter: 0,
};

const DEFAULT_STATE = {
  categories: [
    {
      id: "cat-default-1",
      name: "Subject",
      items: [
        { id: "it-1", label: "portrait", iconType: "lucide", iconName: "User" },
        { id: "it-2", label: "landscape", iconType: "lucide", iconName: "Mountain" },
        { id: "it-3", label: "wildlife", iconType: "lucide", iconName: "Bird" },
        { id: "it-4", label: "macro", iconType: "lucide", iconName: "Flower2" },
      ],
    },
    {
      id: "cat-default-2",
      name: "Rating",
      items: [
        { id: "it-5", label: "pick", iconType: "lucide", iconName: "Star" },
        { id: "it-6", label: "keep", iconType: "lucide", iconName: "Heart" },
      ],
    },
  ],
  settings: DEFAULT_SETTINGS,
  ratings: {}, // { [imagePath]: 1-5 }
  looks: [
    // { id, name, brightness, contrast, saturation, sharpness }
  ],
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

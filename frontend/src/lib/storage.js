// LocalStorage-backed persistence for categories and app state.
const KEY = "pps.state.v1";

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
  history: [], // last actions for undo
};

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_STATE, ...parsed };
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

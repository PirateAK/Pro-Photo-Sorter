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
  // UI text size (Feb 2026 – v1.1.3). Values match preset scale factors.
  // 0.90 Compact · 1.00 Default · 1.10 Comfortable · 1.25 Large · 1.40 Extra Large
  uiScale: 1.10,
  // Filmstrip thumbnail height in px (v1.1.3). Presets: 96 S · 128 M · 176 L · 224 XL.
  thumbSize: 128,
};

const DEFAULT_STATE = {
  categories: [
    {
      id: "cat-starter-wildlife",
      name: "Wildlife",
      folderItems: [
        { id: "wf-1", label: "Mammals",  iconType: "lucide", iconName: "Rabbit" },
        { id: "wf-2", label: "Birds",    iconType: "lucide", iconName: "Bird" },
        { id: "wf-3", label: "Reptiles", iconType: "lucide", iconName: "Triangle" },
        { id: "wf-4", label: "Fish",     iconType: "lucide", iconName: "Fish" },
        { id: "wf-5", label: "Insects",  iconType: "lucide", iconName: "Sparkles" },
      ],
      filenameItems: [
        { id: "wn-1", label: "portrait", iconType: "lucide", iconName: "Aperture" },
        { id: "wn-2", label: "action",   iconType: "lucide", iconName: "Zap" },
        { id: "wn-3", label: "flying",   iconType: "lucide", iconName: "Wind" },
        { id: "wn-4", label: "feeding",  iconType: "lucide", iconName: "Utensils" },
        { id: "wn-5", label: "distant",  iconType: "lucide", iconName: "MapPin" },
        { id: "wn-6", label: "closeup",  iconType: "lucide", iconName: "Sparkles" },
      ],
    },
    {
      id: "cat-starter-wedding",
      name: "Wedding",
      folderItems: [
        { id: "wd-f1", label: "Getting-Ready", iconType: "lucide", iconName: "Sparkles" },
        { id: "wd-f2", label: "Ceremony",      iconType: "lucide", iconName: "Church" },
        { id: "wd-f3", label: "Portraits",     iconType: "lucide", iconName: "Users" },
        { id: "wd-f4", label: "Details",       iconType: "lucide", iconName: "Heart" },
        { id: "wd-f5", label: "Reception",     iconType: "lucide", iconName: "Wine" },
        { id: "wd-f6", label: "First-Dance",   iconType: "lucide", iconName: "Music" },
      ],
      filenameItems: [
        { id: "wd-n1", label: "candid",  iconType: "lucide", iconName: "Camera" },
        { id: "wd-n2", label: "formal",  iconType: "lucide", iconName: "Star" },
        { id: "wd-n3", label: "moment",  iconType: "lucide", iconName: "Sparkles" },
        { id: "wd-n4", label: "wide",    iconType: "lucide", iconName: "Aperture" },
        { id: "wd-n5", label: "close",   iconType: "lucide", iconName: "Sun" },
        { id: "wd-n6", label: "bw",      iconType: "lucide", iconName: "Moon" },
      ],
    },
    {
      id: "cat-starter-portrait",
      name: "Portrait",
      folderItems: [
        { id: "pr-f1", label: "Headshot",   iconType: "lucide", iconName: "User" },
        { id: "pr-f2", label: "Family",     iconType: "lucide", iconName: "Users" },
        { id: "pr-f3", label: "Couple",     iconType: "lucide", iconName: "Heart" },
        { id: "pr-f4", label: "Kids",       iconType: "lucide", iconName: "Baby" },
        { id: "pr-f5", label: "Corporate",  iconType: "lucide", iconName: "Building" },
        { id: "pr-f6", label: "Fine-Art",   iconType: "lucide", iconName: "Sparkles" },
      ],
      filenameItems: [
        { id: "pr-n1", label: "studio",         iconType: "lucide", iconName: "Camera" },
        { id: "pr-n2", label: "environmental",  iconType: "lucide", iconName: "Trees" },
        { id: "pr-n3", label: "profile",        iconType: "lucide", iconName: "User" },
        { id: "pr-n4", label: "three-quarter",  iconType: "lucide", iconName: "Aperture" },
        { id: "pr-n5", label: "smile",          iconType: "lucide", iconName: "Sun" },
        { id: "pr-n6", label: "moody",          iconType: "lucide", iconName: "Moon" },
      ],
    },
    {
      id: "cat-starter-landscape",
      name: "Landscape",
      folderItems: [
        { id: "ls-f1", label: "Mountains", iconType: "lucide", iconName: "Mountain" },
        { id: "ls-f2", label: "Coastal",   iconType: "lucide", iconName: "Waves" },
        { id: "ls-f3", label: "Forest",    iconType: "lucide", iconName: "Trees" },
        { id: "ls-f4", label: "Desert",    iconType: "lucide", iconName: "Sun" },
        { id: "ls-f5", label: "Waterfall", iconType: "lucide", iconName: "CloudRain" },
        { id: "ls-f6", label: "Astro",     iconType: "lucide", iconName: "Moon" },
      ],
      filenameItems: [
        { id: "ls-n1", label: "sunrise",       iconType: "lucide", iconName: "Sunrise" },
        { id: "ls-n2", label: "sunset",        iconType: "lucide", iconName: "Sunset" },
        { id: "ls-n3", label: "golden-hour",   iconType: "lucide", iconName: "Sun" },
        { id: "ls-n4", label: "blue-hour",     iconType: "lucide", iconName: "Cloud" },
        { id: "ls-n5", label: "panorama",      iconType: "lucide", iconName: "Aperture" },
        { id: "ls-n6", label: "long-exposure", iconType: "lucide", iconName: "Wind" },
      ],
    },
    {
      id: "cat-starter-sports",
      name: "Sports",
      folderItems: [
        { id: "sp-f1", label: "Game",      iconType: "lucide", iconName: "Flag" },
        { id: "sp-f2", label: "Practice",  iconType: "lucide", iconName: "Zap" },
        { id: "sp-f3", label: "Portraits", iconType: "lucide", iconName: "Users" },
        { id: "sp-f4", label: "Team",      iconType: "lucide", iconName: "Trophy" },
        { id: "sp-f5", label: "Sidelines", iconType: "lucide", iconName: "Camera" },
        { id: "sp-f6", label: "Awards",    iconType: "lucide", iconName: "Award" },
      ],
      filenameItems: [
        { id: "sp-n1", label: "action",       iconType: "lucide", iconName: "Zap" },
        { id: "sp-n2", label: "keeper",       iconType: "lucide", iconName: "Star" },
        { id: "sp-n3", label: "celebration",  iconType: "lucide", iconName: "Sparkles" },
        { id: "sp-n4", label: "close",        iconType: "lucide", iconName: "Aperture" },
        { id: "sp-n5", label: "wide",         iconType: "lucide", iconName: "Camera" },
        { id: "sp-n6", label: "sequence",     iconType: "lucide", iconName: "Flame" },
      ],
    },
    {
      id: "cat-starter-realestate",
      name: "Real Estate",
      folderItems: [
        { id: "re-f1", label: "Exterior", iconType: "lucide", iconName: "Home" },
        { id: "re-f2", label: "Interior", iconType: "lucide", iconName: "Building" },
        { id: "re-f3", label: "Kitchen",  iconType: "lucide", iconName: "Utensils" },
        { id: "re-f4", label: "Bedroom",  iconType: "lucide", iconName: "Moon" },
        { id: "re-f5", label: "Bathroom", iconType: "lucide", iconName: "Waves" },
        { id: "re-f6", label: "Yard",     iconType: "lucide", iconName: "Trees" },
        { id: "re-f7", label: "Twilight", iconType: "lucide", iconName: "Sunset" },
      ],
      filenameItems: [
        { id: "re-n1", label: "wide",       iconType: "lucide", iconName: "Aperture" },
        { id: "re-n2", label: "detail",     iconType: "lucide", iconName: "Sparkles" },
        { id: "re-n3", label: "hdr",        iconType: "lucide", iconName: "Sun" },
        { id: "re-n4", label: "straight",   iconType: "lucide", iconName: "Square" },
        { id: "re-n5", label: "lifestyle",  iconType: "lucide", iconName: "Heart" },
        { id: "re-n6", label: "aerial",     iconType: "lucide", iconName: "Plane" },
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

// Starter pack IDs — used by "Restore starter packs" in Settings so we can
// merge missing packs into an existing user's library without wiping their
// customizations.
export const STARTER_PACK_IDS = [
  "cat-starter-wildlife",
  "cat-starter-wedding",
  "cat-starter-portrait",
  "cat-starter-landscape",
  "cat-starter-sports",
  "cat-starter-realestate",
];

// Return the full set of starter packs, keyed for merging.
export function getStarterPacks() {
  return DEFAULT_STATE.categories.filter((c) => STARTER_PACK_IDS.includes(c.id));
}

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
    // Defensive: any pack missing one of the two lists gets an empty one.
    // Also migrate legacy pack IDs (v1.1.4) so the "Restore starter packs"
    // dedup logic sees the user's existing Wildlife pack and doesn't add a
    // duplicate. Legacy id "cat-default-1" was the sole seeded pack in v1.1.3
    // and earlier; if its name still starts with "Wildlife" we retag it as
    // the new starter Wildlife id. User customizations to items/labels are
    // preserved.
    const categories = (parsed.categories || DEFAULT_STATE.categories).map((c) => {
      let id = c.id;
      if (id === "cat-default-1" && typeof c.name === "string" && c.name.toLowerCase().startsWith("wildlife")) {
        id = "cat-starter-wildlife";
      }
      return {
        ...c,
        id,
        folderItems: Array.isArray(c.folderItems) ? c.folderItems : [],
        filenameItems: Array.isArray(c.filenameItems) ? c.filenameItems : [],
      };
    });
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

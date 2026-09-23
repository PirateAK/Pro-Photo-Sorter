// LocalStorage-backed persistence for categories, settings, ratings.
// v1.1 (Feb 2026): paired-list tag packs. Each pack has folderItems +
// filenameItems. Bumping the key wipes any legacy v2 data so users start
// with a clean paired-list model instead of migrating mismatched shapes.
// v1.2.9: exported STATE_KEY + wired Safety-Backup mirror on every save.
export const STATE_KEY = "pps.state.v1_1";
const KEY = STATE_KEY;

import { safetyWrite } from "./electronBridge.js";
import { getLicense, LICENSE_STORAGE_KEY } from "./license.js";

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
  // Default location that fills the on-viewer EXIF Location chip whenever a
  // photo has no per-image location override (v1.1.7). Empty string means
  // "no default — show whatever EXIF GPS translates to (usually nothing)".
  defaultLocation: "",
  // v1.2.3 — Auto-update opt-in. On launch, if true AND the app is inside
  // Electron, we ping GitHub Releases (via electron-updater) once per
  // launch and surface an in-app banner when a newer version is out.
  checkForUpdates: false,
  // v1.2.3 — Auto-backup tag packs to <destination>/.pps-backups/
  // Keep last 7 snapshots. Fires at most once per calendar day.
  autoBackupTagPacks: true,
  // Bookkeeping — last successful backup date (YYYY-MM-DD). Never edit by
  // hand; the backups helper writes this after a successful snapshot.
  lastTagBackupDate: "",
};

const DEFAULT_STATE = {
  categories: [
    // v1.3 — new starter packs use the cascade shape: Category → Sub-Folders → Filename Tags.
    // No more pack-level folderItems / filenameItems.
    {
      id: "cat-starter-wildlife",
      name: "Wildlife",
      subfolders: [
        {
          id: "wf-sub-mammals", name: "Mammals", iconType: "lucide", iconName: "Rabbit",
          filenameItems: [
            { id: "wf-mm-1", label: "portrait", iconType: "lucide", iconName: "Aperture" },
            { id: "wf-mm-2", label: "action",   iconType: "lucide", iconName: "Zap" },
            { id: "wf-mm-3", label: "feeding",  iconType: "lucide", iconName: "Utensils" },
            { id: "wf-mm-4", label: "closeup",  iconType: "lucide", iconName: "Sparkles" },
          ],
        },
        {
          id: "wf-sub-birds", name: "Birds", iconType: "lucide", iconName: "Bird",
          filenameItems: [
            { id: "wf-bd-1", label: "portrait", iconType: "lucide", iconName: "Aperture" },
            { id: "wf-bd-2", label: "flying",   iconType: "lucide", iconName: "Wind" },
            { id: "wf-bd-3", label: "feeding",  iconType: "lucide", iconName: "Utensils" },
            { id: "wf-bd-4", label: "distant",  iconType: "lucide", iconName: "MapPin" },
          ],
        },
        { id: "wf-sub-reptiles", name: "Reptiles", iconType: "lucide", iconName: "Triangle", filenameItems: [] },
        { id: "wf-sub-fish",     name: "Fish",     iconType: "lucide", iconName: "Fish",     filenameItems: [] },
        { id: "wf-sub-insects",  name: "Insects",  iconType: "lucide", iconName: "Sparkles", filenameItems: [] },
      ],
    },
    {
      id: "cat-starter-wedding",
      name: "Wedding",
      subfolders: [
        { id: "wd-sub-getting-ready", name: "Getting-Ready", iconType: "lucide", iconName: "Sparkles",
          filenameItems: [
            { id: "wd-gr-1", label: "candid", iconType: "lucide", iconName: "Camera" },
            { id: "wd-gr-2", label: "detail", iconType: "lucide", iconName: "Sparkles" },
          ],
        },
        { id: "wd-sub-ceremony",   name: "Ceremony",   iconType: "lucide", iconName: "Church",
          filenameItems: [
            { id: "wd-ce-1", label: "wide",   iconType: "lucide", iconName: "Aperture" },
            { id: "wd-ce-2", label: "moment", iconType: "lucide", iconName: "Sparkles" },
            { id: "wd-ce-3", label: "bw",     iconType: "lucide", iconName: "Moon" },
          ],
        },
        { id: "wd-sub-portraits",  name: "Portraits",  iconType: "lucide", iconName: "Users",
          filenameItems: [
            { id: "wd-po-1", label: "formal", iconType: "lucide", iconName: "Star" },
            { id: "wd-po-2", label: "close",  iconType: "lucide", iconName: "Sun" },
          ],
        },
        { id: "wd-sub-details",    name: "Details",    iconType: "lucide", iconName: "Heart", filenameItems: [] },
        { id: "wd-sub-reception",  name: "Reception",  iconType: "lucide", iconName: "Wine",  filenameItems: [] },
        { id: "wd-sub-first-dance",name: "First-Dance",iconType: "lucide", iconName: "Music", filenameItems: [] },
      ],
    },
    {
      id: "cat-starter-portrait",
      name: "Portrait",
      subfolders: [
        { id: "pr-sub-headshot",  name: "Headshot",  iconType: "lucide", iconName: "User",     filenameItems: [
          { id: "pr-hs-1", label: "studio", iconType: "lucide", iconName: "Camera" },
          { id: "pr-hs-2", label: "smile",  iconType: "lucide", iconName: "Sun" },
        ] },
        { id: "pr-sub-family",    name: "Family",    iconType: "lucide", iconName: "Users",    filenameItems: [] },
        { id: "pr-sub-couple",    name: "Couple",    iconType: "lucide", iconName: "Heart",    filenameItems: [] },
        { id: "pr-sub-kids",      name: "Kids",      iconType: "lucide", iconName: "Baby",     filenameItems: [] },
        { id: "pr-sub-corporate", name: "Corporate", iconType: "lucide", iconName: "Building", filenameItems: [] },
        { id: "pr-sub-fineart",   name: "Fine-Art",  iconType: "lucide", iconName: "Sparkles", filenameItems: [] },
      ],
    },
    {
      id: "cat-starter-landscape",
      name: "Landscape",
      subfolders: [
        { id: "ls-sub-mountains", name: "Mountains", iconType: "lucide", iconName: "Mountain", filenameItems: [
          { id: "ls-mt-1", label: "sunrise",     iconType: "lucide", iconName: "Sunrise" },
          { id: "ls-mt-2", label: "sunset",      iconType: "lucide", iconName: "Sunset" },
          { id: "ls-mt-3", label: "golden-hour", iconType: "lucide", iconName: "Sun" },
        ] },
        { id: "ls-sub-coastal",   name: "Coastal",   iconType: "lucide", iconName: "Waves",    filenameItems: [] },
        { id: "ls-sub-forest",    name: "Forest",    iconType: "lucide", iconName: "Trees",    filenameItems: [] },
        { id: "ls-sub-desert",    name: "Desert",    iconType: "lucide", iconName: "Sun",      filenameItems: [] },
        { id: "ls-sub-waterfall", name: "Waterfall", iconType: "lucide", iconName: "CloudRain",filenameItems: [] },
        { id: "ls-sub-astro",     name: "Astro",     iconType: "lucide", iconName: "Moon",     filenameItems: [] },
      ],
    },
    {
      id: "cat-starter-sports",
      name: "Sports",
      subfolders: [
        {
          id: "sp-sub-baseball",  name: "Baseball",  iconType: "lucide", iconName: "Circle",
          filenameItems: [
            { id: "sp-bb-1", label: "Yankees",  iconType: "lucide", iconName: "Star" },
            { id: "sp-bb-2", label: "RedSox",   iconType: "lucide", iconName: "Star" },
            { id: "sp-bb-3", label: "Dodgers",  iconType: "lucide", iconName: "Star" },
            { id: "sp-bb-4", label: "Cubs",     iconType: "lucide", iconName: "Star" },
            { id: "sp-bb-5", label: "Mets",     iconType: "lucide", iconName: "Star" },
          ],
        },
        {
          id: "sp-sub-basketball", name: "Basketball", iconType: "lucide", iconName: "Circle",
          filenameItems: [
            { id: "sp-bk-1", label: "Lakers",   iconType: "lucide", iconName: "Star" },
            { id: "sp-bk-2", label: "Celtics",  iconType: "lucide", iconName: "Star" },
            { id: "sp-bk-3", label: "Bulls",    iconType: "lucide", iconName: "Star" },
            { id: "sp-bk-4", label: "Warriors", iconType: "lucide", iconName: "Star" },
          ],
        },
        {
          id: "sp-sub-football", name: "Football", iconType: "lucide", iconName: "Circle",
          filenameItems: [
            { id: "sp-fb-1", label: "Chiefs",   iconType: "lucide", iconName: "Star" },
            { id: "sp-fb-2", label: "49ers",    iconType: "lucide", iconName: "Star" },
            { id: "sp-fb-3", label: "Cowboys",  iconType: "lucide", iconName: "Star" },
            { id: "sp-fb-4", label: "Patriots", iconType: "lucide", iconName: "Star" },
          ],
        },
      ],
    },
    {
      id: "cat-starter-realestate",
      name: "Real Estate",
      subfolders: [
        { id: "re-sub-exterior", name: "Exterior", iconType: "lucide", iconName: "Home",     filenameItems: [
          { id: "re-ex-1", label: "wide",     iconType: "lucide", iconName: "Aperture" },
          { id: "re-ex-2", label: "twilight", iconType: "lucide", iconName: "Sunset" },
          { id: "re-ex-3", label: "aerial",   iconType: "lucide", iconName: "Plane" },
        ] },
        { id: "re-sub-interior", name: "Interior", iconType: "lucide", iconName: "Building", filenameItems: [
          { id: "re-in-1", label: "wide",     iconType: "lucide", iconName: "Aperture" },
          { id: "re-in-2", label: "detail",   iconType: "lucide", iconName: "Sparkles" },
          { id: "re-in-3", label: "hdr",      iconType: "lucide", iconName: "Sun" },
        ] },
        { id: "re-sub-kitchen",  name: "Kitchen",  iconType: "lucide", iconName: "Utensils", filenameItems: [] },
        { id: "re-sub-bedroom",  name: "Bedroom",  iconType: "lucide", iconName: "Moon",     filenameItems: [] },
        { id: "re-sub-bathroom", name: "Bathroom", iconType: "lucide", iconName: "Waves",    filenameItems: [] },
        { id: "re-sub-yard",     name: "Yard",     iconType: "lucide", iconName: "Trees",    filenameItems: [] },
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
      // v1.3 CASCADE MIGRATION: fold old folderItems + pack-level filenameItems
      // into subfolders so every category has exactly ONE child list.
      //   • each old folderItem  →  new empty sub-folder (icon carries over)
      //   • existing subfolders  →  preserved untouched
      //   • old pack-level filenameItems → new "_Unsorted filenames" sub-folder
      //     (leading underscore sorts to the top so Kurt spots + reorganizes it)
      // Zero data loss; duplicates left for the user to drag-merge.
      const existingSubs = Array.isArray(c.subfolders) ? c.subfolders : [];
      const legacyFolderItems = Array.isArray(c.folderItems) ? c.folderItems : [];
      const legacyFilenameItems = Array.isArray(c.filenameItems) ? c.filenameItems : [];
      const needsMigration = legacyFolderItems.length > 0 || legacyFilenameItems.length > 0;

      let subfolders = existingSubs.map((s) => ({
        ...s,
        filenameItems: Array.isArray(s.filenameItems) ? s.filenameItems : [],
      }));

      if (needsMigration) {
        // Old folderItems become empty sub-folders, prepended so they appear at top.
        const migratedFromFolders = legacyFolderItems.map((it, i) => ({
          id: `sub-mig-fp-${id}-${it.id || i}`,
          name: it.label || "Untitled",
          iconType: it.iconType,
          iconName: it.iconName,
          imageDataUrl: it.imageDataUrl,
          filenameItems: [],
        }));
        subfolders = [...migratedFromFolders, ...subfolders];

        // Loose pack-level filenames land in a dedicated bucket.
        if (legacyFilenameItems.length > 0) {
          subfolders.push({
            id: `sub-mig-un-${id}`,
            name: "_Unsorted filenames",
            iconType: "lucide",
            iconName: "Package",
            filenameItems: legacyFilenameItems,
          });
        }
      }

      // v1.1.6 seed for existing Sports pack (unchanged from prior release).
      if (id === "cat-starter-sports" && subfolders.length === 0) {
        const seed = DEFAULT_STATE.categories.find((p) => p.id === "cat-starter-sports");
        if (seed?.subfolders?.length) subfolders = seed.subfolders;
      }
      return {
        ...c,
        id,
        subfolders,
        // Drop the legacy fields to keep saved state clean going forward.
        folderItems: undefined,
        filenameItems: undefined,
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
    const json = JSON.stringify(state);
    localStorage.setItem(KEY, json);
    // v1.2.9 — fire-and-forget mirror to Documents\Pro Photo Sorter\Safety-Backups\
    // so a future userData wipe/rename can't destroy the user's tag packs.
    try {
      const license = getLicense();
      safetyWrite({ stateKey: KEY, state: json, licenseKey: LICENSE_STORAGE_KEY, license });
    } catch { /* mirror is best-effort; never block a save */ }
  } catch (e) {
    console.warn("save failed", e);
  }
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

export { DEFAULT_SETTINGS };

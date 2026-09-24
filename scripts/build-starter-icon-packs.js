// scripts/build-starter-icon-packs.js
//
// Generates the 6 bundled starter icon packs shipped with Pro Photo Sorter.
// Each icon is a 128×128 SVG data-URL that renders an emoji using the
// system emoji font (Segoe UI Emoji on Windows, Apple Color Emoji on
// macOS, Noto Color Emoji on Linux) — sharp at any scale, no PNG blob,
// works fully offline.
//
// Run with: node scripts/build-starter-icon-packs.js
// Outputs:
//   frontend/public/starter-icon-packs/*.pps-iconpack.json
//   frontend/public/starter-icon-packs/index.json      (manifest)

const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "frontend", "public", "starter-icon-packs");

function svgDataUrl(emoji) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><text x="64" y="96" font-size="96" text-anchor="middle" font-family="Segoe UI Emoji, Apple Color Emoji, Noto Color Emoji, EmojiOne Color, Twemoji Mozilla, sans-serif">${emoji}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

const PACKS = [
  {
    slug: "wildlife",
    displayName: "Wildlife",
    description: "Animals in the wild — birds, mammals, marine.",
    icons: [
      ["Bear", "🐻"], ["Deer", "🦌"], ["Wolf", "🐺"], ["Fox", "🦊"],
      ["Eagle", "🦅"], ["Owl", "🦉"], ["Duck", "🦆"], ["Swan", "🦢"],
      ["Fish", "🐟"], ["Whale", "🐋"], ["Turtle", "🐢"], ["Rabbit", "🐇"],
    ],
  },
  {
    slug: "wedding",
    displayName: "Wedding",
    description: "Ceremony, reception, portrait moments.",
    icons: [
      ["Rings", "💍"], ["Cake", "🎂"], ["Toast", "🥂"], ["Bride", "👰"],
      ["Groom", "🤵"], ["Bouquet", "💐"], ["Church", "⛪"], ["Kiss", "💋"],
      ["Dance", "💃"], ["Dove", "🕊️"],
    ],
  },
  {
    slug: "sports",
    displayName: "Sports",
    description: "Team, action, celebration.",
    icons: [
      ["Baseball", "⚾"], ["Football", "🏈"], ["Basketball", "🏀"],
      ["Soccer", "⚽"], ["Tennis", "🎾"], ["Volleyball", "🏐"],
      ["Golf", "⛳"], ["Trophy", "🏆"], ["Medal", "🥇"], ["Whistle", "📣"],
    ],
  },
  {
    slug: "holiday",
    displayName: "Holiday",
    description: "Seasonal celebrations across the year.",
    icons: [
      ["Christmas Tree", "🎄"], ["Pumpkin", "🎃"], ["Turkey", "🦃"],
      ["Fireworks", "🎆"], ["Menorah", "🕎"], ["Gift", "🎁"],
      ["Party", "🎉"], ["Balloon", "🎈"], ["Fourth", "🇺🇸"],
      ["Egg", "🥚"], ["Heart", "❤️"],
    ],
  },
  {
    slug: "family-portrait",
    displayName: "Family Portrait",
    description: "Generations — from babies to grandparents.",
    icons: [
      ["Baby", "👶"], ["Boy", "👦"], ["Girl", "👧"], ["Man", "👨"],
      ["Woman", "👩"], ["Grandpa", "👴"], ["Grandma", "👵"],
      ["Family", "👨‍👩‍👧‍👦"], ["Dog", "🐕"], ["Cat", "🐈"],
    ],
  },
  {
    slug: "nature-landscape",
    displayName: "Nature & Landscape",
    description: "Land, water, sky — the great outdoors.",
    icons: [
      ["Tree", "🌲"], ["Mountain", "⛰️"], ["Wave", "🌊"], ["Sunrise", "🌅"],
      ["Sunset", "🌇"], ["Flower", "🌸"], ["Beach", "🏖️"], ["Desert", "🏜️"],
      ["Volcano", "🌋"], ["Rainbow", "🌈"], ["Snow", "❄️"], ["Star", "⭐"],
    ],
  },
];

function buildPack(pack) {
  return {
    kind: "pps-iconpack",
    version: 1,
    scope: "global",
    sourceCategoryName: null,
    exportedAt: new Date().toISOString(),
    metadata: {
      builtin: true,
      slug: pack.slug,
      displayName: pack.displayName,
      description: pack.description,
    },
    images: pack.icons.map(([name, emoji]) => ({
      name,
      dataUrl: svgDataUrl(emoji),
    })),
  };
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const manifest = [];
for (const p of PACKS) {
  const payload = buildPack(p);
  const filename = `${p.slug}.pps-iconpack.json`;
  fs.writeFileSync(
    path.join(OUT_DIR, filename),
    JSON.stringify(payload, null, 2),
    "utf8"
  );
  manifest.push({
    slug: p.slug,
    displayName: p.displayName,
    description: p.description,
    filename,
    iconCount: p.icons.length,
    // Preview: first 4 icons for the modal card
    preview: p.icons.slice(0, 4).map(([name, emoji]) => ({
      name,
      dataUrl: svgDataUrl(emoji),
    })),
  });
  console.log(`✓ ${filename} — ${p.icons.length} icons`);
}

fs.writeFileSync(
  path.join(OUT_DIR, "index.json"),
  JSON.stringify({ version: 1, packs: manifest }, null, 2),
  "utf8"
);
console.log(`\n✓ index.json — ${manifest.length} packs`);
console.log(`\nOutput: ${OUT_DIR}`);

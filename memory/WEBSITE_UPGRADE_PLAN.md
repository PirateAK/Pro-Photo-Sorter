# MuskegMan Photography & Software — Website Upgrade Plan
Saved 2026-06 for Captain Kurt. STATUS: PARKED until payday. Nothing on the live
site changes until Kurt says "go". The original prompt is reproduced at the bottom.

---
## 1. What exists today (inspected 2026-06)

| Item | Finding |
|---|---|
| Repo | `github.com/PirateAK/Pro-Photo-Sorter` — **PUBLIC** repo, branch `main` |
| Hosting | GitHub Pages, source = `/docs` folder on `main` |
| Site type | **100% static** — one file `docs/index.html` (510 lines) + `docs/assets/*.png`, `robots.txt`, `sitemap.xml`, `.nojekyll` |
| Domain | `muskegman.com` live over HTTPS, served by GitHub.com. GoDaddy DNS: 4 A records → GitHub, `www` CNAME → `pirateak.github.io` |
| CNAME file | Present on GitHub (`docs/CNAME` = `muskegman.com`) but was **missing from the Emergent workspace**. Fixed: added `docs/CNAME` locally so future pushes can never drop the custom domain. |
| Backend | `/app/backend/server.py` is an unused 88-line FastAPI skeleton (status ping only). Not deployed. |
| Frontend | `/app/frontend` is the **desktop app** (Pro Photo Sorter + Tag Pack Creator), not the website. Uses hash routing (`#/tpc`) and `homepage: "./"` for Electron. Must not be reused as the public website. |
| Repo size | ~29 MB `.git`. Only images in repo are 6 small sample JPGs. No originals. Good. |
| Links to preserve | Gumroad: `muskegman.gumroad.com/l/gvmaas` (PPS), `muskegman.gumroad.com/l/PPS-TPC`. GitHub: repo + `/releases/latest`. Contact: leaderteamk@gmail.com |
| Existing anchors | `#top #features #how #lightroom #story #creator #faq` — keep working via the Software page |

### Can GitHub Pages alone do this?
**No.** GitHub Pages serves static files only. It cannot do: login, database,
file uploads, secret environment variables, watermark generation, or an admin
dashboard. Everything in the *public* half of the prompt is fine on Pages; the
*admin* half needs a real backend hosted elsewhere.

---
## 2. Recommended architecture (simplest secure split)

```
 muskegman.com  (GitHub Pages, FREE, stays exactly where it is)
 ├── /                         new hub home (photo hero + software)
 ├── /photography/             albums grid
 ├── /photography/<album>/     photo grid
 ├── /photography/<album>/<photo>/  detail page (SEO title/OG tags, "Coming soon")
 ├── /software/                product cards (data-driven)
 ├── /software/pro-photo-sorter/    = today's landing page, moved, anchors intact
 ├── /about/  /contact/
 ├── /data/catalog.json        PUBLIC-SAFE fields only (no original refs, no secrets)
 └── /photos/<id>-1600w.jpg    watermarked previews only, ≤1600px, ~250 KB each

 admin.muskegman.com  (Emergent full-stack deployment, PAID, separate project)
 ├── React admin dashboard (login, photos, albums, software, settings, preview)
 ├── FastAPI + MongoDB (full photo records incl. private fields)
 ├── Emergent Object Storage — PRIVATE bucket for original hi-res files
 ├── Pillow: makes watermarked 1600px preview from each original
 └── "Publish" button → commits catalog.json + previews + generated HTML pages
     to PirateAK/Pro-Photo-Sorter:/docs via GitHub API (fine-grained token
     stored as a backend secret). Pages redeploys in ~1 min.
```

Why this shape:
- Public site stays free, fast, SEO-friendly, and keeps working even if the
  admin app is paused or down.
- Originals never touch the public repo (repo is PUBLIC — this matters).
- "Preview before publish" is natural: admin renders drafts from MongoDB; the
  public site only changes when Kurt clicks Publish.
- Sales toggles live in MongoDB; Publish writes only the resolved public result
  (button + URL, or "Coming soon") into catalog.json.

Why a **separate Emergent project** for admin: this project's `frontend/` is
the desktop app. Deploying it would ship the desktop UI as the website. A
clean "MuskegMan Admin" project avoids breaking `pack-app.bat`/`pack-tpc.bat`.

### URL note (ambiguity in the prompt)
`/photography/[album]` and `/photography/[photo]` collide on a static host.
Use `/photography/<album>/` and `/photography/<album>/<photo-slug>/`.

---
## 3. Do-ability grid

Legend: **Easy** < 1 hr · **Medium** 2–4 hrs · **Hard** 1–2 full sessions ·
**NOT on Pages** = needs the paid admin backend. 💲 = costs money.

| # | Requirement | Grade | Where | Notes |
|---|---|---|---|---|
| 1 | Nav: Home/Photography/Software/About/Contact | Easy | Pages | Folder-per-route, `index.html` in each |
| 2 | New hub home page (hero, two CTAs, featured photo + software, footer) | Medium | Pages | Existing landing moves to `/software/pro-photo-sorter/`, all links kept |
| 3 | Albums, responsive grid, lightbox, lazy-load, captions, EXIF fields | Medium | Pages | Vanilla JS lightbox, `loading="lazy"`, `srcset` |
| 4 | Per-photo detail pages with SEO title/description/OG image | Medium | Pages | Pre-generated HTML per photo (static-site step) |
| 5 | "Digital downloads and prints coming soon" notice, no buy buttons | Easy | Pages | |
| 6 | Image deterrents (no drag, right-click only in viewer, no select, © notice, no originals) | Easy | Pages | CSS `user-select`, `draggable=false`, `contextmenu` handler scoped to viewer |
| 7 | Visible watermark on previews | Medium | Admin backend (Pillow) — interim: I run a script here | Never done in-browser |
| 8 | Dynamic © year | Easy | Pages | Baked at build + JS override |
| 9 | Software section, data-driven cards, external links `target=_blank rel=noopener` | Easy | Pages | From `software.json` |
| 10 | Full photo data schema (all ~30 fields) | Easy | Mongo model + public subset | Public JSON strips private fields |
| 11 | **Admin dashboard + secure login** | **Hard · NOT on Pages · 💲** | Emergent deploy | JWT auth via integration playbook; bcrypt; admin seeded from env |
| 12 | Photo/album CRUD, reorder, featured, delete-confirm | Medium | Admin | |
| 13 | Upload originals → private storage, auto-preview generation | Medium–Hard | Admin + Object Storage | Chunked upload for big files |
| 14 | Software product CRUD, edit Gumroad/GitHub links | Easy | Admin | |
| 15 | Homepage featured content + contact info editing | Easy | Admin | |
| 16 | Global + per-photo sales toggles, "missing URL → warning, button stays disabled" | Medium | Admin | Pure validation logic |
| 17 | External-services settings (providers, webhook, keys) | Medium | Admin | Keys stored as backend env vars only; UI shows "set/not set", never the value |
| 18 | Preview before publish | Medium | Admin | Draft render at `/admin/preview` |
| 19 | Publish → GitHub commit → Pages redeploy | Medium | Admin | GitHub fine-grained PAT (contents:write on this one repo) |
| 20 | Sitemap + robots | Easy | Generated on publish | |
| 21 | Backup/export/restore of catalog + settings | Easy | Admin (JSON export/import) + git history is a free backup | |
| 22 | Live payment / checkout | Deferred by design | Gumroad handles it later | No card data ever touches our code |

### Cost flags 💲
- **GitHub Pages**: free. Soft limits: 1 GB repo, 100 GB/month bandwidth. At
  ~250 KB per preview that is ~1,000–2,000 photos before we should move previews
  to object storage/CDN. Schema has a `previewUrl` field so that move is a
  config change, not a redesign.
- **Emergent deployment for admin**: paid (first-deploy ECU charge + ongoing
  hosting; check current plan pricing). This is the only new recurring cost.
  Can be paused when not editing — public site keeps working.
- **admin.muskegman.com subdomain**: free (one CNAME record at GoDaddy).
- **Gumroad** (digital downloads): no upfront cost, takes a cut per sale.
- **Print provider** (Pictorem / Printful / Prodigi / Fine Art America):
  choose later; typically no upfront cost, they keep the wholesale price.

---
## 4. Problems to fix BEFORE proceeding
1. ✅ **FIXED** — `docs/CNAME` was absent from the workspace. Added. Zero risk
   (identical to what GitHub already has). Goes live on next Save to GitHub.
2. ⚠️ **Repo is PUBLIC** — acceptable for previews, but: originals must never be
   committed, and the GitHub token for Publish must live only in the admin
   backend's environment. Add `docs/photos/originals/` to `.gitignore` as a
   belt-and-braces guard when Phase W1 starts.
3. ⚠️ **Do not reuse `/app/frontend` as the website** — it is the desktop app.
   Public site = generated static files in `docs/`; admin = separate project.
4. ℹ️ Pages caches for 10 minutes (`cache-control: max-age=600`) — expect a
   short delay after each Publish. Not a bug.
5. ℹ️ Kurt's local `git reset --hard origin/main && git clean -fd` routine is
   unaffected — `docs/` has no build artifacts.

**Verdict: safe to proceed in phases. Phase W1 costs nothing and gives a live
gallery. Phase W2 (admin) is the only part that needs payday.**

---
## 5. Phased build order

### Phase W0 — Prep (free, ~20 min)
- Commit `docs/CNAME` (done). Add `.gitignore` guard.
- Move current landing to `docs/software/pro-photo-sorter/index.html`; new
  minimal `/` that redirects or links there so nothing breaks the day it ships.

### Phase W1 — Public static site v1 (free, 1–2 sessions)
- `docs/data/catalog.json` + `docs/data/software.json` (hand-maintained by the
  agent via chat — Kurt uploads photos in chat, agent watermarks + resizes here
  with a script in `scripts/build-site.mjs`, never asks Kurt to type).
- Generator script produces all pages listed in §2. Lightbox, deterrents,
  © notice, "Coming soon", sitemap.
- Test: testing_agent on the generated `docs/` (routes, lightbox, no-drag,
  scoped right-click, mobile).
- Kurt's push command after this phase (copy-paste):
  `cd /d C:\Pro-Photo-Sorter && git fetch origin && git reset --hard origin/main`
  (site deploys from GitHub automatically; nothing to build locally).

### Phase W2 — Admin app (paid hosting, 3–4 sessions) — AFTER PAYDAY
- New Emergent project "MuskegMan Admin": FastAPI + MongoDB + React.
- Auth via integration_expert playbook (JWT). Admin account seeded from env.
- Models: Photo (all §10 fields), Album, SoftwareProduct, SiteSettings
  (global sales toggles, providers, contact, homepage featured), ServiceConfig
  (which secrets are set — values never returned to the browser).
- Object Storage playbook for originals (private). Pillow preview + watermark.
- Publish service: build public JSON + HTML + previews → GitHub API commit.
- Status chips: Draft / Published / Featured / Sales disabled / Digital enabled /
  Print enabled / Missing purchase link / Missing fulfillment info.
- Export/Import JSON. Delete confirmations.
- Deploy on Emergent; map `admin.muskegman.com`.
- Test: testing_agent full CRUD + publish dry-run.

### Phase W3 — Turn on sales (when Kurt is ready, 1 session)
- Digital: create Gumroad product(s), paste URL per photo (or one product with
  variants), flip toggles. Gumroad delivers the un-watermarked original —
  satisfies "authorized downloads bypass deterrents".
- Print: pick provider, enter product URL/ID per photo, flip toggles.
- Publish. Buttons replace "Coming soon" only where URL present.

---
## 6. Deliverables promised at the end of W2 (from the prompt)
Architecture summary · public + admin URLs · repo/branch · services + env vars
list · how to add first album/photo · how to add a software product · how to
enable digital sales · how to add a print provider · list of intentionally
disabled features · backup/restore procedure · test checklist.

---
## 7. Original prompt (verbatim, for reference)
(See chat 2026-06 — "This is the prompt to give emergent.AI to create my
photo-sales pages on GitHub." Key sections: Main navigation · Home page ·
Photography gallery · Image protection · Software section · Future-ready photo
schema · Admin dashboard · Sales controls · External services · Technical &
security · Deployment requirements. Copyright string to use:
"© {year} MuskegMan Photography. All rights reserved. Images may not be copied,
reproduced, modified, or redistributed without permission.")

// Gumroad license activation + trial-mode state.
//
// The app runs in TRIAL MODE until a valid Gumroad license key is activated.
// Trial mode forces a watermark ON and appends `_TRIAL` to every stored
// filename so unlicensed output is obviously marked.
//
// Activation flow:
//   1. User pastes their Gumroad key into the Help modal → License tab.
//   2. We POST to Gumroad's public /v2/licenses/verify endpoint.
//   3. On success we cache { key, activatedAt, email, saleId } in
//      localStorage under STORAGE_KEY. No further internet calls are made.
//
// Deactivation flow:
//   1. User clicks "Deactivate on this machine" in the Help modal.
//   2. We clear localStorage. Gumroad's use-count is NOT decremented from
//      the client (the decrement endpoint requires the seller's OAuth token,
//      which cannot safely ship in an Electron app). If the user hits their
//      use-count limit on a new PC, they email leaderteamk@gmail.com and
//      the seller resets it from the Gumroad Sales dashboard.
//
// All state changes fire a `license:changed` event so React components using
// the useLicense() hook re-render instantly.

const STORAGE_KEY = "gvmaas.license.v1";

export const GUMROAD_PRODUCT_ID = "sxHfeHU-l7nk1-LAdVrQZA==";
export const GUMROAD_PRODUCT_URL = "https://muskegman.gumroad.com/l/gvmaas";
export const VERIFY_URL = "https://api.gumroad.com/v2/licenses/verify";

// Watermark applied to every stored photo when unlicensed.
export const TRIAL_WATERMARK_TEXT = "TRIAL - Pro Photo Sorter (unlicensed)";

// ── Storage ───────────────────────────────────────────────────────────────
export function getLicense() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLicense(record) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  notify();
}

function clearLicense() {
  localStorage.removeItem(STORAGE_KEY);
  notify();
}

export function isTrialMode() {
  return !getLicense();
}

// ── Trial filename helper ─────────────────────────────────────────────────
// "photo.jpg" → "photo_TRIAL.jpg". Preserves extension. Called by store flows.
export function applyTrialSuffix(fileName) {
  if (!fileName) return fileName;
  const dot = fileName.lastIndexOf(".");
  if (dot <= 0) return `${fileName}_TRIAL`;
  return `${fileName.slice(0, dot)}_TRIAL${fileName.slice(dot)}`;
}

// ── Pub/Sub for React ─────────────────────────────────────────────────────
const listeners = new Set();
function notify() {
  for (const cb of listeners) {
    try { cb(); } catch { /* ignore */ }
  }
}
export function subscribeLicense(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// ── Activation ────────────────────────────────────────────────────────────
// Returns { ok: true, license } on success or { ok: false, error } on failure.
export async function activateLicense(rawKey) {
  const key = String(rawKey || "").trim();
  if (!key) return { ok: false, error: "Enter a license key first." };

  const body = new URLSearchParams({
    product_id: GUMROAD_PRODUCT_ID,
    license_key: key,
    increment_uses_count: "true",
  });

  let resp;
  try {
    resp = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch {
    return {
      ok: false,
      error:
        "Can't reach Gumroad. Connect to the internet once to activate; after that the app runs 100% offline.",
    };
  }

  let data = null;
  try { data = await resp.json(); } catch { /* fall through */ }

  if (!resp.ok || !data || data.success !== true || !data.purchase) {
    return {
      ok: false,
      error: (data && data.message) || "License key not found. Double-check the key from your Gumroad receipt.",
    };
  }

  const p = data.purchase;

  // Product identity check — reject keys from other products.
  const permalinkOk =
    p.product_permalink === GUMROAD_PRODUCT_URL ||
    p.product_id === GUMROAD_PRODUCT_ID ||
    p.permalink === "gvmaas";
  if (!permalinkOk) {
    return { ok: false, error: "That key belongs to a different product." };
  }

  // Refund / dispute / subscription-ended checks.
  if (p.refunded || p.chargebacked || p.disputed) {
    return { ok: false, error: "This purchase was refunded or disputed and can't be activated." };
  }
  if (p.subscription_ended_at || p.subscription_cancelled_at || p.subscription_failed_at) {
    return { ok: false, error: "This subscription has ended. Renew on Gumroad to reactivate." };
  }

  const record = {
    key,
    activatedAt: new Date().toISOString(),
    email: p.email || null,
    saleId: p.sale_id || null,
    orderNumber: p.order_number || null,
    uses: data.uses || 1,
    productName: p.product_name || "Pro Photo Sorter",
  };
  saveLicense(record);
  return { ok: true, license: record };
}

export function deactivateLicense() {
  clearLicense();
  return { ok: true };
}

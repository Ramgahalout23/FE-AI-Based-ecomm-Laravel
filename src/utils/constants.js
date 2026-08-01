import { resolveTimezone } from './formatters';

export const ORDER_STATUSES = {
  PENDING: { label: 'Pending', class: 'status-pending' },
  CONFIRMED: { label: 'Confirmed', class: 'status-processing' },
  PROCESSING: { label: 'Processing', class: 'status-processing' },
  SHIPPED: { label: 'Shipped', class: 'status-in-transit' },
  DELIVERED: { label: 'Delivered', class: 'status-delivered' },
  FAILED: { label: 'Failed', class: 'status-failed' },
  CANCELLED: { label: 'Cancelled', class: 'status-cancelled' },
  RETURNED: { label: 'Returned', class: 'status-warning' },
  RETURN_REQUESTED: { label: 'Return Requested', class: 'status-warning' },
};

export const PAYMENT_STATUSES = {
  PENDING: { label: 'Pending', class: 'status-pending' },
  COMPLETED: { label: 'Completed', class: 'status-completed' },
  FAILED: { label: 'Failed', class: 'status-failed' },
  REFUNDED: { label: 'Refunded', class: 'status-warning' },
};

export const USER_ROLES = { MANAGER: 'MANAGER', CUSTOMER: 'CUSTOMER' };

export const NOTIFICATION_TYPES = ['ORDER', 'PROMOTION', 'SYSTEM', 'REMINDER'];

export const BANNER_TYPES = ['HERO', 'SALE', 'CATEGORY', 'POPUP', 'FEATURED', 'NEW_ARRIVAL'];

export const SHIPPING_STATUSES = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const COUPON_TYPES = ['PERCENTAGE', 'FIXED'];

/**
 * Map color names to hex codes for swatch rendering.
 */
export const getColorHex = (colorName) => {
  const colors = {
    'Black': '#000000',
    'White': '#ffffff',
    'Navy': '#1e3a8a',
    'Grey': '#9ca3af',
    'Green': '#166534',
    'Olive': '#4d7c0f',
    'Maroon': '#991b1b',
    'Blue Wash': '#60a5fa',
    'Grey Wash': '#6b7280',
    'Multi': 'linear-gradient(45deg, #000 33%, #fff 33%, #fff 66%, #9ca3af 66%)',
    'Red': '#dc2626',
    'Blue': '#2563eb',
    'Cream': '#f5f0e1',
    'Burgundy': '#800020',
    'Dark Wash': '#1f3a5f',
    'Medium Wash': '#4a6fa5',
    'Light Wash': '#9db8d9',
  };
  return colors[colorName] || '#cccccc';
};

/**
 * Buy More, Save More — volume discount tiers.
 * Discount applies PER CART LINE based on that line's quantity:
 * qty 1 → 0%, qty 2 → 5%, qty 3 → 10%, qty 4+ → 15%.
 */
export const BUNDLE_TIERS = [
  { minQty: 1, discount: 0 },
  { minQty: 2, discount: 5 },
  { minQty: 3, discount: 10 },
  { minQty: 4, discount: 15 },
];

/**
 * Parse the admin-configured bundle tiers (JSON string or array) into a
 * normalized [{minQty, discount, maxQty?}] list. Falls back to the default
 * tiers when the setting is missing, malformed, or empty.
 *
 * maxQty is optional and caps the per-product quantity window for a tier:
 * the discount applies only when a line's quantity is within
 * [minQty, maxQty]. When absent, the tier is open-ended (minQty+).
 *
 * @param {string|Array} raw     Value of the bundleTiers setting.
 * @param {Array}        fallback  Default tiers used when raw is invalid.
 */
export const parseBundleTiers = (raw, fallback = BUNDLE_TIERS) => {
  if (!raw) return fallback;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback;
    const tiers = parsed
      .filter((t) => t && Number.isFinite(Number(t.minQty)))
      .map((t) => {
        const maxQty = t.maxQty === undefined || t.maxQty === null || t.maxQty === ''
          ? undefined
          : Number(t.maxQty);
        const tier = {
          minQty: Number(t.minQty),
          discount: Number(t.discount) || 0,
        };
        if (Number.isFinite(maxQty) && maxQty > 0) tier.maxQty = maxQty;
        return tier;
      })
      .sort((a, b) => a.minQty - b.minQty);
    return tiers.length > 0 ? tiers : fallback;
  } catch {
    return fallback;
  }
};

/**
 * Return the applicable bundle tier for a given quantity.
 *
 * A tier qualifies only when the quantity is within its per-product window:
 * minQty <= qty <= maxQty (maxQty absent = open-ended). Among qualifying
 * tiers the highest discount wins. When no tier qualifies (e.g. qty below
 * the minimum), a zero-discount fallback tier is returned.
 *
 * @param {number} qty
 * @param {Array}  tiers  Bundle tiers to evaluate (defaults to BUNDLE_TIERS).
 */
export const getBundleTier = (qty, tiers = BUNDLE_TIERS) => {
  let best = null;
  for (const t of tiers) {
    const maxQty = t.maxQty ? Number(t.maxQty) : null;
    const inWindow = qty >= t.minQty && (maxQty === null || qty <= maxQty);
    if (inWindow && (!best || (t.discount || 0) > (best.discount || 0))) {
      best = t;
    }
  }
  return best || { minQty: tiers[0]?.minQty ?? 1, discount: 0 };
};

/**
 * Today's date in YYYY-MM-DD in the given store timezone (IANA name or stored
 * abbreviation), falling back to the browser's local timezone when unavailable.
 * Uses the shared resolveTimezone helper from utils/formatters.js so the bundle
 * offer date window uses the same store timezone as displayed dates everywhere.
 */
export const todayStr = (tz) => {
  const iana = resolveTimezone(tz);
  if (iana) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: iana,
        year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(new Date());
      const get = (type) => parts.find(p => p.type === type)?.value;
      return `${get('year')}-${get('month')}-${get('day')}`;
    } catch {
      // fall through to local time below
    }
  }
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

/**
 * Whether the bundle offer is active, mirroring backend CheckoutService::isBundleOfferEnabled.
 * Requires ALL of: the global sales toggle (salesEnabled), the bundle offer toggle
 * (bundleOfferEnabled, seeded 'false' — admin activates it from Admin → Settings),
 * and the optional date window (bundleOfferStartDate/bundleOfferEndDate, blank = no bound).
 *
 * @param {Function} getSetting  Settings accessor (e.g. from useSettings).
 */
export const isBundleOfferEnabled = (getSetting) => {
  const salesEnabled = String(getSetting('salesEnabled', 'true'));
  if (salesEnabled === 'false' || salesEnabled === '0') return false;
  if (String(getSetting('bundleOfferEnabled', 'false')) === 'false') return false;

  // Optional date window — offer only applies while today is within [start, end]
  // "Today" is evaluated in the store's configured timezone so it matches the
  // backend check (CheckoutService) even across server/client timezones.
  const start = String(getSetting('bundleOfferStartDate', '') || '');
  const end = String(getSetting('bundleOfferEndDate', '') || '');
  if (start || end) {
    const today = todayStr(getSetting('timezone', ''));
    if (start && today < start) return false;
    if (end && today > end) return false;
  }
  return true;
};

/**
 * Total bundle discount (₹) for an array of cart items.
 * Each line's discount is based on that line's own quantity against the
 * configured tiers (defaults to BUNDLE_TIERS).
 */
export const calcBundleDiscount = (items, tiers = BUNDLE_TIERS) =>
  Math.round(
    (items || []).reduce((sum, item) => {
      const qty = item.quantity || 1;
      const tier = getBundleTier(qty, tiers);
      return sum + (item.price || 0) * qty * (tier.discount / 100);
    }, 0) * 100
  ) / 100;

/**
 * Calculate tax for a subtotal, honoring the admin's taxCalculation setting.
 * Mirrors backend CheckoutService::calculateTax:
 * - 'inclusive' → prices already include tax → 0 added.
 * - 'exclusive' → tax added on top of the subtotal at checkout.
 *
 * @param {number} subtotal       Pre-discount subtotal (percentage base).
 * @param {string} taxCalculation 'inclusive' | 'exclusive'
 * @param {number} taxRate        Percentage rate (e.g. 18 = 18%).
 */
export const calcTax = (subtotal, taxCalculation, taxRate) =>
  taxCalculation === 'exclusive'
    ? Math.round((subtotal || 0) * (Number(taxRate) || 0)) / 100
    : 0;

/**
 * Custom T-Shirt design product constants.
 *
 * CUSTOM_TEE_PRODUCT_ID — The UUID of the dedicated "Custom T-Shirt Design"
 * product in the database. Both frontend cart items and backend checkout
 * use this ID so custom items flow through the normal order pipeline.
 */
export const CUSTOM_TEE_PRODUCT_ID = 'c5b8e3f0-3a1c-4b7e-9d6f-1a2b3c4d5e6f';

export const CUSTOM_TEE_SLUG = 'custom-t-shirt-design';

export const CUSTOM_TEE_BASE_PRICE = 499;
export const CUSTOM_TEE_DESIGN_FEE = 200;
export const CUSTOM_TEE_TOTAL_PRICE = CUSTOM_TEE_BASE_PRICE + CUSTOM_TEE_DESIGN_FEE; // 699

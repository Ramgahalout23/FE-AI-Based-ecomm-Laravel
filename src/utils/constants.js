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

// Values mirror the `coupons.discount_type` DB ENUM ('FLAT','PERCENTAGE').
// Use 'FLAT' (not 'FIXED') so coupon saves don't hit a data-truncation error.
export const COUPON_TYPES = ['PERCENTAGE', 'FLAT'];

// ── Support Tickets ──
// Values mirror the `support_tickets` table ENUMs (see
// database/migrations/2024_01_01_000035_create_support_tickets_table.php).
// Use these everywhere instead of hardcoding ticket enum strings so the
// frontend stays in sync with the backend.
export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export const TICKET_CATEGORIES = ['ORDER', 'PAYMENT', 'SHIPPING', 'PRODUCT', 'REFUND', 'ACCOUNT', 'TECHNICAL', 'OTHER'];

export const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED'];

/**
 * Render a ticket status code as a human-readable label (e.g. IN_PROGRESS → "In Progress").
 */
export const ticketStatusLabel = (status) =>
  String(status || '').split('_').map(w => w ? w[0] + w.slice(1).toLowerCase() : w).join(' ');

/**
 * Render a ticket priority code as a human-readable label.
 *
 * Falls back to the backend's default priority (MEDIUM) for empty or unknown
 * values, mirroring TicketService defaults. Built on TICKET_PRIORITIES so the
 * admin UI and backend stay in sync.
 */
export const ticketPriorityLabel = (priority) => {
  const normalized = String(priority || '').toUpperCase();
  return TICKET_PRIORITIES.includes(normalized) ? ticketStatusLabel(normalized) : 'Medium';
};

/**
 * Map a ticket status code to its admin badge CSS class.
 *
 * Single source of truth for the status-badge palette so the chat modal and
 * table rows render the same colors as the rest of the admin panel.
 */
export const ticketStatusClass = (status) => {
  const map = {
    OPEN: 'status-pending',
    IN_PROGRESS: 'status-processing',
    WAITING_CUSTOMER: 'status-warning',
    RESOLVED: 'status-active',
    CLOSED: 'status-completed',
  };
  return map[status] || 'status-in-transit';
};

// ── Return Requests ──
// Values mirror the reason strings the storefront form submits (see
// ReturnController::store and RefundService). Use returnReasonLabel() when
// rendering so the admin panel never shows raw snake_case codes.
export const RETURN_REASONS = [
  { value: 'defective',   label: 'Defective / Damaged Item' },
  { value: 'wrong_item',  label: 'Wrong Item Received' },
  { value: 'not_as_desc', label: 'Not as Described' },
  { value: 'size_issue',  label: 'Size / Fit Issue' },
  { value: 'other',       label: 'Other' },
];

/**
 * Render a return-request reason code as a human-readable label
 * (e.g. wrong_item → "Wrong Item Received"). Falls back to the raw
 * value for unknown codes so nothing renders as an empty cell.
 */
export const returnReasonLabel = (value) =>
  RETURN_REASONS.find(r => r.value === value)?.label || value || '—';

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
 * Whether a color name is a light shade (white, cream, beige, etc.) that
 * needs a subtle border so it stays visible against white surfaces.
 */
export const isLightColor = (colorName = '') =>
  ['white','cream','beige','ivory','silver','light','blush','nude','pearl','bone','almond','vanilla']
    .some(l => colorName.toLowerCase().includes(l));

/**
 * Buy More, Save More — volume discount tiers.
 * Discount applies to the WHOLE ORDER based on the total quantity of items
 * in the cart: 2+ items → 5% off, 3+ items → 10% off, 4+ items → 15% off.
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
 * maxQty is optional and caps the total-quantity window for a tier:
 * the discount applies only when the cart's total quantity is within
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
 * A tier qualifies only when the quantity is within its window:
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
 * Auto-applied store-offer discount for a cart.
 *
 * Mirrors backend FlashSaleService::getApplicableDiscounts + calculateItemDiscount
 * so the cart drawer, cart page, checkout page and the final order all
 * show/charge the same amount:
 *  - per-item: amount = itemSubtotal × % (FIXED offers use a flat per-item
 *    amount), skipped when itemSubtotal < minPurchase, capped at maxDiscount,
 *    never exceeding the item subtotal
 *  - BEST OFFER PER ITEM: for each cart item the offer that yields the highest
 *    discount for THAT item wins (different offers can win on different items),
 *    and the per-item amounts are summed — exactly like the backend. The
 *    returned `id`/`badge`/`highlight` describe the offer that contributed the
 *    most so the UI still names a single offer while the amount stays correct.
 *
 * Note: this helper only sees the store-wide auto-apply offers returned by
 * promotionsAPI.getStoreOffers(). The backend additionally applies product- and
 * category-linked flash sales, so a cart containing a product with its own flash
 * sale could show a different (lower) total here than the order record — for the
 * seeded catalog (identical 10% store-wide offers) the two match exactly.
 *
 * Shared by CartDrawer, CartPage and CheckoutPage so the cart drawer, cart
 * page and checkout always show the same auto-applied discount.
 *
 * @param {Array}  items    Cart items with {price, quantity} (in-stock only).
 * @param {Array}  offers   Store offers from promotionsAPI.getStoreOffers().
 * @returns {{ id: string, badge: string, highlight: string, tagline: ?string, amount: number }|null}
 */
/**
 * Round a monetary value to the nearest whole rupee.
 *
 * INR is displayed (and charged) in whole rupees, so every discount, tax and
 * total computation must route through this helper — the value used in math
 * then always matches the value shown by formatCurrency. Keeping the rule in
 * one place means the convention can't drift again.
 */
export const roundINR = (value) => Math.round(Number(value) || 0);

export const getBestStoreOffer = (items = [], offers = []) => {
  const list = Array.isArray(items) ? items : [];
  const active = (offers || []).filter((o) =>
    o.isActive !== false &&
    (!o.status || o.status === 'ACTIVE') &&
    Number(o.discount) > 0
  );
  if (list.length === 0 || active.length === 0) return null;

  const percentTypes = ['PERCENTAGE', 'FLASH_SALE', 'SEASONAL', 'PRODUCT_LAUNCH', 'NEWSLETTER', 'LOYALTY_REWARD'];

  // Per-item discount for one offer (mirrors backend calculateItemDiscount).
  const itemDiscount = (itemSubtotal, offer) => {
    const type = String(offer.type || 'PERCENTAGE').toUpperCase();
    const discountValue = Number(offer.discount);
    const maxDiscount = Number(offer.maxDiscount ?? offer.max_discount ?? 0);
    const minPurchase = Number(offer.minPurchase ?? offer.min_purchase ?? 0);
    if (minPurchase > 0 && itemSubtotal < minPurchase) return 0;
    let discount;
    if (percentTypes.includes(type)) {
      discount = itemSubtotal * (discountValue / 100);
    } else if (type === 'FIXED') {
      discount = discountValue;
    } else {
      return 0; // unknown type — not applicable
    }
    if (maxDiscount > 0 && discount > maxDiscount) discount = maxDiscount;
    return Math.min(discount, itemSubtotal);
  };

  let total = 0;
  const contribution = new Map(); // offerId -> total contributed
  for (const item of list) {
    const price = Number(item?.price ?? 0);
    const quantity = Number(item?.quantity ?? 1);
    if (price <= 0) continue;
    const itemSubtotal = price * quantity;

    let bestAmount = 0;
    let bestOffer = null;
    for (const offer of active) {
      const amount = itemDiscount(itemSubtotal, offer);
      if (amount > bestAmount) {
        bestAmount = amount;
        bestOffer = offer;
      }
    }
    if (bestOffer && bestAmount > 0) {
      total += bestAmount;
      contribution.set(bestOffer.id, (contribution.get(bestOffer.id) || 0) + bestAmount);
    }
  }

  // Whole-rupee rounding at the source — line items and totals then reconcile
  // exactly with what's shown.
  total = roundINR(total);
  if (total <= 0) return null;

  // Name the offer that contributed the most (amounts may combine offers).
  let dominantId = null;
  let dominantAmount = -1;
  contribution.forEach((amt, id) => {
    if (amt > dominantAmount) {
      dominantAmount = amt;
      dominantId = id;
    }
  });
  const dominant = active.find((o) => o.id === dominantId) || active[0];

  return {
    id: dominant.id,
    badge: dominant.offerBadge || 'OFFER',
    highlight: dominant.offerHighlight || dominant.title,
    tagline: dominant.offerTagline || null,
    amount: total,
  };
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
 * Applies the tier for the TOTAL quantity across all items to the whole
 * cart value (e.g. 3 items → 10% off the order), mirroring the backend
 * CheckoutService::calculateBundleDiscount and calcBundleDiscountDetails.
 */
export const calcBundleDiscount = (items, tiers = BUNDLE_TIERS) => {
  const list = items || [];
  const totalQty = list.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  const totalValue = list.reduce((sum, item) => sum + (item.price || 0) * (item.quantity ?? 1), 0);
  const tier = getBundleTier(totalQty, tiers);
  // Whole-rupee rounding so the displayed discount equals the value used in totals
  return roundINR(totalValue * (tier.discount / 100));
};

/**
 * Compute detailed bundle discount info for display — includes the discount
 * amount, the highest applicable tier, and a human-readable message.
 *
 * The discount is based on the total quantity across all items in the cart.
 * Example: if cart has 2 items total, shows "Buy 2 Items, Get 5% Off (-₹X)"
 *
 * @param {Array}  items  Cart items with {quantity, price}.
 * @param {Array}  tiers  Bundle tiers (defaults to BUNDLE_TIERS).
 * @returns {{ discount: number, tier: object|null, message: string, totalQty: number }}
 */
export const calcBundleDiscountDetails = (items, tiers = BUNDLE_TIERS) => {
  const list = items || [];
  const totalQty = list.reduce((sum, item) => sum + (item.quantity ?? 1), 0);
  const totalValue = list.reduce((sum, item) => sum + (item.price || 0) * (item.quantity ?? 1), 0);

  // Find the best tier that applies to the total cart quantity
  const applicableTier = getBundleTier(totalQty, tiers);

  if (!applicableTier || applicableTier.discount <= 0) {
    return { discount: 0, tier: null, message: '', totalQty };
  }

  // Whole-rupee rounding so the displayed discount equals the value used in totals
  const discount = roundINR(totalValue * (applicableTier.discount / 100));

  // Build a human-readable message
  const minQty = applicableTier.minQty;
  const maxQty = applicableTier.maxQty;
  const qtyLabel = maxQty
    ? `${minQty}–${maxQty} Items`
    : `${minQty} Items`;
  const message = `Buy ${qtyLabel}, Get ${applicableTier.discount}% Off`;

  return { discount, tier: applicableTier, message, totalQty };
};

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
    ? roundINR(((subtotal || 0) * (Number(taxRate) || 0)) / 100)
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

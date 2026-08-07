import { describe, it, expect } from 'vitest';
import { BUNDLE_TIERS, getBundleTier, calcBundleDiscount, parseBundleTiers, isBundleOfferEnabled, todayStr, getBestStoreOffer, TICKET_PRIORITIES, TICKET_CATEGORIES, TICKET_STATUSES, ticketStatusLabel, ticketStatusClass, ticketPriorityLabel } from './constants';

describe('ticket constants', () => {
  it('TICKET_PRIORITIES matches the backend ENUM', () => {
    expect(TICKET_PRIORITIES).toEqual(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
  });

  it('TICKET_CATEGORIES matches the backend ENUM', () => {
    expect(TICKET_CATEGORIES).toEqual(['ORDER', 'PAYMENT', 'SHIPPING', 'PRODUCT', 'REFUND', 'ACCOUNT', 'TECHNICAL', 'OTHER']);
  });

  it('TICKET_STATUSES matches the backend ENUM', () => {
    expect(TICKET_STATUSES).toEqual(['OPEN', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED']);
  });

  it('ticketPriorityLabel renders readable labels', () => {
    expect(ticketPriorityLabel('LOW')).toBe('Low');
    expect(ticketPriorityLabel('MEDIUM')).toBe('Medium');
    expect(ticketPriorityLabel('high')).toBe('High');
    expect(ticketPriorityLabel('URGENT')).toBe('Urgent');
  });

  it('ticketPriorityLabel falls back to the backend default (Medium)', () => {
    expect(ticketPriorityLabel('')).toBe('Medium');
    expect(ticketPriorityLabel(undefined)).toBe('Medium');
    expect(ticketPriorityLabel('NORMAL')).toBe('Medium');
    expect(ticketPriorityLabel(null)).toBe('Medium');
  });

  it('ticketStatusLabel renders readable labels', () => {
    expect(ticketStatusLabel('IN_PROGRESS')).toBe('In Progress');
    expect(ticketStatusLabel('WAITING_CUSTOMER')).toBe('Waiting Customer');
    expect(ticketStatusLabel('OPEN')).toBe('Open');
    expect(ticketStatusLabel('')).toBe('');
    expect(ticketStatusLabel(undefined)).toBe('');
  });

  it('ticketStatusClass maps every TICKET_STATUSES value to a badge class', () => {
    expect(TICKET_STATUSES.every(s => ticketStatusClass(s).startsWith('status-'))).toBe(true);
    expect(ticketStatusClass('OPEN')).toBe('status-pending');
    expect(ticketStatusClass('IN_PROGRESS')).toBe('status-processing');
    expect(ticketStatusClass('WAITING_CUSTOMER')).toBe('status-warning');
    expect(ticketStatusClass('RESOLVED')).toBe('status-active');
    expect(ticketStatusClass('CLOSED')).toBe('status-completed');
  });

  it('ticketStatusClass falls back to status-in-transit for unknown values', () => {
    expect(ticketStatusClass('UNKNOWN')).toBe('status-in-transit');
    expect(ticketStatusClass('')).toBe('status-in-transit');
    expect(ticketStatusClass(undefined)).toBe('status-in-transit');
  });
});

describe('getBundleTier', () => {
  it('applies 0% for qty 1 (no bundle discount)', () => {
    expect(getBundleTier(1).discount).toBe(0);
  });

  it('applies 5% for qty 2', () => {
    expect(getBundleTier(2).discount).toBe(5);
  });

  it('applies 10% for qty 3', () => {
    expect(getBundleTier(3).discount).toBe(10);
  });

  it('applies 15% for qty 4+', () => {
    expect(getBundleTier(4).discount).toBe(15);
    expect(getBundleTier(10).discount).toBe(15);
  });

  it('honors a per-tier maxQty window', () => {
    const tiers = [
      { minQty: 2, discount: 5, maxQty: 3 },
      { minQty: 4, discount: 10, maxQty: 6 },
      { minQty: 7, discount: 15 },
    ];
    // Inside the 2–3 window
    expect(getBundleTier(2, tiers).discount).toBe(5);
    expect(getBundleTier(3, tiers).discount).toBe(5);
    // Inside the 4–6 window
    expect(getBundleTier(4, tiers).discount).toBe(10);
    expect(getBundleTier(6, tiers).discount).toBe(10);
    // Open-ended top tier
    expect(getBundleTier(7, tiers).discount).toBe(15);
    expect(getBundleTier(20, tiers).discount).toBe(15);
  });

  it('falls back to 0% above the highest cap', () => {
    const tiers = [
      { minQty: 2, discount: 5, maxQty: 3 },
      { minQty: 4, discount: 10, maxQty: 6 },
    ];
    expect(getBundleTier(7, tiers).discount).toBe(0);
    expect(getBundleTier(50, tiers).discount).toBe(0);
  });

  it('falls back to 0% below the minimum tier', () => {
    const tiers = [{ minQty: 2, discount: 5 }];
    expect(getBundleTier(1, tiers).discount).toBe(0);
    expect(getBundleTier(0, tiers).discount).toBe(0);
  });

  it('falls back to the base tier for qty 0 or negative', () => {
    expect(getBundleTier(0).discount).toBe(0);
    expect(getBundleTier(-1).discount).toBe(0);
  });
});

describe('calcBundleDiscount', () => {
  it('returns 0 for empty or missing items', () => {
    expect(calcBundleDiscount([])).toBe(0);
    expect(calcBundleDiscount(null)).toBe(0);
    expect(calcBundleDiscount(undefined)).toBe(0);
  });

  it('returns 0 when the total quantity is 1', () => {
    const items = [{ price: 100, quantity: 1 }];
    expect(calcBundleDiscount(items)).toBe(0);
  });

  it('applies 5% across DIFFERENT items once total qty reaches 2', () => {
    // 2 different items (qty 1 each) → total qty 2 → 5% of 150 = 7.5
    const items = [
      { price: 100, quantity: 1 },
      { price: 50, quantity: 1 },
    ];
    expect(calcBundleDiscount(items)).toBe(7.5);
  });

  it('applies 5% for total qty 2', () => {
    // 100 * 2 * 0.05 = 10
    const items = [{ price: 100, quantity: 2 }];
    expect(calcBundleDiscount(items)).toBe(10);
  });

  it('applies the tier to the TOTAL cart value (not per line)', () => {
    // total qty 5 → 15% of (200 + 600) = 120
    const items = [
      { price: 100, quantity: 2 },
      { price: 200, quantity: 3 },
    ];
    expect(calcBundleDiscount(items)).toBe(120);
  });

  it('uses the highest tier for large quantities', () => {
    // 100 * 5 * 0.15 = 75
    const items = [{ price: 100, quantity: 5 }];
    expect(calcBundleDiscount(items)).toBe(75);
  });

  it('treats missing quantity as 1 (no discount)', () => {
    const items = [{ price: 100 }];
    expect(calcBundleDiscount(items)).toBe(0);
  });

  it('rounds to two decimals', () => {
    // 99.99 * 2 * 0.05 = 9.999 → 10
    const items = [{ price: 99.99, quantity: 2 }];
    expect(calcBundleDiscount(items)).toBe(10);
  });

  it('uses custom tiers when provided', () => {
    const tiers = [
      { minQty: 3, discount: 8 },
      { minQty: 5, discount: 20 },
    ];
    // total qty 9 → 20% of 900 = 180
    const items = [
      { price: 100, quantity: 3 },
      { price: 100, quantity: 6 },
    ];
    expect(calcBundleDiscount(items, tiers)).toBe(180);
  });

  it('respects per-tier maxQty windows against the total qty', () => {
    const tiers = [
      { minQty: 2, discount: 5, maxQty: 3 },
      { minQty: 4, discount: 10, maxQty: 6 },
    ];
    // total qty 3 (in 2–3) → 5%: 300 * 0.05 = 15
    const items = [
      { price: 100, quantity: 2 },
      { price: 100, quantity: 1 },
    ];
    expect(calcBundleDiscount(items, tiers)).toBe(15);
  });

  it('returns 0 above the highest maxQty cap', () => {
    const tiers = [
      { minQty: 2, discount: 5, maxQty: 3 },
      { minQty: 4, discount: 10, maxQty: 6 },
    ];
    // total qty 16 → above every cap → 0%
    const items = [
      { price: 100, quantity: 3 },
      { price: 100, quantity: 5 },
      { price: 100, quantity: 8 },
    ];
    expect(calcBundleDiscount(items, tiers)).toBe(0);
  });
});

describe('parseBundleTiers', () => {
  it('returns fallback for missing or empty input', () => {
    expect(parseBundleTiers(null)).toEqual(BUNDLE_TIERS);
    expect(parseBundleTiers('')).toEqual(BUNDLE_TIERS);
  });

  it('returns fallback for malformed JSON', () => {
    expect(parseBundleTiers('not-json')).toEqual(BUNDLE_TIERS);
    expect(parseBundleTiers('{}')).toEqual(BUNDLE_TIERS);
  });

  it('parses a JSON string into normalized tiers', () => {
    const tiers = parseBundleTiers('[{"minQty":2,"discount":5},{"minQty":3,"discount":10}]');
    expect(tiers).toEqual([
      { minQty: 2, discount: 5 },
      { minQty: 3, discount: 10 },
    ]);
  });

  it('accepts an already-parsed array', () => {
    const tiers = parseBundleTiers([{ minQty: 2, discount: 5 }]);
    expect(tiers).toEqual([{ minQty: 2, discount: 5 }]);
  });

  it('coerces string numbers and filters invalid entries', () => {
    const tiers = parseBundleTiers('[{"minQty":"2","discount":"5"},{"discount":10}]');
    expect(tiers).toEqual([{ minQty: 2, discount: 5 }]);
  });

  it('sorts tiers by minQty ascending', () => {
    const tiers = parseBundleTiers('[{"minQty":4,"discount":15},{"minQty":2,"discount":5}]');
    expect(tiers).toEqual([
      { minQty: 2, discount: 5 },
      { minQty: 4, discount: 15 },
    ]);
  });

  it('preserves optional maxQty caps', () => {
    const tiers = parseBundleTiers('[{"minQty":2,"discount":5,"maxQty":3},{"minQty":4,"discount":10,"maxQty":6},{"minQty":7,"discount":15}]');
    expect(tiers).toEqual([
      { minQty: 2, discount: 5, maxQty: 3 },
      { minQty: 4, discount: 10, maxQty: 6 },
      { minQty: 7, discount: 15 },
    ]);
  });

  it('drops invalid or non-positive maxQty caps', () => {
    expect(parseBundleTiers('[{"minQty":2,"discount":5,"maxQty":0}]')).toEqual([{ minQty: 2, discount: 5 }]);
    expect(parseBundleTiers('[{"minQty":2,"discount":5,"maxQty":"abc"}]')).toEqual([{ minQty: 2, discount: 5 }]);
    expect(parseBundleTiers('[{"minQty":2,"discount":5,"maxQty":null}]')).toEqual([{ minQty: 2, discount: 5 }]);
  });
});

describe('getBestStoreOffer', () => {
  const offers = [
    { id: 'smart', title: 'Smart Deal', discount: '10', status: 'ACTIVE', isActive: true, offerBadge: 'BUY 2', offerHighlight: 'GET 10% OFF' },
    { id: 'prepaid', title: 'Prepaid Offer', discount: '10', status: 'ACTIVE', isActive: true, offerHighlight: 'EXTRA 10% OFF' },
    { id: 'gift', title: 'Summer Bonus', discount: null, status: 'ACTIVE', isActive: true },
  ];

  it('returns null without offers or discount', () => {
    expect(getBestStoreOffer(1000)).toBeNull();
    expect(getBestStoreOffer(1000, [])).toBeNull();
    expect(getBestStoreOffer(1000, [{ id: 'gift', discount: null }])).toBeNull();
  });

  it('returns the best single offer with its rounded amount', () => {
    const best = getBestStoreOffer(3396, offers);
    expect(best.id).toBe('smart');
    expect(best.amount).toBe(339.6);
    expect(best.badge).toBe('BUY 2');
    expect(best.highlight).toBe('GET 10% OFF');
  });

  it('picks the highest discount when offers differ', () => {
    const best = getBestStoreOffer(1000, [
      { id: 'a', discount: '5', status: 'ACTIVE', isActive: true },
      { id: 'b', discount: '20', status: 'ACTIVE', isActive: true },
    ]);
    expect(best.id).toBe('b');
    expect(best.amount).toBe(200);
  });

  it('ignores inactive or non-ACTIVE offers', () => {
    const best = getBestStoreOffer(1000, [
      { id: 'off', discount: '10', status: 'ACTIVE', isActive: false },
      { id: 'paused', discount: '15', status: 'PAUSED', isActive: true },
      { id: 'live', discount: '5', status: 'ACTIVE', isActive: true },
    ]);
    expect(best.id).toBe('live');
    expect(best.amount).toBe(50);
  });
});

describe('isBundleOfferEnabled', () => {
  const settings = (overrides = {}) => ({
    salesEnabled: 'true',
    bundleOfferEnabled: 'false',
    ...overrides,
  });
  const getSetting = (store) => (key, fallback) => store[key] ?? fallback;

  it('returns false when bundleOfferEnabled is missing (seeded inactive)', () => {
    expect(isBundleOfferEnabled(getSetting(settings()))).toBe(false);
  });

  it('returns true when bundleOfferEnabled is true and sales enabled', () => {
    const store = settings({ bundleOfferEnabled: 'true' });
    expect(isBundleOfferEnabled(getSetting(store))).toBe(true);
  });

  it('returns false when global sales are disabled', () => {
    const store = settings({ salesEnabled: 'false', bundleOfferEnabled: 'true' });
    expect(isBundleOfferEnabled(getSetting(store))).toBe(false);
  });

  it('returns false when global sales are off via 0', () => {
    const store = settings({ salesEnabled: '0', bundleOfferEnabled: 'true' });
    expect(isBundleOfferEnabled(getSetting(store))).toBe(false);
  });

  it('falls back to enabled sales when salesEnabled is missing', () => {
    const store = { bundleOfferEnabled: 'true' };
    expect(isBundleOfferEnabled(getSetting(store))).toBe(true);
  });

  it('respects the optional date window (start/end)', () => {
    // Use UTC store timezone so todayStr matches the UTC-derived boundary dates
    const today = todayStr('UTC');
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const base = { salesEnabled: 'true', bundleOfferEnabled: 'true', timezone: 'UTC' };

    // No bounds → active
    expect(isBundleOfferEnabled(getSetting(base))).toBe(true);

    // Start only: active today, inactive before start
    expect(isBundleOfferEnabled(getSetting({ ...base, bundleOfferStartDate: yesterday }))).toBe(true);
    expect(isBundleOfferEnabled(getSetting({ ...base, bundleOfferStartDate: tomorrow }))).toBe(false);

    // End only: active today, inactive after end
    expect(isBundleOfferEnabled(getSetting({ ...base, bundleOfferEndDate: tomorrow }))).toBe(true);
    expect(isBundleOfferEnabled(getSetting({ ...base, bundleOfferEndDate: yesterday }))).toBe(false);

    // Bounded window: active within, inactive outside
    expect(isBundleOfferEnabled(getSetting({ ...base, bundleOfferStartDate: yesterday, bundleOfferEndDate: tomorrow }))).toBe(true);
    expect(isBundleOfferEnabled(getSetting({ ...base, bundleOfferStartDate: tomorrow, bundleOfferEndDate: tomorrow }))).toBe(false);
    expect(isBundleOfferEnabled(getSetting({ ...base, bundleOfferStartDate: yesterday, bundleOfferEndDate: yesterday }))).toBe(false);

    // Sanity: today string is YYYY-MM-DD
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

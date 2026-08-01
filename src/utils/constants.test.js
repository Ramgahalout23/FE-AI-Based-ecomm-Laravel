import { describe, it, expect } from 'vitest';
import { BUNDLE_TIERS, getBundleTier, calcBundleDiscount, parseBundleTiers, isBundleOfferEnabled, todayStr } from './constants';

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

  it('returns 0 when no line reaches qty 2', () => {
    const items = [
      { price: 100, quantity: 1 },
      { price: 50, quantity: 1 },
    ];
    expect(calcBundleDiscount(items)).toBe(0);
  });

  it('applies 5% per line for qty 2 items', () => {
    // 100 * 2 * 0.05 = 10
    const items = [{ price: 100, quantity: 2 }];
    expect(calcBundleDiscount(items)).toBe(10);
  });

  it('sums per-line discounts across multiple items', () => {
    // 100 * 2 * 0.05 = 10
    // 200 * 3 * 0.10 = 60
    const items = [
      { price: 100, quantity: 2 },
      { price: 200, quantity: 3 },
    ];
    expect(calcBundleDiscount(items)).toBe(70);
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
    // qty 3 → 8%: 100 * 3 * 0.08 = 24
    // qty 6 → 20%: 100 * 6 * 0.20 = 120
    const items = [
      { price: 100, quantity: 3 },
      { price: 100, quantity: 6 },
    ];
    expect(calcBundleDiscount(items, tiers)).toBe(144);
  });

  it('respects per-tier maxQty windows', () => {
    const tiers = [
      { minQty: 2, discount: 5, maxQty: 3 },
      { minQty: 4, discount: 10, maxQty: 6 },
    ];
    // qty 3 → 5% (in 2–3): 100 * 3 * 0.05 = 15
    // qty 5 → 10% (in 4–6): 100 * 5 * 0.10 = 50
    // qty 8 → above cap → 0%
    const items = [
      { price: 100, quantity: 3 },
      { price: 100, quantity: 5 },
      { price: 100, quantity: 8 },
    ];
    expect(calcBundleDiscount(items, tiers)).toBe(65);
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

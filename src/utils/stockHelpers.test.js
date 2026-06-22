import { describe, it, expect } from 'vitest';
import { computeStockStatus } from './stockHelpers';

describe('computeStockStatus', () => {
  // ── Edge cases: null/undefined product ──
  it('returns out of stock for null product', () => {
    const result = computeStockStatus(null);
    expect(result.effectiveStockQty).toBe(0);
    expect(result.isOutOfStock).toBe(true);
    expect(result.isLowStock).toBe(false);
    expect(result.hasStockIssue).toBe(true);
  });

  it('returns out of stock for undefined product', () => {
    const result = computeStockStatus(undefined);
    expect(result.effectiveStockQty).toBe(0);
    expect(result.isOutOfStock).toBe(true);
    expect(result.hasStockIssue).toBe(true);
  });

  // ── Simple products (no variants) ──
  describe('simple products (no variants)', () => {
    it('returns in stock when quantity > 5', () => {
      const result = computeStockStatus({ quantity: 20 });
      expect(result.effectiveStockQty).toBe(20);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(false);
      expect(result.hasStockIssue).toBe(false);
    });

    it('returns out of stock when quantity is 0', () => {
      const result = computeStockStatus({ quantity: 0 });
      expect(result.effectiveStockQty).toBe(0);
      expect(result.isOutOfStock).toBe(true);
      expect(result.isLowStock).toBe(false);
      expect(result.hasStockIssue).toBe(true);
    });

    it('returns low stock when quantity is between 1 and 5', () => {
      const result = computeStockStatus({ quantity: 3 });
      expect(result.effectiveStockQty).toBe(3);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(true);
      expect(result.hasStockIssue).toBe(true);
    });

    it('returns low stock when quantity is exactly 1', () => {
      const result = computeStockStatus({ quantity: 1 });
      expect(result.effectiveStockQty).toBe(1);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(true);
      expect(result.hasStockIssue).toBe(true);
    });

    it('returns low stock when quantity is exactly 5 (at threshold)', () => {
      const result = computeStockStatus({ quantity: 5 });
      expect(result.effectiveStockQty).toBe(5);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(true);
      expect(result.hasStockIssue).toBe(true);
    });

    it('treats null quantity as 0 — out of stock', () => {
      const result = computeStockStatus({ quantity: null });
      expect(result.effectiveStockQty).toBe(0);
      expect(result.isOutOfStock).toBe(true);
      expect(result.hasStockIssue).toBe(true);
    });

    it('treats undefined quantity as 0 — out of stock', () => {
      const result = computeStockStatus({});
      expect(result.effectiveStockQty).toBe(0);
      expect(result.isOutOfStock).toBe(true);
      expect(result.hasStockIssue).toBe(true);
    });
  });

  // ── Variant products ──
  describe('variant products (with productvariant array)', () => {
    it('returns in stock when total variant quantity > 5 (parent quantity is 0)', () => {
      const product = {
        quantity: 0, // Parent has 0 — this is the bug scenario!
        productvariant: [
          { quantity: 10, attributes: { size: 'M', color: 'Black' } },
          { quantity: 5, attributes: { size: 'L', color: 'Black' } },
        ],
      };
      const result = computeStockStatus(product);
      expect(result.effectiveStockQty).toBe(15);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(false);
      expect(result.hasStockIssue).toBe(false);
    });

    it('returns out of stock when all variants have quantity 0', () => {
      const product = {
        quantity: 0,
        productvariant: [
          { quantity: 0, attributes: { size: 'M', color: 'Black' } },
          { quantity: 0, attributes: { size: 'L', color: 'White' } },
        ],
      };
      const result = computeStockStatus(product);
      expect(result.effectiveStockQty).toBe(0);
      expect(result.isOutOfStock).toBe(true);
      expect(result.isLowStock).toBe(false);
      expect(result.hasStockIssue).toBe(true);
    });

    it('returns low stock when total variant quantity is 3', () => {
      const product = {
        quantity: 0,
        productvariant: [
          { quantity: 2, attributes: { size: 'S', color: 'Navy' } },
          { quantity: 1, attributes: { size: 'M', color: 'Navy' } },
        ],
      };
      const result = computeStockStatus(product);
      expect(result.effectiveStockQty).toBe(3);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(true);
      expect(result.hasStockIssue).toBe(true);
    });

    it('returns low stock when total variant quantity is exactly 5', () => {
      const product = {
        quantity: 0,
        productvariant: [
          { quantity: 3, attributes: { size: 'M' } },
          { quantity: 2, attributes: { size: 'L' } },
        ],
      };
      const result = computeStockStatus(product);
      expect(result.effectiveStockQty).toBe(5);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(true);
      expect(result.hasStockIssue).toBe(true);
    });

    it('handles variants with null quantity — treats as 0', () => {
      const product = {
        quantity: 0,
        productvariant: [
          { quantity: null, attributes: { size: 'M' } },
          { quantity: 4, attributes: { size: 'L' } },
        ],
      };
      const result = computeStockStatus(product);
      expect(result.effectiveStockQty).toBe(4);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(true);
      expect(result.hasStockIssue).toBe(true);
    });

    it('handles variants with missing quantity field — treats as 0', () => {
      const product = {
        quantity: 0,
        productvariant: [
          { attributes: { size: 'M' } },
          { attributes: { size: 'L' }, quantity: 7 },
        ],
      };
      const result = computeStockStatus(product);
      expect(result.effectiveStockQty).toBe(7);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(false);
      expect(result.hasStockIssue).toBe(false);
    });

    it('falls back to product.quantity when variants array is empty', () => {
      const product = {
        quantity: 10,
        productvariant: [],
      };
      const result = computeStockStatus(product);
      expect(result.effectiveStockQty).toBe(10);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(false);
      expect(result.hasStockIssue).toBe(false);
    });

    it('falls back to product.quantity when productvariant field is missing', () => {
      const product = { quantity: 8 };
      const result = computeStockStatus(product);
      expect(result.effectiveStockQty).toBe(8);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(false);
    });

    it('falls back to product.quantity when productvariant is not an array', () => {
      const product = {
        quantity: 3,
        productvariant: 'not-an-array',
      };
      const result = computeStockStatus(product);
      expect(result.effectiveStockQty).toBe(3);
      expect(result.isLowStock).toBe(true);
      expect(result.hasStockIssue).toBe(true);
    });

    it('single variant with stock > 5 — in stock', () => {
      const product = {
        quantity: 0,
        productvariant: [
          { quantity: 12, attributes: { size: 'One Size', color: 'Black' } },
        ],
      };
      const result = computeStockStatus(product);
      expect(result.effectiveStockQty).toBe(12);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(false);
      expect(result.hasStockIssue).toBe(false);
    });

    it('single variant with 0 stock — out of stock', () => {
      const product = {
        quantity: 0,
        productvariant: [
          { quantity: 0, attributes: { size: 'One Size', color: 'Black' } },
        ],
      };
      const result = computeStockStatus(product);
      expect(result.effectiveStockQty).toBe(0);
      expect(result.isOutOfStock).toBe(true);
      expect(result.hasStockIssue).toBe(true);
    });
  });

  // ── Custom threshold ──
  describe('custom threshold', () => {
    it('uses provided threshold instead of default 5', () => {
      const product = { quantity: 8 };
      // Default threshold 5: 8 > 5 → not low stock
      const defaultResult = computeStockStatus(product);
      expect(defaultResult.isLowStock).toBe(false);

      // Custom threshold 10: 8 <= 10 → low stock
      const customResult = computeStockStatus(product, 10);
      expect(customResult.isLowStock).toBe(true);
      expect(customResult.effectiveStockQty).toBe(8);
      expect(customResult.isOutOfStock).toBe(false);
      expect(customResult.hasStockIssue).toBe(true);
    });

    it('threshold of 0 means only out-of-stock triggers', () => {
      const product = { quantity: 1 };
      const result = computeStockStatus(product, 0);
      // 1 <= 0 is false → hasStockIssue is false
      expect(result.hasStockIssue).toBe(false);
      expect(result.isOutOfStock).toBe(false);
      expect(result.isLowStock).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import { formatProductCardPrice } from '../../utils/formatters';

describe('formatProductCardPrice', () => {
  it('formats rupees with Rs. prefix, thousands separator and two decimals', () => {
    expect(formatProductCardPrice(1899)).toBe('Rs. 1,899.00');
    expect(formatProductCardPrice(499)).toBe('Rs. 499.00');
  });

  it('preserves fractional amounts with two decimals', () => {
    expect(formatProductCardPrice(384.3)).toBe('Rs. 384.30');
    expect(formatProductCardPrice(999.99)).toBe('Rs. 999.99');
  });

  it('handles strings and zero', () => {
    expect(formatProductCardPrice('1299')).toBe('Rs. 1,299.00');
    expect(formatProductCardPrice(0)).toBe('Rs. 0.00');
  });

  it('falls back to Rs. 0.00 for invalid input', () => {
    expect(formatProductCardPrice(null)).toBe('Rs. 0.00');
    expect(formatProductCardPrice(undefined)).toBe('Rs. 0.00');
    expect(formatProductCardPrice('abc')).toBe('Rs. 0.00');
  });
});

/**
 * BundleTierProgress tests — verifies the selektt-style bundle offer progress
 * bar reflects the actual offer tiers: progress toward the next tier, tier
 * chips, and the max-savings state.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BundleTierProgress from '../../components/cart/BundleTierProgress';

const TIERS = [
  { minQty: 2, discount: 5 },
  { minQty: 3, discount: 10 },
  { minQty: 4, discount: 15 },
];

describe('BundleTierProgress', () => {
  it('renders nothing without discount tiers', () => {
    const { container } = render(<BundleTierProgress totalQty={3} tiers={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('shows how many more items are needed for the next tier', () => {
    render(<BundleTierProgress totalQty={3} tiers={TIERS} />);
    expect(screen.getByText(/Add 1 more item to get 15% off!/)).toBeDefined();
    expect(screen.getByText('3 of 4 items in your cart')).toBeDefined();
  });

  it('pluralizes items when multiple are needed', () => {
    // Non-contiguous tiers → more than one item separates tiers
    const sparse = [
      { minQty: 3, discount: 8 },
      { minQty: 5, discount: 20 },
    ];
    render(<BundleTierProgress totalQty={1} tiers={sparse} />);
    expect(screen.getByText(/Add 2 more items to get 8% off!/)).toBeDefined();
  });

  it('shows max savings when the top tier is reached', () => {
    render(<BundleTierProgress totalQty={6} tiers={TIERS} />);
    expect(screen.getByText(/You've unlocked 15% off your order!/)).toBeDefined();
    expect(screen.getByText(/max savings reached/)).toBeDefined();
  });

  it('renders a chip for every discount tier', () => {
    render(<BundleTierProgress totalQty={2} tiers={TIERS} />);
    expect(screen.getByText('2+ · 5% off')).toBeDefined();
    expect(screen.getByText('3+ · 10% off')).toBeDefined();
    expect(screen.getByText('4+ · 15% off')).toBeDefined();
  });

  it('adapts to admin-configured tiers', () => {
    render(<BundleTierProgress totalQty={4} tiers={[{ minQty: 3, discount: 8 }, { minQty: 5, discount: 20 }]} />);
    expect(screen.getByText(/Add 1 more item to get 20% off!/)).toBeDefined();
    expect(screen.getByText('3+ · 8% off')).toBeDefined();
  });
});

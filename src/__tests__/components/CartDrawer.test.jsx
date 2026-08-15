/**
 * CartDrawer Order Summary Tests
 * Verifies the selektt.com-style drawer renders:
 *   "Shopping cart" header + count
 *   Free-shipping progress message
 *   Subtotal → amount, Discount → bundle message + -amount
 *   "Taxes and shipping calculated at checkout" note
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsContext } from '../../store/settingsContext';
import useCartStore from '../../store/cartStore';
import { initI18nSync } from '../../utils/i18n';
import CartDrawer from '../../components/layout/CartDrawer';
import { promotionsAPI } from '../../api/promotions';

// Store offers are optional — default to none so existing tests are unaffected
vi.mock('../../api/promotions', () => ({
  promotionsAPI: { getStoreOffers: vi.fn().mockResolvedValue({ data: { data: [] } }) },
}));

initI18nSync();

function renderDrawer() {
  const getSetting = (key, fallback) => {
    const overrides = {
      salesEnabled: 'true',
      bundleOfferEnabled: 'true',
      bundleTiers: JSON.stringify([{ minQty: 2, discount: 10, maxQty: null }]),
      taxCalculation: 'inclusive',
      taxRate: '18',
      currency: 'INR',
      freeShippingThreshold: '499',
    };
    return overrides[key] ?? fallback;
  };

  return render(
    <SettingsContext.Provider value={{ getSetting }}>
      <MemoryRouter>
        <CartDrawer />
      </MemoryRouter>
    </SettingsContext.Provider>
  );
}

describe('CartDrawer (selektt-style)', () => {
  beforeEach(() => {
    // 1 item × qty 2 @ ₹1,049 → subtotal ₹2,098, 10% bundle → ₹1,888.20
    useCartStore.setState({
      items: [
        { id: 'p1', productId: 'p1', cartItemId: 'c1', name: 'Classic Tee', price: 1049, quantity: 2, variantStock: 10 },
      ],
      count: 2,
      subtotal: 2098,
      isOpen: true,
    });
    vi.mocked(promotionsAPI.getStoreOffers).mockResolvedValue({ data: { data: [] } });
  });

  afterEach(() => {
    vi.mocked(promotionsAPI.getStoreOffers).mockResolvedValue({ data: { data: [] } });
  });

  it('shows the Shopping cart header with item count', () => {
    renderDrawer();
    expect(screen.getByText('Shopping cart')).toBeDefined();
    expect(screen.getByText('2 items')).toBeDefined();
  });

  it('shows the free-shipping progress message (over threshold → unlocked)', () => {
    renderDrawer();
    expect(screen.getByText("Yay! You've unlocked FREE shipping!")).toBeDefined();
  });

  it('shows the below-threshold free-shipping message with remaining amount', () => {
    // 1 item @ ₹299 → ₹299 subtotal, threshold ₹499 → ₹200 away
    useCartStore.setState({
      items: [{ id: 'p1', productId: 'p1', cartItemId: 'c1', name: 'Classic Tee', price: 299, quantity: 1, variantStock: 10 }],
      count: 1,
      subtotal: 299,
      isOpen: true,
    });
    renderDrawer();
    expect(screen.getByText('Add ₹200 more to get FREE shipping!')).toBeDefined();
    // Cheapest item is ₹299 → ceil(200/299) = 1 → "That's just 1 more item!"
    expect(screen.getByText("That's just 1 more item!")).toBeDefined();
  });

  it('shows how many more items are needed when the gap spans multiple items', () => {
    // 1 item @ ₹100 → ₹100 subtotal, threshold ₹499 → ₹399 away → 4 items needed
    useCartStore.setState({
      items: [{ id: 'p2', productId: 'p2', cartItemId: 'c2', name: 'Accessory', price: 100, quantity: 1, variantStock: 10 }],
      count: 1,
      subtotal: 100,
      isOpen: true,
    });
    renderDrawer();
    expect(screen.getByText('Add ₹399 more to get FREE shipping!')).toBeDefined();
    expect(screen.getByText("That's about 4 more items!")).toBeDefined();
  });

  it('shows the Discount row with the bundle tier message and amount', () => {
    renderDrawer();
    expect(screen.getByText('Discount')).toBeDefined();
    expect(screen.getByText(/Buy 2 Items, Get 10% Off/)).toBeDefined();
    expect(screen.getByText('-₹210')).toBeDefined();
  });

  it('shows Subtotal (gross), Total (net) and the taxes note', () => {
    renderDrawer();
    expect(screen.getByText('Subtotal')).toBeDefined();
    expect(screen.getByText('₹2,098')).toBeDefined();
    expect(screen.getByText('Total')).toBeDefined();
    expect(screen.getByText('₹1,888')).toBeDefined();
    expect(screen.getByText('Taxes and shipping calculated at checkout')).toBeDefined();
  });

  it('shows empty state with Continue shopping button when no items', () => {
    useCartStore.setState({ items: [], count: 0, subtotal: 0, isOpen: true });
    renderDrawer();
    expect(screen.getByText('Your cart is empty')).toBeDefined();
    expect(screen.getByText('Continue shopping')).toBeDefined();
  });

  it('applies the auto store-offer discount in the total (same as checkout)', async () => {
    // Smart Deal — Buy 2, get 10% off (auto-applied). Subtotal ₹2,098 → -₹209.80.
    // Bundle 10% also -₹209.80 → total 2098 − 209.80 − 209.80 = ₹1,678.40
    vi.mocked(promotionsAPI.getStoreOffers).mockResolvedValue({
      data: {
        data: [
          {
            id: 'o1', title: 'Smart Deal', discount: '10', status: 'ACTIVE', autoApply: true,
            offerBadge: 'BUY 2', offerHighlight: 'GET 10% OFF',
          },
        ],
      },
    });
    renderDrawer();

    expect(await screen.findByText('GET 10% OFF')).toBeDefined();
    // Both the store offer and the bundle discount round to -₹210 here
    expect(screen.getAllByText('-₹210').length).toBe(2);
    expect(screen.getByText('₹1,678')).toBeDefined();
  });
});

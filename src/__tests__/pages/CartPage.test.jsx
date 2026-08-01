/**
 * CartPage Component Tests
 * Tests rendering and interactions for the CartPage
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useCartStore from '../../store/cartStore';
import { initI18nSync } from '../../utils/i18n';

initI18nSync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  };
});

// Mock API modules
vi.mock('../../api/cart', () => ({
  cartAPI: {
    get: vi.fn().mockResolvedValue({ data: { data: { items: [] } } }),
    updateItem: vi.fn().mockResolvedValue({}),
    removeItem: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../api/coupons', () => ({
  couponsAPI: {
    validate: vi.fn(),
  },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
  success: vi.fn(),
  error: vi.fn(),
  __esModule: true,
}));

// Mock formatters
vi.mock('../../utils/formatters', () => ({
  formatCurrency: (val) => `$${val.toFixed(2)}`,
  slugify: (val) => val?.toLowerCase().replace(/\s+/g, '-'),
  getImageUrl: (url) => url,
  __esModule: true,
}));

// Mock useSettings — default settings: inclusive tax so totals stay unchanged in existing tests
vi.mock('../../store/useSettings', () => ({
  useSettings: () => ({
    getSetting: (key, fallback) => ({
      taxCalculation: 'inclusive',
      taxRate: '18.0',
    }[key] ?? fallback),
  }),
}));

import CartPage from '../../pages/storefront/CartPage';

function renderCartPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CartPage', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [], count: 0, subtotal: 0, isOpen: false });
    vi.clearAllMocks();
  });

  it('should show empty cart message when no items', () => {
    renderCartPage();
    expect(screen.getByText(/Your cart is empty/i)).toBeDefined();
    expect(screen.getByText(/Start Shopping/i)).toBeDefined();
  });

  it('should display cart items when items exist', () => {
    useCartStore.setState({
      items: [
        {
          id: 'prod-1',
          productId: 'prod-1',
          cartItemId: 'cart-1',
          name: 'Test Product',
          price: 29.99,
          quantity: 2,
          image: '👕',
        },
      ],
      count: 2,
      subtotal: 59.98,
    });

    renderCartPage();

    expect(screen.getByText('Test Product')).toBeDefined();
    expect(screen.getByText('2')).toBeDefined(); // quantity
    // Use getAllByText for values that may appear multiple times
    const priceElements = screen.getAllByText('$59.98');
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should display size and color when present', () => {
    useCartStore.setState({
      items: [
        {
          id: 'prod-1',
          productId: 'prod-1',
          name: 'Designer Shirt',
          price: 49.99,
          quantity: 1,
          size: 'M',
          color: 'Navy',
          image: '👔',
        },
      ],
      count: 1,
      subtotal: 49.99,
    });

    renderCartPage();

    expect(screen.getByText(/Size: M/)).toBeDefined();
    expect(screen.getByText(/Color: Navy/)).toBeDefined();
  });

  it('should navigate to checkout when button is clicked', () => {
    useCartStore.setState({
      items: [
        {
          id: 'prod-1',
          productId: 'prod-1',
          name: 'Product',
          price: 19.99,
          quantity: 1,
          image: '👕',
        },
      ],
      count: 1,
      subtotal: 19.99,
    });

    renderCartPage();

    fireEvent.click(screen.getByText(/Proceed to Checkout/i));
    expect(mockNavigate).toHaveBeenCalledWith('/checkout');
  });

  it('should show "Free" shipping when subtotal >= 499', () => {
    useCartStore.setState({
      items: [
        {
          id: 'prod-1',
          productId: 'prod-1',
          name: 'Expensive Item',
          price: 499,
          quantity: 1,
          image: '👕',
        },
      ],
      count: 1,
      subtotal: 499,
    });

    renderCartPage();

    expect(screen.getByText('Free')).toBeDefined();
  });

  it('should show free shipping threshold message', () => {
    useCartStore.setState({
      items: [
        {
          id: 'prod-1',
          productId: 'prod-1',
          name: 'Cheap Item',
          price: 100,
          quantity: 1,
          image: '👕',
        },
      ],
      count: 1,
      subtotal: 100,
    });

    renderCartPage();

    // Should show message about adding more for free shipping
    // ₹ is used in the original component
    expect(screen.getByText(/more for free shipping/i)).toBeDefined();
  });

  it('should display multiple items correctly', () => {
    useCartStore.setState({
      items: [
        {
          id: 'prod-1',
          productId: 'prod-1',
          name: 'Product 1',
          price: 15.99,
          quantity: 2,
          image: '👕',
        },
        {
          id: 'prod-2',
          productId: 'prod-2',
          name: 'Product 2',
          price: 25.50,
          quantity: 1,
          image: '👟',
        },
      ],
      count: 3,
      subtotal: 57.48,
    });

    renderCartPage();

    expect(screen.getByText('Product 1')).toBeDefined();
    expect(screen.getByText('Product 2')).toBeDefined();
    expect(screen.getByText('$57.48')).toBeDefined();
  });

  it('should show out-of-stock warning for items with zero stock', () => {
    useCartStore.setState({
      items: [
        {
          id: 'prod-1',
          productId: 'prod-1',
          name: 'Out of Stock Item',
          price: 29.99,
          quantity: 1,
          image: '👕',
          productStock: 0,
        },
      ],
      count: 1,
      subtotal: 29.99,
    });

    renderCartPage();

    const outOfStockElements = screen.getAllByText(/out of stock/i);
    expect(outOfStockElements.length).toBeGreaterThanOrEqual(1);
    // Checkout button should show all-items-unavailable warning
    expect(screen.getByText(/All Items Unavailable/i)).toBeDefined();
  });
});

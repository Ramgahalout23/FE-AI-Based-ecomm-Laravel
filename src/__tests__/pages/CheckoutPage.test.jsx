/**
 * CheckoutPage Component Tests
 * Tests simplified single-page checkout form rendering and interactions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useCartStore from '../../store/cartStore';
import toast from 'react-hot-toast';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  };
});

// Mock auth store
vi.mock('../../store/authStore', () => ({
  default: () => ({ isAuthenticated: false }),
  __esModule: true,
}));

// Mock API modules
vi.mock('../../api/checkout', () => ({
  checkoutAPI: {
    getSummary: vi.fn().mockResolvedValue({ data: { data: {} } }),
    applyCoupon: vi.fn(),
    removeCoupon: vi.fn(),
    process: vi.fn(),
    calculateShipping: vi.fn(),
  },
}));

vi.mock('../../api/payments', () => ({
  paymentsAPI: {
    getMethods: vi.fn().mockResolvedValue({
      data: {
        data: [
          { id: 'COD', name: 'Cash on Delivery', description: 'Pay when you receive' },
        ],
      },
    }),
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

import CheckoutPage from '../../pages/storefront/CheckoutPage';

function renderCheckoutPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CheckoutPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    useCartStore.setState({
      items: [
        {
          id: 'prod-1',
          productId: 'prod-1',
          name: 'Test Product',
          price: 49.99,
          quantity: 2,
        },
      ],
      count: 2,
      subtotal: 99.98,
    });
    vi.clearAllMocks();
  });

  it('should show empty cart message when cart is empty', () => {
    act(() => {
      useCartStore.setState({ items: [], count: 0, subtotal: 0 });
    });
    renderCheckoutPage();
    expect(screen.getByText(/Your cart is empty/i)).toBeDefined();
    expect(screen.getByText(/Shop Now/i)).toBeDefined();
  });

  it('should display order summary with cart items', () => {
    renderCheckoutPage();
    expect(screen.getByText('Test Product')).toBeDefined();
    expect(screen.getByText('Qty: 2')).toBeDefined();
    const priceElements = screen.getAllByText('$99.98');
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should display login prompt for guest users', () => {
    renderCheckoutPage();
    expect(screen.getByText(/Already have an account?/i)).toBeDefined();
    expect(screen.getByText(/Sign in for faster checkout/i)).toBeDefined();
  });

  it('should show shipping form fields', () => {
    renderCheckoutPage();
    expect(screen.getByText('Shipping Address')).toBeDefined();
    expect(screen.getByPlaceholderText(/First name/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/Last name/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/your@email.com/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/House No/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/City/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/State/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/6-digit PIN/i)).toBeDefined();
  });

  it('should display payment method options', async () => {
    renderCheckoutPage();
    expect(screen.getByText('Payment Method')).toBeDefined();
    expect(await screen.findByText('Cash on Delivery')).toBeDefined();
  });

  it('should show trust badges', () => {
    renderCheckoutPage();
    expect(screen.getByText(/Secure/i)).toBeDefined();
    expect(screen.getByText(/Free/i)).toBeDefined();
    expect(screen.getByText(/Easy/i)).toBeDefined();
  });

  it('should display Place Order button with total amount', () => {
    renderCheckoutPage();
    // Place Order button should be visible directly (no Review Order step)
    const placeOrderBtn = screen.getByText(/Place Order/i);
    expect(placeOrderBtn).toBeDefined();
    // Should show the total amount in at least one element
    const priceElements = screen.getAllByText(/\$99\.98/);
    expect(priceElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should display inclusive tax note by default', () => {
    renderCheckoutPage();
    // Default taxCalculation is 'inclusive' → no tax line, shows inclusive note
    expect(screen.getByText(/Inclusive of all taxes/i)).toBeDefined();
  });

  it('should display coupon input field', () => {
    renderCheckoutPage();
    expect(screen.getByPlaceholderText(/Coupon code/i)).toBeDefined();
  });

  it('should display shipping cost and subtotal', () => {
    renderCheckoutPage();
    const subtotalElements = screen.getAllByText(/Subtotal/i);
    expect(subtotalElements.length).toBeGreaterThanOrEqual(1);
    const shippingElements = screen.getAllByText(/Shipping/i);
    expect(shippingElements.length).toBeGreaterThanOrEqual(1);
    const totalElements = screen.getAllByText(/Total\b/i);
    expect(totalElements.length).toBeGreaterThanOrEqual(1);
  });

  it('should show create account option for guest users', () => {
    renderCheckoutPage();
    expect(screen.getByText(/Create an account/i)).toBeDefined();
    expect(screen.getByText(/UNLOCK PERKS/i)).toBeDefined();
  });

  it('should show password field when create account is checked', () => {
    renderCheckoutPage();
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(screen.getByPlaceholderText(/Create a secure password/i)).toBeDefined();
  });

  it('should show error when placing order with create account but no email', async () => {
    renderCheckoutPage();

    // Check create account
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Fill shipping fields (required)
    fireEvent.change(screen.getByPlaceholderText(/First name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText(/Last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/House No/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByPlaceholderText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByPlaceholderText('+91 98765 43210'), { target: { value: '+91 9876543210' } });

    // Fill password
    fireEvent.change(screen.getByPlaceholderText(/Create a secure password/i), { target: { value: 'MyPassword123' } });

    // Click Place Order (directly, no Review Order step)
    const placeOrderBtn = screen.getByText(/Place Order/i);
    fireEvent.click(placeOrderBtn);

    // Since email is empty and createAccount is checked, should show error
    // showError passes { duration: 4000 } as second argument
    expect(toast.error).toHaveBeenCalledWith('Please enter your email to create an account', expect.any(Object));
  });

  it('should show error when placing order with create account but short password', async () => {
    renderCheckoutPage();

    // Check create account
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    // Fill shipping fields (required)
    fireEvent.change(screen.getByPlaceholderText(/First name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText(/Last name/i), { target: { value: 'Doe' } });
    fireEvent.change(screen.getByPlaceholderText(/your@email.com/i), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByPlaceholderText(/House No/i), { target: { value: '123 Main St' } });
    fireEvent.change(screen.getByPlaceholderText(/City/i), { target: { value: 'Mumbai' } });
    fireEvent.change(screen.getByPlaceholderText('+91 98765 43210'), { target: { value: '+91 9876543210' } });

    // Enter short password
    fireEvent.change(screen.getByPlaceholderText(/Create a secure password/i), { target: { value: '123' } });

    // Click Place Order (directly, no Review Order step)
    fireEvent.click(screen.getByText(/Place Order/i));

    // Password too short
    // showError passes { duration: 4000 } as second argument
    expect(toast.error).toHaveBeenCalledWith('Password must be at least 8 characters', expect.any(Object));
  });

  it('should show error with missing required fields', () => {
    renderCheckoutPage();
    // Fill only some fields (not all required) to trigger validation
    fireEvent.change(screen.getByPlaceholderText(/First name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByPlaceholderText(/Last name/i), { target: { value: 'Doe' } });
    // Leave City and Phone empty to trigger validation

    // Click Place Order (directly, no Review Order step)
    fireEvent.click(screen.getByText(/Place Order/i));

    // Should show error because required fields are missing
    // fillRequiredFields uses showError which passes { duration: 4000 } as second argument
    expect(toast.error).toHaveBeenCalledWith('Please fill all required fields', expect.any(Object));
  });
});

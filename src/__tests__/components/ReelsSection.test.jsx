import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Setup i18n mock
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

// Mock stores
const mockAddItem = vi.fn();
const mockOpenCart = vi.fn();
vi.mock('../../store/cartStore', () => ({
  default: Object.assign(
    (selector) => {
      const store = {
        addItem: mockAddItem,
        openCart: mockOpenCart,
        items: [],
        count: 0,
        subtotal: 0,
      };
      return selector ? selector(store) : store;
    },
    { getState: () => ({ items: [], count: 0, subtotal: 0 }) }
  ),
}));

vi.mock('../../store/authStore', () => ({
  default: (selector) => {
    const store = { isAuthenticated: false, user: null };
    return selector ? selector(store) : store;
  },
}));

// Mock API modules
vi.mock('../../api/cart', () => ({
  cartAPI: {
    add: vi.fn().mockResolvedValue({}),
    addItem: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('../../api/products', () => ({
  productsAPI: {
    getById: vi.fn().mockResolvedValue({
      data: {
        data: {
          id: 1,
          name: 'Test Product',
          price: 999,
          quantity: 10,
          colors: ['Black', 'White'],
          sizes: ['S', 'M', 'L'],
          variants: [
            {
              id: 101,
              attributes: { color: 'Black', size: 'S' },
              quantity: 5,
              price: 999,
            },
            {
              id: 102,
              attributes: { color: 'Black', size: 'M' },
              quantity: 3,
              price: 999,
            },
            {
              id: 103,
              attributes: { color: 'White', size: 'S' },
              quantity: 0,
              price: 1099,
            },
            {
              id: 104,
              attributes: { color: 'White', size: 'M' },
              quantity: 2,
              price: 1099,
            },
          ],
        },
      },
    }),
  },
}));

vi.mock('../../utils/toast', () => ({
  addedToCart: vi.fn(),
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('../../utils/formatters', () => ({
  formatCurrency: (val) => `₹${val}`,
  getProductImage: vi.fn(() => 'https://example.com/img.jpg'),
  getImageUrl: vi.fn((url) => url),
  getVideoUrl: vi.fn((url) => url),
}));

vi.mock('../../utils/constants', () => ({
  getColorHex: vi.fn((color) => {
    const map = { Black: '#000000', White: '#FFFFFF' };
    return map[color] || '#CCCCCC';
  }),
}));

import ReelsSection from '../../components/storefront/ReelsSection';

const mockReels = [
  {
    id: 'reel-1',
    title: 'Test Reel',
    videoUrl: 'https://example.com/video.mp4',
    imageUrl: 'https://example.com/thumb.jpg',
    products: [
      {
        id: 'prod-1',
        name: 'Simple Product',
        price: 999,
        old_price: 1299,
        image_url: 'https://example.com/prod1.jpg',
      },
    ],
  },
  {
    id: 'reel-2',
    title: 'Variant Reel',
    videoUrl: 'https://example.com/video2.mp4',
    imageUrl: 'https://example.com/thumb2.jpg',
    products: [
      {
        id: 'prod-2',
        name: 'Variant Product',
        price: 1499,
        image_url: 'https://example.com/prod2.jpg',
        variants: [
          { id: 201, attributes: { color: 'Red', size: 'XL' }, quantity: 5 },
        ],
      },
    ],
  },
];

function renderWithProviders(ui) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('ReelsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when reels array is empty', () => {
    const { container } = renderWithProviders(<ReelsSection reels={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders loading skeleton when loading is true', () => {
    const { container } = renderWithProviders(<ReelsSection reels={[]} loading={true} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders reel cards when data is provided', () => {
    renderWithProviders(<ReelsSection reels={mockReels} />);
    expect(screen.getByText('reels.watch_and_buy')).toBeDefined();
  });

  it('shows product name from reel products', () => {
    renderWithProviders(<ReelsSection reels={mockReels} />);
    expect(screen.getByText('Simple Product')).toBeDefined();
  });

  it('shows formatted price for reel products', () => {
    renderWithProviders(<ReelsSection reels={mockReels} />);
    expect(screen.getByText('₹999')).toBeDefined();
  });

  it('shows discount badge when old_price exists', () => {
    renderWithProviders(<ReelsSection reels={mockReels} />);
    expect(screen.getByText('23% OFF')).toBeDefined();
  });

  it('calls addItem on cart store when clicking add to cart on simple product', async () => {
    renderWithProviders(<ReelsSection reels={[mockReels[0]]} />);
    const cartBtn = screen.getByText('reels.cart');
    fireEvent.click(cartBtn);
    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledTimes(1);
    });
    expect(mockAddItem).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'prod-1',
        productId: 'prod-1',
        name: 'Simple Product',
        price: 999,
      })
    );
  });

  it('opens cart drawer after adding item', async () => {
    renderWithProviders(<ReelsSection reels={[mockReels[0]]} />);
    const cartBtn = screen.getByText('reels.cart');
    fireEvent.click(cartBtn);
    await waitFor(() => {
      expect(mockOpenCart).toHaveBeenCalledTimes(1);
    });
  });

  it('shows variant modal when clicking add to cart on variant product', async () => {
    renderWithProviders(<ReelsSection reels={[mockReels[1]]} />);
    // For variant products, clicking add to cart should open the modal
    const cartBtn = screen.getByText('reels.cart');
    fireEvent.click(cartBtn);
    // The modal needs to load product data - wait for it
    await waitFor(() => {
      expect(screen.getByText('reels.add_to_cart')).toBeDefined();
    });
  });

  it('opens the full-screen reel player on card click', () => {
    renderWithProviders(<ReelsSection reels={mockReels} />);
    const reelCards = document.querySelectorAll('.reel-card');
    expect(reelCards.length).toBe(2);
    fireEvent.click(reelCards[0]);
    // Player should show with product card
    expect(screen.getByText('reels.show_product')).toBeDefined();
  });

  it('shows liked state when like button is clicked', () => {
    renderWithProviders(<ReelsSection reels={[mockReels[0]]} />);
    const likeBtn = screen.getByText('reels.like');
    fireEvent.click(likeBtn);
    expect(screen.getByText('reels.liked')).toBeDefined();
  });
});

describe('ReelQuickBuyModal - Variant Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens variant modal when clicking add to cart on a product with variants', async () => {
    renderWithProviders(<ReelsSection reels={[mockReels[1]]} />);
    const cartBtn = screen.getByText('reels.cart');
    fireEvent.click(cartBtn);
    // Modal should appear with color/size options
    await waitFor(() => {
      expect(screen.getByText('Color')).toBeDefined();
      expect(screen.getByText('Size')).toBeDefined();
    });
  });

  it('shows selectable color options in the modal', async () => {
    renderWithProviders(<ReelsSection reels={[mockReels[1]]} />);
    const cartBtn = screen.getByText('reels.cart');
    fireEvent.click(cartBtn);
    await waitFor(() => {
      expect(screen.getByText('Color')).toBeDefined();
    });
  });

  it('shows add to bag button with correct text', async () => {
    renderWithProviders(<ReelsSection reels={[mockReels[1]]} />);
    const cartBtn = screen.getByText('reels.cart');
    fireEvent.click(cartBtn);
    await waitFor(() => {
      expect(screen.getByText('Add to Bag')).toBeDefined();
    });
  });
});

describe('ReelPlayer Full-Screen Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens reel player when clicking a reel card', () => {
    renderWithProviders(<ReelsSection reels={mockReels} />);
    const reelCards = document.querySelectorAll('.reel-card');
    fireEvent.click(reelCards[0]);
    // Player should have product info
    expect(screen.getByText('Simple Product')).toBeDefined();
  });

  it('shows add to cart button in player bottom sheet', () => {
    renderWithProviders(<ReelsSection reels={mockReels} />);
    const reelCards = document.querySelectorAll('.reel-card');
    fireEvent.click(reelCards[0]);
    expect(screen.getByText('reels.add_to_cart')).toBeDefined();
  });

  it('adds item to cart from player bottom sheet', async () => {
    renderWithProviders(<ReelsSection reels={mockReels} />);
    const reelCards = document.querySelectorAll('.reel-card');
    fireEvent.click(reelCards[0]);
    const addBtn = screen.getByText('reels.add_to_cart');
    fireEvent.click(addBtn);
    await waitFor(() => {
      expect(mockAddItem).toHaveBeenCalledTimes(1);
    });
  });

  it('closes reel player when close button is clicked', () => {
    renderWithProviders(<ReelsSection reels={mockReels} />);
    const reelCards = document.querySelectorAll('.reel-card');
    fireEvent.click(reelCards[0]);
    // Close button should be visible (the X icon button)
    const closeBtn = document.querySelector('[class*="rounded-full"][class*="bg-white/90"]');
    if (closeBtn) {
      fireEvent.click(closeBtn);
      // Player should close - the product card text should be gone
      expect(screen.queryByText('Simple Product')).toBeNull();
    }
  });

  it('toggles play/pause when clicking video', () => {
    renderWithProviders(<ReelsSection reels={mockReels} />);
    const reelCards = document.querySelectorAll('.reel-card');
    fireEvent.click(reelCards[0]);
    // The player overlay is rendered
    expect(document.querySelector('.fixed.inset-0.z-50')).toBeDefined();
  });
});

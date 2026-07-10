import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getProductImage } from '../utils/formatters';
import { showError } from '../utils/toast';

const CART_VERSION = 2;
const CART_VERSION_KEY = 'LUXE_CART_VERSION';

// On boot, clear persisted cart data if the version has changed.
// This prevents stale cart items from a previous session persisting
// after cache-invalidating changes to the cart logic.
(() => {
  try {
    const storedVersion = parseInt(localStorage.getItem(CART_VERSION_KEY), 10);
    if (storedVersion !== CART_VERSION) {
      localStorage.removeItem('luxe-cart');
      localStorage.setItem(CART_VERSION_KEY, String(CART_VERSION));
    }
  } catch {
    // localStorage may be unavailable (e.g. private browsing restrictions)
  }
})();

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      count: 0,
      subtotal: 0,
      isOpen: false,

      /** Strips old base64 data URLs from cart items that were stored
       *  before the design upload fix switched from FileReader base64 to
       *  server-uploaded URLs (July 2026). Keeps the item intact but
       *  removes large base64 payloads to avoid localStorage bloat.
       */
      sanitizeItem: (item) => {
        if (!item) return item;
        const sanitized = { ...item };
        // Clear image field if it contains a base64 data URL (old custom design preview)
        if (typeof sanitized.image === 'string' && sanitized.image.startsWith('data:image/')) {
          sanitized.image = '';
        }
        // Same for imageUrl
        if (typeof sanitized.imageUrl === 'string' && sanitized.imageUrl.startsWith('data:image/')) {
          sanitized.imageUrl = '';
        }
        // Clean customDesign metadata — strip any base64 URLs stored in the design
        if (sanitized.customDesign) {
          if (sanitized.customDesign.serverUrl && sanitized.customDesign.serverUrl.startsWith('data:image/')) {
            sanitized.customDesign = { ...sanitized.customDesign, serverUrl: null };
          }
          if (sanitized.customDesign.url && sanitized.customDesign.url.startsWith('data:image/')) {
            sanitized.customDesign = { ...sanitized.customDesign, url: null };
          }
        }
        return sanitized;
      },

      setItems: (items) => {
        // Normalize server cart items so `cartItemId` (server id) and `id` (product id)
        // are both available, and `quantity` is set.
        const normalized = (items || []).map((i) => {
          i = get().sanitizeItem(i);
          const cartItemId = i.cartItemId ?? i.id;
          const productId = i.productId ?? i.product_id ?? i.product?.id ?? i.id;
          // Extract stock info from nested relations (for stock/availability display)
          const productStock = i.product?.quantity ?? i.productStock ?? null;
          const variantStock = i.variant?.quantity ?? i.variantStock ?? null;
          // Extract image URL using the centralized helper (handles Prisma productimage, legacy images, etc.)
          // First check direct fields, then nested product, then flattened product (Quick Add path)
          let imageUrl = i.imageUrl || i.image || null;
          if (!imageUrl) {
            imageUrl = getProductImage(i.product) || getProductImage(i);
          }
          return {
            ...i,
            ...(i.product || {}),
            ...i, // raw fields win over flattened product fields
            id: productId,
            productId,
            cartItemId,
            quantity: i.quantity ?? i.qty ?? 1,
            price: i.price ?? i.product?.price ?? 0,
            productStock,
            variantStock,
            imageUrl, // ensure imageUrl is always set from product.images
          };
        });
        const count = normalized.reduce((a, b) => a + (b.quantity || 1), 0);
        const subtotal = normalized.reduce((a, b) => a + (b.price || 0) * (b.quantity || 1), 0);
        set({ items: normalized, count, subtotal });
      },

      addItem: (item) => {
        const items = get().items;
        const size = item.size || null;
        const color = item.color || null;

        // ── Guard: reject out-of-stock items ──
        // Derive stock from whatever shape the item data comes in
        const itemStock = item.variantStock
          ?? item.variant?.quantity
          ?? item.productStock
          ?? item.product?.quantity
          ?? null;
        if (itemStock !== null && itemStock <= 0) {
          showError('This item is out of stock and cannot be added to your bag');
          return;
        }

        // Variant key: same product+size+color is the same line.
        const existingIdx = items.findIndex((i) =>
          (i.productId ?? i.product_id ?? i.id) === (item.productId ?? item.id) &&
          (i.size || null) === size &&
          (i.color || null) === color
        );
        if (existingIdx >= 0) {
          // Create new array with updated quantity — no mutation
          const updated = items.map((i, idx) =>
            idx === existingIdx
              ? { ...i, quantity: (i.quantity || 1) + (item.quantity || 1) }
              : i
          );
          get().setItems(updated);
        } else {
          get().setItems([...items, { ...item, quantity: item.quantity || 1 }]);
        }
      },

      updateQuantity: (itemId, quantity) => {
        const items = get().items.map((i) =>
          (i.id === itemId || i.cartItemId === itemId) ? { ...i, quantity } : i
        );
        get().setItems(items);
      },

      removeItem: (itemId) => {
        const items = get().items.filter((i) => i.id !== itemId && i.cartItemId !== itemId);
        get().setItems(items);
      },

      clearCart: () => set({ items: [], count: 0, subtotal: 0 }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    {
      name: 'luxe-cart',
      // Only persist cart data, not UI state (isOpen)
      partialize: (state) => ({
        items: state.items,
        count: state.count,
        subtotal: state.subtotal,
      }),
    },
  ),
);

export default useCartStore;

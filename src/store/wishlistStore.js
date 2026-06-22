import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Normalize items to always have camelCase `productId`.
 * Laravel returns `product_id` (snake_case), raw product objects use `id`.
 */
function normalizeItem(item) {
  return {
    ...item,
    productId: item.productId ?? item.product_id ?? item.id,
  };
}

const useWishlistStore = create(
  persist(
    (set, get) => ({
      items: [],
      count: 0,
      productIds: new Set(),

      setItems: (items) => {
        const normalized = items.map(normalizeItem);
        const productIds = new Set(normalized.map((i) => i.productId));
        set({ items: normalized, count: normalized.length, productIds });
      },

      addItem: (item) => {
        const normalized = normalizeItem(item);
        const productId = normalized.productId;
        if (get().productIds.has(productId)) return;
        const items = [...get().items, normalized];
        get().setItems(items);
      },

      removeItem: (productId) => {
        const items = get().items.filter((i) => i.productId !== productId);
        get().setItems(items);
      },

      isInWishlist: (productId) => get().productIds.has(productId),
      clear: () => set({ items: [], count: 0, productIds: new Set() }),
    }),
    {
      name: 'luxe-wishlist',
      // productIds is a Set (not JSON-serializable) so we rebuild it from items on rehydration
      partialize: (state) => ({
        items: state.items,
        count: state.count,
      }),
      // Rebuild productIds Set from persisted items after rehydration
      merge: (persisted, current) => {
        const items = (persisted.items || []).map(normalizeItem);
        const productIds = new Set(items.map((i) => i.productId));
        return {
          ...current,
          items,
          count: persisted.count ?? items.length,
          productIds,
        };
      },
    },
  ),
);

export default useWishlistStore;

/**
 * cartStore Unit Tests
 * Tests the Zustand shopping cart store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import useCartStore from '../../store/cartStore';

// Reset store state between tests
beforeEach(() => {
  useCartStore.setState({ items: [], count: 0, subtotal: 0, isOpen: false });
});

describe('cartStore', () => {
  describe('initial state', () => {
    it('should start with empty cart', () => {
      const state = useCartStore.getState();
      expect(state.items).toEqual([]);
      expect(state.count).toBe(0);
      expect(state.subtotal).toBe(0);
      expect(state.isOpen).toBe(false);
    });
  });

  describe('setItems', () => {
    it('should set items and recalculate count and subtotal', () => {
      useCartStore.getState().setItems([
        { id: 'prod-1', name: 'Product 1', price: 29.99, quantity: 2 },
        { id: 'prod-2', name: 'Product 2', price: 49.99, quantity: 1 },
      ]);

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.count).toBe(3); // total quantity
      expect(state.subtotal).toBeCloseTo(109.97, 2); // 29.99*2 + 49.99*1
    });

    it('should normalize cart item fields from server response', () => {
      useCartStore.getState().setItems([
        {
          product: { id: 'prod-1', name: 'Server Product', price: 19.99 },
          quantity: 3,
        },
      ]);

      const state = useCartStore.getState();
      expect(state.items[0].id).toBe('prod-1');
      expect(state.items[0].productId).toBe('prod-1');
      expect(state.items[0].price).toBe(19.99);
    });

    it('should handle empty or null items', () => {
      useCartStore.getState().setItems(null);
      expect(useCartStore.getState().items).toEqual([]);

      useCartStore.getState().setItems([]);
      expect(useCartStore.getState().items).toEqual([]);
    });
  });

  describe('addItem', () => {
    it('should add new item to cart', () => {
      useCartStore.getState().addItem({ id: 'prod-1', name: 'New Item', price: 15.99 });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].name).toBe('New Item');
      expect(state.items[0].quantity).toBe(1);
      expect(state.count).toBe(1);
    });

    it('should increase quantity for existing item (same productId, no variant)', () => {
      useCartStore.getState().setItems([
        { id: 'prod-1', productId: 'prod-1', name: 'Item', price: 10, quantity: 2 },
      ]);

      useCartStore.getState().addItem({ id: 'prod-1', productId: 'prod-1', price: 10, quantity: 3 });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.items[0].quantity).toBe(5);
      expect(state.count).toBe(5);
    });

    it('should treat same product with different size/color as separate line items', () => {
      useCartStore.getState().setItems([
        { id: 'prod-1', productId: 'prod-1', name: 'Shirt', price: 25, quantity: 1, size: 'M', color: 'Red' },
      ]);

      // Same product, different size
      useCartStore.getState().addItem({ id: 'prod-1', productId: 'prod-1', price: 25, quantity: 1, size: 'L', color: 'Red' });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(2);
      expect(state.count).toBe(2);
    });

    it('should reject items with variantStock: 0 (variant-level OOS)', () => {
      useCartStore.getState().addItem({
        id: 'prod-1',
        productId: 'prod-1',
        name: 'OOS Variant',
        price: 25,
        quantity: 1,
        size: 'M',
        color: 'Red',
        variantStock: 0,
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
      expect(state.count).toBe(0);
    });

    it('should accept items with variantStock > 0 but productStock: 0 (mixed variant stock)', () => {
      useCartStore.getState().addItem({
        id: 'prod-2',
        productId: 'prod-2',
        name: 'In Stock Variant',
        price: 25,
        quantity: 1,
        size: 'L',
        color: 'Blue',
        variantStock: 5,
        productStock: 0,
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(1);
      expect(state.count).toBe(1);
    });

    it('should reject items with variantStock: 0 even when productStock > 0', () => {
      useCartStore.getState().addItem({
        id: 'prod-3',
        productId: 'prod-3',
        name: 'OOS Variant But Product In Stock',
        price: 25,
        quantity: 1,
        size: 'S',
        color: 'Red',
        variantStock: 0,
        productStock: 10,
      });

      const state = useCartStore.getState();
      expect(state.items).toHaveLength(0);
    });
  });

  describe('updateQuantity', () => {
    it('should update quantity by item id', () => {
      useCartStore.getState().setItems([
        { id: 'prod-1', name: 'Item', price: 10, quantity: 1 },
      ]);

      useCartStore.getState().updateQuantity('prod-1', 5);

      expect(useCartStore.getState().items[0].quantity).toBe(5);
      expect(useCartStore.getState().count).toBe(5);
    });

    it('should update quantity by cartItemId', () => {
      useCartStore.getState().setItems([
        { id: 'prod-1', cartItemId: 'cart-123', name: 'Item', price: 10, quantity: 1 },
      ]);

      useCartStore.getState().updateQuantity('cart-123', 3);

      expect(useCartStore.getState().items[0].quantity).toBe(3);
    });

    it('should recalculate subtotal after quantity change', () => {
      useCartStore.getState().setItems([
        { id: 'prod-1', name: 'Item', price: 25, quantity: 2 },
      ]);

      useCartStore.getState().updateQuantity('prod-1', 4);

      expect(useCartStore.getState().subtotal).toBe(100); // 25 * 4
    });
  });

  describe('removeItem', () => {
    it('should remove item by id', () => {
      useCartStore.getState().setItems([
        { id: 'prod-1', name: 'Item 1', price: 10, quantity: 1 },
        { id: 'prod-2', name: 'Item 2', price: 20, quantity: 1 },
      ]);

      useCartStore.getState().removeItem('prod-1');

      expect(useCartStore.getState().items).toHaveLength(1);
      expect(useCartStore.getState().items[0].id).toBe('prod-2');
    });

    it('should remove item by cartItemId', () => {
      useCartStore.getState().setItems([
        { id: 'prod-1', cartItemId: 'cart-999', name: 'Item', price: 10, quantity: 1 },
      ]);

      useCartStore.getState().removeItem('cart-999');

      expect(useCartStore.getState().items).toHaveLength(0);
    });
  });

  describe('clearCart', () => {
    it('should clear all items and reset counters', () => {
      useCartStore.getState().setItems([
        { id: 'prod-1', name: 'Item', price: 10, quantity: 2 },
      ]);

      useCartStore.getState().clearCart();

      const state = useCartStore.getState();
      expect(state.items).toEqual([]);
      expect(state.count).toBe(0);
      expect(state.subtotal).toBe(0);
    });
  });

  describe('cart drawer toggle', () => {
    it('should open cart drawer', () => {
      useCartStore.getState().openCart();
      expect(useCartStore.getState().isOpen).toBe(true);
    });

    it('should close cart drawer', () => {
      useCartStore.getState().openCart();
      useCartStore.getState().closeCart();
      expect(useCartStore.getState().isOpen).toBe(false);
    });

    it('should toggle cart drawer', () => {
      expect(useCartStore.getState().isOpen).toBe(false);
      useCartStore.getState().toggleCart();
      expect(useCartStore.getState().isOpen).toBe(true);
      useCartStore.getState().toggleCart();
      expect(useCartStore.getState().isOpen).toBe(false);
    });
  });
});

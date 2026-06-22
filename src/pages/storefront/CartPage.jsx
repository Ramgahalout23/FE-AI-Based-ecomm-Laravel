import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Minus, Plus, Trash2, ArrowRight, ArrowLeft, ShoppingBag, AlertTriangle, Heart, RefreshCw } from 'lucide-react';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { trackRemoveFromCart } from '../../services/tracker';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import useAuthStore from '../../store/authStore';
import { cartAPI } from '../../api/cart';
import { wishlistAPI } from '../../api/wishlist';
import { formatCurrency, slugify, getImageUrl } from '../../utils/formatters';
import { showError, showSuccess, removedFromCart, addedToWishlist } from '../../utils/toast';
import CartPageSkeleton from '../../components/ui/CartItemSkeleton';

export default function CartPage() {
  const { items, subtotal, updateQuantity, removeItem, clearCart, setItems } = useCartStore();
  const { addItem: addToWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [savingForLater, setSavingForLater] = useState(new Set());

  // Fetch server cart on mount to ensure local state is in sync (skip for guest users)
  const { isLoading: loadingCart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await cartAPI.get();
      const data = res.data?.data || res.data;
      if (data?.items?.length > 0) {
        setItems(data.items);
      }
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 0,
    retry: false,
  });

  if (loadingCart) {
    return <CartPageSkeleton />;
  }

  // Separate available and OOS items
  const availableItems = items.filter((item) => {
    const stock = item.variantStock ?? item.productStock;
    return stock === null || stock === undefined || stock > 0;
  });
  const outOfStockItems = items.filter((item) => {
    const stock = item.variantStock ?? item.productStock;
    return stock !== null && stock !== undefined && stock <= 0;
  });
  const hasOutOfStockItems = outOfStockItems.length > 0;

  // Calculate totals from available items only
  const availableSubtotal = availableItems.reduce(
    (sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0
  );
  const availableCount = availableItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const shipping = availableSubtotal >= 499 ? 0 : 50;
  const total = availableSubtotal + shipping;

  const handleQuantityChange = async (item, newQty) => {
    if (newQty < 1 || newQty > 10) return;
    const itemKey = item.cartItemId || item.id;
    const prevQty = item.quantity;
    updateQuantity(itemKey, newQty);
    if (!isAuthenticated) return;
    try {
      await cartAPI.updateItem(itemKey, { quantity: newQty });
    } catch (err) {
      updateQuantity(itemKey, prevQty);
      const message = err?.response?.data?.message || err?.message || 'Could not update quantity';
      showError(message);
    }
  };

  const handleRemove = async (item) => {
    trackRemoveFromCart(item.productId || item.id, item.name);
    const itemKey = item.cartItemId || item.id;
    removeItem(itemKey);
    if (!isAuthenticated) {
      removedFromCart();
      return;
    }
    try {
      await cartAPI.removeItem(itemKey);
      removedFromCart();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) return;
      const message = err?.response?.data?.message || err?.message || 'Could not remove item';
      showError(message);
    }
  };

  const handleSaveForLater = async (item) => {
    const productId = item.productId || item.id;
    const itemKey = item.cartItemId || item.id;

    if (savingForLater.has(itemKey)) return;
    setSavingForLater(prev => new Set(prev).add(itemKey));

    try {
      // Add to wishlist
      if (isAuthenticated) {
        try { await wishlistAPI.add({ productId }); } catch {}
      }
      addToWishlist({ ...item, productId });
      // Remove from cart
      removeItem(itemKey);
      if (isAuthenticated) {
        try { await cartAPI.removeItem(itemKey); } catch {}
      }
      showSuccess(
        <span className="inline-flex items-center gap-1.5">
          <Heart size={14} className="text-red-500" />
          Saved to wishlist
        </span>
      );
    } finally {
      setSavingForLater(prev => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  // ── Render helpers ──
  const renderCartItem = (item, isOOS) => {
    const itemKey = item.cartItemId || item.id;
    const isSaving = savingForLater.has(itemKey);

    return (
      <div key={itemKey} className={`flex gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl ${isOOS ? 'border border-red-200 bg-red-50/30' : ''}`}>
        {/* Product Image */}
        <Link to={`/products/${item.slug || slugify(item.name)}`} className="w-20 sm:w-24 h-20 sm:h-24 sm:w-28 sm:h-28 bg-white rounded-lg sm:rounded-xl overflow-hidden flex-shrink-0">
          {item.imageUrl ? (
            <img loading="lazy" src={getImageUrl(item.imageUrl)} alt={item.name} className={`w-full h-full object-cover hover:scale-110 transition-transform duration-500 ${isOOS ? 'grayscale opacity-60' : ''}`} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">{item.image || '👕'}</div>
          )}
        </Link>

        {/* Product Details */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex justify-between gap-4">
            <div className="min-w-0">
              <Link to={`/products/${item.slug || slugify(item.name)}`} className="font-semibold text-black hover:text-gray-600 transition-colors line-clamp-2">
                {item.name}
              </Link>
              {(item.size || item.color) && (
                <p className="text-sm text-gray-500 mt-1">
                  {[item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`].filter(Boolean).join(' · ')}
                </p>
              )}
              {isOOS ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full mt-1.5 border border-red-200">
                  <AlertTriangle size={12} />
                  Out of Stock
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  In Stock
                </span>
              )}
            </div>
            <button
              onClick={() => handleRemove(item)}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors shrink-0"
              aria-label={`Remove ${item.name}`}
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="flex items-center justify-between mt-auto pt-2">
            {/* Quantity Controls - disabled for OOS */}
            <div className={`flex items-center gap-1 bg-white rounded-lg border ${isOOS ? 'border-red-200 bg-red-50/50' : 'border-gray-200'}`}>
              <button
                onClick={() => handleQuantityChange(item, item.quantity - 1)}
                className="p-2 hover:bg-gray-100 rounded-l-lg transition-colors disabled:opacity-30"
                disabled={item.quantity <= 1}
              >
                <Minus size={16} />
              </button>
              <span className={`px-3 font-medium ${isOOS ? 'text-red-400' : ''}`}>{item.quantity}</span>
              <button
                onClick={() => handleQuantityChange(item, item.quantity + 1)}
                className="p-2 hover:bg-gray-100 rounded-r-lg transition-colors"
                disabled={item.quantity >= 10 || isOOS}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Price + Save for Later */}
            <div className="flex items-center gap-3">
              {isOOS && (
                <button
                  onClick={() => handleSaveForLater(item)}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors disabled:opacity-50"
                >
                  {isSaving ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Heart size={14} />
                  )}
                  <span className="hidden sm:inline">Save</span>
                </button>
              )}
              <div className="text-right">
                {item.oldPrice && item.oldPrice > item.price && (
                  <p className="text-sm text-gray-400 line-through">{formatCurrency(item.oldPrice * item.quantity)}</p>
                )}
                <p className={`text-lg font-bold ${isOOS ? 'text-gray-400' : 'text-black'}`}>
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Empty state ──
  if (!items.length) {
    return (
      <div className="page-content bg-white flex-1">
        <SEOHead
          title="Shopping Cart | Threvolt"
          description="Review your shopping cart at Threvolt. Secure checkout with easy returns and free shipping on orders above ₹499."
          noIndex={true}
        />
        <div className="max-w-lg mx-auto px-4 pt-6 sm:pt-8">
          <Breadcrumb
            items={[{ label: 'Home', href: '/' }, { label: 'Cart' }]}
            variant="light"
            className="justify-center mb-8"
          />
        </div>
        <div className="max-w-lg mx-auto px-4 pb-20 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="font-display text-2xl font-bold text-black mb-3">Your cart is empty</h2>
          <p className="text-gray-500 mb-8">Looks like you haven't added anything to your cart yet.</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            Start Shopping <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content bg-white flex-1">
      <SEOHead
        title="Shopping Cart | Threvolt"
        description="Review your shopping cart at Luxe. Secure checkout with easy returns and free shipping on orders above ₹499."
        noIndex={true}
      />
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <Breadcrumb
          items={[{ label: 'Home', href: '/' }, { label: 'Cart' }]}
          variant="light"
          className="mb-4 sm:mb-6"
        />
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-black mb-6 sm:mb-8">
          Shopping Cart ({items.length} {items.length === 1 ? 'item' : 'items'})
        </h1>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {/* ── Left Column: Cart Items ── */}
          <div className="md:col-span-2 space-y-6">
            {/* Available Items */}
            {availableItems.length > 0 && (
              <div>
                {hasOutOfStockItems && (
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Available ({availableItems.length})
                  </h3>
                )}
                <div className="space-y-3">
                  {availableItems.map(item => renderCartItem(item, false))}
                </div>
              </div>
            )}

            {/* Unavailable Items */}
            {hasOutOfStockItems && (
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  Unavailable ({outOfStockItems.length})
                </h3>
                <div className="space-y-3">
                  {outOfStockItems.map(item => renderCartItem(item, true))}
                </div>
              </div>
            )}

            {/* Continue Shopping */}
            <Link to="/products" className="inline-flex items-center gap-2 text-gray-500 hover:text-black transition-colors text-sm font-medium">
              <ArrowLeft size={18} />
              Continue Shopping
            </Link>
          </div>

          {/* ── Right Column: Order Summary ── */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-gray-50 rounded-2xl p-6">
              <h2 className="font-display text-xl font-bold text-black mb-6">Order Summary</h2>

              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal ({availableCount} items)</span>
                  <span className="text-black font-medium">{formatCurrency(availableSubtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span className="text-black">
                    {shipping === 0 ? (
                      <span className="text-green-600 font-semibold">Free</span>
                    ) : (
                      formatCurrency(shipping)
                    )}
                  </span>
                </div>
                {availableSubtotal > 0 && availableSubtotal < 499 && (
                  <p className="text-xs text-emerald-600 font-medium">
                    Add ₹{499 - availableSubtotal} more for free shipping!
                  </p>
                )}

                {/* OOS notice */}
                {hasOutOfStockItems && (
                  <div className="flex items-start gap-2 pt-2 pb-1">
                    <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-amber-700 leading-relaxed">
                      {outOfStockItems.length === 1
                        ? '1 item is out of stock and not included in the total.'
                        : `${outOfStockItems.length} items are out of stock and not included in the total.`}
                      {' '}Save them to your wishlist and check back later.
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-3 border-t">
                  <span className="font-bold text-black text-lg">Total</span>
                  <span className="font-bold text-black text-lg">{formatCurrency(total)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => {
                  if (availableItems.length === 0) {
                    showError('All items are out of stock. Save them to your wishlist and check back later.');
                    return;
                  }
                  navigate('/checkout');
                }}
                className={`w-full py-4 rounded-xl font-semibold transition-colors mt-6 flex items-center justify-center gap-2 ${
                  availableItems.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-black text-white hover:bg-gray-800'
                }`}
              >
                {availableItems.length === 0 ? (
                  <><AlertTriangle size={18} /> All Items Unavailable</>
                ) : (
                  <><ArrowRight size={20} /> Proceed to Checkout</>
                )}
              </button>

              {/* Trust Info */}
              <div className="mt-6 text-center text-xs text-gray-500">
                <p>Secure checkout • Free delivery above ₹499 • Easy 7-day returns</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

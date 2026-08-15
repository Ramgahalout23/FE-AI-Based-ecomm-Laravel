import { Minus, Plus, AlertTriangle, RefreshCw, Zap, Trash2, ArrowRight, ArrowLeft, Heart } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import SEOHead from '../../components/seo/SEOHead';
import { withStoreName } from '../../utils/seo';
import CartIcon from '../../components/common/CartIcon';
import Breadcrumb from '../../components/common/Breadcrumb';
import { trackRemoveFromCart } from '../../services/tracker';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import useAuthStore from '../../store/authStore';
import { useSettings } from '../../store/useSettings';
import { cartAPI } from '../../api/cart';
import { wishlistAPI } from '../../api/wishlist';
import { promotionsAPI } from '../../api/promotions';
import { formatCurrency, slugify, getImageUrl } from '../../utils/formatters';
import { calcBundleDiscount, calcBundleDiscountDetails, calcTax, parseBundleTiers, isBundleOfferEnabled, getBestStoreOffer, roundINR } from '../../utils/constants';
import BundleTierProgress from '../../components/cart/BundleTierProgress';
import { showError, showSuccess, removedFromCart } from '../../utils/toast';
import CartPageSkeleton from '../../components/ui/CartItemSkeleton';

export default function CartPage() {
  const { t } = useTranslation();
  const { items, updateQuantity, removeItem, setItems } = useCartStore();
  const { addItem: addToWishlist } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const { getSetting } = useSettings();
  const navigate = useNavigate();
  const [savingForLater, setSavingForLater] = useState(new Set());
  const storeName = getSetting('storeName', 'THREVOLT');
  const freeShippingThreshold = Number(getSetting('freeShippingThreshold', '499'));
  const shippingFlatRate = Number(getSetting('shippingFlatRate', '50'));
  const currency = getSetting('currency', 'INR');

  // ── Fetch active promotions for flash sale badges ──
  const { data: promotionsData } = useQuery({
    queryKey: ['active-promotions'],
    queryFn: async () => {
      const res = await promotionsAPI.getFlashSales();
      return res.data?.data || res.data || [];
    },
    staleTime: 60000,
    retry: false,
  });

  // ── Fetch store offer cards (Smart Deal, Prepaid Offer, etc.) ──
  const { data: storeOffers = [] } = useQuery({
    queryKey: ['store-offers'],
    queryFn: async () => {
      const res = await promotionsAPI.getStoreOffers();
      const data = res?.data?.data || [];
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60000,
  });

  // Build flash sale product and category lookup maps
  const flashSaleProductIds = useMemo(() => {
    const promos = Array.isArray(promotionsData) ? promotionsData : [];
    const productIds = new Set();
    const categorySlugs = new Set();
    promos.forEach((promo) => {
      if (!promo.isActive) return;
      (promo.products || []).forEach((p) => productIds.add(p.id));
      (promo.categories || []).forEach((c) => categorySlugs.add(c.slug || c.id));
    });
    return { productIds, categorySlugs };
  }, [promotionsData]);

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

  // ── How many more items needed for free shipping (based on cheapest item in cart) ──
  const cheapestItemPrice = availableItems.length ? Math.min(...availableItems.map((item) => item.price || 0)) : 0;
  const shippingRemaining = Math.max(0, roundINR(freeShippingThreshold - availableSubtotal));
  const itemsNeededForShipping = shippingRemaining > 0 && cheapestItemPrice > 0
    ? Math.max(1, Math.ceil(shippingRemaining / cheapestItemPrice))
    : 0;

  // Calculate auto-applied store offer discounts.
  // Mirrors backend FlashSaleService logic: picks the BEST single offer, does NOT stack.
  // Uses plain IIFE instead of useMemo to avoid React hooks ordering issues after conditional early return.
  const { autoDiscount, autoDiscountOffers } = (() => {
    const bestOffer = getBestStoreOffer(availableItems, storeOffers);
    return {
      autoDiscount: bestOffer?.amount || 0,
      autoDiscountOffers: bestOffer
        ? [{
            id: bestOffer.id,
            title: bestOffer.highlight,
            badge: bestOffer.badge,
            highlight: bestOffer.highlight,
            tagline: bestOffer.tagline,
            discountLabel: `-${formatCurrency(bestOffer.amount)}`,
            discountAmount: bestOffer.amount,
          }]
        : [],
    };
  })();

  // Buy More, Save More — per-line volume discount based on each line's quantity.
  // Only applies when activated in Admin → Settings; tiers are admin-configurable.
  const bundleOfferEnabled = isBundleOfferEnabled(getSetting);
  const bundleTiers = parseBundleTiers(getSetting('bundleTiers'));
  const bundleDiscount = bundleOfferEnabled ? calcBundleDiscount(availableItems, bundleTiers) : 0;
  const bundleDetails = bundleOfferEnabled
    ? calcBundleDiscountDetails(availableItems, bundleTiers)
    : { discount: 0, tier: null, message: '', totalQty: 0 };



  // Tax — honors the admin's taxCalculation setting (mirrors backend CheckoutService::calculateTax):
  // 'inclusive' → prices already include tax → 0 added; 'exclusive' → tax added on top of subtotal.
  const taxCalculation = getSetting('taxCalculation', 'inclusive');
  const taxRate = Number(getSetting('taxRate', '18.0')) || 0;
  const tax = calcTax(availableSubtotal, taxCalculation, taxRate);

  const shipping = availableSubtotal >= freeShippingThreshold ? 0 : shippingFlatRate;
  const afterDiscount = Math.max(0, availableSubtotal - autoDiscount - bundleDiscount);
  // Whole-rupee total — discounts/tax are already rounded to whole rupees, so
  // this equals the sum of the displayed line items exactly.
  const total = roundINR(afterDiscount + tax + shipping);

  // ── Event handlers ──

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
        try { await wishlistAPI.add({ productId }); } catch { /* local state already updated */ }
      }
      addToWishlist({ ...item, productId });
      // Remove from cart
      removeItem(itemKey);
      if (isAuthenticated) {
        try { await cartAPI.removeItem(itemKey); } catch { /* local state already updated */ }
      }
      showSuccess(
        <span className="inline-flex items-center gap-1.5">
          <Heart size={14} />
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
  const isFlashSaleItem = (item) => {
    if (flashSaleProductIds.productIds.has(item.productId || item.product_id || item.id)) return true;
    if (item.categorySlug || item.category_slug || item.category?.slug) {
      return flashSaleProductIds.categorySlugs.has(item.categorySlug || item.category_slug || item.category?.slug);
    }
    return false;
  };

  const renderCartItem = (item, isOOS) => {
    const itemKey = item.cartItemId || item.id;
    const isSaving = savingForLater.has(itemKey);
    const onFlashSale = isFlashSaleItem(item);

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
              {onFlashSale && !isOOS && (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-600 bg-gradient-to-r from-purple-50 to-pink-50 px-2.5 py-0.5 rounded-full mt-1 border border-purple-200">
                  <Zap size={12} />
                  {t('cart.flash_sale')}
                </span>
              )}
              {(item.size || item.color) && (
                <p className="text-sm text-gray-500 mt-1">
                  {[item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`].filter(Boolean).join(' · ')}
                </p>
              )}
              {isOOS ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full mt-1.5 border border-red-200">
                  <AlertTriangle size={12} />
                  {t('cart.out_of_stock')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {t('cart.in_stock')}
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
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-l-lg transition-colors disabled:opacity-30"
                disabled={item.quantity <= 1}
              >
                <Minus size={16} />
              </button>
              <span className={`px-3 font-medium ${isOOS ? 'text-red-400' : ''}`}>{item.quantity}</span>
              <button
                onClick={() => handleQuantityChange(item, item.quantity + 1)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-gray-100 rounded-r-lg transition-colors"
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
                    <RefreshCw size={14} />
                  ) : (
                    <Heart size={14} />
                  )}
                  <span className="hidden sm:inline">{t('cart.save')}</span>
                </button>
              )}
              <div className="text-right">
                {item.oldPrice && item.oldPrice > item.price && (
                  <p className="text-sm text-gray-400 line-through">{formatCurrency(item.oldPrice * item.quantity)}</p>
                )}
                <p className={`text-lg font-bold ${isOOS ? 'text-gray-400' : onFlashSale ? 'text-purple-700' : 'text-black'}`}>
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
          title={withStoreName('Shopping Cart', storeName)}
          description={t('cart.seo_desc', { store: storeName, amount: formatCurrency(freeShippingThreshold, currency) })}
          noIndex={true}
        />
        <div className="max-w-lg mx-auto px-4 pt-6 sm:pt-8">
          <Breadcrumb
            items={[    {label: t('nav.home'), href: '/' }, { label: t('checkout.cart') }]}
            variant="light"
            className="justify-center mb-8"
          />
        </div>
        <div className="max-w-lg mx-auto px-4 pb-20 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CartIcon size={48} />
          </div>
          <h2 className="font-display text-2xl font-bold text-black mb-3">{t('cart.empty')}</h2>
          <p className="text-gray-500 mb-8">{t('cart.empty_desc')}</p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-colors"
          >
            {t('cart.start_shopping')} <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content bg-white flex-1">
      <SEOHead
        title={withStoreName('Shopping Cart', storeName)}
        description={t('cart.seo_desc', { store: storeName, amount: formatCurrency(freeShippingThreshold, currency) })}
        noIndex={true}
      />
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <Breadcrumb
          items={[    {label: t('nav.home'), href: '/' }, { label: t('checkout.cart') }]}
          variant="light"
          className="mb-4 sm:mb-6"
        />
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-black mb-6 sm:mb-8">
          {t('cart.title')} ({items.length} {items.length === 1 ? t('cart.item') : t('cart.items')})
        </h1>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {/* ── Left Column: Cart Items ── */}
          <div className="md:col-span-2 space-y-6">
            {/* Available Items */}
            {availableItems.length > 0 && (
              <div>
                {/* Next-tier progress bar — selektt-style, follows the bundle offer tiers */}
                {bundleOfferEnabled && (
                  <BundleTierProgress totalQty={bundleDetails.totalQty} tiers={bundleTiers} className="mb-4" />
                )}
                {hasOutOfStockItems && (
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {t('cart.available')} ({availableItems.length})
                  </h3>
                )}
                <div className="space-y-3">
                  {availableItems.map(item => renderCartItem(item, false))}
                </div>
              </div>
            )}

            {/* Unavailable Items */}
            {hasOutOfStockItems && (
              <div>                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                    {t('cart.unavailable')} ({outOfStockItems.length})
                  </h3>
                <div className="space-y-3">
                  {outOfStockItems.map(item => renderCartItem(item, true))}
                </div>
              </div>
            )}

            {/* Continue Shopping */}
            <Link to="/products" className="inline-flex items-center gap-2 text-gray-500 hover:text-black transition-colors text-sm font-medium">
              <ArrowLeft size={18} />
              {t('cart.continue_shopping')}
            </Link>
          </div>

          {/* ── Right Column: Order Summary ── */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-gray-50 rounded-2xl p-6">
              <h2 className="font-display text-xl font-bold text-black mb-6">{t('cart.order_summary')}</h2>

              {/* Auto-applied store offer cards */}
              {autoDiscountOffers.length > 0 && (
                <div className="flex flex-col gap-1.5 mb-3">
                  {autoDiscountOffers.map((offer) => (
                    <div
                      key={offer.id}
                      className="flex items-center justify-between px-3 py-2.5 bg-gray-900 border border-gray-700/50 rounded-lg shadow-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold text-white bg-white/15 px-1.5 py-0.5 rounded shrink-0">
                          {offer.badge}
                        </span>
                        <span className="text-xs font-semibold text-white/90 truncate">
                          {offer.highlight}
                        </span>
                      </div>
                      <span className="text-[10px] text-white/70 font-medium shrink-0 ml-2">
                        {offer.discountLabel}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('cart.subtotal', { count: availableCount })}</span>
                  <span className="text-black font-medium">{formatCurrency(availableSubtotal)}</span>
                </div>
                {autoDiscount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm font-medium">Store Offers</span>
                    <span className="text-gray-700 text-sm font-medium">-{formatCurrency(autoDiscount)}</span>
                  </div>
                )}
                {bundleDiscount > 0 && bundleDetails.tier && (
                  <>
                    {/* Detailed bundle discount banner */}
                    <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3.5 py-3">
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-emerald-600 font-bold text-[10px]">%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-emerald-800 leading-tight">
                        {bundleDetails.tier.discount}% off applied to your order! 🎉
                      </p>
                      <p className="text-[10px] font-medium text-emerald-700 mt-0.5 leading-tight">
                        {bundleDetails.message} <span className="font-semibold">(-{formatCurrency(bundleDiscount)})</span>
                      </p>
                      </div>
                      <span className="text-[18px] leading-none shrink-0 mt-0.5">🎉</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 text-sm font-medium">Bundle Discount</span>
                      <span className="text-emerald-600 text-sm font-medium">-{formatCurrency(bundleDiscount)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('cart.shipping')}</span>
                  <span className="text-black">
                    {shipping === 0 ? (
                      <span className="text-green-600 font-semibold">{t('cart.free')}</span>
                    ) : (
                      formatCurrency(shipping)
                    )}
                  </span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('cart.tax', { rate: taxRate })}</span>
                    <span className="text-black">{formatCurrency(tax)}</span>
                  </div>
                )}
                {freeShippingThreshold > 0 && availableSubtotal > 0 && availableSubtotal < freeShippingThreshold && (
                  <div>
                    <p className="text-xs text-emerald-600 font-semibold">
                      {t('cart.add_free_shipping', { amount: formatCurrency(shippingRemaining, currency) })}
                    </p>
                    {itemsNeededForShipping > 0 && (
                      <p className="text-[10px] text-emerald-600/80 mt-0.5">
                        {itemsNeededForShipping === 1
                          ? t('cart.drawer.free_shipping_one_item')
                          : t('cart.drawer.free_shipping_items', { count: itemsNeededForShipping })}
                      </p>
                    )}
                  </div>
                )}

                {/* OOS notice */}
                {hasOutOfStockItems && (
                  <div className="flex items-start gap-2 pt-2 pb-1">
                    <AlertTriangle size={14} />
                    <p className="text-xs text-amber-700 leading-relaxed">
                      {outOfStockItems.length === 1
                        ? t('cart.oos_single')
                        : t('cart.oos_multiple', { count: outOfStockItems.length })}
                      {' '}{t('cart.save_wishlist_check')}
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-3 border-t">
                  <span className="font-bold text-black text-lg">{t('cart.total')}</span>
                  <span className="font-bold text-black text-lg">{formatCurrency(total)}</span>
                </div>
                {taxCalculation === 'inclusive' && (
                  <p className="text-[10px] text-gray-400 text-right">{t('orders.detail.inclusive_tax')}</p>
                )}
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
              >                  {availableItems.length === 0 ? (
                  <><AlertTriangle size={18} /> {t('cart.all_unavailable')}</>
                ) : (
                  <><ArrowRight size={20} /> {t('cart.proceed_checkout')}</>
                )}
              </button>

              {/* Trust Info */}
              <div className="mt-6 text-center text-xs text-gray-500">
                <p>{t('cart.secure_checkout_text')} • {t('cart.free_delivery_text')} • {t('cart.easy_returns_text')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

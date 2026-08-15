import { X, Minus, Plus, Lock, AlertTriangle } from 'lucide-react';
import { useEffect, memo, useCallback, useMemo, useState } from 'react';

import CartIcon from '../common/CartIcon';

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import { useSettings } from '../../store/useSettings';
import { formatCurrency, getImageUrl } from '../../utils/formatters';
import { calcBundleDiscount, calcBundleDiscountDetails, calcTax, parseBundleTiers, isBundleOfferEnabled, getBestStoreOffer, roundINR } from '../../utils/constants';
import BundleTierProgress from '../cart/BundleTierProgress';
import { cartAPI } from '../../api/cart';
import { promotionsAPI } from '../../api/promotions';
import { removedFromBag } from '../../utils/toast';

export default memo(function CartDrawer() {
  const { t } = useTranslation();
  const { items, count, isOpen, closeCart, updateQuantity, removeItem, setItems } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { getSetting } = useSettings();
  const navigate = useNavigate();

  // ── Split items into available / OOS ──
  const { availableItems, outOfStockItems, hasOOS, allOOS } = useMemo(() => {
    const avail = [];
    const oos = [];
    items.forEach((item) => {
      const stock = item.variantStock ?? item.productStock;
      if (stock !== null && stock !== undefined && stock <= 0) {
        oos.push(item);
      } else {
        avail.push(item);
      }
    });
    return {
      availableItems: avail,
      outOfStockItems: oos,
      hasOOS: oos.length > 0,
      allOOS: avail.length === 0 && oos.length > 0,
    };
  }, [items]);

  // ── Adjusted subtotal (exclude OOS items) ──
  const adjustedSubtotal = useMemo(
    () => availableItems.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0),
    [availableItems]
  );

  // ── Buy More, Save More — per-line volume discount based on each line's quantity.
  // Only applies when activated in Admin → Settings; tiers are admin-configurable. ──
  const bundleOfferEnabled = isBundleOfferEnabled(getSetting);
  const bundleTiers = useMemo(
    () => parseBundleTiers(getSetting('bundleTiers')),
    [getSetting]
  );
  const bundleDiscount = useMemo(
    () => (bundleOfferEnabled ? calcBundleDiscount(availableItems, bundleTiers) : 0),
    [availableItems, bundleOfferEnabled, bundleTiers]
  );
  const bundleDetails = useMemo(
    () => (bundleOfferEnabled ? calcBundleDiscountDetails(availableItems, bundleTiers) : { discount: 0, tier: null, message: '', totalQty: 0 }),
    [availableItems, bundleOfferEnabled, bundleTiers]
  );

  // ── Auto-applied store offers (Smart Deal, Prepaid Offer, …) ──
  // Mirrors CartPage/CheckoutPage + backend FlashSaleService: picks the BEST
  // single offer (does NOT stack) and applies it to the whole cart.
  const [storeOffers, setStoreOffers] = useState([]);
  useEffect(() => {
    let mounted = true;
    const fetchOffers = async () => {
      try {
        const res = await promotionsAPI.getStoreOffers();
        const data = res.data?.data || res.data || [];
        if (mounted) setStoreOffers(Array.isArray(data) ? data : []);
      } catch {
        // Offers are optional — drawer still works without them
      }
    };
    fetchOffers();
    return () => { mounted = false; };
  }, []);

  const autoDiscountInfo = useMemo(
    () => getBestStoreOffer(availableItems, storeOffers),
    [storeOffers, availableItems]
  );
  const autoDiscount = autoDiscountInfo?.amount || 0;

  // ── Tax — honors the admin's taxCalculation setting (mirrors backend CheckoutService::calculateTax):
  // 'inclusive' → prices already include tax → 0 added; 'exclusive' → tax added on top of subtotal. ──
  const taxCalculation = getSetting('taxCalculation', 'inclusive');
  const taxRate = Number(getSetting('taxRate', '18.0')) || 0;
  const tax = useMemo(
    () => calcTax(adjustedSubtotal, taxCalculation, taxRate),
    [adjustedSubtotal, taxCalculation, taxRate]
  );

  // ── Free shipping meter (like selektt.com) ──
  const currency = getSetting('currency', 'INR');
  const freeShippingThreshold = Number(getSetting('freeShippingThreshold', '499'));
  const freeShippingRemaining = Math.max(0, roundINR(freeShippingThreshold - adjustedSubtotal));
  const freeShippingPercent = freeShippingThreshold > 0
    ? Math.min(100, Math.round((adjustedSubtotal / freeShippingThreshold) * 100))
    : 0;
  const freeShippingUnlocked = freeShippingThreshold > 0 && adjustedSubtotal >= freeShippingThreshold;

  // ── How many more items the user needs to unlock free shipping (based on cheapest item in cart) ──
  const cheapestItemPrice = useMemo(() => {
    if (!availableItems.length) return 0;
    return Math.min(...availableItems.map((item) => item.price || 0));
  }, [availableItems]);
  const itemsNeededForShipping = freeShippingRemaining > 0 && cheapestItemPrice > 0
    ? Math.max(1, Math.ceil(freeShippingRemaining / cheapestItemPrice))
    : 0;

  // Sync cart from server when drawer opens (skip for guest users)
  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    const syncCart = async () => {
      try {
        const res = await cartAPI.get();
        const data = res.data?.data || res.data;
        if (data?.items) {
          const serverItems = data.items || [];
          const currentItems = useCartStore.getState().items;
          const localOnlyItems = currentItems.filter(localItem =>
            !serverItems.some(si =>
              (si.productId ?? si.product_id ?? si.product?.id) === (localItem.productId ?? localItem.id) &&
              (si.size || null) === (localItem.size || null) &&
              (si.color || null) === (localItem.color || null)
            )
          );
          setItems([...serverItems, ...localOnlyItems]);
        }
      } catch {
        // Keep local state if server fetch fails
      }
    };
    syncCart();
  }, [isOpen, setItems, isAuthenticated]);

  const handleQuantityChange = useCallback(async (itemId, newQty) => {
    if (newQty < 1) return;
    updateQuantity(itemId, newQty);
    if (!isAuthenticated) return;
    try {
      await cartAPI.updateItem(itemId, { quantity: newQty });
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to sync cart update';
      console.warn('Cart sync error:', message);
    }
  }, [updateQuantity, isAuthenticated]);

  const handleRemove = useCallback(async (itemId) => {
    removeItem(itemId);
    if (!isAuthenticated) {
      removedFromBag();
      return;
    }
    try {
      await cartAPI.removeItem(itemId);
      removedFromBag();
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to sync cart removal';
      console.warn('Cart sync error:', message);
    }
  }, [removeItem, isAuthenticated]);

  const handleCheckout = useCallback(() => {
    closeCart();
    navigate('/checkout');
  }, [closeCart, navigate]);

  const handleViewCart = useCallback(() => {
    closeCart();
    navigate('/cart');
  }, [closeCart, navigate]);

  const handleStartShopping = useCallback(() => {
    closeCart();
    navigate('/products');
  }, [closeCart, navigate]);

  // Whole-rupee total — discounts/tax are rounded to whole rupees at the source,
  // so this equals the sum of the displayed line items exactly.
  const totalAmount = Math.max(0, roundINR(adjustedSubtotal - autoDiscount - bundleDiscount + tax));

  return (
    <>
      {/* Overlay */}
      <div
        className={`cart-drawer-overlay fixed inset-0 bg-black/40 backdrop-blur-sm z-overlay ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={`cart-drawer-panel ${isOpen ? 'is-open' : 'is-closing'} fixed top-0 right-0 w-full sm:max-w-[400px] h-dvh bg-white z-drawer flex flex-col shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('cart.drawer.aria_label')}
      >
        {/* Header — Shopping cart + count */}
        <div className="flex items-center justify-between pl-5 pr-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3.5 border-b border-gray-100 shrink-0">
          <div className="flex items-baseline gap-2">
            <h2 className="text-[17px] font-semibold tracking-tight text-gray-900">{t('cart.drawer.shopping_cart')}</h2>
            <span className="text-xs text-gray-400">
              {count === 1 ? t('cart.drawer.item', { count }) : t('cart.drawer.items', { count })}
            </span>
          </div>
          <button
            className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-900 hover:bg-gray-50 rounded-full transition-colors touch-manipulation"
            onClick={closeCart}
            aria-label={t('cart.drawer.close')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Free shipping progress bar */}
        {availableItems.length > 0 && freeShippingThreshold > 0 && (
          <div className="px-5 pt-4 pb-1 shrink-0">
            {freeShippingUnlocked ? (
              <p className="text-xs font-semibold text-emerald-600">
                {t('cart.drawer.free_shipping_unlocked')}
              </p>
            ) : (
              <div>
                <p className="text-xs font-semibold text-gray-900">
                  {t('cart.drawer.free_shipping_away', { amount: formatCurrency(freeShippingRemaining, currency) })}
                </p>
                {itemsNeededForShipping > 0 && (
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {itemsNeededForShipping === 1
                      ? t('cart.drawer.free_shipping_one_item')
                      : t('cart.drawer.free_shipping_items', { count: itemsNeededForShipping })}
                  </p>
                )}
              </div>
            )}
            <div className="mt-2 h-[3px] bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${freeShippingUnlocked ? 'bg-emerald-500' : 'bg-gray-900'}`}
                style={{ width: `${freeShippingUnlocked ? 100 : freeShippingPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
          {items.length === 0 ? (
            /* ── Empty state ── */
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <CartIcon size={28} className="text-gray-300" />
              </div>
              <h3 className="text-[15px] font-medium text-gray-900 mb-1">{t('cart.drawer.empty_title')}</h3>
              <p className="text-xs text-gray-400 mb-5">{t('cart.drawer.empty_desc')}</p>
              <button
                onClick={handleStartShopping}
                className="bg-gray-900 text-white px-6 py-2.5 rounded-full text-xs font-semibold uppercase tracking-wider hover:bg-gray-700 transition-colors active:scale-[0.97] touch-manipulation"
              >
                {t('cart.drawer.continue_shopping')}
              </button>
            </div>
          ) : (
            <div className="px-5 py-4 space-y-4">
              {/* Next-tier progress bar — selektt-style, follows the bundle offer tiers */}
              {bundleOfferEnabled && availableItems.length > 0 && (
                <BundleTierProgress totalQty={bundleDetails.totalQty} tiers={bundleTiers} />
              )}
              {items.map((item) => {
                const itemStock = item.variantStock ?? item.productStock;
                const isItemOOS = itemStock !== null && itemStock !== undefined && itemStock <= 0;
                const variantParts = [
                  item.size && `Size: ${item.size}`,
                  item.color && `Color: ${item.color}`,
                ].filter(Boolean);
                return (
                  <div key={item.id || item.cartItemId} className={`flex gap-3 ${isItemOOS ? 'opacity-60' : ''}`}>
                    {/* Product image */}
                    <div className="w-[78px] h-[98px] bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img loading="lazy" src={getImageUrl(item.imageUrl)} alt={item.name} className={`w-full h-full object-cover ${isItemOOS ? 'grayscale' : ''}`} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">{item.image || '👕'}</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex justify-between gap-2 items-start">
                        <p className={`text-[13px] leading-snug line-clamp-2 break-words ${isItemOOS ? 'text-gray-400' : 'text-gray-900 font-medium'}`}>
                          {item.name}
                        </p>
                        <button
                          onClick={() => handleRemove(item.cartItemId || item.id)}
                          className="text-gray-300 hover:text-gray-700 transition-colors p-1 -mr-1 -mt-0.5 shrink-0 touch-manipulation"
                          aria-label={t('cart.drawer.remove_item', { name: item.name })}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {variantParts.length > 0 && (
                        <p className="text-[11px] text-gray-400 mt-0.5 truncate">{variantParts.join(' · ')}</p>
                      )}
                      {isItemOOS ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600 mt-1.5">
                          <AlertTriangle size={10} />
                          {t('cart.drawer.out_of_stock')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 mt-1.5">
                          <span className="w-1 h-1 rounded-full bg-emerald-500" />
                          {t('cart.drawer.in_stock')}
                        </span>
                      )}
                      {/* Price + quantity stepper */}
                      <div className="flex items-center justify-between mt-auto pt-1.5">
                        <div className={`flex items-center border border-gray-200 rounded-md ${isItemOOS ? 'opacity-50' : ''}`}>
                          <button
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors touch-manipulation disabled:opacity-30"
                            onClick={() => !isItemOOS && handleQuantityChange(item.cartItemId || item.id, (item.quantity || 1) - 1)}
                            disabled={isItemOOS}
                            aria-label={t('cart.drawer.decrease_qty')}
                          >
                            <Minus size={12} />
                          </button>
                          <span className="w-7 text-center text-xs font-semibold tabular-nums text-gray-900">{item.quantity || 1}</span>
                          <button
                            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors touch-manipulation disabled:opacity-30"
                            onClick={() => !isItemOOS && handleQuantityChange(item.cartItemId || item.id, (item.quantity || 1) + 1)}
                            disabled={isItemOOS}
                            aria-label={t('cart.drawer.increase_qty')}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <p className={`text-sm font-semibold tabular-nums ${isItemOOS ? 'text-gray-400' : 'text-gray-900'}`}>
                          {formatCurrency(item.price, currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — subtotal + checkout */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-white shrink-0 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
            {/* Auto-applied store offer (same as checkout) */}
            {autoDiscount > 0 && autoDiscountInfo && (
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[9px] font-bold text-white bg-gray-900 px-1.5 py-0.5 rounded shrink-0">
                    {autoDiscountInfo.badge}
                  </span>
                  <span className="text-[11px] font-medium text-gray-600 truncate">{autoDiscountInfo.highlight}</span>
                </div>
                <span className="text-emerald-600 font-semibold text-sm shrink-0">-{formatCurrency(autoDiscount, currency)}</span>
              </div>
            )}

            {/* Discount — buy more, save more bundle */}
            {bundleDiscount > 0 && bundleDetails.tier && (
              <div className="flex justify-between items-start text-sm mb-1.5">
                <div>
                  <span className="text-gray-600">{t('cart.drawer.discount')}</span>
                  <p className="text-[11px] font-medium text-emerald-700 mt-0.5 leading-tight">{bundleDetails.message}</p>
                </div>
                <span className="text-emerald-600 font-semibold text-sm shrink-0">-{formatCurrency(bundleDiscount, currency)}</span>
              </div>
            )}

            {/* Subtotal (gross) */}
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-gray-600">{t('cart.drawer.subtotal')}</span>
              <span className="text-sm font-semibold tabular-nums text-gray-900">{formatCurrency(adjustedSubtotal, currency)}</span>
            </div>
            {hasOOS && (
              <p className="text-[11px] text-amber-700 mt-1.5 leading-snug">
                {outOfStockItems.length === 1
                  ? t('cart.drawer.oos_single')
                  : t('cart.drawer.oos_multiple', { count: outOfStockItems.length })}
              </p>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-xs mt-1.5">
                <span className="text-gray-500">{t('cart.drawer.tax', { rate: taxRate })}</span>
                <span className="text-gray-700 font-semibold">{formatCurrency(tax, currency)}</span>
              </div>
            )}
            {/* Total (net) */}
            <div className="flex justify-between items-baseline border-t border-gray-100 pt-2.5 mt-2">
              <span className="text-sm font-semibold text-gray-900">{t('cart.drawer.total')}</span>
              <span className="text-lg font-bold tabular-nums text-gray-900">{formatCurrency(totalAmount, currency)}</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1 mb-4">{t('cart.drawer.taxes_note')}</p>

            {/* Checkout */}
            <button
              className={`w-full py-3.5 rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 touch-manipulation ${
                allOOS
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.98]'
              }`}
              onClick={allOOS ? undefined : handleCheckout}
              disabled={allOOS}
            >
              {allOOS ? (
                <><AlertTriangle size={16} /> {t('cart.drawer.all_unavailable')}</>
              ) : (
                <><Lock size={15} /> {t('cart.drawer.checkout')}</>
              )}
            </button>

            {/* View cart */}
            <button
              onClick={handleViewCart}
              className="w-full mt-2.5 py-1 text-center text-[11px] font-semibold uppercase tracking-widest text-gray-500 hover:text-gray-900 transition-colors"
            >
              {t('cart.drawer.view_cart')}
            </button>

            {/* Trust line */}
            <p className="text-center text-[10px] text-gray-400 mt-2.5">{t('cart.drawer.free_delivery')}</p>
          </div>
        )}
      </aside>
    </>
  );
});

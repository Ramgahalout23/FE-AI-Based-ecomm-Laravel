import { X, Minus, Plus, ShoppingBag, Lock, AlertTriangle, Trash2 } from 'lucide-react';
import { useEffect, memo, useCallback, useMemo } from 'react';


import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import { useSettings } from '../../store/useSettings';
import { formatCurrency, getImageUrl } from '../../utils/formatters';
import { calcBundleDiscount, calcTax, parseBundleTiers, isBundleOfferEnabled } from '../../utils/constants';
import { cartAPI } from '../../api/cart';
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

  // ── Tax — honors the admin's taxCalculation setting (mirrors backend CheckoutService::calculateTax):
  // 'inclusive' → prices already include tax → 0 added; 'exclusive' → tax added on top of subtotal. ──
  const taxCalculation = getSetting('taxCalculation', 'inclusive');
  const taxRate = Number(getSetting('taxRate', '18.0')) || 0;
  const tax = useMemo(
    () => calcTax(adjustedSubtotal, taxCalculation, taxRate),
    [adjustedSubtotal, taxCalculation, taxRate]
  );

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

  const handleStartShopping = useCallback(() => {
    closeCart();
    navigate('/products');
  }, [closeCart, navigate]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-overlay transition-all duration-400 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 w-full sm:max-w-[420px] h-dvh bg-white z-drawer transition-transform duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] flex flex-col shadow-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label={t('cart.drawer.aria_label')}
      >
        {/* Header */}
        <div className="px-4 sm:px-5 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-4 border-b border-border flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-text-primary">{t('cart.drawer.title')}</h3>
              <p className="text-xs text-text-muted">{count === 1 ? t('cart.drawer.item', { count }) : t('cart.drawer.items', { count })}</p>
            </div>
          </div>
          <button
            className="w-10 h-10 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface rounded-xl transition-colors touch-manipulation"
            onClick={closeCart}
            aria-label={t('cart.drawer.close')}
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto bg-surface/50" style={{ overscrollBehavior: 'contain' }}>
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-5">
                <ShoppingBag size={32} />
              </div>
              <h3 className="font-display text-lg font-bold text-text-primary mb-2">{t('cart.drawer.empty_title')}</h3>
              <p className="text-sm text-text-muted mb-6">{t('cart.drawer.empty_desc')}</p>
              <button
                onClick={handleStartShopping}
                className="bg-primary text-white px-8 py-3.5 rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors shadow-glow-orange active:scale-[0.97] touch-manipulation"
              >
                {t('cart.drawer.start_shopping')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-4 sm:p-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px)/2)]">
              {items.map((item) => {
                const itemStock = item.variantStock ?? item.productStock;
                const isItemOOS = itemStock !== null && itemStock !== undefined && itemStock <= 0;
                return (
                <div key={item.id || item.cartItemId} className={`flex gap-2.5 xs:gap-3 sm:gap-4 bg-white rounded-xl p-2.5 xs:p-3 sm:p-4 border ${isItemOOS ? 'border-red-200 opacity-70' : 'border-border'} group hover:shadow-soft transition-shadow`}>
                  <div className="max-xs:w-[52px] w-16 sm:w-20 max-xs:h-[68px] h-20 sm:h-24 bg-surface rounded-lg flex items-center justify-center text-2xl sm:text-3xl shrink-0 overflow-hidden">
                    {item.imageUrl ? (
                      <img loading="lazy" src={getImageUrl(item.imageUrl)} alt={item.name} className={`w-full h-full object-cover ${isItemOOS ? 'grayscale opacity-60' : ''}`} />
                    ) : (
                      item.image || '👕'
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <div className={`font-semibold text-[13px] xs:text-sm leading-tight line-clamp-2 break-words ${isItemOOS ? 'text-text-muted' : 'text-text-primary'}`}>
                          {item.name}
                        </div>
                        <button
                          onClick={() => handleRemove(item.cartItemId || item.id)}
                          className="text-text-muted hover:text-danger transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center -mr-1.5 shrink-0 touch-manipulation"
                          aria-label={t('cart.drawer.remove_item', { name: item.name })}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="text-xs text-text-muted mt-0.5 truncate">
                        {typeof item.category === 'object' ? item.category.name || item.category.slug : item.category || t('cart.drawer.category')}
                      </div>
                      {(item.size || item.color) && (
                        <p className="text-[11px] text-text-muted mt-0.5">
                          {[item.size && `Size: ${item.size}`, item.color && `Color: ${item.color}`].filter(Boolean).join(' · ')}
                        </p>
                      )}
                      {/* Stock badge */}
                      {(() => {
                        if (isItemOOS) {
                          return (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full mt-1.5 border border-red-200">
                              <AlertTriangle size={10} />
                              {t('cart.drawer.out_of_stock')}
                            </span>
                          );
                        }
                        return (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 mt-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t('cart.drawer.in_stock')}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-border rounded-lg bg-surface min-h-11 sm:min-h-10">
                        <button
                          className={`px-2.5 sm:px-2 transition-colors h-full flex items-center justify-center min-w-11 sm:min-w-9 touch-manipulation ${isItemOOS ? 'text-red-300 cursor-not-allowed' : 'text-text-muted hover:text-primary'}`}
                          onClick={() => !isItemOOS && handleQuantityChange(item.cartItemId || item.id, (item.quantity || 1) - 1)}
                          disabled={isItemOOS}
                          aria-label={t('cart.drawer.decrease_qty')}
                        >
                          <Minus size={14} />
                        </button>
                        <span className={`w-7 sm:w-8 text-center text-xs font-bold tabular-nums ${isItemOOS ? 'text-red-400' : 'text-text-primary'}`}>{item.quantity || 1}</span>
                        <button
                          className={`px-2.5 sm:px-2 transition-colors h-full flex items-center justify-center min-w-11 sm:min-w-9 touch-manipulation ${isItemOOS ? 'text-red-300 cursor-not-allowed' : 'text-text-muted hover:text-primary'}`}
                          onClick={() => !isItemOOS && handleQuantityChange(item.cartItemId || item.id, (item.quantity || 1) + 1)}
                          disabled={isItemOOS}
                          aria-label={t('cart.drawer.increase_qty')}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className={`text-sm font-bold ${isItemOOS ? 'text-text-muted' : 'text-text-primary'}`}>{formatCurrency(item.price)}</div>
                    </div>
                  </div>
                </div>
              );})}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-4 sm:px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] border-t border-border bg-white shrink-0 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t('cart.drawer.subtotal')}</span>
                <span className={`font-semibold ${hasOOS ? 'text-text-muted' : 'text-text-primary'}`}>
                  {formatCurrency(adjustedSubtotal)}
                </span>
              </div>
              {bundleDiscount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Bundle Discount</span>
                  <span className="text-emerald-600 font-semibold">-{formatCurrency(bundleDiscount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">{t('cart.drawer.tax', { rate: taxRate })}</span>
                  <span className="text-text-primary font-semibold">{formatCurrency(tax)}</span>
                </div>
              )}
              {/* OOS notice */}
              {hasOOS && (
                <div className="flex items-start gap-1.5">
                  <AlertTriangle size={12} />
                  <p className="text-[10px] text-amber-700 leading-relaxed">
                    {outOfStockItems.length === 1
                      ? t('cart.drawer.oos_single')
                      : t('cart.drawer.oos_multiple', { count: outOfStockItems.length })}
                  </p>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">{t('cart.drawer.delivery')}</span>
                <span className="text-green-600 font-semibold text-xs">{t('cart.drawer.free')}</span>
              </div>
              <div className="flex justify-between items-end border-t border-border pt-3 mt-1">
                <span className="text-sm font-semibold text-text-primary">{t('cart.drawer.total')}</span>
                <span className="text-xl font-display font-bold text-primary">{formatCurrency(Math.max(0, adjustedSubtotal - bundleDiscount + tax))}</span>
              </div>
              {taxCalculation === 'inclusive' && (
                <p className="text-[9px] text-text-muted text-right">{t('orders.detail.inclusive_tax')}</p>
              )}
            </div>
            <button
              className={`w-full py-3.5 sm:py-4 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 touch-manipulation ${
                allOOS
                  ? 'bg-surface text-text-muted cursor-not-allowed border border-border'
                  : 'bg-primary text-white hover:bg-primary-dark shadow-glow-orange active:scale-[0.98]'
              }`}
              onClick={allOOS ? undefined : handleCheckout}
              disabled={allOOS}
            >
              {allOOS ? (
                <><AlertTriangle size={16} /> {t('cart.drawer.all_unavailable')}</>
              ) : (
                <><Lock size={16} /> {t('cart.drawer.checkout')}</>
              )}
            </button>
            {allOOS && (
              <p className="text-center text-[10px] text-amber-600 mt-2 font-medium">
                {t('cart.drawer.remove_oos')}
              </p>
            )}
            <p className="text-center text-[10px] text-text-muted mt-2.5">{t('cart.drawer.free_delivery')}</p>
          </div>
        )}
      </div>
    </>
  );
});

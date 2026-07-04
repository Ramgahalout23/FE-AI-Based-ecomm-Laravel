import { ShoppingBag, Plus, Minus, X, Heart } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

;
import { useTranslation } from 'react-i18next';
import useWishlistStore from '../../store/wishlistStore';
import useCartStore from '../../store/cartStore';
import { formatCurrency, slugify, getImageUrl, getProductImage } from '../../utils/formatters';
import { getColorHex } from '../../utils/constants';
import { computeStockStatus } from '../../utils/stockHelpers';
import { wishlistAPI } from '../../api/wishlist';
import { cartAPI } from '../../api/cart';
import useAuthStore from '../../store/authStore';
import toast, { addedToCart } from '../../utils/toast';

/* ── Main ProductCard ── */
function ProductCard({ product }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { isInWishlist, addItem: addToWL, removeItem: removeFromWL } = useWishlistStore();
  const addToCart = useCartStore((s) => s.addItem);
  const inWishlist = isInWishlist(product.id);
  const productSlug = product.slug || slugify(product.name);

  /* ── Quick Add State ── */
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);


  /* ── Variants ── */
  const variants = product.variants || product.productvariant;
  const hasVariants = Array.isArray(variants) && variants.length > 0;

  const { colors, sizes } = useMemo(() => {
    const cSet = new Set();
    const sSet = new Set();
    if (hasVariants) {
      variants.forEach((v) => {
        if (v.attributes) {
          if (v.attributes.color) cSet.add(v.attributes.color);
          if (v.attributes.size) sSet.add(v.attributes.size);
        }
      });
    }
    // Fallback: direct arrays on product (mock format)
    const colorArr = cSet.size > 0 ? [...cSet] : (Array.isArray(product.colors) ? product.colors : []);
    const sizeArr = sSet.size > 0 ? [...sSet] : (Array.isArray(product.sizes) ? product.sizes : []);
    return { colors: colorArr, sizes: sizeArr };
  }, [hasVariants, variants, product.colors, product.sizes]);

  /* ── OOS colors/sizes ── */
  const { oosColors, oosSizes } = useMemo(() => {
    if (!hasVariants) return { oosColors: new Set(), oosSizes: new Set() };
    const oc = new Set();
    const os = new Set();
    colors.forEach((c) => {
      const hasInStock = variants.some(
        (v) => v.attributes?.color === c && (v.quantity || 0) > 0
      );
      if (!hasInStock) oc.add(c);
    });
    sizes.forEach((s) => {
      const hasInStock = variants.some(
        (v) => v.attributes?.size === s && (v.quantity || 0) > 0
      );
      if (!hasInStock) os.add(s);
    });
    return { oosColors: oc, oosSizes: os };
  }, [hasVariants, variants, colors, sizes]);

  /* ── Matched variant for selected color+size ── */
  const matchedVariant = useMemo(() => {
    if (!hasVariants || !selectedColor || !selectedSize) return null;
    return variants.find(
      (v) =>
        v.attributes?.color === selectedColor &&
        v.attributes?.size === selectedSize
    ) || null;
  }, [hasVariants, variants, selectedColor, selectedSize]);

  const displayPrice = matchedVariant?.price ?? product.price;
  const hasAllSelections = (!colors.length || selectedColor) && (!sizes.length || selectedSize);

  /* ── Auto-first variant for no-selection quick add ── */
  const firstAvailVariant = useMemo(() => {
    if (!hasVariants) return null;
    return variants.find((v) => (v.quantity || 0) > 0) || variants[0] || null;
  }, [hasVariants, variants]);

  const handleWishlist = async (e) => {
    e.stopPropagation();
    try {
      if (inWishlist) {
        await wishlistAPI.remove(product.id);
        removeFromWL(product.id);
        toast.success(t('product.removed_wishlist'));
      } else {
        await wishlistAPI.add({ productId: product.id });
        addToWL(product);
        toast.success(t('product.added_wishlist'));
      }
    } catch {
      inWishlist ? removeFromWL(product.id) : addToWL(product);
    }
  };

  /* ── Reset selections when panel closes ── */
  const closePanel = useCallback(() => {
    setShowQuickAdd(false);
    setSelectedColor('');
    setSelectedSize('');
    setQty(1);
  }, []);

  /* ── Quick Add: directly to cart ── */
  const handleQuickAdd = useCallback(async (e) => {
    e.stopPropagation();
    if (isAdding) return;

    // Non-variant products: add directly to cart, no panel needed
    if (!hasVariants) {
      setIsAdding(true);
      try {
        addToCart({
          id: product.id,
          productId: product.id,
          name: product.name,
          price: product.price,
          image: getProductImage(product),
          quantity: qty,
        });
        if (isAuthenticated) {
          await cartAPI.add({ productId: product.id, quantity: qty }).catch(() => {});
        }
        addedToCart(product.name);
      } finally {
        setIsAdding(false);
      }
      return;
    }

    // If user already selected color+size from inline swatches → add directly
    if (hasAllSelections && matchedVariant && (matchedVariant.quantity || 0) > 0) {
      setIsAdding(true);
      try {
        addToCart({
          id: product.id,
          productId: product.id,
          name: product.name,
          price: matchedVariant.price ?? product.price,
          image: getProductImage(product),
          quantity: qty,
          size: selectedSize,
          color: selectedColor,
          variantId: matchedVariant.id,
        });
        if (isAuthenticated) {
          await cartAPI.add({
            productId: product.id,
            quantity: qty,
            size: selectedSize,
            color: selectedColor,
          }).catch(() => {});
        }
        addedToCart(product.name);
        setShowQuickAdd(false);
      } finally {
        setIsAdding(false);
      }
      return;
    }

    // Variants: auto-select first available variant, then show panel
    const firstAvailable = (product.variants || product.productvariant || []).find((v) => (v.quantity || 0) > 0);
    if (firstAvailable?.attributes) {
      if (firstAvailable.attributes.color && colors.length) {
        setSelectedColor(firstAvailable.attributes.color);
      }
      if (firstAvailable.attributes.size && sizes.length) {
        setSelectedSize(firstAvailable.attributes.size);
      }
    }

    setShowQuickAdd(true);
  }, [hasVariants, hasAllSelections, matchedVariant, firstAvailVariant, product, qty, selectedColor, selectedSize, addToCart, isAdding, isAuthenticated, colors, sizes]);

  /* ── Add from panel (after selections made) ── */
  const handlePanelAdd = useCallback(async () => {
    if (isAdding || !hasAllSelections) return;
    setIsAdding(true);
    try {
      if (hasVariants) {
        // Use matched variant or first available
        const useVariant = matchedVariant || firstAvailVariant;
        addToCart({
          id: product.id,
          productId: product.id,
          name: product.name,
          price: useVariant?.price ?? product.price,
          image: getProductImage(product),
          quantity: qty,
          size: selectedSize,
          color: selectedColor,
          variantId: useVariant?.id,
        });
        if (isAuthenticated) {
          await cartAPI.add({
            productId: product.id,
            quantity: qty,
            size: selectedSize,
            color: selectedColor,
          }).catch(() => {});
        }
      } else {
        addToCart({
          id: product.id,
          productId: product.id,
          name: product.name,
          price: product.price,
          image: getProductImage(product),
          quantity: qty,
        });
        if (isAuthenticated) {
          await cartAPI.add({ productId: product.id, quantity: qty }).catch(() => {});
        }
      }
      addedToCart(product.name);
      closePanel();
    } finally {
      setIsAdding(false);
    }
  }, [hasVariants, hasAllSelections, matchedVariant, firstAvailVariant, product, qty, selectedColor, selectedSize, addToCart, isAdding, closePanel, isAuthenticated]);

  /* ── Prevent body scroll when mobile bottom sheet is open ── */
  useEffect(() => {
    if (showQuickAdd) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showQuickAdd]);

  const discount = product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : null;
  const { isOutOfStock, isLowStock } = computeStockStatus(product);

  // Computed "New" badge — based on badge field, isNew flag, or recent creation
  const isNew = useMemo(() => {
    if (product.badge === 'New') return true;
    if (product.isNew) return true;
    if (product.createdAt) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      return Date.now() - new Date(product.createdAt).getTime() < thirtyDays;
    }
    return false;
  }, [product.badge, product.isNew, product.createdAt]);

  // Badge priority: Out of Stock > Low Stock > Sale (discount) > New > custom badge
  let topLeftBadge = null;
  if (isOutOfStock) {
    topLeftBadge = { label: t('product.out_of_stock'), className: 'bg-red-500 text-white' };
  } else if (isLowStock) {
    topLeftBadge = { label: t('product.low_stock'), className: 'bg-amber-500 text-white' };
  } else if (discount) {
    topLeftBadge = { label: t('product.sale_badge'), className: 'bg-red-500 text-white' };
  } else if (isNew) {
    topLeftBadge = { label: t('product.new_badge'), className: 'bg-emerald-600 text-white' };
  } else if (product.badge) {
    const badgeClass = (product.badge === 'Bestseller' || product.badge === 'Hot' || product.badge === 'Trending')
      ? 'bg-black text-white'
      : product.badge === 'Limited'
      ? 'bg-gray-600 text-white'
      : 'bg-gray-200 text-gray-800';
    topLeftBadge = { label: product.badge, className: badgeClass };
  }

  return (
    <>
      {/* ════ Product Card ════ */}
      <div
        className="group bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift border border-border cursor-pointer flex flex-col h-full"
        onClick={() => navigate(`/products/${productSlug}`)}
      >
        {/* Image Container */}
        <div className="relative aspect-[3/4] max-sm:aspect-[4/5] bg-surface overflow-hidden shrink-0">
          {/* Top-left Badge */}
          {topLeftBadge && (
            <div className={`absolute top-3 left-3 max-sm:top-2 max-sm:left-2 z-10 text-[10px] max-sm:text-[9px] font-bold px-3 max-sm:px-2 py-1 max-sm:py-0.5 rounded-full uppercase tracking-wide shadow-sm ${topLeftBadge.className}`}>
              {topLeftBadge.label}
            </div>
          )}

          {/* Wishlist */}
          <button
            onClick={handleWishlist}
            className={`absolute top-2 right-2 z-10 w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
              inWishlist
                ? 'bg-danger text-white shadow-md'
                : 'bg-white/90 backdrop-blur-sm text-text-muted hover:text-danger hover:bg-white shadow-soft'
            }`}
          >
            <Heart size={16} fill={inWishlist ? 'currentColor' : 'none'} />
          </button>

          {/* Product Image */}
          {(() => {
            const imgUrl = getProductImage(product);
            const cardImageUrl = imgUrl ? getImageUrl(imgUrl) : null;
            return cardImageUrl ? (
              <img loading="lazy" src={cardImageUrl}
                alt={product.name}
                onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-110 ${isOutOfStock ? 'grayscale opacity-60' : ''}`}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-7xl transition-all duration-500 ease-out group-hover:scale-110 ${isOutOfStock ? 'opacity-20' : 'opacity-40'}`}>
                👕
              </div>
            );
          })()}

          {/* Out of Stock overlay on image */}
          {isOutOfStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10">
              <div className="bg-white/90 backdrop-blur-sm text-gray-800 text-[11px] max-sm:text-[10px] font-bold uppercase tracking-[0.15em] px-4 max-sm:px-3 py-1.5 max-sm:py-1 rounded-full shadow-lg">
                {t('product.sold_out')}
              </div>
            </div>
          )}

          {/* ── Quick Add — Desktop: Inline Panel (inside card) ── */}
          {/* Wrapper hidden on mobile so AnimatePresence doesn't run simultaneously with mobile sheet */}
          <div className="hidden md:block absolute inset-0 z-30 pointer-events-none">
            <AnimatePresence>
              {showQuickAdd && (
                <motion.div
                  key="desktop-quick-add"
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0 }}
                  transition={{ type: 'spring', duration: 0.4, bounce: 0.15 }}
                  className="absolute inset-0 pointer-events-auto"
                  onClick={closePanel}
                >
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/5" />
                {/* Panel */}
                <div
                  className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-xl max-h-full flex flex-col"
                  onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 shrink-0">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={13} />
                    <span className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">{t('product.quick_add')}</span>
                  </div>
                  <button onClick={closePanel} className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all duration-150 active:scale-[0.85]">
                    <X size={13} />
                  </button>
                </div>

                {/* Scrollable options area */}
                <div className="flex-1 overflow-y-auto px-3 no-scrollbar">
                  <div className="space-y-2.5 pb-3">
                    {/* Product Name */}
                    <p className="text-[11px] font-medium text-gray-900 truncate leading-tight">{product.name}</p>

                    {/* Colors */}
                    {colors.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Color{selectedColor ? <span className="text-gray-800 ml-1 font-bold">· {selectedColor}</span> : ''}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {colors.map((c) => {
                            const isOOS = oosColors.has(c);
                            const isSelected = selectedColor === c;
                            return (
                              <button
                                key={c}
                                disabled={isOOS}
                                onClick={() => setSelectedColor(c)}
                                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                                  isSelected
                                    ? 'border-black scale-110 shadow-sm'
                                    : isOOS
                                    ? 'border-gray-200 opacity-30 cursor-not-allowed'
                                    : 'border-transparent hover:border-gray-300'
                                }`}
                                title={c}
                              >
                                <div
                                  className={`w-[18px] h-[18px] rounded-full border border-black/10 ${isOOS ? 'opacity-50' : ''}`}
                                  style={{ background: getColorHex(c) }}
                                />
                                {isOOS && (
                                  <span className="absolute inset-0 flex items-center justify-center">
                                    <svg viewBox="0 0 24 24" className="w-full h-full text-red-400 opacity-70" fill="none" stroke="currentColor" strokeWidth="1.5">
                                      <line x1="4" y1="4" x2="20" y2="20" />
                                    </svg>
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Sizes */}
                    {sizes.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Size{selectedSize ? <span className="text-gray-800 ml-1 font-bold">· {selectedSize}</span> : ''}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {sizes.map((s) => {
                            const isOOS = oosSizes.has(s);
                            const isSelected = selectedSize === s;
                            return (
                              <button
                                key={s}
                                disabled={isOOS}
                                onClick={() => setSelectedSize(s)}
                                className={`px-3 py-1.5 text-[10px] font-bold rounded-[3px] transition-all duration-150 ${
                                  isOOS
                                    ? 'opacity-25 cursor-not-allowed text-gray-400 bg-gray-50 line-through'
                                    : isSelected
                                    ? 'bg-black text-white shadow-sm scale-[1.02]'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {s}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quantity + Add to Cart */}
                <div className="shrink-0 px-3 pb-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 pt-1">
                    {/* Qty Stepper */}
                    <div className="flex items-center border border-gray-200 rounded-[3px] overflow-hidden shrink-0">
                      <button
                        onClick={() => setQty(Math.max(1, qty - 1))}
                        disabled={qty <= 1}
                        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all duration-150 active:scale-[0.88] disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus size={11} />
                      </button>
                      <motion.span
                        key={qty}
                        initial={{ y: 4, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.12, ease: 'easeOut' }}
                        className="w-7 h-7 flex items-center justify-center text-[12px] font-bold text-gray-800 bg-gray-50 border-x border-gray-200"
                      >{qty}</motion.span>
                      <button
                        onClick={() => setQty(qty + 1)}
                        className="w-7 h-7 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all duration-150 active:scale-[0.88]"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    {/* Add to Cart */}
                    <button
                      onClick={handlePanelAdd}
                      disabled={!hasAllSelections || isAdding}
                      className="flex-1 h-8 flex items-center justify-center gap-1.5 bg-black text-white text-[10px] font-bold rounded-[3px] transition-all duration-150 hover:bg-gray-900 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black"
                    >
                      {isAdding ? (
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <AnimatePresence mode="popLayout">
                          <motion.span
                            key={displayPrice * qty}
                            initial={{ y: 6, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -6, opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="inline-flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <ShoppingBag size={11} />
                            <span>{t('product.add_price', { price: formatCurrency(displayPrice * qty) })}</span>
                          </motion.span>
                        </AnimatePresence>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>

          {/* ── Quick Add / Out of Stock (always visible at bottom) ── */}
          {isOutOfStock ? (
            <div className="absolute bottom-0 inset-x-0 z-20 h-9 flex items-center justify-center gap-1.5 bg-gray-800/80 text-gray-300 text-[10px] max-sm:text-[8px] font-bold uppercase tracking-wider">
              <X size={11} />
              <span>{t('product.out_of_stock')}</span>
            </div>
          ) : (
            !showQuickAdd && (
              <button
                onClick={handleQuickAdd}
                className="absolute bottom-0 inset-x-0 z-20 h-9 flex items-center justify-center gap-1.5 bg-black text-white text-[10px] max-sm:text-[9px] font-bold uppercase tracking-wider transition-all duration-200 md:hover:bg-white md:hover:text-black md:hover:border-t md:hover:border-gray-200/60"
              >
                {isAdding ? (
                  <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
                ) : (
                  <><ShoppingBag size={11} /><span>{t('product.quick_add')}</span></>
                )}
              </button>
            )
          )}
        </div>

        {/* Details */}
        <div className={`p-3 md:p-4 flex flex-col flex-1 transition-all duration-300 ${isOutOfStock ? 'opacity-50' : ''}`}>
          <p className="text-[11px] max-sm:text-[10px] font-medium text-primary uppercase tracking-wider mb-1">
            {typeof product.category === 'object' ? product.category?.name || product.categoryName || 'T-Shirt' : product.category || product.categoryName || 'T-Shirt'}
          </p>

          <h3 className="text-sm max-sm:text-xs font-medium text-gray-900 line-clamp-1 group-hover:text-primary transition-colors mb-1.5 md:mb-2 tracking-wide">
            {product.name}
          </h3>

          <div className="mt-auto">
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-lg max-sm:text-sm font-display font-extrabold text-text-primary">{formatCurrency(product.price)}</span>
              {product.oldPrice && (
                <span className="text-sm max-sm:text-xs text-text-muted line-through font-medium">{formatCurrency(product.oldPrice)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════ Mobile Bottom Sheet — Portaled to body to avoid ancestor transform clipping ════ */}
      {createPortal(
        <div className="md:hidden">
          <AnimatePresence>
            {showQuickAdd && (
              <motion.div
                key="mobile-quick-add"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50"
                onClick={closePanel}
              >
                {/* Dark Backdrop */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

                {/* Bottom Sheet */}
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', duration: 0.45, bounce: 0.25 }}
                  className="absolute bottom-0 inset-x-0 max-h-[80vh] bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Drag Handle */}
                  <div className="flex justify-center pt-3 pb-1 shrink-0">
                    <div className="w-10 h-1 rounded-full bg-gray-300/70" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between px-4 pb-2 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center">
                        <ShoppingBag size={14} />
                      </div>
                      <span className="text-sm font-bold text-gray-900">{t('product.quick_add')}</span>
                    </div>
                    <button
                      onClick={closePanel}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all duration-150 active:scale-[0.85]"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Product Info Row: Thumbnail + Name + Price */}
                  <div className="flex items-center gap-3 px-4 pb-3 border-b border-gray-100 shrink-0">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      {(() => {
                        const thumbUrl = getImageUrl(getProductImage(product));
                        return thumbUrl ? (
                          <img loading="lazy" src={thumbUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">👕</div>
                        );
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-base font-display font-extrabold text-black mt-0.5">{formatCurrency(displayPrice)}</p>
                    </div>
                  </div>

                  {/* Scrollable Options */}
                  <div className="flex-1 overflow-y-auto px-4 no-scrollbar">
                    <div className="py-3 space-y-4">
                      {/* Colors */}
                      {colors.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                            Color · <span className="text-gray-900">{selectedColor || 'Select'}</span>
                          </p>
                          <div className="flex flex-wrap gap-2.5">
                            {colors.map((c) => {
                              const isOOS = oosColors.has(c);
                              const isSelected = selectedColor === c;
                              return (
                                <button
                                  key={c}
                                  disabled={isOOS}
                                  onClick={() => setSelectedColor(c)}
                                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all duration-150 ${
                                    isSelected
                                      ? 'border-black scale-110 shadow-sm'
                                      : isOOS
                                      ? 'border-gray-200 opacity-30 cursor-not-allowed'
                                      : 'border-transparent hover:border-gray-300'
                                    }`}
                                    title={c}
                                  >
                                    <div
                                      className={`w-7 h-7 rounded-full border border-black/10 ${isOOS ? 'opacity-50' : ''}`}
                                      style={{ background: getColorHex(c) }}
                                    />
                                    {isOOS && (
                                      <span className="absolute inset-0 flex items-center justify-center">
                                        <svg viewBox="0 0 24 24" className="w-full h-full text-red-400 opacity-70" fill="none" stroke="currentColor" strokeWidth="1.5">
                                          <line x1="4" y1="4" x2="20" y2="20" />
                                        </svg>
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      {/* Sizes */}
                      {sizes.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                            Size · <span className="text-gray-900">{selectedSize || 'Select'}</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {sizes.map((s) => {
                              const isOOS = oosSizes.has(s);
                              const isSelected = selectedSize === s;
                              return (
                                <button
                                  key={s}
                                  disabled={isOOS}
                                  onClick={() => setSelectedSize(s)}
                                  className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all duration-150 ${
                                    isOOS
                                      ? 'opacity-25 cursor-not-allowed text-gray-400 bg-gray-50 line-through'
                                      : isSelected
                                      ? 'bg-black text-white shadow-sm scale-[1.02]'
                                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sticky Bottom: Qty + Add to Cart */}
                  <div className="shrink-0 px-4 pb-5 pt-3 border-t border-gray-100 bg-white">
                    <div className="flex items-center gap-3">
                      {/* Qty Stepper */}
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
                        <button
                          onClick={() => setQty(Math.max(1, qty - 1))}
                          disabled={qty <= 1}
                          className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all duration-150 active:scale-[0.88] disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus size={13} />
                        </button>
                        <motion.span
                          key={qty}
                          initial={{ y: 4, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.12, ease: 'easeOut' }}
                          className="w-10 h-10 flex items-center justify-center text-sm font-bold text-gray-800 bg-gray-50 border-x border-gray-200"
                        >{qty}</motion.span>
                        <button
                          onClick={() => setQty(qty + 1)}
                          className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all duration-150 active:scale-[0.88]"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Add to Cart */}
                      <button
                        onClick={handlePanelAdd}
                        disabled={!hasAllSelections || isAdding}
                        className="flex-1 h-11 flex items-center justify-center gap-2 bg-black text-white text-xs font-bold rounded-lg transition-all duration-150 hover:bg-gray-900 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-black"
                      >
                        {isAdding ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <AnimatePresence mode="popLayout">
                            <motion.span
                              key={displayPrice * qty}
                              initial={{ y: 6, opacity: 0, scale: 0.95 }}
                              animate={{ y: 0, opacity: 1, scale: 1 }}
                              exit={{ y: -6, opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.15, ease: 'easeOut' }}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <ShoppingBag size={13} />
                              <span>{t('product.add_price', { price: formatCurrency(displayPrice * qty) })}</span>
                            </motion.span>
                          </AnimatePresence>
                        )}
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </>
  );
}

export default memo(ProductCard);

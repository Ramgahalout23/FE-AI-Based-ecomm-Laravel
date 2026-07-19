import { Plus, Minus, ShoppingBag, X, Sparkles, Heart, Eye } from 'lucide-react';
import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import useWishlistStore from '../../store/wishlistStore';
import useCartStore from '../../store/cartStore';
import useFlyToCart from '../../hooks/useFlyToCart';
import { formatCurrency, slugify, getImageUrl, getProductImages, getProductHoverImage } from '../../utils/formatters';
import { getColorHex } from '../../utils/constants';
import { computeStockStatus } from '../../utils/stockHelpers';
import { wishlistAPI } from '../../api/wishlist';
import { addedToCart, addedToWishlist, removedFromWishlist } from '../../utils/toast';
import { buildHighlights, getStyleTagline } from '../../utils/productHelpers.jsx';

/**
 * SearchProductCard — A compact ProductCard variant for use inside the SearchModal.
 * The quick-add panel is confined to the image area only, preventing overlap.
 */
export default memo(function SearchProductCard({ product }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isInWishlist, addItem: addToWL, removeItem: removeFromWL } = useWishlistStore();
  const { addItem: addToCart } = useCartStore();
  const { flyRef, flyToCart } = useFlyToCart();
  const inWishlist = isInWishlist(product.id);
  const productSlug = product.slug || slugify(product.name);

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const highlightsTimeoutRef = useRef(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  const variants = product.variants || product.productvariant || [];

  const colorsFromVariants = [...new Set(
    variants.map(v => v.attributes?.color).filter(Boolean)
  )];
  const sizesFromVariants = [...new Set(
    variants.map(v => v.attributes?.size).filter(Boolean)
  )];
  const productColors = (product.colors?.length ? product.colors : colorsFromVariants);
  const productSizes = (product.sizes?.length ? product.sizes : sizesFromVariants);

  const hasVariants = (productColors.length > 0 || productSizes.length > 0);
  const variantsList = variants;

  // OOS sets — colors/sizes with zero stock across all variants
  const oosColors = useMemo(() => {
    if (!variantsList.length) return new Set();
    return new Set(productColors.filter(color => {
      const colorVariants = variantsList.filter(v => v.attributes?.color === color);
      return colorVariants.length > 0 && colorVariants.every(v => !v.quantity || v.quantity <= 0);
    }));
  }, [variantsList, productColors]);

  const oosSizes = useMemo(() => {
    if (!variantsList.length) return new Set();
    return new Set(productSizes.filter(size => {
      const sizeVariants = variantsList.filter(v => v.attributes?.size === size);
      return sizeVariants.length > 0 && sizeVariants.every(v => !v.quantity || v.quantity <= 0);
    }));
  }, [variantsList, productSizes]);

  const highlights = useMemo(() => buildHighlights(product, true), [product]);
  const styleTagline = useMemo(() => getStyleTagline(product), [product]);

  const getMatchedVariant = useCallback(() => {
    if (!variantsList.length) return null;
    if (productColors.length && !selectedColor) return null;
    if (productSizes.length && !selectedSize) return null;
    return variantsList.find(v => {
      const attrs = v.attributes || {};
      const colorMatch = !productColors.length || attrs.color === selectedColor;
      const sizeMatch = !productSizes.length || attrs.size === selectedSize;
      return colorMatch && sizeMatch;
    }) || null;
  }, [variantsList, selectedColor, selectedSize, productColors.length, productSizes.length]);

  const matchedVariant = getMatchedVariant();
  const hasAllSelections = (!productColors.length || selectedColor) && (!productSizes.length || selectedSize);
  const canAdd = hasVariants ? (hasAllSelections && matchedVariant && (matchedVariant.quantity || 0) > 0) : ((product.quantity ?? 0) > 0);

  const displayPrice = matchedVariant?.price ?? product.price;
  const displayOldPrice = product.oldPrice && product.oldPrice > displayPrice ? product.oldPrice : null;
  const displayDiscount = displayOldPrice ? Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100) : null;

  const resetSelections = () => {
    setShowQuickAdd(false);
    setSelectedColor('');
    setSelectedSize('');
    setQty(1);
  };

  /* ── Prevent body scroll when mobile bottom sheet is open ── */
  useEffect(() => {
    if (showQuickAdd) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showQuickAdd]);

  const handleQuickAdd = (e) => {
    e.stopPropagation();
    if (isAdding) return;

    // Auto-select the first in-stock variant
    const firstAvailable = variantsList.find(v => (v.quantity || 0) > 0);
    if (firstAvailable?.attributes) {
      if (firstAvailable.attributes.color && productColors.length)
        setSelectedColor(firstAvailable.attributes.color);
      if (firstAvailable.attributes.size && productSizes.length)
        setSelectedSize(firstAvailable.attributes.size);
    }

    setShowQuickAdd(true);
    setShowHighlights(false);
  };

  const handleAddToCart = async (e) => {
    e.stopPropagation();
    if (isAdding || !canAdd) return;
    setIsAdding(true);
    flyToCart();
    try {
      addToCart({
        ...product,
        productId: product.id,
        price: displayPrice,
        quantity: qty,
        size: selectedSize || undefined,
        color: selectedColor || undefined,
        variantId: matchedVariant?.id || undefined,
      });
      addedToCart(product.name);
      resetSelections();
    } finally {
      setIsAdding(false);
    }
  };

  const handleWishlist = async (e) => {
    e.stopPropagation();
    try {
      if (inWishlist) {
        await wishlistAPI.remove(product.id);
        removeFromWL(product.id);
        removedFromWishlist();
      } else {
        await wishlistAPI.add({ productId: product.id });
        addToWL(product);
        addedToWishlist();
      }
    } catch {
      inWishlist ? removeFromWL(product.id) : addToWL(product);
    }
  };

  const handleCardClick = () => {
    if (showQuickAdd) return;
    navigate(`/products/${productSlug}`);
  };

  const handleImageMouseEnter = () => {
    setIsHovered(true);
    if (!showQuickAdd) {
      highlightsTimeoutRef.current = setTimeout(() => setShowHighlights(true), 150);
    }
  };

  const handleImageMouseLeave = () => {
    setIsHovered(false);
    if (highlightsTimeoutRef.current) {
      clearTimeout(highlightsTimeoutRef.current);
      highlightsTimeoutRef.current = null;
    }
    setShowHighlights(false);
  };

  const productImages = getProductImages(product);
  const hoverImageUrl = getProductHoverImage(product);
  const hasHoverImage = !!hoverImageUrl && hoverImageUrl !== productImages[0];

  const discount = product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : null;
  const { isOutOfStock, isLowStock, effectiveStockQty } = computeStockStatus(product);

  // Computed "New" badge — based on badge field, isNew flag, or recent creation
  const isNew = useMemo(() => {
    if (product.badge === 'New') return true;
    if (product.isNew) return true;
    if (product.createdAt) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      return Date.now() - new Date(product.createdAt).getTime() < thirtyDays;
    }
    return false;
  }, [product]);

  let topLeftBadge = null;
  if (isOutOfStock) {
    topLeftBadge = { label: t('product.out_of_stock'), className: 'bg-red-500 text-white' };
  } else if (isLowStock) {
    topLeftBadge = { label: t('product.low_stock', { count: effectiveStockQty }), className: 'bg-amber-500 text-white' };
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
      <div
        className="product-card group bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift cursor-pointer flex flex-col h-full"
        onClick={handleCardClick}
      >
      {/* Image Container */}
      <div
        ref={flyRef}
        className={`product-img-wrap relative bg-gray-100 overflow-hidden shrink-0 mb-2.5 aspect-[3/4] max-sm:aspect-[4/5] ${showQuickAdd ? 'md:min-h-[260px] md:aspect-auto' : ''}`}
        onMouseEnter={handleImageMouseEnter}
        onMouseLeave={handleImageMouseLeave}
      >
        {/* ── Desktop: Inline Quick Add Panel ── */}
        <div className="hidden md:block absolute inset-0 z-30">
          <AnimatePresence>
          {showQuickAdd && (
            <motion.div
              key="quick-add-panel"
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex flex-col bg-white"
              onClick={(e) => e.stopPropagation()}
            >
            <div className="flex items-center justify-between px-2.5 pt-2 pb-1 shrink-0 border-b border-gray-100">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center">
                  <ShoppingBag size={9} />
                </div>
                <h4 className="font-bold text-black uppercase tracking-wider text-[10px]">{t('product.quick_add')}</h4>
              </div>
              <button
                onClick={resetSelections}
                className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-black transition-all duration-200 active:scale-90"
              >
                <X size={10} />
              </button>
            </div>

            {/* Scrollable options area */}
            <div className="flex-1 overflow-y-auto px-3 no-scrollbar">
              {/* Price */}
              <div className="pt-1 pb-1.5 text-center border-b border-gray-50 sm:pt-1.5 sm:pb-2">
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-sm font-bold text-red-500">{formatCurrency(displayPrice)}</span>
                  {displayOldPrice && <span className="text-[9px] text-black line-through font-semibold">{formatCurrency(displayOldPrice)}</span>}
                  {displayDiscount && (
                    <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded-full border border-green-200">
                      -{displayDiscount}%
                    </span>
                  )}
                </div>
              </div>

              {/* Colors */}
              {productColors.length > 0 && (
                <div className="pt-1 pb-1 sm:pt-2 sm:pb-1.5 border-b border-gray-50">
                  <div className="hidden sm:flex items-center justify-between mb-1.5">                      <span className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">
                      {t('product.color')}
                    </span>
                    <span className={`text-[8px] font-medium transition-colors duration-200 ${selectedColor ? 'text-black' : 'text-gray-500'}`}>
                      {selectedColor || t('product.select')}
                    </span>
                  </div>
                  <div className="flex justify-center gap-1 sm:gap-1.5 flex-wrap">
                    {productColors.map(color => {
                      const isSelected = selectedColor === color;
                      const isOOS = oosColors.has(color);
                      const isLight = ['white','cream','beige','ivory','silver','light','blush','nude','pearl','bone','almond','vanilla'].some(l =>
                        color.toLowerCase().includes(l)
                      );
                      return (
                        <button
                          key={color}
                          onClick={(e) => { e.stopPropagation(); if (!isOOS) setSelectedColor(color); }}
                          className={`relative rounded-full transition-all duration-200 ${
                            isOOS ? 'ring-1 ring-gray-100 cursor-not-allowed opacity-40' : isSelected ? 'ring-2 ring-black ring-offset-1 scale-110 shadow-[0_0_6px_rgba(0,0,0,0.3)]' : 'ring-1 ring-gray-200 hover:ring-gray-400 hover:scale-105 shadow-sm shadow-black/5'
                          } w-4 h-4 sm:w-5 sm:h-5`}
                          title={isOOS ? `${color} - ${t('product.out_of_stock')}` : color}
                          disabled={isOOS}
                        >
                          <div
                            className={`w-full h-full rounded-full ${isLight ? 'border border-gray-200' : ''}`}
                            style={{ background: getColorHex(color) }}
                          />
                          {isOOS && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-[140%] h-[1.5px] bg-gray-400 rotate-45 absolute rounded-full" />
                            </div>
                          )}
                          {isSelected && !isOOS && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <svg width="6" height="6" viewBox="0 0 12 12" fill="none" className="drop-shadow-sm">
                                <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sizes */}
              {productSizes.length > 0 && (
                <div className="pt-1 pb-1 sm:pt-2 sm:pb-1.5 border-b border-gray-50">
                  <div className="hidden sm:flex items-center justify-between mb-1.5">                      <span className="text-[8px] font-semibold text-gray-500 uppercase tracking-wider">
                      {t('product.size')}
                    </span>
                    <span className={`text-[8px] font-medium transition-colors duration-200 ${selectedSize ? 'text-black' : 'text-gray-500'}`}>
                      {selectedSize || t('product.select')}
                    </span>
                  </div>
                  <div className="flex justify-center gap-1 flex-wrap">
                    {productSizes.map(size => {
                      const isSelected = selectedSize === size;
                      const isOOS = oosSizes.has(size);
                      const btnClass = (isOOS
                        ? 'bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed line-through'
                        : isSelected
                          ? 'bg-black text-white shadow-sm scale-105 ring-1 ring-black'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 shadow-sm shadow-black/5'
                      ) + ' rounded-md text-[8px] sm:text-[9px] font-semibold transition-all duration-200 px-1.5 py-0.5 sm:px-2 sm:py-1 min-w-[26px] sm:min-w-[30px] flex items-center justify-center';
                      return (
                        <button
                          key={size}
                          onClick={(e) => { e.stopPropagation(); if (!isOOS) setSelectedSize(size); }}
                          disabled={isOOS}
                          className={btnClass}
                        >
                          {isOOS && <span><span>{size}</span> <span className="text-[6px] font-normal text-gray-500 uppercase tracking-wider">OOS</span></span>}
                          {!isOOS && size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Add section — always visible at bottom */}
            <div className="shrink-0 px-2.5 pb-1.5 border-t border-gray-50">
              <div className="pt-1.5 pb-0.5">
                {/* Quantity Stepper */}
                <div className="flex justify-center mb-1.5">
                  <div className="inline-flex items-center bg-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={(e) => { e.stopPropagation(); setQty(Math.max(1, qty - 1)); }}
                      disabled={qty <= 1}
                      className="text-gray-500 hover:text-black disabled:text-gray-200 disabled:cursor-not-allowed h-7 sm:h-8 w-7 sm:w-8 flex items-center justify-center transition-colors hover:bg-gray-200"
                    >
                      <Minus size={10} />
                    </button>
                    <span className="text-center font-bold text-black w-7 sm:w-8 text-[10px] sm:text-[11px] select-none border-x border-gray-200 h-7 sm:h-8 flex items-center justify-center">{qty}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setQty(qty + 1); }}
                      className="text-gray-500 hover:text-black h-7 sm:h-8 w-7 sm:w-8 flex items-center justify-center transition-colors hover:bg-gray-200"
                    >
                      <Plus size={10} />
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={!canAdd || isAdding}
                  className={`w-full h-8 sm:h-9 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all duration-200 text-[9px] sm:text-[10px] ${
                    canAdd && !isAdding
                      ? 'bg-black text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isAdding ? (
                    <span className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : !hasAllSelections && hasVariants ? (
                    <span>{t('product.select') || 'Select'}</span>
                  ) : !matchedVariant && hasVariants ? (
                    <span>{t('product.unavailable') || 'Unavailable'}</span>
                  ) : !canAdd ? (
                    <span>{t('product.sold_out') || 'Sold Out'}</span>
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
                        <ShoppingBag size={10} />
                        <span>{t('product.add_price', { price: formatCurrency(displayPrice * qty) })}</span>
                      </motion.span>
                    </AnimatePresence>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        )}          </AnimatePresence>
          </div>

        {/* Highlights Overlay */}
        <AnimatePresence>
          {!showQuickAdd && showHighlights && highlights.length > 0 && (
            <motion.div
              key="highlights-overlay"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-white/90 text-[9px] font-medium leading-tight mb-1.5 line-clamp-2">
                {styleTagline}
              </p>
              <div className="flex flex-wrap gap-1">
                {highlights.slice(0, 4).map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-[7px] font-semibold uppercase tracking-wider"
                  >
                    {h.icon}
                    {h.value}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top-left Badge */}
        {!showQuickAdd && topLeftBadge && (
          <div className={`absolute top-3 left-3 max-sm:top-2 max-sm:left-2 z-10 text-[9px] max-sm:text-[8px] font-bold px-2 max-sm:px-1.5 py-0.5 uppercase tracking-wider ${topLeftBadge.className}`}>
            {topLeftBadge.label}
          </div>
        )}

        {/* Wishlist - hover only */}
        {!showQuickAdd && (
          <button
            onClick={handleWishlist}
            className={`absolute top-2 right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
              inWishlist
                ? 'bg-danger text-white shadow-md opacity-100 scale-100'
                : 'bg-white/80 backdrop-blur-sm text-gray-400 hover:text-danger hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-90'
            }`}
          >
            <Heart size={15} fill={inWishlist ? 'currentColor' : 'none'} />
          </button>
        )}

        {/* Quick View - appears on hover */}
        {!showQuickAdd && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/products/${productSlug}`); }}
            className="absolute top-[52px] right-2 z-10 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 bg-white/80 backdrop-blur-sm text-gray-400 hover:text-black hover:bg-white shadow-sm opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-90"
          >
            <Eye size={15} />
          </button>
        )}

        {/* Product Image - premium hover crossfade with multi-image layering */}
        <div className="product-img-stack">
          {productImages.length > 0 ? (
            <>
              {/* Primary image */}
              <img
                src={getImageUrl(productImages[0])}
                alt={product.name}
                loading="lazy"
                className={`product-img-layer w-full h-full object-cover transition-all duration-500 ${isOutOfStock ? 'grayscale opacity-60' : ''} ${!isHovered || !hasHoverImage ? 'active' : ''}`}
              />
              {/* Hover image — uses dedicated hoverImageUrl if set, otherwise second product image */}
              <img
                src={getImageUrl(hoverImageUrl || productImages[1] || '')}
                alt={`${product.name} - hover view`}
                loading="lazy"
                className={`product-img-layer w-full h-full object-cover transition-all duration-500 ${isOutOfStock ? 'grayscale opacity-60' : ''} ${isHovered && hasHoverImage ? 'active' : ''}`}
              />
            </>
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-7xl transition-all duration-500 ${isOutOfStock ? 'opacity-20' : 'opacity-40'}`}>👕</div>
          )}
        </div>

        {/* Out of Stock overlay on image */}
        {isOutOfStock && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/10">
            <div className="bg-white/90 backdrop-blur-sm text-gray-800 text-[11px] max-sm:text-[9px] font-bold uppercase tracking-[0.15em] px-4 max-sm:px-3 py-1.5 max-sm:py-1 rounded-full shadow-lg">
            {t('product.sold_out')}
          </div>
          </div>
        )}

        {/* Image indicator dots */}
        {hasHoverImage && (
          <div className="product-img-dots">
            <div className={`product-img-dot ${!isHovered ? 'active' : ''}`} />
            <div className={`product-img-dot ${isHovered ? 'active' : ''}`} />
          </div>
        )}

        {/* Quick Add Button */}
        {isOutOfStock ? (
          <div className="absolute bottom-0 inset-x-0 z-30 h-9 flex items-center justify-center gap-1.5 bg-gray-800/80 text-gray-300 text-[10px] max-sm:text-[8px] font-bold uppercase tracking-wider">
            <X size={12} />
            {t('product.out_of_stock')}
          </div>
        ) : (
          !showQuickAdd && (
            <button
              onClick={handleQuickAdd}
              className="absolute bottom-0 inset-x-0 z-30 h-9 md:h-10 flex items-center justify-center gap-1.5 bg-black/90 md:bg-black text-white text-[10px] max-sm:text-[9px] font-bold uppercase tracking-wider transition-all duration-300 md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 md:hover:bg-white md:hover:text-black md:hover:border-t md:hover:border-gray-200/60"
            >
              {isAdding ? (
                <span className="w-3.5 h-3.5 border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
              ) : (
                <><ShoppingBag size={12} /><span>{t('product.quick_add')}</span></>
              )}
            </button>
          )
        )}

        {/* Details hint */}
        {!showQuickAdd && !isOutOfStock && !showHighlights && (
          <div className="absolute top-2 left-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-white/70 backdrop-blur-sm text-[7px] font-semibold text-gray-600 uppercase tracking-wider shadow-sm">
              <Sparkles size={8} />
              {t('product.details_label')}
            </span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className={`flex flex-col flex-1 px-0.5 transition-all duration-300 ${isOutOfStock ? 'opacity-50' : ''}`}>
        <h3 className="text-xs max-sm:text-[10px] font-medium text-gray-900 line-clamp-1 group-hover:text-primary transition-colors mb-1.5 md:mb-2 tracking-wide">
          {product.name}
        </h3>
        {highlights.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-0.5">
            {highlights.slice(0, 2).map((h, i) => (
              <span key={i} className="text-[8px] text-gray-400 font-medium">
                {h.value}
                {i < Math.min(highlights.length, 2) - 1 && <span className="mx-1 text-gray-300">·</span>}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto">
          <div className="price">
            <span className="text-lg max-sm:text-sm font-display font-extrabold text-red-500">{formatCurrency(displayPrice)}</span>
            {displayOldPrice && <span className="original text-xs max-sm:text-[10px] text-black line-through">{formatCurrency(displayOldPrice)}</span>}
          </div>
          {displayDiscount && (
            <span className="inline-block mt-0.5 text-[8px] font-bold text-green-600 bg-green-50 px-1 py-0.5 rounded-full border border-green-200">
              {t('product.save_amount', { amount: formatCurrency(displayOldPrice - displayPrice) })}
            </span>
          )}
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
                className="fixed inset-0 z-[9999]"
                onClick={resetSelections}
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
                  <div className="flex justify-center pt-2 pb-0.5 shrink-0">
                    <div className="w-8 h-1 rounded-full bg-gray-300/70" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between px-3 pb-1.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
                        <ShoppingBag size={12} />
                      </div>
                      <span className="text-xs font-bold text-gray-900">{t('product.quick_add')}</span>
                    </div>
                    <button
                      onClick={resetSelections}
                      className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all duration-150 active:scale-[0.85]"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* Product Info Row: Thumbnail + Name + Price */}
                  <div className="flex items-center gap-2 px-3 pb-2 border-b border-gray-100 shrink-0">
                    <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      {(() => {
                        const imgUrl = getImageUrl(productImages[0] || '');
                        return imgUrl ? (
                          <img loading="lazy" src={imgUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">👕</div>
                        );
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-sm font-display font-extrabold text-black mt-0.5">{formatCurrency(displayPrice)}</p>
                    </div>
                  </div>

                  {/* Scrollable Options */}
                  <div className="flex-1 overflow-y-auto px-3 no-scrollbar">
                    <div className="py-2 space-y-2">
                      {/* Colors */}
                      {productColors.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            {t('product.color')} · <span className="text-gray-900">{selectedColor || t('product.select')}</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {productColors.map((c) => {
                              const isOOS = oosColors.has(c);
                              const isSelected = selectedColor === c;
                              const isLight = ['white','cream','beige','ivory','silver','light','blush','nude','pearl','bone','almond','vanilla'].some(l =>
                                c.toLowerCase().includes(l)
                              );
                              return (
                                <button
                                  key={c}
                                  disabled={isOOS}
                                  onClick={() => { if (!isOOS) setSelectedColor(c); }}
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
                                    className={`w-[18px] h-[18px] rounded-full border border-black/10 ${isOOS ? 'opacity-50' : ''} ${isLight && !isOOS ? 'border-gray-300' : ''}`}
                                    style={{ background: getColorHex(c) }}
                                  />
                                  {isOOS && (
                                    <span className="absolute inset-0 flex items-center justify-center">
                                      <svg viewBox="0 0 24 24" className="w-full h-full text-red-400 opacity-70" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <line x1="4" y1="4" x2="20" y2="20" />
                                      </svg>
                                    </span>
                                  )}
                                  {isSelected && !isOOS && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <svg width="8" height="8" viewBox="0 0 12 12" fill="none" className="drop-shadow-sm">
                                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Sizes */}
                      {productSizes.length > 0 && (
                        <div>
                          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                            {t('product.size')} · <span className="text-gray-900">{selectedSize || t('product.select')}</span>
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {productSizes.map((s) => {
                              const isOOS = oosSizes.has(s);
                              const isSelected = selectedSize === s;
                              return (
                                <button
                                  key={s}
                                  disabled={isOOS}
                                  onClick={() => { if (!isOOS) setSelectedSize(s); }}
                                  className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-150 ${
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
                  <div className="shrink-0 px-3 pb-3 pt-2 border-t border-gray-100 bg-white">
                    <div className="flex items-center gap-2">
                      {/* Qty Stepper */}
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
                        <button
                          onClick={() => setQty(Math.max(1, qty - 1))}
                          disabled={qty <= 1}
                          className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all duration-150 active:scale-[0.88] disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus size={12} />
                        </button>
                        <motion.span
                          key={qty}
                          initial={{ y: 4, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ duration: 0.12, ease: 'easeOut' }}
                          className="w-9 h-9 flex items-center justify-center text-xs font-bold text-gray-800 bg-gray-50 border-x border-gray-200"
                        >{qty}</motion.span>
                        <button
                          onClick={() => setQty(qty + 1)}
                          className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all duration-150 active:scale-[0.88]"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      {/* Add to Cart */}
                      <button
                      onClick={handleAddToCart}
                      disabled={!canAdd || isAdding}
                      className={`flex-1 h-10 flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-lg transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                        canAdd && !isAdding
                          ? 'bg-black text-white hover:bg-gray-900'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isAdding ? (
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : !hasAllSelections && hasVariants ? (
                        <span>{t('product.select') || 'Select'}</span>
                      ) : !matchedVariant && hasVariants ? (
                        <span>{t('product.unavailable') || 'Unavailable'}</span>
                      ) : !canAdd ? (
                        <span>{t('product.sold_out') || 'Sold Out'}</span>
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
                            <ShoppingBag size={12} />
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
});

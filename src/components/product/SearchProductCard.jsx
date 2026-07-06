import { Plus, Minus, ShoppingBag, X, Sparkles, Heart } from 'lucide-react';
import { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

;
import { useTranslation } from 'react-i18next';
import useWishlistStore from '../../store/wishlistStore';
import useCartStore from '../../store/cartStore';
import useFlyToCart from '../../hooks/useFlyToCart';
import { formatCurrency, slugify, getImageUrl, getProductImages } from '../../utils/formatters';
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

  const colorsFromVariants = [...new Set(
    (product.productvariant || []).map(v => v.attributes?.color).filter(Boolean)
  )];
  const sizesFromVariants = [...new Set(
    (product.productvariant || []).map(v => v.attributes?.size).filter(Boolean)
  )];
  const productColors = (product.colors?.length ? product.colors : colorsFromVariants);
  const productSizes = (product.sizes?.length ? product.sizes : sizesFromVariants);

  const hasVariants = (productColors.length > 0 || productSizes.length > 0);
  const variantsList = product.productvariant || [];

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
  if (isOutOfStock) topLeftBadge = { label: t('product.out_of_stock'), type: 'stock' };
  else if (isLowStock) topLeftBadge = { label: t('product.low_stock', { count: effectiveStockQty }), type: 'stock' };
  else if (discount) topLeftBadge = { label: t('product.sale_badge'), type: 'sale' };
  else if (isNew) topLeftBadge = { label: t('product.new_badge'), type: 'new' };
  else if (product.badge) topLeftBadge = { label: product.badge, type: 'custom' };

  return (
    <>
      <div
        className="product-card group flex flex-col h-full"
        onClick={handleCardClick}
      >
      {/* Image Container */}
      <div
        ref={flyRef}
        className={`product-img-wrap relative bg-gray-100 overflow-hidden shrink-0 mb-2.5 rounded-xl aspect-[3/4] max-sm:aspect-[4/5] ${showQuickAdd ? 'md:min-h-[320px] md:aspect-auto' : ''}`}
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
            <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5 shrink-0 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center">
                  <ShoppingBag size={11} />
                </div>
                <h4 className="font-bold text-black uppercase tracking-wider text-xs">{t('product.quick_add')}</h4>
              </div>
              <button
                onClick={resetSelections}
                className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-black transition-all duration-200 active:scale-90"
              >
                <X size={12} />
              </button>
            </div>

            {/* Scrollable options area */}
            <div className="flex-1 overflow-y-auto px-3 no-scrollbar">
              {/* Price */}
              <div className="pt-1.5 pb-2 text-center border-b border-gray-50 sm:pt-2 sm:pb-2.5">
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-base font-bold text-black">{formatCurrency(displayPrice)}</span>
                  {displayOldPrice && <span className="text-[10px] text-gray-500 line-through">{formatCurrency(displayOldPrice)}</span>}
                  {displayDiscount && (
                    <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-200">
                      -{displayDiscount}%
                    </span>
                  )}
                </div>
              </div>

              {/* Colors */}
              {productColors.length > 0 && (
                <div className="pt-1.5 pb-1.5 sm:pt-2.5 sm:pb-2 border-b border-gray-50">
                  <div className="hidden sm:flex items-center justify-between mb-2">                      <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">
                      {t('product.color')}
                    </span>
                    <span className={`text-[9px] font-medium transition-colors duration-200 ${selectedColor ? 'text-black' : 'text-gray-500'}`}>
                      {selectedColor || t('product.select')}
                    </span>
                  </div>
                  <div className="flex justify-center gap-1.5 sm:gap-2 flex-wrap">
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
                            isOOS ? 'ring-1 ring-gray-100 cursor-not-allowed opacity-40' : isSelected ? 'ring-2 ring-black ring-offset-1 scale-110 shadow-[0_0_10px_rgba(0,0,0,0.3)]' : 'ring-1 ring-gray-200 hover:ring-gray-400 hover:scale-105 shadow-sm shadow-black/5'
                          } w-5 h-5 sm:w-6 sm:h-6`}
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
                <div className="pt-1.5 pb-1.5 sm:pt-2.5 sm:pb-2 border-b border-gray-50">
                  <div className="hidden sm:flex items-center justify-between mb-2">                      <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">
                      {t('product.size')}
                    </span>
                    <span className={`text-[9px] font-medium transition-colors duration-200 ${selectedSize ? 'text-black' : 'text-gray-500'}`}>
                      {selectedSize || t('product.select')}
                    </span>
                  </div>
                  <div className="flex justify-center gap-2 flex-wrap">
                    {productSizes.map(size => {
                      const isSelected = selectedSize === size;
                      const isOOS = oosSizes.has(size);
                      const btnClass = (isOOS
                        ? 'bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed line-through'
                        : isSelected
                          ? 'bg-black text-white shadow-sm scale-105 ring-1 ring-black'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 shadow-sm shadow-black/5'
                      ) + ' rounded-md text-[9px] sm:text-[10px] font-semibold transition-all duration-200 px-2.5 py-1.5 sm:px-3 sm:py-2 min-w-[34px] sm:min-w-[38px] flex items-center justify-center';
                      return (
                        <button
                          key={size}
                          onClick={(e) => { e.stopPropagation(); if (!isOOS) setSelectedSize(size); }}
                          disabled={isOOS}
                          className={btnClass}
                        >
                          {isOOS && <span><span>{size}</span> <span className="text-[7px] font-normal text-gray-500 uppercase tracking-wider">OOS</span></span>}
                          {!isOOS && size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Add section — always visible at bottom */}
            <div className="shrink-0 px-3 pb-2 border-t border-gray-50">
              {/* Quantity + Add — stacked vertically */}
              <div className="pt-2.5 pb-1">
                {/* Quantity Stepper — centered */}
                <div className="flex justify-center mb-2.5">
                  <div className="inline-flex items-center bg-gray-100 rounded-lg border border-gray-200 overflow-hidden">
                    <button
                      onClick={(e) => { e.stopPropagation(); setQty(Math.max(1, qty - 1)); }}
                      disabled={qty <= 1}
                      className="text-gray-500 hover:text-black disabled:text-gray-200 disabled:cursor-not-allowed h-8 sm:h-9 w-8 sm:w-9 flex items-center justify-center transition-colors hover:bg-gray-200"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-center font-bold text-black w-8 sm:w-9 text-[11px] sm:text-xs select-none border-x border-gray-200 h-8 sm:h-9 flex items-center justify-center">{qty}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setQty(qty + 1); }}
                      className="text-gray-500 hover:text-black h-8 sm:h-9 w-8 sm:w-9 flex items-center justify-center transition-colors hover:bg-gray-200"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>

                {/* Add to Cart — full width */}
                <button
                  onClick={handleAddToCart}
                  disabled={!canAdd || isAdding}
                  className={`w-full h-9 sm:h-10 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all duration-200 text-[10px] sm:text-[11px] ${
                    canAdd && !isAdding
                      ? 'bg-black text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                      : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {isAdding ? (
                    <><div className="spinner w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> Adding</>
                  ) : !hasAllSelections && hasVariants ? (
                    t('product.select')
                  ) : !matchedVariant && hasVariants ? (
                    t('product.unavailable')
                  ) : !canAdd ? (
                    t('product.sold_out')
                  ) : (
                    <><ShoppingBag size={11} /> {t('product.add')}</>
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

        {/* Badge */}
        {!showQuickAdd && topLeftBadge && (
          <span
            className={`product-badge ${topLeftBadge.label === t('product.sale_badge') ? 'sale-badge' : ''}`}
            style={topLeftBadge.type === 'new' ? { background: '#059669' } : undefined}
          >
            {topLeftBadge.label === t('product.new_badge') ? (
              <span className="flex items-center gap-1">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                New
              </span>
            ) : (
              topLeftBadge.label
            )}
          </span>
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

        {/* Product Image - premium hover crossfade with multi-image cycling */}
        <div className="product-img-stack">
          {productImages.length > 0 ? (
            productImages.map((imgUrl, idx) => (
              <img loading="lazy" key={idx}
                src={getImageUrl(imgUrl)}
                alt={`${product.name}${idx > 0 ? ` - view ${idx + 1}` : ''}`}
                loading="lazy"
                className={`product-img-layer w-full h-full object-cover transition-all duration-500 ${isOutOfStock ? 'grayscale opacity-60' : ''} ${(idx === 0 && !isHovered) || (idx === 1 && isHovered && productImages.length > 1) ? 'active' : ''}`}
              />
            ))
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
        {productImages.length > 1 && (
          <div className="product-img-dots">
            {productImages.map((_, idx) => (
              <div
                key={idx}
                className={`product-img-dot ${idx === 0 && !isHovered ? 'active' : idx === 1 && isHovered ? 'active' : ''}`}
              />
            ))}
          </div>
        )}

        {/* Quick Add Button — gold accent on hover (reference: selektt) */}
        {isOutOfStock ? (
          <div className="absolute bottom-0 inset-x-0 z-30 py-2.5 text-[10px] font-bold uppercase tracking-[1.5px] flex items-center justify-center gap-1.5 bg-gray-800/80 text-gray-300">
            <X size={12} />
            {t('product.out_of_stock')}
          </div>
        ) : (
          !showQuickAdd && (
            <button
              onClick={handleQuickAdd}
              className="absolute bottom-0 inset-x-0 z-30 py-2.5 text-[10px] font-bold uppercase tracking-[1.5px] md:translate-y-full md:group-hover:translate-y-0 transition-all duration-[400ms] ease flex items-center justify-center gap-1.5 md:opacity-0 md:group-hover:opacity-100 bg-black text-white md:hover:bg-white md:hover:text-black"
            >
              <ShoppingBag size={12} />
              {t('product.quick_add')}
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
        <h3 className="text-sm max-sm:text-[10px] font-medium text-gray-900 line-clamp-1 group-hover:text-primary transition-colors mb-1.5 md:mb-2 tracking-wide">
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
            <span className="price-main text-sm max-sm:text-xs">{formatCurrency(displayPrice)}</span>
            {displayOldPrice && <span className="original text-xs max-sm:text-[10px]">{formatCurrency(displayOldPrice)}</span>}
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
                      onClick={resetSelections}
                      className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all duration-150 active:scale-[0.85]"
                    >
                      <X size={15} />
                    </button>
                  </div>

                  {/* Product Info Row: Thumbnail + Name + Price */}
                  <div className="flex items-center gap-3 px-4 pb-3 border-b border-gray-100 shrink-0">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
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
                      <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                      <p className="text-base font-display font-extrabold text-black mt-0.5">{formatCurrency(displayPrice)}</p>
                    </div>
                  </div>

                  {/* Scrollable Options */}
                  <div className="flex-1 overflow-y-auto px-4 no-scrollbar">
                    <div className="py-3 space-y-4">
                      {/* Colors */}
                      {productColors.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                            {t('product.color')} · <span className="text-gray-900">{selectedColor || t('product.select')}</span>
                          </p>
                          <div className="flex flex-wrap gap-2.5">
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
                                    className={`w-7 h-7 rounded-full border border-black/10 ${isOOS ? 'opacity-50' : ''} ${isLight && !isOOS ? 'border-gray-300' : ''}`}
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
                                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="drop-shadow-sm">
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
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                            {t('product.size')} · <span className="text-gray-900">{selectedSize || t('product.select')}</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {productSizes.map((s) => {
                              const isOOS = oosSizes.has(s);
                              const isSelected = selectedSize === s;
                              return (
                                <button
                                  key={s}
                                  disabled={isOOS}
                                  onClick={() => { if (!isOOS) setSelectedSize(s); }}
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
                        onClick={handleAddToCart}
                        disabled={!canAdd || isAdding}
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
});

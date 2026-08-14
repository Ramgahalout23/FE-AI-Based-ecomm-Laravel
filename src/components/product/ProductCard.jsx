import { ShoppingBag, Plus, Minus, X, Heart, Eye } from 'lucide-react';
import { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

;
import { useTranslation } from 'react-i18next';
import useWishlistStore from '../../store/wishlistStore';
import useCartStore from '../../store/cartStore';
import { formatCurrency, slugify, getImageUrl, getResponsiveSrcSet, getProductImage, getProductImages, getProductHoverImage } from '../../utils/formatters';
import { getColorHex } from '../../utils/constants';
import { computeStockStatus } from '../../utils/stockHelpers';
import { wishlistAPI } from '../../api/wishlist';
import { cartAPI } from '../../api/cart';
import useAuthStore from '../../store/authStore';
import { getAttributes } from '../../utils/productHelpers.jsx';
import toast, { addedToCart } from '../../utils/toast';

/* ── Main ProductCard ── */
function ProductCard({ product, className = '', imageAspect = 'aspect-[3/4] max-sm:aspect-[4/5]', compactOverlay = false }) {
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
  const [isHovered, setIsHovered] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const highlightsTimeoutRef = useRef(null);
  // Style Highlights is hover-only — never trigger on touch devices, where
  // the emulated mouseenter makes the overlay appear stuck/broken on mobile.
  const canHover = useMemo(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches, []);

  /* ── Style Highlights sizing — full editorial on large cards, compact on small ones ── */
  // compactOverlay (used in the search modal) pins the overlay to the compact variant
  // regardless of viewport, so small cards never get the desktop-sized overlay.
  const shMd = (base, mdCls) => (compactOverlay ? base : `${base} ${mdCls}`);


  /* ── Variants ── */
  const productImages = getProductImages(product);
  const hoverImageUrl = getProductHoverImage(product);
  const hasHoverImage = !!hoverImageUrl && hoverImageUrl !== productImages[0];
  const variants = product.variants || product.productvariant;
  const hasVariants = Array.isArray(variants) && variants.length > 0;

  // Per-color thumbnail from the variant's first image (set in admin),
  // falling back to a solid color swatch when no variant image exists.
  const getColorThumb = (color) => {
    if (!hasVariants) return null;
    const v = variants.find(x => (x.attributes || {}).color === color && Array.isArray(x.images) && x.images.length > 0);
    const img = v?.images?.[0];
    return typeof img === 'string' ? getImageUrl(img) : null;
  };

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

  const hasSelectableOptions = colors.length > 0 || sizes.length > 0;

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

  /* ── Auto-first variant for no-selection quick add ── */
  const firstAvailVariant = useMemo(() => {
    if (!hasVariants) return null;
    return variants.find((v) => (v.quantity || 0) > 0) || variants[0] || null;
  }, [hasVariants, variants]);

  const displayPrice = matchedVariant?.price ?? product.price;
  const hasAllSelections = (!colors.length || selectedColor) && (!sizes.length || selectedSize);
  const canAdd = hasVariants && hasSelectableOptions
    ? (hasAllSelections && matchedVariant && (matchedVariant.quantity || 0) > 0)
    : hasVariants
      ? (firstAvailVariant && (firstAvailVariant.quantity || 0) > 0)
      : ((product.quantity ?? 0) > 0);

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

  const handleImageMouseEnter = () => {
    setIsHovered(true);
    if (!showQuickAdd && canHover) {
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

    // Variants with no selectable attributes → add first available directly
    if (hasVariants && !hasSelectableOptions) {
      if (!firstAvailVariant) return;
      setIsAdding(true);
      try {
        addToCart({
          id: product.id,
          productId: product.id,
          name: product.name,
          price: firstAvailVariant.price ?? product.price,
          image: getProductImage(product),
          imageUrl: firstAvailVariant?.images?.[0] || getProductImage(product),
          quantity: qty,
          variantId: firstAvailVariant.id,
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
          imageUrl: matchedVariant?.images?.[0] || getProductImage(product),
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
        closePanel();
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
    setShowHighlights(false);
  }, [hasVariants, hasAllSelections, hasSelectableOptions, matchedVariant, firstAvailVariant, product, qty, selectedColor, selectedSize, addToCart, isAdding, isAuthenticated, colors, sizes]);

  /* ── Add from panel (after selections made) ── */
  const handlePanelAdd = useCallback(async () => {
    if (isAdding || !hasAllSelections || !canAdd) return;
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
          imageUrl: useVariant?.images?.[0] || getProductImage(product),
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
  }, [hasVariants, hasAllSelections, canAdd, matchedVariant, firstAvailVariant, product, qty, selectedColor, selectedSize, addToCart, isAdding, closePanel, isAuthenticated]);

  /* ── Prevent body scroll when mobile bottom sheet is open ── */
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (showQuickAdd && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showQuickAdd]);

  const discount = product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : null;
  const { isOutOfStock, isLowStock, effectiveStockQty } = computeStockStatus(product);

  // Attributes — always show the 5 key attributes (real data if available, mock defaults otherwise)
  const attrs = useMemo(() => getAttributes(product), [product]);

  const highlights = useMemo(() => [
    { label: 'Composition', value: attrs['fabric'] || '100% Cotton' },
    { label: 'GSM', value: attrs['gsm'] || '240' },
    { label: 'Neckline', value: attrs['neckline'] || attrs['neck'] || 'Round Neck' },
    { label: 'Sleeve Length', value: attrs['sleeve'] || attrs['sleeve length'] || 'Short Sleeve' },
    { label: 'Fit', value: attrs['fit'] || 'Oversized Fit' },
  ], [attrs]);

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

  return (
    <>
      {/* ════ Product Card ════ */}
      <div
        className={`product-card group bg-white ${className} rounded-xl overflow-hidden border border-gray-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-gray-200 hover:shadow-[0_24px_50px_-24px_rgba(0,0,0,0.3)] cursor-pointer flex flex-col h-full`}
        onClick={() => navigate(`/products/${productSlug}`)}
      >
        {/* Image Container */}
        <div
          className={`relative ${imageAspect} bg-surface overflow-hidden shrink-0`}
          onMouseEnter={handleImageMouseEnter}
          onMouseLeave={handleImageMouseLeave}
        >
          {/* Premium shine sweep on hover — a soft light streak glides across the image */}
          <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-full" />
          </div>

          {/* Badges — stacked: New (white) + Sale (red) like the reference */}
          <div className="absolute top-2.5 left-2.5 max-sm:top-2 max-sm:left-2 z-[11] flex flex-col gap-1">
            {isNew && (
              <span className="inline-block text-[9px] max-sm:text-[8px] font-bold px-2 max-sm:px-1.5 py-0.5 uppercase tracking-[0.12em] rounded-[4px] bg-white text-black shadow-sm">
                {t('product.new_badge')}
              </span>
            )}
            {discount > 0 && (
              <span className="inline-block text-[9px] max-sm:text-[8px] font-bold px-2 max-sm:px-1.5 py-0.5 uppercase tracking-[0.12em] rounded-[4px] bg-red-600 text-white shadow-sm">
                {t('product.sale_badge')}
              </span>
            )}
          </div>

          {/* Wishlist + Eye — white circles, revealed on hover, sit ABOVE highlights overlay */}
          <div className="qa-reveal absolute top-2.5 right-2.5 z-[20] flex flex-col gap-2">
            <button
              onClick={handleWishlist}
              className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                inWishlist
                  ? 'bg-white text-red-500 shadow-md'
                  : 'bg-white/95 backdrop-blur-sm text-gray-700 hover:text-black shadow-md'
              }`}
              aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart size={17} fill={inWishlist ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/products/${productSlug}`); }}
              className="w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center bg-white/95 backdrop-blur-sm text-gray-700 hover:text-black shadow-md transition-all duration-200"
              aria-label="View product"
            >
              <Eye size={17} />
            </button>
          </div>

          {/* Product Image — premium hover crossfade with multi-image layering */}
          <div className="product-img-stack">
            {productImages.length > 0 ? (
              <>
                {/* Always render the primary image */}
                <img
                  src={getImageUrl(productImages[0])}
                  srcSet={getResponsiveSrcSet(productImages[0])}
                  sizes="(max-width: 640px) 45vw, 302px"
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                  className={`product-img-layer w-full h-full object-cover transition-all duration-500 ${isOutOfStock ? 'grayscale opacity-60' : ''} ${!isHovered || !hasHoverImage ? 'active' : ''}`}
                />
                {/* Hover image — uses dedicated hoverImageUrl if set, otherwise second product image */}
                <img
                  src={getImageUrl(hoverImageUrl || productImages[1] || '')}
                  srcSet={getResponsiveSrcSet(hoverImageUrl || productImages[1] || '')}
                  sizes="(max-width: 640px) 45vw, 302px"
                  alt={`${product.name} - hover view`}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => { e.target.onerror = null; e.target.style.display = 'none'; }}
                  className={`product-img-layer w-full h-full object-cover transition-all duration-500 ${isOutOfStock ? 'grayscale opacity-60' : ''} ${isHovered && hasHoverImage ? 'active' : ''}`}
                />
              </>
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-7xl transition-all duration-500 ${isOutOfStock ? 'opacity-20' : 'opacity-40'}`}>
                👕
              </div>
            )}
          </div>

          {/* Seamless image→card blend — softens the hard image/body edge */}
          <div className="absolute bottom-0 inset-x-0 h-12 bg-gradient-to-t from-white/70 via-white/20 to-transparent pointer-events-none z-[6]" />

          {/* Out of Stock overlay on image */}
          {isOutOfStock && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/20"><div className="bg-white backdrop-blur-sm text-gray-900 text-[11px] max-sm:text-[10px] font-bold uppercase tracking-[0.18em] px-4 max-sm:px-3 py-1.5 max-sm:py-1 rounded-sm shadow-lg ring-1 ring-gray-900/10">
                {t('product.sold_out')}</div>
            </div>
          )}


          {/* Style Highlights Overlay — premium editorial style, responsive to card size */}
          <AnimatePresence>
            {!showQuickAdd && showHighlights && canHover && (
              <motion.div
                key="highlights-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 z-[15] flex flex-col justify-end"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Cinematic gradient — dark bottom, transparent top */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                {/* Subtle side vignette */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />

                {/* Content — positioned at bottom, clears the quick-add bar */}
                <div className={`relative z-10 ${shMd('p-3 pb-10', 'md:p-5 md:pb-12')}`}>
                  {/* Title — editorial, staggered entrance */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <h4 className={`text-white font-display font-bold ${shMd('text-[13px] leading-[1.15] mb-1.5', 'md:text-base md:mb-3')}`}>
                      Style Highlights
                    </h4>
                    <div className={`w-6 h-px bg-white/30 ${shMd('mb-2', 'md:mb-3')}`} />
                  </motion.div>

                  {/* Attribute list — staggered slide-up per row; 3 rows on small cards, all 5 on desktop */}
                  <div className={`flex flex-col ${shMd('gap-1.5', 'md:gap-2')}`}>
                    {highlights.map((h, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                        className={`${compactOverlay ? (i < 3 ? 'flex' : 'hidden') : (i >= 3 ? 'hidden md:flex' : 'flex')} items-baseline justify-between gap-2`}
                      >
                        <span className={`text-white/50 ${shMd('text-[7px]', 'md:text-[9px]')} font-semibold uppercase tracking-[0.18em]`}>
                          {h.label}
                        </span>
                        <span className={`text-white ${shMd('text-[9px]', 'md:text-[12px]')} font-medium min-w-0 truncate`}>
                          {h.value}
                        </span>
                      </motion.div>
                    ))}
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image indicator dots */}
          {hasHoverImage && (
            <div className="product-img-dots">
              <div className={`product-img-dot ${!isHovered ? 'active' : ''}`} />
              <div className={`product-img-dot ${isHovered ? 'active' : ''}`} />
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
                  <div className="space-y-2 pb-2.5">
                    {/* Product Name */}
                    <p className="text-[11px] font-medium text-gray-900 truncate leading-tight">{product.name}</p>

                    {/* Colors */}
                    {colors.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Color{selectedColor ? <span className="text-gray-800 ml-1 font-bold">· {selectedColor}</span> : ''}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {colors.map((c) => {
                            const isOOS = oosColors.has(c);
                            const isSelected = selectedColor === c;
                            const thumb = getColorThumb(c);
                            return (
                              <button
                                key={c}
                                disabled={isOOS}
                                onClick={() => setSelectedColor(c)}
                                className={`relative w-6 h-6 rounded-[3px] overflow-hidden border-2 flex items-center justify-center transition-all duration-150 ${
                                  isSelected
                                    ? 'border-black scale-110 shadow-sm'
                                    : isOOS
                                    ? 'border-gray-200 opacity-30 cursor-not-allowed'
                                    : 'border-transparent hover:border-gray-300'
                                }`}
                                title={c}
                              >
                                {thumb ? (
                                  <img src={thumb} alt={c} loading="lazy" className={`w-full h-full object-cover ${isOOS ? 'opacity-50' : ''}`} />
                                ) : (
                                  <div
                                    className={`w-full h-full ${isOOS ? 'opacity-50' : ''}`}
                                    style={{ background: getColorHex(c) }}
                                  />
                                )}
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
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                          Size{selectedSize ? <span className="text-gray-800 ml-1 font-bold">· {selectedSize}</span> : ''}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {sizes.map((s) => {
                            const isOOS = oosSizes.has(s);
                            const isSelected = selectedSize === s;
                            return (
                              <button
                                key={s}
                                disabled={isOOS}
                                onClick={() => setSelectedSize(s)}
                                className={`px-2 py-1 text-[10px] font-bold rounded-[3px] transition-all duration-150 ${
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
                      disabled={!canAdd || isAdding}
                      className={`flex-1 h-8 flex items-center justify-center gap-1.5 text-[10px] font-bold rounded-[3px] transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                        canAdd && !isAdding
                          ? 'bg-black text-white hover:bg-gray-900'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {isAdding ? (
                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : !hasAllSelections ? (
                        <span>{t('product.select') || 'Select'}</span>
                      ) : !matchedVariant && hasVariants && hasSelectableOptions ? (
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
            <div className="absolute bottom-0 inset-x-0 z-20 h-8 md:h-9 flex items-center justify-center gap-1.5 bg-gray-900/90 text-gray-300 text-[9px] max-sm:text-[8px] font-bold uppercase tracking-[0.14em]">
              <X size={10} />
              <span>{t('product.out_of_stock')}</span>
            </div>
          ) : (
            !showQuickAdd && (
              <button
                onClick={handleQuickAdd}
                /* Hidden until card hover on desktop (hover-capable); always visible on touch */
                className="qa-reveal absolute bottom-0 inset-x-0 z-20 h-9 md:h-10 flex items-center justify-center gap-1.5 bg-black text-white text-[10px] max-sm:text-[9px] font-bold uppercase tracking-[0.16em] transition-colors duration-300 hover:bg-gray-900 max-sm:active:bg-gray-900"
              >
                {isAdding ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <><ShoppingBag size={12} /><span>{t('product.quick_add')}</span></>
                )}
              </button>
            )
          )}
        </div>

        {/* Details — typography-led editorial design (SSENSE / MR PORTER style) */}
        <div className={`max-sm:p-3 p-4 flex flex-col flex-1 transition-all duration-300 ${isOutOfStock ? 'opacity-50' : ''}`}>
          {/* Title — refined, tight tracking */}
          <h3 className="card-title line-clamp-2">
            {product.name}
          </h3>

          {/* Price — current in black, old in red struck-through (reference style) */}
          <div className="mt-auto pt-3.5">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="price-item tabular-nums text-gray-900">
                {formatCurrency(product.price)}
              </span>
              {product.oldPrice && (
                <span className="text-[10px] md:text-[11px] text-red-500 line-through font-medium">{formatCurrency(product.oldPrice)}</span>
              )}
            </div>
            {!isOutOfStock && isLowStock && (
              <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-gray-400">
                {t('product.low_stock', { count: effectiveStockQty })}
              </p>
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
                    <div className="py-3 space-y-3">
                      {/* Colors */}
                      {colors.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Color · <span className="text-gray-900">{selectedColor || 'Select'}</span>
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {colors.map((c) => {
                              const isOOS = oosColors.has(c);
                              const isSelected = selectedColor === c;
                              const thumb = getColorThumb(c);
                              return (
                                <button
                                  key={c}
                                  disabled={isOOS}
                                  onClick={() => setSelectedColor(c)}
                                  className={`relative w-8 h-8 rounded-[3px] overflow-hidden border-2 flex items-center justify-center transition-all duration-150 ${
                                    isSelected
                                      ? 'border-black scale-110 shadow-sm'
                                      : isOOS
                                      ? 'border-gray-200 opacity-30 cursor-not-allowed'
                                      : 'border-transparent hover:border-gray-300'
                                    }`}
                                    title={c}
                                  >
                                    {thumb ? (
                                      <img src={thumb} alt={c} loading="lazy" className={`w-full h-full object-cover ${isOOS ? 'opacity-50' : ''}`} />
                                    ) : (
                                      <div
                                        className={`w-full h-full ${isOOS ? 'opacity-50' : ''}`}
                                        style={{ background: getColorHex(c) }}
                                      />
                                    )}
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
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Size · <span className="text-gray-900">{selectedSize || 'Select'}</span>
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
                                  className={`px-3 py-2 text-xs font-bold rounded-[3px] transition-all duration-150 ${
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
                        disabled={!canAdd || isAdding}
                        className={`flex-1 h-11 flex items-center justify-center gap-2 text-xs font-bold rounded-lg transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                          canAdd && !isAdding
                            ? 'bg-black text-white hover:bg-gray-900'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {isAdding ? (
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : !hasAllSelections ? (
                          <span>{t('product.select') || 'Select'}</span>
                        ) : !matchedVariant && hasVariants && hasSelectableOptions ? (
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

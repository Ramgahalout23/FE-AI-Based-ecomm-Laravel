import { Plus, Minus, ShoppingBag, Sparkles, X, Heart, Eye } from 'lucide-react';
import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

;
import { useTranslation } from 'react-i18next';
import { getImageUrl, getProductImages, getProductHoverImage, formatCurrency, slugify } from '../../utils/formatters';
import { getColorHex, CUSTOM_TEE_SLUG } from '../../utils/constants';
import { buildHighlights, getStyleTagline } from '../../utils/productHelpers';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import useFlyToCart from '../../hooks/useFlyToCart';
import { computeStockStatus } from '../../utils/stockHelpers';
import { wishlistAPI } from '../../api/wishlist';
import { addedToCart, addedToWishlist, removedFromWishlist } from '../../utils/toast';

/* ─── Mock Product Data ─── */
const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: 'Oversized Cotton Tee',
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
    price: 1299,
    oldPrice: 2499,
    badge: 'New',
    saleBadge: true,
    colors: ['Black', 'White', 'Grey', 'Navy'],
    sizes: ['M', 'L', 'XL'],
    highlights: {
      composition: '100% Cotton',
      gsm: '240 GSM',
      neckline: 'Round Neck',
      sleeve: 'Short Sleeve',
      fit: 'Oversized Fit',
    },
  },
  {
    id: 2,
    name: 'Drop Shoulder Hoodie',
    image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&q=80',
    price: 1899,
    oldPrice: 2999,
    badge: 'New',
    saleBadge: true,
    colors: ['Black', 'Olive', 'Navy'],
    sizes: ['M', 'L', 'XL'],
    highlights: {
      composition: '100% Cotton',
      gsm: '260 GSM',
      neckline: 'Hooded',
      sleeve: 'Long Sleeve',
      fit: 'Oversized Fit',
    },
  },
  {
    id: 3,
    name: 'Vintage Wash Denim Jacket',
    image: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=600&q=80',
    price: 2499,
    oldPrice: 3999,
    badge: 'New',
    saleBadge: false,
    colors: ['Blue Wash', 'Black'],
    sizes: ['L', 'XL'],
    highlights: {
      composition: '100% Cotton Denim',
      gsm: '320 GSM',
      neckline: 'Spread Collar',
      sleeve: 'Long Sleeve',
      fit: 'Regular Fit',
    },
  },
  {
    id: 4,
    name: 'Cargo Jogger Pants',
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1584865288642-42078afe6942?w=600&q=80',
    price: 1599,
    oldPrice: 2199,
    badge: 'New',
    saleBadge: true,
    colors: ['Black', 'Olive', 'Grey'],
    sizes: ['M', 'L', 'XL'],
    highlights: {
      composition: 'Cotton Poly Blend',
      gsm: '280 GSM',
      neckline: 'Elastic Waistband',
      sleeve: 'Full Length',
      fit: 'Relaxed Fit',
    },
  },
  {
    id: 5,
    name: 'Classic Oxford Shirt',
    image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=600&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1598033129183-c4f50c7365e5?w=600&q=80',
    price: 1799,
    oldPrice: 2799,
    badge: 'New',
    saleBadge: false,
    colors: ['White', 'Navy', 'Grey Wash'],
    sizes: ['M', 'L', 'XL'],
    highlights: {
      composition: '100% Cotton',
      gsm: '130 GSM',
      neckline: 'Button-Down Collar',
      sleeve: 'Full Sleeve',
      fit: 'Regular Fit',
    },
  },
  {
    id: 6,
    name: 'Slim Fit Chino Pants',
    image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&q=80',
    hoverImage: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&q=80',
    price: 1399,
    oldPrice: 1999,
    badge: 'New',
    saleBadge: true,
    colors: ['Black', 'Navy', 'Olive'],
    sizes: ['M', 'L', 'XL'],
    highlights: {
      composition: 'Cotton Stretch',
      gsm: '220 GSM',
      neckline: 'Zip Fly',
      sleeve: 'Full Length',
      fit: 'Slim Fit',
    },
  },
];

/* ─── Helpers for extracting data from both mock & API products ─── */
function getProductVariants(product) {
  return product.variants || product.productvariant || [];
}

function getProductColors(product) {
  if (Array.isArray(product.colors) && product.colors.length > 0) return product.colors;
  const variants = getProductVariants(product);
  if (variants.length > 0) {
    return [...new Set(variants.map(v => v.attributes?.color).filter(Boolean))];
  }
  return [];
}
function getProductSizes(product) {
  if (Array.isArray(product.sizes) && product.sizes.length > 0) return product.sizes;
  const variants = getProductVariants(product);
  if (variants.length > 0) {
    return [...new Set(variants.map(v => v.attributes?.size).filter(Boolean))];
  }
  return [];
}
function getProductImageUrls(product) {
  if (product.image) return [product.image, product.hoverImage].filter(Boolean);
  if (Array.isArray(product.images) && product.images.every(i => typeof i === 'string')) return product.images;
  const apiImages = getProductImages(product);
  if (apiImages.length > 0) return apiImages;
  return [];
}

/* ─── Product Card ─── */
function NewArrivalCard({ product, index }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addItem: addToCart } = useCartStore();
  const { isInWishlist, addItem: addToWL, removeItem: removeFromWL } = useWishlistStore();
  const { flyRef, flyToCart } = useFlyToCart();
  const inWishlist = isInWishlist(product.id);
  const productSlug = product.slug || slugify(product.name);

  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const highlightsTimeoutRef = useRef(null);
  // Style Highlights is hover-only — never trigger on touch devices, where
  // the emulated mouseenter makes the overlay appear stuck/broken on mobile.
  const canHover = useMemo(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches, []);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef(null);

  // Derive from product (handles both mock & API)
  const productImages = useMemo(() => getProductImageUrls(product), [product]);
  const mainImage = productImages[0] || '';
  const hoverImage = useMemo(() => {
    // Check dedicated hoverImageUrl first
    const dedicated = getProductHoverImage(product);
    if (dedicated) return dedicated;
    // Fallback: second product image
    return productImages[1] || '';
  }, [product, productImages]);
  const hasHoverImage = !!hoverImage && hoverImage !== mainImage;
  const productColors = useMemo(() => getProductColors(product), [product]);
  const productSizes = useMemo(() => getProductSizes(product), [product]);
  const variantsList = getProductVariants(product);

  const hasVariants = (productColors.length > 0 || productSizes.length > 0);

  // OOS sets
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

  // Highlights
  const highlights = useMemo(() => {
    if (product.highlights && typeof product.highlights === 'object' && !Array.isArray(product.highlights)) {
      return Object.entries(product.highlights).map(([label, value]) => ({ label, value }));
    }
    return buildHighlights(product, false);
  }, [product]);
  const styleTagline = useMemo(() => getStyleTagline(product), [product]);

  // Variant matching
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
  const canAdd = hasVariants
    ? (hasAllSelections && matchedVariant && (matchedVariant.quantity || 0) > 0)
    : ((product.quantity ?? 0) > 0);

  const displayPrice = matchedVariant?.price ?? product.price;
  const displayOldPrice = product.oldPrice && product.oldPrice > displayPrice ? product.oldPrice : null;
  const displayDiscount = displayOldPrice ? Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100) : null;

  const discount = product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : null;
  const { isOutOfStock, isLowStock, effectiveStockQty } = computeStockStatus(product);

  // Computed "New" badge
  const isNew = useMemo(() => {
    if (product.badge === 'New') return true;
    if (product.isNew) return true;
    if (product.createdAt) {
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      return Date.now() - new Date(product.createdAt).getTime() < thirtyDays;
    }
    return false;
  }, [product]);

  // Badge priority
  let topLeftBadge = null;
  if (isOutOfStock) {
    topLeftBadge = { label: t('product.out_of_stock'), type: 'stock' };
  } else if (isLowStock) {
    topLeftBadge = { label: t('product.low_stock', { count: effectiveStockQty }), type: 'stock' };
  } else if (discount) {
    topLeftBadge = { label: t('product.sale_badge'), type: 'sale' };
  } else if (isNew) {
    topLeftBadge = { label: t('product.new_badge'), type: 'new' };
  } else if (product.badge) {
    topLeftBadge = { label: product.badge, type: 'custom' };
  }

  const resetSelections = useCallback(() => {
    setShowQuickAdd(false);
    setSelectedColor('');
    setSelectedSize('');
    setQty(1);
  }, []);

  // Click outside
  useEffect(() => {
    if (!showQuickAdd) return;
    const handleClick = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) {
        resetSelections();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showQuickAdd, resetSelections]);

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

    // Auto-select first in-stock variant when user intentionally opens quick-add
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

  const resolveImg = (url) => {
    if (!url) return null;
    return url.startsWith('http') || url.startsWith('data:') ? url : getImageUrl(url);
  };

  return (
    <>
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
      className="group relative flex flex-col bg-white"
    >
      {/* ─── Image Container ─── */}
      <div
        ref={flyRef}
        className="relative w-full overflow-hidden bg-gray-50 aspect-[3/4] max-sm:aspect-[4/5]"
        onMouseEnter={handleImageMouseEnter}
        onMouseLeave={handleImageMouseLeave}
      >
        {/* Product Image — premium hover crossfade with multi-image layering */}
        <div className="product-img-stack">
          {mainImage ? (
            <>
              {/* Primary image */}
              <img
                src={resolveImg(mainImage)}
                alt={product.name}
                loading="lazy"
                onLoad={() => setImageLoaded(true)}
                className={`product-img-layer w-full h-full object-cover transition-all duration-500 ${isOutOfStock ? 'grayscale opacity-60' : ''} ${!isHovered || !hasHoverImage ? 'active' : ''}`}
              />
              {/* Hover image */}
              <img
                src={resolveImg(hoverImage)}
                alt={`${product.name} - hover view`}
                loading="lazy"
                className={`product-img-layer w-full h-full object-cover transition-all duration-500 ${isOutOfStock ? 'grayscale opacity-60' : ''} ${isHovered && hasHoverImage ? 'active' : ''}`}
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-7xl opacity-40">👕</div>
          )}
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-shimmer bg-[length:200%_100%]" />
          )}
        </div>

        {/* Image indicator dots */}
        {hasHoverImage && (
          <div className="product-img-dots">
            <div className={`product-img-dot ${!isHovered ? 'active' : ''}`} />
            <div className={`product-img-dot ${isHovered ? 'active' : ''}`} />
          </div>
        )}

        {/* Highlights Overlay */}
        <AnimatePresence>
          {showHighlights && highlights.length > 0 && canHover && (
            <motion.div
              key="highlights-overlay"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 z-20 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pb-12"
              onClick={(e) => e.stopPropagation()}
            >
              {styleTagline && (
                <p className="text-white/90 text-[10px] font-medium leading-tight mb-2 line-clamp-2">
                  {styleTagline}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {highlights.slice(0, 4).map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-sm text-white text-[8px] font-semibold uppercase tracking-wider"
                  >
                    {h.icon}
                    {h.value}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Add Panel — Desktop: Inline Panel inside card */}
        <div className="hidden md:block absolute inset-0 z-30">
        <AnimatePresence>
          {showQuickAdd && (
            <motion.div
              key="quick-add-panel"
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 8 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex flex-col bg-white/98 backdrop-blur-sm"
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
                  className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-black transition-all duration-200 active:scale-90"
                >
                  <X size={12} />
                </button>
              </div>

              <div className="relative flex-1">
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
                <div className="h-full overflow-y-auto px-3 pb-2">
                  {/* Price */}
                  <div className="pt-2 pb-2.5 text-center border-b border-gray-50">
                    <div className="flex items-baseline justify-center gap-1.5">
                      <span className="text-base font-bold text-black">{formatCurrency(displayPrice)}</span>
                      {displayOldPrice && <span className="text-[10px] text-gray-400 line-through">{formatCurrency(displayOldPrice)}</span>}
                      {displayDiscount && (
                        <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-200">
                          -{displayDiscount}%
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Colors */}
                  {productColors.length > 0 && (
                    <div className="pt-2.5 pb-2 border-b border-gray-50">
                      <div className="flex items-center justify-between mb-2">                          <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">{t('product.color')}</span>
                        <span className={`text-[9px] font-medium transition-colors duration-200 ${selectedColor ? 'text-black' : 'text-gray-400'}`}>
                          {selectedColor || t('product.select')}
                        </span>
                      </div>
                      <div className="flex justify-center gap-2 flex-wrap">
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
                              className={`relative rounded-[2px] transition-all duration-200 ${
                                isOOS ? 'ring-1 ring-gray-100 cursor-not-allowed opacity-40' : isSelected ? 'ring-2 ring-black ring-offset-1 scale-110 shadow-[0_0_10px_rgba(0,0,0,0.3)]' : 'ring-1 ring-gray-200 hover:ring-gray-400 hover:scale-105 shadow-sm shadow-black/5'
                              } w-5 h-5`}
                              title={isOOS ? `${color} - ${t('product.out_of_stock')}` : color}
                              disabled={isOOS}
                            >
                              <div
                                className={`w-full h-full rounded-[2px] ${isLight ? 'border border-gray-200' : ''}`}
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
                    <div className="pt-2.5 pb-2 border-b border-gray-50">
                      <div className="flex items-center justify-between mb-2">                          <span className="text-[9px] font-semibold text-gray-500 uppercase tracking-wider">{t('product.size')}</span>
                        <span className={`text-[9px] font-medium transition-colors duration-200 ${selectedSize ? 'text-black' : 'text-gray-400'}`}>
                          {selectedSize || t('product.select')}
                        </span>
                      </div>
                      <div className="flex justify-center gap-2 flex-wrap">
                        {productSizes.map(size => {
                          const isSelected = selectedSize === size;
                          const isOOS = oosSizes.has(size);
                          return (
                            <button
                              key={size}
                              onClick={(e) => { e.stopPropagation(); if (!isOOS) setSelectedSize(size); }}
                              disabled={isOOS}
                              className={`rounded-[2px] text-[10px] font-semibold transition-all duration-200 ${
                                isOOS
                                  ? 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed line-through'
                                  : isSelected
                                    ? 'bg-black text-white shadow-[0_0_12px_rgba(0,0,0,0.35)] scale-105 ring-1 ring-black'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 shadow-sm shadow-black/5'
                              } px-2.5 py-1.5 min-w-[34px] flex items-center justify-center`}
                            >
                              {isOOS ? <span className="flex items-center gap-1">{size}<span className="text-[7px] font-normal text-gray-300 uppercase tracking-wider">{t('product.oos')}</span></span> : size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity + Add */}
                  <div className="pt-2.5 pb-1">
                    <div className="flex justify-center mb-2.5">
                      <div className="inline-flex items-center bg-gray-50 border border-gray-200 overflow-hidden">
                        <button
                          onClick={(e) => { e.stopPropagation(); setQty(Math.max(1, qty - 1)); }}
                          disabled={qty <= 1}
                          className="text-gray-400 hover:text-black disabled:text-gray-200 disabled:cursor-not-allowed h-8 w-8 flex items-center justify-center transition-colors hover:bg-gray-100"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-center font-bold text-black w-8 text-xs select-none border-x border-gray-200 h-8 flex items-center justify-center">{qty}</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setQty(qty + 1); }}
                          className="text-gray-400 hover:text-black h-8 w-8 flex items-center justify-center transition-colors hover:bg-gray-100"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={handleAddToCart}
                      disabled={!canAdd || isAdding}
                      className={`w-full h-8 font-bold flex items-center justify-center gap-1.5 transition-all duration-200 text-[10px] ${
                        canAdd && !isAdding
                          ? 'bg-black text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                          : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {isAdding ? (
                        <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /> Adding</>
                      ) : !hasAllSelections && hasVariants ? (
                        t('product.select')
                      ) : !matchedVariant && hasVariants ? (
                        t('product.unavailable')
                      ) : !canAdd ? (
                        t('product.sold_out')
                      ) : (
                        <><ShoppingBag size={12} /> {t('product.add')}</>
                      )}
                    </button>
                  </div>
                </div>
              </div>            </motion.div>
          )}
        </AnimatePresence>
        </div>

        {/* Top-left Badge */}
        {!showQuickAdd && topLeftBadge && (
          <span
            className={`absolute top-2 left-2 z-20 text-[9px] max-sm:text-[8px] font-bold uppercase tracking-[0.08em] px-2 max-sm:px-1.5 py-0.5 max-sm:py-0.5 text-white ${
              topLeftBadge.type === 'new' ? 'bg-emerald-600' :
              topLeftBadge.type === 'sale' ? 'bg-red-600' :
              topLeftBadge.type === 'stock' ? 'bg-gray-700' : 'bg-gray-900'
            }`}
          >
            {topLeftBadge.label === t('product.new_badge') ? (
              <span className="flex items-center gap-1">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>                {t('product.new_badge')}</span>
            ) : (
              topLeftBadge.label
            )}
          </span>
        )}

        {/* Wishlist - appears on hover */}
        {!showQuickAdd && (
          <button
            onClick={handleWishlist}
            className={`absolute top-2 right-2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
              inWishlist
                ? 'bg-red-500 text-white shadow-md opacity-100 scale-100'
                : 'bg-white/80 backdrop-blur-sm text-gray-400 hover:text-red-500 hover:bg-white shadow-sm'
            }`}
          >
            <Heart size={15} fill={inWishlist ? 'currentColor' : 'none'} />
          </button>
        )}

        {/* Quick View - appears on hover */}
        {!showQuickAdd && (
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/products/${productSlug}`); }}
            className="absolute top-10 right-2 z-20 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-sm text-gray-400 hover:text-black hover:bg-white transition-all duration-300"
          >
            <Eye size={13} />
          </button>
        )}

        {/* Quick Add Button - bottom, always visible */}
        {!showQuickAdd && !isOutOfStock && (
          <button
            onClick={handleQuickAdd}
            /* Hidden until card hover on desktop (hover-capable); always visible on touch */
            className="qa-reveal absolute bottom-0 inset-x-0 z-20 py-3 bg-white border-t border-black/10 text-black text-[11px] font-bold uppercase tracking-[0.12em] hover:bg-black hover:text-white transition-all duration-200"
          >              <span className="flex items-center justify-center gap-1.5">
              <ShoppingBag size={13} />
              {t('product.quick_add')}
            </span>
          </button>
        )}

        {/* Details hint */}
        {!showQuickAdd && !isOutOfStock && !showHighlights && (
          <div className="absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/70 backdrop-blur-sm text-[8px] font-semibold text-gray-600 uppercase tracking-wider shadow-sm">
              <Sparkles size={9} />
              {t('product.details_label')}
            </span>
          </div>
        )}
      </div>

      {/* ─── Product Info ─── */}
      <div className="px-0 pt-2.5 pb-3 text-center">
        <h3 className="text-sm max-sm:text-[10px] font-medium text-gray-900 line-clamp-1 group-hover:text-primary transition-colors mb-1.5 md:mb-2 tracking-wide">
          {product.name}
        </h3>

        {/* Quick attribute pills */}
        {highlights.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1 mb-1.5">
            {highlights.slice(0, 3).map((h, i) => (
              <span key={i} className="text-[9px] text-gray-400 font-medium">
                {h.value}
                {i < Math.min(highlights.length, 3) - 1 && <span className="mx-1 text-gray-300">·</span>}
              </span>
            ))}
          </div>
        )}

        {/* Color + Size inline */}
        {productColors.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 mb-1.5">
            <span className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider">{t('product.color')}:</span>
            <div className="flex gap-1 flex-wrap">
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
                    className={`relative rounded-[2px] transition-all duration-200 shrink-0 ${
                      isOOS ? 'ring-1 ring-gray-100 cursor-not-allowed opacity-30' : isSelected ? 'ring-2 ring-black ring-offset-1 scale-110' : 'ring-1 ring-gray-200 hover:ring-gray-400 hover:scale-105'
                    } w-3.5 h-3.5`}
                    title={isOOS ? `${color} - ${t('product.out_of_stock')}` : color}
                    disabled={isOOS}
                  >
                    <div className={`w-full h-full rounded-[2px] ${isLight ? 'border border-gray-200' : ''}`} style={{ background: getColorHex(color) }} />
                    {isOOS && <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="w-[130%] h-[1px] bg-gray-400 rotate-45 absolute rounded-full" /></div>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {productSizes.length > 0 && (
          <div className="flex items-center justify-center gap-1 mb-1.5">
            <span className="text-[8px] font-semibold text-gray-400 uppercase tracking-wider">{t('product.size')}:</span>
            <div className="flex gap-1 flex-wrap">
              {productSizes.map(size => {
                const isSelected = selectedSize === size;
                const isOOS = oosSizes.has(size);
                return (
                  <button
                    key={size}
                    onClick={(e) => { e.stopPropagation(); if (!isOOS) setSelectedSize(size); }}
                    disabled={isOOS}
                    className={`rounded-[2px] text-[8px] font-semibold transition-all duration-200 px-1.5 py-0.5 ${
                      isOOS ? 'bg-gray-50 text-gray-300 border border-gray-100 cursor-not-allowed line-through' : isSelected ? 'bg-black text-white ring-1 ring-black' : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-400 hover:text-black'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-center gap-1.5">
          {displayOldPrice && (
            <span className="text-[11px] max-sm:text-[10px] text-gray-400 line-through">{formatCurrency(displayOldPrice)}</span>
          )}
          <span className={`text-xs font-bold ${displayOldPrice ? 'text-red-600' : 'text-gray-900'}`}>
            {formatCurrency(displayPrice)}
          </span>
          {displayDiscount && (
            <span className="text-[8px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-200 leading-none">
              -{displayDiscount}%
            </span>
          )}
        </div>

        {/* Quantity + Add to Cart row */}
        {!showQuickAdd && (
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="inline-flex items-center bg-gray-50 border border-gray-200 overflow-hidden shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); setQty(Math.max(1, qty - 1)); }}
                disabled={qty <= 1}
                className="text-gray-400 hover:text-black disabled:text-gray-200 disabled:cursor-not-allowed h-7 w-7 flex items-center justify-center transition-colors hover:bg-gray-100"
              >
                <Minus size={11} />
              </button>
              <span className="text-center font-bold text-black w-7 text-xs select-none border-x border-gray-200 h-7 flex items-center justify-center bg-white">{qty}</span>
              <button
                onClick={(e) => { e.stopPropagation(); setQty(qty + 1); }}
                className="text-gray-400 hover:text-black h-7 w-7 flex items-center justify-center transition-colors hover:bg-gray-100"
              >
                <Plus size={11} />
              </button>
            </div>
            <button
              onClick={handleAddToCart}
              disabled={!canAdd || isAdding}
              className={`flex-1 max-w-[120px] h-7 font-bold flex items-center justify-center gap-1 transition-all duration-200 text-[10px] ${
                canAdd && !isAdding
                  ? 'bg-black text-white shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-gray-100 text-gray-300 cursor-not-allowed'
              }`}
            >
              {isAdding ? (
                <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full" /></>
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
        )}
      </div>
    </motion.div>

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

                  {/* Product Info Row */}
                  <div className="flex items-center gap-3 px-4 pb-3 border-b border-gray-100 shrink-0">
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                      {(() => {
                        const thumbUrl = getImageUrl(productImages[0] || '');
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
                                  className={`w-9 h-9 rounded-[2px] border-2 flex items-center justify-center transition-all duration-150 ${
                                    isSelected
                                      ? 'border-black scale-110 shadow-sm'
                                      : isOOS
                                      ? 'border-gray-200 opacity-30 cursor-not-allowed'
                                      : 'border-transparent hover:border-gray-300'
                                    }`}
                                  title={c}
                                >
                                  <div
                                    className={`w-7 h-7 rounded-[2px] border border-black/10 ${isOOS ? 'opacity-50' : ''} ${isLight && !isOOS ? 'border-gray-300' : ''}`}
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
                                  className={`px-4 py-2.5 text-xs font-bold rounded-[2px] transition-all duration-150 ${
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
}

/* ─── New Arrivals Grid ─── */
export default memo(function NewArrivals({ products, title = 'NEW ARRIVALS' }) {
  const { t: tOuter } = useTranslation();
  const items = (products && products.length > 0 ? products : DEFAULT_PRODUCTS)
    .filter(p => p.slug !== CUSTOM_TEE_SLUG);

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-center mb-8 md:mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-6 h-px bg-gray-300" />
            <span className="w-6 h-px bg-gray-300" />
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-black tracking-[-0.02em] leading-[1.1]">
            {title}
          </h2>
  <p className="mt-2 text-[11px] text-gray-400 font-medium uppercase tracking-[0.15em]">
    {tOuter('product.fresh_drops_subtitle')}
  </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 md:gap-x-5 md:gap-y-8">
          {items.map((product, idx) => (
            <NewArrivalCard key={product.id} product={product} index={idx} />
          ))}
        </div>
      </div>
    </section>
  );
});


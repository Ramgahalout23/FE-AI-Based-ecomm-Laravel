import { ArrowRight, Sparkles, ShoppingBag, Minus, Plus, Truck, ShieldCheck, RefreshCw } from 'lucide-react';
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { formatCurrency, getImageUrl, getProductImage, slugify } from '../../utils/formatters';
import { getColorHex } from '../../utils/constants';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';
import { cartAPI } from '../../api/cart';
import { trackAddToCart } from '../../services/tracker';
import { addedToCart } from '../../utils/toast';
import useFlyToCart from '../../hooks/useFlyToCart';

export default function NewArrivalOfTheWeek({ product }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addItem: addToCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { flyRef, flyToCart } = useFlyToCart();

  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // ── Derive product data (null-safe — a missing product renders nothing at the end) ──
  const imgUrl = getImageUrl(getProductImage(product));
  const categoryName = typeof product?.category === 'object'
    ? product?.category?.name || product?.categoryName || ''
    : product?.category || product?.categoryName || '';
  const slug = product?.slug || slugify(product?.name) || '';

  // ── Variant data (memoized so the array reference is stable for later useMemos) ──
  const variants = useMemo(() => product?.variants || product?.productvariant || [], [product]);
  const hasVariants = Array.isArray(variants) && variants.length > 0;

  const { colors, sizes } = useMemo(() => {
    const cSet = new Set();
    const sSet = new Set();
    if (hasVariants) {
      variants.forEach(v => {
        if (v.attributes) {
          if (v.attributes.color) cSet.add(v.attributes.color);
          if (v.attributes.size) sSet.add(v.attributes.size);
        }
      });
    }
    const colorArr = cSet.size > 0 ? [...cSet] : (Array.isArray(product?.colors) ? product?.colors : []);
    const sizeArr = sSet.size > 0 ? [...sSet] : (Array.isArray(product?.sizes) ? product?.sizes : []);
    return { colors: colorArr, sizes: sizeArr };
  }, [hasVariants, variants, product?.colors, product?.sizes]);

  const hasColorOptions = colors.length > 0;
  const hasSizeOptions = sizes.length > 0;
  const isSimpleProduct = !hasColorOptions && !hasSizeOptions;

  // ── OOS colors/sizes ──
  const { oosColors, oosSizes } = useMemo(() => {
    if (!hasVariants) return { oosColors: new Set(), oosSizes: new Set() };
    const oc = new Set();
    const os = new Set();
    colors.forEach(c => {
      const hasInStock = variants.some(v => v.attributes?.color === c && (v.quantity || 0) > 0);
      if (!hasInStock) oc.add(c);
    });
    sizes.forEach(s => {
      const hasInStock = variants.some(v => v.attributes?.size === s && (v.quantity || 0) > 0);
      if (!hasInStock) os.add(s);
    });
    return { oosColors: oc, oosSizes: os };
  }, [hasVariants, variants, colors, sizes]);

  // ── Variant matching ──
  const matchedVariant = useMemo(() => {
    if (!hasVariants) return null;
    const needsColor = hasColorOptions;
    const needsSize = hasSizeOptions;
    if (needsColor && !selectedColor) return null;
    if (needsSize && !selectedSize) return null;
    return variants.find(v => {
      const attrs = v.attributes || {};
      const colorMatch = !needsColor || attrs.color === selectedColor;
      const sizeMatch = !needsSize || attrs.size === selectedSize;
      return colorMatch && sizeMatch;
    }) || null;
  }, [hasVariants, variants, selectedColor, selectedSize, hasColorOptions, hasSizeOptions]);

  // ── Stock & pricing ──
  const hasAllSelections = (!hasColorOptions || selectedColor) && (!hasSizeOptions || selectedSize);
  const displayPrice = matchedVariant?.price ?? product?.price;
  const displayOldPrice = product?.oldPrice && product?.oldPrice > displayPrice ? product?.oldPrice : null;
  const discount = displayOldPrice ? Math.round(((displayOldPrice - displayPrice) / displayOldPrice) * 100) : null;

  const availableStock = matchedVariant?.quantity ?? product?.quantity ?? 0;
  const isOutOfStock = hasVariants
    ? matchedVariant && availableStock <= 0
    : availableStock <= 0;
  const isLowStock = !isOutOfStock && availableStock > 0 && availableStock <= 5;
  const canAddToCart = isSimpleProduct
    ? availableStock > 0
    : hasAllSelections && matchedVariant && availableStock > 0;

  // ── Add to Cart ──
  const handleAddToCart = useCallback(async () => {
    if (isAdding || !canAddToCart) return;
    setIsAdding(true);
    flyToCart();

    trackAddToCart(product.id, product.name, qty, displayPrice);

    try {
      addToCart({
        ...product,
        productId: product.id,
        quantity: qty,
        size: selectedSize || undefined,
        color: selectedColor || undefined,
        variantId: matchedVariant?.id || undefined,
        price: displayPrice,
      });

      if (isAuthenticated) {
        await cartAPI.add({
          productId: product.id,
          quantity: qty,
          size: selectedSize || undefined,
          color: selectedColor || undefined,
          variantId: matchedVariant?.id || undefined,
        }).catch(() => {});
      }

      addedToCart(product.name);
    } finally {
      setIsAdding(false);
    }
  }, [isAdding, canAddToCart, flyToCart, product, qty, selectedSize, selectedColor, matchedVariant, displayPrice, isAuthenticated, addToCart]);

  if (!product) return null;

  return (
    <section className="relative bg-white overflow-hidden">
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="grid md:grid-cols-2 gap-0 md:min-h-[700px]"
        >
          {/* ── Image Side ── */}
          <div
            ref={flyRef}
            className="relative aspect-[4/5] md:aspect-auto md:min-h-[700px] overflow-hidden bg-gray-50 group/img"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={product.name}
                className="w-full h-full object-cover transition-all duration-[800ms] ease-out"
                style={{
                  transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                }}
                loading="eager"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl opacity-20">
                👕
              </div>
            )}

            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity duration-500" />

            {/* Decorative gradient overlay on mobile */}
            <div className="md:hidden absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />

            {/* Premium badge — floating over image */}
            <div className="absolute top-5 left-5 z-10">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-1.5 bg-white/90 backdrop-blur-md text-black text-[10px] font-bold uppercase tracking-[0.15em] px-3.5 py-2 rounded-full shadow-lg border border-white/40"
              >
                <Sparkles size={12} className="text-gray-900" />
                {t('home.new_arrival_week') || 'New Arrival of the Week'}
              </motion.div>
            </div>

            {/* Stock badge */}
            {isOutOfStock && (
              <div className="absolute top-5 right-5 z-10">
                <span className="inline-flex items-center gap-1.5 bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-red-400/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {t('product.out_of_stock') || 'Out of Stock'}
                </span>
              </div>
            )}
            {isLowStock && !isOutOfStock && (
              <div className="absolute top-5 right-5 z-10">
                <span className="inline-flex items-center gap-1.5 bg-gray-900/90 backdrop-blur-sm text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg border border-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  {t('product.low_stock', { count: availableStock }) || `Only ${availableStock} left`}
                </span>
              </div>
            )}
          </div>

          {/* ── Content Side ── */}
          <div className="flex flex-col justify-center px-6 sm:px-8 lg:px-12 xl:px-16 py-10 md:py-0">
            {/* Tagline */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="flex items-center gap-2 mb-2"
            >
              <span className="h-px w-5 bg-gradient-to-r from-transparent via-gray-300 to-transparent rounded-full" />
              <span className="text-gray-400 text-[9px] font-bold uppercase tracking-[0.2em]">{categoryName || (t('home.fresh_drops') || 'Fresh Drops')}</span>
              <span className="h-px w-5 bg-gradient-to-l from-transparent via-gray-300 to-transparent rounded-full" />
            </motion.div>

            {/* Product Name */}
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-display font-extrabold tracking-tight text-gray-900 leading-[1.05] mb-3"
            >
              {product.name}
            </motion.h2>

            {/* Price Row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex items-center gap-3 mb-5"
            >
              <span className="text-3xl lg:text-4xl font-display font-bold text-gray-900 tracking-tight">
                {formatCurrency(displayPrice)}
              </span>
              {displayOldPrice && (
                <span className="text-lg text-gray-400 line-through font-medium">
                  {formatCurrency(displayOldPrice)}
                </span>
              )}
              {discount && (
                <span className="text-xs font-bold text-white bg-gray-900 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  -{discount}%
                </span>
              )}
            </motion.div>

            {/* Description */}
            {product.description && (
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="text-gray-500 text-sm sm:text-base leading-relaxed mb-6 max-w-lg"
              >
                {product.description}
              </motion.p>
            )}

            {/* ═══ Variant Selection — Color ═══ */}
            {hasColorOptions && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.38 }}
                className="mb-5"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    {t('product.color') || 'Color'}
                    <span className="text-gray-400 font-normal normal-case ml-1.5">
                      — {selectedColor || (t('product.select') || 'Select')}
                    </span>
                  </span>
                  {selectedColor && (
                    <button
                      onClick={() => setSelectedColor('')}
                      className="text-[10px] text-gray-400 hover:text-gray-900 underline-offset-2 hover:underline transition-colors font-medium"
                    >
                      {t('product.clear') || 'Clear'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2.5 flex-wrap">
                  {colors.map(color => {
                    const isOOS = oosColors.has(color);
                    const isSel = selectedColor === color;
                    const isLight = ['white','cream','beige','ivory','silver','light','blush','nude','pearl','bone','almond','vanilla'].some(l =>
                      color.toLowerCase().includes(l)
                    );
                    return (
                      <button
                        key={color}
                        onClick={() => { if (!isOOS) setSelectedColor(color); }}
                        disabled={isOOS}
                        className={`relative w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isSel
                            ? 'scale-110'
                            : isOOS
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:scale-110 hover:-translate-y-0.5'
                        }`}
                        title={isOOS ? `${color} - ${t('product.out_of_stock') || 'Out of Stock'}` : color}
                      >
                        {/* Selection ring */}
                        <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
                          isSel
                            ? 'border-2 border-gray-900 shadow-lg shadow-black/10'
                            : 'border-2 border-transparent hover:border-gray-300'
                        }`} />
                        {/* Inner color dot */}
                        <div
                          className={`w-[30px] h-[30px] md:w-[34px] md:h-[34px] rounded-full border border-black/10 shadow-sm transition-all duration-300 ${
                            isSel ? 'w-[26px] h-[26px] md:w-[28px] md:h-[28px]' : 'hover:shadow-md'
                          } ${isOOS ? 'opacity-50' : ''} ${isLight ? 'border-gray-300' : ''}`}
                          style={{ background: getColorHex(color) }}
                        />
                        {isOOS && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-full h-full text-gray-400 opacity-80" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <line x1="4" y1="4" x2="20" y2="20" />
                            </svg>
                          </span>
                        )}
                        {isSel && !isOOS && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" className="drop-shadow-sm">
                              <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ═══ Variant Selection — Size ═══ */}
            {hasSizeOptions && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.42 }}
                className="mb-5"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    {t('product.size') || 'Size'}
                    <span className="text-gray-400 font-normal normal-case ml-1.5">
                      — {selectedSize || (t('product.select') || 'Select')}
                    </span>
                  </span>
                  {selectedSize && (
                    <button
                      onClick={() => setSelectedSize('')}
                      className="text-[10px] text-gray-400 hover:text-gray-900 underline-offset-2 hover:underline transition-colors font-medium"
                    >
                      {t('product.clear') || 'Clear'}
                    </button>
                  )}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {sizes.map(size => {
                    const isOOS = oosSizes.has(size);
                    const isSel = selectedSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => { if (!isOOS) setSelectedSize(size); }}
                        disabled={isOOS}
                        className={`min-w-[52px] py-2.5 px-4 rounded-xl border-2 font-bold text-xs md:text-sm transition-all duration-200 active:scale-[0.97] ${
                          isSel
                            ? 'border-gray-900 bg-gray-900 text-white shadow-md'
                            : isOOS
                            ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                            : 'border-gray-200 text-gray-700 hover:border-gray-400 hover:bg-gray-50 hover:shadow-sm'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ═══ Stock Status ═══ */}
            {!isOutOfStock && hasAllSelections && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                {isLowStock ? (
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 bg-gray-50/80 border border-gray-200/80 px-4 py-2 rounded-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-700 shrink-0 animate-pulse" />
                    {t('product.low_stock_count', { count: availableStock }) || `Only ${availableStock} left`}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 bg-gray-50/80 border border-gray-200/80 px-4 py-2 rounded-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-700 shrink-0" />
                    {t('product.in_stock') || 'In Stock'}
                  </div>
                )}
              </motion.div>
            )}

            {/* ═══ Add to Cart Row ═══ */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.46 }}
              className="flex flex-col gap-3 pt-2"
            >
              <div className="flex items-center gap-3">
                {/* Quantity Stepper */}
                <div className="flex items-center border-2 border-gray-200 rounded-xl h-12 md:h-14 bg-gray-50/50">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    disabled={qty <= 1 || isOutOfStock}
                    className="px-3.5 md:px-4 text-gray-400 hover:text-gray-900 disabled:text-gray-200 disabled:cursor-not-allowed h-full transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-bold text-base md:text-lg w-8 text-center tabular-nums text-gray-900">{qty}</span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    disabled={isOutOfStock}
                    className="px-3.5 md:px-4 text-gray-400 hover:text-gray-900 disabled:text-gray-200 disabled:cursor-not-allowed h-full transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={!canAddToCart || isAdding}
                  className={`flex-1 h-12 md:h-14 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.97] ${
                    canAddToCart && !isAdding
                      ? 'bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/25'
                      : isOutOfStock
                      ? 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200/60'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isAdding ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t('product.adding') || 'Adding...'}</>
                  ) : isOutOfStock ? (
                    <><span className="text-lg leading-none">✕</span> {t('product.out_of_stock') || 'Out of Stock'}</>
                  ) : !hasAllSelections && (hasColorOptions || hasSizeOptions) ? (
                    <span className="flex items-center gap-2"><ShoppingBag size={16} /> {t('product.select_options') || 'Select Options'}</span>
                  ) : isSimpleProduct || (hasAllSelections && matchedVariant) ? (
                    <AnimatePresence mode="popLayout">
                          <motion.span
                            key={displayPrice * qty}
                            initial={{ y: 6, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: -6, opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="inline-flex items-center gap-2 whitespace-nowrap"
                          >
                            <ShoppingBag size={16} />
                            <span>{t('product.add_price', { price: formatCurrency(displayPrice * qty) })}</span>
                          </motion.span>
                        </AnimatePresence>
                  ) : (
                    <span className="flex items-center gap-2"><ShoppingBag size={16} /> {t('product.select_options') || 'Select Options'}</span>
                  )}
                </button>
              </div>

              {/* Buy It Now */}
              {canAddToCart && !isOutOfStock && (
                <button
                  onClick={async () => {
                    if (isAdding || !canAddToCart) return;
                    setIsAdding(true);
                    try {
                      addToCart({
                        ...product,
                        productId: product.id,
                        quantity: qty,
                        size: selectedSize || undefined,
                        color: selectedColor || undefined,
                        variantId: matchedVariant?.id || undefined,
                        price: displayPrice,
                      });
                      if (isAuthenticated) {
                        await cartAPI.add({
                          productId: product.id,
                          quantity: qty,
                          size: selectedSize || undefined,
                          color: selectedColor || undefined,
                          variantId: matchedVariant?.id || undefined,
                        }).catch(() => {});
                      }
                      navigate('/checkout');
                    } finally {
                      setIsAdding(false);
                    }
                  }}
                  className="w-full h-11 md:h-12 rounded-xl font-bold text-sm transition-all duration-200 active:scale-[0.97] border-2 border-gray-200 text-gray-700 hover:border-gray-900 hover:text-gray-900 hover:bg-gray-50"
                >
                  {t('product.buy_now') || 'Buy Now'}
                </button>
              )}

              {/* Secondary CTA */}
              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => navigate(`/products/${slug}`)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-[0.1em] transition-colors duration-300 group/btn"
                >
                  {t('home.view_details') || 'View Details'}
                  <ArrowRight size={12} className="transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                </button>
                <span className="w-px h-3 bg-gray-200" />
                <button
                  onClick={() => navigate('/products/section/new-arrivals')}
                  className="text-xs font-bold text-gray-500 hover:text-gray-900 uppercase tracking-[0.1em] transition-colors duration-300"
                >
                  {t('home.view_all') || 'View All'}
                </button>
              </div>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-3 gap-2 pt-5 border-t border-gray-100 mt-4"
              >
                {[
                  { icon: Truck, label: t('product.free_shipping') || 'Free Shipping', sub: `${t('product.above_amount', { amount: formatCurrency(499) }) || 'Above ₹499'}` },
                  { icon: RefreshCw, label: t('product.easy_returns') || 'Easy Returns', sub: (t('product.days', { count: 7 }) || '7 Days') },
                  { icon: ShieldCheck, label: t('product.secure') || 'Secure', sub: t('product.checkout') || 'Checkout' },
                ].map((item, i) => {
                  const IconComponent = item.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: 0.52 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col items-center text-center gap-1.5 group/trust"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover/trust:bg-gray-900 group-hover/trust:text-white transition-all duration-300">
                        <IconComponent size={13} className="transition-transform duration-300 group-hover/trust:scale-110" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-gray-600 group-hover/trust:text-gray-900 transition-colors duration-300">
                          {item.label}
                        </span>
                        <span className="block text-[8px] text-gray-400">
                          {item.sub}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

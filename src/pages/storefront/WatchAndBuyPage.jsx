import { Heart, Eye, ShoppingCart, ArrowRight, Truck, RefreshCw, ShieldCheck, Headphones, Play, X, Volume2, VolumeX, Minus, Plus, Image as ImageIcon } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import SEOHead from '../../components/seo/SEOHead';
import { homepageAPI } from '../../api/homepage';
import { formatCurrency, getImageUrl, getProductImage } from '../../utils/formatters';
import { getColorHex } from '../../utils/constants';
import { computeStockStatus } from '../../utils/stockHelpers';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import { cartAPI } from '../../api/cart';
import { productsAPI } from '../../api/products';
import { wishlistAPI } from '../../api/wishlist';
import useAuthStore from '../../store/authStore';
import { addedToCart } from '../../utils/toast';

/* ═══════════════════════════════════════════════════════════
   VIDEO HELPERS — YouTube / Vimeo / MP4 detection
   ═══════════════════════════════════════════════════════════ */
function isYouTubeUrl(url) {
  if (!url) return false;
  return /youtube\.com\/shorts\//i.test(url) || /youtube\.com\/watch\?v=/i.test(url) || /youtu\.be\//i.test(url);
}

function isVimeoUrl(url) {
  if (!url) return false;
  return /vimeo\.com\//i.test(url);
}

function isUnsupportedVideoUrl(url) {
  if (!url) return false;
  return isYouTubeUrl(url) || isVimeoUrl(url) || /dailymotion\.com\//i.test(url);
}

/** Extract YouTube video ID for iframe embedding */
function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0`;
  }
  return null;
}

/** Extract Vimeo video ID for iframe embedding */
function getVimeoEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m?.[1] ? `https://player.vimeo.com/video/${m[1]}?autoplay=1` : null;
}

function discountPercent(oldPrice, price) {
  if (!oldPrice || !price) return 0;
  return Math.round(((Number(oldPrice) - Number(price)) / Number(oldPrice)) * 100);
}

/* ═══════════════════════════════════════════════════════════
   VIDEO PLAYER MODAL — Supports MP4 + YouTube + Vimeo
   ═══════════════════════════════════════════════════════════ */
function VideoPlayerModal({ videoUrl, imageUrl, title, onClose }) {
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const videoRef = useRef(null);

  const youTubeEmbed = getYouTubeEmbedUrl(videoUrl);
  const vimeoEmbed = getVimeoEmbedUrl(videoUrl);
  const isEmbedVideo = youTubeEmbed || vimeoEmbed;

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Keyboard: Escape to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Control native video
  useEffect(() => {
    const v = videoRef.current;
    if (!v || isEmbedVideo) return;
    if (isPlaying) v.play().catch(() => {});
    else v.pause();
  }, [isPlaying, isEmbedVideo]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-lg flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all active:scale-90"
      >
        <X size={18} />
      </button>

      {/* Title */}
      {title && (
        <div className="absolute top-4 left-4 z-10 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white/80 text-sm font-bold max-w-[60%] truncate">
          {title}
        </div>
      )}

      {/* ── Video container ── */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-3xl mx-4 aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* YouTube / Vimeo embed */}
        {isEmbedVideo ? (
          <iframe
            src={youTubeEmbed || vimeoEmbed}
            title={title || 'Video'}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : videoError ? (
          /* Error fallback */
          <div className="w-full h-full flex flex-col items-center justify-center gap-4 bg-gray-900">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
            ) : (
              <ImageIcon size={48} className="text-white/20" />
            )}
            <div className="relative z-10 text-center px-6">
              <p className="text-white/50 text-xs font-bold uppercase tracking-wider mb-1">Video unavailable</p>
              <p className="text-white/30 text-[10px]">The video could not be loaded. Please try again later.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Native MP4 */}
            <video
              ref={videoRef}
              src={videoUrl}
              poster={imageUrl || undefined}
              muted={isMuted}
              autoPlay
              playsInline
              loop
              className={`w-full h-full object-contain ${videoReady ? 'opacity-100' : 'opacity-0'}`}
              onCanPlay={() => setVideoReady(true)}
              onError={() => setVideoError(true)}
              onClick={() => setIsPlaying(p => !p)}
            />

            {/* Loading spinner */}
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" />
              </div>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
              <button
                onClick={(e) => { e.stopPropagation(); setIsMuted(m => !m); }}
                className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all"
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>

            {/* Center play/pause */
            /* Handled by clicking the video directly */}
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   REEL BUY MODAL — Inline variant selection for reel products
   ═══════════════════════════════════════════════════════════ */
function ReelBuyModal({ productId, onClose }) {
  const { isAuthenticated } = useAuthStore();
  const addToCart = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [qty, setQty] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch full product details
  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    productsAPI.getById(productId)
      .then(res => {
        const data = res.data?.data || res.data || {};
        setProduct(data);
        if (data.colors?.length) setSelectedColor(data.colors[0]);
        if (data.sizes?.length) setSelectedSize(data.sizes[0]);
      })
      .catch(err => {
        setError(err?.response?.data?.message || 'Failed to load product');
      })
      .finally(() => setLoading(false));
  }, [productId]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Escape to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const variants = product?.variants || product?.productvariant || [];
  const hasVariants = Array.isArray(variants) && variants.length > 0;

  const matchedVariant = hasVariants
    ? variants.find(v =>
        (v.attributes?.color || '') === selectedColor &&
        (v.attributes?.size || '') === selectedSize
      ) || null
    : null;

  // Auto-select first available variant
  useEffect(() => {
    if (!hasVariants || !product) return;
    if (matchedVariant) return;
    const first = variants.find(v => (v.quantity || 0) > 0);
    if (first?.attributes) {
      if (first.attributes.color && product.colors?.length) setSelectedColor(first.attributes.color);
      if (first.attributes.size && product.sizes?.length) setSelectedSize(first.attributes.size);
    }
  }, [product, hasVariants, variants, matchedVariant]);

  const colors = product?.colors || [];
  const sizes = product?.sizes || [];
  const displayPrice = matchedVariant?.price ?? product?.price ?? 0;
  const displayOldPrice = product?.oldPrice || product?.old_price || null;
  const displayDiscount = displayOldPrice ? Math.round(((Number(displayOldPrice) - Number(displayPrice)) / Number(displayOldPrice)) * 100) : null;
  const canAdd = hasVariants
    ? (selectedColor && selectedSize && matchedVariant && (matchedVariant.quantity || 0) > 0)
    : !hasVariants && product
    ? ((product.quantity ?? 0) > 0)
    : false;

  const handleAddBag = async () => {
    if (isAdding || !canAdd || !product) return;
    setIsAdding(true);
    try {
      const cartItem = {
        id: product.id,
        productId: product.id,
        name: product.name,
        price: displayPrice,
        image: getProductImage(product),
        quantity: qty,
        ...(selectedSize && { size: selectedSize }),
        ...(selectedColor && { color: selectedColor }),
        ...(matchedVariant?.id && { variantId: matchedVariant.id }),
      };
      addToCart(cartItem);
      if (isAuthenticated) {
        await cartAPI.add({
          productId: product.id,
          quantity: qty,
          size: selectedSize || null,
          color: selectedColor || null,
        }).catch(() => {});
      }
      addedToCart(product.name);
      setTimeout(() => openCart(), 300);
      onClose();
    } finally {
      setIsAdding(false);
    }
  };

  const imgUrl = getProductImage(product);
  const imageSrc = imgUrl ? getImageUrl(imgUrl) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      {/* Premium bottom sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
        className="relative w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden sm:mx-4 sm:mb-0 max-h-[85vh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300/60" />
        </div>

        {/* Close button */}
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100/80 backdrop-blur-sm flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all active:scale-90 shadow-sm">
          <X size={14} />
        </button>

        {/* Loading */}
        {loading && (
          <div className="p-10 flex flex-col items-center justify-center gap-4 min-h-[200px]">
            <div className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-400 animate-spin" />
            <p className="text-sm text-gray-400 font-medium">Loading product...</p>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-10 flex flex-col items-center justify-center gap-3 min-h-[200px]">
            <span className="text-4xl">😕</span>
            <p className="text-sm text-gray-500 text-center">{error}</p>
            <button onClick={onClose} className="px-6 py-2 bg-black text-white text-xs font-bold rounded-lg hover:bg-gray-800 transition-all">Close</button>
          </div>
        )}

        {/* Product Details */}
        {!loading && !error && product && (
          <>
            {/* Product header with image row */}
            <div className="px-5 pt-5 pb-3 flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 shrink-0 border border-gray-200 shadow-sm relative">
                {imageSrc ? (
                  <img src={imageSrc} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl text-gray-200">👕</div>
                )}
                {displayDiscount && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-red-500 text-white text-[7px] font-bold rounded-md shadow-sm">
                    -{displayDiscount}%
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-gray-900 leading-tight line-clamp-2">{product.name}</h3>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-lg font-extrabold text-gray-900 tracking-tight">{formatCurrency(displayPrice)}</span>
                  {displayOldPrice && <span className="text-xs text-gray-400 line-through">{formatCurrency(displayOldPrice)}</span>}
                </div>
              </div>
            </div>

            {/* Scrollable options area */}
            <div className="px-5 pb-5 space-y-4 overflow-y-auto max-h-[50vh]">
              <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

              {/* Color Selector */}
              {colors.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                    Color · <span className="text-gray-900 font-bold">{selectedColor || 'Select'}</span>
                  </p>
                  <div className="flex flex-wrap gap-2.5">
                    {colors.map(c => {
                      const isLight = ['white','cream','beige','ivory','silver','light','blush','nude','pearl','bone','almond','vanilla'].some(l => c.toLowerCase().includes(l));
                      const isSelected = selectedColor === c;
                      const colorVariants = variants.filter(v => v.attributes?.color === c);
                      const hasStock = colorVariants.some(v => (v.quantity || 0) > 0);
                      return (
                        <button
                          key={c}
                          onClick={() => !hasStock ? null : setSelectedColor(c)}
                          disabled={!hasStock}
                          className={`relative rounded-full transition-all duration-200 ${
                            !hasStock ? 'opacity-30 cursor-not-allowed' :
                            isSelected ? 'ring-2 ring-black ring-offset-2 scale-110 shadow-md' : 'ring-1 ring-gray-200 hover:ring-gray-400 hover:scale-105'
                          } w-8 h-8`}
                          title={!hasStock ? `${c} - Out of Stock` : c}
                        >
                          <div className={`w-full h-full rounded-full ${isLight ? 'border border-gray-300' : ''}`} style={{ background: getColorHex(c) || '#ccc' }} />
                          {!hasStock && <div className="absolute inset-0 flex items-center justify-center"><div className="w-[140%] h-[1.5px] bg-gray-400 rotate-45 absolute rounded-full" /></div>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selector */}
              {sizes.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2.5">
                    Size · <span className="text-gray-900 font-bold">{selectedSize || 'Select'}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map(s => {
                      const isSelected = selectedSize === s;
                      const sizeVariants = variants.filter(v => v.attributes?.size === s);
                      const hasStock = sizeVariants.some(v => (v.quantity || 0) > 0);
                      return (
                        <button
                          key={s}
                          onClick={() => !hasStock ? null : setSelectedSize(s)}
                          disabled={!hasStock}
                          className={`px-4 py-2 text-[11px] font-bold rounded-xl transition-all duration-150 ${
                            !hasStock ? 'opacity-25 cursor-not-allowed text-gray-400 bg-gray-50 line-through' :
                            isSelected ? 'bg-gray-900 text-white shadow-md scale-[1.02] ring-1 ring-gray-900' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-[1.02]'
                          }`}
                        >{s}</button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity + Add to Bag */}
              <div className="pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shrink-0 bg-gray-50">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      disabled={qty <= 1}
                      className="w-11 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-all disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200"
                    ><Minus size={14} /></button>
                    <span className="w-11 h-11 flex items-center justify-center text-sm font-bold text-gray-900 bg-white border-x border-gray-200">{qty}</span>
                    <button
                      onClick={() => setQty(qty + 1)}
                      className="w-11 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-all active:bg-gray-200"
                    ><Plus size={14} /></button>
                  </div>

                  <button
                    onClick={handleAddBag}
                    disabled={!canAdd || isAdding}
                    className={`flex-1 h-11 flex items-center justify-center gap-2 text-xs font-bold rounded-xl transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                      canAdd && !isAdding
                        ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white hover:from-gray-800 hover:to-gray-700 shadow-lg shadow-gray-900/20 hover:shadow-xl'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isAdding ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : !canAdd ? (
                      hasVariants && (!selectedColor || !selectedSize) ? 'Select options' : 'Sold Out'
                    ) : (
                      <><ShoppingCart size={15} className="-ml-1" /> Add to Bag</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   WATCH & BUY — Shoppable Video Reels Section
   ═══════════════════════════════════════════════════════════ */
function ShoppableVideoSection({ reels }) {
  const { isAuthenticated } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const [activeVideo, setActiveVideo] = useState(null);
  const [buyProductId, setBuyProductId] = useState(null);

  // ── Quick-Add Inline State ──
  const [quickAddProductId, setQuickAddProductId] = useState(null);
  const [quickAddColor, setQuickAddColor] = useState('');
  const [quickAddSize, setQuickAddSize] = useState('');
  const [quickAddQty, setQuickAddQty] = useState(1);
  const [quickAddIsAdding, setQuickAddIsAdding] = useState(false);

  const hasSelectableVariants = useCallback((product) => {
    if (!product) return false;
    const variants = product.variants || product.productvariant;
    if (!Array.isArray(variants) || variants.length === 0) return false;
    return variants.some(v => v.attributes?.color || v.attributes?.size);
  }, []);

  const openQuickAdd = useCallback((product) => {
    setQuickAddProductId(product.id);
    setQuickAddColor(product.colors?.[0] || '');
    setQuickAddSize(product.sizes?.[0] || '');
    setQuickAddQty(1);
    setQuickAddIsAdding(false);
  }, []);

  const closeQuickAdd = useCallback(() => {
    setQuickAddProductId(null);
    setQuickAddColor('');
    setQuickAddSize('');
    setQuickAddQty(1);
    setQuickAddIsAdding(false);
  }, []);

  const confirmQuickAdd = useCallback(async (product) => {
    if (quickAddIsAdding || !product) return;
    setQuickAddIsAdding(true);
    try {
      const variants = product.variants || product.productvariant || [];
      const hasVariants = variants.length > 0;
      let matchedVariant = null;
      if (hasVariants && quickAddColor && quickAddSize) {
        matchedVariant = variants.find(v => v.attributes?.color === quickAddColor && v.attributes?.size === quickAddSize) || null;
      } else if (hasVariants && quickAddColor) {
        matchedVariant = variants.find(v => v.attributes?.color === quickAddColor) || null;
      } else if (hasVariants && quickAddSize) {
        matchedVariant = variants.find(v => v.attributes?.size === quickAddSize) || null;
      }
      if (!matchedVariant && hasVariants) {
        matchedVariant = variants.find(v => (v.quantity || 0) > 0) || variants[0];
      }
      addItem({
        id: product.id,
        productId: product.id,
        name: product.name,
        price: matchedVariant?.price ?? product.price,
        image: getProductImage(product),
        quantity: quickAddQty,
        ...(quickAddSize && { size: quickAddSize }),
        ...(quickAddColor && { color: quickAddColor }),
        ...(matchedVariant?.id && { variantId: matchedVariant.id }),
      });
      if (isAuthenticated) {
        await cartAPI.add({
          productId: product.id,
          quantity: quickAddQty,
          size: quickAddSize || null,
          color: quickAddColor || null,
        }).catch(() => {});
      }
      addedToCart(product.name);
      setTimeout(() => openCart(), 400);
      closeQuickAdd();
    } finally {
      setQuickAddIsAdding(false);
    }
  }, [quickAddColor, quickAddSize, quickAddQty, addItem, isAuthenticated, openCart, closeQuickAdd, quickAddIsAdding]);

  if (!reels || reels.length === 0) return null;

  const handlePlayVideo = (reel) => {
    setActiveVideo({
      videoUrl: reel.videoUrl,
      imageUrl: reel.imageUrl,
      title: reel.title,
    });
  };

  const handleBuy = (e, product) => {
    e.stopPropagation();
    if (!product) return;
    if (hasSelectableVariants(product)) {
      openQuickAdd(product);
    } else {
      setBuyProductId(product.id);
    }
  };

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-8 md:mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="h-px w-8 bg-gradient-to-r from-transparent via-gray-300 to-transparent rounded-full" />
            <span className="text-gray-400 text-[9px] font-bold uppercase tracking-[0.2em]">Shop the look</span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent via-gray-300 to-transparent rounded-full" />
          </div>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-extrabold text-gray-900 tracking-tight">
            Watch & Buy
          </h2>
          <p className="text-gray-500 text-sm md:text-base mt-2 max-w-xl mx-auto">
            Tap any reel to watch — then buy the look directly.
          </p>
        </div>

        {/* Shoppable Reel Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {reels.slice(0, 8).map((reel, idx) => {
            const p = reel.products?.[0] || null;
            const isYouTube = isYouTubeUrl(reel.videoUrl);

            return (
              <motion.div
                key={reel.id || idx}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.45, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="group cursor-pointer"
                onClick={() => handlePlayVideo(reel)}
              >
                {/* Video Thumbnail Container */}
                <div className="relative aspect-[9/12] md:aspect-[9/14] bg-gray-100 overflow-hidden mb-3 md:mb-4 rounded-lg shadow-sm">
                  {reel.imageUrl ? (
                    <img
                      loading="lazy"
                      src={reel.imageUrl}
                      alt={reel.title || 'Video'}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">🎬</div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                  {/* Play button overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:bg-white/30">
                      <Play size={24} className="text-white ml-0.5" />
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/15 text-white text-[8px] font-bold uppercase tracking-wider shadow-lg">
                      {isYouTube ? 'YouTube' : 'Video'}
                    </span>
                  </div>

                  {/* Duration / external link indicator */}
                  {isYouTube && (
                    <div className="absolute top-3 right-3">
                      <span className="px-2 py-0.5 rounded-md bg-red-600/80 text-white text-[7px] font-bold uppercase tracking-wider">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="inline-block mr-0.5">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                      </span>
                    </div>
                  )}

                  {/* ── Quick-add options (compact inline within bottom area) ── */}
                  <AnimatePresence>
                    {quickAddProductId === p?.id && (
                      <motion.div key="quick-add-inline"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute bottom-0 left-0 right-0 z-20 overflow-hidden"
                      >
                        <div className="p-2.5 bg-white/98 backdrop-blur-xl border-t border-gray-200/80 shadow-lg">
                          {/* Close + header */}
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[8px] font-bold text-gray-500 uppercase tracking-wider">Quick Add</span>
                            <button onClick={(e) => { e.stopPropagation(); closeQuickAdd(); }}
                              className="w-4 h-4 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all active:scale-90">
                              <X size={7} />
                            </button>
                          </div>
                          {/* Colors & Sizes inline */}
                          {(() => {
                            const variants = p?.variants || p?.productvariant || [];
                            const colors = [...new Set(variants.map(v => v.attributes?.color).filter(Boolean))];
                            const sizes = [...new Set(variants.map(v => v.attributes?.size).filter(Boolean))];
                            const oosColors = new Set();
                            const oosSizes = new Set();
                            colors.forEach(c => { if (!variants.some(v => v.attributes?.color === c && (v.quantity || 0) > 0)) oosColors.add(c); });
                            sizes.forEach(s => { if (!variants.some(v => v.attributes?.size === s && (v.quantity || 0) > 0)) oosSizes.add(s); });
                            return (
                              <div className="space-y-1.5">
                                {colors.length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[7px] font-semibold text-gray-400 uppercase shrink-0">Color:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {colors.map(c => {
                                        const isOOS = oosColors.has(c);
                                        const isSelected = quickAddColor === c;
                                        return (
                                          <button key={c}
                                            disabled={isOOS}
                                            onClick={(e) => { e.stopPropagation(); setQuickAddColor(c); }}
                                            className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all duration-150 ${
                                              isSelected ? 'border-black ring-1 ring-black/20 scale-110' : isOOS ? 'border-gray-200 opacity-30 cursor-not-allowed' : 'border-gray-300 hover:border-gray-500'
                                            }`}
                                            title={c}
                                          >
                                            <div className={`w-[10px] h-[10px] rounded-full border border-black/10 ${isOOS ? 'opacity-50' : ''}`}
                                              style={{ background: getColorHex(c) }} />
                                            {isOOS && <div className="absolute w-[130%] h-[1px] bg-gray-400 rotate-45 rounded-full" />}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {sizes.length > 0 && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[7px] font-semibold text-gray-400 uppercase shrink-0">Size:</span>
                                    <div className="flex flex-wrap gap-1">
                                      {sizes.map(s => {
                                        const isOOS = oosSizes.has(s);
                                        const isSelected = quickAddSize === s;
                                        return (
                                          <button key={s}
                                            disabled={isOOS}
                                            onClick={(e) => { e.stopPropagation(); setQuickAddSize(s); }}
                                            className={`px-1.5 py-0.5 text-[7px] font-bold rounded transition-all duration-150 ${
                                              isOOS ? 'opacity-20 cursor-not-allowed text-gray-400 bg-gray-50 line-through' : isSelected ? 'bg-black text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                          >{s}</button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                {/* Add to Cart row */}
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <div className="flex items-center border border-gray-200 rounded overflow-hidden shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); setQuickAddQty(Math.max(1, quickAddQty - 1)); }}
                                      disabled={quickAddQty <= 1}
                                      className="w-5 h-5 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                                      <Minus size={7} />
                                    </button>
                                    <span className="w-5 h-5 flex items-center justify-center text-[8px] font-bold text-gray-800 bg-gray-50 border-x border-gray-200">{quickAddQty}</span>
                                    <button onClick={(e) => { e.stopPropagation(); setQuickAddQty(quickAddQty + 1); }}
                                      className="w-5 h-5 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-all">
                                      <Plus size={7} />
                                    </button>
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); confirmQuickAdd(p); }}
                                    disabled={quickAddIsAdding}
                                    className={`flex-1 h-6 flex items-center justify-center gap-1 text-[7px] font-bold rounded transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                                      !quickAddIsAdding ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                    {quickAddIsAdding ? (
                                      <span className="w-2 h-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                      <><ShoppingCart size={7} /> Add to Cart</>
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Regular product info at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                    <div className="bg-white/90 backdrop-blur-md rounded-xl px-3 py-2.5 shadow-lg border border-white/20"
                      style={quickAddProductId === p?.id ? { opacity: 0 } : {}}>
                      {/* Product thumbnail + name */}
                      {p && (
                        <div className="flex items-center gap-2 mb-2">
                          {p.image_url && (
                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                              <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold text-gray-900 leading-tight line-clamp-1">{p.name || reel.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-xs font-extrabold text-gray-900">{formatCurrency(p.price)}</span>
                              {p.old_price && <span className="text-[9px] text-gray-400 line-through">{formatCurrency(p.old_price)}</span>}
                              {p.old_price && p.price && (
                                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[6px] font-bold">
                                  {discountPercent(p.old_price, p.price)}% OFF
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePlayVideo(reel); }}
                          className="flex-1 py-1.5 rounded-lg bg-black text-white text-[8px] font-bold uppercase tracking-wider hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-1"
                        >
                          <Play size={9} />
                          Watch
                        </button>
                        {p && (
                          <button
                            onClick={(e) => handleBuy(e, p)}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-500 text-white text-[8px] font-bold uppercase tracking-wider hover:bg-emerald-600 transition-all active:scale-95 flex items-center justify-center gap-1"
                          >
                            <ShoppingCart size={9} />
                            Buy
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title below card */}
                {reel.title && (
                  <p className="text-xs md:text-sm font-medium text-gray-700 line-clamp-1 leading-tight">{reel.title}</p>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Video Player Modal */}
      <AnimatePresence>
        {activeVideo && (
          <VideoPlayerModal
            videoUrl={activeVideo.videoUrl}
            imageUrl={activeVideo.imageUrl}
            title={activeVideo.title}
            onClose={() => setActiveVideo(null)}
          />
        )}
      </AnimatePresence>

      {/* Reel Buy Modal — Inline variant selection */}
      <AnimatePresence>
        {buyProductId && (
          <ReelBuyModal
            productId={buyProductId}
            onClose={() => setBuyProductId(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════════════════════ */
function SelektHero() {
  const navigate = useNavigate();
  return (
    <section className="relative w-full bg-white overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-50/50 to-white pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 lg:py-32">
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/5 border border-black/10 text-black/60 text-[11px] font-bold uppercase tracking-[0.2em] mb-6"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Watch & Buy
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-black text-black tracking-[-0.03em] leading-[0.9] mb-4"
          >
            THREVOLT
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg sm:text-xl md:text-2xl text-gray-600 font-medium tracking-wide mb-8"
          >
            FOR THE ONES WHO CREATE
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-4"
          >
            <span className="px-4 py-2 bg-emerald-500/10 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200/50">Out Now</span>
            <button onClick={() => navigate('/products')} className="px-8 py-3 bg-black text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all duration-200 active:scale-[0.97] shadow-lg hover:shadow-xl">Shop Now</button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── SELEKTT-STYLE PRODUCT CARD ── */
function SelektProductCard({ product, index }) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { isInWishlist, addItem: addToWL, removeItem: removeFromWL } = useWishlistStore();
  const addToCart = useCartStore((s) => s.addItem);
  const inWishlist = isInWishlist(product.id);
  const [isAdding, setIsAdding] = useState(false);

  const imgUrl = getProductImage(product);
  const imageSrc = imgUrl ? getImageUrl(imgUrl) : null;
  const productSlug = product.slug || product.id;
  const { isOutOfStock } = computeStockStatus(product);
  const discount = product.oldPrice ? Math.round(((Number(product.oldPrice) - Number(product.price)) / Number(product.oldPrice)) * 100) : null;
  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;

  const handleQuickAdd = async (e) => {
    e.stopPropagation();
    if (isAdding || isOutOfStock) return;
    // Products with variants → go to product page for size/color selection
    if (hasVariants) {
      navigate(`/products/${productSlug}`);
      return;
    }
    setIsAdding(true);
    try {
      addToCart({ id: product.id, productId: product.id, name: product.name, price: product.price, image: imgUrl, quantity: 1 });
      if (isAuthenticated) await cartAPI.add({ productId: product.id, quantity: 1 }).catch(() => {});
      addedToCart(product.name);
    } finally { setIsAdding(false); }
  };

  const handleWishlist = async (e) => {
    e.stopPropagation();
    try {
      if (inWishlist) {
        if (isAuthenticated) await wishlistAPI.remove(product.id).catch(() => {});
        removeFromWL(product.id);
      } else {
        if (isAuthenticated) await wishlistAPI.add({ productId: product.id }).catch(() => {});
        addToWL(product);
      }
    } catch { inWishlist ? removeFromWL(product.id) : addToWL(product); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-30px' }}
      transition={{ duration: 0.5, delay: (index % 4) * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className="group cursor-pointer"
      onClick={() => navigate(`/products/${productSlug}`)}
    >
      <div className="relative aspect-[3/4] bg-gray-50 overflow-hidden mb-3 md:mb-4">
        {imageSrc ? (
          <img loading="lazy" src={imageSrc} alt={product.name} className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${isOutOfStock ? 'opacity-60 grayscale' : ''}`} />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">👕</div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0 z-10">
          <button onClick={handleWishlist} className={`w-9 h-9 rounded-full flex items-center justify-center shadow-md transition-all duration-200 active:scale-90 ${inWishlist ? 'bg-rose-500 text-white' : 'bg-white/90 backdrop-blur-sm text-gray-600 hover:bg-white hover:text-gray-900'}`}>
            <Heart size={15} fill={inWishlist ? 'currentColor' : 'none'} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); navigate(`/products/${productSlug}`); }} className="w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 transition-all duration-200 active:scale-90">
            <Eye size={15} />
          </button>
        </div>
        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <span className="bg-white/90 backdrop-blur-sm text-gray-700 text-[10px] font-bold uppercase tracking-[0.15em] px-4 py-1.5 rounded-full shadow-lg">Sold Out</span>
          </div>
        )}
        {discount && !isOutOfStock && (
          <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-red-500 text-white text-[9px] font-bold rounded-md shadow-md">-{discount}%</div>
        )}
        {!isOutOfStock && (
          <button onClick={handleQuickAdd} className="absolute bottom-0 inset-x-0 z-20 h-10 bg-black/90 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
            {isAdding ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ShoppingCart size={13} /> Quick Add</>}
          </button>
        )}
      </div>
      <div className="px-0.5">
        <h3 className="text-sm md:text-base font-medium text-gray-900 leading-tight mb-1.5 line-clamp-1 group-hover:text-black transition-colors">{product.name}</h3>
        <div className="flex items-baseline gap-0">
          <span className="text-sm md:text-base font-semibold text-gray-900">{formatCurrency(product.price)}</span>
          {product.oldPrice && <span className="text-sm md:text-base text-gray-500 line-through ml-1.5 font-normal">{formatCurrency(product.oldPrice)}</span>}
        </div>
        <p className="text-[10px] md:text-[11px] text-gray-400 uppercase tracking-[0.03em] mt-0.5 font-medium">Unit price / per</p>
      </div>
    </motion.div>
  );
}

/* ── SECTION HEADER ── */
function SectionHeader({ title, subtitle, tagline }) {
  return (
    <div className="text-center mb-8 md:mb-12">
      {tagline && (
        <div className="flex items-center justify-center gap-2 mb-3">
          <span className="h-px w-6 bg-gradient-to-r from-transparent via-gray-300 to-transparent rounded-full" />
          <span className="text-gray-400 text-[9px] font-bold uppercase tracking-[0.2em]">{tagline}</span>
          <span className="h-px w-6 bg-gradient-to-l from-transparent via-gray-300 to-transparent rounded-full" />
        </div>
      )}
      <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-extrabold text-gray-900 tracking-tight">{title}</h2>
      {subtitle && <p className="text-gray-500 text-sm md:text-base mt-2 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>}
    </div>
  );
}

/* ── BRAND STORY SECTION ── */
function BrandStorySection() {
  return (
    <section className="py-16 md:py-24 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-center gap-3 mb-5"><span className="text-3xl">📖</span><span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">Our Story</span></div>
            <h3 className="text-xl md:text-2xl font-display font-bold text-gray-900 mb-4">Journey</h3>
            <div className="text-sm md:text-base text-gray-600 leading-relaxed space-y-4">
              <p>What started with just 2–3 orders a day slowly grew into something far bigger than we ever imagined. From packing orders late at night to building a brand people genuinely connect with, every step of this journey has been driven by passion, consistency, and the support of our community.</p>
              <p>There were moments of doubt, setbacks, and long nights, but every small win kept us going. This brand is more than clothing to us — it's a reflection of growth, self-expression, and the people who believed in us from the very beginning.</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}>
            <div className="flex items-center gap-3 mb-5"><span className="text-3xl">🎯</span><span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.25em]">Our Identity</span></div>
            <h3 className="text-xl md:text-2xl font-display font-bold text-gray-900 mb-4">Identity</h3>
            <div className="text-sm md:text-base text-gray-600 leading-relaxed space-y-4">
              <p>Identity is more than just the way you dress — it's the way you carry yourself, express your thoughts, and show the world who you truly are without saying a word.</p>
              <p>In a world where everyone is constantly trying to fit in, we believe real style comes from embracing what makes you different. Every piece we create is designed to help you feel confident, comfortable, and unapologetically yourself.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── TRUST BADGES ── */
function TrustBadges() {
  const items = [
    { icon: Truck, label: 'Free shipping', sub: 'On orders over ₹500' },
    { icon: RefreshCw, label: 'Easy returns', sub: '7-day return policy' },
    { icon: ShieldCheck, label: 'Secure payment', sub: '100% secure transactions' },
    { icon: Headphones, label: '24/7 support', sub: 'Dedicated customer service' },
  ];
  return (
    <section className="py-12 md:py-16 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {items.map((item, idx) => {
            const Icon = item.icon;
            return (
              <motion.div key={idx} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col items-center text-center gap-2.5">
                <div className="w-12 h-12 rounded-full bg-white border border-gray-200/80 flex items-center justify-center shadow-sm"><Icon size={20} className="text-gray-700" /></div>
                <div><h4 className="text-sm font-bold text-gray-900">{item.label}</h4><p className="text-xs text-gray-500 mt-0.5">{item.sub}</p></div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ── MARKETPLACE BADGE ── */
function MarketplaceBadge() {
  return (
    <section className="py-6 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs text-gray-400 uppercase tracking-[0.15em] font-semibold">Also Available on <span className="text-gray-600">Flipkart</span>, <span className="text-gray-600">Amazon</span> & <span className="text-gray-600">Myntra</span></p>
      </div>
    </section>
  );
}

/* ── PRODUCT GRID ── */
function ProductSection({ products, title, subtitle, tagline }) {
  if (!products || products.length === 0) return null;
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader title={title} subtitle={subtitle} tagline={tagline} />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {products.slice(0, 8).map((product, idx) => (
            <SelektProductCard key={product.id} product={product} index={idx} />
          ))}
        </div>
        <div className="flex justify-center mt-8 md:mt-10">
          <Link to="/products" className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-black uppercase tracking-[0.12em] transition-colors group">
            <span className="border-b border-gray-300 group-hover:border-black pb-0.5 transition-colors">Browse All Products</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── PRODUCT GRID SKELETON ── */
function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] bg-gray-100 rounded-none mb-3" />
          <div className="space-y-2 px-0.5"><div className="h-3.5 bg-gray-100 rounded w-3/4" /><div className="h-4 bg-gray-100 rounded w-1/2" /><div className="h-3 bg-gray-50 rounded w-1/3" /></div>
        </div>
      ))}
    </div>
  );
}

/* ── SHOP BY CATEGORY ── */
function ShopByCategory({ categories }) {
  const navigate = useNavigate();
  const cats = Array.isArray(categories) ? categories : [];
  if (cats.length === 0) return null;
  return (
    <section className="py-12 md:py-16 bg-gray-50 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeader title="Shop By Category" tagline="Collections" />
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {cats.slice(0, 2).map((cat, idx) => {
            const imgUrl = cat.image ? getImageUrl(cat.image) : null;
            return (
              <motion.button key={cat.slug || idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }} onClick={() => navigate(`/products?category=${cat.slug}`)} className="group text-left">
                <div className="relative aspect-[16/9] md:aspect-[2/1] bg-gray-100 overflow-hidden mb-4 md:mb-5 rounded-lg">
                  {imgUrl ? <img loading="lazy" src={imgUrl} alt={cat.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">◆</div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4"><h3 className="text-white font-display text-lg md:text-2xl font-bold">{cat.name}</h3></div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{cat.description || `Premium ${cat.name.toLowerCase()} tees blending clean aesthetics, effortless comfort, and elevated everyday streetwear style.`}</p>
              </motion.button>
            );
          })}
        </div>
        <div className="flex justify-center mt-8">
          <Link to="/products" className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 hover:text-black uppercase tracking-[0.12em] transition-colors group">
            <span className="border-b border-gray-300 group-hover:border-black pb-0.5 transition-colors">Browse All Categories</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── OVERVIEW SECTION ── */
function OverviewSection() {
  return (
    <section className="py-16 md:py-20 bg-white border-t border-gray-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 block">Overview</span>
          <h2 className="text-2xl md:text-3xl font-display font-extrabold text-gray-900 mb-6">Explore our collection of premium streetwear essentials</h2>
          <p className="text-sm md:text-base text-gray-600 leading-relaxed max-w-2xl mx-auto">Crafted for comfort, style, and everyday expression. Each piece is designed with attention to detail, using premium materials that stand the test of time.</p>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════ */
export default function WatchAndBuyPage() {
  const { data: homepageData, isLoading } = useQuery({
    queryKey: ['watch-and-buy', 'homepage'],
    queryFn: async () => {
      const res = await homepageAPI.getAll();
      return res?.data?.data || {};
    },
    staleTime: 60000,
  });

  const newArrivals = homepageData?.newArrivals || [];
  const bestSellers = homepageData?.bestSellers || [];
  const categories = homepageData?.categories || [];
  const featuredProducts = homepageData?.featured || [];
  /** @type {Array} reels — fetched from homepage API, each has videoUrl, imageUrl, title, products[] */
  const reels = homepageData?.reels || [];

  const fallbackProducts = featuredProducts.length > 0 ? featuredProducts : (homepageData?.products || []);
  const mainProducts = newArrivals.length > 0 ? newArrivals : bestSellers.length > 0 ? bestSellers : fallbackProducts;
  const secondaryProducts = bestSellers.length > 0 ? bestSellers : mainProducts !== newArrivals && newArrivals.length > 0 ? newArrivals : featuredProducts;

  return (
    <div className="min-h-screen bg-white">
      <SEOHead title="Watch & Buy — Shoppable Video Shopping | THREVOLT" description="Watch and shop the latest streetwear drops. Browse our collection of premium t-shirts, oversized tees, and streetwear essentials. Watch product videos and buy directly." />

      {/* ── HERO ── */}
      <SelektHero />

      {/* ── SHOPPABLE VIDEO SECTION (Reels from backend — YouTube + MP4 both work) ── */}
      <ShoppableVideoSection reels={reels} />

      {/* ── PRODUCT GRID ── */}
      {isLoading ? (
        <section className="py-12 md:py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <SectionHeader title="New Arrivals" tagline="Fresh Drops" />
            <ProductGridSkeleton />
          </div>
        </section>
      ) : mainProducts.length > 0 ? (
        <ProductSection products={mainProducts} title="New Arrivals" subtitle="The latest drops — fresh styles, premium quality." tagline="Fresh Drops" />
      ) : null}

      {/* ── SHOP BY CATEGORY ── */}
      <ShopByCategory categories={categories} />

      {/* ── BEST SELLING ── */}
      {secondaryProducts.length > 0 && (
        <ProductSection products={secondaryProducts} title="Best Selling" subtitle="Our most popular styles — loved by everyone." tagline="Trending Now" />
      )}

      {/* ── BRAND STORY + TRUST ── */}
      <OverviewSection />
      <BrandStorySection />
      <TrustBadges />
      <MarketplaceBadge />
    </div>
  );
}

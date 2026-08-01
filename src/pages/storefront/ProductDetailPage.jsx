import { Minus, Plus, Star, ChevronDown, Share2, X, ChevronLeft, ChevronRight, Zap, Heart, ShieldCheck, Truck, ZoomIn, RotateCcw, Play, Volume2, ExternalLink } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';

import { trackProductView, trackAddToCart } from '../../services/tracker';
import useInterval from '../../hooks/useInterval';
import { motion, AnimatePresence } from 'framer-motion';
import Breadcrumb from '../../components/common/Breadcrumb';
import SEOHead from '../../components/seo/SEOHead';
import { productsAPI } from '../../api/products';
import { recentlyViewedAPI } from '../../api/recentlyViewed';
import { seoAPI } from '../../api/seo';
import { reviewsAPI } from '../../api/reviews';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import useAuthStore from '../../store/authStore';
import { cartAPI } from '../../api/cart';
import { wishlistAPI } from '../../api/wishlist';
import SizeGuideModal from '../../components/product/SizeGuideModal';
import ReviewFormModal from '../../components/product/ReviewFormModal';
import { formatCurrency, formatDate, getImageUrl, getProductImages, getVideoUrl } from '../../utils/formatters';
import ReviewImageLightbox from '../../components/product/ReviewImageLightbox';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../store/useSettings';
import useFlyToCart from '../../hooks/useFlyToCart';
import { getColorHex, parseBundleTiers, isBundleOfferEnabled } from '../../utils/constants';
import { promotionsAPI } from '../../api/promotions';
import { ordersAPI } from '../../api/orders';
import FlashSaleCountdown from '../../components/storefront/FlashSaleCountdown';
import OffersSection from '../../components/storefront/OffersSection';
import BundleOffer from '../../components/storefront/BundleOffer';
import ProductCard from '../../components/product/ProductCard';
// RecentlyViewedCarousel no longer used — using grid layout matching Related Products
//
import { addedToCart, removedFromWishlist, addedToWishlist, wishlistError, linkCopied } from '../../utils/toast';

/* ═══════════════════════════════════════════════════
   Brand Design Tokens (matches tailwind.config.js)
   ═══════════════════════════════════════════════════ */
const INK = "#1a1a1a";        /* brand primary black */
const PAPER = "#ffffff";      /* white */
const GOLD = "#1a1a1a";       /* brand primary instead of gold */
const THREAD = "#4a4a5a";     /* text secondary */
const STONE = "#8a8a9a";      /* text muted */
const PANEL = "#f5f5f5";      /* off-white surface container */

const displayFont = { fontFamily: "Jost, sans-serif", fontWeight: 800 };

const stitchBorder = `repeating-linear-gradient(90deg, ${STONE} 0px, ${STONE} 6px, transparent 6px, transparent 12px)`;

// ── Fabric weight meter helpers (dynamic from product attributes) ──
const FABRIC_METER_MIN = 180;
const FABRIC_METER_MAX = 320;
const getFabricTier = (gsm) => gsm >= 280 ? 'Fleece-grade' : gsm >= 200 ? 'Heavyweight' : 'Standard tee';
const getFabricMeterPct = (gsm) => Math.max(0, Math.min(100, ((gsm - FABRIC_METER_MIN) / (FABRIC_METER_MAX - FABRIC_METER_MIN)) * 100));

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [recentlyViewedLoaded, setRecentlyViewedLoaded] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [matchedVariant, setMatchedVariant] = useState(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const mobileGalleryRef = useRef(null);
  const verticalThumbRef = useRef(null);
  const offersRef = useRef(null);
  const sentinelRef = useRef(null);
  const stickyColorThumbsRef = useRef(null);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const hasAutoSelected = useRef(false);

  // Accordion state
  const [openAccordion, setOpenAccordion] = useState('details');

  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const freeShippingThreshold = getSetting('freeShippingThreshold', 499);
  const { t } = useTranslation();
  const { addItem } = useCartStore();
  const { isInWishlist, addItem: addToWL, removeItem: removeFromWL } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const { flyRef, flyToCart } = useFlyToCart();

  // ── Social Proof State ──
  const [viewerCount, setViewerCount] = useState(() => Math.floor(Math.random() * 30) + 18);
  const [galleryLightboxOpen, setGalleryLightboxOpen] = useState(false);
  const [galleryLightboxIdx, setGalleryLightboxIdx] = useState(0);
  const [recentPurchase, setRecentPurchase] = useState(null);

  // Gentle fluctuation of live viewer count and FOMO purchase notifications
  useInterval(() => {
    setViewerCount(prev => {
      const delta = Math.random() > 0.5 ? 1 : -1;
      return Math.max(5, Math.min(60, prev + delta));
    });
    if (Math.random() > 0.85) {
      const realOrders = realOrdersRef.current;
      let name, city;
      if (realOrders.length > 0) {
        const idx = Math.floor(Math.random() * realOrders.length);
        const order = realOrders[idx];
        name = order.name;
        city = order.city;
      } else {
        const fallbackNames = ['Alex M.', 'Jordan K.', 'Sam T.', 'Casey R.', 'Riley P.', 'Morgan S.', 'Taylor W.', 'Drew L.', 'Avery C.', 'Quinn B.'];
        const fallbackCities = ['New York', 'Los Angeles', 'Chicago', 'Miami', 'Austin', 'Seattle', 'Denver', 'Portland', 'Boston', 'Atlanta'];
        name = fallbackNames[Math.floor(Math.random() * fallbackNames.length)];
        city = fallbackCities[Math.floor(Math.random() * fallbackCities.length)];
      }
      setRecentPurchase({ name, city, id: Date.now() });
      setTimeout(() => setRecentPurchase(null), 4000);
    }
  }, 4000);

  const realOrdersRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    ordersAPI.getRecentOrders()
      .then(res => {
        if (cancelled) return;
        const orders = res.data?.data || [];
        if (Array.isArray(orders) && orders.length > 0) {
          realOrdersRef.current = orders.filter(o => o.name && o.city);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // ── React Query: Product data ──
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const res = await productsAPI.getById(slug);
      const prod = res.data?.data || null;
      if (!prod) throw new Error('Product not found');
      return prod;
    },
    staleTime: 0,
  });

  const queryClient = useQueryClient();

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // ── React Query: Reviews ──
  const { data: reviews = [] } = useQuery({
    queryKey: ['product-reviews', product?.id],
    queryFn: () => reviewsAPI.getByProduct(product.id).then(r => {
      const raw = r.data?.data?.reviews || r.data?.data || [];
      return Array.isArray(raw) ? raw.map(mapProductReview) : [];
    }),
    enabled: !!product?.id,
    staleTime: 120000,
  });

  const handleReviewSubmitted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['product-reviews', product?.id] });
  }, [queryClient, product?.id]);

  // ── React Query: SEO meta ──
  const { data: seoMeta = null } = useQuery({
    queryKey: ['product-seo', product?.id],
    queryFn: () => seoAPI.getEntitySEO('product', product.id).then(r => r.data?.data || null).catch(() => null),
    enabled: !!product?.id,
    staleTime: 300000,
  });

  // ── Flash Sale Check ──
  const { data: flashPromotions = [] } = useQuery({
    queryKey: ['product-flash-sales', product?.id],
    queryFn: async () => {
      const res = await promotionsAPI.getFlashSales();
      const data = res?.data?.data || [];
      return Array.isArray(data) ? data : [];
    },
    enabled: !!product?.id,
    staleTime: 15000,
  });

  // ── Store Offers ──
  const { data: storeOffers = [] } = useQuery({
    queryKey: ['store-offers'],
    queryFn: async () => {
      const res = await promotionsAPI.getStoreOffers();
      const data = res?.data?.data || [];
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60000,
  });

  const activeFlashSale = (() => {
    if (!flashPromotions.length || !product) return null;
    const now = new Date();
    return flashPromotions.find(p => {
      const start = p.startDate ? new Date(p.startDate) : null;
      const end = p.endDate ? new Date(p.endDate) : null;
      if (start && now < start) return false;
      if (end && now > end) return false;
      if (p.status !== 'ACTIVE' && !p.isActive) return false;
      const productIds = p.productIds || p.products?.map(pr => pr.id) || [];
      if (productIds.length > 0) return productIds.includes(product.id);
      const categoryIds = p.categoryIds || p.categories?.map(c => c.id) || [];
      if (categoryIds.length > 0) {
        const catId = typeof product.category === 'object' ? product.category?.id : product.categoryId;
        return categoryIds.includes(catId);
      }
      return true;
    });
  })();

  // ── Related Products ──
  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['product-related', product?.id],
    queryFn: () => productsAPI.getRelated(product.id).then(r => {
      const data = r.data?.data || [];
      return Array.isArray(data) ? data.filter(p => p.id !== product.id).slice(0, 8) : [];
    }),
    enabled: !!product?.id,
    staleTime: 60000,
  });

  // ── Auto-select first in-stock size & color ──
  useEffect(() => {
    if (!product || hasAutoSelected.current) return;
    const variants = product?.variants || product?.productvariant || [];
    if (!variants.length) return;
    const inStockVariant = variants.find(v => (v.quantity || 0) > 0);
    if (!inStockVariant) return;
    const attrs = inStockVariant.attributes || {};
    let nextSize = '';
    let nextColor = '';
    if (product.sizes?.length && attrs.size) {
      nextSize = attrs.size;
    } else if (product.sizes?.length) {
      const firstAvailableSize = product.sizes.find(s =>
        variants.some(v => { const a = v.attributes || {}; return a.size === s && (v.quantity || 0) > 0; })
      );
      if (firstAvailableSize) nextSize = firstAvailableSize;
    }
    if (product.colors?.length && attrs.color) {
      nextColor = attrs.color;
    } else if (product.colors?.length) {
      const firstAvailableColor = product.colors.find(c =>
        variants.some(v => { const a = v.attributes || {}; return a.color === c && (v.quantity || 0) > 0; })
      );
      if (firstAvailableColor) nextColor = firstAvailableColor;
    }
    if (nextSize) setSelectedSize(nextSize);
    if (nextColor) setSelectedColor(nextColor);
    hasAutoSelected.current = true;
  }, [product]);

  // ── Tracking & Recently Viewed ──
  useEffect(() => {
    if (!product) return;
    const catName = typeof product.category === 'object' ? product.category.name : product.category;
    trackProductView(product.id, product.name, catName);
    let viewed = JSON.parse(localStorage.getItem('luxe_recently_viewed') || '[]');
    viewed = viewed.filter(v => v.id !== product.id);
    viewed.unshift(product);
    viewed = viewed.slice(0, 5);
    localStorage.setItem('luxe_recently_viewed', JSON.stringify(viewed));
    setRecentlyViewed(viewed.filter(v => v.id !== product.id));
    // Brief skeleton delay for polish
    const timer = setTimeout(() => setRecentlyViewedLoaded(true), 400);
    if (isAuthenticated && product.id) {
      recentlyViewedAPI.trackView(product.id).catch(() => {});
    }
    return () => clearTimeout(timer);
  }, [product]);

  // ── Wishlist server sync ──
  useEffect(() => {
    if (!product?.id || !isAuthenticated) return;
    let cancelled = false;
    wishlistAPI.check(product.id).then((res) => {
      if (cancelled) return;
      const wishlisted = res?.data?.data?.wishlisted;
      if (wishlisted === true) addToWL(product);
      else if (wishlisted === false && isInWishlist(product.id)) removeFromWL(product.id);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [product?.id, isAuthenticated]);

  useEffect(() => { setSelectedImageIdx(0); }, [selectedColor, selectedSize]);

  useEffect(() => {
    const container = verticalThumbRef.current;
    if (!container) return;
    const thumb = container.children[selectedImageIdx];
    if (!thumb) return;
    thumb.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedImageIdx]);

  // ── Variant availability maps ──
  const variantsList = product?.variants || product?.productvariant || [];
  // Per-color thumbnail from the variant's first image (set in admin),
  // falling back to a solid color swatch when no variant image exists.
  const getColorThumb = (color) => {
    const v = variantsList.find(x => (x.attributes || {}).color === color && Array.isArray(x.images) && x.images.length > 0);
    if (v?.images?.[0]) return getImageUrl(v.images[0]);
    // Fall back to the product's own photo so a real thumbnail always shows in selectors
    const base = getProductImages(product)[0] || product.imageUrl || product.image;
    return base ? getImageUrl(base) : null;
  };
  const variantStockMap = new Map();
  variantsList.forEach(v => {
    const attrs = v.attributes || {};
    const key = `${attrs.size || ''}::${attrs.color || ''}`;
    variantStockMap.set(key, v.quantity || 0);
  });

  const isSizeAvailable = (size) => {
    if (!variantsList.length) return true;
    if (selectedColor) {
      const key = `${size}::${selectedColor}`;
      return (variantStockMap.get(key) || 0) > 0;
    }
    return variantsList.some(v => { const a = v.attributes || {}; return a.size === size && (v.quantity || 0) > 0; });
  };

  const isColorAvailable = (color) => {
    if (!variantsList.length) return true;
    if (selectedSize) {
      const key = `${selectedSize}::${color}`;
      return (variantStockMap.get(key) || 0) > 0;
    }
    return variantsList.some(v => { const a = v.attributes || {}; return a.color === color && (v.quantity || 0) > 0; });
  };

  const LOW_STOCK_THRESHOLD = 5;

  const getSizeStock = (size) => {
    if (!variantsList.length) return product?.quantity || 0;
    if (selectedColor) {
      const key = `${size}::${selectedColor}`;
      return variantStockMap.get(key) || 0;
    }
    const stocks = variantsList.filter(v => (v.attributes || {}).size === size).map(v => v.quantity || 0);
    return stocks.length ? Math.max(...stocks) : 0;
  };

  const getColorStock = (color) => {
    if (!variantsList.length) return product?.quantity || 0;
    if (selectedSize) {
      const key = `${selectedSize}::${color}`;
      return variantStockMap.get(key) || 0;
    }
    const stocks = variantsList.filter(v => (v.attributes || {}).color === color).map(v => v.quantity || 0);
    return stocks.length ? Math.max(...stocks) : 0;
  };

  const isSizeLowStock = (size) => { const stock = getSizeStock(size); return stock > 0 && stock <= LOW_STOCK_THRESHOLD; };
  const isColorLowStock = (color) => { const stock = getColorStock(color); return stock > 0 && stock <= LOW_STOCK_THRESHOLD; };

  const isSizeRequired = product?.sizes?.length > 0;
  const isColorRequired = product?.colors?.length > 0;
  const needsSize = isSizeRequired;
  const needsColor = isColorRequired;
  const hasAllSelections = (!needsSize || selectedSize) && (!needsColor || selectedColor);
  const hasVariants = needsSize || needsColor;
  const variantNotFound = hasAllSelections && hasVariants
    && (!variantsList.length || !variantsList.some(v => {
        const attrs = v.attributes || {};
        return (!needsSize || attrs.size === selectedSize) && (!needsColor || attrs.color === selectedColor);
      }));

  useEffect(() => {
    if (!product?.id || !hasAllSelections || !hasVariants) {
      setMatchedVariant(null);
      return;
    }
    const variant = variantsList.find(v => {
      const attrs = v.attributes || {};
      const sizeMatch = !needsSize || attrs.size === selectedSize;
      const colorMatch = !needsColor || attrs.color === selectedColor;
      return sizeMatch && colorMatch;
    }) || null;
    setMatchedVariant(variant);
  }, [selectedSize, selectedColor, product?.id, needsSize, needsColor, hasAllSelections, hasVariants, variantsList]);

  // ── Sticky bottom bar ──
  useEffect(() => {
    const el = sentinelRef.current;
    const timers = [];
    setShowStickyBar(false);
    let wasEverVisible = false;
    const checkPosition = () => {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        wasEverVisible = true;
        setShowStickyBar(false);
      } else if (rect.bottom <= 0 && wasEverVisible) {
        setShowStickyBar(true);
      }
    };
    timers.push(setTimeout(() => checkPosition(), 0));
    timers.push(setTimeout(() => checkPosition(), 500));
    timers.push(setTimeout(() => checkPosition(), 1500));
    window.addEventListener('scroll', checkPosition, { passive: true });
    window.addEventListener('resize', checkPosition, { passive: true });
    return () => {
      timers.forEach(t => clearTimeout(t));
      window.removeEventListener('scroll', checkPosition);
      window.removeEventListener('resize', checkPosition);
      setShowStickyBar(false);
    };
  }, [product]);

  // ── Auto-scroll the selected color into view inside the sticky bar thumb strip ──
  // Uses an index lookup (buttons are direct children of the strip) to avoid
  // selector-escaping issues when color names contain quotes or special chars.
  useEffect(() => {
    const container = stickyColorThumbsRef.current;
    if (!container || !selectedColor) return;
    const idx = (product?.colors || []).indexOf(selectedColor);
    const active = idx >= 0 ? container.children[idx] : null;
    if (!active) return;
    active.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [selectedColor, product?.colors, showStickyBar]);

  const scrollToOffers = useCallback(() => {
    if (window.innerWidth >= 1024) return;
    requestAnimationFrame(() => {
      offersRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  const formatRating = useCallback((rating, fallback = '4.8') => {
    if (rating == null) return fallback;
    const num = Number(rating);
    return !isNaN(num) ? num.toFixed(1) : fallback;
  }, []);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = product?.name || 'Check this out';
    if (navigator.share) {
      try { await navigator.share({ title, url, text: `Check out ${title} at ${storeName}` }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); linkCopied(); } catch {}
    }
  }, [product]);

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: PAPER, color: INK, fontFamily: "Jost, sans-serif" }}>
        <div style={{ height: 8 }} />
        {/* Mobile skeleton */}
        <div className="lg:hidden" style={{ padding: "16px 12px" }}>
          <div style={{ background: PANEL, height: 320, borderRadius: 16, marginBottom: 20 }} />
          <div style={{ background: PANEL, height: 14, width: 100, borderRadius: 4, marginBottom: 12 }} />
          <div style={{ background: PANEL, height: 32, width: "85%", borderRadius: 4, marginBottom: 8 }} />
          <div style={{ background: PANEL, height: 32, width: "55%", borderRadius: 4, marginBottom: 16 }} />
          <div style={{ background: PANEL, height: 16, width: 160, borderRadius: 4, marginBottom: 20 }} />
          <div style={{ background: PANEL, height: 36, width: 140, borderRadius: 4, marginBottom: 24 }} />
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ width: 40, height: 40, borderRadius: "50%", background: PANEL }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ width: 48, height: 48, borderRadius: 12, background: PANEL }} />
            ))}
          </div>
          <div style={{ background: PANEL, height: 48, borderRadius: 12, marginBottom: 12 }} />
          <div style={{ background: PANEL, height: 48, borderRadius: 12, marginBottom: 24 }} />
          <div style={{ background: PANEL, height: 160, borderRadius: 12 }} />
        </div>
        {/* Desktop skeleton */}
        <div className="hidden lg:block" style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 56 }}>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, width: 80 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ aspectRatio: "1/1", background: PANEL, borderRadius: 2 }} />
              ))}
            </div>
            <div style={{ flex: 1, background: PANEL, height: 600 }} />
          </div>
          <div>
            <div style={{ background: PANEL, height: 14, width: 120, marginBottom: 12 }} />
            <div style={{ background: PANEL, height: 42, width: "90%", marginBottom: 8 }} />
            <div style={{ background: PANEL, height: 42, width: "60%", marginBottom: 20 }} />
            <div style={{ background: PANEL, height: 16, width: 200, marginBottom: 24 }} />
            <div style={{ background: PANEL, height: 36, width: 160, marginBottom: 24 }} />
            <div style={{ background: PANEL, height: 60, width: "100%", marginBottom: 16 }} />
            <div style={{ background: PANEL, height: 48, width: "100%", marginBottom: 16 }} />
            <div style={{ background: PANEL, height: 60, width: "100%", marginBottom: 16 }} />
            <div style={{ background: PANEL, height: 200, width: "100%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={{ minHeight: "100vh", background: PAPER, color: INK, fontFamily: "Jost, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ width: 72, height: 72, margin: "0 auto 24px", borderRadius: "50%", background: PANEL, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={28} color={STONE} strokeWidth={1.5} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 8, ...displayFont }}>Not Found</h2>
          <p style={{ fontSize: 14, color: STONE, lineHeight: 1.6, marginBottom: 24 }}>This product doesn't exist or has been removed.</p>
          <button onClick={() => navigate('/products')} style={{ background: INK, color: PAPER, textTransform: "uppercase", letterSpacing: "0.15em", fontSize: 13, fontWeight: 600, padding: "14px 32px", border: "none", cursor: "pointer" }}>
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  const inWishlist = isInWishlist(product.id);
  const discount = product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : null;

  // Cart thumbnail: show the matched variant's first image so the bag reflects the selected color
  const cartImageUrl = matchedVariant?.images?.[0] || getProductImages(product)[0] || product.imageUrl || product.image || undefined;

  const handleAddToCart = async () => {
    if (isAddingToCart) return;
    if (!canAddToCart) return;
    setIsAddingToCart(true);
    flyToCart();
    trackAddToCart(product.id, product.name, qty, product.price);
    try {
      addItem({ ...product, productId: product.id, quantity: qty, size: selectedSize, color: selectedColor, variantId: matchedVariant?.id || undefined, imageUrl: cartImageUrl });
      if (!isAuthenticated) {
        addedToCart(product.name);
        navigate('/cart');
        return;
      }
      await cartAPI.add({ productId: product.id, quantity: qty, size: selectedSize || undefined, color: selectedColor || undefined, variantId: matchedVariant?.id || undefined });
      addedToCart(product.name);
      navigate('/cart');
    } catch {
      addedToCart(product.name);
      navigate('/cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const isSimpleProduct = !product.sizes?.length && !product.colors?.length;
  const availableStock = !isSimpleProduct ? (matchedVariant?.quantity ?? 0) : (product.quantity ?? 0);
  const isOutOfStock = !isSimpleProduct && matchedVariant && (matchedVariant.quantity || 0) <= 0;
  const isSimpleOutOfStock = isSimpleProduct && (product.quantity || 0) <= 0;
  const showOutOfStockBadge = isSimpleProduct ? (product.quantity || 0) <= 0 : !variantsList.length || variantsList.every(v => (v.quantity || 0) <= 0);
  const isStockUnavailable = isOutOfStock || isSimpleOutOfStock || showOutOfStockBadge;
  const isLowStock = !isStockUnavailable && availableStock > 0 && availableStock <= 5;
  const maxQty = Math.max(availableStock, 1);
  const variantUnavailable = variantNotFound && hasAllSelections && !isSimpleProduct;
  const canAddToCart = hasAllSelections && !isStockUnavailable && !variantUnavailable && availableStock > 0;

  const handleWishlist = async () => {
    if (inWishlist) removeFromWL(product.id);
    else addToWL(product);
    if (!isAuthenticated) {
      if (inWishlist) removedFromWishlist();
      else addedToWishlist();
      return;
    }
    try {
      if (inWishlist) { await wishlistAPI.remove(product.id); removedFromWishlist(); }
      else { await wishlistAPI.add({ productId: product.id }); addedToWishlist(); }
    } catch {
      if (inWishlist) addToWL(product);
      else removeFromWL(product.id);
      wishlistError();
    }
  };

  const toggleAccordion = (section) => {
    setOpenAccordion(openAccordion === section ? '' : section);
  };

  const dedupeArray = (arr) => [...new Set(arr)];

  const galleryImages = (() => {
    if (matchedVariant && Array.isArray(matchedVariant.images) && matchedVariant.images.length > 0) {
      return dedupeArray(matchedVariant.images.map(img => getImageUrl(img)));
    }
    if (selectedColor && variantsList.length > 0) {
      const colorVariants = variantsList.filter(v => (v.attributes || {}).color === selectedColor);
      const variantImages = colorVariants.flatMap(v => (Array.isArray(v.images) ? v.images : [])).filter(Boolean);
      if (variantImages.length > 0) return dedupeArray(variantImages.map(img => getImageUrl(img)));
    }
    const images = getProductImages(product);
    const urls = images.length > 0 ? images.map(img => getImageUrl(img)) : [getImageUrl(product.imageUrl || product.image || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80')];
    return dedupeArray(urls);
  })();

  // Pricing: determine the effective price and oldPrice
  const effectivePrice = matchedVariant && matchedVariant.price != null ? matchedVariant.price : product.price;
  const effectiveOldPrice = product.oldPrice || null;

  return (
    <div style={{ minHeight: "100vh", background: PAPER, color: INK, fontFamily: "Jost, sans-serif", paddingBottom: showStickyBar ? 76 : 0 }}>
      <style>{`
        @media (min-width: 1024px) {
          .lg-grid { grid-template-columns: 1.1fr 1fr !important; }
          .gallery-row { flex-direction: row !important; }
          .gallery-thumbs { flex-direction: column !important; width: 80px !important; }
          .gallery-sticky { position: sticky; top: 80px; align-self: start; }
        }
        @media (max-width: 1023px) {
          .gallery-row { flex-direction: column !important; }
          .gallery-thumbs { flex-direction: row !important; width: 100% !important; order: 2; margin-top: 12px; overflow-x: auto; scrollbar-width: none; }
          .gallery-thumbs button { width: 80px !important; min-width: 80px !important; flex-shrink: 0; }
          .gallery-hero { order: 1; }
        }
        @media (max-width: 767px) {
          .hero-img { height: 350px !important; }
          .product-detail-main { padding: 20px 16px !important; gap: 32px !important; }
          .product-detail-section { padding: 0 16px 40px !important; }
          .product-detail-title { font-size: 28px !important; }
          .product-detail-reviews { padding: 24px !important; }
          .sticky-bar-mobile { display: flex !important; }
        }
        @media (max-width: 480px) {
          .hero-img { height: 280px !important; }
          .product-detail-main { padding: 16px 12px !important; gap: 24px !important; }
          .product-detail-section { padding: 0 12px 32px !important; }
          .product-detail-title { font-size: 24px !important; }
          .product-detail-reviews { padding: 20px 16px !important; }
        }
        @media (min-width: 768px) {
          .sticky-bar-mobile {
            padding: 10px 24px 10px 16px !important;
            padding-bottom: max(10px, env(safe-area-inset-bottom, 0px)) !important;
            max-width: 1280px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            border-radius: 12px 12px 0 0 !important;
            box-shadow: 0 -2px 24px rgba(0,0,0,0.1), 0 -1px 0 rgba(255,255,255,0.6) inset !important;
          }
          .sticky-bar-mobile::before {
            max-width: 1280px !important;
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%) !important;
            width: calc(100% - 24px) !important;
          }
          .sticky-bar-mobile .sticky-select {
            height: 32px !important;
            font-size: 11px !important;
            min-width: 64px !important;
            padding: 0 22px 0 10px !important;
          }
          .sticky-bar-mobile .sticky-select-wrap::after {
            width: 6px !important;
            height: 6px !important;
            right: 8px !important;
          }
          .sticky-bar-mobile .sticky-cta {
            padding: 9px 20px !important;
            font-size: 11px !important;
            border-radius: 8px !important;
            min-width: 100px !important;
          }
        }
        /* ── Premium Sticky Bar — Single Row ── */
        .sticky-bar-mobile {
          backdrop-filter: blur(24px) saturate(2) !important;
          -webkit-backdrop-filter: blur(24px) saturate(2) !important;
          background: rgba(255, 255, 255, 0.92) !important;
          border-top: none !important;
          box-shadow: 0 -2px 20px rgba(0,0,0,0.07), 0 -1px 0 rgba(255,255,255,0.6) inset !important;
        }
        .sticky-bar-mobile::before {
          content: '' !important;
          position: absolute !important;
          top: 0 !important;
          left: 12px !important;
          right: 12px !important;
          height: 1px !important;
          background: linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent) !important;
        }
        .sticky-color-thumbs {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        .sticky-color-thumbs::-webkit-scrollbar {
          display: none !important;
        }
        .sticky-cta {
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease !important;
        }
        .sticky-cta::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 60%);
          transition: opacity 0.3s;
          pointer-events: none;
        }
        .sticky-cta:hover:not(:disabled)::after {
          opacity: 0;
        }
        .sticky-cta:hover:not(:disabled) {
          background: #333333 !important;
        }
        .sticky-cta:active:not(:disabled) {
          transform: scale(0.97) !important;
        }
        /* ── Premium Styled Selects ── */
        .sticky-select-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .sticky-select-wrap::after {
          content: '';
          position: absolute;
          right: 6px;
          top: 50%;
          transform: translateY(-65%);
          width: 5px;
          height: 5px;
          border-right: 1.2px solid #4a4a5a;
          border-bottom: 1.2px solid #4a4a5a;
          rotate: 45deg;
          pointer-events: none;
          transition: transform 0.2s ease;
        }
        .sticky-select {
          height: 26px;
          font-size: 9px;
          font-weight: 600;
          font-family: 'Jost', sans-serif;
          letter-spacing: 0.02em;
          border-radius: 6px;
          border: 1px solid rgba(0,0,0,0.1);
          background: rgba(250,250,250,0.95);
          color: #1a1a1a;
          padding: 0 16px 0 7px;
          cursor: pointer;
          outline: none;
          min-width: 48px;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          transition: all 0.2s ease;
        }
        .sticky-select:hover {
          border-color: #1a1a1a;
          background: #f5f5f5;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        .sticky-select:focus {
          border-color: #1a1a1a;
          box-shadow: 0 0 0 2px rgba(26,26,26,0.08);
        }
        .sticky-select option {
          font-size: 12px;
          padding: 8px 12px;
          background: white;
          color: #1a1a1a;
        }
        .sticky-select option:disabled {
          color: #bbbbc8;
        }
        /* ── Gallery Swipe Indicator ── */
        .gallery-swipe-hint {
          position: absolute;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
          z-index: 5;
          pointer-events: none;
        }
        .gallery-swipe-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255,255,255,0.35);
          transition: all 0.3s ease;
        }
        .gallery-swipe-dot.active {
          width: 20px;
          border-radius: 3px;
          background: #ffffff;
        }
        /* ── Tap Highlight Fix ── */
        * { -webkit-tap-highlight-color: transparent; }
        .tap-feedback:active { transform: scale(0.96) !important; }
        .thumb:hover { opacity: 1 !important; }
        .hero-img { transition: transform 0.6s ease; }
        .hero-frame:hover .hero-img { transform: scale(1.04); }
        .cta-main:hover { background: #333333 !important; }
        .cta-outline:hover { background: ${INK} !important; color: ${PAPER} !important; }
        .premium-feature-card { transition: all 0.25s ease; cursor: default; }
        .premium-feature-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); border-color: ${INK} !important; background: #fafafa !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        /* ── Floating Product Video ── */
        .fpv-bubble {
          position: fixed;
          left: 20px;
          bottom: 24px;
          z-index: 70;
          width: 68px;
          aspect-ratio: 9 / 16;
          border-radius: 18px;
          padding: 0;
          border: none;
          background: #141416;
          cursor: grab;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          box-shadow: 0 10px 30px rgba(0,0,0,0.35), 0 0 0 2px rgba(255,255,255,0.92), 0 0 0 3.5px rgba(0,0,0,0.16);
          transition: box-shadow 0.25s ease, transform 0.25s ease, opacity 0.25s ease;
          animation: fpv-bubble-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.6s backwards;
        }
        .fpv-bubble:hover {
          box-shadow: 0 14px 38px rgba(0,0,0,0.4), 0 0 0 2px rgba(255,255,255,0.92), 0 0 0 3.5px rgba(0,0,0,0.16);
          transform: scale(1.05);
        }
        .fpv-bubble:active {
          transform: scale(0.97);
          cursor: grabbing;
        }
        .fpv-bubble-dragging {
          cursor: grabbing;
          transform: scale(1.06);
          box-shadow: 0 18px 44px rgba(0,0,0,0.45), 0 0 0 2px rgba(255,255,255,0.92), 0 0 0 3.5px rgba(0,0,0,0.16);
          transition: box-shadow 0.15s ease;
        }
        .fpv-bubble-hidden {
          opacity: 0;
          pointer-events: none;
        }
        @keyframes fpv-bubble-in {
          0% { opacity: 0; transform: translateY(20px) scale(0.5); }
          60% { opacity: 1; transform: translateY(-3px) scale(1.06); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .fpv-ring {
          position: absolute;
          inset: -6px;
          border-radius: 22px;
          border: 2px solid rgba(255,255,255,0.5);
          animation: fpv-ring 2.4s ease-out infinite;
          pointer-events: none;
        }
        .fpv-ring-delay { animation-delay: 1.2s; }
        @keyframes fpv-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        .fpv-bubble-media {
          position: absolute;
          inset: 0;
          border-radius: 18px;
          overflow: hidden;
          background: #000;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .fpv-bubble-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
          pointer-events: none;
        }
        .fpv-bubble-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .fpv-bubble-fallback {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(20,20,22,0.45);
        }
        .fpv-bubble-play {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.25);
        }
        .fpv-bubble-badge {
          position: absolute;
          right: 6px;
          bottom: 6px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #ffffff;
          color: #000;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(0,0,0,0.35);
          z-index: 2;
          transition: transform 0.2s ease;
        }
        .fpv-bubble:hover .fpv-bubble-badge { transform: scale(1.12); }
        .fpv-reels-tag {
          position: absolute;
          top: 6px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 3;
          font-family: 'Jost', sans-serif;
          font-size: 6.5px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #fff;
          background: rgba(0,0,0,0.45);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          border: 1px solid rgba(255,255,255,0.25);
          padding: 2px 7px;
          border-radius: 999px;
          pointer-events: none;
          white-space: nowrap;
        }
        .fpv-dismiss-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          z-index: 4;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: none;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          padding: 0;
          transition: background 0.2s ease, transform 0.2s ease, opacity 0.2s ease;
        }
        .fpv-dismiss-btn:hover {
          background: rgba(0,0,0,0.85);
          transform: scale(1.1);
        }
        .floating-video-panel {
          position: fixed;
          left: 20px;
          bottom: 88px;
          z-index: 71;
          width: min(220px, calc(100vw - 32px));
          max-height: calc(100vh - 96px);
          display: flex;
          flex-direction: column;
          background: #141416;
          color: #fff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08);
        }
        .floating-video-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          font-family: 'Jost', sans-serif;
          flex-shrink: 0;
          cursor: grab;
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
        .floating-video-panel-header.fpv-header-dragging,
        .floating-video-panel-header:active { cursor: grabbing; }
        .floating-video-panel-body {
          flex: 1 1 auto;
          min-height: 0;
          aspect-ratio: 9 / 16;
          width: 100%;
          max-height: calc(100vh - 150px);
          background: #000;
        }
        .fpv-header-link { color: rgba(255,255,255,0.75); transition: color 0.2s; }
        .fpv-header-link:hover { color: #ffffff; }
        .fpv-close-btn {
          background: rgba(255,255,255,0.12);
          border: none;
          color: #fff;
          width: 28px;
          height: 28px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s;
        }
        .fpv-close-btn:hover { background: rgba(255,255,255,0.25); }
        @media (max-width: 767px) {
          .fpv-bubble {
            left: 14px;
            bottom: 92px;
            width: 54px;
          }
          .floating-video-panel {
            left: 12px;
            bottom: 150px;
            width: min(280px, calc(100vw - 24px));
            max-height: calc(100vh - 160px);
          }
          .floating-video-panel-body {
            max-height: calc(100vh - 215px);
          }
          .sticky-bar-mobile {
            z-index: 80 !important;
          }
        }
      `}</style>

      {/* ── SEO meta tags ── */}
      <SEOHead
        title={seoMeta?.metaTitle || `${product.name} — ${product.seoTitle || ''}` || `${product.name} — ${storeName}`}
        description={seoMeta?.metaDescription || product.seoDescription || product.shortDescription || product.description}
        keywords={seoMeta?.metaKeywords || product.seoKeywords || ''}
        image={seoMeta?.ogImage || getImageUrl(getProductImages(product)[0]) || ''}
        ogTitle={seoMeta?.ogTitle}
        ogDescription={seoMeta?.ogDescription}
        canonicalUrl={seoMeta?.canonicalUrl || `${window.location.origin}/products/${product.slug}`}
      />

      {/* ── Breadcrumb ── */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 0", fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase", color: STONE }}>
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            {
              label: typeof product.category === 'object' ? product.category.name : product.category || 'Products',
              href: typeof product.category === 'object' && product.category.slug ? `/products?category=${product.category.slug}` : '/products',
            },
            { label: product.name },
          ]}
          variant="light"
        />
      </div>

      {/* ════════════════════════════════════════ */}
      {/* MAIN CONTENT */}
      {/* ════════════════════════════════════════ */}
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "1fr", gap: 56 }} className="lg-grid product-detail-main">

        {/* ═══ GALLERY ═══ */}
        <div className="gallery-row gallery-sticky" style={{ display: "flex", gap: 16 }}>
          {/* Square Thumbnails - left on desktop, below on mobile */}
          <div className="gallery-thumbs" style={{ display: "flex", flexDirection: "column", gap: 12, width: 80 }}>
            {galleryImages.map((src, i) => (
              <button
                key={i}
                className="thumb"
                onClick={() => {
                  setSelectedImageIdx(i);
                  mobileGalleryRef.current?.children[i]?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
                }}
                style={{
                  aspectRatio: "1 / 1",
                  overflow: "hidden",
                  borderRadius: 12,
                  border: `1px solid ${selectedImageIdx === i ? INK : "rgba(0,0,0,0.1)"}`,
                  opacity: selectedImageIdx === i ? 1 : 0.55,
                  padding: 0,
                  cursor: "pointer",
                  background: "none",
                }}
              >
                <img src={src} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>

          {/* Hero Image */}
          <div ref={flyRef} className="hero-frame gallery-hero" style={{ flex: 1, position: "relative", background: PANEL, overflow: "hidden", borderRadius: 20 }}>
            <div ref={mobileGalleryRef} style={{ display: "flex", overflowX: "auto", scrollSnapType: "x mandatory", scrollBehavior: "smooth", scrollbarWidth: "none" }}>
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => { setGalleryLightboxIdx(idx); setGalleryLightboxOpen(true); }}
                  style={{ scrollSnapAlign: "start", flexShrink: 0, width: "100%", padding: 0, border: "none", background: "none", cursor: "pointer" }}
                >
                  <img className="hero-img" src={img} alt={`${product.name} - View ${idx + 1}`} loading="lazy"
                    className="hero-img" style={{ width: "100%", height: 480, objectFit: "cover", display: "block" }}
                  />
                </button>
              ))}
            </div>

            {/* Discount badge */}
            {discount && (
              <span style={{ position: "absolute", top: 16, left: 16, background: INK, color: PAPER, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", padding: "6px 12px", borderRadius: 6 }}>
                {discount}% Off
              </span>
            )}

            {/* Image counter */}
            <div style={{ position: "absolute", bottom: 16, right: 16, background: "rgba(16,16,18,0.15)", color: PAPER, fontSize: 11, padding: "4px 10px", borderRadius: 6 }}>
              <span>{selectedImageIdx + 1}</span>
              <span style={{ margin: "0 4px", opacity: 0.5 }}>/</span>
              <span style={{ opacity: 0.7 }}>{galleryImages.length}</span>
            </div>
            {/* Swipe dots for mobile */}
            <div className="gallery-swipe-hint">
              {galleryImages.map((_, i) => (
                <div key={i} className={`gallery-swipe-dot${i === selectedImageIdx ? ' active' : ''}`} />
              ))}
            </div>


          </div>
        </div>

        {/* ═══ PRODUCT DETAILS ═══ */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Season / Drop tag */}
          <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: THREAD, fontWeight: 700, marginBottom: 8, ...{ fontFamily: "Jost, sans-serif" } }}>
            {product.collectionId || 'SS26'} — Drop 01
          </div>

          {/* Category + Viewer count */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: GOLD, fontWeight: 600 }}>
              {typeof product.category === 'object' ? product.category.name : product.category}
            </span>
            <span style={{ fontSize: 11, color: STONE, background: PANEL, padding: "3px 10px", borderRadius: 6 }}>
              ● {viewerCount} {t('product.people_viewing')}
            </span>
          </div>

          {/* Product Title */}
          <h1 className="product-detail-title" style={{ fontSize: 42, lineHeight: 1.03, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 14, ...displayFont }}>
            {product.name}
          </h1>

          {/* Rating & Sold */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, fontSize: 13, color: STONE }}>
            <div style={{ display: "flex", gap: 2, color: GOLD }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill={i < Math.floor(product.rating ?? 5) ? GOLD : "none"} stroke={i < Math.floor(product.rating ?? 5) ? "none" : STONE} strokeWidth={1} />
              ))}
            </div>
            <span>{formatRating(product.rating)} · {t('product.reviews', { count: reviews.length })}</span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: STONE, display: "inline-block" }} />
            <span>{t('product.sold', { count: product.soldCount ?? 0 })}</span>
          </div>

          {/* Price */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
            <span style={{ fontSize: 30, fontWeight: 700 }}>{formatCurrency(effectivePrice)}</span>
            {effectiveOldPrice && (
              <>
                <span style={{ fontSize: 18, color: STONE, textDecoration: "line-through" }}>{formatCurrency(effectiveOldPrice)}</span>
                <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", color: GOLD, fontWeight: 600 }}>Save {formatCurrency(effectiveOldPrice - effectivePrice)}</span>
              </>
            )}
          </div>

          {/* Fabric weight meter — only shown when the product has a GSM attribute set */}
          {product.attributes?.gsm && (() => {
            const gsm = Number(product.attributes.gsm);
            const meterPct = getFabricMeterPct(gsm);
            const tier = getFabricTier(gsm);
            return (
              <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: `1px dashed ${STONE}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: STONE, marginBottom: 8 }}>
                  <span>Fabric weight</span>
                  <span style={{ color: INK, fontWeight: 700 }}>{gsm} GSM — {tier}</span>
                </div>
                <div style={{ position: "relative", height: 6, background: PANEL, borderRadius: 3 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${meterPct}%`, background: INK, borderRadius: 3 }} />
                  <div style={{ position: "absolute", left: `${meterPct}%`, top: -5, width: 2, height: 16, background: GOLD }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: STONE, marginTop: 6, ...{ fontFamily: "Jost, sans-serif" } }}>
                  <span>180 · standard tee</span>
                  <span>320 · fleece-grade</span>
                </div>
              </div>
            );
          })()}

          {/* ══ Flash Sale Badge ══ */}
          {activeFlashSale && activeFlashSale.endDate && (
            <div style={{ marginBottom: 20, padding: "14px 16px", border: `1px solid ${GOLD}`, background: "rgba(176, 141, 79, 0.06)", display: "flex", alignItems: "center", gap: 12, borderRadius: 12 }}>
              <Zap size={18} color={GOLD} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {t('product.flash_sale')} {activeFlashSale.discount && <span style={{ color: GOLD }}>{t('product.percent_off', { percent: activeFlashSale.discount })}</span>}
                </div>
                <div style={{ fontSize: 12, color: STONE, marginTop: 2 }}>{activeFlashSale.title}</div>
              </div>
              <FlashSaleCountdown endDate={activeFlashSale.endDate} label="" compact />
            </div>
          )}

          {/* ══ Color Selection ══ */}
          {product.colors && product.colors.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em", color: STONE, marginBottom: 12 }}>
                {t('product.color')} — <span style={{ color: INK, fontWeight: 500 }}>{selectedColor || t('product.select')}</span>
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {product.colors.map((c, i) => {
                  const colorAvailable = isColorAvailable(c);
                  const isOOS = variantsList.length > 0 && !colorAvailable;
                  const isActive = selectedColor === c;
                  const colorThumb = getColorThumb(c);
                  return (
                    <button
                      key={c}
                      onClick={() => { if (isOOS) return; setSelectedColor(c); scrollToOffers(); }}
                      disabled={isOOS}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        border: `1px solid ${isActive ? INK : isOOS ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.15)"}`,
                        cursor: isOOS ? "not-allowed" : "pointer",
                        background: isOOS ? PANEL : "transparent",
                        padding: 0,
                        opacity: isOOS ? 0.5 : 1,
                        overflow: "hidden",
                        transition: "all 0.15s ease",
                      }}
                      title={isOOS ? `${c} - Out of Stock` : c}
                      aria-label={`Select color ${c}`}
                    >
                      <span style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        borderRadius: 11,
                        position: "relative",
                        overflow: "hidden",
                      }}>
                        {colorThumb ? (
                          <img
                            src={colorThumb}
                            alt={c}
                            loading="lazy"
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <span style={{ display: "block", width: "100%", height: "100%", background: getColorHex(c) }} />
                        )}
                        {isOOS && (
                          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.45)" }}>
                            <X size={14} color={STONE} strokeWidth={2} />
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ══ Size Selection ══ */}
          {product.sizes && product.sizes.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.15em", color: STONE }}>
                  {t('product.size')} — <span style={{ color: INK, fontWeight: 500 }}>{selectedSize || t('product.select')}</span>
                </div>
                <button onClick={() => setShowSizeGuide(true)}
                  style={{ fontSize: 11, letterSpacing: "0.1em", color: THREAD, background: "none", border: `1px solid ${STONE}40`, cursor: "pointer", padding: "5px 12px", borderRadius: 8, transition: "all 0.2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = PANEL; e.currentTarget.style.borderColor = INK; e.currentTarget.style.color = INK; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = `${STONE}40`; e.currentTarget.style.color = THREAD; }}
                >
                  {t('product.size_guide')}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {product.sizes.map((s) => {
                  const sizeAvailable = isSizeAvailable(s);
                  const isOOS = variantsList.length > 0 && !sizeAvailable;
                  const isActive = selectedSize === s;
                  return (
                    <button
                      key={s}
                      onClick={() => { if (isOOS) return; setSelectedSize(s); scrollToOffers(); }}
                      disabled={isOOS}
                      style={{
                        width: 48,
                        height: 48,
                        fontSize: 13,
                        fontWeight: 500,
                        border: `1px solid ${isActive ? INK : isOOS ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.15)"}`,
                        background: isActive ? INK : isOOS ? PANEL : "transparent",
                        color: isActive ? PAPER : isOOS ? STONE : INK,
                        cursor: isOOS ? "not-allowed" : "pointer",
                        opacity: isOOS ? 0.5 : 1,
                        textDecoration: isOOS ? "line-through" : "none",
                        borderRadius: 12,
                        transition: "all 0.15s ease",
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <p style={{ fontSize: 12, color: STONE, marginBottom: 20 }}>Runs true to size · relaxed drop-shoulder fit</p>

          {/* Stock Status */}
          {!showOutOfStockBadge && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#15803d", marginBottom: 24 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
              {t('product.in_stock')}
            </div>
          )}
          {showOutOfStockBadge && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: STONE, marginBottom: 24 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: STONE, display: "inline-block" }} />
              {t('product.currently_unavailable')}
            </div>
          )}
          {variantNotFound && hasAllSelections && !isSimpleProduct && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: STONE, marginBottom: 24 }}>
              <X size={12} />
              {t('product.combination_unavailable')}
            </div>
          )}

          {/* ══ Offers Section ══ */}
          <div ref={offersRef} style={{ marginBottom: 24 }}>
            <OffersSection promotions={storeOffers} />
            {isBundleOfferEnabled(getSetting) && (
              <BundleOffer
                basePrice={effectivePrice}
                tiers={parseBundleTiers(getSetting('bundleTiers'))}
                onSelectTier={(minQty) => setQty(minQty)}
                selectedQty={qty}
                isInStock={!isStockUnavailable}
              />
            )}
          </div>

          {/* ══ Qty + CTA ══ */}
          <div ref={sentinelRef} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {/* Quantity selector */}
            <div style={{ display: "flex", alignItems: "center", border: `1px solid rgba(0,0,0,0.15)`, borderRadius: 12 }}>
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                disabled={qty <= 1}
                style={{ width: 44, height: 48, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: qty <= 1 ? "not-allowed" : "pointer", opacity: qty <= 1 ? 0.35 : 1 }}
              >
                <Minus size={14} />
              </button>
              <span style={{ width: 40, textAlign: "center", fontSize: 14, fontWeight: 500 }}>{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                disabled={qty >= maxQty || availableStock <= 0}
                style={{ width: 44, height: 48, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: (qty >= maxQty || availableStock <= 0) ? "not-allowed" : "pointer", opacity: (qty >= maxQty || availableStock <= 0) ? 0.35 : 1 }}
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Add to Bag */}
            <button
              className="cta-main tap-feedback"
              onClick={handleAddToCart}
              disabled={!canAddToCart || isAddingToCart}
              style={{
                flex: 1,
                background: canAddToCart && !isAddingToCart ? INK : "rgba(16,16,18,0.15)",
                color: canAddToCart && !isAddingToCart ? PAPER : STONE,
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                borderRadius: 12,
                cursor: (canAddToCart && !isAddingToCart) ? "pointer" : "not-allowed",
                transition: "background 0.2s",
              }}
            >
              {isAddingToCart ? `${t('product.adding')}...` : isStockUnavailable ? t('product.out_of_stock') : !hasAllSelections ? t('product.select_options') : t('product.add_to_bag')}
            </button>

            {/* Share */}
            <button onClick={handleShare} style={{ width: 48, border: "1px solid rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", background: "none", cursor: "pointer", borderRadius: 12 }}>
              <Share2 size={16} strokeWidth={1.5} />
            </button>

            {/* Wishlist */}
            <button onClick={handleWishlist} style={{ width: 48, border: "1px solid rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", background: "none", cursor: "pointer", borderRadius: 12 }}>
              <Heart size={16} strokeWidth={1.5} fill={inWishlist ? INK : "none"} color={inWishlist ? INK : STONE} />
            </button>
          </div>

          {/* Buy it Now */}
          <button
            className="cta-outline"
            onClick={async () => {
              if (!canAddToCart || isAddingToCart) return;
              setIsAddingToCart(true);
              try {
                addItem({ ...product, productId: product.id, quantity: qty, size: selectedSize, color: selectedColor, variantId: matchedVariant?.id || undefined, imageUrl: cartImageUrl });
                if (!isAuthenticated) { navigate('/checkout'); return; }
                await cartAPI.add({ productId: product.id, quantity: qty, size: selectedSize || undefined, color: selectedColor || undefined, variantId: matchedVariant?.id || undefined });
                navigate('/checkout');
              } catch { navigate('/checkout'); }
              finally { setIsAddingToCart(false); }
            }}
            disabled={!canAddToCart || isAddingToCart}
            style={{
              width: "100%",
              border: `1px solid ${canAddToCart ? INK : "rgba(0,0,0,0.1)"}`,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              fontSize: 13,
              fontWeight: 600,
              padding: "16px 0",
              background: "none",
              borderRadius: 12,
              cursor: canAddToCart ? "pointer" : "not-allowed",
              marginBottom: 32,
              transition: "all 0.2s",
              opacity: canAddToCart ? 1 : 0.4,
            }}
          >
            Buy it Now
          </button>

          {/* ══ Premium Trust Features — Small Premium Boxes ══ */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: STONE, textTransform: "uppercase", letterSpacing: "0.15em" }}>Why Choose Us</span>
              <div style={{ flex: 1, height: 1, background: `rgba(0,0,0,0.06)` }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { icon: Truck, label: "Free Shipping", sub: "On orders above ₹499" },
                { icon: RotateCcw, label: "7-Day Returns", sub: "No questions asked" },
                { icon: ShieldCheck, label: "Secure", sub: "100% secure checkout" },
              ].map((t, i) => {
                const IconComp = t.icon;
                return (
                  <div
                    key={t.label}
                    className="premium-feature-card"
                    style={{
                      padding: "16px 10px",
                      textAlign: "center",
                      borderRadius: 10,
                      border: "1px solid rgba(0,0,0,0.08)",
                      background: i === 0 ? "#fafafa" : "transparent",
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#f0f0f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 8px",
                    }}>
                      <IconComp size={15} strokeWidth={1.5} color={INK} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: INK, marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontSize: 9, color: STONE, lineHeight: 1.3 }}>{t.sub}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ══ "The Label" Module ══ */}
          <div style={{ background: INK, color: PAPER, padding: "22px 24px 24px", position: "relative", borderRadius: 16 }}>
            <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1, background: stitchBorder, opacity: 0.35 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: GOLD, fontWeight: 600 }}>The Label</span>
              <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(239,234,224,0.5)", ...{ fontFamily: "Jost, sans-serif" } }}>No. {(product.id || '0043').toString().slice(0,4)}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 12, fontSize: 13 }}>
              <span style={{ color: "rgba(239,234,224,0.5)" }}>Fabric</span>
              <span style={{ textAlign: "right" }}>{(product.attributes?.fabric) || (product.attributes?.gsm ? `${product.attributes.gsm} GSM ${getFabricTier(Number(product.attributes.gsm))} Cotton` : '—')}</span>
              <span style={{ color: "rgba(239,234,224,0.5)" }}>Fit</span>
              <span style={{ textAlign: "right" }}>{(product.description || 'Drop shoulder, relaxed').slice(0,45)}</span>
              <span style={{ color: "rgba(239,234,224,0.5)" }}>Origin</span>
              <span style={{ textAlign: "right" }}>Made in India</span>
              <span style={{ color: "rgba(239,234,224,0.5)" }}>Treatment</span>
              <span style={{ textAlign: "right" }}>Pre-shrunk fabric</span>
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dashed rgba(239,234,224,0.2)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "rgba(239,234,224,0.4)", textAlign: "center" }}>
              Made for the ones who move different
            </div>
          </div>
        </div>
      </main>

      {/* ════════════════════════════════════════ */}
      {/* ACCORDION SECTIONS */}
      {/* ════════════════════════════════════════ */}
      <section className="product-detail-section" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 40px" }}>
        <div style={{ borderTop: "1px solid rgba(0,0,0,0.1)" }}>
          {[
            { id: "details", label: "Product Details", content: product.description || "Premium quality crafted for lasting comfort and structure, built for everyday wear without losing shape." },
            { id: "material", label: "Material & Care", content: "100% pre-shrunk cotton, machine wash cold with like colors, do not bleach, tumble dry low, iron inside out if needed." },
            { id: "shipping", label: "Shipping & Returns", content: `Free shipping on orders above ₹${freeShippingThreshold}. Easy 7-day returns and exchanges, no questions asked.` },
          ].map((panel) => (
            <div key={panel.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.1)" }}>
              <button
                onClick={() => toggleAccordion(panel.id)}
                style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 600, color: INK }}>{panel.label}</span>
                <ChevronDown size={18} style={{ transform: openAccordion === panel.id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              {openAccordion === panel.id && (
                <div style={{ paddingBottom: 24, fontSize: 14, color: STONE, lineHeight: 1.6, maxWidth: 640 }}>
                  {panel.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* YOU MAY ALSO LIKE — Related Products */}
      {/* ════════════════════════════════════════ */}
      {relatedProducts.length > 0 && (
        <section className="product-detail-section" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: `rgba(0,0,0,0.06)` }} />
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: STONE, whiteSpace: "nowrap", ...displayFont }}>
              You May Also Like
            </h2>
            <div style={{ flex: 1, height: 1, background: `rgba(0,0,0,0.06)` }} />
          </div>
          <div className="product-grid">
            {relatedProducts.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════ */}
      {/* CUSTOMER REVIEWS */}
      {/* ════════════════════════════════════════ */}
      <section className="product-detail-section" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 24, ...displayFont }}>
          {t('product.reviews_heading', { defaultValue: 'Customer Reviews' })}
        </h2>
        <div className="product-detail-reviews" style={{ border: "1px solid rgba(0,0,0,0.1)", padding: 40, textAlign: "center", borderRadius: 16 }}>
          {/* Average rating */}
          <div style={{ fontSize: 36, fontWeight: 900, marginBottom: 8 }}>{formatRating(product.rating)}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 2, marginBottom: 24, color: GOLD }}>
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} fill={i < Math.floor(product.rating ?? 5) ? GOLD : "none"} stroke={i < Math.floor(product.rating ?? 5) ? "none" : STONE} strokeWidth={1} />
            ))}
          </div>

          {/* Review list */}
          {reviews.length > 0 ? (
            <div style={{ textAlign: "left", maxWidth: 600, margin: "0 auto" }}>
              {(showAllReviews ? reviews : reviews.slice(0, 3)).map((review, idx) => (
                <div key={review.id || idx} style={{ padding: "16px 0", borderBottom: idx < (showAllReviews ? reviews : reviews.slice(0, 3)).length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: INK }}>{review.userName || "Anonymous"}</span>
                    <div style={{ display: "flex", gap: 1, color: GOLD }}>
                      {[...Array(5)].map((_, si) => (
                        <Star key={si} size={10} fill={si < review.rating ? GOLD : "none"} stroke={si < review.rating ? "none" : STONE} strokeWidth={1} />
                      ))}
                    </div>
                    <span style={{ fontSize: 11, color: STONE, marginLeft: "auto" }}>{review.date ? formatDate(review.date) : ''}</span>
                  </div>
                  <p style={{ fontSize: 13, color: STONE, lineHeight: 1.5 }}>{review.comment || review.review || ''}</p>
                  {review.reviewImages && review.reviewImages.length > 0 && (
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      {review.reviewImages.slice(0, 3).map((rimg, ri) => (
                        <img key={ri} src={typeof rimg === 'string' ? rimg : rimg?.url} alt="Review" loading="lazy"
                          style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4, border: "1px solid rgba(0,0,0,0.06)" }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {/* View All toggle */}
              {reviews.length > 3 && (
                <button
                  onClick={() => setShowAllReviews(!showAllReviews)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    width: "100%",
                    marginTop: 16,
                    padding: "12px 0",
                    background: "none",
                    border: "1px solid rgba(0,0,0,0.1)",
                    borderRadius: 12,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 600,
                    color: INK,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  {showAllReviews ? (
                    <>Show Less <ChevronDown size={14} style={{ transform: "rotate(180deg)" }} /></>
                  ) : (
                    <>View All {reviews.length} Reviews <ChevronDown size={14} /></>
                  )}
                </button>
              )}
            </div>
          ) : (
            <p style={{ color: STONE, marginBottom: 20 }}>{t('product.no_reviews', { defaultValue: 'No reviews yet — be the first to share your thoughts.' })}</p>
          )}

          <button
            onClick={() => setShowReviewModal(true)}
            style={{ background: INK, color: PAPER, textTransform: "uppercase", letterSpacing: "0.15em", fontSize: 12, fontWeight: 600, padding: "12px 24px", border: "none", cursor: "pointer", borderRadius: 12 }}
          >
            {t('product.write_review', { defaultValue: 'Write a Review' })}
          </button>
        </div>
      </section>
      {/* ════════════════════════════════════════ */}

      {/* ════════════════════════════════════════ */}
      {/* RECENTLY VIEWED */}
      {/* ════════════════════════════════════════ */}
      {recentlyViewed.length > 0 && (
        <section className="product-detail-section" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 48px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ width: 3, height: 36, background: INK }} />
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", ...displayFont }}>
                  {t('product.recently_viewed', { defaultValue: 'Recently Viewed' })}
                </h2>
                <p style={{ fontSize: 12, color: STONE, fontWeight: 400, marginTop: 2 }}>
                  Pick up where you left off
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ x: 4 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              onClick={() => navigate('/products')}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: INK,
                background: "none",
                border: `1px solid ${INK}`,
                borderRadius: 12,
                padding: "8px 16px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              View All
              <ChevronRight size={12} strokeWidth={2} />
            </motion.button>
          </div>
          <div className="product-grid">
            {recentlyViewed.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════ */}
      {/* FOMO Purchase Notification Toast */}
      {/* ════════════════════════════════════════ */}
      <AnimatePresence>
        {recentPurchase && (
          <motion.div
            initial={{ opacity: 0, y: 40, x: 0 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}                    style={{
        position: "fixed",
        bottom: showStickyBar ? 88 : 24,
        left: 24,
        zIndex: 50,
        background: INK,
        color: PAPER,
        padding: "12px 20px",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        maxWidth: 320,
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}
          >
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>
                {recentPurchase.name}
              </div>
              <div style={{ fontSize: 11, color: "rgba(239,234,224,0.6)", lineHeight: 1.3, marginTop: 2 }}>
                purchased from {recentPurchase.city}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ════════════════════════════════════════ */}
      <ReviewFormModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        productId={product.id}
        productName={product.name}
        onSuccess={handleReviewSubmitted}
      />

      <SizeGuideModal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />

      <AnimatePresence>
        {galleryLightboxOpen && galleryImages.length > 0 && (
          <ReviewImageLightbox
            images={galleryImages}
            initialIndex={galleryLightboxIdx}
            onClose={() => setGalleryLightboxOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════ */}
      {/* ── PREMIUM STICKY BAR — Single Row ── */}
      {/* ════════════════════════════════════════ */}{showStickyBar && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 30, mass: 0.9 }}
          className="sticky-bar-mobile"
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "8px 12px 8px 8px",
            paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))",
            zIndex: 50,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}>
          {/* Thumbnail + Info */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              overflow: "hidden",
              flexShrink: 0,
              border: "1px solid rgba(0,0,0,0.06)",
              background: PANEL,
            }}>
              <img
                src={getImageUrl(getProductImages(product)[0])}
                alt=""
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
                {product.name}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: INK }}>
                {formatCurrency(effectivePrice)}
                {effectiveOldPrice && (
                  <span style={{ fontSize: 10, color: STONE, textDecoration: "line-through", fontWeight: 400 }}>{formatCurrency(effectiveOldPrice)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Premium dropdown selects + CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 1, minWidth: 0 }}>
            {/* Premium Size dropdown */}
            {product.sizes?.length > 0 && (
              <div className="sticky-select-wrap" style={{ flexShrink: 0 }}>
                <select
                  name="size"
                  value={selectedSize || ""}
                  onChange={(e) => { if (e.target.value) setSelectedSize(e.target.value); }}
                  className="sticky-select"
                >
                  <option value="" disabled>Size</option>
                  {product.sizes.map((s) => {
                    const sizeAvailable = isSizeAvailable(s);
                    const isOOS = variantsList.length > 0 && !sizeAvailable;
                    return (
                      <option key={s} value={s} disabled={isOOS}>
                        {s}{isOOS ? " — OOS" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Premium Color thumbnails — many colors scroll horizontally; row never overflows */}
            {product.colors?.length > 0 && (() => {
              const thumbSize = product.colors.length > 6 ? 30 : 38;
              const showFade = product.colors.length > 4;
              return (
                <div style={{ position: "relative", display: "flex", alignItems: "center", flexShrink: 1, minWidth: 0, maxWidth: "min(190px, 32vw)" }}>
                  <div
                    ref={stickyColorThumbsRef}
                    className="sticky-color-thumbs"
                    style={{ display: "flex", alignItems: "center", gap: 5, overflowX: "auto", padding: "2px 2px 4px", minWidth: 0, scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    {product.colors.map((c) => {
                      const colorAvailable = isColorAvailable(c);
                      const isOOS = variantsList.length > 0 && !colorAvailable;
                      const isActive = selectedColor === c;
                      const colorThumb = getColorThumb(c);
                      return (
                        <button
                          key={c}
                          onClick={() => { if (isOOS) return; setSelectedColor(c); }}
                          disabled={isOOS}
                          title={isOOS ? `${c} - Out of Stock` : c}
                          aria-label={`Select color ${c}`}
                          style={{
                            width: thumbSize,
                            height: thumbSize,
                            borderRadius: thumbSize / 4,
                            border: `1.5px solid ${isActive ? INK : isOOS ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.15)"}`,
                            cursor: isOOS ? "not-allowed" : "pointer",
                            background: isOOS ? PANEL : "transparent",
                            padding: 0,
                            opacity: isOOS ? 0.45 : 1,
                            overflow: "hidden",
                            flexShrink: 0,
                            boxShadow: isActive ? `0 0 0 2px ${INK}22` : "none",
                            transform: isActive ? "scale(1.06)" : "scale(1)",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <span style={{ display: "block", width: "100%", height: "100%", borderRadius: thumbSize / 4 - 1, position: "relative", overflow: "hidden" }}>
                            {colorThumb ? (
                              <img
                                src={colorThumb}
                                alt={c}
                                loading="lazy"
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                              />
                            ) : (
                              <span style={{ display: "block", width: "100%", height: "100%", background: getColorHex(c) }} />
                            )}
                            {isActive && !isOOS && (
                              <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.25)", pointerEvents: "none" }}>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))" }}>
                                  <path d="M2 6L5 9L10 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                            )}
                            {isOOS && (
                              <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.45)" }}>
                                <X size={10} color={STONE} strokeWidth={2} />
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Right-edge fade hint — tells users more colors are available on scroll */}
                  {showFade && (
                    <div style={{ position: "absolute", top: 2, right: 0, bottom: 4, width: 22, pointerEvents: "none", borderRadius: 8, background: "linear-gradient(to right, transparent, rgba(255,255,255,0.95))" }} />
                  )}
                </div>
              );
            })()}

            {/* Add to Bag */}
            <button
              className="sticky-cta"
              onClick={handleAddToCart}
              disabled={!canAddToCart || isAddingToCart}
              style={{
                flexShrink: 0,
                background: canAddToCart ? INK : "rgba(16,16,18,0.12)",
                color: canAddToCart ? PAPER : STONE,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontSize: 10,
                fontWeight: 700,
                border: "none",
                padding: "8px 14px",
                cursor: canAddToCart ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                borderRadius: 8,
                minWidth: 80,
                textAlign: "center",
              }}
            >
              {isAddingToCart ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", display: "inline-block", animation: "spin 0.6s linear infinite" }} />
                </span>
              ) : isStockUnavailable ? (
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, verticalAlign: "middle" }}>
                  <X size={10} strokeWidth={2.5} style={{ display: "block", flexShrink: 0 }} />
                  <span style={{ lineHeight: 1, display: "block" }}>{t('product.out_of_stock')}</span>
                </span>
              ) : !hasAllSelections ? (
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, verticalAlign: "middle" }}>
                  <ChevronDown size={10} strokeWidth={2.5} style={{ display: "block", flexShrink: 0 }} />
                  <span style={{ lineHeight: 1, display: "block" }}>{t('product.select_options')}</span>
                </span>
              ) : (
                <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, verticalAlign: "middle" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block", flexShrink: 0 }}>
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 01-8 0" />
                  </svg>
                  <span style={{ lineHeight: 1, display: "block" }}>Bag</span>
                </span>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {/* Floating product video player (only when admin uploaded a video) */}
      <FloatingProductVideo key={product.id} product={product} poster={galleryImages[0]} />
    </div>
  );
}

/* ════════════════════════════════════════ */
/* Floating Product Video Player          */
/* ════════════════════════════════════════ */
function FloatingProductVideo({ product, poster }) {
  const [open, setOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Dismissal is session-only (in memory): it hides the bubble for the current
  // page view only, so refreshing the page brings it back.
  const [dismissed, setDismissed] = useState(false);
  const bubbleRef = useRef(null);
  const previewVideoRef = useRef(null);
  const dragState = useRef(null);
  const wasDragRef = useRef(false);
  const panelRef = useRef(null);
  const panelRootRef = useRef(null);
  const panelDragState = useRef(null);
  const [panelDragging, setPanelDragging] = useState(false);
  const [panelPos, setPanelPos] = useState(null);
  const videoUrl = product?.videoUrl || product?.video_url;

  // Keep the preview video muted so browsers allow autoplay
  useEffect(() => {
    if (previewVideoRef.current) previewVideoRef.current.muted = true;
  }, [videoUrl]);

  // Close the player on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        previewVideoRef.current?.play().catch(() => {});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // YouTube / Vimeo embed detection (external links open in a new tab)
  const youTubeId = (() => {
    if (!videoUrl) return null;
    const m = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
    return m?.[1] || null;
  })();
  const vimeoId = (() => {
    if (!videoUrl) return null;
    const m = videoUrl.match(/vimeo\.com\/(\d+)/);
    return m?.[1] || null;
  })();
  const isExternalEmbed = Boolean(youTubeId || vimeoId);
  const embedSrc = youTubeId
    ? `https://www.youtube.com/embed/${youTubeId}?autoplay=1&rel=0`
    : vimeoId
      ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1`
      : null;

  if (!videoUrl || dismissed) return null;

  const openPlayer = () => {
    setVideoError(false);
    setOpen(true);
    previewVideoRef.current?.pause();
  };

  const closePlayer = () => {
    setOpen(false);
    previewVideoRef.current?.play().catch(() => {});
  };

  const dismissVideo = () => {
    setDismissed(true);
  };

  // ── Drag & drop the bubble ──
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    wasDragRef.current = false;
    const el = bubbleRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: rect.left,
      baseTop: rect.top,
    };
    el.setPointerCapture(e.pointerId);
    // Drop the hover/entrance transform so the grab scale doesn't pop mid-drag
    el.style.transform = 'none';
    setDragging(true);
  };

  const onPointerMove = (e) => {
    const st = dragState.current;
    const el = bubbleRef.current;
    if (!st || !el || st.pointerId !== e.pointerId) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (Math.abs(dx) + Math.abs(dy) > 6) wasDragRef.current = true;
    if (!wasDragRef.current) return;
    el.style.left = `${st.baseLeft + dx}px`;
    el.style.top = `${st.baseTop + dy}px`;
    el.style.right = 'auto';
  };

  const onPointerUp = () => {
    const st = dragState.current;
    const el = bubbleRef.current;
    dragState.current = null;
    setDragging(false);
    if (!st || !el) return;
    // A plain click (no drag) must not re-position the bubble
    if (!wasDragRef.current) {
      el.style.transform = '';
      return;
    }
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = rect.width;
    const h = rect.height;
    const top = Math.min(Math.max(rect.top, 12), vh - h - 12);
    const snapToLeft = rect.left + w / 2 < vw / 2;
    el.style.transition = 'left 0.3s cubic-bezier(0.22, 1, 0.36, 1), top 0.3s cubic-bezier(0.22, 1, 0.36, 1)';
    el.style.left = snapToLeft ? '14px' : `${vw - w - 14}px`;
    el.style.right = 'auto';
    el.style.top = `${top}px`;
    // Restore hover scaling now that dragging is done
    el.style.transform = '';
    window.setTimeout(() => { if (el) el.style.transition = ''; }, 320);
  };

  // ── Drag & drop the player panel (grab the header) ──
  const onPanelPointerDown = (e) => {
    if (e.button !== 0) return;
    const el = panelRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    panelDragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      baseLeft: rect.left,
      baseTop: rect.top,
    };
    el.setPointerCapture(e.pointerId);
    setPanelDragging(true);
  };

  const onPanelPointerMove = (e) => {
    const st = panelDragState.current;
    const el = panelRef.current;
    if (!st || !el || st.pointerId !== e.pointerId) return;
    const dx = e.clientX - st.startX;
    const dy = e.clientY - st.startY;
    if (Math.abs(dx) + Math.abs(dy) < 3) return;
    const rootRect = (panelRootRef.current || el).getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(st.baseLeft + dx, 8), Math.max(8, vw - rootRect.width - 8));
    const top = Math.min(Math.max(st.baseTop + dy, 8), Math.max(8, vh - rootRect.height - 8));
    setPanelPos({ left, top });
  };

  const onPanelPointerUp = () => {
    panelDragState.current = null;
    setPanelDragging(false);
  };

  const handleBubbleClick = () => {
    if (wasDragRef.current) { wasDragRef.current = false; return; }
    openPlayer();
  };

  return (
    <>
      {/* Floating video bubble — live muted preview, draggable, click to expand */}
      <div
        ref={bubbleRef}
        className={`fpv-bubble${dragging ? ' fpv-bubble-dragging' : ''}${open ? ' fpv-bubble-hidden' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="Watch product video"
        onClick={handleBubbleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPlayer(); }
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="fpv-ring" />
        <span className="fpv-ring fpv-ring-delay" />
        <span className="fpv-bubble-media">
          {isExternalEmbed || videoError ? (
            <span className="fpv-bubble-fallback">
              {poster ? <img src={poster} alt="" className="fpv-bubble-img" /> : null}
              <span className="fpv-bubble-play"><Play size={22} fill="#fff" /></span>
            </span>
          ) : (
            <video
              ref={previewVideoRef}
              src={getVideoUrl(videoUrl)}
              poster={poster || undefined}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
              className="fpv-bubble-video"
              onError={() => setVideoError(true)}
            />
          )}
        </span>
        <span className="fpv-bubble-badge"><Play size={10} fill="#000" /></span>
        <span className="fpv-reels-tag">Reels</span>
        <button
          type="button"
          className="fpv-dismiss-btn"
          aria-label="Dismiss video preview"
          title="Dismiss video preview"
          onClick={(e) => { e.stopPropagation(); dismissVideo(); }}
          onPointerDown={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <X size={10} strokeWidth={2.5} />
        </button>
      </div>

      {/* Floating player panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            ref={panelRootRef}
            className="floating-video-panel"
            style={panelPos ? { left: `${panelPos.left}px`, top: `${panelPos.top}px`, right: 'auto', bottom: 'auto' } : undefined}
            role="dialog"
            aria-label="Product video player"
          >
            <div
              ref={panelRef}
              className={`floating-video-panel-header${panelDragging ? ' fpv-header-dragging' : ''}`}
              onPointerDown={onPanelPointerDown}
              onPointerMove={onPanelPointerMove}
              onPointerUp={onPanelPointerUp}
              onPointerCancel={onPanelPointerUp}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <Volume2 size={14} strokeWidth={2} />
                <span style={{ fontWeight: 700, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {product?.name || 'Product Video'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {isExternalEmbed && (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fpv-header-link"
                    style={{ display: 'flex', alignItems: 'center', padding: 6, borderRadius: 8 }}
                    aria-label="Open video in new tab"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
                <button
                  onClick={closePlayer}
                  className="fpv-close-btn"
                  aria-label="Close video player"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            <div className="floating-video-panel-body">
              {isExternalEmbed ? (
                <iframe
                  src={embedSrc}
                  title="Product video"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : videoError ? (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,0.7)', padding: 24, textAlign: 'center' }}>
                  <X size={24} />
                  <p style={{ fontSize: 12, lineHeight: 1.5 }}>This video could not be played.</p>
                  <a
                    href={getVideoUrl(videoUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#fff', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', textDecoration: 'underline' }}
                  >
                    Open video instead
                  </a>
                </div>
              ) : (
                <video
                  src={getVideoUrl(videoUrl)}
                  poster={poster || undefined}
                  controls
                  autoPlay
                  playsInline
                  style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
                  onError={() => setVideoError(true)}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ════════════════════════════════════════ */
/* Helper: Map API review to local format  */
/* ════════════════════════════════════════ */
function mapProductReview(review) {
  if (!review) return null;
  return {
    id: review.id,
    rating: review.rating || 5,
    userName: review.userName || review.user?.name || 'Anonymous',
    comment: review.comment || review.review || '',
    review: review.comment || review.review || '',
    date: review.createdAt || review.date || null,
    reviewImages: review.images || review.reviewImages || [],
  };
}

/* ════════════════════════════════════════ */
/* Recently Viewed Carousel Component      */
/* ════════════════════════════════════════ */


import { Minus, Plus, Star, ChevronDown, Share2, X, Zap, Heart, ShieldCheck, Truck, ZoomIn, RotateCcw, Play, Volume2, ExternalLink, ShoppingBag, Layers, Ruler, MapPin, Info, Droplets } from 'lucide-react';
import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';

import { trackProductView, trackAddToCart } from '../../services/tracker';
import useInterval from '../../hooks/useInterval';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import Breadcrumb from '../../components/common/Breadcrumb';
import SEOHead from '../../components/seo/SEOHead';
import { productsAPI } from '../../api/products';
import { seoAPI } from '../../api/seo';
import { reviewsAPI } from '../../api/reviews';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import useAuthStore from '../../store/authStore';
import { cartAPI } from '../../api/cart';
import { wishlistAPI } from '../../api/wishlist';
const SizeGuideModal = lazy(() => import('../../components/product/SizeGuideModal'));
const ReviewFormModal = lazy(() => import('../../components/product/ReviewFormModal'));
import { formatCurrency, getImageUrl, getProductImages, getVideoUrl } from '../../utils/formatters';
const ReviewImageLightbox = lazy(() => import('../../components/product/ReviewImageLightbox'));
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
/* Warm stone-black palette (skill: premium dark + warm neutrals, accent stays black) */
const INK = "#1C1917";         /* brand primary — warm stone black */
const PAPER = "#FAFAF9";       /* warm off-white background */
const ACCENT = INK;            /* brand accent = black */
const ACCENT_DARK = "#44403C"; /* secondary warm gray */
const ACCENT_TINT = "#F1EFEA"; /* light warm surface */
const THREAD = "#57534E";     /* text secondary */
const STONE = "#6E6A66";      /* text muted — 4.5:1 contrast safe */
const PANEL = "#F0EFEC";      /* off-white surface container */
const PAPER_WARM = "#FAFAF9"; /* warm white panel */

const displayFont = { fontFamily: "var(--font-display)", fontWeight: 800 };

const stitchBorder = `repeating-linear-gradient(90deg, ${STONE} 0px, ${STONE} 6px, transparent 6px, transparent 12px)`;
const accentGradient = `linear-gradient(135deg, #2A2724, #161514)`;

// ── Fabric tier helper (used in the details accordion FABRIC attribute) ──
const getFabricTier = (gsm) => gsm >= 280 ? 'Fleece-grade' : gsm >= 200 ? 'Heavyweight' : 'Standard tee';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
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
  const reduceMotion = useReducedMotion();

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
  const [reviewLightboxOpen, setReviewLightboxOpen] = useState(false);
  const [reviewLightboxImages, setReviewLightboxImages] = useState([]);
  const [reviewLightboxIdx, setReviewLightboxIdx] = useState(0);
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
  const [reviewEverOpened, setReviewEverOpened] = useState(false);
  const [sizeGuideEverOpened, setSizeGuideEverOpened] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [reviewSort, setReviewSort] = useState('relevant');
  const reviewsRef = useRef(null);

  // ── React Query: Reviews ──
  const { data: reviews = [] } = useQuery({
    queryKey: ['product-reviews', product?.id],
    queryFn: () => reviewsAPI.getByProduct(product.id).then(r => {
      const data = r.data?.data || {};
      const raw = data.items || data.reviews || (Array.isArray(data) ? data : []);
      return Array.isArray(raw) ? raw.map(mapProductReview) : [];
    }),
    enabled: !!product?.id,
    staleTime: 30000,
  });

  const handleReviewSubmitted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['product-reviews', product?.id] });
  }, [queryClient, product?.id]);

  // ── Rating distribution for the review summary (5★ → 1★) ──
  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = reviews.filter((r) => Math.round(r.rating || 0) === stars).length;
    return { stars, count, pct: reviews.length ? Math.round((count / reviews.length) * 100) : 0 };
  });

  // ── Review sorting, photo album & View All (selektt-style widget) ──
  const parseReviewTs = (d) => (d ? new Date(d).getTime() || 0 : 0);
  const sortedReviews = (() => {
    const list = [...reviews];
    const byDate = (a, b) => parseReviewTs(b.date) - parseReviewTs(a.date);
    switch (reviewSort) {
      case 'photo': return list.sort((a, b) => ((b.reviewImages?.length ? 1 : 0) - (a.reviewImages?.length ? 1 : 0)) || byDate(a, b));
      case 'newest': return list.sort(byDate);
      case 'highest': return list.sort((a, b) => (b.rating - a.rating) || byDate(a, b));
      case 'lowest': return list.sort((a, b) => (a.rating - b.rating) || byDate(a, b));
      default: return list; // most relevant = original order
    }
  })();
  const displayedReviews = showAllReviews ? sortedReviews : sortedReviews.slice(0, 3);
  const reviewAvg = reviews.length
    ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
    : '0.0';
  const photoAlbum = [];
  reviews.forEach((r) => (r.reviewImages || []).forEach((img) => {
    const url = typeof img === 'string' ? img : img?.url;
    if (url && !photoAlbum.includes(url)) photoAlbum.push(url);
  }));
  const albumShow = photoAlbum.slice(0, 6);

  useEffect(() => { if (showReviewModal) setReviewEverOpened(true); }, [showReviewModal]);
  useEffect(() => { if (showSizeGuide) setSizeGuideEverOpened(true); }, [showSizeGuide]);
  useEffect(() => { setShowAllReviews(false); }, [reviewSort]);
  useEffect(() => { setShowAllReviews(false); setReviewSort('relevant'); }, [product?.id]);

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

  // ── Product View Tracking ──
  useEffect(() => {
    if (!product) return;
    const catName = typeof product.category === 'object' ? product.category.name : product.category;
    trackProductView(product.id, product.name, catName);
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
        <div className="hidden lg:block" style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)", gap: 56 }}>
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
      <div className="product-detail-root" style={{ minHeight: "100vh", background: PAPER, color: INK, fontFamily: "Jost, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <div style={{ width: 72, height: 72, margin: "0 auto 24px", borderRadius: "50%", background: PANEL, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={28} color={STONE} strokeWidth={1.5} />
          </div>
          <h2 style={{ fontSize: 28, lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 8, ...displayFont }}>Not Found</h2>
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
        return;
      }
      await cartAPI.add({ productId: product.id, quantity: qty, size: selectedSize || undefined, color: selectedColor || undefined, variantId: matchedVariant?.id || undefined });
      addedToCart(product.name);
    } catch {
      addedToCart(product.name);
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
    <div className="product-detail-root" style={{ minHeight: "100vh", background: PAPER, color: INK, fontFamily: "Jost, sans-serif", paddingBottom: showStickyBar ? 76 : 0 }}>
      <style>{`
        /* ── Accessibility: visible keyboard focus (skill priority 1) ── */
        .product-detail-root button:focus-visible,
        .product-detail-root a:focus-visible,
        .product-detail-root select:focus-visible {
          outline: 2px solid ${INK};
          outline-offset: 2px;
          border-radius: 6px;
        }
        .product-detail-root .thumb:focus-visible { outline-offset: 2px; }
        /* ── Respect reduced-motion (skill priority 7) ── */
        @media (prefers-reduced-motion: reduce) {
          .product-detail-root *,
          .product-detail-root *::before,
          .product-detail-root *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
        @media (min-width: 1024px) {
          .lg-grid { grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr) !important; gap: 48px !important; }
          .hero-img { height: 560px !important; }
          /* Subtle hover zoom on the hero (desktop only, smooth 500ms) */
          .hero-frame .hero-img { transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) !important; }
          .hero-frame:hover .hero-img { transform: scale(1.03) !important; }
          .gallery-row { flex-direction: row !important; }
          .gallery-thumbs { flex-direction: column !important; width: 80px !important; }
          .gallery-sticky { position: sticky; top: 80px; align-self: start; }
          /* Premium buy box — subtle panel framing the purchase info on desktop */
          .pdp-info-box {
            align-self: start;
            background: #ffffff;
            border: 1px solid rgba(0,0,0,0.07);
            border-radius: 20px;
            padding: 28px 28px 32px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.05);
          }
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
          /* Gallery thumbnails on mobile: comfortable 64px scroll row */
          .gallery-thumbs button { width: 64px !important; min-width: 64px !important; }
        }
        @media (max-width: 480px) {
          .hero-img { height: 280px !important; }
          .product-detail-main { padding: 16px 12px !important; gap: 24px !important; }
          .product-detail-section { padding: 0 12px 32px !important; }
          .product-detail-title { font-size: 24px !important; }
          .product-detail-reviews { padding: 20px 16px !important; }
          /* Small phones: drop the bag icon so the label has room */
          .cta-main .pdp-bag-icon { display: none !important; }
          .cta-main { font-size: 11.5px !important; letter-spacing: 0.1em !important; }
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
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 32 }} className="lg-grid product-detail-main">

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
          <div ref={flyRef} className="hero-frame gallery-hero" style={{ flex: 1, position: "relative", background: `linear-gradient(180deg, ${PAPER_WARM}, ${PANEL})`, overflow: "hidden", borderRadius: 24, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 24px 60px rgba(0,0,0,0.08)" }}>
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
              <span style={{ position: "absolute", top: 16, left: 16, background: INK, color: PAPER, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", padding: "7px 14px", borderRadius: 999, boxShadow: "0 6px 18px rgba(0,0,0,0.25)", fontWeight: 700 }}>
                {discount}% Off
              </span>
            )}

            {/* Image counter */}
            <div style={{ position: "absolute", bottom: 16, right: 16, background: "rgba(255,255,255,0.85)", color: INK, fontSize: 11, padding: "5px 12px", borderRadius: 999, backdropFilter: "blur(8px)", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
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

            {/* Zoom affordance — always visible so touch users know the image opens the viewer */}
            <div style={{ position: "absolute", bottom: 16, left: 16, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.85)", color: INK, fontSize: 11, padding: "6px 12px", borderRadius: 999, pointerEvents: "none", backdropFilter: "blur(8px)", boxShadow: "0 2px 10px rgba(0,0,0,0.08)" }}>
              <ZoomIn size={12} />
              <span style={{ letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>Tap to zoom</span>
            </div>

          </div>
        </div>

        {/* ═══ PRODUCT DETAILS — premium buy box ═══ */}
        <div className="pdp-info-box" style={{ display: "flex", flexDirection: "column" }}>
          {/* Category + Viewer count */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: ACCENT_DARK, fontWeight: 700, background: ACCENT_TINT, padding: "5px 12px", borderRadius: 999 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
              {typeof product.category === 'object' ? product.category.name : product.category}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: STONE, background: PANEL, padding: "5px 12px", borderRadius: 999 }}>
              ● {viewerCount} {t('product.people_viewing')}
            </span>
          </div>

          {/* Product Title */}
          <h1 className="product-detail-title" style={{ fontSize: 40, lineHeight: 1.08, letterSpacing: "-0.025em", marginBottom: 14, ...displayFont }}>
            {product.name}
          </h1>

          {/* Rating & Sold */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, fontSize: 13, color: STONE }}>
            <div style={{ display: "flex", gap: 2 }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={14} fill={i < Math.floor(product.rating ?? 5) ? ACCENT : "none"} stroke={i < Math.floor(product.rating ?? 5) ? "none" : STONE} strokeWidth={1} />
              ))}
            </div>
            <span style={{ fontWeight: 600, color: INK }}>{formatRating(product.rating)}</span>
            <span>{t('product.reviews', { count: reviews.length })}</span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: STONE, display: "inline-block" }} />
            <span>{t('product.sold', { count: product.soldCount ?? 0 })}</span>
          </div>

          {/* Price — premium block: sale price, MRP, savings context */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 30, lineHeight: 1, fontWeight: 800, color: INK, letterSpacing: "-0.02em" }}>{formatCurrency(effectivePrice)}</span>
            {effectiveOldPrice && (
              <>
                <span style={{ fontSize: 16, color: STONE, textDecoration: "line-through", marginBottom: 1 }}>{formatCurrency(effectiveOldPrice)}</span>
                {discount > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.02em", color: "#0E9F6E", background: "#E4F4EC", border: "1px solid rgba(14,159,110,0.18)", borderRadius: 999, padding: "3px 10px", alignSelf: "center" }}>Save {discount}%</span>
                )}
              </>
            )}
          </div>
          <div style={{ marginBottom: 20 }} />

          {/* ══ Flash Sale Badge ══ */}
          {activeFlashSale && activeFlashSale.endDate && (
            <div style={{ marginBottom: 20, padding: "14px 16px", border: `1px solid ${INK}20`, background: `linear-gradient(135deg, ${ACCENT_TINT}, #FBFBFB)`, display: "flex", alignItems: "center", gap: 12, borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,0.06)" }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: INK, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
                <Zap size={16} color="#fff" />
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: INK }}>
                  {t('product.flash_sale')} {activeFlashSale.discount && <span style={{ color: ACCENT_DARK }}>{t('product.percent_off', { percent: activeFlashSale.discount })}</span>}
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
                {t('product.color')} — <span style={{ color: INK, fontWeight: 600 }}>{selectedColor || t('product.select')}</span>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
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
                        width: 46,
                        height: 46,
                        borderRadius: "50%",
                        border: `2px solid ${isActive ? ACCENT : isOOS ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.12)"}`,
                        outline: isActive ? `2px solid ${ACCENT_TINT}` : "none",
                        outlineOffset: 3,
                        cursor: isOOS ? "not-allowed" : "pointer",
                        background: isOOS ? PANEL : "transparent",
                        padding: 0,
                        opacity: isOOS ? 0.45 : 1,
                        overflow: "hidden",
                        transition: "all 0.2s ease",
                      }}
                      title={isOOS ? `${c} - Out of Stock` : c}
                      aria-label={`Select color ${c}`}
                    >
                      <span style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
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
                        {isActive && !isOOS && (
                          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                            <span style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(255,255,255,0.85)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}>
                              <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6L5 9L10 3" stroke={INK} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
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
                        fontWeight: 600,
                        border: `1px solid ${isActive ? "transparent" : isOOS ? "rgba(0,0,0,0.05)" : "rgba(0,0,0,0.15)"}`,
                        background: isActive ? accentGradient : isOOS ? PANEL : "transparent",
                        color: isActive ? PAPER : isOOS ? STONE : INK,
                        cursor: isOOS ? "not-allowed" : "pointer",
                        opacity: isOOS ? 0.5 : 1,
                        textDecoration: isOOS ? "line-through" : "none",
                        borderRadius: 12,
                        boxShadow: isActive ? "0 6px 16px rgba(0,0,0,0.22)" : "none",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <p style={{ fontSize: 12, color: STONE, marginBottom: 20, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 14, borderRadius: "50%", background: ACCENT_TINT, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT }} />
            </span>
            Runs true to size · relaxed drop-shoulder fit
          </p>

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
          <div ref={sentinelRef} style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center" }}>
            {/* Quantity selector */}
            <div style={{ display: "flex", alignItems: "center", border: `1px solid rgba(0,0,0,0.15)`, borderRadius: 12, flexShrink: 0 }}>
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                disabled={qty <= 1}
                aria-label="Decrease quantity"
                style={{ width: 46, height: 52, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: qty <= 1 ? "not-allowed" : "pointer", opacity: qty <= 1 ? 0.35 : 1 }}
              >
                <Minus size={14} />
              </button>
              <span style={{ width: 42, textAlign: "center", fontSize: 14, fontWeight: 600 }}>{qty}</span>
              <button
                onClick={() => setQty(qty + 1)}
                disabled={qty >= maxQty || availableStock <= 0}
                aria-label="Increase quantity"
                style={{ width: 46, height: 52, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", cursor: (qty >= maxQty || availableStock <= 0) ? "not-allowed" : "pointer", opacity: (qty >= maxQty || availableStock <= 0) ? 0.35 : 1 }}
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
                height: 52,
                background: canAddToCart && !isAddingToCart ? accentGradient : "rgba(16,16,18,0.12)",
                color: canAddToCart && !isAddingToCart ? PAPER : STONE,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                fontSize: 12.5,
                fontWeight: 700,
                border: "none",
                borderRadius: 12,
                cursor: (canAddToCart && !isAddingToCart) ? "pointer" : "not-allowed",
                boxShadow: canAddToCart && !isAddingToCart ? "0 10px 24px rgba(0,0,0,0.22)" : "none",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                minWidth: 0,
                lineHeight: 1.2,
                whiteSpace: "normal",
              }}
            >
              {isAddingToCart ? `${t('product.adding')}...` : isStockUnavailable ? t('product.out_of_stock') : !hasAllSelections ? t('product.select_options') : (<><ShoppingBag className="pdp-bag-icon" size={15} strokeWidth={2} />{t('product.add_to_bag')}</>)}
            </button>

            {/* Share */}
            <button onClick={handleShare} aria-label="Share product" title="Share" style={{ width: 52, height: 52, flexShrink: 0, border: "1px solid rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", background: PAPER, cursor: "pointer", borderRadius: 12, transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <Share2 size={16} strokeWidth={1.5} />
            </button>

            {/* Wishlist */}
            <button onClick={handleWishlist} aria-label="Add to wishlist" title={inWishlist ? "Remove from wishlist" : "Add to wishlist"} style={{ width: 52, height: 52, flexShrink: 0, border: "1px solid rgba(0,0,0,0.12)", display: "flex", alignItems: "center", justifyContent: "center", background: inWishlist ? "#FDEBEF" : PAPER, cursor: "pointer", borderRadius: 12, transition: "all 0.2s", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
              <Heart size={16} strokeWidth={1.5} fill={inWishlist ? "#E0245C" : "none"} color={inWishlist ? "#E0245C" : STONE} />
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
              height: 52,
              border: `1px solid ${canAddToCart ? INK : "rgba(0,0,0,0.1)"}`,
              textTransform: "uppercase",
              letterSpacing: "0.15em",
              fontSize: 13,
              fontWeight: 600,
              background: canAddToCart ? "transparent" : "rgba(0,0,0,0.03)",
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700, color: ACCENT_DARK, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: ACCENT }} />
                Why Choose Us
              </span>
              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${ACCENT}55, rgba(0,0,0,0.04))` }} />
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
                      borderRadius: 14,
                      border: `1px solid ${i === 0 ? `${ACCENT}40` : "rgba(0,0,0,0.08)"}`,
                      background: i === 0 ? ACCENT_TINT : "#fafafa",
                    }}
                  >
                    <div style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: i === 0 ? accentGradient : "#f0f0f0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 8px",
                    }}>
                      <IconComp size={15} strokeWidth={1.5} color={i === 0 ? PAPER : INK} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: INK, marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontSize: 9, color: STONE, lineHeight: 1.3 }}>{t.sub}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ══ "The Label" Module — light premium spec card ══ */}
          {(() => {
            // Sizes present → garment (tee/hoodie/jacket); caps & totes have none.
            const isApparel = Array.isArray(product.sizes) && product.sizes.length > 0;
            // Unique short label number: admin-set label_number wins, else
            // derive from SKU suffix (seeded UUIDs share the "a273" prefix,
            // so slice(-4) stays unique). Strip a stray "No." prefix if the
            // store owner typed it, since the card already renders "No.".
            const labelNo = String(product.labelNumber || product.label_number ||
              String(product.sku || product.id || '0043')
                .replace(/[^a-zA-Z0-9]/g, '').slice(-4))
              .replace(/^\s*no\.?\s*/i, '').trim().toUpperCase();
            const specRows = [
              {
                Icon: Layers,
                label: 'Fabric',
                value: (product.attributes?.fabric) || (product.attributes?.gsm ? `${product.attributes.gsm} GSM ${getFabricTier(Number(product.attributes.gsm))} Cotton` : '—'),
              },
              {
                Icon: Ruler,
                label: 'Fit',
                value: product.attributes?.fit || (isApparel ? 'Relaxed, oversized fit' : 'True to size'),
              },
              {
                Icon: MapPin,
                label: 'Origin',
                value: product.attributes?.origin || 'Made in India',
              },
              {
                Icon: ShieldCheck,
                label: 'Treatment',
                value: product.attributes?.treatment || (isApparel ? 'Pre-shrunk fabric' : 'Standard care'),
              },
            ];
            return (
              <div style={{ background: `linear-gradient(160deg, #FDFDFC, #F5F4F1)`, color: INK, padding: "22px 24px 0", position: "relative", borderRadius: 18, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 18px 40px rgba(0,0,0,0.06)", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1, background: stitchBorder, opacity: 0.45 }} />
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, marginBottom: 18 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: INK, fontWeight: 700 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: accentGradient }} />
                    The Label
                  </span>
                  <span style={{ fontSize: 11, letterSpacing: "0.12em", color: STONE, ...displayFont }}>No. {labelNo}</span>
                </div>
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  {specRows.map((row) => (
                    <div key={row.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                      <span style={{ width: 30, height: 30, borderRadius: 9, background: PANEL, border: "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <row.Icon size={14} color={INK} strokeWidth={1.8} />
                      </span>
                      <span style={{ flex: 1, fontSize: 10.5, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: THREAD }}>{row.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: INK, textAlign: "right" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ background: accentGradient, color: PAPER, margin: "18px -24px 0", padding: "17px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(250,250,249,0.55)" }} />
                  <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: PAPER, opacity: 0.92 }}>Made for the ones who move different</span>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(250,250,249,0.55)" }} />
                </div>
              </div>
            );
          })()}
        </div>
      </main>

      {/* ════════════════════════════════════════ */}
      {/* ACCORDION — premium spec card (matches The Label) */}
      {/* ════════════════════════════════════════ */}
      <section className="product-detail-section" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 40px" }}>
        <div style={{ background: `linear-gradient(160deg, #FDFDFC, #F5F4F1)`, color: INK, padding: "22px 24px 0", position: "relative", borderRadius: 18, border: "1px solid rgba(0,0,0,0.08)", boxShadow: "0 1px 4px rgba(0,0,0,0.05), 0 18px 40px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1, background: stitchBorder, opacity: 0.45 }} />
          {/* Eyebrow header — same rhythm as The Label */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, marginBottom: 16 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: INK, fontWeight: 700, whiteSpace: "nowrap" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: accentGradient }} />
              Know Your Piece
            </span>
            <span style={{ fontSize: 11, letterSpacing: "0.12em", color: STONE, ...displayFont }}>All you need to know</span>
          </div>
          <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
            {[
              { id: "details", Icon: Info, label: "Product Details", content: product.description || "Premium quality crafted for lasting comfort and structure, built for everyday wear without losing shape." },
              { id: "material", Icon: Droplets, label: "Material & Care", content: product.attributes?.care || "100% pre-shrunk cotton, machine wash cold with like colors, do not bleach, tumble dry low, iron inside out if needed." },
              { id: "shipping", Icon: Truck, label: "Shipping & Returns", content: product.attributes?.shipping || `Free shipping on orders above ₹${freeShippingThreshold}. Easy 7-day returns and exchanges, no questions asked.` },
            ].map((panel) => (
              <div key={panel.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <button
                  onClick={() => toggleAccordion(panel.id)}
                  aria-expanded={openAccordion === panel.id}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "15px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "opacity 0.2s" }}
                >
                  <span style={{ width: 32, height: 32, borderRadius: 9, background: openAccordion === panel.id ? accentGradient : PANEL, border: openAccordion === panel.id ? "none" : "1px solid rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.25s", boxShadow: openAccordion === panel.id ? "0 4px 10px rgba(0,0,0,0.18)" : "none" }}>
                    <panel.Icon size={15} color={openAccordion === panel.id ? PAPER : INK} strokeWidth={1.8} />
                  </span>
                  <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, letterSpacing: "0.01em", color: INK }}>{panel.label}</span>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", background: openAccordion === panel.id ? ACCENT_TINT : "transparent", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}>
                    <ChevronDown size={15} color={openAccordion === panel.id ? ACCENT_DARK : STONE} style={{ transform: openAccordion === panel.id ? "rotate(180deg)" : "none", transition: "transform 0.25s" }} />
                  </span>
                </button>
                {openAccordion === panel.id && (
                  <div style={{ padding: "2px 0 20px 44px", fontSize: 13.5, color: THREAD, lineHeight: 1.7, maxWidth: 640, whiteSpace: "pre-line" }}>
                    {panel.content}
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Black band footer — matches The Label's signature band */}
          <div style={{ background: accentGradient, color: PAPER, margin: "16px -24px 0", padding: "15px 24px", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(250,250,249,0.55)" }} />
            <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: PAPER, opacity: 0.92 }}>Questions? We're here to help</span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(250,250,249,0.55)" }} />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* YOU MAY ALSO LIKE — Related Products */}
      {/* ════════════════════════════════════════ */}
      {relatedProducts.length > 0 && (
        <section className="product-detail-section" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT}44)` }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: ACCENT_DARK }}>Complete the look</span>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
              </div>
              <h2 style={{ fontSize: 28, lineHeight: 1.15, letterSpacing: "-0.02em", color: INK, whiteSpace: "nowrap", ...displayFont }}>
                You May Also Like
              </h2>
            </div>
            <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${ACCENT}44, transparent)` }} />
          </div>
          <div className="product-grid">
            {relatedProducts.slice(0, 8).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════ */}
      {/* CUSTOMER REVIEWS — summary + review cards */}
      {/* (design matched to selektt.com Trustoo reviews widget) */}
      {/* ════════════════════════════════════════ */}
      <section ref={reviewsRef} className="product-detail-section" style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
        {/* Heading — unified eyebrow + rule pattern */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${ACCENT}44)` }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: ACCENT_DARK }}>Social proof</span>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
            </div>
            <h2 style={{ fontSize: 28, lineHeight: 1.15, letterSpacing: "-0.02em", color: INK, whiteSpace: "nowrap", ...displayFont }}>
              {t('product.reviews_heading', { defaultValue: 'Customer Reviews' })}
            </h2>
          </div>
          <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${ACCENT}44, transparent)` }} />
        </div>

        {/* Header: summary + breakdown + album | write + sort */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap", marginBottom: 8 }}>
          {/* Left cluster */}
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
            {/* Average rating */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 32, lineHeight: 1, fontWeight: 700, color: "#303030" }}>{reviewAvg}</span>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                <StarRow rating={reviewAvg} size={22} />
                <span style={{ fontSize: 12, color: "#303030" }}>
                  {reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}
                </span>
              </div>
            </div>

            <div style={{ width: 1, height: 84, background: "#e8e8e8" }} />

            {/* Rating breakdown bars */}
            <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: "1 1 240px", minWidth: 220, maxWidth: 340 }}>
              {ratingDistribution.map((row) => (
                <div key={row.stars} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "#303030", minWidth: 46, textAlign: "right" }}>{row.stars} Star</span>
                  <div style={{ flex: 1, height: 8, borderRadius: 2, background: "#ededed", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${row.pct}%`, background: "#FFA800", transition: "width 0.4s ease" }} />
                  </div>
                  <span style={{ fontSize: 12, color: "#303030", minWidth: 16, textAlign: "right" }}>{row.count}</span>
                </div>
              ))}
            </div>

            {/* Photo album preview */}
            {albumShow.length > 0 && (
              <>
                <div style={{ width: 1, height: 84, background: "#e8e8e8" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  {albumShow.map((url, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => { setReviewLightboxImages(photoAlbum); setReviewLightboxIdx(i); setReviewLightboxOpen(true); }}
                      style={{ padding: 0, border: "none", background: "none", cursor: "zoom-in", borderRadius: 4, overflow: "hidden", display: "block" }}
                      aria-label="View customer photo"
                    >
                      <img src={url} alt="Customer photo" loading="lazy" style={{ width: 100, height: 100, objectFit: "cover", display: "block", borderRadius: 4, border: "1px solid #f0f0f0" }} />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right cluster: write review + sort */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setShowReviewModal(true)}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: INK, color: PAPER, border: "none", cursor: "pointer", borderRadius: 999, padding: "11px 22px", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", boxShadow: "0 6px 18px rgba(0,0,0,0.12)", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#000'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = INK; e.currentTarget.style.transform = 'none'; }}
            >
              <Star size={13} fill="rgba(255,255,255,0.25)" stroke="none" />
              {t('product.write_review', { defaultValue: 'Write a Review' })}
            </button>

            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <select
                value={reviewSort}
                onChange={(e) => setReviewSort(e.target.value)}
                aria-label="Sort reviews"
                name="review-sort"
                style={{ appearance: "none", WebkitAppearance: "none", background: "#ffffff", color: INK, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 10, padding: "9px 32px 9px 14px", fontSize: 13, fontWeight: 600, fontFamily: "Jost, sans-serif", cursor: "pointer", outline: "none", transition: "border-color 0.2s ease" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = INK; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; }}
              >
                <option value="relevant">{t('reviews.sort_relevant', { defaultValue: 'Most Relevant' })}</option>
                <option value="photo">{t('reviews.sort_photo', { defaultValue: 'Photo priority' })}</option>
                <option value="newest">{t('reviews.sort_newest', { defaultValue: 'Newest' })}</option>
                <option value="highest">{t('reviews.sort_highest', { defaultValue: 'Highest Ratings' })}</option>
                <option value="lowest">{t('reviews.sort_lowest', { defaultValue: 'Lowest Ratings' })}</option>
              </select>
              <ChevronDown size={14} color={INK} style={{ position: "absolute", right: 11, pointerEvents: "none" }} />
            </div>
          </div>
        </div>

        {/* Review list */}
        <div style={{ borderTop: "1px solid #efefef" }}>
          {displayedReviews.length > 0 ? (
            displayedReviews.map((review, idx) => (
              <div key={review.id || idx} style={{ padding: "24px 0", borderBottom: "1px solid #efefef" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarBg(review.userName), color: "#303030", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 600, flexShrink: 0 }}>
                    {getInitials(review.userName)}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#303030" }}>{review.userName || 'Anonymous'}</span>
                      {review.verified && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 600, color: "#0a7d3e", background: "#f0faf3", border: "1px solid #cdeeda", borderRadius: 3, padding: "2px 7px" }}>
                          ✓ {t('reviews.verified_buyer', { defaultValue: 'Verified Buyer' })}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5 }}>
                      <StarRow rating={review.rating} size={20} />
                      {review.date && <span style={{ fontSize: 12, color: "#303030" }}>{formatRelativeTime(review.date)}</span>}
                    </div>
                  </div>
                </div>
                {review.title && <p style={{ fontSize: 14, fontWeight: 700, color: "#303030", margin: "0 0 4px" }}>{review.title}</p>}
                <p style={{ fontSize: 14, color: "#303030", lineHeight: 1.5, margin: 0, whiteSpace: "pre-line" }}>{review.comment || review.review || ''}</p>
                {review.reviewImages && review.reviewImages.length > 0 && (
                  <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                    {review.reviewImages.slice(0, 3).map((rimg, ri) => (
                      <button
                        key={ri}
                        type="button"
                        onClick={() => {
                          const urls = (review.reviewImages || []).map((x) => (typeof x === 'string' ? x : x?.url)).filter(Boolean);
                          setReviewLightboxImages(urls);
                          setReviewLightboxIdx(ri);
                          setReviewLightboxOpen(true);
                        }}
                        style={{ padding: 0, border: "none", background: "none", cursor: "zoom-in", borderRadius: 4, overflow: "hidden", display: "block" }}
                        aria-label="View review photo"
                      >
                        <img src={typeof rimg === 'string' ? rimg : rimg?.url} alt="Review photo" loading="lazy"
                          style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 4, border: "1px solid #f0f0f0", display: "block", transition: "transform 0.25s ease, box-shadow 0.25s ease" }}
                          onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.12)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ padding: 48, textAlign: "center" }}>
              <p style={{ color: "#8a8a9a", margin: 0, fontSize: 14 }}>{t('product.no_reviews', { defaultValue: 'No reviews yet — be the first to share your thoughts.' })}</p>
              <button
                onClick={() => setShowReviewModal(true)}
                style={{ marginTop: 18, background: INK, color: PAPER, border: "none", cursor: "pointer", borderRadius: 999, padding: "11px 22px", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", whiteSpace: "nowrap", transition: "all 0.2s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#000'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = INK; }}
              >
                {t('product.write_review', { defaultValue: 'Write a Review' })}
              </button>
            </div>
          )}
        </div>

        {/* View All toggle (our website's original style) */}
        {reviews.length > 3 && (
          <button
            onClick={() => setShowAllReviews(!showAllReviews)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              width: "100%",
              marginTop: 20,
              padding: "13px 0",
              background: "#fafafa",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 999,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              color: INK,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#f0f0f0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#fafafa'; }}
          >
            {showAllReviews ? (
              <>Show Less <ChevronDown size={14} style={{ transform: "rotate(180deg)" }} /></>
            ) : (
              <>{t('product.view_all_reviews', { defaultValue: 'View All {{count}} Reviews', count: reviews.length })} <ChevronDown size={14} /></>
            )}
          </button>
        )}
      </section>
      {/* ════════════════════════════════════════ */}

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
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: ACCENT, flexShrink: 0 }} />
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
      {reviewEverOpened && (
        <Suspense fallback={null}>
          <ReviewFormModal
            isOpen={showReviewModal}
            onClose={() => setShowReviewModal(false)}
            productId={product.id}
            productName={product.name}
            onSuccess={handleReviewSubmitted}
          />
        </Suspense>
      )}

      {sizeGuideEverOpened && (
        <Suspense fallback={null}>
          <SizeGuideModal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />
        </Suspense>
      )}

      <AnimatePresence>
        {galleryLightboxOpen && galleryImages.length > 0 && (
          <Suspense fallback={null}>
            <ReviewImageLightbox
              images={galleryImages}
              initialIndex={galleryLightboxIdx}
              onClose={() => setGalleryLightboxOpen(false)}
            />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reviewLightboxOpen && reviewLightboxImages.length > 0 && (
          <Suspense fallback={null}>
            <ReviewImageLightbox
              images={reviewLightboxImages}
              initialIndex={reviewLightboxIdx}
              onClose={() => setReviewLightboxOpen(false)}
              zIndex={220}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════ */}
      {/* ── PREMIUM STICKY BAR — Single Row ── */}
      {/* ════════════════════════════════════════ */}{showStickyBar && (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { y: 100, opacity: 0 }}
          transition={reduceMotion ? { duration: 0.1 } : { type: 'spring', stiffness: 350, damping: 30, mass: 0.9 }}
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
                background: canAddToCart ? accentGradient : "rgba(16,16,18,0.12)",
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
  const u = review.user || {};
  const userName = review.userName
    || u.name
    || [u.first_name, u.last_name].filter(Boolean).join(' ')
    || [u.firstName, u.lastName].filter(Boolean).join(' ')
    || 'Anonymous';
  return {
    id: review.id,
    rating: review.rating || 5,
    userName,
    title: review.title || '',
    comment: review.comment || review.review || '',
    review: review.comment || review.review || '',
    date: review.createdAt || review.date || review.created_at || null,
    reviewImages: review.images || review.reviewImages || [],
    verified: !!review.is_verified || !!review.verified,
  };
}

/* ── Review avatar helpers ── */
const REVIEW_AVATAR_COLORS = ['#eeeeee', '#e6e6e6', '#f0f0f0', '#eaeaea', '#f3f3f3'];
function getInitials(name) {
  return (name || 'U').trim().split(/\s+/).map((w) => w[0] || '').slice(0, 2).join('').toUpperCase() || 'U';
}
function avatarBg(name) {
  const key = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return REVIEW_AVATAR_COLORS[key % REVIEW_AVATAR_COLORS.length];
}

/* ── Selektt-style star row (supports fractional fill) ── */
function StarRow({ rating = 0, size = 24, color = '#FFA800', track = '#d9d9d9' }) {
  const clamped = Math.max(0, Math.min(5, Number(rating) || 0));
  const full = Math.floor(clamped);
  const pct = Math.round((clamped - full) * 100);
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[...Array(5)].map((_, i) => {
        const filled = i < full;
        const partial = i === full && pct > 0;
        return (
          <div key={i} style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <Star size={size} fill={filled ? color : 'none'} stroke={filled ? color : track} strokeWidth={1.2} />
            {partial && (
              <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: pct + '%' }}>
                <Star size={size} fill={color} stroke={color} strokeWidth={1.2} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Relative review date ("1 day ago") matching selektt ── */
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const ts = new Date(dateStr).getTime();
  if (isNaN(ts)) return '';
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return min + ' minute' + (min === 1 ? '' : 's') + ' ago';
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + ' hour' + (hr === 1 ? '' : 's') + ' ago';
  const day = Math.floor(hr / 24);
  if (day < 30) return day + ' day' + (day === 1 ? '' : 's') + ' ago';
  const mon = Math.floor(day / 30);
  if (mon < 12) return mon + ' month' + (mon === 1 ? '' : 's') + ' ago';
  const yr = Math.floor(mon / 12);
  return yr + ' year' + (yr === 1 ? '' : 's') + ' ago';
}


import { Minus, Plus, Star, ChevronDown, Share2, X, ChevronLeft, ChevronRight, Zap, Heart, ShieldCheck, Truck, ZoomIn, RotateCcw } from 'lucide-react';
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
import { formatCurrency, formatDate, getImageUrl, getProductImages } from '../../utils/formatters';
import ReviewImageLightbox from '../../components/product/ReviewImageLightbox';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../../store/useSettings';
import useFlyToCart from '../../hooks/useFlyToCart';
import { getColorHex } from '../../utils/constants';
import { promotionsAPI } from '../../api/promotions';
import { ordersAPI } from '../../api/orders';
import FlashSaleCountdown from '../../components/storefront/FlashSaleCountdown';
import OffersSection from '../../components/storefront/OffersSection';
import BundleOffer from '../../components/storefront/BundleOffer';
import ProductGrid from '../../components/product/ProductGrid';
import ProductCard from '../../components/product/ProductCard';
import RecentlyViewedCarousel, { RecentlyViewedCarouselSkeleton } from '../../components/product/RecentlyViewedCarousel';
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

  // ── Recommended Products ──
  const { data: recommended = [] } = useQuery({
    queryKey: ['product-recommended', product?.categoryId || product?.category],
    queryFn: () => productsAPI.getByCategory(product.categoryId || product.category).then(r => {
      const recs = (r.data?.products || r.data || []).filter(p => p.id !== product.id).slice(0, 4);
      return recs;
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
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "1fr", gap: 56 }}
          className="lg-grid"
        >
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

  const handleAddToCart = async () => {
    if (isAddingToCart) return;
    if (!canAddToCart) return;
    setIsAddingToCart(true);
    flyToCart();
    trackAddToCart(product.id, product.name, qty, product.price);
    try {
      addItem({ ...product, productId: product.id, quantity: qty, size: selectedSize, color: selectedColor, variantId: matchedVariant?.id || undefined });
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
        .thumb:hover { opacity: 1 !important; }
        .hero-img { transition: transform 0.6s ease; }
        .hero-frame:hover .hero-img { transform: scale(1.04); }
        .cta-main:hover { background: #333333 !important; }
        .cta-outline:hover { background: ${INK} !important; color: ${PAPER} !important; }
        .premium-feature-card { transition: all 0.25s ease; cursor: default; }
        .premium-feature-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.06); border-color: ${INK} !important; background: #fafafa !important; }
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
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", display: "grid", gridTemplateColumns: "1fr", gap: 56 }} className="lg-grid">

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
          <div ref={flyRef} className="hero-frame gallery-hero" style={{ flex: 1, position: "relative", background: PANEL, overflow: "hidden" }}>
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
              <span style={{ position: "absolute", top: 16, left: 16, background: INK, color: PAPER, fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", padding: "6px 12px" }}>
                {discount}% Off
              </span>
            )}

            {/* Image counter */}
            <div style={{ position: "absolute", bottom: 16, right: 16, background: "rgba(16,16,18,0.15)", color: PAPER, fontSize: 11, padding: "4px 10px" }}>
              <span>{selectedImageIdx + 1}</span>
              <span style={{ margin: "0 4px", opacity: 0.5 }}>/</span>
              <span style={{ opacity: 0.7 }}>{galleryImages.length}</span>
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
            <span style={{ fontSize: 11, color: STONE, background: PANEL, padding: "3px 10px" }}>
              ● {viewerCount} {t('product.people_viewing')}
            </span>
          </div>

          {/* Product Title */}
          <h1 style={{ fontSize: 42, lineHeight: 1.03, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 14, ...displayFont }}>
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

          {/* Fabric weight meter (if product has attributes) */}
          <div style={{ marginBottom: 28, paddingBottom: 24, borderBottom: `1px dashed ${STONE}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: STONE, marginBottom: 8 }}>
              <span>Fabric weight</span>
              <span style={{ color: INK, fontWeight: 700 }}>{(product.attributes?.gsm) || '240'} GSM — Heavyweight</span>
            </div>
            <div style={{ position: "relative", height: 6, background: PANEL, borderRadius: 3 }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: "62%", background: INK, borderRadius: 3 }} />
              <div style={{ position: "absolute", left: "62%", top: -5, width: 2, height: 16, background: GOLD }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: STONE, marginTop: 6, ...{ fontFamily: "Jost, sans-serif" } }}>
              <span>180 · standard tee</span>
              <span>320 · fleece-grade</span>
            </div>
          </div>

          {/* ══ Flash Sale Badge ══ */}
          {activeFlashSale && activeFlashSale.endDate && (
            <div style={{ marginBottom: 20, padding: "14px 16px", border: `1px solid ${GOLD}`, background: "rgba(176, 141, 79, 0.06)", display: "flex", alignItems: "center", gap: 12 }}>
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
                  return (
                    <button
                      key={c}
                      onClick={() => { if (isOOS) return; setSelectedColor(c); scrollToOffers(); }}
                      disabled={isOOS}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        border: `2px solid ${isActive ? INK : "transparent"}`,
                        cursor: isOOS ? "not-allowed" : "pointer",
                        background: "none",
                        padding: 3,
                        opacity: isOOS ? 0.35 : 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      title={isOOS ? `${c} - Out of Stock` : c}
                    >
                      <span style={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        borderRadius: "50%",
                        background: getColorHex(c),
                        border: "1px solid rgba(0,0,0,0.15)",
                        position: "relative",
                        overflow: "hidden",
                      }}>
                        {isOOS && (
                          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                  style={{ fontSize: 12, textDecoration: "underline", color: STONE, background: "none", border: "none", cursor: "pointer" }}>
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
            {getSetting('bundleOfferEnabled', 'true') !== 'false' && (
              <BundleOffer
                basePrice={effectivePrice}
                onSelectTier={(minQty) => setQty(minQty)}
                selectedQty={qty}
                isInStock={!isStockUnavailable}
              />
            )}
          </div>

          {/* ══ Qty + CTA ══ */}
          <div ref={sentinelRef} style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            {/* Quantity selector */}
            <div style={{ display: "flex", alignItems: "center", border: `1px solid rgba(0,0,0,0.15)` }}>
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
              className="cta-main"
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
                cursor: (canAddToCart && !isAddingToCart) ? "pointer" : "not-allowed",
                transition: "background 0.2s",
              }}
            >
              {isAddingToCart ? `${t('product.adding')}...` : isStockUnavailable ? t('product.out_of_stock') : !hasAllSelections ? t('product.select_options') : t('product.add_to_bag')}
            </button>

            {/* Share */}
            <button onClick={handleShare} style={{ width: 48, border: "1px solid rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", background: "none", cursor: "pointer" }}>
              <Share2 size={16} strokeWidth={1.5} />
            </button>

            {/* Wishlist */}
            <button onClick={handleWishlist} style={{ width: 48, border: "1px solid rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center", background: "none", cursor: "pointer" }}>
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
                addItem({ ...product, productId: product.id, quantity: qty, size: selectedSize, color: selectedColor, variantId: matchedVariant?.id || undefined });
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
          <div style={{ background: INK, color: PAPER, padding: "22px 24px 24px", position: "relative" }}>
            <div style={{ position: "absolute", top: 0, left: 24, right: 24, height: 1, background: stitchBorder, opacity: 0.35 }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, marginBottom: 16 }}>
              <span style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: GOLD, fontWeight: 600 }}>The Label</span>
              <span style={{ fontSize: 10, letterSpacing: "0.1em", color: "rgba(239,234,224,0.5)", ...{ fontFamily: "Jost, sans-serif" } }}>No. {(product.id || '0043').toString().slice(0,4)}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", rowGap: 12, fontSize: 13 }}>
              <span style={{ color: "rgba(239,234,224,0.5)" }}>Fabric</span>
              <span style={{ textAlign: "right" }}>{(product.attributes?.fabric) || '240 GSM Heavyweight Cotton'}</span>
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
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 40px" }}>
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
      {/* CUSTOMER REVIEWS */}
      {/* ════════════════════════════════════════ */}
      <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 24, ...displayFont }}>
          {t('product.reviews_heading', { defaultValue: 'Customer Reviews' })}
        </h2>
        <div style={{ border: "1px solid rgba(0,0,0,0.1)", padding: 40, textAlign: "center" }}>
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
              {reviews.slice(0, 3).map((review, idx) => (
                <div key={review.id || idx} style={{ padding: "16px 0", borderBottom: idx < Math.min(reviews.length, 3) - 1 ? "1px solid rgba(0,0,0,0.06)" : "none" }}>
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
            </div>
          ) : (
            <p style={{ color: STONE, marginBottom: 20 }}>{t('product.no_reviews', { defaultValue: 'No reviews yet — be the first to share your thoughts.' })}</p>
          )}

          <button
            onClick={() => setShowReviewModal(true)}
            style={{ background: INK, color: PAPER, textTransform: "uppercase", letterSpacing: "0.15em", fontSize: 12, fontWeight: 600, padding: "12px 24px", border: "none", cursor: "pointer" }}
          >
            {t('product.write_review', { defaultValue: 'Write a Review' })}
          </button>
        </div>
      </section>

      {/* ════════════════════════════════════════ */}
      {/* RECOMMENDED PRODUCTS */}
      {/* ════════════════════════════════════════ */}
      {recommended.length > 0 && (
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px" }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, textTransform: "uppercase", letterSpacing: "-0.01em", marginBottom: 24, ...displayFont }}>
            {t('product.you_may_also_like', { defaultValue: 'You May Also Like' })}
          </h2>
          <ProductGrid products={recommended} />
        </section>
      )}

      {/* ════════════════════════════════════════ */}
      {/* RECENTLY VIEWED */}
      {/* ════════════════════════════════════════ */}
      {recentlyViewed.length > 0 && (
        <section style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 80px", position: "relative" }}>
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
                padding: "8px 16px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              View All
              <ChevronRight size={12} strokeWidth={2} />
            </motion.button>
          </div>
          {!recentlyViewedLoaded ? (
            <RecentlyViewedCarouselSkeleton />
          ) : (
            <RecentlyViewedCarousel products={recentlyViewed.slice(0, 8)} />
          )}
          {/* Premium gradient fade on the right edge */}
          <div style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: 80,
            background: `linear-gradient(90deg, transparent 0%, ${PAPER} 100%)`,
            pointerEvents: "none",
            zIndex: 2,
          }} />
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
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              bottom: showStickyBar ? 88 : 24,
              left: 24,
              zIndex: 50,
              background: INK,
              color: PAPER,
              padding: "12px 20px",
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
      {/* STICKY BOTTOM BAR — compact single row with variant selectors */}
      {/* ════════════════════════════════════════ */}
      {showStickyBar && (
        <div style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: PAPER,
          borderTop: `1px solid ${INK}`,
          padding: "8px 12px",
          zIndex: 40,
          boxShadow: "0 -4px 16px rgba(0,0,0,0.08)",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          overflowX: "auto",
          scrollbarWidth: "none",
        }}>
          {/* Price */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 11, color: STONE, whiteSpace: "nowrap" }}>{product.name}</div>
            <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
              {formatCurrency(effectivePrice)}
              {selectedSize && <span style={{ fontSize: 11, fontWeight: 400, color: STONE }}> · {selectedSize}</span>}
              {selectedColor && <span style={{ fontSize: 11, fontWeight: 400, color: STONE }}> · {selectedColor}</span>}
            </div>
          </div>

          {/* Size selector - compact pills */}
          {product.sizes?.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
              {product.sizes.map((s) => {
                const sizeAvailable = isSizeAvailable(s);
                const isOOS = variantsList.length > 0 && !sizeAvailable;
                const isActive = selectedSize === s;
                return (
                  <button
                    key={s}
                    onClick={() => { if (isOOS) return; setSelectedSize(s); }}
                    disabled={isOOS}
                    style={{
                      minWidth: 28,
                      height: 28,
                      fontSize: 10,
                      fontWeight: 600,
                      borderRadius: 4,
                      border: `1px solid ${isActive ? INK : "rgba(0,0,0,0.12)"}`,
                      background: isActive ? INK : "transparent",
                      color: isActive ? PAPER : isOOS ? "rgba(0,0,0,0.2)" : INK,
                      cursor: isOOS ? "not-allowed" : "pointer",
                      opacity: isOOS ? 0.35 : 1,
                      textDecoration: isOOS ? "line-through" : "none",
                      padding: "2px 4px",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          )}

          {/* Color selector - compact dots */}
          {product.colors?.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
              {product.colors.map((c) => {
                const colorAvailable = isColorAvailable(c);
                const isOOS = variantsList.length > 0 && !colorAvailable;
                const isActive = selectedColor === c;
                return (
                  <button
                    key={c}
                    onClick={() => { if (isOOS) return; setSelectedColor(c); }}
                    disabled={isOOS}
                    title={c}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: `2px solid ${isActive ? INK : "transparent"}`,
                      opacity: isOOS ? 0.3 : 1,
                      cursor: isOOS ? "not-allowed" : "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "none",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{
                      display: "block",
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: getColorHex(c),
                      border: "1px solid rgba(0,0,0,0.15)",
                    }} />
                  </button>
                );
              })}
            </div>
          )}

          {/* Add to Bag */}
          <button
            className="cta-main"
            onClick={handleAddToCart}
            disabled={!canAddToCart || isAddingToCart}
            style={{
              flexShrink: 0,
              background: canAddToCart ? INK : "rgba(16,16,18,0.15)",
              color: canAddToCart ? PAPER : STONE,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontSize: 10,
              fontWeight: 700,
              border: "none",
              padding: "8px 16px",
              cursor: canAddToCart ? "pointer" : "not-allowed",
              transition: "background 0.2s",
              whiteSpace: "nowrap",
              borderRadius: 4,
              marginLeft: "auto",
            }}
          >
            {isStockUnavailable ? t('product.out_of_stock') : !hasAllSelections ? t('product.select_options') : t('product.add_to_bag')}
          </button>
        </div>
      )}
    </div>
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


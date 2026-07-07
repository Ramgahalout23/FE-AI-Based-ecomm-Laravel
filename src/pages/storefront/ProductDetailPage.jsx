import { Minus, Plus, Star, ChevronDown, Check, RefreshCw, ArrowUp, Share2, X, ChevronLeft, ChevronRight, Zap, Heart, ShieldCheck, Truck, MessageCircle, Image, Pencil } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';

;
import { trackProductView, trackAddToCart } from '../../services/tracker';
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
import FlashSaleCountdown from '../../components/storefront/FlashSaleCountdown';
import OffersSection from '../../components/storefront/OffersSection';
import BundleOffer from '../../components/storefront/BundleOffer';
import ProductGrid from '../../components/product/ProductGrid';
import ProductCard from '../../components/product/ProductCard';
import { addedToCart, removedFromWishlist, addedToWishlist, wishlistError, linkCopied } from '../../utils/toast';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [qty, setQty] = useState(1);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [matchedVariant, setMatchedVariant] = useState(null);
  const [variantLoading, setVariantLoading] = useState(false);
  const [variantNotFound, setVariantNotFound] = useState(false);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const mobileGalleryRef = useRef(null);

  // Accordion state
  const [openAccordion, setOpenAccordion] = useState('details'); // 'details', 'shipping', 'care'

  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const freeShippingThreshold = getSetting('freeShippingThreshold', 499);
  const { t } = useTranslation();
  const { addItem } = useCartStore();
  const { isInWishlist, addItem: addToWL, removeItem: removeFromWL } = useWishlistStore();
  const { isAuthenticated } = useAuthStore();
  const { flyRef, flyToCart } = useFlyToCart();

  // ── React Query: Product data ──
  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const res = await productsAPI.getById(slug);
      const prod = res.data?.data || null;
      if (!prod) throw new Error('Product not found');
      return prod;
    },
    staleTime: 60000,
  });

  const queryClient = useQueryClient();

  // ── Review Modal State ──
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

  // Find an active flash sale that applies to this product
  const activeFlashSale = (() => {
    if (!flashPromotions.length || !product) return null;
    const now = new Date();
    return flashPromotions.find(p => {
      const start = p.startDate ? new Date(p.startDate) : null;
      const end = p.endDate ? new Date(p.endDate) : null;
      if (start && now < start) return false;
      if (end && now > end) return false;
      if (p.status !== 'ACTIVE' && !p.isActive) return false;

      // Check if product is in the promotion's linked products
      const productIds = p.productIds || p.products?.map(pr => pr.id) || [];
      if (productIds.length > 0) {
        return productIds.includes(product.id);
      }
      // Check if product's category is in the promotion's linked categories
      const categoryIds = p.categoryIds || p.categories?.map(c => c.id) || [];
      if (categoryIds.length > 0) {
        const catId = typeof product.category === 'object' ? product.category?.id : product.categoryId;
        return categoryIds.includes(catId);
      }
      // No linked products/categories = applies to all
      return true;
    });
  })();

  // ── React Query: Recommended (same category) ──
  const { data: recommended = [] } = useQuery({
    queryKey: ['product-recommended', product?.categoryId || product?.category],
    queryFn: () => productsAPI.getByCategory(product.categoryId || product.category).then(r => {
      const recs = (r.data?.products || r.data || []).filter(p => p.id !== product.id).slice(0, 4);
      return recs;
    }),
    enabled: !!product?.id,
    staleTime: 60000,
  });

  // ── Side effects (tracking, recently viewed) ──
  useEffect(() => {
    if (!product) return;

    const catName = typeof product.category === 'object' ? product.category.name : product.category;
    trackProductView(product.id, product.name, catName);

    // Recently viewed — localStorage for guests, server-sync for authenticated users
    let viewed = JSON.parse(localStorage.getItem('luxe_recently_viewed') || '[]');
    viewed = viewed.filter(v => v.id !== product.id);
    viewed.unshift(product);
    viewed = viewed.slice(0, 5);
    localStorage.setItem('luxe_recently_viewed', JSON.stringify(viewed));
    setRecentlyViewed(viewed.filter(v => v.id !== product.id));

    // Server-side tracking for logged-in users
    if (isAuthenticated && product.id) {
      recentlyViewedAPI.trackView(product.id).catch(() => {});
    }
  }, [product]);

  // ── Wishlist server sync on mount — ensures heart icon matches server state ──
  useEffect(() => {
    if (!product?.id || !isAuthenticated) return;
    let cancelled = false;

    wishlistAPI.check(product.id).then((res) => {
      if (cancelled) return;
      const wishlisted = res?.data?.data?.wishlisted;
      if (wishlisted === true) {
        addToWL(product);
      } else if (wishlisted === false && isInWishlist(product.id)) {
        removeFromWL(product.id);
      }
    }).catch(() => {
      // Server sync failure is silent — local state remains as-is
    });

    return () => { cancelled = true; };
  }, [product?.id, isAuthenticated]);

  // Fetch matching variant when user selects size/color
  useEffect(() => {
    if (!product?.id) return;
    const needsSize = product.sizes?.length > 0;
    const needsColor = product.colors?.length > 0;

    // Clear variant when not all required attributes are selected
    if ((needsSize && !selectedSize) || (needsColor && !selectedColor)) {
      if (matchedVariant) setMatchedVariant(null);
      return;
    }

    // Fetch the matching variant from backend
    const fetchVariant = async () => {
      setVariantLoading(true);
      setVariantNotFound(false);
      try {
        const attrs = {};
        if (selectedSize) attrs.size = selectedSize;
        if (selectedColor) attrs.color = selectedColor;
        const res = await productsAPI.getVariantByAttributes(product.id, {
          attributes: JSON.stringify(attrs),
        });
        const variant = res.data?.data || null;
        setMatchedVariant(variant);
        setVariantNotFound(!variant);
      } catch {
        setMatchedVariant(null);
        setVariantNotFound(true);
      } finally {
        setVariantLoading(false);
      }
    };
    fetchVariant();
  }, [selectedSize, selectedColor, product?.id]);

  // Reset image index when variant/color changes
  useEffect(() => {
    setSelectedImageIdx(0);
  }, [selectedColor, selectedSize]);

  // ── Variant availability maps (from product variants already in the API response) ──
  const variantsList = product?.variants || product?.productvariant || [];
  const variantStockMap = new Map();
  // Build a lookup: "size::color" -> variant quantity
  variantsList.forEach(v => {
    const attrs = v.attributes || {};
    const key = `${attrs.size || ''}::${attrs.color || ''}`;
    variantStockMap.set(key, v.quantity || 0);
  });

  // Check if a specific size option is available based on current selections
  const isSizeAvailable = (size) => {
    if (!variantsList.length) return true; // Simple product
    if (selectedColor) {
      // Color is selected - check the specific combo
      const key = `${size}::${selectedColor}`;
      return (variantStockMap.get(key) || 0) > 0;
    }
    // No color selected - check if ANY variant with this size has stock
    return variantsList.some(v => {
      const attrs = v.attributes || {};
      return attrs.size === size && (v.quantity || 0) > 0;
    });
  };

  // Check if a specific color option is available based on current selections
  const isColorAvailable = (color) => {
    if (!variantsList.length) return true; // Simple product
    if (selectedSize) {
      // Size is selected - check the specific combo
      const key = `${selectedSize}::${color}`;
      return (variantStockMap.get(key) || 0) > 0;
    }
    // No size selected - check if ANY variant with this color has stock
    return variantsList.some(v => {
      const attrs = v.attributes || {};
      return attrs.color === color && (v.quantity || 0) > 0;
    });
  };

  const LOW_STOCK_THRESHOLD = 5;

  // Get the maximum available stock count for a specific size option
  const getSizeStock = (size) => {
    if (!variantsList.length) return product?.quantity || 0; // Simple product
    if (selectedColor) {
      // Color is selected - check the specific combo
      const key = `${size}::${selectedColor}`;
      return variantStockMap.get(key) || 0;
    }
    // No color selected - get the max stock across all color combos for this size
    const stocks = variantsList
      .filter(v => (v.attributes || {}).size === size)
      .map(v => v.quantity || 0);
    return stocks.length ? Math.max(...stocks) : 0;
  };

  // Get the maximum available stock count for a specific color option
  const getColorStock = (color) => {
    if (!variantsList.length) return product?.quantity || 0; // Simple product
    if (selectedSize) {
      // Size is selected - check the specific combo
      const key = `${selectedSize}::${color}`;
      return variantStockMap.get(key) || 0;
    }
    // No size selected - get the max stock across all size combos for this color
    const stocks = variantsList
      .filter(v => (v.attributes || {}).color === color)
      .map(v => v.quantity || 0);
    return stocks.length ? Math.max(...stocks) : 0;
  };

  // Check if a size/color option has low stock (1-5) but is still available
  const isSizeLowStock = (size) => {
    const stock = getSizeStock(size);
    return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  };

  const isColorLowStock = (color) => {
    const stock = getColorStock(color);
    return stock > 0 && stock <= LOW_STOCK_THRESHOLD;
  };

  /* ── Back-to-top visibility ── */
  const [showBackToTop, setShowBackToTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    const title = product?.name || 'Check this out';
    if (navigator.share) {
      try {
        await navigator.share({ title, url, text: `Check out ${title} at ${storeName}` });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        linkCopied();
      } catch {}
    }
  }, [product]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-24 lg:pb-20">
        {/* Breadcrumb skeleton */}
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2">
            <div className="skeleton h-3.5 w-10 !rounded" />
            <div className="w-2 h-px bg-gray-200" />
            <div className="skeleton h-3.5 w-16 !rounded" />
            <div className="w-2 h-px bg-gray-200" />
            <div className="skeleton h-3.5 w-28 !rounded" />
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
            
            {/* ── Left: Image Gallery Skeleton ── */}
            <div className="w-full lg:w-[55%]">
              <div className="skeleton w-full aspect-[3/4] !rounded-2xl" />
              <div className="grid grid-cols-4 gap-3 mt-4">
                {[1,2,3,4].map(i => (
                  <div key={i} className="skeleton aspect-[3/4] !rounded-xl" />
                ))}
              </div>
            </div>

            {/* ── Right: Product Info Card Skeleton ── */}
            <div className="w-full lg:w-[45%]">
              <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200/80 shadow-[0_2px_30px_-8px_rgba(0,0,0,0.08)]">
                
                {/* Category badge */}
                <div className="skeleton h-[22px] w-28 !rounded-full mb-4" />
                
                {/* Title (multi-line) */}
                <div className="skeleton h-[26px] w-full !rounded-md mb-2" />
                <div className="skeleton h-[26px] w-3/4 !rounded-md mb-4" />
                
                {/* Rating row */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(i => <div key={i} className="skeleton w-[15px] h-[15px] !rounded-sm" />)}
                  </div>
                  <div className="skeleton h-3 w-px" />
                  <div className="skeleton h-3.5 w-24 !rounded" />
                  <div className="skeleton h-3 w-px" />
                  <div className="skeleton h-3.5 w-20 !rounded" />
                </div>

                {/* Price */}
                <div className="flex items-center gap-3 pb-6 border-b border-gray-100 mb-6">
                  <div className="skeleton h-[32px] w-32 !rounded-md" />
                  <div className="skeleton h-5 w-20 !rounded-md" />
                  <div className="skeleton h-5 w-16 !rounded-full" />
                </div>

                {/* Color swatches */}
                <div className="mb-6">
                  <div className="flex justify-between mb-3">
                    <div className="skeleton h-3.5 w-16 !rounded" />
                    <div className="skeleton h-3.5 w-8 !rounded" />
                  </div>
                  <div className="flex gap-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="skeleton w-12 h-12 !rounded-full" />
                    ))}
                  </div>
                </div>

                {/* Size selection */}
                <div className="mb-6">
                  <div className="flex justify-between mb-3">
                    <div className="skeleton h-3.5 w-12 !rounded" />
                    <div className="skeleton h-3.5 w-16 !rounded" />
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="skeleton h-[50px] !rounded-xl" />
                    ))}
                  </div>
                </div>

                {/* Stock status */}
                <div className="skeleton h-[50px] w-full !rounded-xl mb-4" />

                {/* Actions row */}
                <div className="flex gap-3 mb-3">
                  <div className="skeleton w-[130px] h-14 !rounded-xl" />
                  <div className="skeleton flex-1 h-14 !rounded-xl" />
                  <div className="skeleton w-14 h-14 !rounded-xl" />
                </div>

                {/* Buy it Now */}
                <div className="skeleton h-14 w-full !rounded-xl mb-1" />

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-2 py-5 border-y border-gray-100 my-5">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex flex-col items-center gap-1.5">
                      <div className="skeleton w-9 h-9 !rounded-full" />
                      <div className="skeleton h-3 w-16 !rounded" />
                      <div className="skeleton h-2.5 w-10 !rounded" />
                    </div>
                  ))}
                </div>

                {/* Accordion items */}
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center justify-between py-3.5 border-t border-gray-100 first:border-t-0">
                    <div className="skeleton h-3.5 w-24 !rounded" />
                    <div className="skeleton w-4 h-4 !rounded" />
                  </div>
                ))}

              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /><line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </div>
          <h2 className="text-2xl font-display font-extrabold text-black mb-2">{t('product.not_found')}</h2>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed">
            {t('product.not_found_desc')}
          </p>
          <button
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-black text-white text-sm font-bold hover:bg-gray-800 transition-all duration-200 active:scale-[0.97] shadow-md hover:shadow-lg"
          >
            {t('product.browse')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  const inWishlist = isInWishlist(product.id);
  const discount = product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) : null;

  const handleAddToCart = async () => {
    // Prevent double-clicks while operation is in progress
    if (isAddingToCart) return;
    // Defensive guard: don't allow adding out-of-stock items (button should already be disabled)
    if (!canAddToCart) return;
    setIsAddingToCart(true);

    // Trigger fly-to-cart animation
    flyToCart();

    // Track add to cart event
    trackAddToCart(product.id, product.name, qty, product.price);

    try {
      // Optimistic local update first.
      addItem({ ...product, productId: product.id, quantity: qty, size: selectedSize, color: selectedColor, variantId: matchedVariant?.id || undefined });

      // Guest users: skip server sync to avoid 401 redirect to /login
      if (!isAuthenticated) {
        addedToCart(product.name);
        navigate('/cart');
        return;
      }

      await cartAPI.add({
        productId: product.id,
        quantity: qty,
        size: selectedSize || undefined,
        color: selectedColor || undefined,
        variantId: matchedVariant?.id || undefined,
      });

      addedToCart(product.name);
      navigate('/cart');
    } catch {
      // Local optimistic add already succeeded — server sync failure is silent.
      addedToCart(product.name);
      navigate('/cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const isSizeRequired = product.sizes && product.sizes.length > 0;
  const isColorRequired = product.colors && product.colors.length > 0;
  const hasAllSelections = (!isSizeRequired || selectedSize) && (!isColorRequired || selectedColor);

  // ── Stock calculations ──
  // Simple product (no size/color variants) uses product-level stock
  const isSimpleProduct = !product.sizes?.length && !product.colors?.length;
  // Available stock: variant stock for variant products, product stock for simple
  const availableStock = !isSimpleProduct
    ? (matchedVariant?.quantity ?? 0)
    : (product.quantity ?? 0);
  // Is the selected combination out of stock?
  const isOutOfStock = !isSimpleProduct && matchedVariant && (matchedVariant.quantity || 0) <= 0;
  const isSimpleOutOfStock = isSimpleProduct && (product.quantity || 0) <= 0;
  const isStockUnavailable = isOutOfStock || isSimpleOutOfStock;
  // Low stock threshold
  const isLowStock = !isStockUnavailable && availableStock > 0 && availableStock <= 5;
  // Max selectable quantity
  const maxQty = Math.max(availableStock, 1);

  // Out of Stock badge in heading — covers: simple product with no stock, variant product where all variants OOS
  const showOutOfStockBadge = isSimpleProduct
    ? (product.quantity || 0) <= 0
    : !variantsList.length || variantsList.every(v => (v.quantity || 0) <= 0);

  const variantUnavailable = variantNotFound && hasAllSelections && !isSimpleProduct;
  const canAddToCart = hasAllSelections && !isStockUnavailable && !variantLoading && !variantUnavailable && availableStock > 0;

  const handleWishlist = async () => {
    // Optimistic update first.
    if (inWishlist) removeFromWL(product.id);
    else addToWL(product);

    // Guest users: skip server sync to avoid 401 redirect to /login
    if (!isAuthenticated) {
      if (inWishlist) removedFromWishlist();
      else addedToWishlist();
      return;
    }

    try {
      if (inWishlist) {
        await wishlistAPI.remove(product.id);
        removedFromWishlist();
      } else {
        await wishlistAPI.add({ productId: product.id });
        addedToWishlist();
      }
    } catch {
      // Roll back to previous state (undo the optimistic mutation).
      if (inWishlist) addToWL(product);
      else removeFromWL(product.id);
      wishlistError();
    }
  };

  const toggleAccordion = (section) => {
    setOpenAccordion(openAccordion === section ? '' : section);
  };

  // Deduplicate array while preserving order
  const dedupeArray = (arr) => [...new Set(arr)];

  // ── Gallery images: variant-specific when color/variant selected ──
  const galleryImages = (() => {
    // 1. Matched variant has its own images (both size + color selected)
    if (matchedVariant && Array.isArray(matchedVariant.images) && matchedVariant.images.length > 0) {
      return dedupeArray(matchedVariant.images.map(img => getImageUrl(img)));
    }

    // 2. Only color selected — find variants matching that color
    if (selectedColor && variantsList.length > 0) {
      const colorVariants = variantsList.filter(v => {
        const attrs = v.attributes || {};
        return attrs.color === selectedColor;
      });
      const variantImages = colorVariants
        .flatMap(v => (Array.isArray(v.images) ? v.images : []))
        .filter(Boolean);
      if (variantImages.length > 0) {
        return dedupeArray(variantImages.map(img => getImageUrl(img)));
      }
    }

    // 3. Fallback to main product images
    const images = getProductImages(product);
    const urls = images.length > 0
      ? images.map(img => getImageUrl(img))
      : [getImageUrl(product.imageUrl || product.image || 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80')];
    return dedupeArray(urls);
  })();

  return (
    <div className="bg-gray-50 min-h-screen pb-24 lg:pb-20">
      
      {/* SEO meta tags — prefer custom SEO from backend, fall back to product data */}
      <SEOHead
        title={seoMeta?.metaTitle || `${product.name} — ${product.seoTitle || ''}` || `${product.name} — ${storeName}`}
        description={seoMeta?.metaDescription || product.seoDescription || product.shortDescription || product.description}
        keywords={seoMeta?.metaKeywords || product.seoKeywords || ''}
        image={seoMeta?.ogImage || getImageUrl(getProductImages(product)[0]) || ''}
        ogTitle={seoMeta?.ogTitle}
        ogDescription={seoMeta?.ogDescription}
        canonicalUrl={seoMeta?.canonicalUrl || `${window.location.origin}/products/${product.slug}`}
      />

      {/* Breadcrumbs */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            {
              label: typeof product.category === 'object' ? product.category.name : product.category || 'Products',
              href: typeof product.category === 'object' && product.category.slug
                ? `/products?category=${product.category.slug}`
                : '/products',
            },
            { label: product.name },
          ]}
          variant="light"
        />
      </div>

      {/* Main Product Layout: Split Pane (WovenRevolt Style) */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">
          
          {/* Left Column: Image Gallery */}
          <div className="w-full lg:w-[55%]">
            {/* Main Image Slider — swipeable on all screens */}
            <div ref={flyRef} className="w-full bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm mb-4 relative">
              <div
                ref={mobileGalleryRef}

                className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
                style={{ scrollbarWidth: 'none' }}
              >
                {galleryImages.map((img, idx) => (
                  <div key={idx} className="snap-start shrink-0 w-full aspect-[3/4]">
                    <div className="w-full h-full bg-white relative">
                      <img loading="lazy" src={img}
                        alt={`${product.name} - View ${idx + 1}`}
                        className="w-full h-full object-contain p-2"
                        draggable={false}
                      />
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* Thumbnails — always visible */}
            <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
              {galleryImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSelectedImageIdx(idx);
                    mobileGalleryRef.current?.children[idx]?.scrollIntoView({ behavior: 'smooth', inline: 'start' });
                  }}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                    selectedImageIdx === idx
                      ? 'border-black ring-2 ring-black/20 shadow-lg shadow-black/5 scale-[1.02]'
                      : 'border-gray-200/80 hover:border-gray-400 hover:shadow-md hover:-translate-y-0.5'
                  }`}
                >
                  <img loading="lazy" src={img}
                    alt={`Thumbnail ${idx + 1}`}
                    className={`w-full h-full object-contain p-1 bg-white transition-all duration-300 ${
                      selectedImageIdx === idx ? 'scale-105' : 'hover:scale-110'
                    }`}
                    draggable={false}
                  />
                  {selectedImageIdx === idx && (
                    <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-black rounded-full transition-all duration-200" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Sticky Product Info */}
          <div className="w-full lg:w-[45%] relative">
            <div className="lg:sticky lg:top-24 flex flex-col gap-4 md:gap-6 bg-white p-4 md:p-8 rounded-3xl border border-gray-200/80 shadow-[0_2px_30px_-8px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.02)_inset]">
              
              {/* Header Info */}
              <div>
                <span className="inline-block text-[10px] font-bold text-white bg-black/80 px-3.5 py-1.5 rounded-full uppercase tracking-[0.15em] mb-3 shadow-sm">
                  {typeof product.category === 'object' ? product.category.name : product.category}
                </span>
                <h1 className="text-[22px] md:text-[34px] font-display font-extrabold text-gray-900 leading-[1.15] mb-3 tracking-tight">
                  {product.name}
                </h1>
                {showOutOfStockBadge && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-700 text-[11px] font-bold px-3 py-1.5 rounded-full border border-red-200/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      {t('product.currently_unavailable')}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star size={13} key={i} className={i < Math.floor(product.rating || 5) ? "text-amber-500 fill-amber-500" : "text-gray-200 fill-gray-200"} />
                    ))}
                  </div>
                  <span className="h-3 w-px bg-gray-200" />
                  <span className="text-xs md:text-sm text-gray-500 font-medium">{t('product.reviews', { count: product.reviewCount || 100 })}</span>
                  <span className="h-3 w-px bg-gray-200" />
                  <span className="text-xs md:text-sm text-gray-500 font-medium">{t('product.sold', { count: product.soldCount || '2.5K' })}</span>
                </div>

              </div>

              {/* Flash Sale Badge with Countdown */}
              {activeFlashSale && activeFlashSale.endDate && (
                <div className="flex items-center gap-2 md:gap-3 bg-red-50/80 border border-red-200/60 rounded-xl px-3 md:px-4 py-2.5 md:py-3 -mt-2">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Zap size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] md:text-xs font-bold text-red-700 uppercase tracking-wider">
                        {t('product.flash_sale')}
                      </span>
                      {activeFlashSale.discount && (
                        <span className="text-[10px] md:text-xs font-bold bg-red-600 text-white px-2 py-0.5 rounded-full">
                          {t('product.percent_off', { percent: activeFlashSale.discount })}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] md:text-xs text-red-600 font-semibold mt-0.5 truncate">
                      {activeFlashSale.title}
                    </p>
                  </div>
                  <div className="shrink-0">
                    <FlashSaleCountdown
                      endDate={activeFlashSale.endDate}
                      label=""
                      compact
                      className="text-red-700"
                    />
                  </div>
                </div>
              )}

              {/* Price & Sale Timer */}
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                {matchedVariant && matchedVariant.price != null ? (
                  <>
                    <span className="text-[26px] md:text-[32px] font-display font-extrabold text-black tracking-tight">{formatCurrency(matchedVariant.price)}</span>
                    {product.oldPrice && (
                      <span className="text-sm md:text-lg text-gray-400 line-through font-medium">{formatCurrency(product.oldPrice)}</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-[26px] md:text-[32px] font-display font-extrabold text-black tracking-tight">{formatCurrency(product.price)}</span>
                    {product.oldPrice && (
                      <span className="text-sm md:text-lg text-gray-400 line-through font-medium">{formatCurrency(product.oldPrice)}</span>
                    )}
                    {discount && (
                      <span className="bg-black text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                        {t('product.percent_off', { percent: discount })}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Color Selection */}
              {product.colors && product.colors.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-bold text-black uppercase tracking-wider">{t('product.color')} <span className="text-gray-400 font-normal normal-case">— {selectedColor || t('product.select')}</span></span>
                    {selectedColor && (
                      <button
                        onClick={() => setSelectedColor('')}
                        className="text-xs text-gray-400 hover:text-black underline-offset-2 hover:underline transition-colors"
                      >
                        {t('product.clear')}
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 flex-wrap items-start">
                    {product.colors.map(color => {
                      const colorAvailable = isColorAvailable(color);
                      const isOOS = variantsList.length > 0 && !colorAvailable;
                      const isLow = isColorLowStock(color);
                      const stockCount = getColorStock(color);
                      return (
                        <div key={color} className="flex flex-col items-center gap-1 group/swatch">
                          <button
                            onClick={() => {
                              if (isOOS) return;
                              setSelectedColor(color);
                            }}
                            disabled={isOOS}
                            className={`relative w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                              selectedColor === color
                                ? 'scale-110'
                                : isOOS
                                ? 'opacity-40 cursor-not-allowed'
                                : isLow
                                ? 'scale-105'
                                : 'hover:scale-110 hover:-translate-y-0.5'
                            }`}
                            title={isOOS ? `${color} - ${t('product.out_of_stock')}` : isLow ? `${color} - ${t('product.only_left', { count: stockCount })}` : color}
                          >
                            {/* Selection ring */}
                            <div className={`absolute inset-0 rounded-full transition-all duration-300 ${
                              selectedColor === color
                                ? 'border-2 border-black shadow-lg shadow-black/10'
                                : 'border-2 border-transparent group-hover/swatch:border-gray-300'
                            }`} />
                            {/* Inner color dot */}
                            <div 
                              className={`w-8 h-8 md:w-9 md:h-9 rounded-full border border-black/10 shadow-sm transition-all duration-300 ${
                                selectedColor === color ? 'w-7 h-7' : 'group-hover/swatch:shadow-md'
                              } ${isOOS ? 'opacity-50' : ''}`}
                              style={{ background: getColorHex(color) }}
                            />
                            {isOOS && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" className="w-full h-full text-red-400 opacity-80" fill="none" stroke="currentColor" strokeWidth="1.5">
                                  <line x1="4" y1="4" x2="20" y2="20" />
                                </svg>
                              </span>
                            )}
                            {isLow && !isOOS && (
                              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-400 rounded-full border-[1.5px] border-white flex items-center justify-center shadow-sm">
                                <span className="text-white text-[6px] font-bold">!</span>
                              </span>
                            )}
                          </button>
                          {/* Tooltip on hover */}
                          <span className="text-[9px] font-medium text-gray-400 opacity-0 group-hover/swatch:opacity-100 transition-opacity duration-200 leading-none mt-0.5">
                            {color}
                          </span>
                          {isLow && !isOOS && (
                            <span className="text-[9px] font-semibold text-amber-600 leading-none whitespace-nowrap">
                              {t('product.only_left', { count: stockCount })}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Size Selection */}
              {product.sizes && product.sizes.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-black uppercase tracking-wider">{t('product.size')} <span className="text-gray-400 font-normal normal-case">— {selectedSize || t('product.select')}</span></span>
                    </div>
                    <button onClick={() => setShowSizeGuide(true)} className="text-xs font-bold text-black underline-offset-2 hover:underline transition-colors">{t('product.size_guide')}</button>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {product.sizes.map(size => {
                      const sizeAvailable = isSizeAvailable(size);
                      const isOOS = variantsList.length > 0 && !sizeAvailable;
                      const isLow = isSizeLowStock(size);
                      const stockCount = getSizeStock(size);
                      return (
                        <button
                          key={size}
                          onClick={() => {
                            if (isOOS) return;
                            setSelectedSize(size);
                          }}
                          disabled={isOOS}
                          className={`py-2.5 md:py-3.5 rounded-xl border-2 font-bold text-xs md:text-sm transition-all duration-200 relative active:scale-[0.97] ${
                            selectedSize === size 
                              ? 'border-black bg-black/5 text-black shadow-sm' 
                              : isOOS
                              ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                              : isLow
                              ? 'border-amber-300 bg-amber-50/40 text-black hover:border-amber-400 hover:bg-amber-50/60 hover:shadow-sm'
                              : 'border-gray-200 text-black hover:border-gray-400 hover:bg-gray-50/50 hover:shadow-sm'
                          }`}
                          title={isOOS ? `${size} - Out of Stock` : isLow ? `${size} - Only ${stockCount} left` : size}
                        >
                          <span className="flex flex-col items-center gap-0.5 min-h-[2rem] justify-center">
                            <span>{size}</span>
                            {isLow && !isOOS ? (
                              <span className="text-[9px] font-semibold text-amber-600 leading-none">
                                {stockCount} left
                              </span>
                            ) : (
                              !isOOS && <span className="text-[9px] leading-none invisible">- left</span>
                            )}
                          </span>
                          {isOOS && (
                            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-bold px-1 rounded leading-tight">
                              {t('product.oos')}
                            </span>
                          )}
                          {isLow && !isOOS && selectedSize !== size && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-white" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stock Status — shown only when NOT out of stock (OOS is shown via heading badge) */}
              {!showOutOfStockBadge && (() => {
                // Determine which stock message to show
                if (isSimpleProduct) {
                  if (isLowStock) {
                    return (
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 bg-amber-50/80 border border-amber-200/60 px-4 py-2.5 rounded-xl">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                        <span>{t('product.low_stock', { count: product.quantity })}</span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-4 py-2.5 rounded-xl">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{t('product.in_stock')}</span>
                    </div>
                  );
                }
                if (matchedVariant) {
                  if (isLowStock) {
                    return (
                      <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 bg-amber-50/80 border border-amber-200/60 px-4 py-2.5 rounded-xl">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                        <span>{t('product.low_stock', { count: matchedVariant.quantity })}</span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 px-4 py-2.5 rounded-xl">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span>{t('product.in_stock')}</span>
                    </div>
                  );
                }
                return null;
              })()}
              {/* Variant not found — ask user to pick a different combination */}
              {!isSimpleProduct && variantNotFound && hasAllSelections && (
                <div className="px-4 py-3 rounded-xl bg-red-50/80 text-red-700 text-sm font-semibold flex items-center gap-2.5 border border-red-200/60">
                  <span className="w-5 h-5 rounded-full bg-red-200 flex items-center justify-center">
                    <X size={10} />
                  </span>
                  {t('product.combination_unavailable')}
                </div>
              )}
              {/* Variant loading */}
              {!isSimpleProduct && variantLoading && (
                <div className="px-4 py-3 rounded-xl bg-gray-50 text-sm text-gray-500 font-medium flex items-center gap-2.5 border border-gray-200/60">
                  <div className="spinner w-4 h-4" /> {t('product.checking_availability')}
                </div>
              )}

              {/* Actions: Add to Cart & Wishlist */}
              <div className="flex flex-col gap-3 pt-4">
                <div className="flex gap-3">
                  {/* Quantity */}
                  <div className="flex items-center justify-between border-2 border-gray-200 rounded-xl w-[110px] md:w-[130px] h-12 md:h-14 bg-gray-50/50">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      disabled={qty <= 1}
                      className="px-4 text-gray-400 hover:text-black disabled:text-gray-200 disabled:cursor-not-allowed h-full transition-colors"
                    >
                      <Minus size={18} />
                    </button>
                    <span className="font-bold text-lg w-8 text-center tabular-nums">{qty}</span>
                    <button
                      onClick={() => setQty(qty + 1)}
                      disabled={qty >= maxQty || availableStock <= 0}
                      className={`px-4 h-full transition-colors ${
                        qty >= maxQty || availableStock <= 0
                          ? 'text-gray-200 cursor-not-allowed'
                          : 'text-gray-400 hover:text-black'
                      }`}
                      title={qty >= maxQty ? t('product.max_qty_reached') : t('product.increase_qty')}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  
                  {/* Add to Cart */}
                  <button
                    onClick={handleAddToCart}
                    disabled={!canAddToCart || isAddingToCart}
                    className={`flex-1 h-12 md:h-14 rounded-xl font-bold text-sm md:text-base flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] ${
                      canAddToCart && !isAddingToCart
                        ? 'bg-black text-white hover:bg-gray-800 shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/15'
                        : isStockUnavailable
                        ? 'bg-red-50 text-red-500 cursor-not-allowed border border-red-200/60'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isAddingToCart ? (
                      <><div className="spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> {t('product.adding')}...</>
                    ) : isStockUnavailable ? (
                      <><span>✕</span> {t('product.out_of_stock')}</>
                    ) : variantLoading ? (
                      <><div className="spinner w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full" /> {t('product.checking')}</>
                    ) : variantUnavailable ? (
                      <><span>✕</span> {t('product.unavailable')}</>
                    ) : !hasAllSelections ? (
                      t('product.select_options')
                    ) : (
                      t('product.add_to_bag')
                    )}
                  </button>

                  {/* Wishlist */}
                  <button
                    onClick={handleWishlist}
                    className={`w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 flex items-center justify-center transition-all duration-200 flex-shrink-0 active:scale-90 hover:shadow-sm ${
                      inWishlist ? 'border-black text-black bg-black/5' : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Heart size={22} fill={inWishlist ? 'currentColor' : 'none'} />
                  </button>

                  {/* Share */}
                  <button
                    onClick={handleShare}
                    className="w-12 h-12 md:w-14 md:h-14 rounded-xl border-2 border-gray-200 flex items-center justify-center text-gray-400 transition-all duration-200 flex-shrink-0 active:scale-90 hover:shadow-sm hover:border-gray-400 hover:text-gray-600 hover:bg-gray-50"
                  title={t('product.share_title')}
                >
                    <Share2 size={20} />
                  </button>
                </div>

                <div className="w-full">
                  {/* Buy it Now */}
                  <button
                    onClick={async () => {
                      if (!canAddToCart || isAddingToCart) return;
                      setIsAddingToCart(true);
                      try {
                        addItem({ ...product, productId: product.id, quantity: qty, size: selectedSize, color: selectedColor, variantId: matchedVariant?.id || undefined });
                        if (isAuthenticated) {
                          try {
                            await cartAPI.add({
                              productId: product.id,
                              quantity: qty,
                              size: selectedSize || undefined,
                              color: selectedColor || undefined,
                              variantId: matchedVariant?.id || undefined,
                            });
                          } catch {}
                        }
                        navigate('/checkout');
                      } finally {
                        setIsAddingToCart(false);
                      }
                    }}
                    disabled={!canAddToCart || isAddingToCart}
                    className={`w-full h-12 md:h-14 rounded-xl font-bold text-sm md:text-base transition-all duration-200 active:scale-[0.97] border-2 ${
                      canAddToCart && !isAddingToCart
                        ? 'bg-black text-white hover:bg-gray-800 shadow-md hover:shadow-lg border-black'
                        : isStockUnavailable
                        ? 'bg-red-50 text-red-500 cursor-not-allowed border-red-200/60'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-100'
                    }`}
                  >
                    {isAddingToCart ? `${t('product.adding')}...` : isStockUnavailable ? t('product.out_of_stock') : t('product.buy_now')}
                  </button>
                </div>
              </div>

              {/* Trust Badges */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-3 gap-2 py-5 border-y border-gray-100 my-2"
              >
                {[
                  { icon: Truck, label: t('product.free_shipping'), sub: `${t('product.above_amount', { amount: formatCurrency(Number(freeShippingThreshold)) })}` },
                  { icon: RefreshCw, label: t('product.easy_returns'), sub: t('product.days', { count: 7 }) },
                  { icon: ShieldCheck, label: t('product.secure'), sub: t('product.checkout') },
                ].map((item, i) => {
                  const IconComponent = item.icon;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col items-center text-center gap-1.5 group"
                    >
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-black group-hover:text-white transition-all duration-300">
                        <IconComponent className="w-[15px] h-[15px] transition-transform duration-300 group-hover:scale-110" />
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-gray-600 group-hover:text-black transition-colors duration-300">
                          {item.label}
                        </span>
                        <span className="block text-[9px] text-gray-400">
                          {item.sub}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Offers Section */}
              <OffersSection promotions={flashPromotions} />

              {/* Accordions */}
              <div className="flex flex-col divide-y divide-gray-100">
                {/* Details */}
                <div className="py-1">
                  <button
                    onClick={() => toggleAccordion('details')}
                    className="flex items-center justify-between w-full py-3 md:py-3.5 text-sm font-bold text-black text-left group"
                  >
                    <span className="transition-colors">{t('product.details')}</span>
                    <ChevronDown size={15} className={`text-gray-300 transition-all duration-300 ${openAccordion === 'details' ? 'rotate-180 text-black' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openAccordion === 'details' && (
                      <motion.div
                        key="details"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="text-sm text-gray-600 leading-relaxed pb-4 space-y-3">
                          <p>{product.description || 'Premium streetwear essential designed for ultimate comfort and style.'}</p>
                          <ul className="space-y-2">
                            <li className="flex items-center gap-2.5 text-gray-500"><span className="w-1 h-1 rounded-full bg-gray-400 shrink-0" /> 240 GSM Heavyweight Cotton</li>
                            <li className="flex items-center gap-2.5 text-gray-500"><span className="w-1 h-1 rounded-full bg-gray-400 shrink-0" /> Drop shoulder relaxed fit</li>
                            <li className="flex items-center gap-2.5 text-gray-500"><span className="w-1 h-1 rounded-full bg-gray-400 shrink-0" /> High-density puff print</li>
                            <li className="flex items-center gap-2.5 text-gray-500"><span className="w-1 h-1 rounded-full bg-gray-400 shrink-0" /> Pre-shrunk fabric</li>
                          </ul>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Material & Care */}
                <div className="py-1">
                  <button
                    onClick={() => toggleAccordion('care')}
                    className="flex items-center justify-between w-full py-3 md:py-3.5 text-sm font-bold text-black text-left group"
                  >
                    <span className="transition-colors">{t('product.material_care')}</span>
                    <ChevronDown size={15} className={`text-gray-300 transition-all duration-300 ${openAccordion === 'care' ? 'rotate-180 text-black' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openAccordion === 'care' && (
                      <motion.div
                        key="care"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="text-sm text-gray-600 leading-relaxed pb-4 space-y-2.5">
                          <div className="flex items-start gap-2.5">
                            <Check size={14} />
                            <span>100% Super Combed Cotton</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <Check size={14} />
                            <span>Machine wash cold, inside out</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <Check size={14} />
                            <span>Do not iron directly on print</span>
                          </div>
                          <div className="flex items-start gap-2.5">
                            <Check size={14} />
                            <span>Dry in shade</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Shipping & Returns */}
                <div className="py-1">
                  <button
                    onClick={() => toggleAccordion('shipping')}
                    className="flex items-center justify-between w-full py-3 md:py-3.5 text-sm font-bold text-black text-left group"
                  >
                    <span className="transition-colors">{t('product.shipping_returns')}</span>
                    <ChevronDown size={15} className={`text-gray-300 transition-all duration-300 ${openAccordion === 'shipping' ? 'rotate-180 text-black' : ''}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {openAccordion === 'shipping' && (
                      <motion.div
                        key="shipping"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="text-sm text-gray-600 leading-relaxed pb-4 space-y-3">
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">Shipping</p>
                            <p>Free standard shipping on all orders over {formatCurrency(Number(freeShippingThreshold))}. Orders are dispatched within 24 hours.</p>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-700 mb-1">Returns</p>
                            <p>No questions asked 7-day return policy. Items must be unworn and unwashed with tags intact.</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ── Premium Reviews Section ── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-12 md:mt-16 pt-10 md:pt-16 border-t border-gray-200/80">
          {/* ── Summary Header: compact row on mobile ── */}
          <div className="flex flex-col md:flex-row md:items-start gap-6 md:gap-10 mb-8 md:mb-12">
            {/* Rating + CTA integrated */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 w-full"
            >
              {/* Top row: rating + write button side-by-side on mobile */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-extrabold text-black tracking-tight mb-3 md:mb-4">
                    {t('product.customer_reviews')}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-extrabold text-black leading-none tracking-tight">
                      {product?.rating ? (typeof product.rating === 'number' ? product.rating.toFixed(1) : product.rating) : '4.8'}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex text-amber-400 gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <Star size={14} key={i} className={i < Math.floor(product?.rating || 5) ? 'text-amber-400' : 'text-gray-200'} />
                        ))}
                      </div>
                      <span className="text-[11px] md:text-sm text-gray-500 font-medium whitespace-nowrap">{t('product.reviews', { count: reviews.length })}</span>
                    </div>
                  </div>
                </div>
                {/* Write Review — pill button on mobile, integrated into header */}
                <div className="md:hidden shrink-0 mt-1">
                  <button
                    onClick={() => {
                      if (!isAuthenticated) { navigate('/login'); return; }
                      setShowReviewModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black text-white text-[11px] font-bold hover:bg-gray-800 transition-all duration-200 active:scale-[0.95] shadow-sm"
                  >
                    <MessageCircle size={12} />
                    {t('product.write')}
                  </button>
                </div>
              </div>

              {/* Star breakdown — compact, scrollable row on mobile */}
              <div className="mt-4 md:mt-5 grid grid-cols-5 gap-1.5 md:gap-2 max-w-md">
                {[5,4,3,2,1].map(star => {
                  const count = reviews.filter(r => Math.floor(r.rating || 5) === star).length;
                  const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                  return (
                    <div key={star} className="flex flex-col items-center gap-1 group/bar">
                      <div className="flex items-center gap-0.5">
                        <span className="text-[10px] font-bold text-gray-500 tabular-nums">{star}</span>
                        <Star size={8} />
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: 1 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: (5 - star) * 0.08 }}
                          className="h-full rounded-full bg-amber-400 origin-left group-hover/bar:bg-amber-500 transition-colors duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-gray-400 tabular-nums font-medium">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Write a Review CTA — desktop only */}
            <motion.div
              initial={{ opacity: 0, x: 15 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="hidden md:flex flex-col items-start justify-center bg-white rounded-2xl p-5 lg:p-7 border border-gray-200/80 shadow-sm shrink-0 w-[240px] lg:w-[260px]"
            >
              <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center mb-2.5">
                <MessageCircle size={16} />
              </div>
              <h4 className="text-sm font-bold text-black mb-1">{t('product.share_thoughts')}</h4>
              <p className="text-[11px] text-gray-500 mb-3.5 leading-relaxed">{t('product.help_others')}</p>
              <button
                onClick={() => {
                  if (!isAuthenticated) { navigate('/login'); return; }
                  setShowReviewModal(true);
                }}
                className="px-4 py-2 rounded-xl border-2 border-gray-200 text-[11px] font-bold text-black hover:border-black hover:bg-black/5 transition-all duration-200 active:scale-[0.97] w-full text-center"
              >
                {t('product.write_review')}
              </button>
            </motion.div>
          </div>

          {/* ── Reviews Grid with Premium Photo Cards ── */}
          {reviews.length > 0 ? (
            <ReviewCardsWithImages reviews={reviews} />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center justify-center py-12 md:py-16 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <MessageCircle size={28} />
              </div>
              <h3 className="text-lg font-display font-extrabold text-black mb-1.5">{t('product.no_reviews_yet')}</h3>
              <p className="text-sm text-gray-500 mb-5 max-w-sm">{t('product.no_reviews_desc')}</p>
              <button
                onClick={() => {
                  if (!isAuthenticated) { navigate('/login'); return; }
                  setShowReviewModal(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all duration-200 active:scale-[0.97] shadow-md"
              >
                <Pencil size={16} />
                {t('product.be_first_review')}
              </button>
            </motion.div>
          )}

          {/* View More Reviews */}
          {reviews.length >= 4 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="flex justify-center mt-6 md:mt-8"
            >
              <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-xs font-bold text-black hover:border-black hover:bg-black/5 transition-all duration-200 active:scale-[0.96]">
                {t('product.view_all_reviews', { count: reviews.length })}
                <ChevronDown size={12} />
              </button>
            </motion.div>
          )}
        </div>

      {/* Bottom Grids */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 mt-24 flex flex-col gap-16">
        
        {/* Recommended Products */}
        {recommended.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl md:text-3xl font-display font-extrabold text-black tracking-tight">{t('product.complete_look')}</h2>
            </div>
            <ProductGrid products={recommended} />
          </div>
        )}

        {/* Recently Viewed — Horizontal Scroll Carousel */}
        {recentlyViewed.length > 0 && (
          <RecentlyViewedCarousel products={recentlyViewed.slice(0, 8)} />
        )}

      </div>
      {/* Review Form Modal */}
      <ReviewFormModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        productId={product.id}
        productName={product.name}
        onSuccess={handleReviewSubmitted}
      />

      {/* Size Guide Modal */}
      <SizeGuideModal isOpen={showSizeGuide} onClose={() => setShowSizeGuide(false)} />

      {/* ── Sticky mobile bottom bar ── */}
      <div className="fixed bottom-0 inset-x-0 z-50 block lg:hidden bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <span className="text-lg font-display font-extrabold text-black truncate">
              {matchedVariant && matchedVariant.price != null
                ? formatCurrency(matchedVariant.price)
                : formatCurrency(product.price)}
            </span>
            {product.oldPrice && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 line-through">{formatCurrency(product.oldPrice)}</span>
                {discount && <span className="text-[10px] font-bold text-red-600">{t('product.percent_off', { percent: discount })}</span>}
              </div>
            )}
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!canAddToCart || isAddingToCart}
            className={`flex-1 max-w-[220px] h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.97] ${
              canAddToCart && !isAddingToCart
                ? 'bg-black text-white hover:bg-gray-800 shadow-lg'
                : isStockUnavailable
                ? 'bg-red-100 text-red-500 cursor-not-allowed'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isAddingToCart ? (
              <><div className="spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> {t('product.adding')}</>
            ) : isStockUnavailable ? (
              t('product.out_of_stock')
            ) : variantLoading ? (
              t('product.checking')
            ) : variantUnavailable ? (
              t('product.unavailable')
            ) : !hasAllSelections ? (
              t('product.select_options')
            ) : (
              t('product.add_to_bag')
            )}
          </button>
        </div>
      </div>

      {/* ── Back-to-top button ── */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={scrollToTop}
            className="fixed bottom-24 lg:bottom-8 right-4 lg:right-8 z-50 w-11 h-11 rounded-full bg-black text-white shadow-lg flex items-center justify-center hover:bg-gray-800 transition-colors active:scale-90"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ════════════════════════════════════════ */
/* ── Map API review data to component format ── */
/* ════════════════════════════════════════ */

function mapProductReview(review) {
  const user = review.user || {};
  const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Customer';
  
  // Parse images — could be JSON string or array
  let images = [];
  try {
    if (typeof review.images === 'string') images = JSON.parse(review.images);
    else if (Array.isArray(review.images)) images = review.images;
  } catch { images = []; }
  
  return {
    ...review,
    userName,
    created_at: review.created_at || review.createdAt,
    images,
  };
}

/* ════════════════════════════════════════ */
/* ── Review Cards with Premium Photo Gallery ── */
/* ════════════════════════════════════════ */

function ReviewCardsWithImages({ reviews = [] }) {
  const { t } = useTranslation();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const scrollRef = useRef(null);
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0, moved: false });
  const [isDragActive, setIsDragActive] = useState(false);

  const openLightbox = (images, idx) => {
    setLightboxImages(images);
    setLightboxIndex(idx);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxImages([]);
  };

  /* ── Drag-to-scroll for mobile ── */
  const onDragStart = useCallback((clientX) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { isDragging: true, startX: clientX, scrollLeft: el.scrollLeft, moved: false };
    setIsDragActive(true);
  }, []);

  const onDragMove = useCallback((clientX) => {
    const ds = dragState.current;
    if (!ds.isDragging) return;
    const el = scrollRef.current;
    if (!el) return;
    const delta = clientX - ds.startX;
    if (Math.abs(delta) > 5) ds.moved = true;
    el.scrollLeft = ds.scrollLeft - delta;
  }, []);

  const onDragEnd = useCallback(() => {
    setIsDragActive(false);
    dragState.current.isDragging = false;
    setTimeout(() => { dragState.current.moved = false; }, 50);
  }, []);

  // Prevent click after drag
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handlePreventClick = (e) => {
      if (dragState.current.moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    el.addEventListener('click', handlePreventClick, { capture: true });
    return () => el.removeEventListener('click', handlePreventClick, { capture: true });
  }, []);

  return (
    <>
      {/* Mobile: horizontally scrollable carousel | Desktop: 2-column grid */}
      <div
        ref={scrollRef}
        onMouseDown={(e) => onDragStart(e.clientX)}
        onMouseMove={(e) => onDragMove(e.clientX)}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        onTouchStart={(e) => onDragStart(e.touches[0].clientX)}
        onTouchMove={(e) => onDragMove(e.touches[0].clientX)}
        onTouchEnd={onDragEnd}
        className={`md:grid md:grid-cols-2 md:gap-5 flex md:block gap-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory scroll-smooth pb-2 md:pb-0 no-scrollbar select-none ${isDragActive ? 'cursor-grabbing' : 'cursor-grab md:cursor-default'}`}
        style={{ scrollbarWidth: 'none' }}
      >
        {reviews.map((r, idx) => {
          // Parse images — could be JSON string or array
          let reviewImages = [];
          try {
            if (typeof r.images === 'string') reviewImages = JSON.parse(r.images);
            else if (Array.isArray(r.images)) reviewImages = r.images;
          } catch { reviewImages = []; }
          reviewImages = reviewImages.filter(Boolean);

          return (
            <motion.div
              key={r.id || idx}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.4, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white rounded-xl md:rounded-2xl border border-gray-200/80 shadow-sm hover:shadow-md hover:border-gray-300/50 transition-all duration-300 flex flex-col overflow-hidden group/review snap-start shrink-0 min-w-[80vw] sm:min-w-[380px] md:min-w-0 md:max-w-none"
            >
              {/* Review Images — premium horizontal strip */}
              {reviewImages.length > 0 && (
                <div className="relative">
                  <div className="flex gap-1 overflow-x-auto no-scrollbar px-3.5 sm:px-4 pt-3.5 sm:pt-4 pb-2" style={{ scrollbarWidth: 'none' }}>
                    {reviewImages.slice(0, 5).map((img, imgIdx) => (
                      <button
                        key={imgIdx}
                        onClick={() => openLightbox(reviewImages, imgIdx)}
                        className="relative w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-lg overflow-hidden shrink-0 border border-gray-100 hover:border-gray-300 hover:shadow-md transition-all duration-200 group/img"
                      >
                        <img
                          src={getImageUrl(img)}
                          alt={`Review photo ${imgIdx + 1}`}
                          className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors duration-200" />
                      </button>
                    ))}
                    {reviewImages.length > 5 && (
                      <button
                        onClick={() => openLightbox(reviewImages, 5)}
                        className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 hover:bg-gray-200 transition-colors"
                      >
                        <span className="text-xs font-bold text-gray-500">+{reviewImages.length - 5}</span>
                      </button>
                    )}
                  </div>
                  {/* Gradient fade on edges */}
                  {reviewImages.length > 3 && (
                    <>
                      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent pointer-events-none" />
                      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent pointer-events-none" />
                    </>
                  )}
                </div>
              )}

              {/* Content area */}
              <div className="p-3.5 sm:p-4 md:p-6 flex flex-col gap-2.5">
                {/* Top: stars + verified badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star size={12} key={i} className={i < Math.floor(r.rating || 5) ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
                    ))}
                  </div>
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-200/50">
                    <Check size={6} />
                    {t('product.verified')}
                  </span>
                </div>

                {/* Title */}
                {r.title && (
                  <h4 className="text-xs sm:text-sm font-bold text-black leading-tight">{r.title}</h4>
                )}

                {/* Comment */}
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed line-clamp-3">
                  &ldquo;{r.comment || ''}&rdquo;
                </p>

                {/* Image count badge */}
                {reviewImages.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                    <Image size={12} />
                    {reviewImages.length} {reviewImages.length === 1 ? t('product.photo') : t('product.photos')}
                  </div>
                )}

                {/* User info */}
                <div className="flex items-center gap-2.5 pt-2 border-t border-gray-100 mt-auto">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 text-gray-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                    {(r.userName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-black truncate">{r.userName || t('product.verified_customer')}</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] text-gray-400">{t('product.verified_purchase')}</span>
                      {r.created_at && (
                        <>
                          <span className="text-[7px] text-gray-300">·</span>
                          <span className="text-[9px] text-gray-400">{formatDate(r.created_at)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxOpen && lightboxImages.length > 0 && (
          <ReviewImageLightbox
            images={lightboxImages}
            initialIndex={lightboxIndex}
            onClose={closeLightbox}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Recently Viewed — Horizontal Scroll Carousel ── */
function RecentlyViewedCarousel({ products = [] }) {
  const { t } = useTranslation();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }, []);

  // Add/remove listener for scroll state
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    // Check initial state
    updateScrollState();
    return () => el.removeEventListener('scroll', updateScrollState);
  }, [updateScrollState, products]);

  const scroll = useCallback((direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 280 + 16; // card width + gap
    el.scrollBy({
      left: direction === 'left' ? -cardWidth * 2 : cardWidth * 2,
      behavior: 'smooth',
    });
  }, []);

  return (
    <div className="relative group/carousel">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl md:text-3xl font-display font-extrabold text-black tracking-tight">
          {t('product.recently_viewed')}
        </h2>
        <span className="hidden sm:block text-xs text-gray-400 font-medium">
          {t('product.swipe_scroll')}
        </span>
      </div>

      {/* Scroll Container */}
      <div className="relative">
        {/* Left Edge Fade */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none bg-gradient-to-r from-gray-50 to-transparent transition-opacity duration-300 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Right Edge Fade */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none bg-gradient-to-l from-gray-50 to-transparent transition-opacity duration-300 ${
            canScrollRight ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Left Arrow */}
        <button
          onClick={() => scroll('left')}
          className={`absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-11 md:h-11 rounded-full bg-white shadow-lg border border-gray-200/60 flex items-center justify-center text-gray-700 hover:text-black hover:shadow-xl hover:-translate-y-1/2 hover:scale-105 transition-all duration-200 active:scale-95 ${
            canScrollLeft
              ? 'opacity-0 md:group-hover/carousel:opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
          aria-label={t('product.scroll_left')}
        >
          <ChevronLeft size={18} />
        </button>

        {/* Right Arrow */}
        <button
          onClick={() => scroll('right')}
          className={`absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-11 md:h-11 rounded-full bg-white shadow-lg border border-gray-200/60 flex items-center justify-center text-gray-700 hover:text-black hover:shadow-xl hover:-translate-y-1/2 hover:scale-105 transition-all duration-200 active:scale-95 ${
            canScrollRight
              ? 'opacity-0 md:group-hover/carousel:opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
          aria-label={t('product.scroll_right')}
        >
          <ChevronRight size={18} />
        </button>

        {/* Scrollable Track */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mb-4 no-scrollbar"
          style={{ scrollbarWidth: 'none' }}
        >
          {products.map((p, idx) => (
            <motion.div
              key={p.id || idx}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="snap-start shrink-0"
              style={{ width: 'min(280px, 65vw)' }}
            >
              <ProductCard product={p} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Share2, ShoppingCart, Play, Pause, ChevronLeft, ChevronRight, X, Check, Heart, Image, Volume2, VolumeX, Minus, Plus, ShoppingBag, Crown } from 'lucide-react';
import ReelCard from './ReelCard';
import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

;
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useSettings } from '../../store/useSettings';
import { formatCurrency, getImageUrl, getVideoUrl } from '../../utils/formatters';
import { getColorHex, isLightColor } from '../../utils/constants';
import useWishlistStore from '../../store/wishlistStore';
import useAuthStore from '../../store/authStore';
import { wishlistAPI } from '../../api/wishlist';
import { reelLikesAPI } from '../../api/reelLikes';
import { addedToCart, linkCopied, showError } from '../../utils/toast';
import useCartStore from '../../store/cartStore';
import { cartAPI } from '../../api/cart';

/* ═══════════════════════════════════════════════════════════
   WATCH & BUY — TikTok-style shoppable video reels
   ═══════════════════════════════════════════════════════════ */

function discountPercent(oldPrice, price) {
  if (!oldPrice || !price) return 0;
  const oNum = Number(oldPrice);
  const pNum = Number(price);
  if (!oNum || !pNum) return 0;
  return Math.round(((oNum - pNum) / oNum) * 100);
}

function getReelBadge(reel, fallback = 'THREVOLT') {
  // Per-reel badge set from admin wins; fall back to the linked product's badge
  return reel?.badge || reel?.products?.[0]?.badge || fallback;
}

function isYouTubeUrl(url) {
  if (!url) return false;
  return /youtube\.com\/shorts\//i.test(url) || /youtube\.com\/watch\?v=/i.test(url) || /youtu\.be\//i.test(url);
}

function isUnsupportedVideoUrl(url) {
  // YouTube, Vimeo, and other embedded video URLs can't play in <video> elements
  if (!url) return false;
  return isYouTubeUrl(url) || /vimeo\.com\//i.test(url) || /dailymotion\.com\//i.test(url);
}

/* ── Shared variant extraction helper ── */
function extractVariantData(variants, selectedColor = '', selectedSize = '') {
  const pv = variants || [];
  const hasVariants = pv.length > 0;

  // Extract unique colors and sizes
  const cSet = new Set();
  const sSet = new Set();
  pv.forEach(v => {
    if (v.attributes?.color) cSet.add(v.attributes.color);
    if (v.attributes?.size) sSet.add(v.attributes.size);
  });
  const colors = cSet.size > 0 ? [...cSet] : [];
  const sizes = sSet.size > 0 ? [...sSet] : [];

  // Compute OOS (out-of-stock) colors and sizes
  const oosColors = new Set();
  const oosSizes = new Set();
  colors.forEach(c => {
    if (!pv.some(v => v.attributes?.color === c && (v.quantity || 0) > 0)) oosColors.add(c);
  });
  sizes.forEach(s => {
    if (!pv.some(v => v.attributes?.size === s && (v.quantity || 0) > 0)) oosSizes.add(s);
  });

  // Find matched variant based on selected color/size
  const matched = pv.find(v =>
    (!colors.length || v.attributes?.color === selectedColor) &&
    (!sizes.length || v.attributes?.size === selectedSize)
  ) || null;

  // Find first available variant (for auto-selecting defaults)
  const firstAvailable = pv.find(v => (v.quantity || 0) > 0) || pv[0] || null;

  // Check if all required selections are made
  const allSelected = (!colors.length || selectedColor) && (!sizes.length || selectedSize);

  return {
    colors,
    sizes,
    oosColors,
    oosSizes,
    matched,
    firstAvailable,
    allSelected,
    hasVariants,
  };
}

/* ── Per-color thumbnail from the variant's first image (set in admin),
     falling back to a solid color swatch when no variant image exists. ── */
function getColorThumb(color, variants) {
  const pv = variants || [];
  const v = pv.find(x => (x.attributes || {}).color === color && Array.isArray(x.images) && x.images.length > 0);
  const img = v?.images?.[0];
  return typeof img === 'string' ? getImageUrl(img) : null;
}

/* ── Skeleton ── */
function ReelsSectionSkeleton() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="w-52 h-9 bg-gray-200 rounded mx-auto animate-pulse mb-3" />
          <div className="w-64 h-3 bg-gray-100 rounded mx-auto animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[150px] sm:w-[200px] xl:w-[240px]">
              <div className="bg-gray-100 overflow-hidden">
                <div className="aspect-[9/16] bg-gray-200 animate-pulse" />
                <div className="p-3 space-y-2 bg-white">
                  <div className="w-full h-3 bg-gray-100 rounded animate-pulse" />
                  <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   EXPORT
   ═══════════════════════════════════════════════════════════ */
export default function ReelsSection({ reels: _reelsProp = [], loading = false }) {
  const reels = Array.isArray(_reelsProp) ? _reelsProp : [];
  if (loading) return <ReelsSectionSkeleton />;
  if (reels.length === 0) return null;
  return <FashionShowcase reels={reels} />;
}

/* ═══════════════════════════════════════════════════════════
   1. HOMEPAGE CAROUSEL
   ═══════════════════════════════════════════════════════════ */
function FashionShowcase({ reels }) {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const { isAuthenticated } = useAuthStore();
  const { isInWishlist, addItem: addToWL, removeItem: removeFromWL } = useWishlistStore();
  const [justAdded, setJustAdded] = useState(null);
  const [activeReelIndex, setActiveReelIndex] = useState(null);
  
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const justAddedTimer = useRef(null);
  // ── Only the in-view reel's video plays (off-screen videos are paused) ──
  const videoRefs = useRef({});
  const [inViewReelId, setInViewReelId] = useState(null);
  // ── Mobile swipe affordance — hides once the user interacts ──
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  // ── Auto-scroll (same as the product carousel) — works on mobile too ──
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);
  const autoplayRef = useRef(null);
  const autoplayRestartRef = useRef(null);
  // ── Mobile peek carousel: track which card is centered ──
  const [mobileCenterIdx, setMobileCenterIdx] = useState(0);

  // ── Infinite loop: duplicate the reel set so the carousel can scroll
  //    forever and fold back invisibly at the copy boundary (like the
  //    desktop New Arrivals carousel), instead of visibly jumping to 0. ──
  const isLoop = reels.length > 1;
  const [loopCopies, setLoopCopies] = useState(2);
  const loopReels = isLoop
    ? Array.from({ length: Math.max(2, loopCopies) }, () => reels).flat()
    : reels;

  // Width of a single copy of the reel set (the seamless wrap point)
  const getCopyWidth = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return 0;
    const cards = el.querySelectorAll('.reel-card');
    if (!cards.length || cards.length < reels.length * 2) return 0;
    return cards[reels.length].offsetLeft - cards[0].offsetLeft;
  }, [reels.length]);

  // Viewport-aware copy count: the track must always be able to scroll a full
  // copy width past the wrap point, otherwise the invisible fold-back can't
  // fire and the carousel visibly stops at the end of the duplicated set.
  useEffect(() => {
    if (!isLoop) return;
    const el = scrollRef.current;
    if (!el) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const cards = el.querySelectorAll('.reel-card');
      if (!cards.length || cards.length < reels.length * 2) return;
      const cw = cards[reels.length].offsetLeft - cards[0].offsetLeft;
      if (cw <= 0) return;
      // Actual gap between adjacent cards
      const period = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : cw / reels.length;
      const gap = Math.max(0, period - (cards[0].offsetWidth || period));
      const clientW = el.clientWidth || window.innerWidth;
      setLoopCopies(Math.max(2, Math.ceil((clientW + gap) / cw) + 1));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    const t = setTimeout(measure, 250);
    return () => {
      disposed = true;
      ro.disconnect();
      window.removeEventListener('resize', measure);
      clearTimeout(t);
    };
  }, [isLoop, reels.length]);
  
  // ── Reel-level like state (seeded from backend likesCount / isLikedByUser) ──
  const [reelLikeMap, setReelLikeMap] = useState({});
  // Ref mirror so rapid taps always read the freshest liked state (avoids stale-closure toggles)
  const reelLikeMapRef = useRef({});
  useEffect(() => {
    const map = {};
    (Array.isArray(reels) ? reels : []).forEach((r) => {
      map[r.id] = { liked: !!r.isLikedByUser, count: Number(r.likesCount) || 0 };
    });
    reelLikeMapRef.current = map;
    setReelLikeMap(map);
  }, [reels]);

  // Get the first product from a reel for wishlist checking
  const getProductFromReel = useCallback((reel) => {
    return reel?.products?.[0] || null;
  }, []);

  const cartAddItem = useCartStore((s) => s.addItem);

  const addToCart = useCallback((productId, color, size, variantId, qty = 1) => {
    if (!productId) return;
    const quantity = Math.max(1, qty || 1);
    // Visual feedback in reel section
    setJustAdded(productId);
    if (justAddedTimer.current) clearTimeout(justAddedTimer.current);
    justAddedTimer.current = setTimeout(() => setJustAdded(null), 1500);

    // Add to real cart store
    const product = reels.flatMap(r => r.products || []).find(p => p.id === productId);
    if (product) {
      cartAddItem({
        id: productId,
        productId,
        name: product.name,
        price: variantId
          ? product.variants?.find(v => v.id === variantId)?.price ?? product.price
          : product.price,
        image: product.image_url,
        quantity,
        size,
        color,
        variantId,
      });
      addedToCart(product.name);
    }

    // Sync with backend if authenticated
    if (isAuthenticated) {
      cartAPI.add({ productId, quantity, size, color }).catch(() => {});
    }
  }, [isAuthenticated, reels, cartAddItem]);

  const handleShare = useCallback(async (reel) => {
    // Reel-specific deep link: current URL + ?reel=<id> (preserving existing query params)
    const url = new URL(window.location.href);
    if (reel?.id) url.searchParams.set('reel', reel.id);
    const shareUrl = url.toString();
    const shareText = `Check out "${reel?.title || 'this reel'}" at ${window.location.host}!`;
    try {
      if (navigator.share) {
        await navigator.share({ title: reel?.title || 'Luxe Reel', text: shareText, url: shareUrl });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
        linkCopied();
        return;
      }
      showError(t('reels.share_error'));
    } catch (err) {
      // User cancelled the native share sheet — that's fine
      if (err?.name === 'AbortError') return;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
          linkCopied();
        } else {
          showError(t('reels.share_error'));
        }
      } catch {
        showError(t('reels.share_error'));
      }
    }
  }, [t]);

  // ── Reel-level like toggle (optimistic + backend sync + toast feedback) ──
  // Keeps the reel-like state AND the linked product's wishlist in sync so the
  // carousel heart and the player heart always agree.
  const toggleReelLike = useCallback(async (reel) => {
    if (!reel?.id) return;
    const cur = reelLikeMapRef.current[reel.id] || { liked: false, count: 0 };
    const nextLiked = !cur.liked;
    // Optimistic UI update (ref kept in sync so rapid taps toggle once, never double-fire)
    const next = {
      ...reelLikeMapRef.current,
      [reel.id]: { liked: nextLiked, count: Math.max(0, cur.count + (nextLiked ? 1 : -1)) },
    };
    reelLikeMapRef.current = next;
    setReelLikeMap(next);

    // Keep the linked product's wishlist in sync (silent, same behaviour as before)
    const product = getProductFromReel(reel);
    const productId = product?.id;
    if (productId) {
      const inWishlistNow = isInWishlist(productId);
      if (inWishlistNow) {
        removeFromWL(productId);
        if (isAuthenticated) wishlistAPI.remove(productId).catch(() => {});
      } else {
        addToWL(product);
        if (isAuthenticated) wishlistAPI.add({ productId }).catch(() => {});
      }
    }

    // Sync reel like with backend (only for authenticated users)
    if (!isAuthenticated) return;
    try {
      if (nextLiked) await reelLikesAPI.like(reel.id);
      else await reelLikesAPI.unlike(reel.id);
    } catch {
      // Revert optimistic update on failure (derived from current ref state)
      const current = reelLikeMapRef.current[reel.id] || { liked: nextLiked, count: 0 };
      const reverted = {
        ...reelLikeMapRef.current,
        [reel.id]: { liked: !current.liked, count: Math.max(0, current.count + (current.liked ? -1 : 1)) },
      };
      reelLikeMapRef.current = reverted;
      setReelLikeMap(reverted);
      showError(t('reels.like_error'));
    }
  }, [isAuthenticated, t, isInWishlist, addToWL, removeFromWL, getProductFromReel]);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    if (!scrollRef.current) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(scrollRef.current);
    const el = scrollRef.current;
    el.addEventListener('scroll', updateScrollState, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener('scroll', updateScrollState); };
  }, [updateScrollState]);

  // Scroll by an amount, invisibly folding back at the copy boundary so the
  // carousel loops forever instead of hitting a dead end (desktop New Arrivals style).
  const advanceBy = useCallback((amount) => {
    const el = scrollRef.current;
    if (!el || typeof el.scrollBy !== 'function') return;
    const cw = getCopyWidth();
    if (cw > 0) {
      const s = el.scrollLeft;
      // Forward past the copy boundary → fold back (identical content → invisible)
      if (amount > 0 && s >= cw - 4) {
        el.scrollLeft = s - cw;
      }
      // Backward before the start → fold forward into the previous copy
      if (amount < 0 && s <= 4) {
        el.scrollLeft = s + cw;
      }
      el.scrollBy({ left: amount, behavior: 'smooth' });
      return;
    }
    // No loop (single reel) — plain scroll with a hard fallback
    const maxScroll = el.scrollWidth - el.clientWidth;
    const target = Math.max(0, Math.min(el.scrollLeft + amount, maxScroll));
    if (typeof el.scrollTo === 'function') el.scrollTo({ left: target, behavior: 'smooth' });
  }, [getCopyWidth]);

  const scrollGallery = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('.reel-card');
    const w = card?.offsetWidth || 220;
    advanceBy((w + 16) * (dir === 'left' ? -2 : 2));
  };

  /* ── Auto-scroll: advance one reel at a time; loops seamlessly forever. ── */
  const scrollOneReel = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('.reel-card');
    const w = card?.offsetWidth || 220;
    advanceBy(w + 16);
  }, [advanceBy]);

  const startAutoplay = useCallback(() => {
    if (autoplayRestartRef.current) {
      clearTimeout(autoplayRestartRef.current);
      autoplayRestartRef.current = null;
    }
    if (autoplayRef.current) return;
    if (reels.length <= 1 || activeReelIndex !== null || isCarouselHovered) return;
    autoplayRef.current = setInterval(scrollOneReel, 5000);
  }, [reels.length, activeReelIndex, isCarouselHovered, scrollOneReel]);

  const pauseAutoplay = useCallback((restartDelay = 0) => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
    if (autoplayRestartRef.current) {
      clearTimeout(autoplayRestartRef.current);
      autoplayRestartRef.current = null;
    }
    if (restartDelay > 0) {
      autoplayRestartRef.current = setTimeout(startAutoplay, restartDelay);
    }
  }, [startAutoplay]);

  // Pause briefly after the user manually scrolls / drags / touches the carousel
  const handleTrackInteraction = useCallback(() => {
    pauseAutoplay(6000);
    setShowSwipeHint(false);
  }, [pauseAutoplay]);

  // ── Play only the most-visible reel's video; pause the rest (battery/data win) ──
  useEffect(() => {
    const el = scrollRef.current;
    // Stale video refs are cleaned automatically — React calls each card's ref
    // with null on unmount, and the play/pause loop skips null entries.
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInViewReelId(loopReels[0] ? `${loopReels[0].id}-0` : null);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible.length > 0) setInViewReelId(visible[0].target.dataset.reelId);
      },
      { root: el, threshold: [0.4, 0.6, 0.8] }
    );
    el.querySelectorAll('.reel-card').forEach((c) => io.observe(c));
    return () => io.disconnect();
  }, [reels, loopReels.length]);

  // Play the in-view reel's video; pause everything else (and everything while
  // the fullscreen player is open — it renders over this carousel).
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([id, v]) => {
      if (!v) return;
      if (activeReelIndex === null && id === String(inViewReelId)) v.play().catch(() => {});
      else v.pause();
    });
  }, [inViewReelId, reels, activeReelIndex]);

  // Only auto-scroll while the carousel is actually on screen
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      startAutoplay();
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) startAutoplay();
      else pauseAutoplay();
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [startAutoplay, pauseAutoplay]);

  // Restart / pause when the player opens/closes, hover state, or reel count changes
  useEffect(() => {
    if (activeReelIndex !== null || isCarouselHovered || reels.length <= 1) {
      pauseAutoplay();
    } else {
      startAutoplay();
    }
  }, [activeReelIndex, isCarouselHovered, reels.length, startAutoplay, pauseAutoplay]);

  // Reset the fold position whenever the duplicated set re-renders (copy count
  // changes on resize) so the carousel never lands stuck past the wrap point.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cw = getCopyWidth();
    if (cw > 0 && el.scrollLeft >= cw) {
      el.scrollLeft = el.scrollLeft % cw;
    }
  }, [loopCopies, getCopyWidth]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      if (autoplayRestartRef.current) clearTimeout(autoplayRestartRef.current);
    };
  }, []);

  const openReel = useCallback((idx) => setActiveReelIndex(idx), []);
  const closeReel = useCallback(() => setActiveReelIndex(null), []);

  // ── Deep-link: auto-open the exact reel shared via ?reel=<id> ──
  // Consumes the param after opening so closing/refreshing doesn't re-open it.
  useEffect(() => {
    if (!Array.isArray(reels) || reels.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const reelId = params.get('reel');
    if (!reelId) return;
    const idx = reels.findIndex((r) => String(r?.id) === String(reelId));
    if (idx < 0) return;
    // Consume the deep link so closing/refreshing doesn't re-open it
    params.delete('reel');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    openReel(idx);
  }, [reels, openReel]);


  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 md:mb-10"
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-gray-200 pb-4 md:pb-5">
            <div className="min-w-0">
              <p className="flex items-center gap-2.5 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400 mb-2.5">
                <span className="w-8 h-px bg-gray-300" />
                {t('reels.shop_the_look')}
              </p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-extrabold tracking-tight text-gray-900 leading-[1.1]">
                {t('reels.watch_and_buy')}
              </h2>
            </div>
            <Link
              to="/watch-and-buy"
              className="hidden md:inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-900 group shrink-0 pb-0.5"
            >
              <span className="border-b border-gray-900 pb-0.5 transition-colors duration-300 group-hover:border-gray-300">
                {t('reels.view_all')}
              </span>
              <ChevronRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>

        <div
          className="relative group"
          onMouseEnter={() => setIsCarouselHovered(true)}
          onMouseLeave={() => setIsCarouselHovered(false)}
        >
          {/* Desktop arrows */}
          {reels.length > 1 && (
            <button onClick={() => scrollGallery('left')}
              disabled={!canScrollLeft}
              aria-label="Scroll reels left"
              className="hidden sm:flex absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center text-gray-600 hover:bg-gray-50 hover:scale-105 transition-all active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:scale-100">
              <ChevronLeft size={16} />
            </button>
          )}
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 sm:pb-2 max-sm:pb-0 max-sm:px-[calc(50vw-75px)] max-sm:snap-center max-sm:[scroll-snap-type:x_mandatory] sm:max-sm:gap-3"
            style={{ scrollPaddingInline: 'max(0px, calc(50vw - 75px))' }}
            onScroll={(e) => {
              handleTrackInteraction();
              // Detect centered card on mobile
              const el = e.currentTarget;
              const cards = el.querySelectorAll('.reel-card');
              const containerCenter = el.scrollLeft + el.clientWidth / 2;
              let closestIdx = 0;
              let closestDist = Infinity;
              cards.forEach((card, i) => {
                const cardCenter = card.offsetLeft + card.offsetWidth / 2;
                const dist = Math.abs(cardCenter - containerCenter);
                if (dist < closestDist) { closestDist = dist; closestIdx = i; }
              });
              setMobileCenterIdx(closestIdx);
            }}
            onPointerDown={handleTrackInteraction}
            onWheel={handleTrackInteraction}
            onTouchStart={handleTrackInteraction}
          >
            {loopReels.map((reel, idx) => {
              const realIdx = idx % reels.length;
              // Mobile peek: center card full scale, side cards dim + smaller
              const dist = Math.abs(idx - mobileCenterIdx);
              const mobileScale = dist === 0 ? 1 : dist === 1 ? 0.85 : 0.7;
              const mobileOpacity = dist === 0 ? 1 : dist === 1 ? 0.7 : 0.4;
              return (
                <ReelCard
                  key={`${reel.id}-${idx}`}
                  reel={reel}
                  index={realIdx}
                  instanceKey={`${reel.id}-${idx}`}
                  skipEntrance={idx >= reels.length}
                  widthClass="w-[150px] sm:w-[200px] xl:w-[240px]"
                  mobileStyle={{
                    transform: `scale(${mobileScale})`,
                    opacity: mobileOpacity,
                    transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1), opacity 0.35s ease',
                    transformOrigin: 'center center',
                  }}
                  onOpen={() => openReel(realIdx)}
                  badgeFallback={getSetting('storeName', 'THREVOLT')}
                  liked={!!reelLikeMap[reel.id]?.liked}
                  onToggleLike={() => toggleReelLike(reel)}
                  onAddToCart={(product, opts) => addToCart(product.id, opts?.color, opts?.size, opts?.variantId, opts?.qty || 1)}
                  registerVideoRef={(id, el) => { videoRefs.current[id] = el; }}
                />
              );
            })}
          </div>
          {/* Desktop arrows right */}
          {reels.length > 1 && (
            <button onClick={() => scrollGallery('right')}
              disabled={!canScrollRight}
              aria-label="Scroll reels right"
              className="hidden sm:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-lg border border-gray-200 items-center justify-center text-gray-600 hover:bg-gray-50 hover:scale-105 transition-all active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:scale-100">
              <ChevronRight size={16} />
            </button>
          )}
        </div>

        {/* Mobile dot indicators */}
        {reels.length > 1 && (
          <div className="flex sm:hidden items-center justify-center gap-1.5 mt-3">
            {reels.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  const el = scrollRef.current;
                  if (!el) return;
                  const cards = el.querySelectorAll('.reel-card');
                  if (cards[i]) cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }}
                className={`rounded-full transition-all duration-300 ${
                  i === (mobileCenterIdx % reels.length)
                    ? 'w-5 h-1.5 bg-gray-900'
                    : 'w-1.5 h-1.5 bg-gray-300'
                }`} aria-label={`Go to reel ${i + 1}`} />
            ))}
          </div>
        )}


      </div>

      {createPortal(
        <AnimatePresence>
          {activeReelIndex !== null && (
            <ReelPlayer reels={reels} initialIndex={activeReelIndex} onClose={closeReel}
              justAdded={justAdded}
              reelLikes={reelLikeMap} onToggleLike={toggleReelLike} onAddToCart={addToCart} onShare={handleShare} />
          )}
        </AnimatePresence>,
        document.body
      )}

      <style>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .reel-video { width: 100%; height: 100%; object-fit: cover; }
      `}</style>
    </section>
  );
}

/* ═══════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════ */
const SWIPE_THRESHOLD = 80;
const SWIPE_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const SWIPE_DURATION = 0.35;
const SWIPE_TRANSITION = `transform ${SWIPE_DURATION}s ${SWIPE_EASE}`;

/* ═══════════════════════════════════════════════════════════
   2. REEL PLAYER — TikTok/Whatmore-style
   ═══════════════════════════════════════════════════════════ */
function ReelPlayer({
  reels, initialIndex, onClose,
  justAdded,
  reelLikes, onToggleLike, onAddToCart, onShare,
}) {
  const { t } = useTranslation();
  const [reelIndex, setReelIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showProductCard, setShowProductCard] = useState(true);
  const [isSwiping, setIsSwiping] = useState(false);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [variantQty, setVariantQty] = useState(1);
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [showTapOverlay, setShowTapOverlay] = useState(false);
  const [tapIconIsPlay, setTapIconIsPlay] = useState(false);
  const tapOverlayTimer = useRef(null);

  // Swipe refs
  const swipeStart = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const swipeOffsetRef = useRef(0);
  const contentRef = useRef(null);
  const videoRef = useRef(null);
  const autoAdvanceTimer = useRef(null);

  const reel = reels[reelIndex];
  const total = reels.length;
  const products = reel?.products || [];
  const selectedProduct = products[0] || null;

  // ── Variant computation from selected product ──
  const variantData = extractVariantData(selectedProduct?.variants, selectedColor, selectedSize);
  const { colors, sizes, oosColors, oosSizes, matched: matchedVariant, firstAvailable: firstAvailVariant, hasVariants, allSelected: hasAllVariantSelections } = variantData;
  const hasSelectableOptions = colors.length > 0 || sizes.length > 0;

  // Drag-down-to-close: close player when swiping down on first reel
  const shouldCloseOnSwipeDown = reelIndex === 0;

  useEffect(() => {
    setShowProductCard(true);
    setSelectedColor('');
    setSelectedSize('');
    setShowVariantModal(false);
    setVariantQty(1);
    setIsAddingVariant(false);
    setShowTapOverlay(false);
    if (tapOverlayTimer.current) clearTimeout(tapOverlayTimer.current);

    swipeOffsetRef.current = 0;
    if (contentRef.current) {
      contentRef.current.style.transition = 'none';
      contentRef.current.style.transform = 'translateY(0px)';
    }
  }, [reelIndex]);

  /* ── Video ── */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) video.play().catch(() => {});
    else video.pause();
  }, [isPlaying, reelIndex]);

  useEffect(() => {
    setIsPlaying(true);
    setVideoReady(false);
    setVideoError(false);
  }, [reelIndex]);

  /* ── Navigation ── */
  const goNext = useCallback(() => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    setReelIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
  }, [total]);

  const goPrev = useCallback(() => {
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    setReelIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
  }, [total]);

  /* ── Keyboard ── */
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    const arrows = (e) => {
      if (e.key === 'ArrowUp') { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', esc);
    window.addEventListener('keydown', arrows);
    return () => { window.removeEventListener('keydown', esc); window.removeEventListener('keydown', arrows); };
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.body.setAttribute('data-reel-player', 'active');
    return () => {
      document.body.style.overflow = '';
      document.body.removeAttribute('data-reel-player');
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      if (tapOverlayTimer.current) clearTimeout(tapOverlayTimer.current);
    };
  }, []);

  // Toggle play/pause + show the animated tap overlay
  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
    setTapIconIsPlay(!isPlaying);
    setShowTapOverlay(true);
    if (tapOverlayTimer.current) clearTimeout(tapOverlayTimer.current);
    tapOverlayTimer.current = setTimeout(() => setShowTapOverlay(false), 600);
  }, [isPlaying]);

  const toggleMute = useCallback((e) => { e.stopPropagation(); setIsMuted((m) => !m); }, []);

  /* ══════════════════════════════════════════════════════════
     SWIPE HANDLERS — TikTok/Whatmore-style
     Uses pointer capture + transitionend for pixel-perfect timing
     ══════════════════════════════════════════════════════════ */
  const getCardHeight = useCallback(() => {
    if (contentRef.current) {
      const card = contentRef.current.parentElement;
      return card?.clientHeight || window.innerHeight;
    }
    return window.innerHeight;
  }, []);

  const animateTo = useCallback((el, y, transition, onDone) => {
    if (transition) el.style.transition = transition;
    else el.style.transition = 'none';
    el.style.transform = `translateY(${y}px)`;

    if (onDone) {
      if (transition) {
        let done = false;
        const wrapped = () => { if (!done) { done = true; onDone(); } };
        el.addEventListener('transitionend', wrapped, { once: true });
        setTimeout(wrapped, (SWIPE_DURATION * 1000) + 100);
      } else {
        requestAnimationFrame(onDone);
      }
    }
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (isSwiping) return;
    if (e.button !== 0) return;
    // Don't capture pointer on interactive elements — let buttons work normally
    if (e.target.closest('button, [role="button"], a, input, select, textarea')) return;
    // Capture pointer for reliable tracking even if finger leaves the element
    e.currentTarget.setPointerCapture(e.pointerId);

    isDragging.current = true;
    swipeStart.current = { x: e.clientX, y: e.clientY };
    swipeOffsetRef.current = 0;
    if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);

    if (contentRef.current) {
      contentRef.current.style.transition = 'none';
    }
  }, [isSwiping]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;

    // Track the gesture only (tap-vs-swipe detection); never translate the
    // reel content. Grabbing the item and dragging up/down must not make it
    // follow the finger — it would just wobble inside the player and snap
    // back (the swipe-nav handler was never wired up), which users reported
    // as broken behavior.
    const dy = e.clientY - swipeStart.current.y;
    swipeOffsetRef.current = dy;
  }, []);

  const handlePointerUp = useCallback((e) => {
    if (!isDragging.current) return;
    isDragging.current = false;

    // Release pointer capture
    try { e?.currentTarget?.releasePointerCapture?.(e.pointerId); } catch {}

    const offset = swipeOffsetRef.current;
    swipeOffsetRef.current = 0;
    const el = contentRef.current;
    if (!el) return;

    if (Math.abs(offset) > SWIPE_THRESHOLD) {
      const direction = offset > 0 ? 1 : -1;

      // ── DRAG DOWN TO CLOSE: On first reel, swipe down closes the player ──
      if (direction > 0 && shouldCloseOnSwipeDown) {
        setIsSwiping(true);
        const cardHeight = getCardHeight();
        animateTo(el, cardHeight, SWIPE_TRANSITION, () => {
          onClose();
        });
        return;
      }

      // ── PAST THRESHOLD: TikTok-style off-screen → switch → on-screen ──
      setIsSwiping(true);
      const cardHeight = getCardHeight();
      const targetY = direction * cardHeight;

      // 1. Animate current content off-screen
      animateTo(el, targetY, SWIPE_TRANSITION, () => {
        // 2. Switch reel
        if (direction > 0) goPrev();
        else goNext();

        // 3. On next frame, position new content from opposite side
        requestAnimationFrame(() => {
          animateTo(el, -targetY, null, () => {
            // 4. Animate new content on-screen
            requestAnimationFrame(() => {
              animateTo(el, 0, SWIPE_TRANSITION, () => {
                setIsSwiping(false);
              });
            });
          });
        });
      });
    } else {
      // ── BELOW THRESHOLD: Snap back ──
      animateTo(el, 0, SWIPE_TRANSITION);
    }
  }, [getCardHeight, goPrev, goNext, animateTo, setIsSwiping, shouldCloseOnSwipeDown, onClose]);

  // A genuine tap (press + release, no movement) on the video toggles play/pause.
  // setPointerCapture above retargets the click away from the <video>, so the
  // video's onClick can never fire — detect the tap here instead.
  // pointercancel is NOT a tap (OS gesture/scroll-steal) — never toggle there.
  const handlePointerUpTap = useCallback((e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    try { e?.currentTarget?.releasePointerCapture?.(e.pointerId); } catch {}
    const offset = swipeOffsetRef.current;
    swipeOffsetRef.current = 0;
    const el = contentRef.current;
    if (!el) return;
    if (Math.abs(offset) <= SWIPE_THRESHOLD) togglePlayPause();
    animateTo(el, 0, SWIPE_TRANSITION);
  }, [togglePlayPause]);

  const handlePointerCancel = useCallback((e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    try { e?.currentTarget?.releasePointerCapture?.(e.pointerId); } catch {}
    swipeOffsetRef.current = 0;
    const el = contentRef.current;
    if (!el) return;
    animateTo(el, 0, SWIPE_TRANSITION);
  }, []);

  const reelLike = reelLikes?.[reel?.id] || { liked: false, count: 0 };
  const isLiked = !!reelLike.liked;
  const isAddingProduct = justAdded === selectedProduct?.id;

  if (!reel) return null;

  const prodName = selectedProduct?.name || reel.title || '';
  const prodPrice = selectedProduct?.price ?? null;
  const prodOld = selectedProduct?.old_price ?? null;
  const prodImg = selectedProduct?.image_url ? getImageUrl(selectedProduct.image_url) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: 200 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-50 bg-black overflow-hidden"
    >
      {/* Clickable overlay to close player (desktop: clicking outside center card) */}
      <div className="absolute inset-0 z-0" onClick={onClose} />
      <div className="relative w-full h-full md:flex md:items-center md:justify-center md:gap-4 max-sm:flex max-sm:flex-col z-10">

        {/* Prev peek */}
        <motion.div key={`prev-${reelIndex}`}
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="hidden md:block relative w-[120px] lg:w-[150px] aspect-[9/16] rounded-2xl overflow-hidden shadow-lg opacity-40 scale-[0.85] shrink-0 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}>
          <video src={getVideoUrl(reels[(reelIndex > 0 ? reelIndex - 1 : total - 1)]?.videoUrl || reels[0]?.videoUrl)} muted loop playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ChevronLeft size={20} />
          </div>
        </motion.div>

        {/* ── CENTER CARD ── */}
        <div className="relative flex-1 md:flex-none md:w-[min(340px,45vh)] lg:w-[min(380px,48vh)] h-full md:h-auto md:aspect-[9/16] overflow-hidden md:rounded-2xl shadow-2xl md:border md:border-white/10 bg-gray-900"
          onClick={(e) => e.stopPropagation()}>

          {/* ── SWIPE LAYER ── */}
          <div ref={contentRef}
            className="absolute inset-0 z-[5]"
            style={{ willChange: 'transform', touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpTap}
            onPointerCancel={handlePointerCancel}>

            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
              <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/[0.04] blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />
              {!videoReady && !videoError && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" />
                </div>
              )}
              {(videoError || isUnsupportedVideoUrl(reel?.videoUrl)) && reel?.imageUrl ? (
                <div className="absolute inset-0 z-10">
                  <img src={getImageUrl(reel.imageUrl)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                    {isYouTubeUrl(reel?.videoUrl) ? (
                      <a href={reel.videoUrl} target="_blank" rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-4 py-2 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-all shadow-lg flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        {t('reels.watch_youtube')}
                      </a>
                    ) : (                        <button onClick={(e) => { e.stopPropagation(); setVideoError(false); setVideoReady(false); videoRef.current?.load(); }}
                        className="px-4 py-1.5 rounded-full bg-white/10 text-white/50 text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-all">
                        {t('reels.retry_video')}
                      </button>
                    )}
                  </div>
                </div>
              ) : (videoError || isUnsupportedVideoUrl(reel?.videoUrl)) && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
                  <Image size={40} />
                  <span className="text-white/30 text-sm font-bold uppercase tracking-wider">{t('reels.video_unavailable')}</span>
                  <p className="text-white/15 text-[9px] max-w-[200px] text-center">
                    {isYouTubeUrl(reel?.videoUrl) ? 'YouTube links cannot play directly. Add an MP4 video or cover image.' : 'Check the video URL or add a cover image.'}
                  </p>
                  <button onClick={(e) => { e.stopPropagation(); setVideoError(false); setVideoReady(false); videoRef.current?.load(); }}
                    className="px-4 py-1.5 rounded-full bg-white/10 text-white/50 text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-all">
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Video */}
            {!videoError && !isUnsupportedVideoUrl(reel?.videoUrl) && (
              <video ref={videoRef} src={getVideoUrl(reel.videoUrl)}
                className={`reel-video absolute inset-0 z-[1] ${videoReady ? 'opacity-100' : 'opacity-0'}`}
                muted={isMuted} autoPlay playsInline loop={false} preload="auto"
                poster={reel.imageUrl ? getImageUrl(reel.imageUrl) : undefined}
                onCanPlay={() => setVideoReady(true)} onError={() => setVideoError(true)}
                /* Tap-to-pause is handled by the swipe layer's pointerup (pointer
                   capture retargets clicks away from this element) */
                 />
            )}

            {/* Tap play/pause overlay */}
            <AnimatePresence>
              {showTapOverlay && (
                <motion.div
                  key="tap-overlay"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 z-[3] flex items-center justify-center pointer-events-none"
                >
                  <motion.div
                    initial={{ scale: 0.3 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.35, bounce: 0.3 }}
                    className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl"
                  >
                    {tapIconIsPlay ? (
                      <Play size={28} className="text-white fill-white ml-0.5" />
                    ) : (
                      <Pause size={24} className="text-white" />
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent via-50% to-transparent pointer-events-none z-[2]" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none z-[2]" />

            {/* Progress bar — hide when video errored or unsupported */}
            {!videoError && !isUnsupportedVideoUrl(reel?.videoUrl) && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-20 pointer-events-none">
                <ReelProgressBar key={reelIndex}
                  isPlaying={isPlaying && videoReady}
                  videoRef={videoRef} duration={10}
                  onComplete={() => { autoAdvanceTimer.current = setTimeout(() => goNext(), 200); }} />
              </div>
            )}

            {/* Top bar — counter centered, close + mute grouped on the right */}
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-center px-3 pt-3 pb-2 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
              <div className="pointer-events-auto px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white/80 text-[9px] font-bold tracking-wider">
                <Crown size={9} className="inline -mt-0.5 mr-1" />
                {reelIndex + 1} / {total}
              </div>
              <div className="absolute right-3 pointer-events-auto flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); toggleMute(e); }}
                  aria-label={isMuted ? t('reels.unmute') || 'Unmute' : t('reels.mute') || 'Mute'}
                  className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-lg border border-white/15 flex items-center justify-center text-white/80 hover:bg-white/20 hover:text-white transition-all hover:scale-105 active:scale-95 shadow-lg">
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </button>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }}
                  aria-label={t('reels.back_home') || 'Home'}
                  className="w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-gray-800 hover:bg-white hover:scale-105 transition-all active:scale-95">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Floating sidebar */}
            <div className="absolute right-3 bottom-52 md:bottom-36 z-30 flex flex-col items-center gap-4 pointer-events-none">
              <button onClick={(e) => { e.stopPropagation(); onToggleLike(reel); }}
                aria-label={isLiked ? t('reels.liked') : t('reels.like')}
                className="pointer-events-auto flex flex-col items-center gap-0.5 group">
                <div className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-all duration-300 ${
                  isLiked ? 'bg-white border-white text-black' : 'bg-black/50 border-white/15 text-white/70 hover:bg-white/20 hover:text-white'
                }`}>
                  <Heart size={17} className={`${isLiked ? 'fill-black' : ''} transition-transform duration-300 ${isLiked ? 'scale-110' : 'group-hover:scale-110'}`} />
                </div>
                <span className={`text-[7px] font-bold uppercase tracking-wider ${isLiked ? 'text-white' : 'text-white/50'}`}>{isLiked ? t('reels.liked') : t('reels.like')}</span>
                {reelLike.count > 0 && (
                  <span className={`text-[9px] font-bold tabular-nums -mt-0.5 ${isLiked ? 'text-white' : 'text-white/60'}`}>{reelLike.count}</span>
                )}
              </button>
              <button onClick={(e) => { e.stopPropagation(); onShare(reel); }}
                className="pointer-events-auto flex flex-col items-center gap-0.5 group">
                <div className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all">
                  <Share2 size={16} />
                </div>
                <span className="text-[7px] font-bold uppercase tracking-wider text-white/50">{t('reels.share')}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Next peek */}
        <motion.div key={`next-${reelIndex}`}
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="hidden md:block relative w-[120px] lg:w-[150px] aspect-[9/16] rounded-2xl overflow-hidden shadow-lg opacity-40 scale-[0.85] shrink-0 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); goNext(); }}>
          <video src={getVideoUrl(reels[reelIndex < total - 1 ? reelIndex + 1 : 0]?.videoUrl)} muted loop playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ChevronRight size={20} />
          </div>
        </motion.div>
      </div>

      {/* Desktop arrows */}
      <button onClick={(e) => { e.stopPropagation(); goPrev(); }}
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-lg items-center justify-center text-gray-700 hover:bg-white hover:scale-105 transition-all active:scale-95"
        style={{ left: 'calc(50% - 290px)' }}>
        <ChevronLeft size={20} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); goNext(); }}
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-lg items-center justify-center text-gray-700 hover:bg-white hover:scale-105 transition-all active:scale-95"
        style={{ right: 'calc(50% - 290px)' }}>
        <ChevronRight size={20} />
      </button>

      {/* ── Variant Selection Modal (rendered at root level to avoid overflow clipping) ── */}
      <AnimatePresence>
        {showVariantModal && (
          <motion.div
            key="variant-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[65] flex items-end justify-center"
            onClick={() => setShowVariantModal(false)}
          >
            {/* Dark backdrop */}
            <div className="absolute inset-0 bg-black/60" />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.2 }}
              className="relative w-full max-w-md mx-auto max-h-[70vh] bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle */}
              <div className="flex justify-center pt-3 pb-1 shrink-0">
                <div className="w-10 h-1 rounded-full bg-gray-300/70" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 pb-2 shrink-0 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-900 flex items-center justify-center">
                    <ShoppingBag size={13} className="text-white" />
                  </div>
                  <span className="text-sm font-bold text-gray-900">{t('reels.add_to_cart')}</span>
                </div>
                <button onClick={() => setShowVariantModal(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-all duration-150 active:scale-[0.85]">
                  <X size={14} />
                </button>
              </div>

              {/* Product Info Row */}
              <div className="flex items-center gap-3 px-4 pb-3 pt-3 border-b border-gray-100 shrink-0">
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                  {prodImg ? (
                    <img src={prodImg} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl">👕</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{prodName}</p>
                  <p className="text-sm font-extrabold text-gray-900 mt-0.5">
                    {formatCurrency(matchedVariant?.price ?? prodPrice)}
                  </p>
                </div>
              </div>

              {/* Scrollable Options */}
              <div className="flex-1 overflow-y-auto px-4">
                <div className="py-3 space-y-3">
                  {/* Colors */}
                  {colors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                        Color · <span className="text-gray-900 font-bold">{selectedColor || 'Select'}</span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {colors.map((c) => {
                          const isOOS = oosColors.has(c);
                          const isSelected = selectedColor === c;
                          const thumb = getColorThumb(c, selectedProduct?.variants);
                          const isLightShade = isLightColor(c);
                          return (
                            <button
                              key={c}
                              disabled={isOOS}
                              onClick={() => setSelectedColor(c)}
                              className={`relative w-8 h-8 rounded-[3px] border-2 overflow-hidden flex items-center justify-center transition-all duration-150 ${
                                isSelected
                                  ? 'border-gray-900 scale-110 shadow-sm'
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
                                  className={`w-full h-full ${isLightShade ? 'border border-black/10' : ''} ${isOOS ? 'opacity-50' : ''}`}
                                  style={{ background: getColorHex(c) }}
                                />
                              )}
                              {isOOS && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                  <svg viewBox="0 0 24 24" className="w-full h-full text-gray-400 opacity-70" fill="none" stroke="currentColor" strokeWidth="1.5">
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
                        Size · <span className="text-gray-900 font-bold">{selectedSize || 'Select'}</span>
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
                              className={`px-3 py-1.5 text-xs font-bold rounded-[3px] transition-all duration-150 ${
                                isOOS
                                  ? 'opacity-25 cursor-not-allowed text-gray-400 bg-gray-50 line-through'
                                  : isSelected
                                  ? 'bg-gray-900 text-white shadow-sm scale-[1.02]'
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
              <div className="shrink-0 px-4 pb-4 pt-3 border-t border-gray-100 bg-white">
                <div className="flex items-center gap-3">
                  {/* Qty Stepper */}
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden shrink-0">
                    <button onClick={() => setVariantQty(Math.max(1, variantQty - 1))}
                      disabled={variantQty <= 1}
                      className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all duration-150 active:scale-[0.88] disabled:opacity-30 disabled:cursor-not-allowed">
                      <Minus size={12} />
                    </button>
                    <span className="w-9 h-9 flex items-center justify-center text-sm font-bold text-gray-800 bg-gray-50 border-x border-gray-200">
                      {variantQty}
                    </span>
                    <button onClick={() => setVariantQty(variantQty + 1)}
                      className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all duration-150 active:scale-[0.88]">
                      <Plus size={12} />
                    </button>
                  </div>

                  {/* Add to Cart */}
                  <button
                    onClick={() => {
                      if (!hasAllVariantSelections || !selectedProduct?.id) return;
                      setIsAddingVariant(true);
                      onAddToCart(selectedProduct.id, selectedColor, selectedSize, matchedVariant?.id, variantQty);
                      setTimeout(() => {
                        setShowVariantModal(false);
                        setIsAddingVariant(false);
                      }, 300);
                    }}
                    disabled={!hasAllVariantSelections || isAddingVariant || (hasAllVariantSelections && (!matchedVariant || (matchedVariant?.quantity || 0) <= 0))}
                    className={`flex-1 h-10 flex items-center justify-center gap-2 text-xs font-bold rounded-lg transition-all duration-150 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                      hasAllVariantSelections && !isAddingVariant && matchedVariant && (matchedVariant?.quantity || 0) > 0
                        ? 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isAddingVariant ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : !hasAllVariantSelections ? (
                      <span>{t('product.select') || 'Select'}</span>
                    ) : !matchedVariant && hasVariants && hasSelectableOptions ? (
                      <span>{t('product.unavailable') || 'Unavailable'}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5">
                        <ShoppingBag size={12} />
                        <span>{t('product.add_price', { price: formatCurrency((matchedVariant?.price ?? prodPrice) * variantQty) })}</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── PRODUCT CARD — Compact ── */}
      <AnimatePresence>
        {showProductCard && (
          <motion.div key={`product-${reelIndex}-0`}
            initial={{ y: 160, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 160, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 left-0 right-0 z-40 flex justify-center"
            onClick={(e) => e.stopPropagation()}>
            <motion.div drag="y"
              dragConstraints={{ top: 0, bottom: 200 }}
              dragElastic={0.5}
              onDragEnd={(_, info) => { if (info.offset.y > 60) setShowProductCard(false); }}
              className="w-full max-w-[min(400px,92vw)] mx-auto">
              <div className="mx-3 mb-3 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                <div className="flex justify-center pt-2.5 pb-0">
                  <div className="w-9 h-1 rounded-full bg-gray-300/60" />
                </div>
                <div className="p-3 pt-1.5">
                  <div className="flex items-start gap-3">
                    {prodImg && (
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200 shadow-sm">
                        <img src={prodImg} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="card-title">{prodName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {prodOld && <span className="text-[10px] text-gray-400 line-through">{formatCurrency(prodOld)}</span>}
                        {prodPrice && <span className="price-item text-gray-900">{formatCurrency(prodPrice)}</span>}
                        {prodOld && prodPrice && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-900 text-white text-[7px] font-bold">
                            -{discountPercent(prodOld, prodPrice)}%
                          </span>
                        )}
                      </div>
                      {/* Color/size preview chips */}
                      {hasSelectableOptions && selectedColor && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {selectedColor && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 text-[7px] font-bold text-gray-600">
                              <span className="w-2 h-2 rounded-full border border-black/10" style={{ background: getColorHex(selectedColor) }} />
                              {selectedColor}
                            </span>
                          )}
                          {selectedSize && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-gray-100 text-[7px] font-bold text-gray-600">
                              {selectedSize}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Add to Cart Button - prominent */}
                    <motion.button whileTap={{ scale: 0.93 }}
                      onClick={() => {
                        if (isAddingProduct) return;
                        if (hasSelectableOptions) {
                          setSelectedColor(firstAvailVariant?.attributes?.color || '');
                          setSelectedSize(firstAvailVariant?.attributes?.size || '');
                          setShowVariantModal(true);
                        } else {
                          if (selectedProduct?.id) {
                            onAddToCart(selectedProduct.id);
                          }
                        }
                      }}
                      disabled={isAddingProduct}
                      className={`shrink-0 h-9 px-4 rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition-all duration-200 shadow-sm ${
                        isAddingProduct
                          ? 'bg-gray-900 text-white border border-gray-900'
                          : 'bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-950 hover:shadow-md'
                      }`}>
                      {isAddingProduct ? (
                        <span className="flex items-center gap-1"><Check size={11} /></span>
                      ) : (
                        <span className="flex items-center gap-1.5"><ShoppingCart size={11} /> {t('reels.cart')}</span>
                      )}
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showProductCard && (
        <motion.button initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => { e.stopPropagation(); setShowProductCard(true); }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/60 flex items-center gap-1.5 text-gray-700 text-[10px] font-bold uppercase tracking-wider hover:bg-white transition-all">
          <ChevronUp size={12} /> {t('reels.show_product')}
        </motion.button>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PROGRESS BAR
   ═══════════════════════════════════════════════════════════ */
function ReelProgressBar({ isPlaying, videoRef, duration = 10, onComplete }) {
  const barRef = useRef(null);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    doneRef.current = false;
    startRef.current = null;
    if (!isPlaying) { if (rafRef.current) cancelAnimationFrame(rafRef.current); return; }

    const tick = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const v = videoRef.current;
      let p = 0;
      if (v && v.duration && isFinite(v.duration)) {
        p = v.currentTime / v.duration;
      } else {
        p = Math.min((ts - startRef.current) / 1000 / duration, 1);
      }
      if (barRef.current) barRef.current.style.width = `${Math.min(p * 100, 100)}%`;
      if (p >= 1 && !doneRef.current) { doneRef.current = true; onCompleteRef.current(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [isPlaying, videoRef, duration]);

  return <div className="h-full w-full bg-white" ref={barRef} />;
}

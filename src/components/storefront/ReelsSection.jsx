import { Share2, ShoppingCart, Play, ChevronLeft, ChevronRight, X, Check, ChevronUp, ChevronDown, RefreshCw, Heart, Image } from 'lucide-react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

;
import { useTranslation } from 'react-i18next';

/* ═══════════════════════════════════════════════════════════
   WATCH & BUY — TikTok-style shoppable video reels
   ═══════════════════════════════════════════════════════════ */

function discountPercent(oldPrice, price) {
  const o = parseInt(String(oldPrice).replace(/[^0-9]/g, ''));
  const c = parseInt(String(price).replace(/[^0-9]/g, ''));
  if (!o || !c) return 0;
  return Math.round(((o - c) / o) * 100);
}

function getReelBadge(reel) {
  return reel.products?.[0]?.badge || 'FT.SELEKT';
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

/* ── Skeleton ── */
function ReelsSectionSkeleton() {
  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="w-48 h-8 bg-gray-200 rounded mx-auto animate-pulse mb-3" />
          <div className="w-64 h-3 bg-gray-100 rounded mx-auto animate-pulse" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[220px] sm:w-[260px] xl:w-[280px]">
              <div className="bg-gray-100 rounded-2xl overflow-hidden">
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
export default function ReelsSection({ reels: _reelsProp = [], loading = false, onRefresh }) {
  const { t } = useTranslation();
  const reels = Array.isArray(_reelsProp) ? _reelsProp : [];
  if (loading) return <ReelsSectionSkeleton />;
  if (reels.length === 0) return null;
  return <FashionShowcase reels={reels} onRefresh={onRefresh} />;
}

/* ═══════════════════════════════════════════════════════════
   1. HOMEPAGE CAROUSEL
   ═══════════════════════════════════════════════════════════ */
function FashionShowcase({ reels, onRefresh }) {
  const { t } = useTranslation();
  const [likedItems, setLikedItems] = useState(new Set());
  const [cartItems, setCartItems] = useState(new Set());
  const [justAdded, setJustAdded] = useState(null);
  const [activeReelIndex, setActiveReelIndex] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [videoErrors, setVideoErrors] = useState(new Set());
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const justAddedTimer = useRef(null);

  const toggleLike = useCallback((id) => {
    setLikedItems((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const addToCart = useCallback((productId) => {
    if (!productId) return;
    setCartItems((prev) => {
      const next = new Set(prev);
      next.add(productId);
      return next;
    });
    setJustAdded(productId);
    if (justAddedTimer.current) clearTimeout(justAddedTimer.current);
    justAddedTimer.current = setTimeout(() => setJustAdded(null), 1500);
  }, []);

  const handleShare = useCallback((reel) => {
    navigator.clipboard?.writeText(`Check out "${reel.title}" at Luxe!`);
  }, []);

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

  const scrollGallery = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('.reel-card');
    const w = card?.offsetWidth || 220;
    el.scrollBy({ left: (w + 16) * (dir === 'left' ? -2 : 2), behavior: 'smooth' });
  };

  const openReel = useCallback((idx) => setActiveReelIndex(idx), []);
  const closeReel = useCallback(() => setActiveReelIndex(null), []);

  const handleVideoError = useCallback((reelId) => {
    setVideoErrors((prev) => {
      const next = new Set(prev);
      next.add(reelId);
      return next;
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing]);

  return (
    <section className="py-16 md:py-20 bg-white">
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6 md:mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-6 bg-gradient-to-r from-transparent via-gray-300 to-transparent rounded-full" />
            <span className="text-gray-400 text-[9px] font-bold uppercase tracking-[0.2em]">{t('reels.shop_the_look')}</span>
            <span className="h-px w-6 bg-gradient-to-l from-transparent via-gray-300 to-transparent rounded-full" />
          </div>
          <div className="relative inline-block">
            <h2 className="text-lg md:text-xl lg:text-2xl font-display font-bold tracking-tight text-gray-900">
              {t('reels.watch_and_buy')}
            </h2>
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="absolute -right-10 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all disabled:opacity-50 active:scale-90"
                title={t('reels.refresh')}
                aria-label={t('reels.refresh')}
              >
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
        </motion.div>

        <div className="relative group">
          {canScrollLeft && (
            <button onClick={() => scrollGallery('left')}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:scale-105 transition-all active:scale-95 opacity-0 md:group-hover:opacity-100">
              <ChevronLeft size={16} />
            </button>
          )}
          <div ref={scrollRef} className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2">
            {reels.map((reel, idx) => {
              const p = reel.products?.[0] || null;
              const hasVideoError = videoErrors.has(reel.id);
              return (
                <motion.div key={reel.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: idx * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  className="reel-card snap-start shrink-0 w-[220px] sm:w-[260px] xl:w-[280px] cursor-pointer group/card"
                  onClick={() => openReel(idx)}
                >
                  <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-400 border border-gray-100/80">
                    <div className="relative aspect-[9/16] overflow-hidden bg-gray-100">
                      {(hasVideoError || isUnsupportedVideoUrl(reel.videoUrl)) && reel.imageUrl ? (
                        <div className="relative w-full h-full">
                          <img
                            src={reel.imageUrl}
                            alt={reel.title}
                            className="w-full h-full object-cover"
                          />
                          {isYouTubeUrl(reel.videoUrl) && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <a href={reel.videoUrl} target="_blank" rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1.5 rounded-full bg-red-600/90 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider hover:bg-red-600 transition-all shadow-lg flex items-center gap-1.5">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                </svg>
                                {t('reels.youtube')}
                              </a>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                        </div>
                      ) : hasVideoError ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Image size={32} />
                        </div>
                      ) : (
                        <>
                          <video
                            src={reel.videoUrl}
                            muted
                            loop
                            playsInline
                            autoPlay
                            preload="metadata"
                            poster={reel.imageUrl || undefined}
                            className="w-full h-full object-cover"
                            onError={() => handleVideoError(reel.id)}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                        </>
                      )}
                      <div className="absolute top-3 left-3 z-10">
                        <span className="inline-flex items-center px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm border border-white/15 text-white text-[7px] font-bold uppercase tracking-[0.12em] shadow-lg">{getReelBadge(reel)}</span>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 pointer-events-none">
                        <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/25">
                          <Play size={18} />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
                        <div className="bg-white/90 backdrop-blur-md rounded-xl px-3 py-2.5 shadow-sm border border-white/20">
                          <div className="flex items-center gap-2.5">
                            {p?.image_url && (
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                                <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-semibold text-gray-900 leading-tight line-clamp-1">{p?.name || reel.title}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {p?.price && <span className="text-xs font-bold text-gray-900">₹{p.price}</span>}
                                {p?.old_price && <span className="text-[9px] text-gray-400 line-through">₹{p.old_price}</span>}
                                {p?.old_price && p?.price && (
                                  <span className="inline-flex items-center px-1 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[6px] font-bold">
                                    {t('reels.off', { percent: discountPercent(p.old_price, p.price) })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 mt-2">
                            <button onClick={(e) => { e.stopPropagation(); toggleLike(reel.id); }}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all ${
                                likedItems.has(reel.id) ? 'bg-rose-50 text-rose-500 border border-rose-200' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                              }`}>
                              <Heart size={9} className={likedItems.has(reel.id) ? 'fill-rose-500' : ''} />
                              {likedItems.has(reel.id) ? t('reels.liked') : t('reels.like')}
                            </button>
                            {p && (
                              <button onClick={(e) => { e.stopPropagation(); addToCart(p.id); }}
                                disabled={cartItems.has(p.id)}
                                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider transition-all ${
                                  cartItems.has(p.id) ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-900 text-white border border-gray-900 hover:bg-gray-800'
                                }`}>
                                {cartItems.has(p.id) ? <Check size={9} /> : <ShoppingCart size={9} />}
                                {cartItems.has(p.id) ? t('reels.added') : t('reels.cart')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          {canScrollRight && (
            <button onClick={() => scrollGallery('right')}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:scale-105 transition-all active:scale-95 opacity-0 md:group-hover:opacity-100">
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {activeReelIndex !== null && (
          <ReelPlayer reels={reels} initialIndex={activeReelIndex} onClose={closeReel}
            likedItems={likedItems} cartItems={cartItems} justAdded={justAdded}
            onToggleLike={toggleLike} onAddToCart={addToCart} onShare={handleShare} />
        )}
      </AnimatePresence>

      <style>{`
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .reel-video { width: 100%; height: 100%; object-fit: cover; }
        .product-strip::-webkit-scrollbar { height: 3px; }
        .product-strip::-webkit-scrollbar-track { background: transparent; }
        .product-strip::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 10px; }
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
   PRODUCT CAROUSEL STRIP
   ═══════════════════════════════════════════════════════════ */
function ProductCarouselStrip({ products, selectedIdx, onSelect, cartItems, justAdded, onAddToCart, reelId }) {
  const stripRef = useRef(null);

  useEffect(() => {
    if (stripRef.current && selectedIdx >= 0) {
      const child = stripRef.current.children[selectedIdx];
      child?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedIdx]);

  if (!products?.length) return null;

  return (
    <div className="relative">
      <div ref={stripRef} className="product-strip flex gap-2 overflow-x-auto scroll-smooth py-1 px-0.5">
        {products.map((product, idx) => {
          const inCart = cartItems.has(product.id);
          const sel = idx === selectedIdx;
          return (
            <motion.button key={product.id} layout onClick={() => onSelect(idx)}
              className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                sel ? 'border-gray-900 ring-1 ring-gray-900/20' : 'border-gray-200/60 hover:border-gray-400'
              } ${inCart ? 'ring-1 ring-emerald-400/40' : ''}`}
              style={{ width: 56, height: 72 }}>
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <ShoppingCart size={12} />
                </div>
              )}
              {sel && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900" />}
              {inCart && (
                <div className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check size={7} />
                </div>
              )}
              <div className={`absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity duration-200 ${sel ? 'opacity-100' : ''}`}>
                {!inCart ? (
                  <div onClick={(e) => { e.stopPropagation(); onAddToCart(product.id, reelId); }}
                    className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                    <ShoppingCart size={9} />
                  </div>
                ) : (
                  <Check size={10} />
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
      {products.length > 1 && (
        <div className="flex items-center justify-center gap-1 mt-1.5">
          {products.map((_, idx) => (
            <div key={idx} className={`rounded-full transition-all duration-300 ${
              idx === selectedIdx ? 'w-3 h-1 bg-gray-800' : 'w-1 h-1 bg-gray-300'
            }`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   2. REEL PLAYER — TikTok/Whatmore-style
   ═══════════════════════════════════════════════════════════ */
function ReelPlayer({
  reels, initialIndex, onClose,
  likedItems, cartItems, justAdded,
  onToggleLike, onAddToCart, onShare,
}) {
  const { t } = useTranslation();
  const [reelIndex, setReelIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showProductCard, setShowProductCard] = useState(true);
  const [selectedProductIdx, setSelectedProductIdx] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [isSwiping, setIsSwiping] = useState(false);

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
  const selectedProduct = products[selectedProductIdx] || products[0] || null;

  useEffect(() => {
    setSelectedProductIdx(0);
    setShowProductCard(true);
    setShowSwipeHint(true);
    swipeOffsetRef.current = 0;
    if (contentRef.current) {
      contentRef.current.style.transition = 'none';
      contentRef.current.style.transform = 'translateY(0px)';
    }
    const timer = setTimeout(() => setShowSwipeHint(false), 2500);
    return () => clearTimeout(timer);
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
    setIsMuted(true);
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
    return () => { document.body.style.overflow = ''; if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current); };
  }, []);

  const togglePlay = useCallback(() => setIsPlaying((p) => !p), []);
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
    e.preventDefault();

    const dy = e.clientY - swipeStart.current.y;
    swipeOffsetRef.current = dy;

    if (contentRef.current) {
      contentRef.current.style.transform = `translateY(${dy}px)`;
    }
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
      // ── PAST THRESHOLD: TikTok-style off-screen → switch → on-screen ──
      setIsSwiping(true);
      const direction = offset > 0 ? 1 : -1;
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
  }, [getCardHeight, goPrev, goNext, animateTo, setIsSwiping]);

  const isLiked = likedItems.has(reel?.id);
  const isAddingProduct = justAdded === selectedProduct?.id;
  const inCartProduct = cartItems.has(selectedProduct?.id);

  if (!reel) return null;

  const prodName = selectedProduct?.name || reel.title || '';
  const prodPrice = selectedProduct?.price ?? null;
  const prodOld = selectedProduct?.old_price ?? null;
  const prodImg = selectedProduct?.image_url || null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black overflow-hidden"
      onClick={onClose}
    >
      <div className="relative w-full h-full md:flex md:items-center md:justify-center md:gap-4 max-sm:flex max-sm:flex-col">

        {/* Prev peek */}
        <motion.div key={`prev-${reelIndex}`}
          initial={{ opacity: 0, x: -60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="hidden md:block relative w-[180px] lg:w-[200px] aspect-[9/16] rounded-2xl overflow-hidden shadow-lg opacity-40 scale-[0.85] shrink-0 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}>
          <video src={reels[(reelIndex > 0 ? reelIndex - 1 : total - 1)]?.videoUrl || reels[0]?.videoUrl} muted loop playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ChevronLeft size={20} />
          </div>
        </motion.div>

        {/* ── CENTER CARD ── */}
        <div className="relative flex-1 md:flex-none md:w-[340px] lg:w-[380px] h-full md:h-auto md:aspect-[9/16] overflow-hidden md:rounded-2xl shadow-2xl md:border md:border-white/10 bg-gray-900"
          onClick={(e) => e.stopPropagation()}>

          {/* ── SWIPE LAYER ── */}
          <div ref={contentRef}
            className="absolute inset-0 z-[5]"
            style={{ willChange: 'transform', touchAction: 'none' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}>

            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
              {!videoReady && !videoError && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" />
                </div>
              )}
              {(videoError || isUnsupportedVideoUrl(reel?.videoUrl)) && reel?.imageUrl ? (
                <div className="absolute inset-0 z-10">
                  <img src={reel.imageUrl} alt="" className="w-full h-full object-cover" />
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
              <video ref={videoRef} src={reel.videoUrl}
                className={`reel-video absolute inset-0 z-[1] ${videoReady ? 'opacity-100' : 'opacity-0'}`}
                muted={isMuted} autoPlay playsInline loop={false} preload="auto"
                poster={reel.imageUrl || undefined}
                onCanPlay={() => setVideoReady(true)} onError={() => setVideoError(true)}
                onClick={(e) => { e.stopPropagation(); togglePlay(); }} />
            )}

            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent via-50% to-transparent pointer-events-none z-[2]" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 pointer-events-none z-[2]" />

            {/* Swipe hint */}
            <motion.div initial={{ opacity: 1 }}
              animate={{ opacity: showSwipeHint ? 1 : 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
              <ChevronUp size={14} />
              <span className="text-white/30 text-[7px] font-bold uppercase tracking-wider">{t('reels.swipe')}</span>
              <ChevronDown size={14} />
            </motion.div>

            {/* Progress bar — hide when video errored or unsupported */}
            {!videoError && !isUnsupportedVideoUrl(reel?.videoUrl) && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/10 z-20 pointer-events-none">
                <ReelProgressBar key={reelIndex}
                  isPlaying={isPlaying && videoReady}
                  videoRef={videoRef} duration={10}
                  onComplete={() => { autoAdvanceTimer.current = setTimeout(() => goNext(), 200); }} />
              </div>
            )}

            {/* Top bar */}
            <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pt-3 pb-2 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
              <button onClick={(e) => { e.stopPropagation(); toggleMute(e); }}
                className="pointer-events-auto w-8 h-8 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all">
                {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
              </button>
              <div className="pointer-events-auto px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white/60 text-[9px] font-bold tracking-wider">
                {reelIndex + 1} / {total}
              </div>
              <button onClick={(e) => { e.stopPropagation(); onClose(); }}
                className="pointer-events-auto w-8 h-8 rounded-full bg-white/90 shadow-md flex items-center justify-center text-gray-800 hover:bg-white hover:scale-105 transition-all active:scale-95">
                <X size={14} />
              </button>
            </div>

            {/* Floating sidebar */}
            <div className="absolute right-3 bottom-52 md:bottom-36 z-30 flex flex-col items-center gap-4 pointer-events-none">
              <button onClick={(e) => { e.stopPropagation(); onToggleLike(reel.id); }}
                className="pointer-events-auto flex flex-col items-center gap-0.5 group">
                <div className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-all duration-300 ${
                  isLiked ? 'bg-rose-500/20 border-rose-400/40 text-rose-400' : 'bg-black/50 border-white/15 text-white/70 hover:bg-white/20 hover:text-white'
                }`}>
                  <Heart size={17} className={isLiked ? 'fill-rose-400' : ''} />
                </div>
                <span className={`text-[7px] font-bold uppercase tracking-wider ${isLiked ? 'text-rose-400' : 'text-white/50'}`}>{t('reels.like')}</span>
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
          className="hidden md:block relative w-[180px] lg:w-[200px] aspect-[9/16] rounded-2xl overflow-hidden shadow-lg opacity-40 scale-[0.85] shrink-0 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); goNext(); }}>
          <video src={reels[reelIndex < total - 1 ? reelIndex + 1 : 0]?.videoUrl} muted loop playsInline className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 flex items-center justify-center">
            <ChevronRight size={20} />
          </div>
        </motion.div>
      </div>

      {/* Desktop arrows */}
      <button onClick={(e) => { e.stopPropagation(); goPrev(); }}
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-lg items-center justify-center text-gray-700 hover:bg-white hover:scale-105 transition-all active:scale-95"
        style={{ left: 'calc(50% - 320px)' }}>
        <ChevronLeft size={20} />
      </button>
      <button onClick={(e) => { e.stopPropagation(); goNext(); }}
        className="hidden md:flex absolute top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-white/80 backdrop-blur-sm shadow-lg items-center justify-center text-gray-700 hover:bg-white hover:scale-105 transition-all active:scale-95"
        style={{ right: 'calc(50% - 320px)' }}>
        <ChevronRight size={20} />
      </button>

      {/* ── PRODUCT CARD ── */}
      <AnimatePresence>
        {showProductCard && (
          <motion.div key={`product-${reelIndex}-${selectedProductIdx}`}
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 left-0 right-0 z-40 flex justify-center"
            onClick={(e) => e.stopPropagation()}>
            <motion.div drag="y"
              dragConstraints={{ top: 0, bottom: 200 }}
              dragElastic={0.5}
              onDragEnd={(_, info) => { if (info.offset.y > 60) setShowProductCard(false); }}
              className="w-full max-w-[400px] mx-auto bg-white rounded-t-2xl shadow-2xl border border-gray-100/80 overflow-hidden">
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>
              <div className="px-4 pb-4 pt-1">
                {products.length > 1 && (
                  <div className="mb-3">
                    <ProductCarouselStrip products={products} selectedIdx={selectedProductIdx}
                      onSelect={setSelectedProductIdx} cartItems={cartItems}
                      justAdded={justAdded} onAddToCart={onAddToCart} reelId={reel.id} />
                  </div>
                )}
                <div className="flex items-center gap-3">
                  {prodImg && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                      <img src={prodImg} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">{prodName}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {prodPrice && <span className="text-base font-bold text-gray-900">₹{prodPrice}</span>}
                      {prodOld && <span className="text-xs text-gray-400 line-through">₹{prodOld}</span>}
                      {prodOld && prodPrice && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[8px] font-bold">
                          {discountPercent(prodOld, prodPrice)}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={() => { if (selectedProduct?.id) onAddToCart(selectedProduct.id); }}
                  disabled={inCartProduct}
                  className={`w-full mt-3 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                    inCartProduct ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-950 shadow-sm'
                  }`}>
                  {isAddingProduct ? (                      <span className="flex items-center justify-center gap-2"><Check size={14} /> {t('reels.add_to_cart')}</span>
                  ) : inCartProduct ? (
                    <span className="flex items-center justify-center gap-2"><Check size={14} /> {t('reels.in_cart')}</span>
                  ) : (
                    <span className="flex items-center justify-center gap-2"><ShoppingCart size={14} /> {t('reels.add_to_cart')}</span>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {!showProductCard && (
        <motion.button initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => { e.stopPropagation(); setShowProductCard(true); }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-sm shadow-lg border border-gray-200/60 flex items-center gap-2 text-gray-700 text-xs font-bold uppercase tracking-wider hover:bg-white transition-all">
          <ChevronUp size={14} /> {t('reels.show_product')}
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

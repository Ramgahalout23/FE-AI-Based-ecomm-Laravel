import { Heart, Eye, ShoppingCart, ArrowRight, Truck, RefreshCw, ShieldCheck, Headphones, Play, Pause, X, Volume2, VolumeX, Image as ImageIcon, ChevronLeft, ChevronRight, Maximize2, Sparkles, Crown, Compass, Gem, Quote } from 'lucide-react';
import ReelCard, { getReelBadge, discountPercent } from '../../components/storefront/ReelCard';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import SEOHead from '../../components/seo/SEOHead';
import { homepageAPI } from '../../api/homepage';
import { formatCurrency, getImageUrl, getProductImage, getVideoUrl } from '../../utils/formatters';
import { computeStockStatus } from '../../utils/stockHelpers';
import useCartStore from '../../store/cartStore';
import useWishlistStore from '../../store/wishlistStore';
import { cartAPI } from '../../api/cart';
import { wishlistAPI } from '../../api/wishlist';
import useAuthStore from '../../store/authStore';
import { addedToCart, showError } from '../../utils/toast';
import { useTranslation } from 'react-i18next';
import { reelLikesAPI } from '../../api/reelLikes';
import { useSettings } from '../../store/useSettings';

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
    // enablejsapi=1 lets us pause/play the embed via postMessage
    if (m?.[1]) return `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0&enablejsapi=1`;
  }
  return null;
}

/** Extract Vimeo video ID for iframe embedding */
function getVimeoEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m?.[1] ? `https://player.vimeo.com/video/${m[1]}?autoplay=1` : null;
}

/* ═══════════════════════════════════════════════════════════
   VIDEO PLAYER MODAL — Supports MP4 + YouTube + Vimeo
   ═══════════════════════════════════════════════════════════ */
function VideoPlayerModal({ videoUrl, imageUrl, title, reel, onClose }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const [isMuted, setIsMuted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showPauseFlash, setShowPauseFlash] = useState(false);
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const pauseFlashTimerRef = useRef(null);

  // ── Like state (seeded from backend likesCount / isLikedByUser) ──
  const [liked, setLiked] = useState(!!reel?.isLikedByUser);
  const [likeCount, setLikeCount] = useState(Number(reel?.likesCount) || 0);
  const likeBusyRef = useRef(false);

  // Optimistic like toggle — syncs to backend when authenticated, reverts on failure
  const handleLike = useCallback(async () => {
    if (!reel?.id || likeBusyRef.current) return;
    const nextLiked = !liked;
    likeBusyRef.current = true;
    setLiked(nextLiked);
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)));
    if (!isAuthenticated) {
      likeBusyRef.current = false;
      return;
    }
    try {
      if (nextLiked) await reelLikesAPI.like(reel.id);
      else await reelLikesAPI.unlike(reel.id);
    } catch {
      setLiked(!nextLiked);
      setLikeCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)));
      showError(t('reels.like_error'));
    } finally {
      likeBusyRef.current = false;
    }
  }, [liked, isAuthenticated, reel, t]);

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

  // Control embed video (YouTube / Vimeo) via postMessage commands
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !isEmbedVideo || videoError) return;
    try {
      const cmd = youTubeEmbed
        ? JSON.stringify({ event: 'command', func: isPlaying ? 'playVideo' : 'pauseVideo', args: [] })
        : JSON.stringify({ method: isPlaying ? 'play' : 'pause' });
      iframe.contentWindow.postMessage(cmd, '*');
    } catch { /* iframe not ready yet */ }
  }, [isPlaying, isEmbedVideo, youTubeEmbed, videoError]);

  // Sync isPlaying from embed player state (YouTube onStateChange / Vimeo events)
  useEffect(() => {
    if (!isEmbedVideo || videoError) return;
    const onMessage = (e) => {
      // Only react to our own player iframe's messages (avoid unrelated embeds)
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;
        if (data.event === 'onStateChange') {
          if (data.info === 1) setIsPlaying(true);      // PLAYING
          else if (data.info === 2) setIsPlaying(false); // PAUSED
          else if (data.info === 0) setIsPlaying(false); // ENDED → show replay overlay
        } else if (data.event === 'play') {
          setIsPlaying(true);
        } else if (data.event === 'pause') {
          setIsPlaying(false);
        }
      } catch { /* ignore non-JSON messages */ }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [isEmbedVideo, videoError]);

  // Brief center icon flash whenever play state changes (native tap feedback)
  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
    setShowPauseFlash(true);
    if (pauseFlashTimerRef.current) clearTimeout(pauseFlashTimerRef.current);
    pauseFlashTimerRef.current = setTimeout(() => setShowPauseFlash(false), 650);
  }, []);

  useEffect(() => () => {
    if (pauseFlashTimerRef.current) clearTimeout(pauseFlashTimerRef.current);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-lg flex items-center justify-center"
      onClick={onClose}
    >
      {/* Title */}
      {title && (
        <div className="absolute top-4 left-4 z-10 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-white/80 text-sm font-bold max-w-[60%] truncate">
          {title}
        </div>
      )}

      {/* Top-right controls — play/pause + mute (native) + close grouped together */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {!videoError && (
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all active:scale-90"
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
          </button>
        )}
        {!isEmbedVideo && !videoError && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsMuted(m => !m); }}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:bg-white/20 transition-all active:scale-90"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        )}
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all active:scale-90"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── Video container ── */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-[min(400px,42vh,92vw)] mx-auto aspect-[9/16] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* YouTube / Vimeo embed */}
        {isEmbedVideo ? (
          <>
            <iframe
              ref={iframeRef}
              src={youTubeEmbed || vimeoEmbed}
              title={title || 'Video'}
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
            {/* Paused overlay — big play button on center tap for embeds too */}
            <AnimatePresence>
              {!isPlaying && (
                <motion.button
                  key="embed-paused-overlay"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  aria-label="Play video"
                  className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 cursor-pointer"
                >
                  <motion.span
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
                    className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-2xl"
                  >
                    <Play size={30} className="text-white fill-white ml-1" />
                  </motion.span>
                </motion.button>
              )}
            </AnimatePresence>
          </>
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
              className={`w-full h-full object-cover ${videoReady ? 'opacity-100' : 'opacity-0'}`}
              onCanPlay={() => setVideoReady(true)}
              onError={() => setVideoError(true)}
              onClick={togglePlay}
            />

            {/* Paused overlay — big play button on center tap */}
            <AnimatePresence>
              {!isPlaying && (
                <motion.button
                  key="paused-overlay"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  aria-label="Play video"
                  className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 cursor-pointer"
                >
                  <motion.span
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
                    className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center shadow-2xl"
                  >
                    <Play size={30} className="text-white fill-white ml-1" />
                  </motion.span>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Tap flash feedback (native) */}
            <AnimatePresence>
              {showPauseFlash && (
                <motion.div
                  key="tap-flash"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none"
                >
                  <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                    {isPlaying ? <Pause size={24} className="text-white" /> : <Play size={26} className="text-white fill-white ml-0.5" />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading spinner */}
            {!videoReady && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/30 animate-spin" />
              </div>
            )}

            {/* Bottom controls — z-20 so Like stays clickable above the paused overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-end gap-3">
              {reel?.id && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleLike(); }}
                  aria-label={liked ? t('reels.liked') : t('reels.like')}
                  className="flex items-center gap-1.5 pl-3 pr-3.5 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 hover:bg-white/20 transition-all active:scale-95"
                >
                  <Heart size={14} className={`${liked ? 'fill-rose-400 text-rose-400' : ''} transition-transform duration-300 ${liked ? 'scale-110' : ''}`} />
                  <span className="text-xs font-bold">{liked ? t('reels.liked') : t('reels.like')}</span>
                  {likeCount > 0 && (
                    <span className={`text-xs font-bold tabular-nums ${liked ? 'text-rose-300' : 'text-white/50'}`}>{likeCount}</span>
                  )}
                </button>
              )}
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
   WATCH & BUY — Featured player + thumb rail
   ═══════════════════════════════════════════════════════════ */
function FeaturedVideoShowcase({ reels }) {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const addItem = useCartStore((s) => s.addItem);
  const navigate = useNavigate();

  const [activeIdx, setActiveIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showPauseFlash, setShowPauseFlash] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  const videoRef = useRef(null);
  const playerWrapRef = useRef(null);
  const pauseFlashTimerRef = useRef(null);
  const [reelLikeMap, setReelLikeMap] = useState({});
  const reelLikeMapRef = useRef({});

  // Seed reel-like state from the backend payload
  useEffect(() => {
    const map = {};
    (Array.isArray(reels) ? reels : []).forEach((r) => {
      map[r.id] = { liked: !!r.isLikedByUser, count: Number(r.likesCount) || 0 };
    });
    reelLikeMapRef.current = map;
    setReelLikeMap(map);
  }, [reels]);

  const addReelProduct = useCallback((product, opts = {}) => {
    if (!product) return;
    const qty = Math.max(1, opts?.qty || 1);
    const variants = product.variants || product.productvariant || [];
    const matched = variants.find(v => v.id === opts?.variantId) || null;
    addItem({
      id: product.id,
      productId: product.id,
      name: product.name,
      price: matched?.price ?? product.price,
      image: getProductImage(product),
      imageUrl: matched?.images?.[0] || getProductImage(product),
      quantity: qty,
      ...(opts?.size && { size: opts.size }),
      ...(opts?.color && { color: opts.color }),
      ...(matched?.id && { variantId: matched.id }),
    });
    if (isAuthenticated) {
      cartAPI.add({
        productId: product.id,
        quantity: qty,
        size: opts?.size || null,
        color: opts?.color || null,
      }).catch(() => {});
    }
    addedToCart(product.name);
  }, [isAuthenticated, addItem]);

  const toggleReelLike = useCallback((reel) => {
    if (!reel?.id) return;
    const cur = reelLikeMapRef.current[reel.id] || { liked: false, count: 0 };
    const nextLiked = !cur.liked;
    const next = {
      ...reelLikeMapRef.current,
      [reel.id]: { liked: nextLiked, count: Math.max(0, cur.count + (nextLiked ? 1 : -1)) },
    };
    reelLikeMapRef.current = next;
    setReelLikeMap(next);
    if (!isAuthenticated) return;
    if (nextLiked) reelLikesAPI.like(reel.id).catch(() => {});
    else reelLikesAPI.unlike(reel.id).catch(() => {});
  }, [isAuthenticated]);

  const total = (Array.isArray(reels) ? reels : []).length;
  const active = total > 0 ? reels[activeIdx % total] : null;
  const activeProduct = active?.products?.[0] || null;
  const youTubeEmbed = active ? getYouTubeEmbedUrl(active.videoUrl) : null;
  const vimeoEmbed = active ? getVimeoEmbedUrl(active.videoUrl) : null;
  const isEmbed = youTubeEmbed || vimeoEmbed;
  const likeState = (active && reelLikeMap[active.id]) || { liked: false, count: 0 };
  const discount = activeProduct?.old_price ? discountPercent(activeProduct.old_price, activeProduct.price) : null;

  const selectReel = useCallback((idx) => {
    if (!total) return;
    const nextIdx = ((idx % total) + total) % total;
    setActiveIdx(nextIdx);
    setVideoError(false);
    setVideoReady(false);
    setIsPlaying(true);
    if (playerWrapRef.current && window.innerWidth < 1024) {
      playerWrapRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [total]);

  const next = () => selectReel(activeIdx + 1);
  const prev = () => selectReel(activeIdx - 1);

  // Control the featured player's native video
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) v.play().catch(() => {});
    else v.pause();
  }, [isPlaying, activeIdx, active?.id]);

  const togglePlay = () => {
    setIsPlaying((p) => !p);
    setShowPauseFlash(true);
    if (pauseFlashTimerRef.current) clearTimeout(pauseFlashTimerRef.current);
    pauseFlashTimerRef.current = setTimeout(() => setShowPauseFlash(false), 650);
  };
  useEffect(() => () => {
    if (pauseFlashTimerRef.current) clearTimeout(pauseFlashTimerRef.current);
  }, []);

  const handleAdd = () => {
    if (!activeProduct) return;
    const variants = activeProduct.variants || activeProduct.productvariant || [];
    // Products with size/color → choose on the product page
    if (variants.length > 0) {
      navigate(`/products/${activeProduct.slug || activeProduct.id}`);
      return;
    }
    addItem({ id: activeProduct.id, productId: activeProduct.id, name: activeProduct.name, price: activeProduct.price, image: activeProduct.image_url, quantity: 1 });
    if (isAuthenticated) cartAPI.add({ productId: activeProduct.id, quantity: 1 }).catch(() => {});
    addedToCart(activeProduct.name);
  };

  if (!total) return null;

  return (
    <section id="watch-buy" className="relative py-16 md:py-24 bg-gray-950 text-white overflow-hidden">
      {/* ambient glow */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[640px] h-[320px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 md:mb-12">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-amber-300 text-[10px] font-bold uppercase tracking-[0.22em]">Shop The Look</span>
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-black tracking-tight">Watch & Buy</h2>
            <p className="text-white/60 text-sm md:text-base mt-2 max-w-xl">Play a video, tap the product, and it's in your cart — the fastest way to shop.</p>
          </div>
          <div className="flex items-center gap-2 text-white/40 text-[11px] font-semibold uppercase tracking-widest">
            <Play size={12} className="fill-current" /> Tap to play · <span className="text-white/70">{total} videos</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-8 lg:gap-12 items-start">
          {/* ── Featured player ── */}
          <div ref={playerWrapRef} className="w-full max-w-[min(320px,84vw)] mx-auto lg:mx-0">
            <div className="relative aspect-[9/16] rounded-[28px] overflow-hidden bg-black ring-1 ring-white/10 shadow-2xl shadow-black/60">
              {isEmbed ? (
                <iframe
                  src={youTubeEmbed || vimeoEmbed}
                  title={active?.title || 'Reel'}
                  className="w-full h-full"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                />
              ) : videoError ? (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  {active?.imageUrl && (
                    <img src={getImageUrl(active.imageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                  )}
                  <span className="relative text-white/40 text-xs font-bold uppercase tracking-wider">Video unavailable</span>
                </div>
              ) : active?.videoUrl ? (
                <video
                  key={active.id}
                  ref={videoRef}
                  src={getVideoUrl(active.videoUrl)}
                  poster={active.imageUrl ? getImageUrl(active.imageUrl) : undefined}
                  muted={isMuted}
                  autoPlay
                  playsInline
                  loop
                  preload="auto"
                  className={`w-full h-full object-cover ${videoReady ? 'opacity-100' : 'opacity-0'}`}
                  onCanPlay={() => setVideoReady(true)}
                  onError={() => setVideoError(true)}
                  onClick={togglePlay}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  {active?.imageUrl && (
                    <img src={getImageUrl(active.imageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                  )}
                  <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-amber-400 animate-spin" />
                </div>
              )}

              {/* Loading spinner */}
              {!isEmbed && !videoError && !videoReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-amber-400 animate-spin" />
                </div>
              )}

              {/* Tap flash feedback */}
              <AnimatePresence>
                {showPauseFlash && !isEmbed && (
                  <motion.div
                    key="tap-flash"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0 z-[5] flex items-center justify-center pointer-events-none"
                  >
                    <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                      {isPlaying ? <Pause size={24} className="text-white" /> : <Play size={26} className="text-white fill-white ml-0.5" />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Badge */}
              {active?.id && (
                <div className="absolute top-3 left-3 z-10">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-amber-900/90 to-amber-700/90 backdrop-blur-sm border border-amber-300/40 text-amber-100 text-[8px] font-bold uppercase tracking-[0.1em] shadow-lg">
                    <Crown size={8} />
                    {getReelBadge(active, t('reels.watch_and_buy'))}
                  </span>
                </div>
              )}

              {/* Top-right: mute + like + fullscreen */}
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
                {!isEmbed && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setIsMuted((m) => !m); }}
                    aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                    className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/25 transition-all active:scale-90"
                  >
                    {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleReelLike(active); }}
                  aria-label={likeState.liked ? t('reels.liked') : t('reels.like')}
                  className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/25 transition-all active:scale-90"
                >
                  <Heart size={15} className={`${likeState.liked ? 'fill-rose-400 text-rose-400' : ''} transition-transform duration-300 ${likeState.liked ? 'scale-110' : ''}`} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setActiveVideo({ videoUrl: active.videoUrl, imageUrl: active.imageUrl, title: active.title, reel: active }); }}
                  aria-label="Open fullscreen"
                  className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:bg-white/25 transition-all active:scale-90"
                >
                  <Maximize2 size={15} />
                </button>
              </div>

              {/* Prev / next arrows */}
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Previous reel"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/70 hover:bg-black/60 transition-all active:scale-90"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Next reel"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/15 flex items-center justify-center text-white/70 hover:bg-black/60 transition-all active:scale-90"
              >
                <ChevronRight size={16} />
              </button>

              {/* Bottom: title + product chip */}
              <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/85 via-black/40 to-transparent pt-16 pb-4 px-4">
                <p className="text-white font-display font-bold text-lg leading-tight mb-3">{active?.title || 'Watch & Buy'}</p>

                {activeProduct && (
                  <div className="flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-2">
                    {activeProduct.image_url && (
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/10 shrink-0">
                        <img src={getImageUrl(activeProduct.image_url)} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-white truncate">{activeProduct.name}</p>
                      <div className="flex items-center gap-1.5">
                        {activeProduct.old_price && <span className="text-[9px] text-white/40 line-through">{formatCurrency(activeProduct.old_price)}</span>}
                        <span className="text-[12px] font-black text-amber-300">{formatCurrency(activeProduct.price)}</span>
                        {discount && <span className="text-[8px] font-bold text-emerald-300 bg-emerald-500/20 rounded-full px-1.5 py-0.5">{discount}% OFF</span>}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAdd(); }}
                      className="shrink-0 px-3.5 py-2 rounded-xl bg-white text-gray-900 text-[10px] font-black uppercase tracking-wider hover:bg-amber-300 transition-all active:scale-95"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Position dots */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              {reels.map((r, i) => (
                <button
                  key={r.id || i}
                  onClick={() => selectReel(i)}
                  aria-label={`Reel ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === activeIdx ? 'w-6 bg-amber-400' : 'w-1.5 bg-white/25 hover:bg-white/50'}`}
                />
              ))}
            </div>
          </div>

          {/* ── Thumb rail ── */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
            {reels.slice(0, 6).map((reel, idx) => (
              <div
                key={reel.id || idx}
                className={`relative rounded-2xl overflow-hidden transition-all duration-300 ${idx === activeIdx ? 'ring-2 ring-amber-400/80 shadow-lg shadow-amber-500/10' : 'ring-1 ring-white/10 hover:ring-white/30'}`}
              >
                <ReelCard
                  reel={reel}
                  index={idx}
                  widthClass="w-full"
                  onOpen={() => selectReel(idx)}
                  badgeFallback={t('reels.watch_and_buy')}
                  liked={!!reelLikeMap[reel.id]?.liked}
                  onToggleLike={() => toggleReelLike(reel)}
                  onAddToCart={addReelProduct}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fullscreen modal */}
      <AnimatePresence>
        {activeVideo && (
          <VideoPlayerModal
            key={activeVideo.reel?.id || activeVideo.videoUrl}
            videoUrl={activeVideo.videoUrl}
            imageUrl={activeVideo.imageUrl}
            title={activeVideo.title}
            reel={activeVideo.reel}
            onClose={() => setActiveVideo(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

/* ── CINEMATIC HERO — dark, video-forward, with marquee ticker ── */
function CinematicHero({ reels }) {
  const navigate = useNavigate();
  const heroReel = (Array.isArray(reels) ? reels : []).find((r) => r?.videoUrl) || null;
  const isEmbedHero = heroReel && (isYouTubeUrl(heroReel.videoUrl) || isVimeoUrl(heroReel.videoUrl));
  const heroVideoRef = useRef(null);

  // Save battery/data — pause the hero's background video once it scrolls out of view
  useEffect(() => {
    const el = heroVideoRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [heroReel?.videoUrl]);

  const marqueeItems = ['Free Shipping Over ₹499', 'Easy 7-Day Returns', 'Premium Quality Guaranteed', 'Secure Checkout', 'New Drops Weekly'];

  return (
    <section className="relative w-full bg-black overflow-hidden">
      {/* Layered background: muted video + gradients + glow */}
      <div className="absolute inset-0">
        {heroReel && !isEmbedHero ? (
          <video
            ref={heroVideoRef}
            src={getVideoUrl(heroReel.videoUrl)}
            poster={heroReel.imageUrl ? getImageUrl(heroReel.imageUrl) : undefined}
            muted
            autoPlay
            loop
            playsInline
            preload="auto"
            className="w-full h-full object-cover opacity-45"
          />
        ) : heroReel?.imageUrl ? (
          <img src={getImageUrl(heroReel.imageUrl)} alt="" className="w-full h-full object-cover opacity-40" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-950 via-gray-900 to-amber-950" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-black" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-500/20 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-24 w-80 h-80 rounded-full bg-white/10 blur-[100px] pointer-events-none" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 md:pt-28 md:pb-20 lg:pt-36 lg:pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-amber-200 text-[11px] font-bold uppercase tracking-[0.2em] mb-6"
        >
          <Sparkles size={12} />
          Watch & Buy · Shoppable Videos
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-5xl sm:text-6xl md:text-7xl font-display font-black text-white tracking-[-0.03em] leading-[0.95] mb-5"
        >
          WATCH IT.
          <br />
          <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-white bg-clip-text text-transparent">LOVE IT. BUY IT.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-base md:text-lg text-white/70 max-w-xl mx-auto mb-8 leading-relaxed"
        >
          Tap any reel to play the video — then add the exact look to your cart. No searching, no scrolling.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10"
        >
          <button
            onClick={() => document.getElementById('watch-buy')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-3.5 rounded-full bg-white text-gray-900 text-sm font-bold hover:bg-amber-300 hover:text-gray-900 transition-all duration-200 active:scale-[0.97] shadow-xl shadow-black/30"
          >
            ▶ Start Watching
          </button>
          <button
            onClick={() => navigate('/products')}
            className="px-8 py-3.5 rounded-full bg-white/10 border border-white/25 backdrop-blur-md text-white text-sm font-bold hover:bg-white/20 transition-all duration-200 active:scale-[0.97]"
          >
            Shop New Arrivals
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="flex items-center justify-center gap-6 md:gap-10 flex-wrap"
        >
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-black text-white">{Array.isArray(reels) ? reels.length : 0}+</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/50 mt-1">Videos</p>
          </div>
          <div className="w-px h-10 bg-white/15" />
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-black text-white">100%</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/50 mt-1">Authentic</p>
          </div>
          <div className="w-px h-10 bg-white/15" />
          <div className="text-center">
            <p className="text-2xl md:text-3xl font-black text-white">7-Day</p>
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/50 mt-1">Returns</p>
          </div>
        </motion.div>
      </div>

      {/* Marquee ticker */}
      <div className="relative border-t border-white/10 bg-black/60 backdrop-blur-md overflow-hidden py-3">
        <div className="flex whitespace-nowrap animate-marquee">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center">
              {marqueeItems.concat(marqueeItems).map((item, i) => (
                <span key={`${dup}-${i}`} className="flex items-center gap-3 mx-5 text-[11px] font-bold uppercase tracking-[0.2em] text-white/60">
                  {item} <span className="text-amber-400">✦</span>
                </span>
              ))}
            </div>
          ))}
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
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 transition-all duration-300 z-10">
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
          /* Hidden until card hover on desktop (hover-capable); always visible on touch */
          <button onClick={handleQuickAdd} className="qa-reveal absolute bottom-0 inset-x-0 z-20 h-10 bg-black/90 text-white text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300">
            {isAdding ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><ShoppingCart size={13} /> Quick Add</>}
          </button>
        )}
      </div>
      <div className="px-0.5">
        <h3 className="card-title">{product.name}</h3>
        <div className="flex items-baseline gap-0">
          {product.oldPrice && <span className="text-sm md:text-base text-gray-500 line-through font-normal">{formatCurrency(product.oldPrice)}</span>}
          <span className="price-item text-red-500 ml-1.5">{formatCurrency(product.price)}</span>
        </div>

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

/* ── BRAND STORY SECTION — dark editorial narrative ── */
function BrandStorySection() {
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const chapters = [
    {
      num: '01',
      Icon: Compass,
      eyebrow: 'Chapter One',
      title: 'Journey',
      copy: [
        'What started with just 2–3 orders a day slowly grew into something far bigger than we ever imagined. From packing orders late at night to building a brand people genuinely connect with, every step of this journey has been driven by passion, consistency, and the support of our community.',
        'There were moments of doubt, setbacks, and long nights, but every small win kept us going. This brand is more than clothing to us — it\'s a reflection of growth, self-expression, and the people who believed in us from the very beginning.',
      ],
    },
    {
      num: '02',
      Icon: Gem,
      eyebrow: 'Chapter Two',
      title: 'Identity',
      copy: [
        'Identity is more than just the way you dress — it\'s the way you carry yourself, express your thoughts, and show the world who you truly are without saying a word.',
        'In a world where everyone is constantly trying to fit in, we believe real style comes from embracing what makes you different. Every piece we create is designed to help you feel confident, comfortable, and unapologetically yourself.',
      ],
    },
  ];

  return (
    <section className="relative py-20 md:py-28 bg-gray-950 text-white overflow-hidden">
      {/* ambient glows + subtle grid texture */}
      <div className="absolute -top-32 right-0 w-[480px] h-[380px] bg-amber-500/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 -left-24 w-80 h-80 bg-white/5 blur-[110px] rounded-full pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mb-12 md:mb-16"
        >
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-10 bg-gradient-to-r from-amber-400 to-transparent" />
            <span className="text-amber-300 text-[10px] font-bold uppercase tracking-[0.25em]">Our Story</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-display font-black tracking-tight leading-[1.05]">
            More than clothing —<br />
            <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-white bg-clip-text text-transparent">it's a reflection of us.</span>
          </h2>
        </motion.div>

        {/* Narrative chapters */}
        <div className="grid md:grid-cols-2 gap-6 md:gap-8">
          {chapters.map((ch, idx) => {
            const Icon = ch.Icon;
            return (
              <motion.article
                key={ch.num}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.6, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="group relative rounded-3xl bg-white/[0.04] border border-white/10 p-7 md:p-9 overflow-hidden hover:border-amber-300/30 hover:bg-white/[0.06] transition-all duration-500"
              >
                {/* watermark number */}
                <span className="absolute -top-4 -right-2 text-[88px] md:text-[110px] font-black leading-none text-white/[0.05] group-hover:text-amber-400/10 transition-colors duration-500 select-none">
                  {ch.num}
                </span>

                <div className="relative">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-300/25 flex items-center justify-center">
                      <Icon size={19} className="text-amber-300" />
                    </span>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-white/40">{ch.eyebrow}</p>
                      <h3 className="text-xl md:text-2xl font-display font-bold">{ch.title}</h3>
                    </div>
                  </div>
                  <div className="space-y-4 text-sm md:text-[15px] text-white/60 leading-relaxed">
                    {ch.copy.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Pull-quote band */}
        <motion.blockquote
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-12 md:mt-16 rounded-3xl bg-gradient-to-r from-amber-400/10 via-white/[0.04] to-transparent border border-white/10 px-7 md:px-12 py-8 md:py-10"
        >
          <Quote size={28} className="text-amber-400/60 mb-4" />
          <p className="text-lg md:text-2xl font-display font-semibold leading-snug text-white/90 max-w-3xl">
            "Every piece we create is designed to help you feel confident, comfortable, and unapologetically yourself."
          </p>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300">— {storeName}</p>
        </motion.blockquote>
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
  // Core homepage payload (featured, new arrivals, categories) — reels and
  // best sellers now come from the lazy homepage-section endpoints, fetched
  // immediately here since this page is built around them.
  const { data: homepageData, isLoading } = useQuery({
    queryKey: ['watch-and-buy', 'homepage'],
    queryFn: async () => {
      const res = await homepageAPI.getAll();
      return res?.data?.data || {};
    },
    staleTime: 60000,
  });
  const { data: reelsData, isLoading: reelsLoading } = useQuery({
    queryKey: ['watch-and-buy', 'reels'],
    queryFn: async () => (await homepageAPI.getReels())?.data?.data || [],
    staleTime: 60000,
  });
  const { data: bestSellersData } = useQuery({
    queryKey: ['watch-and-buy', 'bestSellers'],
    queryFn: async () => (await homepageAPI.getBestSellers())?.data?.data || [],
    staleTime: 60000,
  });

  const newArrivals = homepageData?.newArrivals || [];
  const bestSellers = bestSellersData || [];
  const categories = homepageData?.categories || [];
  const featuredProducts = homepageData?.featured || [];
  /** @type {Array} reels — each has videoUrl, imageUrl, title, products[] */
  const reels = reelsData || [];

  const fallbackProducts = featuredProducts.length > 0 ? featuredProducts : (homepageData?.products || []);
  const mainProducts = newArrivals.length > 0 ? newArrivals : bestSellers.length > 0 ? bestSellers : fallbackProducts;
  const secondaryProducts = bestSellers.length > 0 ? bestSellers : mainProducts !== newArrivals && newArrivals.length > 0 ? newArrivals : featuredProducts;

  return (
    <div className="min-h-screen bg-white">
      <SEOHead title="Watch & Buy — Shoppable Video Shopping | THREVOLT" description="Watch and shop the latest streetwear drops. Browse our collection of premium t-shirts, oversized tees, and streetwear essentials. Watch product videos and buy directly." />

      {/* ── CINEMATIC HERO ── */}
      <CinematicHero reels={reels} />

      {/* ── WATCH & BUY — featured player + thumb rail ── */}
      <FeaturedVideoShowcase reels={reels} />

      {/* ── PRODUCT GRID ── */}
      {isLoading || reelsLoading ? (
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

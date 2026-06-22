import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Volume2, VolumeX, ArrowRight } from 'lucide-react';

/* ═══════════ REELS SECTION — VIDEO ONLY ═══════════ */
/* Only displays reels that have a videoUrl.          */
/* Image-only reels are filtered out entirely.        */

export default function ReelsSection({ reels: reelsProp = [] }) {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [muted, setMuted] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState({});
  const autoplayRef = useRef(null);
  const videoRefs = useRef({});
  const [isVisible, setIsVisible] = useState(false);
  const [forcePlay, setForcePlay] = useState(0);

  /* ── Subtle scroll-linked parallax ── */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const bgParallaxY = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);
  const glow1Y = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);
  const glow2Y = useTransform(scrollYProgress, [0, 1], ['10%', '-10%']);

  // ── Only include reels that have a video URL ──
  const items = Array.isArray(reelsProp)
    ? reelsProp.filter(reel => !!reel.videoUrl)
    : [];

  if (items.length === 0) return null;

  /* ── Section visibility — pause everything when off-screen ── */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  /* ── Drag-to-scroll (touch + mouse) ── */
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0, moved: false });

  const onDragStart = (clientX) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { isDragging: true, startX: clientX, scrollLeft: el.scrollLeft, moved: false };
  };
  const onDragMove = (clientX) => {
    const ds = dragState.current;
    if (!ds.isDragging) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = clientX - ds.startX;
    if (Math.abs(dx) > 5) ds.moved = true;
    el.scrollLeft = ds.scrollLeft - dx;
  };
  const onDragEnd = () => {
    dragState.current.isDragging = false;
    setTimeout(() => { dragState.current.moved = false; }, 50);
  };

  /* ── Track scroll position → update currentIndex ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateScrollState = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 8);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
      const cardWidth = el.querySelector('.reel-slide')?.offsetWidth || 280;
      const gap = 16;
      const totalItemWidth = cardWidth + gap;
      if (totalItemWidth > 0) {
        const idx = Math.round(scrollLeft / totalItemWidth);
        const newIdx = Math.min(idx, items.length - 1);
        if (newIdx !== currentIndex) {
          setCurrentIndex(newIdx);
          setForcePlay(n => n + 1); // force video re-evaluation
        }
      }
    };

    const handlePreventClick = (e) => {
      if (dragState.current.moved) { e.preventDefault(); e.stopPropagation(); }
    };

    el.addEventListener('scroll', updateScrollState, { passive: true });
    el.addEventListener('click', handlePreventClick, { capture: true });
    // Check initial state after mount
    requestAnimationFrame(() => {
      updateScrollState();
      setForcePlay(n => n + 1);
    });

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      el.removeEventListener('click', handlePreventClick, { capture: true });
    };
  }, [items.length]);

  /* ── Auto-scroll slideshow ── */
  useEffect(() => {
    if (isPaused || !isVisible || items.length <= 1) {
      clearInterval(autoplayRef.current);
      return;
    }
    autoplayRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const cardWidth = el.querySelector('.reel-slide')?.offsetWidth || 280;
      const gap = 16;
      const totalItemWidth = cardWidth + gap;
      const maxScroll = el.scrollWidth - el.clientWidth;
      let nextScroll = el.scrollLeft + totalItemWidth;
      if (nextScroll >= maxScroll - 10) nextScroll = 0;
      el.scrollTo({ left: nextScroll, behavior: 'smooth' });
    }, 5000);
    return () => clearInterval(autoplayRef.current);
  }, [isPaused, isVisible, items.length]);

  /* ── CRITICAL: Video playback manager ── */
  // This runs whenever the active slide changes (via scroll or click)
  useEffect(() => {
    // Pause ALL videos first
    Object.values(videoRefs.current).forEach((vid) => {
      if (vid) vid.pause();
    });

    // Play only the current video IF section is visible
    const currentVideo = videoRefs.current[currentIndex];
    if (currentVideo && isVisible) {
      const playPromise = currentVideo.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Autoplay blocked — user will need to interact
          // We'll show a play overlay so they can tap
        });
      }
    }
  }, [currentIndex, isVisible, forcePlay]);

  /* ── Mute changes should propagate to all videos ── */
  useEffect(() => {
    Object.values(videoRefs.current).forEach((vid) => {
      if (vid) vid.muted = muted;
    });
  }, [muted]);

  const handleReelClick = (reel) => {
    if (reel.linkUrl) navigate(reel.linkUrl);
  };

  const scrollToIndex = (idx) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.reel-slide')?.offsetWidth || 280;
    const gap = 16;
    el.scrollTo({ left: (cardWidth + gap) * idx, behavior: 'smooth' });
  };

  return (
    <section
      ref={sectionRef}
      className="relative py-10 md:py-16 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* ── Premium Background with parallax depth ── */}
      <motion.div
        className="absolute inset-0"
        style={{ y: bgParallaxY }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-gray-50 via-white to-gray-50" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
      </motion.div>
      <motion.div
        className="absolute top-10 -left-20 w-64 h-64 rounded-full bg-gradient-to-br from-purple-100/40 to-transparent blur-3xl"
        style={{ y: glow1Y }}
      />
      <motion.div
        className="absolute bottom-10 -right-20 w-72 h-72 rounded-full bg-gradient-to-tl from-amber-100/30 to-transparent blur-3xl"
        style={{ y: glow2Y }}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ── Section Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-8 md:mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-5 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
            <span className="text-gray-400 text-[9px] font-bold uppercase tracking-[0.2em]">
              <span className="inline-block mr-1">🎬</span> In the Spotlight
            </span>
            <span className="h-px w-5 bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
          </div>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-display font-bold tracking-tight text-gray-900">
            Featured Reels
          </h2>
          <p className="text-gray-400 text-xs md:text-sm mt-2 max-w-xl mx-auto font-medium">
            Swipe through our latest collections in motion
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
            </span>
            <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">{items.length} Reels</span>
            <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
            <span className="text-gray-400 text-[10px] font-medium">{isPaused ? '⏸ Paused' : '▶ Auto-playing'}</span>
          </div>
        </motion.div>

        {/* ── Reels Carousel ── */}
        <div className="relative group/slider">
          <div
            ref={scrollRef}
            onMouseDown={(e) => onDragStart(e.clientX)}
            onMouseMove={(e) => onDragMove(e.clientX)}
            onMouseUp={onDragEnd}
            onMouseLeave={onDragEnd}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 select-none"
          >
            {items.map((reel, idx) => {
              const isActive = idx === currentIndex;
              const videoLoaded_ = videoLoaded[idx];

              return (
                <motion.div
                  key={reel.id || idx}
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.6, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className="reel-slide max-sm:w-[200px] max-sm:min-w-[200px] sm:w-[260px] sm:min-w-[260px] md:w-[280px] md:min-w-[280px] snap-start shrink-0"
                >
                  <div
                    className={`group/card relative overflow-hidden rounded-2xl md:rounded-3xl transition-all duration-500 cursor-pointer ${
                      isActive
                        ? 'shadow-2xl shadow-black/10 ring-2 ring-gray-200 scale-[1.02]'
                        : 'shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10'
                    }`}
                    onClick={() => handleReelClick(reel)}
                    style={{ aspectRatio: '9/16', maxHeight: '440px' }}
                  >
                    <div className="absolute inset-0 bg-gray-900">
                      {/* ── Video element (always present since we filter to video-only) ── */}
                      <video
                        ref={(el) => { videoRefs.current[idx] = el; }}
                        src={reel.videoUrl}
                        muted={muted}
                        loop
                        playsInline
                        preload="auto"
                        poster={reel.imageUrl || undefined}
                        onCanPlay={() => {
                          setVideoLoaded(prev => ({ ...prev, [idx]: true }));
                          const vid = videoRefs.current[idx];
                          if (idx === currentIndex && isVisible && vid) {
                            vid.play().catch(() => {});
                          }
                        }}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/card:scale-105"
                      />

                      {/* Loading spinner (before video is ready) */}
                      {!videoLoaded_ && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      )}

                      {/* Gradient overlays */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />

                      {/* ── Play button overlay (when not active or not visible) ── */}
                      {(!isActive || !isVisible) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-all duration-300 group-hover/card:scale-110 group-hover/card:bg-white/30">
                            <Play size={20} className="text-white ml-0.5" fill="white" />
                          </div>
                        </div>
                      )}

                      {/* ── Tap to play overlay (autoplay blocked) ── */}
                      {isActive && isVisible && !videoLoaded_ && (
                        <div
                          className="absolute inset-0 flex items-center justify-center cursor-pointer z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            const vid = videoRefs.current[idx];
                            if (vid) vid.play().catch(() => {});
                          }}
                        >
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center">
                              <Play size={24} className="text-white ml-1" fill="white" />
                            </div>
                            <span className="text-white text-xs font-bold uppercase tracking-wider bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm">
                              Tap to Play
                            </span>
                          </div>
                        </div>
                      )}

                      {/* ── Sound toggle ── */}
                      <div className="absolute top-3 right-3 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMuted(!muted);
                          }}
                          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/60 transition-all duration-200"
                        >
                          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                      </div>

                      {/* ── Content at bottom ── */}
                      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                        <span className="inline-block px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white/90 text-[9px] font-bold uppercase tracking-wider mb-2.5">
                          🎬 Reel
                        </span>
                        <h3 className="text-white font-display text-sm md:text-base font-bold leading-tight line-clamp-2 mb-1.5">
                          {reel.title}
                        </h3>
                        {reel.description && (
                          <p className="text-white/60 text-[10px] md:text-[11px] leading-relaxed line-clamp-2 mb-2.5">
                            {reel.description}
                          </p>
                        )}
                        {reel.linkUrl && (
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(reel.linkUrl); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-sm border border-white/25 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-white/25 transition-all duration-200 group/cta"
                          >
                            View Collection
                            <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── Hover shine effect ── */}
                    <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 pointer-events-none">
                      <div className="absolute top-0 left-[-100%] w-[50%] h-full bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[-20deg] group-hover/card:animate-shimmer" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* ── Navigation Arrows ── */}
          {canScrollLeft && (
            <button
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                const cardWidth = el.querySelector('.reel-slide')?.offsetWidth || 280;
                el.scrollBy({ left: -(cardWidth + 16), behavior: 'smooth' });
              }}
              className="absolute left-2 md:-left-4 top-1/2 -translate-y-1/2 z-20 max-sm:w-10 max-sm:h-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-gray-200/60 flex items-center justify-center text-gray-700 hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
              aria-label="Previous reel"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                const cardWidth = el.querySelector('.reel-slide')?.offsetWidth || 280;
                el.scrollBy({ left: cardWidth + 16, behavior: 'smooth' });
              }}
              className="absolute right-2 md:-right-4 top-1/2 -translate-y-1/2 z-20 max-sm:w-10 max-sm:h-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-gray-200/60 flex items-center justify-center text-gray-700 hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
              aria-label="Next reel"
            >
              <ChevronRight size={18} />
            </button>
          )}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-10" />
          )}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10" />
          )}
        </div>

        {/* ── Navigation Dots ── */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6 md:mt-8">
            {items.map((_, idx) => (
              <button
                key={idx}
                onClick={() => scrollToIndex(idx)}
                className={`relative rounded-full transition-all duration-500 ${
                  idx === currentIndex
                    ? 'w-8 md:w-10 h-2 bg-gray-800'
                    : 'w-2 h-2 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to reel ${idx + 1}`}
              />
            ))}
          </div>
        )}
        <div className="flex items-center justify-center gap-3 mt-4 md:mt-5">
          <span className="h-px w-6 md:w-8 bg-gray-200" />
          <span className="text-gray-400 text-[8px] md:text-[9px] font-bold uppercase tracking-[0.3em] flex items-center gap-1.5">
            <Play size={10} className="text-gray-400" fill="currentColor" />
            Swipe to explore
          </span>
          <span className="h-px w-6 md:w-8 bg-gray-200" />
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { left: -100%; }
          100% { left: 200%; }
        }
        .group-hover\\/card\\:animate-shimmer {
          animation: shimmer 1s ease-in-out;
        }
      `}</style>
    </section>
  );
}

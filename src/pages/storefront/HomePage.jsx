import { ChevronLeft, ChevronRight, RefreshCw, ArrowRight } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useScroll, useSpring } from 'framer-motion';
import ProductCard from '../../components/product/ProductCard';
import SEOHead from '../../components/seo/SEOHead';
import { CUSTOM_TEE_SLUG } from '../../utils/constants';
import { useSettings } from '../../store/useSettings';
import { homepageAPI } from '../../api/homepage';
import { productsAPI } from '../../api/products';
import usePullToRefresh from '../../hooks/usePullToRefresh';

import { formatDate, getImageUrl, getResponsiveSrcSet, getBannerImage, getCategoryImage } from '../../utils/formatters';

// Tier 2 — below-fold / on-demand sections are code-split so they don't ride
// along with the HomePage route chunk. ReelsSection additionally only mounts
// once the user scrolls near it (see ReelsLazyBoundary).
const ReelsSection = lazy(() => import('../../components/storefront/ReelsSection'));
const NewArrivalOfTheWeek = lazy(() => import('../../components/storefront/NewArrivalOfTheWeek'));
const ProfessionalDesignCTA = lazy(() => import('../../components/storefront/ProfessionalDesignCTA'));
const AllReviewsModal = lazy(() => import('../../components/reviews/AllReviewsModal'));


/* ─────────────── ANIMATION WRAPPER — clean rise-and-fade entrance ─────────────── */
function AnimatedSection({ children, className = '', delay = 0, margin = '-60px' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Reels lazy boundary — mounts ReelsSection only when the user scrolls
     near it (600px ahead), so the heavy video-reel chunk never blocks the
     initial HomePage paint or the rest of the page's scripts. ── */
function ReelsLazyBoundary({ reels, loading }) {
  const [mounted, setMounted] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || mounted) return;
    if (typeof IntersectionObserver === 'undefined') {
      setMounted(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setMounted(true);
        observer.disconnect();
      }
    }, { rootMargin: '600px 0px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted]);

  return (
    <>
      {/* 1px-tall sentinel — a zero-height div never intersects (IntersectionObserver
          reports isIntersecting:false for zero-area targets), so the reels section
          would never mount. */}
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      {mounted && (
        <Suspense fallback={null}>
          <ReelsSection reels={reels} loading={loading} />
        </Suspense>
      )}
    </>
  );
}

/* ── useInView — fires once when the element nears the viewport, used to
     lazily fetch the below-the-fold homepage sections on scroll. ── */
function useInView(ref, enabled = true, rootMargin = '600px 0px') {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!enabled || inView) return;
    const el = ref.current;
    if (!el) return; // section not mounted yet — effect re-runs when enabled flips
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setInView(true);
        observer.disconnect();
      }
    }, { rootMargin });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled, inView, rootMargin]);

  return inView;
}

/* ── Scroll Progress Bar — subtle reading progress ── */
function ScrollProgressBar() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] origin-left z-[101] pointer-events-none bg-gray-900"
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
}

/* ─────────────── SHARED SECTION HEADER — editorial, type-led ─────────────── */
function SectionHeading({ eyebrow, title, description, action }) {
  return (
    <div className="mb-6 md:mb-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-gray-200 pb-4 md:pb-5">
        <div className="min-w-0">
          {eyebrow && (
            <p className="flex items-center gap-2.5 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400 mb-2.5">
              <span className="w-8 h-px bg-gray-300" />
              {eyebrow}
            </p>
          )}
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-extrabold tracking-tight text-gray-900 leading-[1.1]">
            {title}
          </h2>
          {description && (
            <p className="mt-2.5 text-sm md:text-[15px] leading-relaxed text-gray-500 max-w-xl">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

function ViewAllLink({ onClick, children }) {
  return (
    <button
      onClick={onClick}
      className="hidden md:inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-900 group shrink-0 pb-0.5"
    >
      <span className="border-b border-gray-900 pb-0.5 transition-colors duration-300 group-hover:border-gray-300">{children}</span>
      <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
    </button>
  );
}

/* ─────────────── FULL-BLEED HERO BANNER — clean editorial carousel ─────────────── */
function HeroBanner({ banners }) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();

  const slides = banners || [];

  const next = useCallback(() => setCurrent((c) => (c + 1) % slides.length), [slides.length]);
  const prev = useCallback(() => setCurrent((c) => (c - 1 + slides.length) % slides.length), [slides.length]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = slides[current];

  // If no banners available, hide the hero section entirely
  if (!slide || slides.length === 0) {
    return null;
  }

  const displayMode = slide.displayMode || 'DEFAULT';
  const isImageOnly = displayMode === 'IMAGE_ONLY';
  const isTitleOnly = displayMode === 'TITLE_ONLY';
  const bannerLink = slide.linkUrl || (isImageOnly ? '/products' : null);

  const handleBannerClick = () => {
    if (bannerLink) navigate(bannerLink);
  };

  const heroContent = (align) => (
    <div className={`max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 flex ${
      align === 'left' ? 'justify-start text-left' :
      align === 'right' ? 'justify-end text-right' :
      'justify-center text-center'
    }`}>
      <div className="max-w-xl">
        {slide.tagline && (
          <span className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-md border border-gold/60 text-[#F0DEB4] text-[10px] md:text-xs font-bold px-4 py-1.5 rounded-full mb-5 tracking-[0.2em] uppercase">
            {slide.tagline}
          </span>
        )}
        <h1 className={`text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-display font-extrabold leading-[1.05] mb-5 whitespace-pre-line ${
          slide.textDark ? 'text-gray-900' : 'text-white'
        }`}>
          {slide.title}
        </h1>
        {slide.subtitle && (
          <p className={`text-base md:text-lg mb-8 leading-relaxed font-medium ${
            slide.textDark ? 'text-gray-600' : 'text-white/80'
          }`}>
            {slide.subtitle}
          </p>
        )}
        <button
          onClick={() => navigate(bannerLink || '/products')}
          className={`group/btn inline-flex items-center gap-2.5 px-8 md:px-10 py-3.5 md:py-4 rounded-full text-sm md:text-base font-bold transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-black/10 ${
            slide.textDark
              ? 'bg-black text-white hover:bg-gray-800'
              : 'bg-white text-black hover:bg-gray-100'
          }`}
        >
          {slide.cta || t('home.shop_now')}
          <ArrowRight size={17} className="transition-transform duration-300 group-hover/btn:translate-x-1" />
        </button>
      </div>
    </div>
  );

  const heroNav = (
    <>
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous slide"
            className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-white hover:bg-white/25 transition-colors flex items-center justify-center"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            aria-label="Next slide"
            className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 md:w-11 md:h-11 rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-white hover:bg-white/25 transition-colors flex items-center justify-center"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            aria-label={`Go to slide ${idx + 1}`}
            className={`h-[3px] rounded-full transition-all duration-300 ${idx === current ? 'w-8 bg-white' : 'w-3 bg-white/40 hover:bg-white/70'}`}
          />
        ))}
      </div>
    </>
  );

  // Title-Only Mode: text on a black canvas
  if (isTitleOnly) {
    return (
      <div className="relative w-full h-[420px] sm:h-[480px] md:h-[560px] overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0 flex items-center"
          >
            {heroContent(slide.align)}
          </motion.div>
        </AnimatePresence>
        {heroNav}
      </div>
    );
  }

  // Image-Only Mode: plain image strip
  if (isImageOnly) {
    const imgSrc = getImageUrl(getBannerImage(slide));
    return (
      <a
        href={bannerLink || '#'}
        onClick={(e) => { e.preventDefault(); handleBannerClick(); }}
        className="relative w-full block bg-gray-950 group"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
          >
            <img
              src={imgSrc}
              srcSet={getResponsiveSrcSet(imgSrc, [640, 1024, 1600, 2000])}
              sizes="100vw"
              alt=""
              className="w-full h-auto"
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </motion.div>
        </AnimatePresence>
        {heroNav}
      </a>
    );
  }

  // Default Mode: image background + text
  return (
    <div className="relative w-full h-[420px] sm:h-[520px] md:h-[640px] lg:h-[700px] overflow-hidden bg-gray-950">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <img
            src={getImageUrl(getBannerImage(slide))}
            srcSet={getResponsiveSrcSet(getBannerImage(slide), [640, 1024, 1600, 2000])}
            sizes="100vw"
            alt="Hero Banner"
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover"
          />
          {/* Readability overlay */}
          <div className={`absolute inset-0 ${
            slide.align === 'left' ? 'bg-gradient-to-r from-black/70 via-black/35 to-black/10' :
            slide.align === 'right' ? 'bg-gradient-to-l from-black/70 via-black/35 to-black/10' :
            'bg-black/45'
          }`} />
          {/* Text Content */}
          <div className="absolute inset-0 flex items-center">
            {heroContent(slide.align)}
          </div>
        </motion.div>
      </AnimatePresence>
      {heroNav}
    </div>
  );
}

/* ─────────────── CATEGORIES — horizontal card carousel with arrows ─────────────── */
function CategorySection({ categories }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const autoplayRef = useRef(null);
  const resumeTimerRef = useRef(null);
  const cats = Array.from(Array.isArray(categories) ? categories : []);

  // Pause autoplay the moment the user grabs the section; resume only after
  // they let go and stay idle for a while — keeps the row stable to touch.
  const pauseAutoplay = () => {
    setIsPaused(true);
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  };
  const scheduleResume = (delay) => {
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setIsPaused(false), delay);
  };

  // Auto-slide: advance one card every 4s, loop back to start at the end
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || cats.length <= 1) return;
    if (isPaused) return undefined;

    const tick = () => {
      const card = el.querySelector('.category-card');
      if (!card) return;
      const w = card.offsetWidth + 24; // card width + gap
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 10;
      if (atEnd) {
        // Loop back to start smoothly
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: w, behavior: 'smooth' });
      }
    };

    autoplayRef.current = setInterval(tick, 4000);
    return () => clearInterval(autoplayRef.current);
  }, [isPaused, cats.length]);

  useEffect(() => () => clearTimeout(resumeTimerRef.current), []);

  if (cats.length === 0) return null;

  const openCategory = (cat) => navigate(`/products?category=${cat.slug}`);

  const scrollBy = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('.category-card');
    const w = card?.offsetWidth || 300;
    el.scrollBy({ left: dir * (w + 24), behavior: 'smooth' });
  };

  return (
    <section className="py-12 md:py-16 bg-black">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading — matches the other dark sections (reviews style) */}
        <div className="border-b border-white/10 pb-4 md:pb-5 mb-8 md:mb-12">
          <p className="flex items-center gap-2.5 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.22em] text-white/40 mb-2.5">
            <span className="w-8 h-px bg-white/20" />
            {t('home.explore')}
          </p>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-extrabold tracking-tight text-white leading-[1.1]">
            {t('home.shop_by_category')}
          </h2>
        </div>

        {/* Horizontal scroll row with arrows + autoplay */}
        <div
          className="relative group/cat"
          onMouseEnter={pauseAutoplay}
          onMouseLeave={() => scheduleResume(1500)}
          onPointerDown={pauseAutoplay}
          onPointerUp={() => scheduleResume(3000)}
          onPointerCancel={() => scheduleResume(1500)}
        >
          <div
            ref={scrollRef}
            onScroll={() => { pauseAutoplay(); scheduleResume(2500); }}
            className="flex gap-5 sm:gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 select-none touch-pan-y overscroll-x-contain"
          >
            {cats.slice(0, 8).map((cat, i) => (
              <motion.button
                key={cat.slug}
                type="button"
                onClick={() => openCategory(cat)}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className="category-card group snap-start shrink-0 w-[calc(50%-12px)] sm:w-[260px] md:w-[calc(25%-18px)]"
              >
                {/* Portrait card with overlay */}
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-900">
                  {getCategoryImage(cat) ? (
                    <img
                      loading="lazy"
                      decoding="async"
                      draggable={false}
                      src={getImageUrl(getCategoryImage(cat))}
                      srcSet={getResponsiveSrcSet(getCategoryImage(cat), [400, 600, 800])}
                      sizes="(max-width: 640px) 260px, (max-width: 768px) 300px, 25vw"
                      alt={cat.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                      <span className="font-display font-extrabold text-4xl text-white/20 uppercase">
                        {cat.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  {/* Dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  {/* Overlaid category name + tagline */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 md:p-6">
                    <h3 className="text-white font-display font-extrabold text-base sm:text-lg md:text-xl uppercase tracking-wide leading-tight">
                      {cat.name}
                    </h3>
                    {cat.description && (
                      <p className="text-white/50 text-[10px] sm:text-xs mt-1 uppercase tracking-wider leading-snug line-clamp-2">
                        {cat.description.split(/[—?]/)[0].trim()}
                      </p>
                    )}
                  </div>
                </div>
                {/* Category name below card */}
                <p className="mt-3 text-white/70 text-sm font-medium text-center">
                  {cat.name}
                </p>
              </motion.button>
            ))}
          </div>

          {/* White circular scroll arrows — visible on all sizes, smaller on mobile */}
          <button
            onClick={() => scrollBy(-1)}
            className="flex absolute left-2 md:left-0 top-[calc(40%-14px)] md:top-[calc(40%-20px)] z-20 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg items-center justify-center text-black hover:scale-110 transition-all duration-300 active:scale-90"
            aria-label="Scroll categories left"
          >
            <ChevronLeft size={14} className="md:hidden" />
            <ChevronLeft size={18} className="hidden md:block" />
          </button>
          <button
            onClick={() => scrollBy(1)}
            className="flex absolute right-2 md:right-0 top-[calc(40%-14px)] md:top-[calc(40%-20px)] z-20 w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg items-center justify-center text-black hover:scale-110 transition-all duration-300 active:scale-90"
            aria-label="Scroll categories right"
          >
            <ChevronRight size={14} className="md:hidden" />
            <ChevronRight size={18} className="hidden md:block" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────── PREMIUM PRODUCT SLIDER (Horizontal Desktop / Vertical Mobile) ─────────────── */
function ProductSlider({ products: rawProducts, cardClassName = '', compact = false }) {
  // Hide the custom t-shirt design product from all homepage listings
  const products = (rawProducts || []).filter(p => p.slug !== CUSTOM_TEE_SLUG);
  const scrollRef = useRef(null);
  const wrapperRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  // When every product fits fully in view, render a static row instead of a
  // carousel so no card is ever cut off at the edge.
  const [fitsAll, setFitsAll] = useState(false);
  const autoplayRef = useRef(null);
  // Infinite loop: duplicate the product set on desktop and wrap seamlessly.
  const isLoop = !isMobile && products.length > 1 && !fitsAll;
  const programmaticRef = useRef(false);
  const wrapTimeoutRef = useRef(null);
  const finishWrapRef = useRef(null);

  // Width of a single copy of the product set (used as the seamless wrap point)
  const getCopyWidth = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return 0;
    const cards = el.querySelectorAll('.product-slide');
    if (!cards.length || cards.length < products.length * 2) return 0;
    return cards[products.length].offsetLeft - cards[0].offsetLeft;
  }, [products.length]);

  // Viewport-aware copy count: the track must always be able to scroll a full
  // copy width past the wrap point, otherwise the invisible fold-back can't
  // fire and the carousel visibly stops at the end of the duplicated set.
  // Need (C-1)*cw >= clientWidth + gap, so render extra copies for small sets.
  const [copies, setCopies] = useState(2);
  useEffect(() => {
    if (isMobile || products.length <= 1) return;
    const el = scrollRef.current;
    if (!el) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const cards = el.querySelectorAll('.product-slide');
      if (!cards.length || cards.length < products.length * 2) return;
      const cw = cards[products.length].offsetLeft - cards[0].offsetLeft;
      if (cw <= 0) return;
      // Actual gap between adjacent cards (differs by breakpoint: 12px / 16px)
      const period = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : cw / products.length;
      const gap = Math.max(0, period - (cards[0].offsetWidth || period));
      const clientW = el.clientWidth || window.innerWidth;
      setCopies(Math.max(2, Math.ceil((clientW + gap) / cw) + 1));
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
  }, [isMobile, products.length, getCopyWidth]);

  // If every product fits fully in view, stop pretending it's a carousel —
  // render them all (no loop, no scroll) so nothing is ever cut off.
  useEffect(() => {
    if (isMobile || products.length <= 1) {
      setFitsAll(false);
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    let disposed = false;
    const measure = () => {
      if (disposed) return;
      const cards = el.querySelectorAll('.product-slide');
      if (!cards.length || cards.length < products.length) return;
      let fullyVisible = 0;
      for (let i = 0; i < products.length; i++) {
        const card = cards[i];
        if (card.offsetLeft + card.offsetWidth <= el.clientWidth + 1) fullyVisible++;
        else break;
      }
      setFitsAll(products.length <= fullyVisible);
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
  }, [isMobile, products.length, fitsAll]);

  // Smooth-scroll forward, wrapping invisibly at the end of the set so the
  // carousel loops forever instead of stopping at the last product.
  const smoothAdvance = useCallback((amount) => {
    const el = scrollRef.current;
    if (!el) return;
    const cw = getCopyWidth();
    if (!isLoop || cw <= 0) {
      el.scrollTo({ left: Math.max(0, el.scrollLeft + amount), behavior: 'smooth' });
      return;
    }
    const s = el.scrollLeft;
    const target = s + amount;

    // ── Backward wrap: scrolling left past the start jumps into the duplicate
    //    (identical content → invisible) and then glides left into the previous
    //    cards, so the left arrow never hits a dead end. ──
    if (target < 0) {
      programmaticRef.current = true;
      if (wrapTimeoutRef.current) {
        clearTimeout(wrapTimeoutRef.current);
        wrapTimeoutRef.current = null;
      }
      if (finishWrapRef.current) {
        el.removeEventListener('scrollend', finishWrapRef.current);
        finishWrapRef.current = null;
      }
      const maxRaw = el.scrollWidth - el.clientWidth;
      el.scrollLeft = Math.min(s + cw, maxRaw);
      el.scrollTo({ left: s + cw + amount, behavior: 'smooth' });

      const finishWrap = () => {
        wrapTimeoutRef.current = null;
        el.removeEventListener('scrollend', finishWrapRef.current);
        finishWrapRef.current = null;
        // A user drag took over mid-wrap — leave the fold to the drag handlers.
        if (!programmaticRef.current) return;
        programmaticRef.current = false;
      };
      finishWrapRef.current = finishWrap;
      el.addEventListener('scrollend', finishWrap, { once: true });
      wrapTimeoutRef.current = setTimeout(finishWrap, 2500);
      return;
    }

    if (target < cw) {
      // Normal advance inside the first copy.
      el.scrollTo({ left: target, behavior: 'smooth' });
      return;
    }
    // Scroll forward through the duplicate copy, then fold back invisibly
    // (content at x is identical to content at x - cw, so the jump is seamless).
    programmaticRef.current = true;
    if (wrapTimeoutRef.current) {
      clearTimeout(wrapTimeoutRef.current);
      wrapTimeoutRef.current = null;
    }
    if (finishWrapRef.current) {
      el.removeEventListener('scrollend', finishWrapRef.current);
      finishWrapRef.current = null;
    }
    const maxRaw = el.scrollWidth - el.clientWidth;
    el.scrollTo({ left: Math.min(target, maxRaw), behavior: 'smooth' });

    const finishWrap = () => {
      wrapTimeoutRef.current = null;
      el.removeEventListener('scrollend', finishWrapRef.current);
      finishWrapRef.current = null;
      // A user drag took over mid-wrap — leave the fold to the drag handlers.
      if (!programmaticRef.current) return;
      const landed = el.scrollLeft;
      if (landed >= cw) {
        // Invisible fold: identical duplicated content.
        el.scrollLeft = landed - cw;
      } else {
        // Safety net (shouldn't happen thanks to viewport-aware copies).
        el.scrollLeft = Math.max(0, target - cw);
      }
      programmaticRef.current = false;
    };
    finishWrapRef.current = finishWrap;
    el.addEventListener('scrollend', finishWrap, { once: true });
    // Long fallback for browsers without `scrollend` — the scrollend listener
    // normally fires first, exactly when the smooth scroll settles.
    wrapTimeoutRef.current = setTimeout(finishWrap, 2500);
  }, [isLoop, getCopyWidth]);

  // Autoplay — scrolls every 5s (pauses on hover)
  useEffect(() => {
    if (isMobile || products.length <= 1 || fitsAll) return;
    const el = scrollRef.current;
    if (!el) return;

    const scrollNext = () => {
      const card = el.querySelector('.product-slide');
      if (!card) return;
      const cardWidth = card.offsetWidth;
      const gap = 12;
      smoothAdvance(cardWidth + gap);
    };

    const startAutoplay = () => {
      autoplayRef.current = setInterval(scrollNext, 5000);
    };

    if (!isHovered) {
      startAutoplay();
    }

    return () => clearInterval(autoplayRef.current);
  }, [isMobile, isHovered, products.length, smoothAdvance, fitsAll]);

  // Update scroll button visibility on scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      // In infinite-loop mode both directions are always available (seamless wrap)
      setCanScrollLeft(isLoop || scrollLeft > 8);
      setCanScrollRight(isLoop || scrollLeft < scrollWidth - clientWidth - 8);
      // Scroll progress — inside the loop, measure against one copy width so
      // the bar fills once per full lap and resets invisibly on the wrap.
      if (isLoop) {
        const cw = getCopyWidth();
        if (cw > 0) setProgress(Math.min(1, (scrollLeft % cw) / cw));
      } else {
        const max = scrollWidth - clientWidth;
        setProgress(max > 0 ? Math.min(1, Math.max(0, scrollLeft / max)) : 0);
      }
    };
    el.addEventListener('scroll', update, { passive: true });
    update();
    return () => el.removeEventListener('scroll', update);
  }, [products, isLoop, getCopyWidth]);

  // Infinite loop — wrap the scroll position back to the first copy seamlessly
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !isLoop) return;
    const wrap = () => {
      if (programmaticRef.current) return;
      const cw = getCopyWidth();
      if (cw > 0 && el.scrollLeft >= cw) el.scrollLeft -= cw;
    };
    el.addEventListener('scroll', wrap, { passive: true });
    return () => {
      el.removeEventListener('scroll', wrap);
      // Don't let a pending programmatic wrap fire against a detached node
      if (wrapTimeoutRef.current) clearTimeout(wrapTimeoutRef.current);
      if (finishWrapRef.current) {
        el.removeEventListener('scrollend', finishWrapRef.current);
        finishWrapRef.current = null;
      }
      // Never leave the listener stuck in programmatic mode (e.g. if the
      // products count changes and this effect re-runs mid-session)
      programmaticRef.current = false;
    };
  }, [isLoop, getCopyWidth]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const scrollByCard = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('.product-slide');
    if (!card) return;
    const cardWidth = card.offsetWidth;
    const gap = 12;
    smoothAdvance(direction * (cardWidth + gap));
  };



  if (!products || products.length === 0) return null;

  // Desktop carousel: duplicate the set enough times so scrolling loops forever.
  const loopProducts = isLoop
    ? Array.from({ length: Math.max(2, copies) }, () => products).flat()
    : products;

  const scrollableTrackClass = [
    'max-sm:grid max-sm:grid-cols-2 sm:flex sm:flex-row gap-3 sm:gap-3 md:gap-4',
    // Mobile: plain 2-col grid that flows with the page (no nested scroll/clipping).
    // Desktop: horizontal carousel only.
    'sm:overflow-x-auto',
    'sm:snap-x snap-mandatory',
    'scrollbar-hide select-none',
  ].join(' ');

  // NOTE: keep the plain `product-slide` token on desktop too — it is the JS
  // selector hook used by scrollByCard/autoplay/getCopyWidth. `sm:product-slide`
  // (a Tailwind-variant token) is NOT matched by querySelector('.product-slide'),
  // which silently broke arrow clicks + the infinite loop on desktop.
  const cardClass = isMobile
    ? 'product-slide'
    : compact
      ? 'max-sm:w-full product-slide sm:w-[300px] sm:min-w-[300px] sm:snap-start sm:shrink-0'
      : 'max-sm:w-full product-slide sm:w-[302px] sm:min-w-[302px] sm:snap-start sm:shrink-0';

  return (
    <div
      ref={wrapperRef}
      className="relative group/slider"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >

      {/* Scrollable Track */}
      <div
        ref={scrollRef}
        className={scrollableTrackClass}
      >
        {loopProducts.map((p, idx) => (
          <motion.div
            key={`${p.id}-${idx}`}
            // Duplicated copies stay visible so the wrap never flashes blank
            initial={idx >= products.length ? { opacity: 1 } : { opacity: 0, scale: 0.9, [isMobile ? 'y' : 'x']: 40 }}
            whileInView={{ opacity: 1, scale: 1, [isMobile ? 'y' : 'x']: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.6, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
            className={cardClass}
          >
            <ProductCard product={p} className={cardClassName} imageAspect={compact ? 'aspect-[300/392] max-sm:aspect-[4/5]' : undefined} />
          </motion.div>
        ))}

      </div>

      {/* Scroll progress indicator — premium underline */}
      {!isMobile && !fitsAll && products.length > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <span className="h-px w-6 bg-gray-200" />
          <div className="w-36 md:w-44 h-[2px] rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-gray-900 transition-[width] duration-300 ease-out"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <span className="h-px w-6 bg-gray-200" />
        </div>
      )}

      {/* Desktop scroll arrows — glass, refined */}
      {!isMobile && !fitsAll && (
        <>
          <button
            onClick={() => scrollByCard(-1)}
            className={`absolute left-1 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200/90 shadow-lg shadow-black/5 flex items-center justify-center text-gray-700 hover:text-gray-900 hover:border-gray-400 hover:scale-105 hover:shadow-xl transition-all duration-300 active:scale-90 ${
              canScrollLeft ? 'opacity-100' : 'opacity-25'
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scrollByCard(1)}
            className={`absolute right-1 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200/90 shadow-lg shadow-black/5 flex items-center justify-center text-gray-700 hover:text-gray-900 hover:border-gray-400 hover:scale-105 hover:shadow-xl transition-all duration-300 active:scale-90 ${
              canScrollRight ? 'opacity-100' : 'opacity-25'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </>
      )}

    </div>
  );
}

function NewArrivalsSection({ products }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!products || products.length === 0) return null;

  return (
    <section className="py-12 md:py-20 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('home.fresh_drops')}
          title={t('home.new_arrivals')}
          action={<ViewAllLink onClick={() => navigate('/products/section/new-arrivals')}>{t('home.browse_all')}</ViewAllLink>}
        />
        <div className="-mx-4 sm:-mx-6 lg:mx-0 max-sm:mx-0">
          <ProductSlider products={products} compact />
        </div>
        <button
          onClick={() => navigate('/products/section/new-arrivals')}
          className="md:hidden w-full mt-6 py-3.5 rounded-xl border border-gray-200 text-gray-900 font-bold text-sm uppercase tracking-wider hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          {t('home.browse_all')}
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}

function NewArrivalsSkeleton() {
  return (
    <section className="py-12 md:py-20 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-5 mb-10">
          <div className="space-y-3">
            <Skeleton className="!w-28 !h-3 !rounded-md" />
            <Skeleton className="!w-48 !h-8 md:!h-10 !rounded-lg" />
          </div>
          <Skeleton className="!w-24 !h-4 !rounded-md hidden md:block" />
        </div>
        <div className="flex gap-3 md:gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="max-sm:w-[160px] max-sm:min-w-[160px] sm:w-[300px] sm:min-w-[300px] shrink-0 bg-white rounded-xl overflow-hidden border border-gray-200/80">
              <Skeleton className="!w-full !aspect-[300/392] !rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="!w-20 !h-3 !rounded-md" />
                <Skeleton className="!w-40 !h-4 !rounded-md" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="!w-10 !h-5 !rounded" />
                  <Skeleton className="!w-16 !h-3 !rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── PRODUCT ROW — Best Sellers / Featured ─────────────── */
function ProductRow({ title, products }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!products || products.length === 0) return null;

  const sectionSlug = title === 'Best Sellers' ? 'best-sellers' : 'featured';

  return (
    <section className="py-12 md:py-20 bg-[#fafafa] border-y border-gray-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('home.trending_now')}
          title={title}
          action={<ViewAllLink onClick={() => navigate(`/products/section/${sectionSlug}`)}>{t('home.browse_all')}</ViewAllLink>}
        />
        <div className="-mx-4 sm:-mx-6 lg:mx-0 max-sm:mx-0">
          <ProductSlider products={products} compact />
        </div>
        <button
          onClick={() => navigate(`/products/section/${sectionSlug}`)}
          className="md:hidden w-full mt-6 py-3.5 rounded-xl border border-gray-200 text-gray-900 font-bold text-sm uppercase tracking-wider hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
        >
          {t('home.browse_all')}
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}

/* ─────────────── CURATED LOOKS — mobile grid + desktop scroll gallery ─────────────── */
function LookCard({ item, idx }) {
  return (
    <Link
      to={`/looks/${item.slug}`}
      className="group relative block overflow-hidden rounded-xl md:rounded-2xl bg-gray-100"
    >
      {/* Same image ratio as the homepage product cards so rows align */}
      <div className="aspect-[300/392] max-sm:aspect-[4/5] relative overflow-hidden">
        <img
          draggable={false}
          src={item.image_url || item.imageUrl || item.image}
          srcSet={getResponsiveSrcSet(item.image_url || item.imageUrl || item.image)}
          sizes="(max-width: 640px) 45vw, 300px"
          alt={item.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />
        {/* Look number */}
        <span className="absolute top-2.5 left-2.5 md:top-3 md:left-3 inline-flex items-center px-2 py-0.5 md:px-2.5 md:py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/25 text-white/90 text-[8px] md:text-[9px] font-bold tracking-[0.18em]">
          {String(idx + 1).padStart(2, '0')}
        </span>
        {/* Overlaid look name + tagline, same pattern as category cards */}
        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-5">
          <h4 className="text-white font-display font-bold text-[13px] md:text-lg uppercase tracking-wide leading-tight line-clamp-1">
            {item.name}
          </h4>
          {item.description && (
            <p className="mt-1 text-white/60 text-[10px] md:text-xs uppercase tracking-wider leading-snug line-clamp-2">
              {item.description.split(/[—–?]/)[0].trim()}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function CuratedLooksSection({ looks: curatedLooks = [] }) {
  const { t } = useTranslation();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      window.removeEventListener('resize', updateArrows);
    };
  }, [curatedLooks.length]);

  if (!curatedLooks || curatedLooks.length === 0) return null;

  const scrollBy = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('.look-card');
    const w = card?.offsetWidth || 320;
    el.scrollBy({ left: dir * (w + 20), behavior: 'smooth' });
  };

  return (
    <section className="py-12 md:py-20 bg-[#fafafa]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('home.style_inspiration')}
          title={t('home.curated_looks')}
          description="Curated looks designed to bring together effortless styling, modern streetwear aesthetics, and everyday versatility in one complete fit."
        />

        {/* Mobile: static 2-column grid — all looks visible at once */}
        <div className="grid grid-cols-2 gap-3 sm:hidden">
          {curatedLooks.map((item, idx) => (
            <LookCard key={item.id || idx} item={item} idx={idx} />
          ))}
        </div>

        {/* Desktop: scrollable row with drag + arrows */}
        <div className="hidden sm:block relative group/looks">
          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 select-none"
          >
            {curatedLooks.map((item, idx) => (
              <motion.div
                key={item.id || idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.55, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className="look-card snap-start shrink-0 w-[280px] md:w-[300px]"
              >
                <LookCard item={item} idx={idx} />
              </motion.div>
            ))}
          </div>

          {/* Desktop scroll arrows */}
          {canScrollLeft && (
            <button
              onClick={() => scrollBy(-1)}
              aria-label="Scroll looks left"
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg shadow-black/5 text-gray-700 hover:border-gray-400 hover:scale-105 items-center justify-center transition-all duration-300 active:scale-90"
            >
              <ChevronLeft size={16} />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scrollBy(1)}
              aria-label="Scroll looks right"
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-lg shadow-black/5 text-gray-700 hover:border-gray-400 hover:scale-105 items-center justify-center transition-all duration-300 active:scale-90"
            >
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── REVIEW SLIDER ─────────────── */
function mapReview(review) {
  const user = review.user || {};
  const product = review.product || {};
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Customer';
  const avatar = user.avatar ? getImageUrl(user.avatar) : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff&size=120`;
  const date = review.created_at
    ? formatDate(review.created_at)
    : '';

  return {
    id: review.id, name: fullName, location: (user.city || 'IN') + (user.country ? ', ' + user.country : ''),
    avatar, rating: review.rating, text: review.comment || review.title || '',
    product: product.name || '', date: date || 'Verified purchase',
  };
}

function PremiumReviewSlider({ reviews: reviewsProp = [], onOpenAllReviews }) {
  const { t } = useTranslation();
  const REVIEWS_DATA = (reviewsProp.length > 0 ? reviewsProp : []).map(mapReview);

  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [slideWidth, setSlideWidth] = useState(0);
  const autoplayRef = useRef(null);



  /* â”€â”€ Touch/swipe drag state â”€â”€ */
  const touchDragRef = useRef({ startX: 0, startY: 0, isDragging: false, moved: false });
  const [isTouchDragging, setIsTouchDragging] = useState(false);

  /* â”€â”€ Subtle scroll-linked parallax (static fallback â€” avoids per-frame layout thrash from useScroll) â”€â”€ */

  /* â”€â”€ Measure card width for translate-based sliding â”€â”€ */
  useEffect(() => {
    const calcWidth = () => {
      if (trackRef.current) {
        const firstCard = trackRef.current.querySelector('.review-slide');
        if (firstCard) {
          const gap = window.innerWidth >= 768 ? 16 : 12;
          setSlideWidth(firstCard.offsetWidth + gap);
        }
      }
    };
    calcWidth();
    window.addEventListener('resize', calcWidth);
    return () => window.removeEventListener('resize', calcWidth);
  }, [REVIEWS_DATA.length]);



  /* â”€â”€ Autoplay â”€â”€ */
  useEffect(() => {
    if (isPaused || REVIEWS_DATA.length <= 1) {
      clearInterval(autoplayRef.current);
      return;
    }

    autoplayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % REVIEWS_DATA.length);
    }, 4000);

    return () => clearInterval(autoplayRef.current);
  }, [isPaused, REVIEWS_DATA.length]);

  const scrollToIndex = (idx) => {
    setCurrentIndex(idx);
  };

  /* â”€â”€ Swipe to next/prev â”€â”€ */
  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % REVIEWS_DATA.length);
  }, [REVIEWS_DATA.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + REVIEWS_DATA.length) % REVIEWS_DATA.length);
  }, [REVIEWS_DATA.length]);

  /* â”€â”€ Touch/drag swipe handlers â”€â”€ */
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchDragRef.current = { startX: touch.clientX, startY: touch.clientY, isDragging: true, moved: false };
    setIsTouchDragging(true);
  }, []);

  const handleTouchMove = useCallback((e) => {
    const td = touchDragRef.current;
    if (!td.isDragging) return;
    const touch = e.touches[0];
    const diffX = touch.clientX - td.startX;
    const diffY = touch.clientY - td.startY;
    // Only prevent default for horizontal swipes (not vertical scrolling)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 5) {
      e.preventDefault();
      td.moved = true;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const td = touchDragRef.current;
    if (!td.isDragging) return;
    td.isDragging = false;
    setIsTouchDragging(false);
    // Trigger swipe if moved enough
    setTimeout(() => { td.moved = false; }, 100);
  }, []);

  const handleSwipe = useCallback((delta) => {
    if (delta > 40) {
      // Swiped right â†’ prev
      goPrev();
    } else if (delta < -40) {
      // Swiped left â†’ next
      goNext();
    }
  }, [goNext, goPrev]);

  /* ── Mouse drag/swipe handlers for desktop ── */
  const handleMouseDown = useCallback((e) => {
    touchDragRef.current = { startX: e.clientX, startY: e.clientY, isDragging: true, moved: false };
    setIsTouchDragging(true);
  }, []);

  const handleMouseMove = useCallback((e) => {
    const td = touchDragRef.current;
    if (!td.isDragging) return;
    const diffX = e.clientX - td.startX;
    const diffY = e.clientY - td.startY;
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 5) {
      td.moved = true;
    }
  }, []);

  const handleMouseUp = useCallback((e) => {
    const td = touchDragRef.current;
    if (td.isDragging) {
      handleSwipe(e.clientX - td.startX);
    }
    td.isDragging = false;
    setIsTouchDragging(false);
    setTimeout(() => { td.moved = false; }, 100);
  }, [handleSwipe]);

  const handleMouseLeave = useCallback((e) => {
    const td = touchDragRef.current;
    if (td.isDragging) {
      handleSwipe(e.clientX - td.startX);
    }
    td.isDragging = false;
    setIsTouchDragging(false);
    setTimeout(() => { td.moved = false; }, 100);
  }, [handleSwipe]);

  const avgRating = REVIEWS_DATA.length > 0
    ? (REVIEWS_DATA.reduce((sum, r) => sum + r.rating, 0) / REVIEWS_DATA.length).toFixed(1)
    : '0.0';
  const totalReviews = REVIEWS_DATA.length;

  if (REVIEWS_DATA.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="content-section relative py-10 md:py-14 bg-gradient-to-br from-[#0c0c0c] via-[#111] to-[#0a0a0a] overflow-hidden select-none"
      style={{ touchAction: 'pan-y' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={(e) => {
        setIsPaused(false);
        handleMouseLeave(e);
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={(e) => {
        const td = touchDragRef.current;
        if (td.isDragging) {
          const touch = e.changedTouches[0];
          if (touch) {
            handleSwipe(touch.clientX - td.startX);
          }
        }
        handleTouchEnd();
      }}
    >
      {/* Subtle ambient glow â€” static gradient (no per-frame parallax, avoids scroll jank) */}
      <div className="absolute inset-0 pointer-events-none will-change-transform"
        style={{ transform: 'translateZ(0)' }}
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.5) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.2) 0%, transparent 50%)',
        }} />
      </div>
      <div
        className="absolute top-[-120px] right-[-80px] w-[300px] h-[300px] rounded-full bg-primary/3 blur-[100px] opacity-60 pointer-events-none"
        style={{ transform: 'translateZ(0)' }}
      />
      <div
        className="absolute bottom-[-100px] left-[-60px] w-[250px] h-[250px] rounded-full bg-white/[0.015] blur-[80px] pointer-events-none"
        style={{ transform: 'translateZ(0)' }}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* â”€â”€ Compact, elegant header â€” clickable to view all reviews â”€â”€ */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6 md:mb-8"
        >
          <button onClick={onOpenAllReviews} className="w-full group text-left">
            <div className="border-b border-white/10 pb-4 md:pb-5">
              <p className="flex items-center gap-2.5 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.22em] text-white/40 mb-2.5">
                <span className="w-8 h-px bg-white/20" />
                {t('home.testimonials')}
              </p>
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-extrabold tracking-tight text-white leading-[1.1]">
                {t('home.what_customers_say')}
              </h2>
            </div>
            {/* Compact social proof row */}
            <div className="flex items-center justify-center gap-2.5 mt-2.5">
              <div className="flex -space-x-1">
                {[REVIEWS_DATA[0], REVIEWS_DATA[1], REVIEWS_DATA[2]].filter(Boolean).map((r, i) => (
                  <div key={i} className="w-5 h-5 md:w-[22px] md:h-[22px] rounded-full ring-2 ring-[#111] overflow-hidden">
                    <img src={r.avatar} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
                <div className="w-5 h-5 md:w-[22px] md:h-[22px] rounded-full ring-2 ring-[#111] bg-primary flex items-center justify-center">
                  <span className="text-white text-[7px] font-bold">{totalReviews}+</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-[1px]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill="#ffb342" className="max-sm:w-[9px] max-sm:h-[9px]">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <span className="text-white/35 text-[10px] md:text-xs font-medium">
                  <span className="text-white font-semibold">{avgRating}</span> Â· {totalReviews}+ reviews
                </span>
              </div>
            </div>
            {/* View All Reviews CTA */}
            <div className="mt-2.5 inline-flex items-center gap-1 text-[9px] font-bold text-white/20 group-hover:text-white/50 uppercase tracking-[0.2em] transition-colors">
              <span>{t('reviews.view_all', 'View All Reviews')}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        </motion.div>

        {/* â”€â”€ Review Cards Carousel â”€â”€ */}
        <div className="relative group/slider">
          <div className="overflow-hidden rounded-xl">
            <div
              ref={trackRef}
              className={`flex gap-3 md:gap-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pb-3 select-none ${isTouchDragging ? 'cursor-grabbing' : ''}`}
              style={{ transform: slideWidth > 0 ? `translateX(-${currentIndex * slideWidth}px)` : undefined }}
            >
            {REVIEWS_DATA.map((review, idx) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{
                  duration: 0.5,
                  delay: idx * 0.04,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="review-slide max-sm:w-[70vw] max-sm:min-w-[70vw] sm:w-[290px] sm:min-w-[290px] md:w-[330px] md:min-w-[330px] snap-start shrink-0"
              >
                <div className="relative h-full bg-white/[0.03] border border-white/[0.06] rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5 transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.12] hover:shadow-xl hover:shadow-black/25 group/card overflow-hidden">
                  {/* Subtle hover glow */}
                  <div className="absolute -inset-20 bg-primary/[0.04] rounded-full blur-3xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-700" />
                  <div className="absolute -top-12 -right-12 w-24 h-24 bg-primary/8 rounded-full blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-2 relative z-10">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <svg
                        key={i}
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill={i < review.rating ? '#ffb342' : 'none'}
                        stroke={i < review.rating ? '#ffb342' : 'rgba(255,255,255,0.07)'}
                        strokeWidth="1.5"
                        className="transition-transform duration-300 group-hover/card:scale-110"
                        style={{ transformOrigin: 'center' }}
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>

                  {/* Review text */}
                  <p className="text-white/65 text-[11px] sm:text-sm leading-relaxed mb-2.5 line-clamp-2 relative z-10">
                    &ldquo;{review.text}&rdquo;
                  </p>

                  {/* Product tag */}
                  {review.product && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-white/30 text-[8px] font-medium uppercase tracking-wider mb-2 relative z-10 transition-all duration-300 group-hover/card:bg-white/[0.06] group-hover/card:border-white/[0.08]">
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      {review.product}
                    </div>
                  )}

                  {/* Author */}
                  <div className="flex items-center gap-2 pt-2.5 border-t border-white/[0.06] relative z-10">
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full overflow-hidden ring-2 ring-white/10 flex-shrink-0 transition-all duration-300 group-hover/card:ring-primary/30">
                      <img src={review.avatar} alt={review.name} loading="lazy" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-[10px] md:text-xs font-semibold tracking-tight truncate">{review.name}</h4>
                      <div className="flex items-center gap-1 text-white/25 text-[8px] md:text-[10px]">
                        <span>{review.location}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                        <span>{review.date}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-3.5 h-3.5 md:w-[18px] md:h-[18px] rounded-full bg-emerald-500/15 flex items-center justify-center transition-all duration-300 group-hover/card:bg-emerald-500/25 group-hover/card:scale-110">
                      <svg width="6" height="6" className="md:w-[8px] md:h-[8px]" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            </div>
          </div>

          {/* Desktop arrow navigation buttons */}
          {REVIEWS_DATA.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev(); }}
                className="flex absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/25 text-white shadow-lg shadow-black/20 items-center justify-center hover:scale-110 transition-all duration-300 active:scale-90 "
                aria-label="Previous review"
              >
                <ChevronLeft size={14} className="sm:w-4 sm:h-4 transition-transform duration-300 group-hover/arrow:-translate-x-0.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="flex absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/25 text-white shadow-lg shadow-black/20 items-center justify-center hover:scale-110 transition-all duration-300 active:scale-90 "
                aria-label="Next review"
              >
                <ChevronRight size={14} className="sm:hidden transition-transform duration-300 group-hover/arrow:translate-x-0.5" />
                <ChevronRight size={16} className="hidden sm:block transition-transform duration-300 group-hover/arrow:translate-x-0.5" />
              </button>
            </>
          )}

        </div>

        {/* Mobile swipe indicator â€” subtle hint */}
        <div className="md:hidden flex items-center justify-center gap-1 mt-1 mb-0.5">
          <div className="flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-white/5">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span className="text-white/15 text-[7px] font-medium uppercase tracking-[0.2em]">Swipe</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </div>

        {/* Navigation Dots */}
        {REVIEWS_DATA.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-3.5">
            {REVIEWS_DATA.slice(0, Math.min(REVIEWS_DATA.length, 7)).map((review, idx) => {
              const isActive = currentIndex === idx;
              return (
                <button
                  key={review.id}
                  onClick={() => scrollToIndex(idx)}
                  className={`rounded-full transition-all duration-400 ${
                    isActive
                      ? 'w-5 h-1.5 bg-white/80'
                      : 'w-1.5 h-1.5 bg-white/12 hover:bg-white/30'
                  }`}
                  aria-label={`Go to review ${idx + 1}`}
                />
              );
            })}
          </div>
        )}

        {/* Bottom line */}
        <div className="flex items-center justify-center gap-2 mt-3.5">
          <span className="h-px w-4 bg-white/8" />
          <span className="text-white/15 text-[7px] font-bold uppercase tracking-[0.25em] flex items-center gap-1">
            <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400/40">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {t('product.verified')} Â· {REVIEWS_DATA.length} real customers
          </span>
          <span className="h-px w-4 bg-white/8" />
        </div>
      </div>


    </section>
  );
}



/* ─────────────── SKELETON LOADING COMPONENTS ─────────────── */

function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

function HeroSkeleton() {
  return (
    <div className="relative w-full h-[420px] sm:h-[520px] md:h-[640px] lg:h-[700px] overflow-hidden bg-gray-100">
      <div className="absolute inset-0 p-8 md:p-16 flex items-center">
        <div className="max-w-xl space-y-5">
          <Skeleton className="!w-32 !h-6 !rounded-full" />
          <Skeleton className="!w-96 !h-14 md:!h-20" />
          <Skeleton className="!w-72 !h-5" />
          <Skeleton className="!w-40 !h-12 !rounded-full" />
        </div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        <Skeleton className="!w-8 !h-1.5 !rounded-full" />
        <Skeleton className="!w-3 !h-1.5 !rounded-full" />
        <Skeleton className="!w-3 !h-1.5 !rounded-full" />
      </div>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <section className="py-12 md:py-20 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200 pb-5 mb-10">
          <Skeleton className="!w-28 !h-3 !rounded-md mb-3" />
          <Skeleton className="!w-64 !h-8 md:!h-10 !rounded-lg" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-200/80">
              <Skeleton className="!w-full !aspect-[4/5] !rounded-none" />
              <div className="p-3.5">
                <Skeleton className="!w-24 !h-4 !rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductRowSkeleton() {
  return (
    <section className="py-12 md:py-20 bg-[#fafafa] border-y border-gray-100">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-5 mb-10">
          <div className="space-y-3">
            <Skeleton className="!w-28 !h-3 !rounded-md" />
            <Skeleton className="!w-48 !h-8 md:!h-10 !rounded-lg" />
          </div>
          <Skeleton className="!w-24 !h-4 !rounded-md hidden md:block" />
        </div>
        <div className="flex gap-3 md:gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="max-sm:w-[160px] max-sm:min-w-[160px] sm:w-[300px] sm:min-w-[300px] shrink-0 bg-white rounded-xl overflow-hidden border border-gray-200/80">
              <Skeleton className="!w-full !aspect-[300/392] !rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="!w-20 !h-3 !rounded-md" />
                <Skeleton className="!w-40 !h-4 !rounded-md" />
                <Skeleton className="!w-10 !h-5 !rounded" />
                <Skeleton className="!w-16 !h-3 !rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────── PULL-TO-REFRESH INDICATOR ─────────────── */
function PullToRefreshIndicator({ pullDistance, isRefreshing, threshold }) {
  const { t } = useTranslation();
  const isPastThreshold = pullDistance >= threshold;

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      className="absolute left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
      style={{
        top: isRefreshing ? '24px' : `${Math.max(12, pullDistance - 36)}px`,
        transition: isRefreshing ? 'top 0.35s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
      }}
    >
      <div
        className={`flex items-center gap-2.5 px-4 py-2 rounded-full ${
          isPastThreshold || isRefreshing
            ? 'bg-black text-white shadow-lg'
            : 'bg-white/90 backdrop-blur-sm text-gray-600 shadow-md'
        } transition-colors duration-200`}
      >
        {isRefreshing ? (
          <>
            <RefreshCw size={16} />
            <span className="text-xs font-semibold">{t('home.refreshing')}</span>
          </>
        ) : (
          <>
            <motion.svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              animate={{ rotate: isPastThreshold ? 180 : 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <path d="M12 5v14M5 12l7-7 7 7" />
            </motion.svg>
            <span className="text-xs font-semibold">
              {isPastThreshold ? t('home.release_to_refresh') : t('home.pull_to_refresh')}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────── MAIN HOMEPAGE ─────────────── */
export default function HomePage() {
  const contentRef = useRef(null);
  const queryClient = useQueryClient();
  // ── Consolidated homepage query — fetches ALL data in a single request ──
  // This replaces 15+ separate API calls, eliminating redundant Laravel boots
  // and dramatically improving page load time.
  const { data: homepageData, isLoading } = useQuery({
    queryKey: ['homepage', 'all'],
    queryFn: async () => {
      const res = await homepageAPI.getAll();
      return res?.data?.data || {};
    },
    staleTime: 0, // Always refetch — ensures stock counts are fresh after order placement
  });

  // Extract data from the core (always-on) payload. The below-the-fold
  // sections (new arrivals, best sellers, reviews, reels) are fetched lazily
  // on scroll — see the lazy queries below.
  const featuredProducts = homepageData?.featured || [];
  const banners = homepageData?.banners || [];
  const categories = homepageData?.categories || [];
  const curatedLooks = homepageData?.curatedLooks || [];
  const seoData = homepageData?.seo || { title: '', description: '' };
  const settings = homepageData?.settings || {};

  // Settings: prefer consolidated endpoint settings, fall back to useSettings store
  const { getSetting: getStoreSetting } = useSettings();
  const mergedGetSetting = (key, defaultValue) => {
    if (settings?.[key] !== undefined && settings?.[key] !== null) {
      return settings[key];
    }
    return getStoreSetting(key, defaultValue);
  };

  const storeName = mergedGetSetting('storeName', 'THREVOLT');
  const reviewsEnabled = mergedGetSetting('reviewsEnabled', 'true') !== 'false';
  const bestSellersEnabled = mergedGetSetting('bestSellersEnabled', 'true') !== 'false';
  const newArrivalsEnabled = mergedGetSetting('newArrivalsEnabled', 'true') !== 'false';
  const curatedLooksEnabled = mergedGetSetting('curatedLooksEnabled', 'true') !== 'false';
  const newArrivalProductId = mergedGetSetting('newArrivalProductId', '');
  const newArrivalExpiryDate = mergedGetSetting('newArrivalExpiryDate', '');
  const tshirtCustomizerEnabled = mergedGetSetting('tshirtCustomizerEnabled', 'false') !== 'false';
  const reelsEnabled = mergedGetSetting('reelsEnabled', 'true') !== 'false';

  // ── Lazy-loaded below-the-fold sections — fetched when scrolled near ──
  const newArrivalsRef = useRef(null);
  const bestSellersRef = useRef(null);
  const reviewsRef = useRef(null);
  const reelsRef = useRef(null);
  // new-arrivals sits just below the hero/flash-sale fold; a 0px margin keeps
  // it out of the initial request wave so the first payload stays < 100KB.
  const newArrivalsInView = useInView(newArrivalsRef, !isLoading && newArrivalsEnabled, '0px 0px');
  const bestSellersInView = useInView(bestSellersRef, !isLoading && bestSellersEnabled);
  const reviewsInView = useInView(reviewsRef, !isLoading && reviewsEnabled);
  const reelsInView = useInView(reelsRef, !isLoading && reelsEnabled);

  const { data: newArrivals = [], isLoading: newArrivalsLoading } = useQuery({
    queryKey: ['homepage', 'newArrivals'],
    queryFn: async () => (await homepageAPI.getNewArrivals())?.data?.data || [],
    enabled: newArrivalsInView,
    staleTime: 0,
  });
  const { data: bestSellers = [], isLoading: bestSellersLoading } = useQuery({
    queryKey: ['homepage', 'bestSellers'],
    queryFn: async () => (await homepageAPI.getBestSellers())?.data?.data || [],
    enabled: bestSellersInView,
    staleTime: 0,
  });
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['homepage', 'reviews'],
    queryFn: async () => (await homepageAPI.getReviews())?.data?.data || { reviews: [] },
    enabled: reviewsInView,
    staleTime: 0,
  });
  const { data: reels = [], isLoading: reelsLoading } = useQuery({
    queryKey: ['homepage', 'reels'],
    queryFn: async () => (await homepageAPI.getReels())?.data?.data || [],
    enabled: reelsInView,
    staleTime: 0,
  });
  const homepageReviews = reviewsData?.reviews || [];

  // ── Read section order from settings (with fallback to default) ──
  const sectionOrder = (() => {
    const raw = mergedGetSetting('homepageSectionOrder', '');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Invalid stored order — fall through to the default
      }
    }
    return ['hero_banner','new_arrival_week','new_arrivals','categories','curated_looks','tshirt_customizer','best_sellers','reviews','reels'];
  })();

  // ── Section renderer map — maps section keys to JSX ──
  const renderSection = (key) => {
    switch (key) {
      case 'hero_banner':
        return banners.length > 0 && (
          <AnimatedSection key="hero_banner" delay={0} margin="-40px">
            <HeroBanner banners={banners} />
          </AnimatedSection>
        );
      case 'new_arrival_week':
        return newArrivalProductId && !isExpired && featuredNewArrival && (
          <AnimatedSection key="new_arrival_week" delay={0.05} margin="-40px">
            <Suspense fallback={null}>
              <NewArrivalOfTheWeek product={featuredNewArrival} />
            </Suspense>
          </AnimatedSection>
        );
      case 'new_arrivals':
        return newArrivalsEnabled && (
          <AnimatedSection key="new_arrivals" delay={0.05}>
            {/* Skeleton shows until the lazy fetch completes — it also keeps the
                observer target non-zero-height so the on-scroll fetch triggers. */}
            <div ref={newArrivalsRef}>
              {(!newArrivalsInView || newArrivalsLoading) && newArrivals.length === 0 ? <NewArrivalsSkeleton /> : <NewArrivalsSection products={newArrivals} />}
            </div>
          </AnimatedSection>
        );
      case 'curated_looks':
        return curatedLooksEnabled && (
          <AnimatedSection key="curated_looks" delay={0.05}>
            <CuratedLooksSection looks={curatedLooks} />
          </AnimatedSection>
        );
      case 'tshirt_customizer':
        return tshirtCustomizerEnabled && (
          <AnimatedSection key="tshirt_customizer" delay={0.05}>
            <Suspense fallback={null}>
              <ProfessionalDesignCTA />
            </Suspense>
          </AnimatedSection>
        );
      case 'categories':
        return (
          <AnimatedSection key="categories" delay={0.05}>
            <CategorySection categories={categories} />
          </AnimatedSection>
        );
      case 'best_sellers':
        return bestSellersEnabled && (
          <AnimatedSection key="best_sellers" delay={0.05}>
            <div ref={bestSellersRef}>
              {(!bestSellersInView || bestSellersLoading) && bestSellers.length === 0 ? <ProductRowSkeleton /> : (
                <ProductRow
                  title="Best Sellers"
                  products={bestSellers.length > 0 ? bestSellers : featuredProducts.slice(0, 8)}
                />
              )}
            </div>
          </AnimatedSection>
        );
      case 'reviews':
        return reviewsEnabled && (
          <AnimatedSection key="reviews" delay={0.05}>
            <div ref={reviewsRef}>
              {(!reviewsInView || reviewsLoading) && homepageReviews.length === 0 ? <ProductRowSkeleton /> : (
                <PremiumReviewSlider reviews={homepageReviews} onReviewSuccess={refetchAll} onOpenAllReviews={() => setAllReviewsOpen(true)} />
              )}
            </div>
          </AnimatedSection>
        );
      case 'reels':
        return reelsEnabled && (
          <AnimatedSection key="reels" delay={0.05}>
            <div ref={reelsRef}>
              {/* loading stays true until the lazy fetch fires, so the reel
                  skeleton (non-zero height) keeps the observer target alive. */}
              <ReelsLazyBoundary reels={reels} loading={!reelsInView || reelsLoading} />
            </div>
          </AnimatedSection>
        );
      default:
        return null;
    }
  };

  // ── Check if the featured product has expired (local date comparison) ──
  const isExpired = newArrivalExpiryDate && (() => {
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expiryEnd = new Date(newArrivalExpiryDate + 'T23:59:59');
    return expiryEnd < todayLocal;
  })();

  // ── Fetch specific New Arrival of the Week product if admin selected one (and not expired) ──
  const { data: featuredNewArrival } = useQuery({
    queryKey: ['homepage', 'featuredNewArrival', newArrivalProductId],
    queryFn: async () => {
      if (!newArrivalProductId) return null;
      const res = await productsAPI.getById(newArrivalProductId);
      return res?.data?.data || res?.data || null;
    },
    staleTime: 0, // Always refetch — ensures stock counts are fresh after order placement
    enabled: !!newArrivalProductId && !isExpired,
  });

  // Pull-to-refresh: invalidate every homepage query (core + lazy sections)
  // so a refresh re-fetches stock counts and section data.
  const refetchAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['homepage'] });
  }, [queryClient]);

  /* ── All Reviews Modal state ── */
  const [allReviewsOpen, setAllReviewsOpen] = useState(false);
  // Mount the modal on first open, then keep it mounted so its internal
  // AnimatePresence exit animation still plays — the chunk is deferred until
  // the user actually opens "view all reviews".
  const [allReviewsEverOpened, setAllReviewsEverOpened] = useState(false);
  useEffect(() => {
    if (allReviewsOpen) setAllReviewsEverOpened(true);
  }, [allReviewsOpen]);


  const { pullDistance, isRefreshing, isPulling } = usePullToRefresh({
    onRefresh: refetchAll,
    threshold: 80,
    maxPull: 130,
    disabled: isLoading,
  });

  if (isLoading) {
    return (
      <div className="flex-1 bg-surface font-body">
        <HeroSkeleton />
        <NewArrivalsSkeleton />
        <CategorySkeleton />
        <ProductRowSkeleton />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-surface font-body relative">
      {/* Premium scroll progress bar */}
      <ScrollProgressBar />

      {/* SEO meta tags from global settings */}
      <SEOHead
        title={seoData.title || `${storeName} — Premium Streetwear`}
        description={seoData.description || `Discover premium streetwear fashion at ${storeName}. Shop the latest oversized tees, hoodies, accessories and more.`}
        keywords="streetwear, fashion, premium clothing, oversized t-shirts, hoodies, accessories"
        canonicalUrl={window.location.origin}
        jsonLd={[{
          '@context': 'https://schema.org',
          '@type': 'LocalBusiness',
          '@id': `${window.location.origin}/#localbusiness`,
          name: storeName || 'THREVOLT',
          description: 'Premium streetwear fashion store in Mathura. Shop the latest oversized tees, hoodies, accessories and more.',
          url: window.location.origin,
          logo: `${window.location.origin}/favicon.ico`,
          image: `${window.location.origin}/og-default.png`,
          telephone: '+917251080691',
          email: 'hello@threvolt.com',
          address: {
            '@type': 'PostalAddress',
            streetAddress: 'Girdharkunj Colony, Sonkh Rd, Near Narsi Vihar Colony',
            addressLocality: 'Mathura',
            addressRegion: 'Uttar Pradesh',
            postalCode: '281004',
            addressCountry: 'IN',
          },
          geo: {
            '@type': 'GeoCoordinates',
            latitude: 27.4924,
            longitude: 77.6737,
          },
          openingHoursSpecification: [
            {
              '@type': 'OpeningHoursSpecification',
              dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
              opens: '08:00',
              closes: '22:00',
            },
          ],
          priceRange: '$$',
          paymentAccepted: 'Cash, UPI, Credit Card, Debit Card, Net Banking',
          sameAs: [],
        }, {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: storeName || 'THREVOLT',
          url: window.location.origin,
          potentialAction: {
            '@type': 'SearchAction',
            target: `${window.location.origin}/products?search={search_term_string}`,
            'query-input': 'required name=search_term_string',
          },
        }]}
      />
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={80}
      />

      {/* Content wrapper — translates down during pull */}
      <div
        ref={contentRef}
        className="relative bg-surface gpu-layer"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling && !isRefreshing
            ? 'none'
            : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ── Dynamic Section Rendering from Admin Order ── */}
        {sectionOrder.map((key) => {
          const section = renderSection(key);
          if (!section) return null;
          return (
            <React.Fragment key={key}>
              {section}
            </React.Fragment>
          );
        })}

      </div>

      {/* All Reviews Modal — rendered OUTSIDE the transformed container so position: fixed works correctly */}
      {(allReviewsOpen || allReviewsEverOpened) && (
        <Suspense fallback={null}>
          <AllReviewsModal
            reviews={homepageReviews}
            isOpen={allReviewsOpen}
            onClose={() => setAllReviewsOpen(false)}
            onReviewSuccess={refetchAll}
          />
        </Suspense>
      )}

    </div>
  );
}

import { ChevronLeft, ChevronRight, ChevronUp, RefreshCw, ArrowRight } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

;
import ProductCard from '../../components/product/ProductCard';
import SEOHead from '../../components/seo/SEOHead';
import { useSettings } from '../../store/useSettings';
import { productsAPI } from '../../api/products';
import { categoriesAPI } from '../../api/categories';
import { bannersAPI } from '../../api/banners';
import { seoAPI } from '../../api/seo';
import { reviewsAPI } from '../../api/reviews';
import { curatedLooksAPI } from '../../api/curatedLooks';
import { reelsAPI } from '../../api/reels';
import { promotionsAPI } from '../../api/promotions';
import usePullToRefresh from '../../hooks/usePullToRefresh';

import { formatCurrency, formatDate, getImageUrl, getBannerImage, getCategoryImage } from '../../utils/formatters';
import ReelsSection from '../../components/storefront/ReelsSection';
import FlashSaleCountdown from '../../components/storefront/FlashSaleCountdown';

/* ═══════════ ANIMATION WRAPPERS — Premium Entrance ═══════════ */
function AnimatedSection({ children, className = '', delay = 0, margin = '-60px' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98, filter: 'blur(4px)' }}
      whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
      viewport={{ once: true, margin }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function AnimatedDivider() {
  return (
    <div className="flex items-center justify-center gap-3 py-3 md:py-4">
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="h-px w-20 md:w-32 bg-gradient-to-r from-transparent via-gray-200 to-transparent"
        style={{ transformOrigin: 'left center' }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
        className="w-1.5 h-1.5 rounded-full bg-primary/25"
      />
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="h-px w-20 md:w-32 bg-gradient-to-l from-transparent via-gray-200 to-transparent"
        style={{ transformOrigin: 'right center' }}
      />
    </div>
  );
}

/* ═══════════ FULL-BLEED HERO BANNER ═══════════ */
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

  // Determine display mode from banner's displayMode field
  const displayMode = slide.displayMode || 'DEFAULT';
  const isImageOnly = displayMode === 'IMAGE_ONLY';
  const isTitleOnly = displayMode === 'TITLE_ONLY';
  const bannerLink = slide.linkUrl || (isImageOnly ? '/products' : null);

  const handleBannerClick = () => {
    if (bannerLink) {
      navigate(bannerLink);
    }
  };

  // Title-Only Mode: Show text without image background
  if (isTitleOnly) {
    return (
      <div className="relative w-full h-[350px] sm:h-[400px] md:h-[500px] overflow-hidden group bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className={`max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 flex ${
              slide.align === 'left' ? 'justify-start text-left' :
              slide.align === 'right' ? 'justify-end text-right' :
              'justify-center text-center'
            }`}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="max-w-xl"
              >
                {slide.tagline && (
                  <span className="inline-block bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full mb-5 tracking-widest uppercase">
                    {slide.tagline}
                  </span>
                )}
                <h1 className={`text-4xl md:text-5xl lg:text-7xl font-display font-extrabold leading-[1.1] mb-5 whitespace-pre-line text-white`}>
                  {slide.title}
                </h1>
                {slide.subtitle && (
                  <p className="text-base md:text-xl mb-8 leading-relaxed font-medium text-white/80">
                    {slide.subtitle}
                  </p>
                )}
                <button
                  onClick={() => navigate(bannerLink || '/products')}
                  className="bg-primary text-white px-10 py-4 rounded-full text-base font-bold hover:bg-primary-dark transition-all shadow-glow-orange hover:shadow-xl hover:-translate-y-1 inline-flex items-center gap-2 group/btn"
                >
                  {slide.cta || t('home.shop_now')}
                  <ArrowRight size={18} className="transition-transform duration-300 group-hover/btn:translate-x-1" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Nav Arrows */}
        {slides.length > 1 && (
          <>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors z-10 md:opacity-0 md:group-hover:opacity-100">
              <ChevronLeft size={24} />
            </button>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors z-10 md:opacity-0 md:group-hover:opacity-100">
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Progress Bars */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(idx); }}
              className="h-1.5 rounded-full overflow-hidden transition-all duration-300"
              style={{ width: idx === current ? '40px' : '20px', background: 'rgba(255,255,255,0.3)' }}
            >
              {idx === current && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 6, ease: "linear" }}
                  className="h-full bg-white"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }

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
            transition={{ duration: 0.8 }}
          >
            <img
              src={imgSrc}
              alt=""
              className="w-full h-auto"
              loading="eager"
            />
          </motion.div>
        </AnimatePresence>

        {/* Nav Arrows */}
        {slides.length > 1 && (
          <>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); prev(); }} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors z-10 md:opacity-0 md:group-hover:opacity-100">
              <ChevronLeft size={24} />
            </button>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); next(); }} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors z-10 md:opacity-0 md:group-hover:opacity-100">
              <ChevronRight size={24} />
            </button>
          </>
        )}

        {/* Progress Bars */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(idx); }}
              className="h-1.5 rounded-full overflow-hidden transition-all duration-300"
              style={{ width: idx === current ? '40px' : '20px', background: 'rgba(255,255,255,0.3)' }}
            >
              {idx === current && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 6, ease: "linear" }}
                  className="h-full bg-white"
                />
              )}
            </button>
          ))}
        </div>
      </a>
    );
  }

  return (
    <div className="relative w-full h-[320px] sm:h-[450px] md:h-[700px] overflow-hidden group">
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0"
        >
          {/* Background Image with slight zoom effect */}
          <motion.img
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            transition={{ duration: 6, ease: "linear" }}
            src={getImageUrl(getBannerImage(slide))}
            alt="Hero Banner"
            className="w-full h-full object-cover"
          />
          
          {/* Gradient Overlay for Text Readability */}
          <div className={`absolute inset-0 bg-gradient-to-r ${
            slide.align === 'left' ? 'from-black/80 via-black/40 to-transparent' :
            slide.align === 'right' ? 'from-transparent via-black/40 to-black/80' :
            'from-black/60 via-black/40 to-black/60'
          }`} />

          {/* Text Content */}
          <div className="absolute inset-0 flex items-center">
            <div className={`max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 flex ${
              slide.align === 'left' ? 'justify-start text-left' :
              slide.align === 'right' ? 'justify-end text-right' :
              'justify-center text-center'
            }`}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="max-w-xl"
              >
                <span className="inline-block bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-full mb-5 tracking-widest uppercase">
                  {slide.tagline}
                </span>
                <h1 className={`text-4xl md:text-5xl lg:text-7xl font-display font-extrabold leading-[1.1] mb-5 whitespace-pre-line ${
                  slide.textDark ? 'text-text-primary' : 'text-white'
                }`}>
                  {slide.title}
                </h1>
                <p className={`text-base md:text-xl mb-8 leading-relaxed font-medium ${
                  slide.textDark ? 'text-text-secondary' : 'text-white/90'
                }`}>
                  {slide.subtitle}
                </p>
                <button
                  onClick={() => navigate(bannerLink || '/products')}
                  className="bg-primary text-white px-10 py-4 rounded-full text-base font-bold hover:bg-primary-dark transition-all shadow-glow-orange hover:shadow-xl hover:-translate-y-1 inline-flex items-center gap-2 group/btn"
                >
                  {slide.cta || t('home.shop_now')}
                  <ArrowRight size={18} className="transition-transform duration-300 group-hover/btn:translate-x-1" />
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav Arrows (Show on hover on desktop) */}
      <button onClick={prev} className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors z-10 md:opacity-0 md:group-hover:opacity-100">
        <ChevronLeft size={24} />
      </button>
      <button onClick={next} className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-colors z-10 md:opacity-0 md:group-hover:opacity-100">
        <ChevronRight size={24} />
      </button>

      {/* Progress Bars */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className="h-1.5 rounded-full overflow-hidden transition-all duration-300"
            style={{ width: idx === current ? '40px' : '20px', background: 'rgba(255,255,255,0.3)' }}
          >
            {idx === current && (
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '100%' }}
                transition={{ duration: 6, ease: "linear" }}
                className="h-full bg-primary"
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════ CATEGORIES — Premium Editorial Grid ═══════════ */
function CategorySection({ categories }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cats = Array.from(Array.isArray(categories) ? categories : []);

  if (cats.length === 0) return null;

  // First card spans 2 cols for editorial hero treatment
  const hero = cats[0];
  const rest = cats.slice(1, 7); // up to 7 more cards

  return (
    <section className="py-10 md:py-14 bg-white border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header — Centered */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6 md:mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-5 bg-gray-200" />
            <span className="text-gray-400 text-[9px] font-bold uppercase tracking-[0.2em]">{t('home.collections')}</span>
            <span className="h-px w-5 bg-gray-200" />
          </div>
          <h2 className="text-lg md:text-xl lg:text-2xl font-display font-bold tracking-tight text-gray-900">
            {t('home.shop_by_category')}
          </h2>
          <button
            onClick={() => navigate('/products')}
            className="hidden md:inline-flex items-center gap-2 text-sm font-bold text-text-primary hover:text-primary transition-colors uppercase tracking-wider group shrink-0 mt-4"
          >
            {t('home.browse_all')}
            <ArrowRight size={15} />
          </button>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
          {/* Hero Card — spans 2 cols on desktop */}
          <motion.button
            key={hero.slug}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => navigate(`/products?category=${hero.slug}`)}
            className="col-span-2 md:col-span-2 row-span-1 group relative overflow-hidden rounded-2xl md:rounded-3xl bg-gray-50 border border-border/50 hover:border-gray-300 transition-all duration-500"
          >
            <div className="aspect-[4/3] md:aspect-[3/2] relative">
              <img loading="lazy" src={getImageUrl(getCategoryImage(hero))}
                alt={hero.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              {/* Gradient overlay for readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              {/* Name at bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-5 md:p-8">
                <span className="text-white/50 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.2em] mb-1 block">
                  {t('home.featured_collection')}
                </span>
                <h3 className="text-white font-display text-xl md:text-3xl font-extrabold tracking-tight">
                  {hero.name}
                </h3>
              </div>
              {/* Arrow button */}
              <div className="absolute top-5 right-5 w-9 h-9 md:w-11 md:h-11 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover:bg-white/20 group-hover:scale-110 transition-all duration-300">
                <ArrowRight size={16} />
              </div>
            </div>
          </motion.button>

          {/* Small cards alongside hero — 2 cards to keep grid balanced */}
          {rest.slice(0, 2).map((cat, idx) => (
            <motion.button
              key={cat.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.7, delay: 0.05 + idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => navigate(`/products?category=${cat.slug}`)}
              className="group relative overflow-hidden rounded-2xl bg-gray-50 border border-border/50 hover:border-gray-300 transition-all duration-500"
            >
              <div className="aspect-square md:aspect-[4/5] relative">
                <img loading="lazy" src={getImageUrl(getCategoryImage(cat))}
                  alt={cat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                  <h3 className="text-white font-display text-base md:text-lg font-bold tracking-tight">
                    {cat.name}
                  </h3>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Second row — 4 more cards (including the 3rd from rest) */}
        {rest.length > 2 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mt-3 md:mt-5">
            {rest.slice(2, 6).map((cat, idx) => (
              <motion.button
                key={cat.slug}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.7, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                onClick={() => navigate(`/products?category=${cat.slug}`)}
                className="group relative overflow-hidden rounded-xl md:rounded-2xl bg-gray-50 border border-border/50 hover:border-gray-300 transition-all duration-500"
              >
                <div className="aspect-[4/3] relative">
                  <img loading="lazy" src={getImageUrl(getCategoryImage(cat))}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                    <h3 className="text-white font-display text-sm md:text-base font-bold tracking-tight">
                      {cat.name}
                    </h3>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}

        {/* Mobile: Browse All CTA */}
        <button
          onClick={() => navigate('/products')}
          className="md:hidden w-full mt-6 py-3.5 rounded-xl bg-gray-100 text-text-primary font-bold text-sm uppercase tracking-wider hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
        >
          {t('home.browse_all_categories')}
          <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}

/* ═══════════ PREMIUM PRODUCT SLIDER (Horizontal Carousel) ═══════════ */
function ProductSlider({ products, skeletonCount = 6, viewAllLink }) {
  const navigate = useNavigate();
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  /* ── Drag-to-scroll (touch + mouse) ── */
  const dragState = useRef({ isDragging: false, startX: 0, scrollLeft: 0, moved: false });
  const [isDragActive, setIsDragActive] = useState(false);

  const onDragStart = (clientX) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = {
      isDragging: true,
      startX: clientX,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
    setIsDragActive(true);
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
    setIsDragActive(false);
    dragState.current.isDragging = false;
    /* Reset moved after a short delay so click handler sees the true value */
    setTimeout(() => { dragState.current.moved = false; }, 50);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateScrollState = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 8);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);

      if (scrollWidth <= clientWidth) {
        setScrollProgress(1);
      } else {
        setScrollProgress(scrollLeft / (scrollWidth - clientWidth));
      }
    };

    /* Prevent click events when user was dragging */
    const handlePreventClick = (e) => {
      if (dragState.current.moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener('scroll', updateScrollState, { passive: true });
    el.addEventListener('click', handlePreventClick, { capture: true });
    updateScrollState();
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      el.removeEventListener('click', handlePreventClick, { capture: true });
    };
  }, [products]);

  const scrollByOffset = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.product-slide')?.offsetWidth || 260;
    const gap = 20;
    const scrollAmount = (cardWidth + gap) * (direction === 'left' ? -1 : 1);
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  };

  if (!products || products.length === 0) return null;

  return (
    <div className="relative group/slider">
      {/* Scrollable Track */}
      <div
        ref={scrollRef}
        onMouseDown={(e) => onDragStart(e.clientX)}
        onMouseMove={(e) => onDragMove(e.clientX)}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        className={`flex gap-1 sm:gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-3 select-none ${
          isDragActive ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        {products.map((p, idx) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.6, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
            className="product-slide max-sm:w-[160px] max-sm:min-w-[160px] sm:w-[302px] sm:min-w-[302px] snap-start shrink-0"
          >
            <ProductCard product={p} />
          </motion.div>
        ))}

        {/* View All Card — navigates to full products page */}
        {viewAllLink && (
          <motion.button
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.6, delay: products.length * 0.04, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => {
              if (dragState.current.moved) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
              navigate(viewAllLink);
            }}
            className="max-sm:w-[160px] max-sm:min-w-[160px] sm:w-[302px] sm:min-w-[302px] snap-start shrink-0 flex items-center justify-center rounded-2xl bg-gradient-to-br from-gray-50 via-white to-gray-100/80 border-2 border-dashed border-gray-200 hover:border-primary/40 shadow-sm hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all duration-500 group cursor-pointer relative overflow-hidden"
          >
            {/* Subtle decorative circles */}
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-primary/[0.03] group-hover:bg-primary/[0.06] transition-colors duration-500" />
            <div className="absolute -bottom-6 -left-6 w-16 h-16 rounded-full bg-gray-200/30 group-hover:bg-primary/[0.04] transition-colors duration-500" />
            
            <div className="flex flex-col items-center gap-3 z-10 text-gray-400 group-hover:text-primary transition-colors duration-500">
              {/* Stacked grid icon */}
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-primary/10 group-hover:to-primary/5 shadow-inner transition-all duration-500" />
                <div className="relative w-full h-full flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-400 group-hover:text-primary transition-colors duration-500"
                  >
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <rect x="14" y="14" width="7" height="7" rx="1" />
                  </svg>
                </div>
              </div>
              <span className="text-sm font-bold uppercase tracking-[0.15em]">View All</span>
              <span className="text-[10px] text-gray-300 group-hover:text-primary/50 uppercase tracking-wider -mt-1.5 transition-colors duration-500">
                Browse Collection
              </span>
            </div>
          </motion.button>
        )}
      </div>

      {/* Left Arrow — glassmorphic */}
      {canScrollLeft && (
        <button
          onClick={() => scrollByOffset('left')}
          className="absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-gray-200/60 flex items-center justify-center text-gray-700 hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
          aria-label="Scroll left"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {/* Right Arrow — glassmorphic */}
      {canScrollRight && (
        <button
          onClick={() => scrollByOffset('right')}
          className="absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-gray-200/60 flex items-center justify-center text-gray-700 hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
          aria-label="Scroll right"
        >
          <ChevronRight size={18} />
        </button>
      )}

      {/* Edge Fade Gradients */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-white to-transparent pointer-events-none z-10" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent pointer-events-none z-10" />
      )}

      {/* Dot Indicators */}
      {products.length > 4 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: Math.min(products.length - 3, 6) }).map((_, idx) => {
            const dotProgress = idx / (Math.min(products.length - 3, 6) - 1 || 1);
            const isActive = scrollProgress >= dotProgress - 0.08 && scrollProgress <= dotProgress + 0.08;
            const dist = Math.abs(scrollProgress - dotProgress);
            const isNear = dist < 0.12;
            return (
              <button
                key={idx}
                onClick={() => {
                  const el = scrollRef.current;
                  if (!el) return;
                  const totalScroll = el.scrollWidth - el.clientWidth;
                  el.scrollTo({ left: totalScroll * dotProgress, behavior: 'smooth' });
                }}
                className={`rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-gray-800 w-4 h-1.5'
                    : isNear
                    ? 'bg-gray-400 w-2 h-1.5'
                    : 'bg-gray-200 w-1.5 h-1.5'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
function NewArrivalsSection({ products }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!products || products.length === 0) return null;

  return (
    <section className="py-10 md:py-14 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header — Centered */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6 md:mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-5 bg-gray-200" />
            <span className="text-gray-400 text-[9px] font-bold uppercase tracking-[0.2em]">{t('home.fresh_drops')}</span>
            <span className="h-px w-5 bg-gray-200" />
          </div>
          <h2 className="text-lg md:text-xl lg:text-2xl font-display font-bold tracking-tight text-gray-900">
            {t('home.new_arrivals')}
          </h2>
        </motion.div>

        <div className="-mx-4 sm:-mx-6 lg:mx-0">
          <ProductSlider products={products} viewAllLink="/products/section/new-arrivals" />
        </div>
      </div>
    </section>
  );
}

function NewArrivalsSkeleton() {
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <Skeleton className="!w-48 !h-10 !rounded-lg mx-auto" />
        </div>
        <div className="flex gap-3 md:gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="max-sm:w-[160px] max-sm:min-w-[160px] sm:w-[302px] sm:min-w-[302px] shrink-0 bg-white rounded-2xl overflow-hidden border border-border">
              <Skeleton className="!w-full !aspect-[3/4] !rounded-none" />
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

/* ═══════════ PRODUCT ROW — Editorial Style ═══════════ */
function ProductRow({ title, products }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!products || products.length === 0) return null;

  const tagline = title === 'Best Sellers' ? t('home.trending_now') : t('home.featured');

  return (
    <section className="py-10 md:py-14 bg-surface">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header — Centered (matching reference design) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-5 md:mb-6"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-5 bg-gray-200" />
            <span className="text-gray-400 text-[9px] font-bold uppercase tracking-[0.2em]">{tagline}</span>
            <span className="h-px w-5 bg-gray-200" />
          </div>
          <h2 className="text-lg md:text-xl lg:text-2xl font-display font-bold tracking-tight text-gray-900">{title}</h2>
        </motion.div>
        
        <div className="-mx-4 sm:-mx-6 lg:mx-0">
          <ProductSlider products={products} viewAllLink="/products/section/best-sellers" />
        </div>
      </div>
    </section>
  );
}

/* ═══════════ CURATED LOOKS — Dynamic Gallery (from Admin) ═══════════ */
function CuratedLooksSection({ looks: curatedLooks = [], onRefresh }) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, isRefreshing]);

  if (!curatedLooks || curatedLooks.length === 0) return null;

  return (
    <section className="curated-section py-10 md:py-14 bg-surface">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6 md:mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-5 bg-gray-200" />
            <span className="text-gray-400 text-[9px] font-bold uppercase tracking-[0.2em]">{t('home.style_inspiration')}</span>
            <span className="h-px w-5 bg-gray-200" />
          </div>
          <div className="relative inline-block">
            <h2 className="text-lg md:text-xl lg:text-2xl font-display font-bold tracking-tight text-gray-900">
              {t('home.curated_looks')}
            </h2>
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="absolute -right-10 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all disabled:opacity-50 active:scale-90"
                title="Refresh curated looks"
                aria-label="Refresh curated looks"
              >
                <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
          <p className="text-gray-500 text-sm md:text-base mt-3 max-w-2xl mx-auto font-medium">
            Curated looks designed to bring together effortless styling, modern streetwear aesthetics, and everyday versatility in one complete fit.
          </p>
        </motion.div>

        {/* View-Only Image Gallery — prices hidden */}
        <div className="flex gap-3 md:gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 sm:-mx-6 lg:mx-0 px-4 sm:px-6 lg:px-0 select-none">
          {curatedLooks.map((item, idx) => (
            <motion.div
              key={item.id || idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.6, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              className="max-sm:w-[180px] max-sm:min-w-[180px] sm:w-[320px] sm:min-w-[320px] snap-start shrink-0"
            >
              <div className="group relative overflow-hidden rounded-2xl bg-gray-50 border border-border/50">
                <div className="aspect-[3/4] relative overflow-hidden">
                  <img
                    src={item.image_url || item.imageUrl || item.image}
                    alt={item.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {/* Name only — no price */}
                  <div className="absolute bottom-0 left-0 right-0 p-3.5 md:p-5">
                    <h4 className="text-white font-display text-xs md:text-sm font-bold tracking-tight leading-tight line-clamp-2">
                      {item.name}
                    </h4>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════ PREMIUM REVIEW SLIDER ═══════════ */

/* ── Map API review data to component format ── */
function mapReview(review) {
  const user = review.user || {};
  const product = review.product || {};
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Customer';
  const avatar = user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random&color=fff&size=120`;
  const date = review.created_at
    ? formatDate(review.created_at)
    : '';
  return {
    id: review.id, name: fullName, location: (user.city || 'IN') + (user.country ? ', ' + user.country : ''),
    avatar, rating: review.rating, text: review.comment || review.title || '',
    product: product.name || '', date: date || 'Verified purchase',
  };
}

function PremiumReviewSlider({ reviews: reviewsProp = [], loading = false }) {
  const { t } = useTranslation();
  const REVIEWS_DATA = (reviewsProp.length > 0 ? reviewsProp : []).map(mapReview);

  const scrollRef = useRef(null);
  const sectionRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const autoplayRef = useRef(null);

  /* ── Subtle scroll-linked parallax ── */
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const bgParallaxY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);
  const glow1Y = useTransform(scrollYProgress, [0, 1], ['-12%', '12%']);
  const glow2Y = useTransform(scrollYProgress, [0, 1], ['8%', '-8%']);

  /* ── Drag-to-scroll ── */
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

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const updateScrollState = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 8);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
      const cardWidth = el.querySelector('.review-slide')?.offsetWidth || 320;
      const gap = 16;
      const totalItemWidth = cardWidth + gap;
      if (totalItemWidth > 0) {
        const idx = Math.round(scrollLeft / totalItemWidth);
        setCurrentIndex(Math.min(idx, REVIEWS_DATA.length - 1));
      }
    };

    const handlePreventClick = (e) => {
      if (dragState.current.moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener('scroll', updateScrollState, { passive: true });
    el.addEventListener('click', handlePreventClick, { capture: true });
    updateScrollState();
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      el.removeEventListener('click', handlePreventClick, { capture: true });
    };
  }, [REVIEWS_DATA.length]);

  /* ── Autoplay ── */
  useEffect(() => {
    if (isPaused || REVIEWS_DATA.length <= 1) {
      clearInterval(autoplayRef.current);
      return;
    }

    autoplayRef.current = setInterval(() => {
      const el = scrollRef.current;
      if (!el) return;
      const cardWidth = el.querySelector('.review-slide')?.offsetWidth || 320;
      const gap = 16;
      const totalItemWidth = cardWidth + gap;
      const maxScroll = el.scrollWidth - el.clientWidth;

      let nextScroll = el.scrollLeft + totalItemWidth;
      if (nextScroll >= maxScroll - 10) {
        nextScroll = 0;
      }
      el.scrollTo({ left: nextScroll, behavior: 'smooth' });
    }, 4000);

    return () => clearInterval(autoplayRef.current);
  }, [isPaused, REVIEWS_DATA.length]);

  const scrollToIndex = (idx) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('.review-slide')?.offsetWidth || 320;
    const gap = 16;
    el.scrollTo({ left: (cardWidth + gap) * idx, behavior: 'smooth' });
  };

  const avgRating = REVIEWS_DATA.length > 0
    ? (REVIEWS_DATA.reduce((sum, r) => sum + r.rating, 0) / REVIEWS_DATA.length).toFixed(1)
    : '0.0';
  const totalReviews = REVIEWS_DATA.length;

  if (REVIEWS_DATA.length === 0) return null;

  return (
    <section
      ref={sectionRef}
      className="relative py-10 md:py-14 bg-gradient-to-br from-[#0c0c0c] via-[#111] to-[#0a0a0a] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Subtle ambient glow with parallax — follows scroll for depth */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ y: bgParallaxY }}
      >
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 30% 40%, rgba(255,255,255,0.5) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.2) 0%, transparent 50%)',
        }} />
      </motion.div>
      <motion.div
        className="absolute top-[-120px] right-[-80px] w-[300px] h-[300px] rounded-full bg-primary/3 blur-[100px] opacity-60"
        style={{ y: glow1Y }}
      />
      <motion.div
        className="absolute bottom-[-100px] left-[-60px] w-[250px] h-[250px] rounded-full bg-white/[0.015] blur-[80px]"
        style={{ y: glow2Y }}
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ── Compact, elegant header ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6 md:mb-8"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-5 bg-white/12" />              <span className="text-white/30 text-[9px] font-bold uppercase tracking-[0.2em]">{t('home.testimonials')}</span>
            <span className="h-px w-5 bg-white/12" />
          </div>
          <h2 className="text-lg md:text-2xl lg:text-3xl font-display font-bold tracking-tight text-white">
            {t('home.what_customers_say')}
          </h2>
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
                <span className="text-white font-semibold">{avgRating}</span> · {totalReviews}+ reviews
              </span>
            </div>
          </div>
        </motion.div>

        {/* ── Review Cards Carousel ── */}
        <div className="relative group/slider">
          <div
            ref={scrollRef}
            onMouseDown={(e) => onDragStart(e.clientX)}
            onMouseMove={(e) => onDragMove(e.clientX)}
            onMouseUp={onDragEnd}
            onMouseLeave={onDragEnd}
            className="flex gap-3 md:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-3 select-none"
          >
            {REVIEWS_DATA.map((review, idx) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 24, scale: 0.8, filter: 'blur(6px)' }}
                whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{
                  duration: 0.7,
                  delay: idx * 0.06,
                  ease: [0.12, 0.71, 0.33, 1],
                  scale: { duration: 0.6, delay: idx * 0.06, ease: [0.12, 0.71, 0.33, 1] },
                  filter: { duration: 0.5, delay: idx * 0.06, ease: 'easeOut' },
                }}
                className="review-slide max-sm:w-[76vw] max-sm:min-w-[76vw] sm:w-[290px] sm:min-w-[290px] md:w-[330px] md:min-w-[330px] snap-start shrink-0"
              >
                <div className="relative h-full bg-white/[0.03] border border-white/[0.06] rounded-xl md:rounded-2xl p-4 md:p-5 transition-all duration-400 hover:bg-white/[0.05] hover:border-white/[0.1] hover:shadow-lg hover:shadow-black/20 group/card overflow-hidden">
                  {/* Subtle hover glow */}
                  <div className="absolute -top-16 -right-16 w-28 h-28 bg-primary/6 rounded-full blur-2xl opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-2.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <motion.svg
                        key={i}
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill={i < review.rating ? '#ffb342' : 'none'}
                        stroke={i < review.rating ? '#ffb342' : 'rgba(255,255,255,0.07)'}
                        strokeWidth="1.5"
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.25, delay: 0.05 + i * 0.04 }}
                        className="transition-transform duration-300 group-hover/card:scale-110"
                      >
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </motion.svg>
                    ))}
                  </div>

                  {/* Review text */}
                  <p className="text-white/70 text-xs sm:text-sm leading-relaxed mb-3 line-clamp-3">
                    &ldquo;{review.text}&rdquo;
                  </p>

                  {/* Product tag */}
                  {review.product && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/[0.04] text-white/30 text-[8px] font-medium uppercase tracking-wider mb-2.5">
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
                        <line x1="7" y1="7" x2="7.01" y2="7" />
                      </svg>
                      {review.product}
                    </div>
                  )}

                  {/* Author */}
                  <div className="flex items-center gap-2 pt-2.5 border-t border-white/[0.05]">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full overflow-hidden ring-1 ring-white/10 flex-shrink-0">
                      <img src={review.avatar} alt={review.name} loading="lazy" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-[11px] md:text-xs font-semibold tracking-tight truncate">{review.name}</h4>
                      <div className="flex items-center gap-1 text-white/25 text-[9px] md:text-[10px]">
                        <span>{review.location}</span>
                        <span className="w-0.5 h-0.5 rounded-full bg-white/20" />
                        <span>{review.date}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0 w-4 h-4 md:w-[18px] md:h-[18px] rounded-full bg-emerald-500/12 flex items-center justify-center">
                      <svg width="7" height="7" className="md:w-[8px] md:h-[8px]" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Arrows */}
          {canScrollLeft && (
            <button
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                const cardWidth = el.querySelector('.review-slide')?.offsetWidth || 320;
                el.scrollBy({ left: -(cardWidth + 16), behavior: 'smooth' });
              }}
              className="absolute left-1.5 md:-left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/8 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white hover:scale-105 transition-all duration-200 active:scale-95"
            >
              <ChevronLeft size={14} />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                const cardWidth = el.querySelector('.review-slide')?.offsetWidth || 320;
                el.scrollBy({ left: cardWidth + 16, behavior: 'smooth' });
              }}
              className="absolute right-1.5 md:-right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 md:w-9 md:h-9 rounded-full bg-white/8 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/60 hover:bg-white/15 hover:text-white hover:scale-105 transition-all duration-200 active:scale-95"
            >
              <ChevronRight size={14} />
            </button>
          )}
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
            {t('product.verified')} · {REVIEWS_DATA.length} real customers
          </span>
          <span className="h-px w-4 bg-white/8" />
        </div>
      </div>
    </section>
  );
}

/* ═══════════ SKELETON LOADING COMPONENTS ═══════════ */

function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

function HeroSkeleton() {
  return (
    <div className="relative w-full h-[600px] md:h-[700px] overflow-hidden bg-gray-100">
      <div className="absolute inset-0 p-8 md:p-16 flex items-center">
        <div className="max-w-xl space-y-5">
          <Skeleton className="!w-32 !h-6 !rounded-full" />
          <Skeleton className="!w-96 !h-14 md:!h-20" />
          <Skeleton className="!w-72 !h-5" />
          <Skeleton className="!w-40 !h-12 !rounded-full" />
        </div>
      </div>
      {/* Progress bar dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
        <Skeleton className="!w-10 !h-1.5 !rounded-full" />
        <Skeleton className="!w-5 !h-1.5 !rounded-full" />
        <Skeleton className="!w-5 !h-1.5 !rounded-full" />
      </div>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <section className="py-12 md:py-16 bg-white border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <Skeleton className="!w-72 !h-10 !rounded-lg mx-auto" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="text-center">
              <Skeleton className="!w-full !aspect-[4/5] !rounded-3xl mb-4" />
              <Skeleton className="!w-24 !h-4 !rounded-md mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl overflow-hidden border border-border">
          <Skeleton className="!w-full !aspect-[3/4] !rounded-none" />
          <div className="p-4 space-y-3">
            <Skeleton className="!w-20 !h-3 !rounded-md" />
            <Skeleton className="!w-40 !h-4 !rounded-md" />
            <div className="flex items-center gap-1.5">
              <Skeleton className="!w-10 !h-5 !rounded" />
              <Skeleton className="!w-16 !h-3 !rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="!w-20 !h-6 !rounded-md" />
              <Skeleton className="!w-14 !h-4 !rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ProductRowSkeleton() {
  return (
    <section className="py-12 md:py-16 bg-surface">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="!w-32 !h-4 !rounded-md" />
            <Skeleton className="!w-56 !h-9 !rounded-lg" />
            <Skeleton className="!w-72 !h-3 !rounded-md" />
          </div>
          <Skeleton className="!w-24 !h-4 !rounded-md mt-4 md:mt-0" />
        </div>
        <div className="flex gap-3 md:gap-4 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="max-sm:w-[160px] max-sm:min-w-[160px] sm:w-[302px] sm:min-w-[302px] shrink-0 bg-white rounded-2xl overflow-hidden border border-border">
              <Skeleton className="!w-full !aspect-[3/4] !rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="!w-20 !h-3 !rounded-md" />
                <Skeleton className="!w-40 !h-4 !rounded-md" />
                <Skeleton className="!w-10 !h-5 !rounded" />
                <Skeleton className="!w-16 !h-3 !rounded-md" />
                <Skeleton className="!w-20 !h-6 !rounded-md" />
                <Skeleton className="!w-14 !h-4 !rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════ PULL-TO-REFRESH INDICATOR ═══════════ */
function PullToRefreshIndicator({ pullDistance, isRefreshing, threshold }) {
  const { t } = useTranslation();
  const progress = Math.min(pullDistance / threshold, 1);
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

/* ═══════════ FLASH SALE BANNER ═══════════ */
function FlashSaleSection({ promotions }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const active = promotions.filter(p => {
    const now = new Date();
    const start = p.startDate ? new Date(p.startDate) : null;
    const end = p.endDate ? new Date(p.endDate) : null;
    if (start && now < start) return false;
    if (end && now > end) return false;
    return p.status === 'ACTIVE' || p.isActive;
  });

  if (active.length === 0) return null;

  // Show the highest priority one
  const promo = active[0];

  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
      {/* Animated background orbs */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-red-500/20 blur-[80px] animate-pulse" />
        <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-amber-500/15 blur-[60px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Left: Info */}
          <div className="flex items-center gap-3 md:gap-5">
            <div className="hidden md:flex w-12 h-12 rounded-full bg-red-500/20 items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="inline-block text-[9px] font-bold text-red-400 bg-red-500/15 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {t('home.flash_sale')}
                </span>
                <span className="text-[10px] font-bold text-amber-400">
                  {t('product.percent_off', { percent: promo.discount })}
                </span>
              </div>
              <h3 className="text-white font-display font-bold text-sm md:text-lg lg:text-xl tracking-tight">
                {promo.title}
              </h3>
              {promo.description && (
                <p className="text-white/60 text-[11px] md:text-sm mt-0.5 line-clamp-1">{promo.description}</p>
              )}
            </div>
          </div>

          {/* Right: Countdown + CTA */}
          <div className="flex items-center gap-4 md:gap-6">
            {promo.endDate && (
              <FlashSaleCountdown
                endDate={promo.endDate}
                label=""
                compact
                className="text-white"
              />
            )}
            <button
              onClick={() => navigate('/products')}
              className="shrink-0 bg-red-600 hover:bg-red-500 text-white text-[11px] md:text-xs font-bold px-4 md:px-6 py-2 md:py-2.5 rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 active:scale-[0.97] whitespace-nowrap"
            >
              {t('home.shop_sale')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════ SCROLL TO TOP ═══════════ */
function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <style>{`
        .scroll-top-btn {
          position: fixed;
          bottom: 160px;
          right: 20px;
          z-index: 9999;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: #111;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
          transition: all 0.25s ease;
          opacity: 0;
          transform: translateY(12px) scale(0.9);
          pointer-events: none;
        }
        @media (min-width: 1024px) {
          .scroll-top-btn {
            bottom: 88px;
            right: 24px;
            width: 46px;
            height: 46px;
          }
        }
        .scroll-top-btn.visible {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .scroll-top-btn:hover {
          background: #000;
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 8px 28px rgba(0,0,0,0.25);
        }
        .scroll-top-btn:active {
          transform: translateY(0) scale(0.95);
        }
      `}</style>
      <button
        className={`scroll-top-btn ${visible ? 'visible' : ''}`}
        onClick={scrollToTop}
        aria-label="Scroll to top"
      >
        <ChevronUp size={20} />
      </button>
    </>
  );
}

/* ═══════════ MAIN HOMEPAGE ═══════════ */
export default function HomePage() {
  const navigate = useNavigate();
  const contentRef = useRef(null);
  const queryClient = useQueryClient();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const reviewsEnabled = getSetting('reviewsEnabled', 'true') !== 'false';
  const bestSellersEnabled = getSetting('bestSellersEnabled', 'true') !== 'false';
  const newArrivalsEnabled = getSetting('newArrivalsEnabled', 'true') !== 'false';
  const curatedLooksEnabled = getSetting('curatedLooksEnabled', 'true') !== 'false';

  // ── React Query hooks (cached, deduplicated, persisted to localStorage) ──

  const { data: featuredProducts = [], isLoading: loadingFeatured } = useQuery({
    queryKey: ['homepage', 'featured'],
    queryFn: async () => {
      const res = await productsAPI.getFeatured();
      const data = res?.data?.data?.products || res?.data?.data;
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60000,
  });

  const { data: newArrivals = [], isLoading: loadingNew } = useQuery({
    queryKey: ['homepage', 'newArrivals'],
    queryFn: async () => {
      const res = await productsAPI.getNewArrivals();
      const data = res?.data?.data?.products || res?.data?.data;
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60000,
  });

  const { data: bestSellers = [], isLoading: loadingBest } = useQuery({
    queryKey: ['homepage', 'bestSellers'],
    queryFn: async () => {
      const res = await productsAPI.getBestSellers();
      const data = res?.data?.data?.products || res?.data?.data;
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60000,
  });

  const { data: banners = [], isLoading: loadingBanners } = useQuery({
    queryKey: ['homepage', 'banners'],
    queryFn: async () => {
      const res = await bannersAPI.getHero();
      const data = res?.data?.data || [];
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60000,
  });

  const { data: categories = [], isLoading: loadingCats } = useQuery({
    queryKey: ['homepage', 'categories'],
    queryFn: async () => {
      const res = await categoriesAPI.getAll();
      const data = res?.data?.data?.categories || res?.data?.data || [];
      return Array.isArray(data) ? data : [];
    },
    staleTime: 120000, // categories change less often
  });

  const { data: homepageReviews = [], isLoading: loadingReviews } = useQuery({
    queryKey: ['homepage', 'reviews'],
    queryFn: async () => {
      const res = await reviewsAPI.getHomepage();
      const data = res?.data?.data?.reviews || [];
      return Array.isArray(data) ? data : [];
    },
    staleTime: 60000,
  });

  const { data: seoData = { title: '', description: '' } } = useQuery({
    queryKey: ['homepage', 'seo'],
    queryFn: async () => {
      const res = await seoAPI.getGlobalSEO();
      const seo = res?.data?.data || {};
      return { title: seo.title || '', description: seo.description || '' };
    },
    staleTime: 300000, // SEO rarely changes
  });

  const { data: reels = [], isLoading: loadingReels } = useQuery({
    queryKey: ['homepage', 'reels'],
    queryFn: async () => {
      const res = await reelsAPI.get();
      const data = res?.data?.data || [];
      return Array.isArray(data) ? data : [];
    },
    staleTime: 10000,
  });

  const { data: curatedLooks = [], isLoading: loadingLooks } = useQuery({
    queryKey: ['homepage', 'curatedLooks'],
    queryFn: async () => {
      const res = await curatedLooksAPI.get();
      const data = res?.data?.data || [];
      return Array.isArray(data) ? data : [];
    },
    staleTime: 120000,
  });

  const { data: flashSales = [] } = useQuery({
    queryKey: ['homepage', 'flashSales'],
    queryFn: async () => {
      const res = await promotionsAPI.getFlashSales();
      const data = res?.data?.data || [];
      return Array.isArray(data) ? data : [];
    },
    staleTime: 15000,
  });

  // Combined loading state — true until every query completes at least once
  const loading = loadingFeatured || loadingNew || loadingBest || loadingBanners || loadingCats || loadingReviews || loadingLooks || loadingReels;

  // Pull-to-refresh: invalidate all homepage caches so they re-fetch
  const refetchAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['homepage', 'featured'] }),
      queryClient.invalidateQueries({ queryKey: ['homepage', 'newArrivals'] }),
      queryClient.invalidateQueries({ queryKey: ['homepage', 'bestSellers'] }),
      queryClient.invalidateQueries({ queryKey: ['homepage', 'banners'] }),
      queryClient.invalidateQueries({ queryKey: ['homepage', 'categories'] }),
      queryClient.invalidateQueries({ queryKey: ['homepage', 'reviews'] }),
      queryClient.invalidateQueries({ queryKey: ['homepage', 'seo'] }),
      queryClient.invalidateQueries({ queryKey: ['homepage', 'reels'] }),
      queryClient.invalidateQueries({ queryKey: ['homepage', 'curatedLooks'] }),
      queryClient.invalidateQueries({ queryKey: ['homepage', 'flashSales'] }),
    ]);
  }, [queryClient]);

  const { pullDistance, isRefreshing, isPulling } = usePullToRefresh({
    onRefresh: refetchAll,
    threshold: 80,
    maxPull: 130,
    disabled: loading,
  });

  if (loading) {
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
      {/* SEO meta tags from global settings */}
      <SEOHead
        title={seoData.title || `${storeName} — Premium Streetwear`}
        description={seoData.description || `Discover premium streetwear fashion at ${storeName}. Shop the latest oversized tees, hoodies, accessories and more.`}
        keywords="streetwear, fashion, premium clothing, oversized t-shirts, hoodies, accessories"
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
        className="relative bg-surface"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: isPulling && !isRefreshing
            ? 'none'
            : 'transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* ══ 1. Full Bleed Hero Banner ══ */}
        {banners.length > 0 && (
          <AnimatedSection delay={0} margin="-40px">
            <HeroBanner banners={banners} />
          </AnimatedSection>
        )}

        <AnimatedDivider />

        {/* ══ 2. Flash Sales Banner ══ */}
        {flashSales.length > 0 && (
          <AnimatedSection delay={0.05}>
            <FlashSaleSection promotions={flashSales} />
          </AnimatedSection>
        )}

        {flashSales.length > 0 && newArrivalsEnabled && <AnimatedDivider />}

        {/* ══ 3. New Arrivals ══ */}
        {newArrivalsEnabled && (
          <AnimatedSection delay={0.05}>
            <NewArrivalsSection products={newArrivals} />
          </AnimatedSection>
        )}

        {newArrivalsEnabled && curatedLooksEnabled && <AnimatedDivider />}

        {/* ══ 4. Curated Looks ══ */}
        {curatedLooksEnabled && (
          <AnimatedSection delay={0.05}>
            <CuratedLooksSection looks={curatedLooks}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['homepage', 'curatedLooks'] })} />
          </AnimatedSection>
        )}

        {(curatedLooksEnabled || newArrivalsEnabled) && <AnimatedDivider />}

        {/* ══ 5. Shop by Category ══ */}
        <AnimatedSection delay={0.05}>
          <CategorySection categories={categories} />
        </AnimatedSection>

        <AnimatedDivider />

        {/* ══ 6. Best Sellers / Trending ══ */}
        {bestSellersEnabled && (
          <AnimatedSection delay={0.05}>
            <ProductRow
              title="Best Sellers"
              products={bestSellers.length > 0 ? bestSellers : featuredProducts.slice(0, 8)}
            />
          </AnimatedSection>
        )}

        {bestSellersEnabled && reviewsEnabled && <AnimatedDivider />}

        {/* ══ 7. Premium Review Slider ══ */}
        {reviewsEnabled && (
          <AnimatedSection delay={0.05}>
            <PremiumReviewSlider reviews={homepageReviews} loading={loadingReviews} />
          </AnimatedSection>
        )}

        {reviewsEnabled && <AnimatedDivider />}

        {/* ══ 8. Featured Reels ══ */}
        <AnimatedSection delay={0.05}>
          <ReelsSection reels={reels} loading={loadingReels}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['homepage', 'reels'] })} />
        </AnimatedSection>

      </div>

      {/* Scroll to Top Button — outside the pull-to-refresh transform container so position: fixed works correctly */}
      <ScrollToTopButton />
    </div>
  );
}
import { ChevronLeft, ChevronRight, RefreshCw, ArrowRight } from 'lucide-react';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import ProductCard from '../../components/product/ProductCard';
import SEOHead from '../../components/seo/SEOHead';
import { CUSTOM_TEE_SLUG } from '../../utils/constants';
import { useSettings } from '../../store/useSettings';
import { homepageAPI } from '../../api/homepage';
import { productsAPI } from '../../api/products';
import usePullToRefresh from '../../hooks/usePullToRefresh';

import { formatDate, getImageUrl, getBannerImage, getCategoryImage } from '../../utils/formatters';
import ReelsSection from '../../components/storefront/ReelsSection';
import FlashSaleCountdown from '../../components/storefront/FlashSaleCountdown';
import NewArrivalOfTheWeek from '../../components/storefront/NewArrivalOfTheWeek';
import ProfessionalDesignCTA from '../../components/storefront/ProfessionalDesignCTA';
import AllReviewsModal from '../../components/reviews/AllReviewsModal';


/* â•â•â•â•â•â•â•â•â•â•â• ANIMATION WRAPPERS â€” Premium Entrance â•â•â•â•â•â•â•â•â•â•â• */
function AnimatedSection({ children, className = '', delay = 0, margin = '-60px' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedDivider() {
  return (
    <div className="flex items-center justify-center gap-4 py-5 md:py-6">
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="h-[1px] w-24 md:w-40 bg-gradient-to-r from-transparent via-primary/20 to-primary/10 rounded-full"
        style={{ transformOrigin: 'left center' }}
      />
      {/* Decorative diamond with glow */}
      <motion.div
        initial={{ opacity: 0, rotate: -45, scale: 0 }}
        whileInView={{ opacity: 1, rotate: 0, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
        className="relative flex items-center justify-center"
      >
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-2 h-2 rotate-45 bg-primary/60"
        />
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-6 h-6 rounded-full bg-primary/8 blur-sm"
        />
      </motion.div>
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        className="h-[1px] w-24 md:w-40 bg-gradient-to-l from-transparent via-primary/20 to-primary/10 rounded-full"
        style={{ transformOrigin: 'right center' }}
      />
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â• FULL-BLEED HERO BANNER â•â•â•â•â•â•â•â•â•â•â• */
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
                  className="group/btn relative bg-primary text-white px-10 py-4 rounded-full text-base font-bold hover:bg-primary-dark transition-all duration-500 shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1 inline-flex items-center gap-2 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out" />
                  <span className="relative z-10">{slide.cta || t('home.shop_now')}</span>
                  <ArrowRight size={18} className="relative z-10 transition-transform duration-300 group-hover/btn:translate-x-1" />
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
                  className="group/btn relative bg-primary text-white px-10 py-4 rounded-full text-base font-bold hover:bg-primary-dark transition-all duration-500 shadow-xl shadow-black/20 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-1 inline-flex items-center gap-2 overflow-hidden"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-in-out" />
                  <span className="relative z-10">{slide.cta || t('home.shop_now')}</span>
                  <ArrowRight size={18} className="relative z-10 transition-transform duration-300 group-hover/btn:translate-x-1" />
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

/* â•â•â•â•â•â•â•â•â•â•â• CATEGORIES â€” Premium Editorial Grid â•â•â•â•â•â•â•â•â•â•â• */
function CategorySection({ categories }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cats = Array.from(Array.isArray(categories) ? categories : []);

  if (cats.length === 0) return null;

  // First card spans 2 cols for editorial hero treatment
  const hero = cats[0];
  const rest = cats.slice(1, 7); // up to 7 more cards

  return (
    <section className="content-section py-10 md:py-14 bg-white border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header â€” Centered */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6 md:mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="h-px w-8 bg-gradient-to-r from-transparent via-primary/30 to-primary/20 rounded-full" />
            <span className="text-text-muted text-[10px] md:text-[11px] font-bold uppercase tracking-[0.22em]">{t('home.collections')}</span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent via-primary/30 to-primary/20 rounded-full" />
          </div>
          <h2 className="text-xl md:text-2xl lg:text-headline-lg font-display font-bold tracking-tight text-gray-900">
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
          {/* Hero Card â€” spans 2 cols on desktop */}
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

          {/* Small cards alongside hero â€” 2 cards to keep grid balanced */}
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

        {/* Second row â€” 4 more cards (including the 3rd from rest) */}
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

/* â•â•â•â•â•â•â•â•â•â•â• PREMIUM PRODUCT SLIDER (Horizontal Desktop / Vertical Mobile) â•â•â•â•â•â•â•â•â•â•â• */
function ProductSlider({ products: rawProducts, skeletonCount = 6, cardClassName = '' }) {
  // Hide the custom t-shirt design product from all homepage listings
  const products = (rawProducts || []).filter(p => p.slug !== CUSTOM_TEE_SLUG);
  const scrollRef = useRef(null);
  const wrapperRef = useRef(null);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const autoplayRef = useRef(null);

  // Autoplay â€” scrolls every 5s (pauses on hover)
  useEffect(() => {
    if (isMobile || products.length <= 1) return;
    const el = scrollRef.current;
    if (!el) return;

    const scrollNext = () => {
      const card = el.querySelector('.product-slide');
      if (!card) return;
      const cardWidth = card.offsetWidth;
      const gap = 12;
      const scrollAmount = cardWidth + gap;
      const maxScroll = el.scrollWidth - el.clientWidth;
      const nextScroll = el.scrollLeft + scrollAmount;
      if (nextScroll >= maxScroll - 10) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
    };

    const startAutoplay = () => {
      autoplayRef.current = setInterval(scrollNext, 5000);
    };

    if (!isHovered) {
      startAutoplay();
    }

    return () => clearInterval(autoplayRef.current);
  }, [isMobile, isHovered, products.length]);

  // Update scroll button visibility on scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setCanScrollLeft(scrollLeft > 8);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
    };
    el.addEventListener('scroll', update, { passive: true });
    update();
    return () => el.removeEventListener('scroll', update);
  }, [products]);

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
    el.scrollBy({ left: direction * (cardWidth + gap), behavior: 'smooth' });
  };

  /* â”€â”€ Drag-to-scroll (touch + mouse) â”€â”€ */
  const dragState = useRef({ isDragging: false, startPos: 0, scrollPos: 0, moved: false });
  const [isDragActive, setIsDragActive] = useState(false);

  const onDragStart = (clientX, clientY) => {
    const el = scrollRef.current;
    // Mobile uses a plain grid (no inner scroll) — don't hijack taps with drag.
    if (!el || isMobile) return;
    dragState.current = {
      isDragging: true,
      startPos: isMobile ? clientY : clientX,
      scrollPos: isMobile ? el.scrollTop : el.scrollLeft,
      moved: false,
    };
    setIsDragActive(true);
  };

  const onDragMove = (clientX) => {
    const ds = dragState.current;
    if (!ds.isDragging || isMobile) return;
    const el = scrollRef.current;
    if (!el) return;
    const delta = clientX - ds.startPos;
    if (Math.abs(delta) > 5) ds.moved = true;
    el.scrollLeft = ds.scrollPos - delta;
  };

  const onDragEnd = () => {
    setIsDragActive(false);
    dragState.current.isDragging = false;
    setTimeout(() => { dragState.current.moved = false; }, 50);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handlePreventClick = (e) => {
      // Skip drag prevention for "View All" card â€” it should always be clickable
      if (dragState.current.moved && !e.target.closest('[data-no-drag]')) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    el.addEventListener('click', handlePreventClick, { capture: true });
    return () => {
      el.removeEventListener('click', handlePreventClick, { capture: true });
    };
  }, [products]);

  if (!products || products.length === 0) return null;

  const scrollableTrackClass = [
    'max-sm:grid max-sm:grid-cols-2 sm:flex sm:flex-row gap-3 sm:gap-3 md:gap-4',
    // Mobile: plain 2-col grid that flows with the page (no nested scroll/clipping).
    // Desktop: horizontal carousel only.
    'sm:overflow-x-auto',
    'sm:snap-x snap-mandatory',
    'scrollbar-hide select-none',
    isDragActive ? 'cursor-grabbing' : 'cursor-grab',
  ].join(' ');

  const cardClass = isMobile
    ? 'product-slide'
    : 'max-sm:w-full sm:product-slide sm:w-[302px] sm:min-w-[302px] sm:snap-start sm:shrink-0';

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
        onMouseDown={(e) => onDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => onDragMove(e.clientX, e.clientY)}
        onMouseUp={onDragEnd}
        onMouseLeave={onDragEnd}
        className={scrollableTrackClass}
      >
        {products.map((p, idx) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, [isMobile ? 'y' : 'x']: 40 }}
            whileInView={{ opacity: 1, [isMobile ? 'y' : 'x']: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.6, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
            className={cardClass}
          >
            <ProductCard product={p} className={cardClassName} />
          </motion.div>
        ))}


      </div>

      {/* Desktop scroll arrows â€” premium glassmorphism with glow */}
      {!isMobile && (
        <>
          <button
            onClick={() => scrollByCard(-1)}
            className={`absolute left-1 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 flex items-center justify-center text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-xl hover:shadow-primary/10 hover:scale-110 hover:border-primary/20 transition-all duration-300 active:scale-90 active:shadow-md group/arrow ${
              canScrollLeft ? 'opacity-100 md:opacity-0 md:group-hover/slider:opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} className="transition-transform duration-300 group-hover/arrow:-translate-x-0.5" />
          </button>
          <button
            onClick={() => scrollByCard(1)}
            className={`absolute right-1 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 backdrop-blur-xl border border-white/60 shadow-lg shadow-black/5 flex items-center justify-center text-gray-700 hover:bg-white hover:text-gray-900 hover:shadow-xl hover:shadow-primary/10 hover:scale-110 hover:border-primary/20 transition-all duration-300 active:scale-90 active:shadow-md group/arrow ${
              canScrollRight ? 'opacity-100 md:opacity-0 md:group-hover/slider:opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight size={16} className="transition-transform duration-300 group-hover/arrow:translate-x-0.5" />
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
    <section className="content-section py-10 md:py-14 bg-white">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header â€” Editorial Centered */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6 md:mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="h-px w-8 bg-gradient-to-r from-transparent via-primary/30 to-primary/20 rounded-full" />
            <span className="text-text-muted text-[10px] md:text-[11px] font-bold uppercase tracking-[0.22em]">{t('home.seasonal')}</span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent via-primary/30 to-primary/20 rounded-full" />
          </div>
          <h2 className="text-xl md:text-2xl lg:text-headline-lg font-display font-bold tracking-tight text-gray-900">
            {t('home.new_arrivals')}
          </h2>
          <p className="text-gray-400 text-xs md:text-sm mt-1 font-medium max-w-md mx-auto">
            Fresh arrivals, crafted for the new season
          </p>
          <button
            onClick={() => navigate('/products/section/new-arrivals')}
            className="hidden md:inline-flex mt-4 items-center gap-2 text-xs font-bold text-gray-700 hover:text-primary uppercase tracking-[0.15em] transition-colors duration-300 group shrink-0"
          >
            <span className="border-b border-gray-300 group-hover:border-primary pb-0.5 transition-colors duration-300">
              {t('home.browse_all')}
            </span>
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </motion.div>

        <div className="-mx-4 sm:-mx-6 lg:mx-0 max-sm:mx-0">
          <ProductSlider products={products} />
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

/* â•â•â•â•â•â•â•â•â•â•â• PRODUCT ROW â€” Editorial Style â•â•â•â•â•â•â•â•â•â•â• */
function ProductRow({ title, products }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!products || products.length === 0) return null;

  const tagline = title === 'Best Sellers' ? t('home.trending_now') : t('home.featured');
  const sectionSlug = title === 'Best Sellers' ? 'best-sellers' : 'featured';

  return (
    <section className="content-section py-10 md:py-14 bg-surface">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header â€” Editorial Centered */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6 md:mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="h-px w-8 bg-gradient-to-r from-transparent via-primary/30 to-primary/20 rounded-full" />
            <span className="text-text-muted text-[10px] md:text-[11px] font-bold uppercase tracking-[0.22em]">{tagline}</span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent via-primary/30 to-primary/20 rounded-full" />
          </div>
          <h2 className="text-xl md:text-2xl lg:text-headline-lg font-display font-bold tracking-tight text-gray-900">{title}</h2>
          <p className="text-gray-400 text-xs md:text-sm mt-1 font-medium max-w-md mx-auto">
            {title === 'Best Sellers' ? 'Most-loved pieces, trending right now' : 'Curated picks for the season'}
          </p>
          <button
            onClick={() => navigate(`/products/section/${sectionSlug}`)}
            className="hidden md:inline-flex mt-4 items-center gap-2 text-xs font-bold text-gray-700 hover:text-primary uppercase tracking-[0.15em] transition-colors duration-300 group shrink-0"
          >
            <span className="border-b border-gray-300 group-hover:border-primary pb-0.5 transition-colors duration-300">
              {t('home.browse_all')}
            </span>
            <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </button>
        </motion.div>
        
        <div className="-mx-4 sm:-mx-6 lg:mx-0 max-sm:mx-0">
          <ProductSlider products={products} />
        </div>
      </div>
    </section>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â• CURATED LOOKS â€” Dynamic Gallery (from Admin) â•â•â•â•â•â•â•â•â•â•â• */
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
    <section className="content-section curated-section py-10 md:py-14 bg-surface">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6 md:mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-3">
            <span className="h-px w-8 bg-gradient-to-r from-transparent via-primary/30 to-primary/20 rounded-full" />
            <span className="text-text-muted text-[10px] md:text-[11px] font-bold uppercase tracking-[0.22em]">{t('home.style_inspiration')}</span>
            <span className="h-px w-8 bg-gradient-to-l from-transparent via-primary/30 to-primary/20 rounded-full" />
          </div>
          <div className="relative inline-block">
            <h2 className="text-xl md:text-2xl lg:text-headline-lg font-display font-bold tracking-tight text-gray-900">
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

        {/* View-Only Image Gallery â€” prices hidden */}
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
                  {/* Name only â€” no price */}
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

/* â•â•â•â•â•â•â•â•â•â•â• PREMIUM REVIEW SLIDER â•â•â•â•â•â•â•â•â•â•â• */

/* â”€â”€ Map API review data to component format â”€â”€ */
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
          className="text-center mb-6 md:mb-8"
        >
          <button onClick={onOpenAllReviews} className="text-center w-full group">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="h-px w-6 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />
              <span className="text-white/30 text-[9px] font-bold uppercase tracking-[0.2em] group-hover:text-white/50 transition-colors">{t('home.testimonials')}</span>
              <span className="h-px w-6 bg-gradient-to-l from-transparent via-white/20 to-transparent rounded-full" />
            </div>
            <h2 className="text-lg md:text-2xl lg:text-3xl font-display font-bold tracking-tight text-white group-hover:text-white/90 transition-colors">
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
                className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/25 text-white shadow-lg shadow-black/20 items-center justify-center hover:scale-110 transition-all duration-300 active:scale-90 opacity-0 group-hover/slider:opacity-100 focus:opacity-100"
                aria-label="Previous review"
              >
                <ChevronLeft size={16} className="transition-transform duration-300 group-hover/arrow:-translate-x-0.5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext(); }}
                className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/25 text-white shadow-lg shadow-black/20 items-center justify-center hover:scale-110 transition-all duration-300 active:scale-90 opacity-0 group-hover/slider:opacity-100 focus:opacity-100"
                aria-label="Next review"
              >
                <ChevronRight size={16} className="transition-transform duration-300 group-hover/arrow:translate-x-0.5" />
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

/* â•â•â•â•â•â•â•â•â•â•â• SKELETON LOADING COMPONENTS â•â•â•â•â•â•â•â•â•â•â• */

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

/* â•â•â•â•â•â•â•â•â•â•â• PULL-TO-REFRESH INDICATOR â•â•â•â•â•â•â•â•â•â•â• */
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

/* â•â•â•â•â•â•â•â•â•â•â• FLASH SALE BANNER â•â•â•â•â•â•â•â•â•â•â• */
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
    <section className="content-section relative overflow-hidden bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
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
              <span className="text-2xl">âš¡</span>
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

/* â•â•â•â•â•â•â•â•â•â•â• MAIN HOMEPAGE â•â•â•â•â•â•â•â•â•â•â• */
export default function HomePage() {
  const navigate = useNavigate();
  const contentRef = useRef(null);
  const queryClient = useQueryClient();
  // â”€â”€ Consolidated homepage query â€” fetches ALL data in a single request â”€â”€
  // This replaces 15+ separate API calls, eliminating redundant Laravel boots
  // and dramatically improving page load time.
  const { data: homepageData, isLoading } = useQuery({
    queryKey: ['homepage', 'all'],
    queryFn: async () => {
      const res = await homepageAPI.getAll();
      return res?.data?.data || {};
    },
    staleTime: 0, // Always refetch â€” ensures stock counts are fresh after order placement
  });

  // Extract all data from the consolidated response
  const featuredProducts = homepageData?.featured || [];
  const newArrivals = homepageData?.newArrivals || [];
  const bestSellers = homepageData?.bestSellers || [];
  const banners = homepageData?.banners || [];
  const categories = homepageData?.categories || [];
  const homepageReviews = homepageData?.reviews?.reviews || [];
  const reels = homepageData?.reels || [];
  const curatedLooks = homepageData?.curatedLooks || [];
  const flashSales = homepageData?.promotions || [];
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

  // â”€â”€ Read section order from settings (with fallback to default) â”€â”€
  const sectionOrder = (() => {
    const raw = mergedGetSetting('homepageSectionOrder', '');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return ['hero_banner','flash_sales','new_arrival_week','new_arrivals','curated_looks','tshirt_customizer','categories','best_sellers','reviews','reels'];
  })();

  // â”€â”€ Section renderer map â€” maps section keys to JSX â”€â”€
  const renderSection = (key) => {
    switch (key) {
      case 'hero_banner':
        return banners.length > 0 && (
          <AnimatedSection key="hero_banner" delay={0} margin="-40px">
            <HeroBanner banners={banners} />
          </AnimatedSection>
        );
      case 'flash_sales':
        return flashSales.length > 0 && (
          <AnimatedSection key="flash_sales" delay={0.05}>
            <FlashSaleSection promotions={flashSales} />
          </AnimatedSection>
        );
      case 'new_arrival_week':
        return newArrivalProductId && !isExpired && featuredNewArrival && (
          <AnimatedSection key="new_arrival_week" delay={0.05} margin="-40px">
            <NewArrivalOfTheWeek product={featuredNewArrival} />
          </AnimatedSection>
        );
      case 'new_arrivals':
        return newArrivalsEnabled && (
          <AnimatedSection key="new_arrivals" delay={0.05}>
            <NewArrivalsSection products={newArrivals} />
          </AnimatedSection>
        );
      case 'curated_looks':
        return curatedLooksEnabled && (
          <AnimatedSection key="curated_looks" delay={0.05}>
            <CuratedLooksSection looks={curatedLooks}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['homepage', 'all'] })} />
          </AnimatedSection>
        );
      case 'tshirt_customizer':
        return tshirtCustomizerEnabled && (
          <AnimatedSection key="tshirt_customizer" delay={0.05}>
            <ProfessionalDesignCTA />
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
            <ProductRow
              title="Best Sellers"
              products={bestSellers.length > 0 ? bestSellers : featuredProducts.slice(0, 8)}
            />
          </AnimatedSection>
        );
      case 'reviews':
        return reviewsEnabled && (
          <AnimatedSection key="reviews" delay={0.05}>
            <PremiumReviewSlider reviews={homepageReviews} loading={isLoading} onReviewSuccess={refetchAll} onOpenAllReviews={() => setAllReviewsOpen(true)} />
          </AnimatedSection>
        );
      case 'reels':
        return reelsEnabled && (
          <AnimatedSection key="reels" delay={0.05}>
            <ReelsSection reels={reels} loading={isLoading}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ['homepage', 'all'] })} />
          </AnimatedSection>
        );
      default:
        return null;
    }
  };

  // â”€â”€ Check if the featured product has expired (local date comparison) â”€â”€
  const isExpired = newArrivalExpiryDate && (() => {
    const now = new Date();
    const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const expiryEnd = new Date(newArrivalExpiryDate + 'T23:59:59');
    return expiryEnd < todayLocal;
  })();

  // â”€â”€ Fetch specific New Arrival of the Week product if admin selected one (and not expired) â”€â”€
  const { data: featuredNewArrival } = useQuery({
    queryKey: ['homepage', 'featuredNewArrival', newArrivalProductId],
    queryFn: async () => {
      if (!newArrivalProductId) return null;
      const res = await productsAPI.getById(newArrivalProductId);
      return res?.data?.data || res?.data || null;
    },
    staleTime: 0, // Always refetch â€” ensures stock counts are fresh after order placement
    enabled: !!newArrivalProductId && !isExpired,
  });

  // Pull-to-refresh: invalidate the consolidated cache so it re-fetches
  const refetchAll = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['homepage', 'all'] });
  }, [queryClient]);

  /* â”€â”€ All Reviews Modal state â”€â”€ */
  const [allReviewsOpen, setAllReviewsOpen] = useState(false);


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
      {/* SEO meta tags from global settings */}
      <SEOHead
        title={seoData.title || `${storeName} â€” Premium Streetwear`}
        description={seoData.description || `Discover premium streetwear fashion at ${storeName}. Shop the latest oversized tees, hoodies, accessories and more.`}
        keywords="streetwear, fashion, premium clothing, oversized t-shirts, hoodies, accessories"
      />
      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={80}
      />

      {/* Content wrapper â€” translates down during pull */}
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
        {/* â•â• Dynamic Section Rendering from Admin Order â•â• */}
        {sectionOrder.map((key, idx) => {
          const section = renderSection(key);
          if (!section) return null;
          return (
            <React.Fragment key={key}>
              {idx > 0 && <AnimatedDivider />}
              {section}
            </React.Fragment>
          );
        })}

      </div>

      {/* All Reviews Modal â€” rendered OUTSIDE the transformed container so position: fixed works correctly */}
      <AllReviewsModal
        reviews={homepageReviews}
        isOpen={allReviewsOpen}
        onClose={() => setAllReviewsOpen(false)}
        onReviewSuccess={refetchAll}
      />

    </div>
  );
}


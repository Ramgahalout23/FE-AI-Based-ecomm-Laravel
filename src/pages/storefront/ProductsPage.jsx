import { Search, SlidersHorizontal, ChevronDown, X, ChevronLeft, ChevronRight, RefreshCw, Package } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

;
import { trackSearch } from '../../services/tracker';
import { withStoreName } from '../../utils/seo';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import Breadcrumb from '../../components/common/Breadcrumb';
import SEOHead from '../../components/seo/SEOHead';
import ProductGrid from '../../components/product/ProductGrid';
import { useSettings } from '../../store/useSettings';
import { productsAPI } from '../../api/products';
import { categoriesAPI } from '../../api/categories';
import { seoAPI } from '../../api/seo';
import { formatCurrency, getImageUrl, getCategoryImage } from '../../utils/formatters';
import Skeleton from '../../components/ui/Skeleton';

/* ── Constants ───────────────────────────────── */

const SORT_OPTIONS = (t) => [
  { value: 'relevance', label: t ? t('products.sort_relevance') : 'Sort: Relevance', sortBy: '', sortOrder: '' },
  { value: 'newest', label: t ? t('products.sort_newest') : 'Sort: Newest', sortBy: 'createdAt', sortOrder: 'desc' },
  { value: 'price-low', label: t ? t('products.sort_price_low') : 'Sort: Price ↑', sortBy: 'price', sortOrder: 'asc' },
  { value: 'price-high', label: t ? t('products.sort_price_high') : 'Sort: Price ↓', sortBy: 'price', sortOrder: 'desc' },
  { value: 'rating', label: t ? t('products.sort_top_rated') : 'Sort: Top Rated', sortBy: '', sortOrder: '' },
];

const PAGE_LIMIT = 12;
const MAX_PRICE = 5000;

const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL'];

const sortOptionMap = (value, t) => (SORT_OPTIONS(t)).find(o => o.value === value) || SORT_OPTIONS(t)[0];

/* ═══════════ PREMIUM CATEGORY CAROUSEL — Lookbook Cards ═══════════ */
function CategoryChips({ categories, selectedCategory, onCategoryChange }) {
  const { t } = useTranslation();
  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Auto-scroll active category into view
  useEffect(() => {
    if (!scrollRef.current || !selectedCategory) return;
    const activeBtn = scrollRef.current.querySelector(`[data-cat="${selectedCategory}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedCategory]);

  // Update scroll state
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => {
      setCanScrollLeft(el.scrollLeft > 8);
      setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
    };
    el.addEventListener('scroll', update, { passive: true });
    update();
    return () => el.removeEventListener('scroll', update);
  }, [categories]);

  if (!Array.isArray(categories) || categories.length === 0) return null;

  // Mouse drag-to-scroll
  const onMouseDown = (e) => {
    isDragging.current = true;
    startX.current = e.pageX - scrollRef.current.offsetLeft;
    scrollLeft.current = scrollRef.current.scrollLeft;
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  };
  const onMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    scrollRef.current.style.cursor = '';
    scrollRef.current.style.userSelect = '';
  };
  const onMouseMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft.current - walk;
  };

  const scrollBy = (dir) => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.querySelector('[data-cat]');
    const cardW = card ? card.offsetWidth + 12 : 200;
    scrollRef.current.scrollBy({ left: dir * cardW, behavior: 'smooth' });
  };

  return (
    <div className="relative group">
      {/* Section label */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-4 md:h-5 rounded-full bg-primary" />
          <h3 className="font-display font-bold text-sm md:text-base text-text-primary tracking-tight">
            {t('home.shop_by_category')}
          </h3>
        </div>
        <span className="text-[10px] md:text-xs text-text-muted font-medium">{categories.length} {t('products.categories')}</span>
      </div>

      <div
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onMouseMove={onMouseMove}
        className="flex items-stretch gap-3 md:gap-4 overflow-x-auto no-scrollbar scroll-smooth touch-pan-x"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {/* ── All Products Card ── */}
        <button
          onClick={() => onCategoryChange('')}
          className={`flex flex-col items-center justify-center w-[100px] sm:w-[110px] md:w-[130px] rounded-xl md:rounded-2xl border-2 transition-all duration-300 flex-shrink-0 overflow-hidden ${
            !selectedCategory
              ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
              : 'bg-white text-text-secondary border-border/60 hover:border-primary/40 hover:text-primary hover:shadow-lg'
          }`}
          style={{ scrollSnapAlign: 'start' }}
        >
          <div className="aspect-[3/4] w-full relative flex items-center justify-center">
            <div className="flex flex-col items-center gap-1.5 md:gap-2">
              <div className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                !selectedCategory ? 'bg-white/20' : 'bg-surface/80 group-hover:bg-primary/10'
              }`}>
                <Package size={16} className="md:w-[18px] md:h-[18px]" />
              </div>
              <span className="text-[10px] md:text-xs font-bold text-center leading-tight px-1">
                {t('products.all')}
              </span>
            </div>
          </div>
        </button>

        {/* ── Category Cards ── */}
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.slug;
          const catImg = getCategoryImage(cat);
          return (
            <button
              key={cat.slug}
              data-cat={cat.slug}
              onClick={() => onCategoryChange(cat.slug)}
              className={`relative w-[100px] sm:w-[120px] md:w-[150px] rounded-xl md:rounded-2xl border-2 transition-all duration-300 flex-shrink-0 overflow-hidden group/card ${
                isActive
                  ? 'border-primary ring-2 ring-primary/25 shadow-xl shadow-primary/20'
                  : 'border-border/60 hover:border-primary/30 hover:shadow-lg'
              }`}
              style={{ scrollSnapAlign: 'start' }}
            >
              {/* Category Image — portrait lookbook card */}
              <div className="aspect-[3/4] w-full relative bg-gray-50">
                {catImg ? (
                  <img
                    loading="lazy"
                    src={getImageUrl(catImg)}
                    alt={cat.name}
                    width="300"
                    height="400"
                    className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover/card:scale-105 ${
                      isActive ? 'opacity-90' : 'opacity-80 group-hover/card:opacity-95'
                    }`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-2xl md:text-3xl text-gray-200">◆</span>
                  </div>
                )}
                {/* Dark gradient overlay at bottom for text */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {/* Category name */}
                <div className="absolute bottom-0 left-0 right-0 p-2.5 md:p-3.5">
                  <div className="flex items-center justify-between gap-1">
                    <h3 className="text-white font-display text-[11px] md:text-sm font-bold tracking-tight leading-tight line-clamp-2">
                      {cat.name}
                    </h3>
                    {isActive && (
                      <div className="shrink-0 w-4 h-4 md:w-5 md:h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-2.5 h-2.5 md:w-3 md:h-3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Scroll Arrows — glassmorphic, show on group hover */}
      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className="hidden md:flex absolute -left-3.5 top-[calc(50%+12px)] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-gray-200/60 items-center justify-center text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scrollBy(1)}
          className="hidden md:flex absolute -right-3.5 top-[calc(50%+12px)] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md shadow-lg border border-gray-200/60 items-center justify-center text-gray-600 hover:bg-white hover:shadow-xl hover:scale-105 transition-all duration-200 active:scale-95"
          aria-label="Scroll right"
        >
          <ChevronRight size={16} />
        </button>
      )}

      {/* Edge fade gradients */}
      {canScrollLeft && (
        <div className="hidden md:block absolute left-0 top-8 bottom-0 w-10 bg-gradient-to-r from-white via-white/80 to-transparent pointer-events-none z-10" />
      )}
      {canScrollRight && (
        <div className="hidden md:block absolute right-0 top-8 bottom-0 w-10 bg-gradient-to-l from-white via-white/80 to-transparent pointer-events-none z-10" />
      )}
    </div>
  );
}

/* ═══════════ CATEGORY CARDS SKELETON ═══════════ */
function CategoryChipsSkeleton() {
  return (
    <div className="relative">
      {/* Section label skeleton */}
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className="flex items-center gap-2.5">
          <Skeleton className="!w-1 !h-4 md:!h-5 !rounded-full" />
          <Skeleton className="!w-28 md:!w-36 !h-4 md:!h-5 !rounded-md" />
        </div>
        <Skeleton className="!w-16 !h-3 !rounded-md" />
      </div>
      <div className="flex items-stretch gap-3 md:gap-4 overflow-x-hidden">
        {/* All Products skeleton */}
        <div className="w-[100px] sm:w-[110px] md:w-[130px] rounded-xl md:rounded-2xl border-2 border-border/60 flex-shrink-0 overflow-hidden">
          <div className="aspect-[3/4] w-full relative flex items-center justify-center">
            <div className="flex flex-col items-center gap-1.5 md:gap-2">
              <Skeleton className="!w-9 !h-9 md:!w-11 md:!h-11 !rounded-full" />
              <Skeleton className="!w-10 !h-2.5 !rounded-md" />
            </div>
          </div>
        </div>
        {/* Category card skeletons */}
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="w-[100px] sm:w-[120px] md:w-[150px] rounded-xl md:rounded-2xl border-2 border-border/60 flex-shrink-0 overflow-hidden"
          >
            <div className="aspect-[3/4] w-full relative bg-gray-50">
              <Skeleton className="!w-full !h-full !rounded-none !absolute !inset-0" />
              <div className="absolute bottom-0 left-0 right-0 p-2.5 md:p-3.5">
                <Skeleton className="!w-14 md:!w-20 !h-2.5 md:!h-3.5 !rounded-md" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════ FILTER DRAWER ═══════════ */
function FilterDrawer({ open, onClose, categories, selectedCategory, onCategoryChange, priceRange: appliedRange, onApplyPrice, selectedSizes, onSizeChange, onClearAll, activeCount }) {
  const { t } = useTranslation();
  // Local slider state — only commits to parent on "Apply" or quick select
  const [localRange, setLocalRange] = useState(appliedRange);
  const drawerRef = useRef(null);

  useEffect(() => {
    if (open) setLocalRange(appliedRange);
  }, [open, appliedRange]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      return () => {
        document.body.style.overflow = prev || '';
        document.body.style.touchAction = '';
      };
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          {/* Drawer: bottom sheet on mobile, side drawer on md+ */}
          <ResponsiveDrawer drawerRef={drawerRef}>
            {/* Drag Handle (mobile only) */}
            <div className="md:hidden flex justify-center pt-2 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 md:px-6 py-4 md:py-5 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} />
                <h3 className="font-display font-bold text-lg text-text-primary">{t('products.filters')}</h3>
                {activeCount > 0 && (
                  <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{activeCount}</span>
                )}
              </div>
              <button onClick={onClose} className="w-11 h-11 md:w-10 md:h-10 rounded-full bg-surface flex items-center justify-center hover:bg-border transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 md:px-6 py-5 md:py-6 space-y-7 md:space-y-8" style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
              {/* Category */}
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-5 h-px bg-gray-300" /> {t('products.category')}
                </h4>
                <div className="space-y-0.5">
                  <button
                    onClick={() => { onCategoryChange(''); onClose(); }}
                    className={`w-full text-left px-3.5 md:px-3 py-3 md:py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                      !selectedCategory ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                    }`}
                  >
                    {t('products.all_products')}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.slug}
                      onClick={() => { onCategoryChange(cat.slug); onClose(); }}
                      className={`w-full text-left px-3.5 md:px-3 py-3 md:py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                        selectedCategory === cat.slug ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size */}
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-5 h-px bg-gray-300" /> {t('products.size')}
                </h4>
                <div className="flex flex-wrap gap-2.5 md:gap-2">
                  {SIZE_OPTIONS.map((size) => {
                    const isSelected = selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        onClick={() => onSizeChange(size)}
                        className={`w-10 h-10 md:w-10 md:h-10 rounded-lg md:rounded-xl text-xs md:text-sm font-bold border-2 transition-all active:scale-90 ${
                          isSelected
                            ? 'bg-primary text-white border-primary shadow-sm'
                            : 'bg-white text-text-secondary border-border hover:border-primary hover:text-primary'
                        }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-5 h-px bg-gray-300" /> {t('products.price_range')}
                </h4>
                <div className="space-y-4">
                  <input
                    type="range"
                    min="0"
                    max={MAX_PRICE}
                    step="50"
                    value={localRange[1]}
                    onChange={(e) => setLocalRange([localRange[0], parseInt(e.target.value)])}
                    className="w-full h-2.5 md:h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      accentColor: '#1a1a1a',
                      background: `linear-gradient(to right, #1a1a1a ${(localRange[1] / MAX_PRICE) * 100}%, #e5e7eb ${(localRange[1] / MAX_PRICE) * 100}%)`
                    }}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 px-3 py-2.5 md:py-2.5 bg-surface rounded-lg border border-border text-center">
                      <span className="text-xs text-text-muted">{t('products.min')}</span>
                      <p className="text-sm font-bold text-text-primary">{formatCurrency(localRange[0])}</p>
                    </div>
                    <span className="text-text-muted text-xs">—</span>
                    <div className="flex-1 px-3 py-2.5 md:py-2.5 bg-surface rounded-lg border border-border text-center">
                      <span className="text-xs text-text-muted">{t('products.max')}</span>
                      <p className="text-sm font-bold text-text-primary">{formatCurrency(localRange[1])}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      { label: 'Under ₹500', range: [0, 500] },
                      { label: '₹500 – ₹1K', range: [500, 1000] },
                      { label: '₹1K – ₹1.5K', range: [1000, 1500] },
                      { label: '₹1.5K+', range: [1500, MAX_PRICE] },
                    ].map(({ label, range }) => (
                      <button
                        key={label}
                        onClick={() => { setLocalRange(range); onApplyPrice(range); }}
                        className={`px-3 py-2.5 md:py-2 text-xs font-semibold rounded-lg border transition-all active:scale-95 ${
                          localRange[0] === range[0] && localRange[1] === range[1]
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-text-secondary border-border hover:border-primary hover:text-primary'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 md:px-6 py-4 md:py-5 border-t border-border flex items-center gap-3 flex-shrink-0" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
              <button
                onClick={() => { onClearAll(); onClose(); }}
                className="flex-1 py-3 md:py-3 rounded-lg md:rounded-xl border-2 border-border text-xs md:text-sm font-bold text-text-secondary hover:border-text-primary transition-colors active:bg-surface"
              >
                {t('products.clear_all')}
              </button>
              <button
                onClick={() => { onApplyPrice(localRange); onClose(); }}
                className="flex-1 py-3 md:py-3 rounded-lg md:rounded-xl bg-primary text-white text-xs md:text-sm font-bold hover:bg-primary/90 transition-colors active:scale-[0.98]"
              >
                {t('products.apply_filters')}
              </button>
            </div>
          </ResponsiveDrawer>
        </>
      )}
    </AnimatePresence>
  );
}

/* Responsive drawer wrapper — bottom sheet on mobile, side slide on desktop */
function ResponsiveDrawer({ children, drawerRef }) {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== 'undefined' ? window.innerWidth >= 768 : false
  );

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const animProps = isDesktop
    ? { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } };

  return (
    <motion.div
      ref={drawerRef}
      {...animProps}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 top-[15%] md:top-0 md:right-0 md:left-auto md:w-full md:max-w-sm bg-white z-[101] shadow-2xl flex flex-col rounded-t-2xl md:rounded-t-none overflow-hidden md:rounded-l-2xl"
      style={{ overscrollBehavior: 'contain' }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════ PRODUCTS PAGE ═══════════ */
export default function ProductsPage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [priceRange, setPriceRange] = useState([0, MAX_PRICE]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedSizes, setSelectedSizes] = useState(
    searchParams.get('sizes') ? searchParams.get('sizes').split(',').filter(Boolean) : []
  );
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'relevance');

  // Sync URL params → state on mount / url change
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat !== null) setSelectedCategory(cat);
    const q = searchParams.get('q');
    if (q !== null) setSearchQuery(q);
    const sort = searchParams.get('sort');
    if (sort !== null) setSortBy(sort);
    const sizes = searchParams.get('sizes');
    if (sizes !== null) setSelectedSizes(sizes.split(',').filter(Boolean));
  }, [searchParams]);

  // ── React Query: Categories (cached for 5 min) ──
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll()
      .then(res => res.data?.data?.categories || res.data?.data || []),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch products with server-side params
  useEffect(() => {
    const fetchProducts = async () => {
      if (page === 1) setLoading(true);
      try {
        const params = { page, limit: PAGE_LIMIT };
        const cat = searchParams.get('category');
        if (cat) params.category = cat;
        const q = searchParams.get('q');
        if (q) params.search = q;
        const sort = searchParams.get('sort') || 'relevance';
        const sortOpt = sortOptionMap(sort, t);
        if (sortOpt.sortBy) {
          params.sortBy = sortOpt.sortBy;
          params.sortOrder = sortOpt.sortOrder;
        }
        if (priceRange[0] > 0) params.minPrice = priceRange[0];
        if (priceRange[1] < MAX_PRICE) params.maxPrice = priceRange[1];
        if (selectedSizes.length > 0) params.sizes = selectedSizes.join(',');

        const res = await productsAPI.getAll(params);
        // Laravel wraps data in { success: true, data: { data: [...], meta: {...} } }
        const responseData = res.data?.data || [];
        const newProducts = Array.isArray(responseData) ? responseData : (responseData?.data || []);
        const meta = Array.isArray(responseData) ? (res.data?.meta || {}) : (responseData?.meta || {});
        const totalCount = meta.total || newProducts.length;

        if (page === 1) setAllProducts(newProducts);
        else setAllProducts(prev => [...prev, ...newProducts]);

        setTotal(totalCount);
      } catch {
        if (page === 1) setAllProducts([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    fetchProducts();
  }, [page, searchParams, priceRange, selectedSizes, t]);

  const resetAndFetch = () => {
    setPage(1);
    setAllProducts([]);
  };

  const updateParams = (newParams) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && (Array.isArray(value) ? value.length > 0 : true)) {
        params.set(key, Array.isArray(value) ? value.join(',') : value);
      } else params.delete(key);
    });
    setSearchParams(params);
    resetAndFetch();
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    updateParams({ sort: newSort });
  };

  const handleCategoryChange = (slug) => {
    setSelectedCategory(slug);
    updateParams({ category: slug, q: null });
    setSearchQuery('');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      trackSearch(searchQuery.trim(), total);
      updateParams({ q: searchQuery, category: null });
      setSelectedCategory('');
    }
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSearchQuery('');
    setSelectedSizes([]);
    setSortBy('relevance');
    setPriceRange([0, MAX_PRICE]);
    setSearchParams({});
    resetAndFetch();
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    setPage(prev => prev + 1);
  };

  const handleSizeChange = (size) => {
    const newSizes = selectedSizes.includes(size)
      ? selectedSizes.filter(s => s !== size)
      : [...selectedSizes, size];
    setSelectedSizes(newSizes);
    updateParams({ sizes: newSizes.length > 0 ? newSizes.join(',') : null });
  };

  const applyPriceFilter = (range) => {
    setPriceRange(range);
    resetAndFetch();
    const params = new URLSearchParams(searchParams);
    if (range[0] > 0) params.set('minPrice', range[0]);
    else params.delete('minPrice');
    if (range[1] < MAX_PRICE) params.set('maxPrice', range[1]);
    else params.delete('maxPrice');
    setSearchParams(params);
  };

  const hasMore = allProducts.length < total;
  const isSearching = searchParams.get('q');
  const activeFiltersCount = [
    selectedCategory && 'cat',
    searchParams.get('q') && 'q',
    (priceRange[0] > 0 || priceRange[1] < MAX_PRICE) && 'price',
    selectedSizes.length > 0 && 'size',
  ].filter(Boolean).length;

  const pageTitle = selectedCategory
    ? categories.find(c => c.slug === selectedCategory)?.name || selectedCategory
    : searchParams.get('q')
      ? `"${searchParams.get('q')}"`
      : 'All Products';

  const currentCategory = categories.find(c => c.slug === selectedCategory);
  const categoryImage = currentCategory ? getCategoryImage(currentCategory) : null;

  // ── React Query: Category SEO (cached for 5 min) ──
  const { data: selectedCategorySeo = null } = useQuery({
    queryKey: ['category-seo', currentCategory?.id],
    queryFn: () => seoAPI.getEntitySEO('category', currentCategory.id)
      .then(res => res?.data?.data || null)
      .catch(() => null),
    enabled: !!currentCategory?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Page-level SEO title/description
  const seoTitle = selectedCategorySeo?.metaTitle || (
    selectedCategory
      ? withStoreName(`${pageTitle} — Shop Premium Collection`, storeName)
      : isSearching
        ? withStoreName(`Search Results for "${searchParams.get('q')}"`, storeName)
        : withStoreName('All Products — Premium Streetwear', storeName)
  );
  const seoDescription = selectedCategorySeo?.metaDescription || (
    selectedCategory && currentCategory
      ? `Shop the best ${pageTitle} collection at ${storeName}. Premium quality streetwear with fast shipping.`
      : `Browse our complete collection of premium streetwear. Oversized tees, hoodies, accessories and more at ${storeName}.`
  );
  const seoImage = selectedCategorySeo?.ogImage || (categoryImage ? getImageUrl(categoryImage) : '');



  return (
    <div className="page-content bg-white flex-1 content-section">
      {/* SEO meta tags */}
      <SEOHead
        title={seoTitle}
        description={seoDescription}
        keywords={selectedCategorySeo?.metaKeywords || `premium streetwear, ${pageTitle.toLowerCase()}, luxury fashion`}
        image={seoImage}
        canonicalUrl={selectedCategory ? `${window.location.origin}/products?category=${selectedCategory}` : `${window.location.origin}/products`}
      />
      {/* ── Category Hero Banner ── */}
      {selectedCategory && categoryImage && (
        <div className="relative w-full h-[200px] md:h-[280px] overflow-hidden bg-gray-900">
          <img
            src={getImageUrl(categoryImage)}
            alt={pageTitle}
            className="w-full h-full object-cover opacity-60"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <div className="max-w-7xl mx-auto">
              {/* Breadcrumbs inside hero banner */}
              <Breadcrumb
                items={[    {label: t('nav.home'), href: '/'},
    {label: pageTitle},
  ]}
  variant="dark"
                className="mb-3"
              />
              <h1 className="text-white font-display text-3xl md:text-5xl font-extrabold tracking-tight">
                {pageTitle}
              </h1>
              <p className="text-white/70 text-sm md:text-base mt-2 max-w-xl">
                {total} {total === 1 ? t('products.product') : t('products.products')} {t('products.found')}
              </p>
            </div>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8"
      >
        {/* Breadcrumbs + Page Header */}
        {!selectedCategory && (
          <>
            {/* Breadcrumbs */}
            <Breadcrumb
              items={[
    {label: t('nav.home'), href: '/'},
    {label: isSearching ? `${t('products.search')}: "${searchParams.get('q')}"` : t('products.all_products')},
  ]}
  variant="light"
              className="mb-4"
            />
            <div className="mb-6">
              <h1 className="font-display text-3xl md:text-4xl font-extrabold text-text-primary tracking-tight">
                {isSearching && <span className="text-primary">Search: </span>}
                {pageTitle}
              </h1>
              <p className="text-text-muted text-sm mt-1.5">{total} {total === 1 ? 'product' : 'products'} found</p>
            </div>
          </>
        )}

        {/* Search — enhanced with clear button */}
        <form onSubmit={handleSearch} className="mb-6 relative max-w-2xl group">
          <div className="relative flex items-center">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors pointer-events-none z-10" />
            <input
              type="text"
              placeholder={t('products.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 md:h-12 pl-12 pr-28 md:pr-36 bg-white border-2 border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-4 focus:ring-black/5 outline-none transition-all duration-200 shadow-sm hover:shadow-md focus:shadow-lg"
              autoComplete="off"
            />
            {/* Clear button — visible when there's text */}
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-[100px] md:right-[105px] top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-90"
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-black text-white h-10 md:h-10 px-3 md:px-5 rounded-lg text-[11px] font-bold hover:bg-gray-800 transition-all duration-200 active:scale-[0.97] flex items-center gap-1.5 shadow-sm hover:shadow-md"
            >
              <Search size={13} />
              <span className="hidden sm:inline">{t('products.search')}</span>
            </button>
          </div>
        </form>

        {/* Category Chips — with loading skeleton */}
        <div className="mb-5">
          {categoriesLoading ? (
            <CategoryChipsSkeleton />
          ) : (
            <CategoryChips categories={categories} selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange} />
          )}
        </div>

        {/* Sort + Filter Bar */}
        <div className="flex items-center justify-between mb-6 gap-2 md:gap-3">
          <span className="text-[11px] md:text-sm text-text-muted font-medium leading-tight">
            <strong className="text-text-primary">{total}</strong> <span className="hidden sm:inline">{t('products.results')}</span>
            {selectedCategory && categories.find(c => c.slug === selectedCategory)?.name && (
              <> <span className="hidden sm:inline">{t('products.in_category')}</span> <strong className="text-primary">{categories.find(c => c.slug === selectedCategory)?.name}</strong></>
            )}
          </span>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="h-10 md:h-10 pl-2.5 md:pl-3 pr-8 md:pr-9 text-[11px] md:text-xs font-semibold border-2 border-gray-200 rounded-lg md:rounded-xl appearance-none bg-white focus:outline-none focus:border-black focus:ring-4 focus:ring-black/5 cursor-pointer transition-all duration-200 hover:border-gray-400 max-w-[130px] md:max-w-none"
              >
                {SORT_OPTIONS(t).map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <button
              onClick={() => setShowFilters(true)}
              className={`h-10 md:h-10 px-3 md:px-4 flex items-center gap-1.5 md:gap-2 border-2 rounded-lg md:rounded-xl text-[11px] md:text-xs font-semibold transition-all active:scale-95 ${
                activeFiltersCount > 0
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-text-secondary border-border hover:border-primary hover:text-primary'
              }`}
            >
              <SlidersHorizontal size={14} />
              <span className="hidden sm:inline">{t('products.filters')}</span>
              {activeFiltersCount > 0 && (
                <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFiltersCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filter Tags — with stagger entrance */}
        {activeFiltersCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center gap-2 mb-6"
          >
            {selectedCategory && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.05 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20"
              >
                {categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}
                <button onClick={() => handleCategoryChange('')} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                  <X size={12} />
                </button>
              </motion.span>
            )}
            {searchParams.get('q') && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20"
              >
                <Search size={12} />
                "{searchParams.get('q')}"
                <button onClick={() => { updateParams({ q: null }); setSearchQuery(''); }} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                  <X size={12} />
                </button>
              </motion.span>
            )}
            {(priceRange[0] > 0 || priceRange[1] < MAX_PRICE) && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.15 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20"
              >
                {formatCurrency(priceRange[0])} — {formatCurrency(priceRange[1])}
                <button onClick={() => applyPriceFilter([0, MAX_PRICE])} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                  <X size={12} />
                </button>
              </motion.span>
            )}
            {selectedSizes.length > 0 && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: 0.2 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20"
              >
                Size: {selectedSizes.join(', ')}
                <button onClick={() => { setSelectedSizes([]); updateParams({ sizes: null }); }} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                  <X size={12} />
                </button>
              </motion.span>
            )}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: 0.25 }}
              onClick={clearFilters}
              className="text-xs font-semibold text-text-muted hover:text-primary underline-offset-2 hover:underline transition-colors"
            >
              {t('products.clear_all')}
            </motion.button>
          </motion.div>
        )}

        {/* Empty State */}
        {!selectedCategory && !searchParams.get('q') && allProducts.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Package size={36} className="text-gray-300" />
            </div>
            <h3 className="font-display font-bold text-xl text-gray-900 mb-2">{t('products.no_products')}</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">{t('products.no_products_desc')}</p>
          </motion.div>
        )}

        <ProductGrid products={allProducts} loading={loading && page === 1} />

        {/* Load More — with premium hover glow */}
        {hasMore && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="flex justify-center mt-8 md:mt-10 pb-4"
          >
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="group relative w-full max-w-xs md:max-w-none px-6 md:px-10 py-3.5 bg-primary text-white rounded-xl text-xs md:text-sm font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 overflow-hidden"
            >
              {/* Hover glow effect */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
                }}
              />
              <span className="relative z-10 flex items-center gap-2.5">
                {loadingMore ? (
                  <><RefreshCw size={14} className="animate-spin" /> {t('products.loading')}</>
                ) : (
                  <>{t('products.load_more')} <ChevronDown size={14} className="transition-transform duration-300 group-hover:translate-y-0.5" /></>
                )}
              </span>
            </button>
          </motion.div>
        )}

        {!loading && allProducts.length > 0 && (
          <div className="text-center mt-3 md:mt-4 pb-2">
            <span className="text-[11px] md:text-xs text-text-muted">{t('products.showing')} {allProducts.length} {t('products.of')} {total} {total === 1 ? t('products.product') : t('products.products')}</span>
          </div>
        )}
      </motion.div>

      <FilterDrawer
        open={showFilters}
        onClose={() => setShowFilters(false)}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={handleCategoryChange}
        priceRange={priceRange}
        onApplyPrice={applyPriceFilter}
        selectedSizes={selectedSizes}
        onSizeChange={handleSizeChange}
        onClearAll={() => { clearFilters(); setShowFilters(false); }}
        activeCount={activeFiltersCount}
      />
    </div>
  );
}

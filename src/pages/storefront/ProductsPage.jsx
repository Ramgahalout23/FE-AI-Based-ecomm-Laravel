import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, ChevronDown, X, ChevronLeft, Package, Loader2 } from 'lucide-react';
import { trackSearch } from '../../services/tracker';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import Breadcrumb from '../../components/common/Breadcrumb';
import SEOHead from '../../components/seo/SEOHead';
import ProductGrid from '../../components/product/ProductGrid';
import { productsAPI } from '../../api/products';
import { categoriesAPI } from '../../api/categories';
import { seoAPI } from '../../api/seo';
import { formatCurrency, getImageUrl, getCategoryImage } from '../../utils/formatters';

/* ── Constants ───────────────────────────────── */

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Sort: Relevance', sortBy: '', sortOrder: '' },
  { value: 'newest', label: 'Sort: Newest', sortBy: 'createdAt', sortOrder: 'desc' },
  { value: 'price-low', label: 'Sort: Price ↑', sortBy: 'price', sortOrder: 'asc' },
  { value: 'price-high', label: 'Sort: Price ↓', sortBy: 'price', sortOrder: 'desc' },
  { value: 'rating', label: 'Sort: Top Rated', sortBy: '', sortOrder: '' },
];

const PAGE_LIMIT = 12;
const MAX_PRICE = 5000;

const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL'];

const sortOptionMap = (value) => SORT_OPTIONS.find(o => o.value === value) || SORT_OPTIONS[0];

/* ═══════════ CATEGORY CHIPS ═══════════ */
function CategoryChips({ categories, selectedCategory, onCategoryChange }) {
  const scrollRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);

  // Auto-scroll active category into view
  useEffect(() => {
    if (!scrollRef.current || !selectedCategory) return;
    const activeBtn = scrollRef.current.querySelector(`[data-cat="${selectedCategory}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedCategory]);

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

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onMouseMove={onMouseMove}
        className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-1 scroll-smooth touch-pan-x"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        <button
          onClick={() => onCategoryChange('')}
          className={`flex items-center gap-1.5 px-4 md:px-5 py-3.5 md:py-3 rounded-full text-xs md:text-sm font-bold border transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
            !selectedCategory
              ? 'bg-primary text-white border-primary shadow-md'
              : 'bg-white text-text-secondary border-border hover:border-primary hover:text-primary'
          }`}
          style={{ scrollSnapAlign: 'start' }}
        >
          <Package size={14} className="md:w-4 md:h-4" />
          <span className="md:hidden">All</span>
          <span className="hidden md:inline">All Products</span>
        </button>
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.slug;
          const catImg = getCategoryImage(cat);
          return (
            <button
              key={cat.slug}
              data-cat={cat.slug}
              onClick={() => onCategoryChange(cat.slug)}
              className={`flex items-center gap-2 px-4 md:px-5 py-3.5 md:py-3 rounded-full text-xs md:text-sm font-semibold border transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                isActive
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-white text-text-secondary border-border hover:border-primary hover:text-primary hover:shadow-sm'
              }`}
              style={{ scrollSnapAlign: 'start' }}
            >
              {catImg ? (
                <img loading="lazy" src={getImageUrl(catImg)} alt="" className="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover" />
              ) : (
                <span className="text-base md:text-lg opacity-60">◆</span>
              )}
              {cat.name}
            </button>
          );
        })}
      </div>
      {/* Gradient fades — hidden on touch since overflow scroll is self-evident */}
      <div className="hidden md:block absolute left-0 top-0 bottom-0 w-6 lg:w-8 bg-gradient-to-r from-white to-transparent pointer-events-none" />
      <div className="hidden md:block absolute right-0 top-0 bottom-0 w-6 lg:w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
    </div>
  );
}

/* ═══════════ FILTER DRAWER ═══════════ */
function FilterDrawer({ open, onClose, categories, selectedCategory, onCategoryChange, priceRange: appliedRange, onApplyPrice, selectedSizes, onSizeChange, onClearAll, activeCount }) {
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
                <SlidersHorizontal size={16} className="text-text-primary" />
                <h3 className="font-display font-bold text-lg text-text-primary">Filters</h3>
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
                  <span className="w-5 h-px bg-gray-300" /> Category
                </h4>
                <div className="space-y-0.5">
                  <button
                    onClick={() => { onCategoryChange(''); onClose(); }}
                    className={`w-full text-left px-3.5 md:px-3 py-3 md:py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
                      !selectedCategory ? 'bg-primary/10 text-primary font-bold' : 'text-text-secondary hover:bg-surface hover:text-text-primary'
                    }`}
                  >
                    All Products
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
                  <span className="w-5 h-px bg-gray-300" /> Size
                </h4>
                <div className="flex flex-wrap gap-2.5 md:gap-2">
                  {SIZE_OPTIONS.map((size) => {
                    const isSelected = selectedSizes.includes(size);
                    return (
                      <button
                        key={size}
                        onClick={() => onSizeChange(size)}
                        className={`w-11 h-11 md:w-10 md:h-10 rounded-xl text-sm font-bold border-2 transition-all active:scale-90 ${
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
                  <span className="w-5 h-px bg-gray-300" /> Price Range
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
                    <div className="flex-1 px-3 py-3.5 md:py-2.5 bg-surface rounded-lg border border-border text-center">
                      <span className="text-xs text-text-muted">Min</span>
                      <p className="text-sm font-bold text-text-primary">{formatCurrency(localRange[0])}</p>
                    </div>
                    <span className="text-text-muted text-xs">—</span>
                    <div className="flex-1 px-3 py-3.5 md:py-2.5 bg-surface rounded-lg border border-border text-center">
                      <span className="text-xs text-text-muted">Max</span>
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
                        className={`px-3 py-3.5 md:py-2 text-xs font-semibold rounded-lg border transition-all active:scale-95 ${
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
                className="flex-1 py-3.5 md:py-3 rounded-xl border-2 border-border text-sm font-bold text-text-secondary hover:border-text-primary transition-colors active:bg-surface"
              >
                Clear All
              </button>
              <button
                onClick={() => { onApplyPrice(localRange); onClose(); }}
                className="flex-1 py-3.5 md:py-3 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors active:scale-[0.98]"
              >
                Apply Filters
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
  const { data: categories = [] } = useQuery({
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
        const sortOpt = sortOptionMap(sort);
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
  }, [page, searchParams, priceRange]);

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
      ? `${pageTitle} — Shop Premium Collection | Threvolt`
      : isSearching
        ? `Search Results for "${searchParams.get('q')}" | Threvolt`
        : 'All Products — Premium Streetwear | Threvolt'
  );
  const seoDescription = selectedCategorySeo?.metaDescription || (
    selectedCategory && currentCategory
      ? `Shop the best ${pageTitle} collection at Threvolt. Premium quality streetwear with fast shipping.`
      : 'Browse our complete collection of premium streetwear. Oversized tees, hoodies, accessories and more at Threvolt.'
  );
  const seoImage = selectedCategorySeo?.ogImage || (categoryImage ? getImageUrl(categoryImage) : '');

  return (
    <div className="page-content bg-white flex-1">
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
                items={[
                  { label: 'Home', href: '/' },
                  { label: pageTitle },
                ]}
                variant="dark"
                className="mb-3"
              />
              <h1 className="text-white font-display text-3xl md:text-5xl font-extrabold tracking-tight">
                {pageTitle}
              </h1>
              <p className="text-white/70 text-sm md:text-base mt-2 max-w-xl">
                {total} {total === 1 ? 'product' : 'products'} available
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Breadcrumbs + Page Header */}
        {!selectedCategory && (
          <>
            {/* Breadcrumbs */}
            <Breadcrumb
              items={[
                { label: 'Home', href: '/' },
                { label: isSearching ? `Search: "${searchParams.get('q')}"` : 'All Products' },
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

        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6 relative max-w-2xl group">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search by product name, style, or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-24 bg-surface border-2 border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted/60 focus:border-primary focus:ring-4 focus:ring-primary/5 outline-none transition-all"
              autoComplete="off"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-primary text-white h-11 px-5 rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1.5"
            >
              <Search size={14} />
              Search
            </button>
          </div>
        </form>

        {/* Category Chips */}
        <div className="mb-5">
          <CategoryChips categories={categories} selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange} />
        </div>

        {/* Sort + Filter Bar */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <span className="text-xs md:text-sm text-text-muted font-medium">
            <strong className="text-text-primary">{total}</strong> results
            {selectedCategory && categories.find(c => c.slug === selectedCategory)?.name && (
              <> in <strong className="text-primary">{categories.find(c => c.slug === selectedCategory)?.name}</strong></>
            )}
          </span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="h-11 md:h-10 pl-3.5 md:pl-3 pr-10 md:pr-9 text-xs font-semibold border-2 border-border rounded-xl appearance-none bg-white focus:outline-none focus:border-primary cursor-pointer transition-colors"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3.5 md:right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            </div>
            <button
              onClick={() => setShowFilters(true)}
              className={`h-11 md:h-10 px-4 md:px-4 flex items-center gap-2 border-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                activeFiltersCount > 0
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-text-secondary border-border hover:border-primary hover:text-primary'
              }`}
            >
              <SlidersHorizontal size={15} />
              <span className="hidden sm:inline">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeFiltersCount}</span>
              )}
            </button>
          </div>
        </div>

        {/* Active Filter Tags */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {selectedCategory && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20">
                {categories.find(c => c.slug === selectedCategory)?.name || selectedCategory}
                <button onClick={() => handleCategoryChange('')} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                  <X size={12} />
                </button>
              </span>
            )}
            {searchParams.get('q') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20">
                <Search size={12} />
                "{searchParams.get('q')}"
                <button onClick={() => { updateParams({ q: null }); setSearchQuery(''); }} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                  <X size={12} />
                </button>
              </span>
            )}
            {(priceRange[0] > 0 || priceRange[1] < MAX_PRICE) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20">
                💰 {formatCurrency(priceRange[0])} — {formatCurrency(priceRange[1])}
                <button onClick={() => applyPriceFilter([0, MAX_PRICE])} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedSizes.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20">
                📏 Size: {selectedSizes.join(', ')}
                <button onClick={() => { setSelectedSizes([]); updateParams({ sizes: null }); }} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
                  <X size={12} />
                </button>
              </span>
            )}
            <button onClick={clearFilters} className="text-xs font-semibold text-text-muted hover:text-primary underline-offset-2 hover:underline transition-colors">
              Clear all
            </button>
          </div>
        )}

        {/* Empty State */}
        {!selectedCategory && !searchParams.get('q') && allProducts.length === 0 && !loading && (
          <div className="text-center py-16">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="font-display font-bold text-xl text-text-primary mb-2">No products yet</h3>
            <p className="text-text-muted text-sm">Products will appear here once they are added.</p>
          </div>
        )}

        <ProductGrid products={allProducts} loading={loading && page === 1} />

        {/* Load More */}
        {hasMore && !loading && (
          <div className="flex justify-center mt-10 pb-4">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="px-10 py-3.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2.5 shadow-md hover:shadow-lg"
            >
              {loadingMore ? (
                <><Loader2 size={16} className="animate-spin" /> Loading...</>
              ) : (
                <>Load More <ChevronDown size={16} /></>
              )}
            </button>
          </div>
        )}

        {!loading && allProducts.length > 0 && (
          <div className="text-center mt-4 pb-2">
            <span className="text-xs text-text-muted">Showing {allProducts.length} of {total} {total === 1 ? 'product' : 'products'}</span>
          </div>
        )}
      </div>

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

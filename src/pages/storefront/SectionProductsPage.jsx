import { ChevronDown, RefreshCw, Sparkles, TrendingUp, SlidersHorizontal, X, Filter, Package } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { useSettings } from '../../store/useSettings';
import ProductGrid from '../../components/product/ProductGrid';
import { productsAPI } from '../../api/products';
import { formatCurrency } from '../../utils/formatters';

/* ── Constants ───────────────────────────────── */

const SORT_OPTIONS = (t) => [
  { value: 'newest', label: t('products.newest'), sortBy: '', sortOrder: '' },
  { value: 'price-low', label: t('products.price_low_high'), sortBy: 'price', sortOrder: 'asc' },
  { value: 'price-high', label: t('products.price_high_low'), sortBy: 'price', sortOrder: 'desc' },
  { value: 'name-asc', label: t('products.name_az'), sortBy: 'name', sortOrder: 'asc' },
  { value: 'name-desc', label: t('products.name_za'), sortBy: 'name', sortOrder: 'desc' },
];

const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL'];
const MAX_PRICE = 5000;
const PAGE_LIMIT = 12;

const SECTION_CONFIG = {
  'new-arrivals': {
    title: 'home.new_arrivals',
    subtitle: 'products.section_new_subtitle',
    label: 'home.seasonal',
    icon: Sparkles,
    badge: 'NEW',
    fetchFn: (params) => productsAPI.getNewArrivals(params),
  },
  'best-sellers': {
    title: 'home.best_sellers',
    subtitle: 'products.section_bestseller_subtitle',
    label: 'home.trending_now',
    icon: TrendingUp,
    badge: 'BESTSELLER',
    fetchFn: (params) => productsAPI.getBestSellers(params),
  },
};

/* ═══════════ FILTER SIDEBAR CONTENT ═══════════ */

function FilterContent({
  priceRange,
  onPriceRangeChange,
  selectedSizes,
  onSizeToggle,
  onApplyPrice,
  total,
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-7 md:space-y-8">
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
            value={priceRange[1]}
            onChange={(e) => onPriceRangeChange([priceRange[0], parseInt(e.target.value)])}
            className="w-full h-2 rounded-full appearance-none cursor-pointer accent-black"
            style={{
              background: `linear-gradient(to right, #1a1a1a ${(priceRange[1] / MAX_PRICE) * 100}%, #e5e7eb ${(priceRange[1] / MAX_PRICE) * 100}%)`,
            }}
          />
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 px-3 py-3 md:py-2.5 bg-surface rounded-lg border border-border text-center">
              <span className="text-xs text-text-muted">{t('products.min')}</span>
              <p className="text-sm font-bold text-text-primary">{formatCurrency(priceRange[0])}</p>
            </div>
            <span className="text-text-muted text-xs">—</span>
            <div className="flex-1 px-3 py-3 md:py-2.5 bg-surface rounded-lg border border-border text-center">
              <span className="text-xs text-text-muted">{t('products.max')}</span>
              <p className="text-sm font-bold text-text-primary">{formatCurrency(priceRange[1])}</p>
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
                onClick={() => onApplyPrice(range)}
                className={`px-3 py-3 md:py-2 text-xs font-semibold rounded-lg border transition-all active:scale-95 ${
                  priceRange[0] === range[0] && priceRange[1] === range[1]
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
                onClick={() => onSizeToggle(size)}
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

      {/* Results summary */}
      <div className="pt-2 border-t border-border">
        <p className="text-xs text-text-muted">
          <strong className="text-text-primary">{total}</strong> {total === 1 ? t('products.product') : t('products.products')} {t('products.found')}
        </p>
      </div>
    </div>
  );
}

/* ═══════════ MOBILE FILTER DRAWER ═══════════ */

function MobileFilterDrawer({
  open,
  onClose,
  priceRange,
  onPriceRangeChange,
  selectedSizes,
  onSizeToggle,
  onApplyPrice,
  onClearAll,
  activeCount,
  total,
}) {
  const { t } = useTranslation();
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

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 top-[15%] bg-white z-[101] shadow-2xl flex flex-col rounded-t-2xl overflow-hidden"
            style={{ overscrollBehavior: 'contain' }}
          >
            {/* Drag Handle */}
            <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={16} />
                <h3 className="font-display font-bold text-lg text-text-primary">{t('products.filters')}</h3>
                {activeCount > 0 && (
                  <span className="bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {activeCount}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="w-11 h-11 rounded-full bg-surface flex items-center justify-center hover:bg-border transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div
              className="flex-1 overflow-y-auto px-5 py-5"
              style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            >
              <FilterContent priceRange={priceRange} onPriceRangeChange={onPriceRangeChange} selectedSizes={selectedSizes} onSizeToggle={onSizeToggle} onApplyPrice={onApplyPrice} total={total} />
            </div>

            {/* Footer */}
            <div
              className="px-5 py-4 border-t border-border flex items-center gap-3 flex-shrink-0"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            >
              <button
                onClick={() => { onClearAll(); onClose(); }}
                className="flex-1 py-3.5 rounded-xl border-2 border-border text-sm font-bold text-text-secondary hover:border-text-primary transition-colors active:bg-surface"
              >
                {t('products.clear_all')}
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-3.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors active:scale-[0.98]"
              >
                {t('products.show_results')}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ═══════════ MAIN PAGE ═══════════ */

export default function SectionProductsPage() {
  const { t } = useTranslation();
  const { section } = useParams();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const config = SECTION_CONFIG[section];

  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  // Filter state
  const [priceRange, setPriceRange] = useState([0, MAX_PRICE]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const observerRef = useRef(null);
  const hasMoreRef = useRef(false);
  hasMoreRef.current = products.length < total;

  const sentinelRef = useCallback(
    (node) => {
      if (loading || loadingMore) return;
      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreRef.current && !loadingMore) {
            setLoadingMore(true);
            setPage((prev) => prev + 1);
          }
        },
        { threshold: 0.1 }
      );

      if (node) observerRef.current.observe(node);
    },
    [loading, loadingMore]
  );

  const sortOptions = SORT_OPTIONS(t);
  const sortOption = sortOptions.find((o) => o.value === sortBy) || sortOptions[0];

  // Active filters count
  const activeFiltersCount =
    (priceRange[0] > 0 || priceRange[1] < MAX_PRICE ? 1 : 0) +
    selectedSizes.length;

  // Reset filters
  const clearFilters = () => {
    setPriceRange([0, MAX_PRICE]);
    setSelectedSizes([]);
    setProducts([]);
    setPage(1);
    setLoading(true);
  };

  // Not a valid section
  if (!config) {
    return (
      <div className="page-content bg-white flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <Package size={48} />
          <h2 className="font-display font-bold text-2xl text-gray-900 mb-2">{t('products.section_not_found')}</h2>
          <p className="text-gray-500 mb-6">{t('products.section_not_found_desc')}</p>
          <Breadcrumb
            items={[
              { label: t('nav.home'), href: '/' },
              { label: t('products.section_not_found') },
            ]}
            variant="light"
            className="justify-center mb-4"
          />
        </div>
      </div>
    );
  }

  const configT = {
    ...config,
    title: t(config.title),
    subtitle: t(config.subtitle),
    label: t(config.label),
  };
  const Icon = configT.icon || config.icon;

  // Build API params from all filter + sort state
  const buildApiParams = useCallback(() => {
    const params = { page, limit: PAGE_LIMIT };
    const currentSort = sortOptions.find((o) => o.value === sortBy) || sortOptions[0];
    if (currentSort.sortBy) {
      params.sortBy = currentSort.sortBy;
      params.sortOrder = currentSort.sortOrder;
    }
    if (priceRange[0] > 0) params.minPrice = priceRange[0];
    if (priceRange[1] < MAX_PRICE) params.maxPrice = priceRange[1];
    if (selectedSizes.length > 0) params.sizes = selectedSizes.join(',');
    return params;
  }, [page, sortBy, priceRange, selectedSizes]);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      if (page === 1) setLoading(true);
      try {
        const params = buildApiParams();
        const res = await config.fetchFn(params);
        const responseData = res.data?.data;
        const newProducts = Array.isArray(responseData) ? responseData : (responseData?.products || []);
        const meta = res.data?.pagination || {};
        const totalCount = meta.total || newProducts.length;

        if (!Array.isArray(newProducts)) return;

        if (page === 1) setProducts(newProducts);
        else setProducts((prev) => [...prev, ...newProducts]);

        setTotal(totalCount);
        setError(false);
      } catch {
        if (page === 1) setProducts([]);
        setError(true);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    };
    fetchProducts();
  }, [page, section, sortBy, priceRange, selectedSizes]);

  // Reset when section, sort, price range, or sizes change
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setTotal(0);
    setLoading(true);
    setLoadingMore(false);
    setError(false);
  }, [section, sortBy, priceRange, selectedSizes]);

  const handleSizeToggle = (size) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleApplyPrice = (range) => {
    setPriceRange(range);
  };

  return (
    <div className="page-content bg-white flex-1">
      <SEOHead
        title={`${configT.title} | ${storeName}`}
        description={configT.subtitle || `Browse our ${configT.title.toLowerCase()} collection. Shop premium products at ${storeName}.`}
      />
      {/* Hero Banner */}
      <div className="relative w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-white/5 blur-2xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <Breadcrumb
            items={[
              { label: t('nav.home'), href: '/' },
              { label: configT.title },
            ]}
            variant="dark"
            className="mb-6"
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/30">
                <Icon size={12} />
                {configT.label}
              </span>
              <span className="text-white/40 text-xs font-medium">
                {total} {total === 1 ? t('products.product') : t('products.products')}
              </span>
            </div>

            <h1 className="text-white font-display text-3xl md:text-5xl font-extrabold tracking-tight leading-[1.1] mb-3">
              {configT.title}
            </h1>
            <p className="text-white/60 text-sm md:text-base max-w-xl">
              {configT.subtitle}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content area: sidebar + products */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {/* Sort + Filter bar (mobile) */}
        <div className="flex items-center justify-between mb-6 gap-3 lg:hidden">
          <p className="text-sm text-text-muted">
            {!loading && (
              <>
                {t('products.showing')} <strong className="text-text-primary">{products.length}</strong> {t('products.of')}{' '}
                <strong className="text-text-primary">{total}</strong> {t('products.products')}
              </>
            )}
          </p>
          <div className="flex items-center gap-2">
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-10 pl-3 pr-9 text-xs font-semibold border-2 border-border rounded-xl appearance-none bg-white focus:outline-none focus:border-primary cursor-pointer transition-colors"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </div>
            <button
              onClick={() => setShowMobileFilters(true)}
              className={`h-10 px-3 flex items-center gap-2 border-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                activeFiltersCount > 0
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white text-text-secondary border-border hover:border-primary hover:text-primary'
              }`}
            >
              <Filter size={15} />
              {activeFiltersCount > 0 && (
                <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Active filter tags (mobile) */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 lg:hidden">
            {(priceRange[0] > 0 || priceRange[1] < MAX_PRICE) && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20">
                💰 {formatCurrency(priceRange[0])} — {formatCurrency(priceRange[1])}
                <button
                  onClick={() => setPriceRange([0, MAX_PRICE])}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {selectedSizes.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20">
                📏 Size: {selectedSizes.join(', ')}
                <button
                  onClick={() => setSelectedSizes([])}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-xs font-semibold text-text-muted hover:text-primary underline-offset-2 hover:underline transition-colors"
            >
              {t('products.clear_all')}
            </button>
          </div>
        )}

        {/* Desktop: sidebar + products layout */}
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-24 space-y-6">
              {/* Sort */}
              <div>
                <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="w-5 h-px bg-gray-300" /> {t('products.sort_by')}
                </h4>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full h-10 pl-3 pr-9 text-xs font-semibold border-2 border-border rounded-xl appearance-none bg-white focus:outline-none focus:border-primary cursor-pointer transition-colors"
                  >
                    {SORT_OPTIONS(t).map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>

              {/* Filters */}
              <FilterContent priceRange={priceRange} onPriceRangeChange={setPriceRange} selectedSizes={selectedSizes} onSizeToggle={handleSizeToggle} onApplyPrice={handleApplyPrice} total={total} />

              {/* Active filters on desktop */}
              {activeFiltersCount > 0 && (
                <div className="pt-2">
                  <button
                    onClick={clearFilters}
                    className="w-full py-2.5 rounded-xl border-2 border-border text-xs font-bold text-text-secondary hover:border-text-primary transition-colors active:bg-surface"
                  >
                    {t('products.clear_filters')}
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* Products */}
          <div className="flex-1 min-w-0">
            {/* Sort bar (desktop) */}
            <div className="hidden lg:flex items-center justify-between mb-6">
              <p className="text-sm text-text-muted">
                {!loading && (
                  <>
                    {t('products.showing')} <strong className="text-text-primary">{products.length}</strong> {t('products.of')}{' '}
                    <strong className="text-text-primary">{total}</strong> {t('products.products')}
                  </>
                )}
              </p>
              {activeFiltersCount > 0 && (
                <div className="flex items-center gap-2">
                  {(priceRange[0] > 0 || priceRange[1] < MAX_PRICE) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20">
                      💰 {formatCurrency(priceRange[0])} — {formatCurrency(priceRange[1])}
                      <button
                        onClick={() => setPriceRange([0, MAX_PRICE])}
                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                  {selectedSizes.length > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold border border-primary/20">
                      📏 Size: {selectedSizes.join(', ')}
                      <button
                        onClick={() => setSelectedSizes([])}
                        className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Error state */}
            {error && !loading && (
              <div className="text-center py-16">
                <Package size={48} />
                <h3 className="font-display font-bold text-xl text-text-primary mb-2">
                  {t('products.failed_to_load')}
                </h3>
                <p className="text-text-muted text-sm mb-6">{t('products.something_wrong')}</p>
                <button
                  onClick={() => {
                    setPage(1);
                    setProducts([]);
                    setLoading(true);
                  }}
                  className="px-6 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  {t('products.retry')}
                </button>
              </div>
            )}

            {loading && page === 1 ? (
              <SectionProductsSkeleton />
            ) : (
              <ProductGrid products={products} loading={false} />
            )}

            {/* Infinite scroll sentinel */}
            {hasMoreRef.current && !loading && (
              <div ref={sentinelRef} className="flex justify-center py-10">
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <RefreshCw size={16} />
                  <span>{t('products.loading_more')}</span>
                </div>
              </div>
            )}

            {/* End of list */}
            {!hasMoreRef.current && products.length > 0 && !loading && (
              <div className="text-center py-10 border-t border-border mt-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-50 text-text-muted text-xs font-medium">
                  <Package size={14} />
                  {t('products.youve_seen_all', { count: total })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      <MobileFilterDrawer
        open={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        priceRange={priceRange}
        onPriceRangeChange={setPriceRange}
        selectedSizes={selectedSizes}
        onSizeToggle={handleSizeToggle}
        onApplyPrice={handleApplyPrice}
        onClearAll={clearFilters}
        activeCount={activeFiltersCount}
        total={total}
      />


    </div>
  );
}

/* ═══════════ SKELETON LOADING ═══════════ */

/* Variants for staggered entrance */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 },
  }),
};

function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

function SectionProductsSkeleton() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Hero Banner Skeleton */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden"
      >
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <motion.div className="mb-6" custom={0} variants={heroItemVariants}>
            <Skeleton className="!w-20 !h-3 !rounded-md !bg-white/10" />
          </motion.div>
          <div className="space-y-4 max-w-xl">
            <motion.div custom={1} variants={heroItemVariants}>
              <Skeleton className="!w-32 !h-5 !rounded-full !bg-white/10" />
            </motion.div>
            <motion.div custom={2} variants={heroItemVariants}>
              <Skeleton className="!w-full !h-12 md:!h-14 !rounded-lg !bg-white/10" />
            </motion.div>
            <motion.div custom={3} variants={heroItemVariants}>
              <Skeleton className="!w-72 !h-4 !rounded-md !bg-white/10" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        <motion.div className="mb-6" custom={4} variants={heroItemVariants}>
          <Skeleton className="!w-40 !h-4 !rounded-md" />
        </motion.div>
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6"
          variants={containerVariants}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={i}
              variants={cardVariants}
              className="bg-white rounded-2xl overflow-hidden border border-border"
            >
              <Skeleton className="!w-full !aspect-[3/4] !rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="!w-16 !h-3 !rounded-md" />
                <Skeleton className="!w-36 !h-4 !rounded-md" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="!w-12 !h-5 !rounded" />
                  <Skeleton className="!w-14 !h-3 !rounded-md" />
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

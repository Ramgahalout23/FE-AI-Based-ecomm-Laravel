import { Zap, X, Filter, Tag, ArrowRight, Package } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

import { useQuery } from '@tanstack/react-query';
import ProductCard from '../../components/product/ProductCard';
import SEOHead from '../../components/seo/SEOHead';
import { withStoreName } from '../../utils/seo';
import { CUSTOM_TEE_SLUG } from '../../utils/constants';
import FlashSaleCountdown from '../../components/storefront/FlashSaleCountdown';
import Breadcrumb from '../../components/common/Breadcrumb';
import { promotionsAPI } from '../../api/promotions';
import { categoriesAPI } from '../../api/categories';
import { useSettings } from '../../store/useSettings';
import { getImageUrl } from '../../utils/formatters';

/* ═══════════ PROMOTION HERO BANNER ═══════════ */
function PromotionHero({ promo }) {
  const { t } = useTranslation();
  if (!promo) return null;

  const imgUrl = promo.imageUrl || promo.image_url || promo.image;

  return (
    <section className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 mb-6 md:mb-8">
      {/* Animated background orbs */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-red-500/20 blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-amber-500/15 blur-[80px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
      </div>

      {imgUrl && (
        <img
          src={getImageUrl(imgUrl)}
          alt={promo.title}
          className="absolute inset-0 w-full h-full object-cover opacity-20"
          loading="lazy"
        />
      )}

      <div className="relative px-6 md:px-10 py-8 md:py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 bg-red-500/20 text-red-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                <Zap size={12} />
                {t('sales.flash_sale')}
              </span>
              {promo.discount && (
                <span className="inline-flex items-center gap-1 bg-amber-500/15 text-amber-400 text-[10px] font-bold px-3 py-1 rounded-full">
                  <Tag size={10} />
                  {t('sales.up_to_off', { percent: promo.discount })}
                </span>
              )}
            </div>
            <h1 className="text-white font-display text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] mb-3">
              {promo.title}
            </h1>
            {promo.description && (
              <p className="text-white/60 text-sm md:text-base leading-relaxed max-w-lg line-clamp-2">
                {promo.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 md:gap-6 shrink-0">
            {promo.endDate && (
              <FlashSaleCountdown
                endDate={promo.endDate}
                label={t('flash_sale.sale_ends_in')}
                className="text-white"
              />
            )}
            <button
              onClick={() => {
                const el = document.getElementById(`promo-${promo.id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="shrink-0 bg-red-600 hover:bg-red-500 text-white text-xs md:text-sm font-bold px-5 md:px-7 py-3 md:py-3.5 rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-red-500/25 active:scale-[0.97]"
            >
              {t('sales.shop_sale')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════ PROMOTION SECTION CARD ═══════════ */
function PromotionSection({ promo }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const products = (promo.products || []).filter(p => p.slug !== CUSTOM_TEE_SLUG);
  const categories = promo.categories || [];
  const imgUrl = promo.imageUrl || promo.image_url || promo.image;

  if (products.length === 0) return null;

  return (
    <div
      id={`promo-${promo.id}`}
      className="scroll-mt-24"
    >
      <div className="bg-white border border-border/60 rounded-xl md:rounded-2xl overflow-hidden mb-4 md:mb-6 transition-all duration-300 hover:shadow-md">
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Image thumbnail if available */}
              {imgUrl && (
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <img src={getImageUrl(imgUrl)} alt="" className="w-full h-full object-cover" loading="lazy" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-display font-bold text-base md:text-lg text-gray-900 tracking-tight">
                    {promo.title}
                  </h3>
                  {promo.discount && (
                    <span className="inline-flex items-center gap-1 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100">
                      <Tag size={9} />
                      {t('sales.percent_off', { percent: promo.discount })}
                    </span>
                  )}
                </div>
                {promo.description && (
                  <p className="text-xs md:text-sm text-gray-500 line-clamp-1">{promo.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {/* Category filter links */}
              {categories.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5">
                  {categories.slice(0, 2).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => navigate(`/products?category=${cat.slug}`)}
                      className="text-[10px] font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 hover:text-gray-700 px-2.5 py-1 rounded-full transition-colors"
                    >
                      {cat.name}
                    </button>
                  ))}
                  {categories.length > 2 && (
                    <span className="text-[10px] text-gray-400 font-medium">+{categories.length - 2}</span>
                  )}
                </div>
              )}

              {promo.endDate && (
                <FlashSaleCountdown
                  endDate={promo.endDate}
                  label=""
                  compact
                  className="text-gray-900"
                />
              )}
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="p-3 md:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
            {products.slice(0, 10).map((product, idx) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.35, delay: idx * 0.03, ease: 'easeOut' }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </div>

          {products.length > 10 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/products')}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 transition-colors"
              >
                {t('sales.view_all_products', { count: products.length })} <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ CATEGORY FILTER CHIPS ═══════════ */
function CategoryFilterChips({ categories, selected, onChange }) {
  const { t } = useTranslation();
  if (categories.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
      <button
        onClick={() => onChange('')}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all duration-200 whitespace-nowrap shrink-0 ${
          !selected
            ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
        }`}
      >
        <Zap size={13} />
        {t('sales.all_sales')}
      </button>
      {categories.map((cat) => (
        <button
          key={cat.slug || cat.id}
          onClick={() => onChange(cat.slug || cat.id)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold border transition-all duration-200 whitespace-nowrap shrink-0 ${
            selected === (cat.slug || cat.id)
              ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-800'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}

/* ═══════════ SKELETON LOADING ═══════════ */
function SalesPageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Hero skeleton */}
      <div className="rounded-2xl md:rounded-3xl bg-gray-100 h-48 md:h-56 mb-8 animate-pulse" />
      {/* Chips skeleton */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-24 rounded-full bg-gray-100 animate-pulse" />
        ))}
      </div>
      {/* Cards skeleton */}
      {[1, 2].map((i) => (
        <div key={i} className="bg-white border border-border/60 rounded-xl md:rounded-2xl overflow-hidden mb-6 animate-pulse">
          <div className="p-5 border-b border-border/40">
            <div className="h-5 w-48 bg-gray-100 rounded-md" />
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="bg-gray-50 rounded-xl aspect-[3/4]" />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════ SALES PAGE ═══════════ */
export default function SalesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState(searchParams.get('category') || '');

  // ── Fetch active promotions ──
  const { data: promotions = [], isLoading, error } = useQuery({
    queryKey: ['sales', 'promotions'],
    queryFn: async () => {
      const res = await promotionsAPI.getFlashSales();
      const data = res?.data?.data || [];
      return Array.isArray(data) ? data : [];
    },
    staleTime: 15000,
  });

  // ── Fetch categories for filter chips ──
  useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getAll()
      .then(res => res.data?.data?.categories || res.data?.data || []),
    staleTime: 5 * 60 * 1000,
  });

  // ── Sync URL param to state ──
  useEffect(() => {
    const cat = searchParams.get('category');
    setSelectedCategorySlug(cat || '');
  }, [searchParams]);

  // ── Derive all unique categories across all active promotions ──
  const promoCategories = useMemo(() => {
    const catMap = new Map();
    promotions.forEach((promo) => {
      (promo.categories || []).forEach((cat) => {
        if (!catMap.has(cat.slug || cat.id)) {
          catMap.set(cat.slug || cat.id, cat);
        }
      });
    });
    return Array.from(catMap.values());
  }, [promotions]);

  // ── Filter promotions by selected category ──
  const filteredPromotions = useMemo(() => {
    if (!selectedCategorySlug) return promotions;
    return promotions.filter((promo) => {
      const cats = promo.categories || [];
      return cats.some((cat) => (cat.slug || cat.id) === selectedCategorySlug);
    });
  }, [promotions, selectedCategorySlug]);

  // ── Promotions with products (non-empty) ──
  const activePromos = useMemo(
    () => filteredPromotions.filter((p) => (p.products || []).length > 0),
    [filteredPromotions]
  );

  // ── Hero: pick the first promotion ──
  const heroPromo = useMemo(() => {
    if (activePromos.length === 0) return promotions.find((p) => p.endDate) || promotions[0] || null;
    return activePromos[0];
  }, [activePromos, promotions]);

  const handleCategoryChange = (slug) => {
    setSelectedCategorySlug(slug);
    const params = new URLSearchParams(searchParams);
    if (slug) params.set('category', slug);
    else params.delete('category');
    setSearchParams(params, { replace: true });
  };

  const handleClearFilter = () => {
    setSelectedCategorySlug('');
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="page-content bg-white flex-1">
      <SEOHead
        title={withStoreName('Sales & Promotions — Deals & Discounts', storeName)}
        description={`Shop the best deals and flash sales at ${storeName}. Limited-time discounts on premium streetwear, oversized tees, hoodies and more.`}
        keywords="sales, promotions, flash sale, discounts, streetwear deals, limited time offers"
        canonicalUrl={`${window.location.origin}/sales`}
      />

      {/* Page Header */}
      <div className="bg-gradient-to-b from-gray-50 to-white border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-5 md:pt-8 md:pb-6">
          <Breadcrumb
            items={[
              { label: t('nav.home'), href: '/' },
              { label: t('sales.title') },
            ]}
            variant="light"
            className="mb-3"
          />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl md:text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-red-50 text-red-500">
                  <Tag size={20} />
                </span>
                {t('sales.deals_promotions')}
              </h1>
              <p className="text-gray-500 text-sm mt-1.5">
                {isLoading
                  ? t('sales.loading')
                  : promotions.length > 0
                  ? t('sales.active_promotions', { count: promotions.length, plural: promotions.length !== 1 ? 's' : '' })
                  : t('sales.no_active')}
              </p>
            </div>

            {/* Active filter tag */}
            {selectedCategorySlug && (
              <button
                onClick={handleClearFilter}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold hover:bg-gray-200 transition-colors shrink-0"
              >
                <X size={12} />
                {t('sales.clear_filter')}
              </button>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <SalesPageSkeleton />
      ) : error || promotions.length === 0 ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Tag size={28} />
            </div>
            <h2 className="font-display font-bold text-xl text-gray-900 mb-2">{t('sales.no_active')}</h2>
            <p className="text-gray-500 text-sm mb-6">{t('sales.no_active_desc')}</p>
            <button
              onClick={() => navigate('/products')}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              {t('sales.browse_products')} <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Category Filter Chips */}
          {promoCategories.length > 0 && (
            <div className="sticky top-16 z-20 bg-white/95 backdrop-blur-md border-b border-border/30 shadow-sm">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
                <div className="flex items-center gap-3">
                  <Filter size={14} />
                  <CategoryFilterChips
                    categories={promoCategories}
                    selected={selectedCategorySlug}
                    onChange={handleCategoryChange}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
            {/* Hero Promotion */}
            {!selectedCategorySlug && heroPromo && heroPromo.endDate && (
              <PromotionHero promo={heroPromo} />
            )}

            {/* Filtered count */}
            {selectedCategorySlug && (
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                <span className="font-semibold text-gray-900">{activePromos.length}</span>
                {t('sales.promotions_found', { s: activePromos.length !== 1 ? 's' : '' })}
                {promoCategories.find(c => (c.slug || c.id) === selectedCategorySlug) && (
                  <> {t('sales.in_category')} <strong className="text-gray-900">{promoCategories.find(c => (c.slug || c.id) === selectedCategorySlug)?.name}</strong></>
                )}
              </div>
            )}

            {/* Promotions List */}
            {activePromos.length > 0 ? (
              <div className="space-y-0">
                {activePromos.map((promo, idx) => (
                  <motion.div
                    key={promo.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: idx * 0.05, ease: 'easeOut' }}
                  >
                    <PromotionSection promo={promo} isActive={idx === 0} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <Package size={24} />
                </div>
                <h3 className="font-display font-bold text-lg text-gray-900 mb-1">{t('sales.no_promotions_category')}</h3>
                <p className="text-gray-500 text-sm mb-4">{t('sales.no_promotions_category_desc')}</p>
                <button
                  onClick={handleClearFilter}
                  className="inline-flex items-center gap-1.5 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-gray-800 transition-colors"
                >
                  {t('sales.view_all_sales')}
                </button>
              </div>
            )}

            {/* Bottom CTA */}
            {activePromos.length > 0 && (
              <div className="mt-8 md:mt-10 text-center py-6 border-t border-border/40">
                <p className="text-gray-500 text-sm mb-3">
                  {t('sales.products_on_sale', { count: activePromos.reduce((sum, p) => sum + (p.products || []).length, 0), promos: activePromos.length, plural: activePromos.length !== 1 ? 's' : '' })}
                </p>
                <button
                  onClick={() => navigate('/products')}
                  className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors"
                >
                  {t('sales.browse_all_products')} <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </>
      )}

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

import { ArrowLeft, ArrowRight, Package, Sparkles, Shirt } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import SEOHead from '../../components/seo/SEOHead';
import { withStoreName } from '../../utils/seo';
import Breadcrumb from '../../components/common/Breadcrumb';
import { useSettings } from '../../store/useSettings';
import ProductGrid from '../../components/product/ProductGrid';
import { curatedLooksAPI } from '../../api/curatedLooks';
import { getImageUrl, getResponsiveSrcSet } from '../../utils/formatters';

export default function CuratedLookPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug } = useParams();
  const { storeName } = useSettings();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['curated-look', slug],
    queryFn: () => curatedLooksAPI.getBySlug(slug),
    enabled: !!slug,
  });

  const look = data?.data?.data;
  const products = look?.products || [];

  const scrollToProducts = () => {
    document.getElementById('look-products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <>
      <SEOHead
        title={withStoreName(look ? `${look.name} — Curated Look` : 'Curated Look', storeName)}
        description={look?.description || `Shop the ${look?.name || 'curated'} look. Premium products at ${storeName}.`}
      />

      {/* ── Editorial hero — dark, gold-accented, matches section-page hero ── */}
      <section className="relative bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 overflow-hidden">
        {/* Gold + white glow orbs */}
        <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 rounded-full bg-white/[0.04] blur-2xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/2 w-40 h-40 rounded-full bg-gold/[0.06] blur-3xl pointer-events-none" />

        <div className="relative max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 md:pt-10 pb-10 md:pb-14">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-white/60 hover:text-gold-light text-xs font-semibold uppercase tracking-[0.14em] transition-colors mb-6 md:mb-8"
          >
            <ArrowLeft size={15} />
            {t('nav.back', 'Back')}
          </button>

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-10 h-10 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : isError || !look ? (
            <div className="py-20 text-center">
              <p className="text-white/60 text-lg">{t('products.section_not_found')}</p>
              <Link
                to="/products"
                className="mt-6 inline-flex items-center gap-2 px-7 py-3.5 bg-gold text-gray-950 rounded-full font-bold hover:bg-gold-light transition-colors"
              >
                {t('products.browse_all', 'Browse all products')}
              </Link>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[10fr_10fr] gap-8 md:gap-12 items-center max-w-5xl mx-auto">
              {/* Look image — framed, with floating badge */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <div className="absolute -inset-3 rounded-[2rem] bg-gradient-to-br from-gold/25 via-transparent to-transparent opacity-60 blur-sm" />
                <div className="relative overflow-hidden rounded-2xl md:rounded-[1.75rem] aspect-[4/5] md:aspect-[4/5] max-w-md mx-auto lg:max-w-[440px] ring-1 ring-white/10">
                  <img
                    src={getImageUrl(look.image_url)}
                    srcSet={getResponsiveSrcSet(look.image_url, [400, 600, 800, 1200])}
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    alt={look.name}
                    loading="eager"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-gold/40 text-gold-light text-[10px] font-bold uppercase tracking-[0.18em]">
                    <Sparkles size={12} />
                    {t('home.curated_looks')}
                  </span>
                  {/* Look index */}
                  <span className="absolute bottom-4 right-4 font-display text-4xl md:text-5xl font-extrabold text-white/15 leading-none select-none">
                    {String(look.display_order !== undefined ? Number(look.display_order) + 1 : '').padStart(2, '0')}
                  </span>
                </div>
              </motion.div>

              {/* Look copy */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="text-white"
              >
                <p className="inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.24em] text-gold-light mb-5">
                  <span className="w-10 h-px bg-gradient-to-r from-gold to-transparent" />
                  {t('home.style_inspiration')}
                </p>
                <h1 className="font-display font-extrabold tracking-tight text-3xl sm:text-4xl lg:text-5xl leading-[1.05]">
                  {look.name}
                </h1>
                {look.description && (
                  <p className="mt-4 text-white/60 text-sm md:text-[15px] max-w-lg leading-relaxed">
                    {look.description}
                  </p>
                )}

                {/* Compact meta line */}
                <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.16em] text-white/50 font-semibold">
                  <span className="inline-flex items-center gap-2">
                    <Shirt size={13} className="text-gold-light" />
                    {products.length} {products.length === 1 ? t('products.product') : t('products.products')}
                  </span>
                  <span className="hidden sm:block w-px h-3.5 bg-white/15" />
                  <span className="inline-flex items-center gap-2">
                    <Package size={13} className="text-gold-light" />
                    {t('products.complete_the_fit')}
                  </span>
                </div>

                {/* Slim CTA row */}
                <div className="mt-8 flex flex-wrap items-center gap-3.5">
                  <button
                    onClick={scrollToProducts}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-gray-950 rounded-full font-bold text-xs uppercase tracking-[0.14em] hover:bg-gold-light transition-all duration-300 active:scale-95 shadow-lg shadow-gold/20"
                  >
                    {t('products.shop_the_look', 'Shop the Look')}
                    <ArrowRight size={15} />
                  </button>
                  <Link
                    to="/products"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-white/20 text-white/80 text-xs font-semibold uppercase tracking-[0.14em] hover:border-gold/50 hover:text-gold-light transition-colors"
                  >
                    {t('products.browse_all', 'Browse all products')}
                  </Link>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </section>

      {/* ── Products — light section with editorial gold-rule heading ── */}
      <section id="look-products" className="bg-[#fafafa]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
          <Breadcrumb
            items={[
              { label: t('nav.home'), href: '/' },
              { label: t('home.curated_looks'), href: '/products' },
              { label: look?.name || '' },
            ]}
            variant="light"
            className="mb-8"
          />

          {/* Editorial heading matching SectionHeading */}
          <div className="mb-8 md:mb-12">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-gray-200 pb-5">
              <div>
                <p className="flex items-center gap-2.5 text-[10px] md:text-[11px] font-bold uppercase tracking-[0.22em] text-gray-400 mb-2.5">
                  <span className="w-8 h-px bg-gold" />
                  {t('products.shop_the_look', 'Shop the Look')}
                </p>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-display font-extrabold tracking-tight text-gray-900 leading-[1.1]">
                  {look?.name || t('home.curated_looks')}
                </h2>
                <p className="mt-2.5 text-sm md:text-[15px] leading-relaxed text-gray-500 max-w-xl">
                  {t('products.look_products_desc', 'Every piece featured in this curated look.')}
                </p>
              </div>
              {!isLoading && products.length > 0 && (
                <p className="hidden md:block text-xs font-semibold uppercase tracking-wider text-gray-400 shrink-0 pb-1">
                  {products.length} {products.length === 1 ? t('products.product') : t('products.products')}
                </p>
              )}
            </div>
          </div>

          {isLoading ? (
            <ProductGrid loading />
          ) : products.length > 0 ? (
            <ProductGrid
              products={products}
              loading={false}
              className="!grid-cols-2 !gap-3 sm:!gap-4 md:!grid-cols-3 md:!gap-5 2xl:!grid-cols-4"
            />
          ) : (
            <div className="text-center py-16 border border-dashed border-gray-300 rounded-2xl bg-white">
              <p className="text-gray-500 text-sm">{t('products.no_products_found')}</p>
              <Link
                to="/products"
                className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full font-semibold hover:bg-gray-800 transition-colors"
              >
                {t('products.browse_all', 'Browse all products')}
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

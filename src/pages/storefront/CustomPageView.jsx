import { ArrowLeft, ArrowRight, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEOHead from '../../components/seo/SEOHead';
import ContentPageHero, { buildHeroCtas } from '../../components/storefront/ContentPageHero';
import ContentMarquee from '../../components/storefront/ContentMarquee';
import ContentProse from '../../components/storefront/ContentProse';
import ContentCtaCard from '../../components/storefront/ContentCtaCard';
import ContentBlocks from '../../components/storefront/ContentBlocks';
import { useSettings } from '../../store/useSettings';
import { formatDate } from '../../utils/formatters';
import { pagesAPI } from '../../api/pages';
import { seoAPI } from '../../api/seo';
import PageContentSkeleton from '../../components/ui/PageContentSkeleton';

/* ── Brand design tokens ── */
const INK = '#1a1a1a';
const PAPER = '#ffffff';
const THREAD = '#4a4a5a';
const displayFont = { fontFamily: 'var(--font-display)', fontWeight: 800 };

export default function CustomPageView() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const contactEmail = getSetting('contactEmail', 'support@threvolt.com');
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pageSeo, setPageSeo] = useState(null);

  useEffect(() => {
    if (!slug) return;
    const fetchPage = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await pagesAPI.getBySlug(slug);
        const pageData = res?.data?.data || res?.data || null;
        if (!pageData) {
          setError(t('page_view.not_found'));
        } else {
          setPage(pageData);

          // Fetch per-page SEO metadata
          try {
            const seoRes = await seoAPI.getEntitySEO('page', pageData.id);
            const seo = seoRes?.data?.data;
            if (seo?.metaTitle || seo?.metaDescription) {
              setPageSeo(seo);
            }
          } catch { /* no custom SEO — use defaults */ }
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError(t('page_view.not_found'));
        } else {
          setError(t('page_view.not_found_desc'));
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [slug, t]);

  if (loading) {
    return <PageContentSkeleton withBreadcrumb={false} />;
  }

  if (error || !page) {
    return (
      <div className="page-content bg-white flex-1 flex flex-col items-center justify-center min-h-[50vh] px-4">
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(165deg, #141416, #000000)', color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, boxShadow: '0 18px 44px rgba(0,0,0,0.25)' }}>
          <FileText size={30} strokeWidth={1.6} />
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 38px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 12px', ...displayFont }}>
          {t('page_view.not_found')}
        </h1>
        <p style={{ fontSize: 15.5, lineHeight: 1.7, color: THREAD, margin: '0 0 28px', textAlign: 'center' }}>
          {error || t('page_view.not_found_desc')}
        </p>
        <Link
          to="/"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: INK, color: PAPER, textDecoration: 'none', borderRadius: 999, padding: '14px 30px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#000'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = INK; }}
        >
          <ArrowLeft size={15} /> {t('page_view.back_home')}
        </Link>
      </div>
    );
  }

  // Watermark word: first meaningful word of the title, uppercased
  const watermark = (page.title || '').split(/\s+/)[0]?.toUpperCase() || 'INFO';
  const lastUpdated = page.updatedAt || page.updated_at || page.lastUpdated;

  // AdvancedPageEditor stores its sections as base64 JSON inside <div class="page-sections">…</div>
  const blocks = parseBlocks(page.content);

  return (
    <div className="page-content bg-white flex-1">
      {/* SEO meta tags for custom page */}
      <SEOHead
        title={pageSeo?.metaTitle || `${page.title} | ${storeName}`}
        description={pageSeo?.metaDescription || page.metaDescription || ''}
        keywords={pageSeo?.metaKeywords || ''}
        image={pageSeo?.ogImage || ''}
        canonicalUrl={pageSeo?.canonicalUrl || `${window.location.origin}/pages/${page.slug}`}
      />

      {/* ── HERO (About / Contact style: watermark + eyebrow + dual CTAs) ── */}
      <ContentPageHero
        watermark={watermark}
        eyebrow={t('page_view.eyebrow', { defaultValue: 'Our Policies & Info' })}
        title={page.title}
        description={page.subtitle || t('page_view.hero_desc', { defaultValue: 'Everything you need to know, in one place.' })}
        breadcrumb={[
          { label: t('nav.home', { defaultValue: 'Home' }), href: '/' },
          { label: page.title },
        ]}
        badge={
          lastUpdated ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '9px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>
              {t('page_view.last_updated', { date: formatDate(lastUpdated), defaultValue: `Last updated: ${formatDate(lastUpdated)}` })}
            </span>
          ) : null
        }
        ctas={buildHeroCtas(page.settings?.hero, {
          primary: { label: t('page_view.hero_cta_primary', { defaultValue: 'Explore Collection' }) },
          secondary: { label: t('page_view.hero_cta_secondary', { defaultValue: 'Contact Us' }) },
        })}
      />

      {/* ── MARQUEE (plain prose pages only — block pages carry their own sections) ── */}
      {(!blocks || blocks.length === 0) && (
        <ContentMarquee
          items={[
            t('page_view.marquee_1', { defaultValue: 'Read Carefully' }),
            t('page_view.marquee_2', { defaultValue: 'Stay Informed' }),
            t('page_view.marquee_3', { defaultValue: "We're Here to Help" }),
          ]}
        />
      )}

      {/* ── CONTENT ── */}
      {blocks && blocks.length > 0 ? (
        <ContentBlocks blocks={blocks} storeName={storeName} />
      ) : (
        <section style={{ maxWidth: 860, margin: '0 auto', padding: '84px 24px 64px' }}>
          <ContentProse html={page.content || ''} />
        </section>
      )}

      {/* ── CTA (plain prose pages only) ── */}
      {(!blocks || blocks.length === 0) && (
      <ContentCtaCard
        title={t('page_view.cta_title', { defaultValue: 'Questions About This Page?' })}
        description={t('page_view.cta_desc', { defaultValue: 'Reach out to our team — we usually reply within 24 hours.' })}
      >
        <a
          href={`mailto:${contactEmail}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: PAPER, color: INK, textDecoration: 'none', borderRadius: 999, padding: '15px 36px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 10px 28px rgba(0,0,0,0.35)', transition: 'all 0.2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f2f2'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = PAPER; e.currentTarget.style.transform = 'none'; }}
        >
          {t('contact.cta_button', { defaultValue: 'Email Us' })} <ArrowRight size={16} />
        </a>
      </ContentCtaCard>
      )}
    </div>
  );
}

/**
 * Extract AdvancedPageEditor section blocks from stored HTML.
 * The editor embeds its sections as base64 JSON inside:
 *   <div class="page-sections">BASE64</div>
 * Returns the parsed block array, or null when the content is plain HTML.
 */
function parseBlocks(content) {
  if (!content || typeof content !== 'string') return null;
  try {
    const match = content.match(/<div class="page-sections">([\s\S]*?)<\/div>/);
    if (!match) return null;
    const blocks = JSON.parse(decodeURIComponent(escape(atob(match[1]))));
    return Array.isArray(blocks) ? blocks : null;
  } catch {
    return null;
  }
}

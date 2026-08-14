import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw, Truck, BadgeCheck, ShieldCheck } from 'lucide-react';
import SEOHead from '../../components/seo/SEOHead';
import ContentPageHero from '../../components/storefront/ContentPageHero';
import ContentMarquee from '../../components/storefront/ContentMarquee';
import ContentProse from '../../components/storefront/ContentProse';
import ContentCtaCard from '../../components/storefront/ContentCtaCard';
import { useSettings } from '../../store/useSettings';
import { pagesAPI } from '../../api/pages';
import PageContentSkeleton from '../../components/ui/PageContentSkeleton';
import { formatDate } from '../../utils/formatters';

/* ── Brand design tokens ── */
const INK = '#1a1a1a';
const PAPER = '#ffffff';
const THREAD = '#4a4a5a';
const STONE = '#8a8a9a';
const displayFont = { fontFamily: 'var(--font-display)', fontWeight: 800 };

export default function ReturnPolicyPage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const contactEmail = getSetting('contactEmail', 'support@threvolt.com');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const res = await pagesAPI.getBySlug('return-policy');
        const page = res.data?.data || null;
        if (page && page.content) {
          setContent(page);
        } else {
          setError(t('return_policy.content_not_found'));
        }
      } catch (err) {
        console.error('Failed to load return policy:', err);
        setError(t('return_policy.content_not_found'));
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [t]);

  if (loading) {
    return <PageContentSkeleton />;
  }

  if (error || !content) {
    return (
      <div className="page-content bg-white">
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '96px 24px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(165deg, #141416, #000000)', color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 18px 44px rgba(0,0,0,0.25)' }}>
            <ShieldCheck size={30} strokeWidth={1.6} />
          </div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 38px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 12px', ...displayFont }}>
            {t('return_policy.page_not_available')}
          </h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.7, color: THREAD, margin: '0 0 28px' }}>
            {error || t('return_policy.content_not_found')}
          </p>
          <Link
            to="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: INK, color: PAPER, textDecoration: 'none', borderRadius: 999, padding: '14px 30px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#000'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = INK; }}
          >
            {t('return_policy.go_home')} <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  const title = content.title || t('return_policy.eyebrow', { defaultValue: 'Return & Exchange Policy' });

  const trustItems = [
    { icon: RefreshCw, label: t('return_policy.trust_days', { defaultValue: 'Easy 7-Day Returns' }) },
    { icon: Truck, label: t('return_policy.trust_pickup', { defaultValue: 'Free Pickup' }) },
    { icon: BadgeCheck, label: t('return_policy.trust_refund', { defaultValue: 'Full Refunds' }) },
  ];

  const lastUpdated = content.updatedAt || content.updated_at || content.lastUpdated;

  return (
    <div className="page-content bg-white">
      <SEOHead
        title={`${title} | ${storeName}`}
        description={content.metaDescription || `Learn about ${storeName} return and exchange policy. Easy returns within 7 days, free pickup, and full refunds on eligible items.`}
      />

      {/* ── HERO ── */}
      <ContentPageHero
        watermark={t('return_policy.watermark', { defaultValue: 'RETURNS' })}
        eyebrow={t('return_policy.eyebrow', { defaultValue: 'Return & Exchange Policy' })}
        title={title}
        description={t('return_policy.hero_desc', { store: storeName, defaultValue: `Easy, hassle-free returns and exchanges on every ${storeName} order.` })}
        breadcrumb={[
          { label: t('nav.home', { defaultValue: 'Home' }), href: '/' },
          { label: title },
        ]}
        badge={
          lastUpdated ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '9px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>
              {t('return_policy.last_updated', { date: formatDate(lastUpdated), defaultValue: `Last updated: ${formatDate(lastUpdated)}` })}
            </span>
          ) : null
        }
      />

      {/* ── MARQUEE ── */}
      <ContentMarquee
        items={[
          t('return_policy.marquee_1', { defaultValue: 'Easy 7-Day Returns' }),
          t('return_policy.marquee_2', { defaultValue: 'Free Pickup Across India' }),
          t('return_policy.marquee_3', { defaultValue: 'Full Refund on Eligible Items' }),
        ]}
      />

      {/* ── TRUST STRIP ── */}
      <div style={{ background: INK, padding: '0 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap', padding: '26px 0' }}>
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: i > 0 ? 32 : 0, borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.12)' : 'none' }}>
                <Icon size={16} strokeWidth={1.8} style={{ color: 'rgba(255,255,255,0.55)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '84px 24px 64px' }}>
        {content.content ? (
          <ContentProse html={content.content} />
        ) : (
          <p style={{ fontSize: 15.5, lineHeight: 1.85, color: THREAD, margin: 0 }}>
            {t('return_policy.no_content')}
          </p>
        )}

        {/* Quick help links */}
        <div style={{ marginTop: 56, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {[
            { label: t('contact.faq', { defaultValue: 'FAQs & Support' }), to: '/support' },
            { label: t('contact.shipping_info', { defaultValue: 'Track Your Order' }), to: '/track-order' },
            { label: t('contact.size_guide', { defaultValue: 'Shop the Collection' }), to: '/products' },
          ].map((q, i) => (
            <Link
              key={i}
              to={q.to}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: PAPER, border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '16px 18px', textDecoration: 'none', boxShadow: '0 1px 4px rgba(0,0,0,0.04)', transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 26px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = INK; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)'; }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 600, color: INK }}>{q.label}</span>
              <ArrowRight size={15} style={{ color: STONE, flexShrink: 0 }} />
            </Link>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <ContentCtaCard
        title={t('return_policy.cta_title', { defaultValue: 'Still Have Questions?' })}
        description={t('return_policy.cta_desc', { defaultValue: 'Our support team is here to help with returns, exchanges, and refunds — we usually reply within 24 hours.' })}
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
    </div>
  );
}

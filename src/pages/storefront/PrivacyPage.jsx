import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText, Lock, ShieldCheck } from 'lucide-react';
import SEOHead from '../../components/seo/SEOHead';
import { withStoreName } from '../../utils/seo';
import Breadcrumb from '../../components/common/Breadcrumb';
import ContentProse from '../../components/storefront/ContentProse';
import { useSettings } from '../../store/useSettings';
import { pagesAPI } from '../../api/pages';
import PageContentSkeleton from '../../components/ui/PageContentSkeleton';

/* ── Brand design tokens (matches tailwind.config.js / tokens.css) ── */
const INK = '#1a1a1a';
const PAPER = '#ffffff';
const THREAD = '#4a4a5a';
const displayFont = { fontFamily: 'var(--font-display)', fontWeight: 800 };

export default function PrivacyPage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const res = await pagesAPI.getBySlug('privacy-policy');
        const page = res.data?.data || null;
        if (page && page.content) {
          setContent(page);
        } else {
          setError(t('privacy.content_not_found'));
        }
      } catch (err) {
        console.error('Failed to load privacy policy:', err);
        setError(t('privacy.content_not_found'));
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
            {t('privacy.page_not_available')}
          </h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.7, color: THREAD, margin: '0 0 28px' }}>
            {error || t('privacy.content_not_found')}
          </p>
          <Link
            to="/"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: INK, color: PAPER, textDecoration: 'none', borderRadius: 999, padding: '14px 30px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', boxShadow: '0 8px 24px rgba(0,0,0,0.25)', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#000'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = INK; }}
          >
            {t('privacy.go_home')} <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    );
  }

  const trustItems = [
    { icon: Lock, title: t('privacy.trust_encrypted') },
    { icon: ShieldCheck, title: t('privacy.trust_never_sold') },
    { icon: FileText, title: t('privacy.trust_rights') },
  ];

  return (
    <div className="page-content bg-white">
      <style>{`
        .privacy-hero-mark { animation: privacy-rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes privacy-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 560px) {
          .privacy-trust { gap: 10px !important; }
        }
      `}</style>

      <SEOHead
        title={withStoreName(content?.title ? content.title : 'Privacy Policy', storeName)}
        description={content?.metaDescription || `Learn how ${storeName} collects, uses, and protects your personal information. Our privacy policy outlines our commitment to your data security.`}
        canonicalUrl={`${window.location.origin}/privacy-policy`}
      />

      {/* ── HERO ── */}
      <header style={{ background: 'linear-gradient(165deg, #141416 0%, #000000 100%)', color: PAPER, padding: '96px 24px 84px', position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
        {/* Decorative watermark */}
        <div aria-hidden style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: 'clamp(100px, 20vw, 300px)', fontWeight: 800, color: 'rgba(255,255,255,0.035)', letterSpacing: '-0.04em', whiteSpace: 'nowrap', pointerEvents: 'none', ...displayFont }}>
          PRIVACY
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto' }}>
          <Breadcrumb
            items={[
              { label: t('nav.home', { defaultValue: 'Home' }), href: '/' },
              { label: content?.title || t('privacy.eyebrow', { defaultValue: 'Privacy Policy' }) },
            ]}
            variant="dark"
            className="justify-center mb-6"
          />
          <div style={{ fontSize: 11, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 700, marginBottom: 18 }}>
            {t('privacy.eyebrow', { defaultValue: 'Privacy Policy' })}
          </div>
          <h1 className="privacy-hero-mark" style={{ fontSize: 'clamp(44px, 6.5vw, 72px)', lineHeight: 1.02, letterSpacing: '-0.03em', margin: '0 0 20px', ...displayFont }}>
            {content?.title || t('privacy.eyebrow', { defaultValue: 'Privacy Policy' })}
          </h1>
          <p style={{ fontSize: 16.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', maxWidth: 560, margin: '0 auto 26px' }}>
            {t('privacy.hero_desc', { store: storeName, defaultValue: `How ${storeName} collects, uses, and protects your data.` })}
          </p>
          {content?.lastUpdated && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '9px 18px', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>
              {t('privacy.last_updated', { date: content.lastUpdated, defaultValue: `Last updated: ${content.lastUpdated}` })}
            </span>
          )}
        </div>
      </header>

      {/* ── TRUST STRIP ── */}
      <div style={{ background: INK, padding: '0 24px' }}>
        <div className="privacy-trust" style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, flexWrap: 'wrap', padding: '26px 0' }}>
          {trustItems.map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: i > 0 ? 32 : 0, borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.12)' : 'none' }}>
                <Icon size={16} strokeWidth={1.8} style={{ color: 'rgba(255,255,255,0.55)' }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>{item.title}</span>
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
            {t('privacy.no_content')}
          </p>
        )}
      </section>

      {/* ── CTA ── */}
      <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 96px' }}>
        <div style={{ background: 'linear-gradient(165deg, #1a1a1a, #0c0c0e)', borderRadius: 24, padding: '64px 32px', color: PAPER, position: 'relative', overflow: 'hidden', textAlign: 'center', boxShadow: '0 24px 60px rgba(0,0,0,0.25)' }}>
          <div aria-hidden style={{ position: 'absolute', inset: 14, border: '1px dashed rgba(255,255,255,0.18)', borderRadius: 18, pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 12px', ...displayFont }}>
              {t('privacy.cta_title')}
            </h2>
            <p style={{ fontSize: 15.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.65)', maxWidth: 480, margin: '0 auto 32px' }}>
              {t('privacy.cta_desc')}
            </p>
            <Link
              to="/contact"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: PAPER, color: INK, textDecoration: 'none', borderRadius: 999, padding: '15px 36px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', boxShadow: '0 10px 28px rgba(0,0,0,0.35)', transition: 'all 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f2f2'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = PAPER; e.currentTarget.style.transform = 'none'; }}
            >
              {t('privacy.cta_button')} <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

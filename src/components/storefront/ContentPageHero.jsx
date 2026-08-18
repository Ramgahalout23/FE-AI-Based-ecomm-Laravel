import Breadcrumb from '../common/Breadcrumb';

/* Brand design tokens (matches tailwind.config.js / tokens.css) */
const INK = '#1a1a1a';
const PAPER = '#ffffff';
const displayFont = { fontFamily: 'var(--font-display)', fontWeight: 800 };

/**
 * Build the hero CTA list from per-page settings.
 *
 * `hero` comes from `page.settings.hero` and looks like:
 *   { primary: { label, href, enabled }, secondary: { label, href, enabled } }
 *
 * Rules:
 *  - a CTA with `enabled === false` is hidden entirely
 *  - empty label / href falls back to the provided default
 *  - when `hero` is absent, both defaults are used (legacy pages keep CTAs)
 *
 * `defaults` is an optional { primary: {label, href}, secondary: {label, href} }
 * used to localize the fallback labels (the storefront passes translated text).
 */
export function buildHeroCtas(hero, defaults = {}) {
  const defs = {
    primary: { label: 'Explore Collection', href: '/products', ...(defaults.primary || {}) },
    secondary: { label: 'Contact Us', href: '/contact', secondary: true, ...(defaults.secondary || {}) },
  };
  return ['primary', 'secondary']
    .map((key) => {
      const cfg = hero?.[key];
      if (cfg && cfg.enabled === false) return null;
      const def = defs[key];
      return {
        ...def,
        ...(cfg ? { label: cfg.label || def.label, href: cfg.href || def.href } : {}),
      };
    })
    .filter(Boolean);
}

/**
 * Shared dark hero for content pages (Privacy, Return Policy, CMS pages…).
 * Watermark + breadcrumb + eyebrow + display title + optional dual CTAs,
 * matching the About / Contact hero so every content page feels like one
 * family.
 *
 * `ctas` is an array of { label, href, secondary? } — the primary CTA is a
 * white pill, secondary is an outlined pill (same pattern as About/Contact).
 */
export default function ContentPageHero({ watermark, eyebrow, title, description, breadcrumb, badge, ctas }) {
  return (
    <header
      style={{
        background: 'linear-gradient(165deg, #141416 0%, #000000 100%)',
        color: PAPER,
        padding: '56px 20px 48px',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}
      className="content-page-hero"
    >
      {/* Decorative watermark */}
      <div
        aria-hidden
        className="content-page-watermark"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(110px, 22vw, 320px)',
          fontWeight: 800,
          color: 'rgba(255,255,255,0.035)',
          letterSpacing: '-0.04em',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          ...displayFont,
        }}
      >
        {watermark}
      </div>
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 820, margin: '0 auto' }}>
        <Breadcrumb items={breadcrumb} variant="dark" className="justify-center mb-6" />
        <div style={{ fontSize: 11, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 700, marginBottom: 12 }}>
          {eyebrow}
        </div>
        <h1
          className="content-hero-mark"
          style={{ fontSize: 'clamp(36px, 7vw, 78px)', lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 16px', ...displayFont }}
        >
          {title}
        </h1>
        {description && (
          <p style={{ fontSize: 17, lineHeight: 1.7, color: 'rgba(255,255,255,0.72)', maxWidth: 560, margin: '0 auto 30px' }}>
            {description}
          </p>
        )}
        {badge && <div style={{ marginBottom: ctas && ctas.length ? 26 : 0 }}>{badge}</div>}
        {ctas && ctas.length > 0 && (
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {ctas.map((cta, i) =>
              cta.secondary ? (
                <a
                  key={i}
                  href={cta.href || '#'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: PAPER, textDecoration: 'none', borderRadius: 999, padding: '14px 30px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(255,255,255,0.35)', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {cta.label}
                </a>
              ) : (
                <a
                  key={i}
                  href={cta.href || '#'}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: PAPER, color: INK, textDecoration: 'none', borderRadius: 999, padding: '14px 30px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', boxShadow: '0 8px 24px rgba(0,0,0,0.35)', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#f2f2f2'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = PAPER; }}
                >
                  {cta.label}
                </a>
              )
            )}
          </div>
        )}
      </div>
      <style>{`
        .content-hero-mark { animation: content-rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes content-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .content-page-hero { padding: 48px 20px 40px; }
        .content-page-watermark { display: none; }
        @media (min-width: 768px) {
          .content-page-hero { padding: 96px 24px 84px; }
          .content-page-watermark { display: block; }
        }
      `}</style>
    </header>
  );
}

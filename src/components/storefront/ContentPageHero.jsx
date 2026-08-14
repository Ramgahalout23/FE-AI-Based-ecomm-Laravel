import Breadcrumb from '../common/Breadcrumb';

/* Brand design tokens (matches tailwind.config.js / tokens.css) */
const PAPER = '#ffffff';
const displayFont = { fontFamily: 'var(--font-display)', fontWeight: 800 };

/**
 * Shared dark hero for content pages (Privacy, Return Policy, CMS pages…).
 * Watermark + breadcrumb + eyebrow + display title, matching the
 * About / Contact hero so every content page feels like one family.
 */
export default function ContentPageHero({ watermark, eyebrow, title, description, breadcrumb, badge }) {
  return (
    <header
      style={{
        background: 'linear-gradient(165deg, #141416 0%, #000000 100%)',
        color: PAPER,
        padding: '96px 24px 84px',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      {/* Decorative watermark */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: 'clamp(100px, 20vw, 300px)',
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
        <div style={{ fontSize: 11, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', fontWeight: 700, marginBottom: 18 }}>
          {eyebrow}
        </div>
        <h1
          className="content-hero-mark"
          style={{ fontSize: 'clamp(44px, 6.5vw, 72px)', lineHeight: 1.02, letterSpacing: '-0.03em', margin: '0 0 20px', ...displayFont }}
        >
          {title}
        </h1>
        {description && (
          <p style={{ fontSize: 16.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.7)', maxWidth: 560, margin: '0 auto 26px' }}>
            {description}
          </p>
        )}
        {badge}
      </div>
      <style>{`
        .content-hero-mark { animation: content-rise 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        @keyframes content-rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </header>
  );
}

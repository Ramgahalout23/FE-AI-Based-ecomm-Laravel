const PAPER = '#ffffff';
const displayFont = { fontFamily: 'var(--font-display)', fontWeight: 800 };

/**
 * Shared dark CTA card (dashed border + big heading + optional action
 * children) used to close out content pages with a next step.
 */
export default function ContentCtaCard({ title, description, children }) {
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 96px' }}>
      <div
        style={{
          background: 'linear-gradient(165deg, #1a1a1a, #0c0c0e)',
          borderRadius: 24,
          padding: '64px 32px',
          color: PAPER,
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div aria-hidden style={{ position: 'absolute', inset: 14, border: '1px dashed rgba(255,255,255,0.18)', borderRadius: 18, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 12px', ...displayFont }}>
            {title}
          </h2>
          {description && (
            <p style={{ fontSize: 15.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.65)', maxWidth: 480, margin: '0 auto 32px' }}>
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}

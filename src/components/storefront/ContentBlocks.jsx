import { useState } from 'react';
import ContentProse from './ContentProse';

/* ── Brand design tokens (match ContentPageHero / tailwind) ── */
const INK = '#1a1a1a';
const PAPER = '#ffffff';
const THREAD = '#4a4a5a';
const STONE = '#8a8a9a';
const ACCENT = '#ff6b35';
const DARK_BG = 'linear-gradient(165deg, #141416 0%, #000000 100%)';
const displayFont = { fontFamily: 'var(--font-display)', fontWeight: 800 };

const GRID_CSS = `
  .cb-grid { display: grid; grid-template-columns: 1fr; gap: 22px; }
  @media (min-width: 640px) { .cb-grid-2 { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 768px) { .cb-grid-3 { grid-template-columns: repeat(3, 1fr); } .cb-grid-4 { grid-template-columns: repeat(4, 1fr); } }
  .cb-two-col { display: grid; grid-template-columns: 1fr; gap: 32px; align-items: center; }
  @media (min-width: 768px) { .cb-two-col { grid-template-columns: 1fr 1fr; gap: 56px; } }
  .cb-card { background: ${PAPER}; border-radius: 16px; box-shadow: 0 2px 14px rgba(0,0,0,0.06); border: 1px solid rgba(26,26,26,0.06); }
`;

/* ── Helpers ── */
function padFor(styles) {
  const p = styles?.padding;
  const v = p === 'small' ? 56 : p === 'large' ? 120 : 84;
  return `${v}px 22px`;
}

function isDark(color) {
  if (!color) return true;
  const m = color.replace('#', '');
  if (m.length !== 6) return false;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

function parseJsonArray(value) {
  try { return JSON.parse(value || '[]'); } catch { return []; }
}

function getEmbedUrl(url) {
  if (!url) return '';
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/|vimeo\.com\/)([a-zA-Z0-9_-]+)/);
  if (match) {
    const id = match[1];
    return url.includes('vimeo') ? `https://player.vimeo.com/video/${id}` : `https://www.youtube.com/embed/${id}`;
  }
  return url;
}

function SectionHeading({ title, dark, align = 'center' }) {
  if (!title) return null;
  return (
    <h2
      style={{
        fontSize: 'clamp(26px, 4vw, 40px)',
        lineHeight: 1.15,
        letterSpacing: '-0.02em',
        margin: '0 0 12px',
        color: dark ? PAPER : INK,
        textAlign: align,
        ...displayFont,
      }}
    >
      {title}
    </h2>
  );
}

function SectionShell({ block, dark, children, extra = {} }) {
  const bg = block._styles?.bgColor;
  return (
    <section
      style={{
        padding: padFor(block._styles),
        background: dark ? (bg || DARK_BG) : (bg || PAPER),
        color: dark ? PAPER : INK,
        ...extra,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>{children}</div>
    </section>
  );
}

/* ── Individual block renderers ── */
function HeroBlock({ block }) {
  const dark = isDark(block._styles?.bgColor);
  const bgImage = block.image;
  const hasCta = block.cta_text;
  return (
    <section
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: padFor(block._styles),
        textAlign: 'center',
        background: bgImage
          ? `linear-gradient(rgba(10,10,12,0.72), rgba(10,10,12,0.72)), url('${bgImage}') center/cover no-repeat`
          : dark ? (block._styles?.bgColor || DARK_BG) : (block._styles?.bgColor || PAPER),
        color: dark ? PAPER : INK,
      }}
    >
      {!bgImage && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 'clamp(90px, 18vw, 260px)',
            fontWeight: 800,
            color: dark ? 'rgba(255,255,255,0.04)' : 'rgba(26,26,26,0.04)',
            letterSpacing: '-0.04em',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            ...displayFont,
          }}
        >
          {(block.title || 'HERO').split(/\s+/)[0]?.toUpperCase()}
        </div>
      )}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto' }}>
        {block.title && (
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 18px', ...displayFont }}>
            {block.title}
          </h1>
        )}
        {block.subtitle && (
          <p style={{ fontSize: 16.5, lineHeight: 1.7, color: dark ? 'rgba(255,255,255,0.72)' : THREAD, maxWidth: 560, margin: '0 auto 30px' }}>
            {block.subtitle}
          </p>
        )}
        {hasCta && (
          <a
            href={block.cta_link || '#'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: ACCENT,
              color: PAPER,
              textDecoration: 'none',
              borderRadius: 999,
              padding: '15px 38px',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              boxShadow: '0 10px 28px rgba(255,107,53,0.35)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}
          >
            {block.cta_text}
          </a>
        )}
      </div>
    </section>
  );
}

function ContentBlock({ block }) {
  if (!block.title && !block.content) return null;
  return (
    <SectionShell block={block} dark={false}>
      <SectionHeading title={block.title} />
      {block.content && (
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <ContentProse html={block.content} />
        </div>
      )}
    </SectionShell>
  );
}

function TwoColumnBlock({ block }) {
  if (!block.title && !block.leftContent && !block.rightContent && !block.image) return null;
  const right = block.image ? (
    <div style={{ borderRadius: 18, overflow: 'hidden', boxShadow: '0 14px 44px rgba(0,0,0,0.12)' }}>
      <img loading="lazy" src={block.image} alt="" style={{ width: '100%', height: 'auto', display: 'block' }} />
    </div>
  ) : block.rightContent ? (
    <ContentProse html={block.rightContent} />
  ) : null;
  return (
    <SectionShell block={block} dark={false}>
      <SectionHeading title={block.title} />
      {right ? (
        <div className="cb-two-col">
          <div><ContentProse html={block.leftContent || ''} /></div>
          {right}
        </div>
      ) : (
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <ContentProse html={block.leftContent || ''} />
        </div>
      )}
    </SectionShell>
  );
}

function FeaturesBlock({ block }) {
  const features = (block.features || '').split('\n').map((f) => f.trim()).filter(Boolean);
  if (!block.title && features.length === 0) return null;
  return (
    <SectionShell block={block} dark={false}>
      <SectionHeading title={block.title} />
      {block.subtitle && (
        <p style={{ fontSize: 16, lineHeight: 1.7, color: STONE, textAlign: 'center', maxWidth: 520, margin: '0 auto 40px' }}>
          {block.subtitle}
        </p>
      )}
      <div className="cb-grid cb-grid-2 cb-grid-3">
        {features.map((f, i) => (
          <div
            key={i}
            className="cb-card"
            style={{ padding: '30px 26px', borderTop: `3px solid ${ACCENT}` }}
          >
            <div style={{ fontSize: 26, marginBottom: 14 }}>✨</div>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0, color: INK, letterSpacing: '-0.01em' }}>{f}</h3>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function StatsBlock({ block }) {
  const stats = parseJsonArray(block.stats);
  if (!block.title && stats.length === 0) return null;
  return (
    <SectionShell block={block} dark>
      <SectionHeading title={block.title} dark />
      <div className="cb-grid cb-grid-2 cb-grid-4" style={{ gap: 36 }}>
        {stats.map((s, i) => (
          <div key={i} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(34px, 5vw, 52px)', lineHeight: 1.1, margin: '0 0 8px', color: ACCENT, ...displayFont }}>
              {s.number || '0'}
            </div>
            <div style={{ fontSize: 13.5, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.66)', fontWeight: 600 }}>
              {s.label || ''}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function TeamBlock({ block }) {
  const members = parseJsonArray(block.members);
  if (!block.title && members.length === 0) return null;
  return (
    <SectionShell block={block} dark={false}>
      <SectionHeading title={block.title} />
      {block.description && (
        <p style={{ fontSize: 16, lineHeight: 1.7, color: STONE, textAlign: 'center', maxWidth: 520, margin: '0 auto 40px' }}>
          {block.description}
        </p>
      )}
      <div className="cb-grid cb-grid-2 cb-grid-3">
        {members.map((m, i) => (
          <div key={i} className="cb-card" style={{ overflow: 'hidden' }}>
            {m.image ? (
              <img loading="lazy" src={m.image} alt={m.name || 'Team member'} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', aspectRatio: '1/1', background: 'linear-gradient(165deg, #f4f4f6, #e8e8ee)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 52 }}>👤</div>
            )}
            <div style={{ padding: '22px 24px' }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: INK }}>{m.name || 'Team Member'}</h3>
              <p style={{ fontSize: 13, color: STONE, margin: '6px 0 0', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {m.role || 'Position'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function GalleryBlock({ block }) {
  const images = (block.images || '').split('\n').map((s) => s.trim()).filter(Boolean);
  if (!block.title && images.length === 0) return null;
  return (
    <SectionShell block={block} dark={false}>
      <SectionHeading title={block.title} />
      <div className="cb-grid cb-grid-2 cb-grid-3">
        {images.map((img, i) => (
          <div key={i} style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.1)' }}>
            <img loading="lazy" src={img} alt={`Gallery ${i + 1}`} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block' }} />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function TestimonialsBlock({ block }) {
  const items = parseJsonArray(block.testimonials);
  if (!block.title && items.length === 0) return null;
  return (
    <SectionShell block={block} dark={false}>
      <SectionHeading title={block.title} />
      <div className="cb-grid cb-grid-2 cb-grid-3">
        {items.map((t, i) => (
          <div key={i} className="cb-card" style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ color: '#f59e0b', fontSize: 15, marginBottom: 14, letterSpacing: 2 }}>
              {'★'.repeat(Math.min(5, t.rating || 5))}
            </div>
            <p style={{ fontSize: 15.5, lineHeight: 1.7, color: THREAD, margin: '0 0 20px', flex: 1 }}>
              &ldquo;{t.text || 'Great experience!'}&rdquo;
            </p>
            <div style={{ fontWeight: 700, color: INK, fontSize: 14 }}>— {t.author || 'Customer'}</div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function VideoBlock({ block }) {
  const src = getEmbedUrl(block.videoUrl);
  if (!block.title && !src) return null;
  return (
    <SectionShell block={block} dark={false}>
      <SectionHeading title={block.title} />
      {block.description && (
        <p style={{ fontSize: 16, lineHeight: 1.7, color: STONE, textAlign: 'center', maxWidth: 520, margin: '0 auto 36px' }}>
          {block.description}
        </p>
      )}
      {src && (
        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 18, boxShadow: '0 14px 44px rgba(0,0,0,0.14)' }}>
          <iframe
            title={block.title || 'Video'}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            src={src}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </SectionShell>
  );
}

function NewsletterBlock({ block }) {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  return (
    <SectionShell block={block} dark>
      <div style={{ maxWidth: 560, margin: '0 auto', textAlign: 'center' }}>
        <SectionHeading title={block.title || 'Subscribe to Our Newsletter'} dark />
        {block.description && (
          <p style={{ fontSize: 16, lineHeight: 1.7, color: 'rgba(255,255,255,0.72)', margin: '0 0 32px' }}>
            {block.description}
          </p>
        )}
        {done ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, padding: '14px 30px', fontWeight: 600, fontSize: 14 }}>
            ✓ Thanks for subscribing!
          </div>
        ) : (
          <form
            style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
            onSubmit={(e) => { e.preventDefault(); if (email.trim()) setDone(true); }}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={block.placeholder || 'Enter your email'}
              style={{
                flex: 1,
                minWidth: 200,
                padding: '15px 20px',
                border: 'none',
                borderRadius: 999,
                fontSize: 14.5,
                background: PAPER,
                color: INK,
                outline: 'none',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '15px 32px',
                background: ACCENT,
                color: PAPER,
                border: 'none',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 10px 28px rgba(255,107,53,0.35)',
              }}
            >
              {block.button_text || 'Subscribe'}
            </button>
          </form>
        )}
      </div>
    </SectionShell>
  );
}

function PricingBlock({ block }) {
  const plans = parseJsonArray(block.plans);
  if (!block.title && plans.length === 0) return null;
  return (
    <SectionShell block={block} dark={false}>
      <SectionHeading title={block.title} />
      <div className="cb-grid cb-grid-2 cb-grid-3">
        {plans.map((plan, i) => (
          <div
            key={i}
            className="cb-card"
            style={{ padding: '36px 30px', borderTop: `4px solid ${i === 1 ? ACCENT : INK}` }}
          >
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 14px', color: INK }}>{plan.name || 'Plan'}</h3>
            <div style={{ fontSize: 40, fontWeight: 800, margin: '0 0 6px', color: INK, ...displayFont }}>
              {plan.price ? `₹${plan.price}` : '₹0'}
              <span style={{ fontSize: 14, color: STONE, fontWeight: 600 }}>/mo</span>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0 30px' }}>
              {(plan.features || []).map((f, fi) => (
                <li key={fi} style={{ padding: '8px 0', color: THREAD, fontSize: 14.5, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ color: ACCENT, fontWeight: 800 }}>✓</span> {f}
                </li>
              ))}
            </ul>
            <button
              style={{
                width: '100%',
                padding: '13px',
                background: INK,
                color: PAPER,
                border: 'none',
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Get Started
            </button>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

function CtaBlock({ block }) {
  if (!block.title && !block.description && !block.button_text) return null;
  return (
    <SectionShell block={block} dark>
      <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
        <SectionHeading title={block.title} dark />
        {block.description && (
          <p style={{ fontSize: 16.5, lineHeight: 1.7, color: 'rgba(255,255,255,0.72)', margin: '0 0 32px' }}>
            {block.description}
          </p>
        )}
        {block.button_text && (
          <a
            href={block.button_link || '#'}
            style={{
              display: 'inline-block',
              background: ACCENT,
              color: PAPER,
              textDecoration: 'none',
              padding: '15px 44px',
              borderRadius: 999,
              fontWeight: 700,
              fontSize: 12,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              boxShadow: '0 10px 28px rgba(255,107,53,0.35)',
            }}
          >
            {block.button_text}
          </a>
        )}
      </div>
    </SectionShell>
  );
}

function FaqBlock({ block }) {
  const faqs = parseJsonArray(block.faqs);
  if (!block.title && faqs.length === 0) return null;
  return (
    <SectionShell block={block} dark={false}>
      <SectionHeading title={block.title} />
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {faqs.map((f, i) => (
          <details
            key={i}
            style={{
              marginBottom: 14,
              border: '1px solid rgba(26,26,26,0.08)',
              borderRadius: 14,
              background: '#fafafa',
              overflow: 'hidden',
            }}
          >
            <summary
              style={{
                cursor: 'pointer',
                padding: '18px 22px',
                fontWeight: 700,
                fontSize: 15.5,
                color: INK,
                listStyle: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
              }}
            >
              {f.q || 'Question'}
              <span style={{ color: ACCENT, fontSize: 18, flexShrink: 0 }}>+</span>
            </summary>
            <p style={{ margin: 0, padding: '0 22px 20px', color: THREAD, lineHeight: 1.7, fontSize: 14.5 }}>
              {f.a || 'Answer'}
            </p>
          </details>
        ))}
      </div>
    </SectionShell>
  );
}

/* ── Dispatcher ── */
const RENDERERS = {
  hero: HeroBlock,
  content: ContentBlock,
  twoColumn: TwoColumnBlock,
  features: FeaturesBlock,
  stats: StatsBlock,
  team: TeamBlock,
  gallery: GalleryBlock,
  testimonials: TestimonialsBlock,
  video: VideoBlock,
  newsletter: NewsletterBlock,
  pricing: PricingBlock,
  cta: CtaBlock,
  faq: FaqBlock,
};

export default function ContentBlocks({ blocks, storeName }) {
  const name = storeName || 'THREVOLT';
  // Interpolate leftover template placeholders (e.g. `' . $storeName . '` from
  // older seed content) with the live store name.
  const interpolate = (v) => (typeof v === 'string' ? v.replace(/' \. \$storeName \. '/g, name).replace(/\$storeName/g, name) : v);
  const clean = (blocks || []).map((block) => {
    if (!block || typeof block !== 'object') return block;
    const next = {};
    Object.entries(block).forEach(([k, v]) => { next[k] = interpolate(v); });
    return next;
  });
  return (
    <>
      <style>{GRID_CSS}</style>
      {clean.map((block, i) => {
        const Renderer = RENDERERS[block?.type];
        return Renderer ? <Renderer key={block.id || i} block={block} /> : null;
      })}
    </>
  );
}

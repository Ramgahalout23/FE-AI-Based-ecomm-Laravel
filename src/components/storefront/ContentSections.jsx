import { useState } from 'react';
import { ChevronDown, Clock, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/* ── Brand design tokens (match ContentPageHero / tailwind) ── */
const INK = '#1a1a1a';
const PAPER = '#ffffff';
const THREAD = '#4a4a5a';
const STONE = '#8a8a9a';
const DARK_BG = 'linear-gradient(165deg, #141416, #000000)';
const displayFont = { fontFamily: 'var(--font-display)', fontWeight: 800 };

const cardBase = {
  background: PAPER,
  border: '1px solid rgba(0,0,0,0.07)',
  borderRadius: 18,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
};
const cardHoverEnter = (e) => {
  e.currentTarget.style.transform = 'translateY(-4px)';
  e.currentTarget.style.boxShadow = '0 14px 36px rgba(0,0,0,0.1)';
  e.currentTarget.style.borderColor = INK;
};
const cardHoverLeave = (e) => {
  e.currentTarget.style.transform = 'none';
  e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
  e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)';
};

/** Centered (or left) eyebrow + display heading — the standard content-page section header. */
export function ContentSectionHeader({ eyebrow, title, align = 'center', dark = false, style = {} }) {
  return (
    <div style={{ textAlign: align, marginBottom: 48, ...style }}>
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 14,
          color: dark ? 'rgba(255,255,255,0.5)' : STONE,
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          fontSize: 'clamp(28px, 4vw, 40px)',
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          margin: 0,
          color: dark ? PAPER : INK,
          ...displayFont,
        }}
      >
        {title}
      </h2>
    </div>
  );
}

/** Icon feature card — dark icon chip + title + description, hover lift. */
export function ContentFeatureCard({ icon: Icon, title, desc, footer, dark = false }) {
  return (
    <div
      style={{ ...cardBase, padding: '30px 24px', display: 'flex', flexDirection: 'column', background: dark ? 'rgba(255,255,255,0.04)' : PAPER, border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.07)', boxShadow: dark ? 'none' : cardBase.boxShadow }}
      onMouseEnter={dark ? (e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.transform = 'translateY(-3px)'; } : cardHoverEnter}
      onMouseLeave={dark ? (e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'none'; } : cardHoverLeave}
    >
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 13,
          background: dark ? 'rgba(255,255,255,0.1)' : INK,
          border: dark ? '1px solid rgba(255,255,255,0.15)' : 'none',
          color: dark ? 'rgba(255,255,255,0.85)' : PAPER,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        <Icon size={20} strokeWidth={1.8} />
      </div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: dark ? PAPER : INK, margin: '0 0 8px' }}>{title}</h3>
      <p style={{ fontSize: 13, lineHeight: 1.65, color: dark ? 'rgba(255,255,255,0.55)' : STONE, margin: '0 0 16px', flex: 1 }}>{desc}</p>
      {footer}
    </div>
  );
}

/** Responsive grid of feature cards with a shared header. */
export function ContentFeatureGrid({ eyebrow, title, items, dark = false, minWidth = 280, gap = 20, sectionStyle = {} }) {
  return (
    <section style={{ maxWidth: 1200, margin: '0 auto', padding: '84px 24px 28px', ...sectionStyle }}>
      <ContentSectionHeader eyebrow={eyebrow} title={title} dark={dark} />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`, gap }}>
        {items.map((item, i) => (
          <ContentFeatureCard key={i} {...item} dark={dark} />
        ))}
      </div>
    </section>
  );
}

/** Dark numbered-steps section (order journey / process). */
export function ContentDarkSteps({ eyebrow, title, steps }) {
  return (
    <section style={{ background: DARK_BG, color: PAPER, padding: '84px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <ContentSectionHeader eyebrow={eyebrow} title={title} dark />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24 }}>
          {steps.map((s, i) => (
            <div
              key={i}
              style={{ borderTop: '1px solid rgba(255,255,255,0.18)', padding: '20px 8px 6px 0', borderRadius: 8, transition: 'background 0.25s ease, transform 0.25s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.25em', color: 'rgba(255,255,255,0.35)' }}>{s.num}</div>
              <div style={{ fontSize: 18, fontWeight: 700, margin: '12px 0 8px', fontFamily: 'var(--font-display)' }}>{s.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.55)' }}>{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Light FAQ card list (static answers, no accordion). */
export function ContentFaqList({ eyebrow, title, faqs, note = null, noteIcon: NoteIcon = null }) {
  return (
    <section style={{ maxWidth: 860, margin: '0 auto', padding: '84px 24px 64px' }}>
      <ContentSectionHeader eyebrow={eyebrow} title={title} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {faqs.map((f, i) => (
          <div key={i} style={{ background: '#fafafa', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 16, padding: '22px 24px' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: INK, margin: '0 0 8px' }}>{f.q}</p>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: THREAD, margin: 0 }}>{f.a}</p>
          </div>
        ))}
      </div>
      {note && (
        <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {NoteIcon && <NoteIcon size={16} style={{ color: STONE }} />}
          <span style={{ fontSize: 12.5, color: STONE }}>{note}</span>
        </div>
      )}
    </section>
  );
}

/** Size table with dark header + zebra rows. */
export function ContentSizeTable({ title, subtitle, columns, rows, note }) {
  return (
    <div style={{ marginBottom: 48 }}>
      <h3 style={{ fontSize: 20, fontWeight: 700, color: INK, margin: '0 0 6px', fontFamily: 'var(--font-display)' }}>{title}</h3>
      {subtitle && <p style={{ fontSize: 13.5, color: STONE, margin: '0 0 18px' }}>{subtitle}</p>}
      <div style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520, background: PAPER }}>
          <thead>
            <tr style={{ background: INK }}>
              {columns.map((c, i) => (
                <th key={i} style={{ padding: '14px 18px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? PAPER : '#fafafa', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <td style={{ padding: '14px 18px', fontSize: 14, fontWeight: 700, color: INK }}>{row.size}</td>
                {Object.keys(row).filter((k) => k !== 'size').map((k, j) => (
                  <td key={j} style={{ padding: '14px 18px', fontSize: 13.5, color: THREAD }}>{row[k]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p style={{ fontSize: 12, color: STONE, marginTop: 10 }}>{note}</p>}
    </div>
  );
}

/** Inline help strip: icon + title + desc + CTA link. */
export function ContentHelpStrip({ icon: Icon, title, desc, ctaLabel, ctaTo = '/contact', ctaExternal = null }) {
  return (
    <section style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 24px 72px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: '#fafafa', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 18, padding: '22px 26px', flexWrap: 'wrap' }}>
        <div style={{ width: 44, height: 44, borderRadius: 13, background: INK, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: INK, margin: '0 0 3px' }}>{title}</p>
          <p style={{ fontSize: 13, color: STONE, margin: 0 }}>{desc}</p>
        </div>
        {ctaExternal ? (
          <a
            href={ctaExternal}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: INK, color: PAPER, textDecoration: 'none', borderRadius: 999, padding: '12px 24px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#000'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = INK; }}
          >
            {ctaLabel}
          </a>
        ) : (
          <Link
            to={ctaTo}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: INK, color: PAPER, textDecoration: 'none', borderRadius: 999, padding: '12px 24px', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#000'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = INK; }}
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </section>
  );
}

/* ── Accordion ─────────────────────────────────── */

function AccordionItem({ q, a, isOpen, onToggle }) {
  return (
    <div style={{ background: PAPER, border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, overflow: 'hidden', transition: 'border-color 0.2s ease' }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '17px 20px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontSize: 14.5, fontWeight: 600, color: INK, flex: 1 }}>{q}</span>
        <ChevronDown size={17} style={{ color: STONE, flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
      </button>
      {isOpen && (
        <div style={{ padding: '0 20px 17px' }}>
          <p style={{ fontSize: 14, lineHeight: 1.7, color: THREAD, margin: 0 }}>{a}</p>
        </div>
      )}
    </div>
  );
}

/** FAQ accordion with optional live search across all Q&As. */
export function ContentFaqAccordion({ groups, placeholder }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);

  const allFaqs = groups.flatMap((g) => g.faqs.map((f) => ({ ...f, group: g.label })));
  const filtered = query.trim()
    ? allFaqs.filter((f) => (f.q + ' ' + f.a).toLowerCase().includes(query.trim().toLowerCase()))
    : null;

  const toggle = (key) => setOpen((cur) => (cur === key ? null : key));

  return (
    <>
      {/* Search */}
      <section style={{ maxWidth: 860, margin: '0 auto', padding: '72px 24px 16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', color: STONE }} />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(null); }}
            placeholder={placeholder || t('faq.search_placeholder', { defaultValue: 'Search questions…' })}
            style={{ width: '100%', padding: '16px 18px 16px 48px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: 14, fontSize: 14.5, outline: 'none', background: PAPER, transition: 'border-color 0.2s ease, box-shadow 0.2s ease' }}
            onFocus={(e) => { e.currentTarget.style.borderColor = INK; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,26,26,0.06)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>
      </section>

      <section style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px 72px' }}>
        {filtered ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 12.5, color: STONE, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              {t('faq.results_count', { count: filtered.length, defaultValue: '{{count}} results' })}
            </p>
            {filtered.map((f, i) => (
              <AccordionItem key={i} q={f.q} a={f.a} isOpen={open === 'search-' + i} onToggle={() => toggle('search-' + i)} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {groups.map((g, gi) => {
              const Icon = g.icon;
              return (
                <div key={gi}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <span style={{ width: 40, height: 40, borderRadius: 12, background: INK, color: PAPER, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={18} strokeWidth={1.8} />
                    </span>
                    <h2 style={{ fontSize: 19, fontWeight: 700, color: INK, margin: 0, fontFamily: 'var(--font-display)' }}>{g.label}</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {g.faqs.map((f, fi) => {
                      const key = gi + '-' + fi;
                      return <AccordionItem key={fi} q={f.q} a={f.a} isOpen={open === key} onToggle={() => toggle(key)} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

/** Small meta line (icon + label) used inside cards, e.g. delivery time. */
export function ContentMeta({ icon: Icon, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: THREAD }}>
      <Icon size={13} /> {children}
    </span>
  );
}

export { Clock, displayFont };

/**
 * Shared scrolling marquee strip used under content-page heroes.
 * `items` is an array of phrases; they are joined with ✦ and looped.
 */
export default function ContentMarquee({ items }) {
  const line = (Array.isArray(items) ? items : []).join(' ✦ ');
  if (!line) return null;

  return (
    <div style={{ background: '#1a1a1a', overflow: 'hidden', padding: '16px 0' }}>
      <div className="content-marquee" style={{ display: 'flex', width: 'max-content' }}>
        {[0, 1].map((k) => (
          <span
            key={k}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 48,
              paddingRight: 48,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.55)',
              whiteSpace: 'nowrap',
            }}
          >
            {line}
            {line}
          </span>
        ))}
      </div>
      <style>{`
        .content-marquee { animation: content-marquee 26s linear infinite; }
        @keyframes content-marquee { to { transform: translateX(-50%); } }
      `}</style>
    </div>
  );
}

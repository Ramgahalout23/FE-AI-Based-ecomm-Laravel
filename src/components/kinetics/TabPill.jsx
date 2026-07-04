import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * TabPill — a segmented tab control where a pill glides between tabs.
 *
 * @param {Array} tabs - Array of { value, label } or strings.
 * @param {string} active - Currently active value.
 * @param {function} onChange - Called with the new value.
 * @param {'underline'|'pill'} variant - Visual style. Default 'underline'.
 */
export default function TabPill({
  tabs,
  active,
  onChange,
  variant = 'underline',
  className = '',
}) {
  const [pillStyle, setPillStyle] = useState({});
  const tabRefs = useRef({});
  const containerRef = useRef(null);

  const updatePill = useCallback(() => {
    const el = tabRefs.current[active];
    if (!el || !containerRef.current) return;

    if (variant === 'pill') {
      setPillStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
        height: el.offsetHeight,
        top: el.offsetTop,
        borderRadius: '8px',
        background: 'rgba(26, 26, 26, 0.08)',
        position: 'absolute',
        zIndex: 0,
        transition:
          'left 0.4s cubic-bezier(0.65, 0, 0.35, 1), width 0.4s cubic-bezier(0.65, 0, 0.35, 1), top 0.4s cubic-bezier(0.65, 0, 0.35, 1), height 0.4s cubic-bezier(0.65, 0, 0.35, 1)',
      });
    } else {
      setPillStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [active, variant]);

  useEffect(() => {
    updatePill();
  }, [updatePill]);

  // Recalculate on resize
  useEffect(() => {
    const handleResize = () => updatePill();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updatePill]);

  const items = tabs.map((t) => (typeof t === 'string' ? { value: t, label: t } : t));

  return (
    <div
      ref={containerRef}
      className={`relative flex ${className}`}
      style={{ gap: 0, position: 'relative' }}
    >
      {/* Gliding pill/underline */}
      {variant === 'underline' && (
        <span className="kinetics-tab-pill" style={pillStyle} />
      )}

      {variant === 'pill' && <span style={pillStyle} />}

      {/* Tab buttons */}
      {items.map((tab) => (
        <button
          key={tab.value}
          ref={(el) => (tabRefs.current[tab.value] = el)}
          onClick={() => onChange(tab.value)}
          className={`kinetics-tab-btn ${active === tab.value ? 'active' : ''}`}
          style={{
            position: 'relative',
            zIndex: 1,
            padding: variant === 'pill' ? '8px 16px' : '10px 20px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: active === tab.value ? 700 : 500,
            color: active === tab.value ? '#1a1a1a' : '#8a8a9a',
            whiteSpace: 'nowrap',
            transition: 'color 0.3s ease',
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

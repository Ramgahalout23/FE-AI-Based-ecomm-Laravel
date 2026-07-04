import { useState, useCallback } from 'react';

/**
 * LikeBurst — toggles a heart icon with scale-pop and particle burst.
 *
 * @param {boolean} liked - Current like state.
 * @param {function} onToggle - Called with new state.
 * @param {number} count - Like count display.
 * @param {string} size - 'sm' | 'md' | 'lg'. Default 'md'.
 */
export default function LikeBurst({
  liked = false,
  onToggle,
  count,
  size = 'md',
  className = '',
  ...props
}) {
  const [particles, setParticles] = useState([]);
  const [popping, setPopping] = useState(false);

  const sizes = {
    sm: { icon: 16, particle: 4, count: '0.75rem' },
    md: { icon: 20, particle: 5, count: '0.85rem' },
    lg: { icon: 28, particle: 7, count: '1rem' },
  };

  const s = sizes[size] || sizes.md;

  const handleToggle = useCallback((e) => {
    e.stopPropagation();
    const next = !liked;

    // Spawn particles on like (not unlike)
    if (next) {
      const newParticles = Array.from({ length: 8 }, (_, i) => {
        const angle = (Math.PI * 2 * i) / 8;
        const dist = 24 + Math.random() * 16;
        return {
          id: Date.now() + i,
          tx: Math.cos(angle) * dist,
          ty: Math.sin(angle) * dist,
          color: ['#ff6b6b', '#ff8a00', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b6b', '#c084fc', '#f472b6'][i],
        };
      });
      setParticles(newParticles);
      setTimeout(() => setParticles([]), 600);
      setPopping(true);
      setTimeout(() => setPopping(false), 400);
    }

    if (onToggle) onToggle(next);
  }, [liked, onToggle]);

  // Extract consumed props to avoid passing them to the DOM
  const { style: externalStyle, ...rest } = props;

  return (
    <span className={className} style={{ display: 'inline-block', position: 'relative', ...externalStyle }} {...rest}>
      <button
        onClick={handleToggle}
        className="inline-flex items-center gap-1.5"
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px',
          color: liked ? '#ef4444' : '#8a8a9a',
          transition: 'color 0.2s ease',
        }}
        aria-label={liked ? 'Unlike' : 'Like'}
      >
        {/* Heart icon */}
        <svg
          width={s.icon}
          height={s.icon}
          viewBox="0 0 24 24"
          fill={liked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={popping ? 'kinetics-heart-pop' : ''}
          style={{ transition: 'transform 0.3s ease' }}
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>

        {/* Count */}
        {count !== undefined && (
          <span style={{ fontSize: s.count, fontWeight: 600, lineHeight: 1 }}>
            {count}
          </span>
        )}

        {/* Burst particles */}
        {particles.map((p) => (
          <span
            key={p.id}
            className="kinetics-burst-particle kinetics-like-burst"
            style={{
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              background: p.color,
            }}
          />
        ))}
      </button>
    </span>
  );
}

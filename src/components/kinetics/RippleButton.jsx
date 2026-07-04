import { useState, useCallback, useRef } from 'react';

/**
 * RippleButton — adds a radial ripple burst at the click point.
 * Wraps any button/clickable with the ripple effect.
 * Supports dark ripples for light-colored buttons.
 */
export default function RippleButton({
  children,
  onClick,
  dark = false,
  className = '',
  disabled = false,
  as = 'button',
  ...props
}) {
  const [ripples, setRipples] = useState([]);
  const ref = useRef(null);

  const handleClick = useCallback((e) => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = (e.clientX || e.touches?.[0]?.clientX || rect.left + rect.width / 2) - rect.left - size / 2;
    const y = (e.clientY || e.touches?.[0]?.clientY || rect.top + rect.height / 2) - rect.top - size / 2;
    const id = Date.now() + Math.random();

    setRipples((prev) => [...prev, { id, size, x, y }]);
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 650);

    if (onClick) onClick(e);
  }, [onClick]);

  const Tag = as;

  return (
    <Tag
      ref={ref}
      onClick={handleClick}
      disabled={disabled}
      className={`kinetics-ripple-btn ${className}`}
      {...props}
    >
      {children}
      {ripples.map((r) => (
        <span
          key={r.id}
          className={`kinetics-ripple ${dark ? 'kinetics-ripple-dark' : ''}`}
          style={{
            width: r.size,
            height: r.size,
            left: r.x,
            top: r.y,
          }}
        />
      ))}
    </Tag>
  );
}

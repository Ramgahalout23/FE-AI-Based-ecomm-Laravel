import { useState, useEffect, useRef } from 'react';

/**
 * CounterBump — displays a number that bumps elastically on each change.
 *
 * @param {number} value - The number to display.
 * @param {function} onClick - Optional click handler.
 * @param {string} className
 */
export default function CounterBump({
  value = 0,
  onClick,
  className = '',
  ...props
}) {
  const [bump, setBump] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current !== value) {
      setBump(true);
      const timer = setTimeout(() => setBump(false), 400);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <span
      onClick={onClick}
      className={`kinetics-counter-bump ${bump ? 'bump' : ''} ${className}`}
      {...props}
    >
      {value}
    </span>
  );
}

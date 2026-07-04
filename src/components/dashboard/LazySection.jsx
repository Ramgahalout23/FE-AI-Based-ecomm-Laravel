import { useState, useEffect, useRef } from 'react';

/**
 * LazySection — defers rendering of children until the element is scrolled into view.
 *
 * Shows a skeleton placeholder (matching the section's approximate height) while
 * the section is offscreen, so the page loads faster by avoiding expensive
 * recharts rendering for below-the-fold charts.
 *
 * Props:
 *   children       — The content to render when in view
 *   height         — Approximate height of the placeholder in px (default 350)
 *   className      — Optional wrapper className
 *   rootMargin     — IntersectionObserver margin (default '200px' = preload 200px before visible)
 *   placeholder    — Optional custom placeholder element; defaults to a shimmer skeleton
 *   onVisible      — Optional callback fired when the section becomes visible
 */
export default function LazySection({
  children,
  height = 350,
  className = '',
  rootMargin = '200px',
  placeholder,
  onVisible,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Check if already in view (e.g. on large screens)
    if (el.getBoundingClientRect().top < window.innerHeight + 200) {
      setIsVisible(true);
      setHasRendered(true);
      onVisible?.();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasRendered(true);
          onVisible?.();
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(el);

    return () => observer.disconnect();
  }, [rootMargin, onVisible]);

  // Once rendered, keep rendering even if scrolled back up
  if (hasRendered) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight: height, position: 'relative' }}
    >
      {isVisible ? (
        <div className={className}>{children}</div>
      ) : (
        placeholder || (
          <div
            className="skeleton rounded-2xl"
            style={{
              width: '100%',
              height: height,
              borderRadius: '16px',
            }}
          />
        )
      )}
    </div>
  );
}

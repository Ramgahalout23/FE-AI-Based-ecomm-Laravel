import { useRef, useCallback, useState } from 'react';

/**
 * MagneticWrapper — wraps children in a container that pulls them
 * toward the cursor with a magnetic feel.
 *
 * @param {number} pull - How much pull (0.2–0.5). Default 0.35.
 * @param {number} radius - Detection radius in px. Default 80.
 */
export default function MagneticWrapper({
  children,
  pull = 0.35,
  radius = 80,
  className = '',
  style,
  as = 'span',
  ...props
}) {
  const ref = useRef(null);
  const [transform, setTransform] = useState('');
  const [isHovered, setIsHovered] = useState(false);

  const handleMove = useCallback((e) => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Distance from cursor to center
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius) {
      setTransform(`translate(${dx * pull}px, ${dy * pull}px)`);
    }
  }, [pull, radius]);

  const handleLeave = useCallback(() => {
    setTransform('');
    setIsHovered(false);
  }, []);

  const handleEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const Tag = as;

  return (
    <Tag
      ref={ref}
      onMouseMove={isHovered ? handleMove : undefined}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className={`kinetics-magnetic ${className}`}
      style={{ display: 'inline-block', ...style }}
      {...props}
    >
      <span
        style={{
          display: 'inline-block',
          transform,
          transition: transform ? 'none' : 'transform 0.15s ease-out',
        }}
      >
        {children}
      </span>
    </Tag>
  );
}

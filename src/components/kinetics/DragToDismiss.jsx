import { useState, useRef, useCallback } from 'react';

/**
 * DragToDismiss — wraps children in a horizontally draggable container.
 * Drag past the threshold to dismiss, otherwise it springs back.
 *
 * @param {number} threshold - px past which it dismisses. Default 100.
 * @param {function} onDismiss - callback when dismissed.
 * @param {boolean} disabled - disable dragging.
 */
export default function DragToDismiss({
  children,
  threshold = 100,
  onDismiss,
  disabled = false,
  className = '',
  style,
  ...props
}) {
  const [x, setX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startRef = useRef(0);
  const currentRef = useRef(0);

  const handleDown = useCallback((e) => {
    if (disabled) return;
    setDragging(true);
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    startRef.current = clientX;
    currentRef.current = 0;
  }, [disabled]);

  const handleMove = useCallback((e) => {
    if (!dragging || disabled) return;
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const delta = clientX - startRef.current;
    currentRef.current = delta;
    setX(delta);
  }, [dragging, disabled]);

  const handleUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);

    if (Math.abs(currentRef.current) > threshold) {
      const direction = currentRef.current > 0 ? 1 : -1;
      setX(direction * window.innerWidth * 1.5);
      setTimeout(() => {
        if (onDismiss) onDismiss();
      }, 300);
    } else {
      setX(0);
    }
  }, [dragging, threshold, onDismiss]);

  return (
    <div
      onMouseDown={handleDown}
      onMouseMove={handleMove}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
      onTouchStart={handleDown}
      onTouchMove={handleMove}
      onTouchEnd={handleUp}
      className={`kinetics-drag-card ${className}`}
      style={{
        transform: `translateX(${x}px) rotate(${x * 0.03}deg)`,
        opacity: Math.max(1 - Math.abs(x) / (threshold * 2.5), 0.3),
        transition: dragging ? 'none' : `transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)`,
        cursor: disabled ? 'default' : 'grab',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

import { useState, useRef, useCallback, useEffect, memo } from 'react';

export default memo(function ZoomableImage({ src, alt, isActive = true }) {
  const [isZooming, setIsZooming] = useState(false);
  const [isTouchZoomed, setIsTouchZoomed] = useState(false);
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const rafRef = useRef(null);
  const [canHover, setCanHover] = useState(null);

  /* ── Determine if device supports hover (i.e. desktop/laptop) ── */
  useEffect(() => {
    const matches = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    setCanHover(matches);
  }, []);

  /* ── Ultra-performant cursor tracking — no React re-renders ── */
  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current || !overlayRef.current || !isActive) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      /* Direct DOM update — skips React entirely */
      overlayRef.current.style.setProperty('--zoom-x', `${Math.min(100, Math.max(0, x))}%`);
      overlayRef.current.style.setProperty('--zoom-y', `${Math.min(100, Math.max(0, y))}%`);
    });
  }, [isActive]);

  const handleMouseEnter = useCallback(() => {
    if (!isActive) return;
    setIsZooming(true);
    /* Reset position to center on enter */
    if (overlayRef.current) {
      overlayRef.current.style.setProperty('--zoom-x', '50%');
      overlayRef.current.style.setProperty('--zoom-y', '50%');
    }
  }, [isActive]);

  const handleMouseLeave = useCallback(() => {
    setIsZooming(false);
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  /* ── Click-to-toggle zoom for touch/mobile ── */
  const handleClick = useCallback(() => {
    if (!isActive) return;
    setIsTouchZoomed((prev) => !prev);
  }, [isActive]);

  /* ── Reset touch zoom on scroll ── */
  useEffect(() => {
    if (!isTouchZoomed) return;
    const onScroll = () => setIsTouchZoomed(false);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isTouchZoomed]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-white group ${
        isActive && canHover === true ? 'cursor-none' : ''
      } ${isActive && canHover === false ? 'cursor-zoom-in' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      {/* Base image */}
      <img loading="lazy" src={src}
        alt={alt}
        className="w-full h-full object-contain p-2 select-none pointer-events-none"
        draggable={false}
      />

      {/* ── Desktop: Zoom hint icon (fades in on hover) ── */}
      {isActive && canHover === true && !isZooming && (
        <div className="absolute bottom-3 right-3 z-20 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-xs border border-gray-200/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gray-500"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        </div>
      )}

      {/* ── Mobile: Tap-to-zoom hint ── */}
      {isActive && canHover === false && !isTouchZoomed && (
        <div className="absolute inset-0 z-15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <div className="bg-black/50 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
            Tap to zoom
          </div>
        </div>
      )}

      {/* ── Desktop: Zoom overlay (GPU-accelerated, 200% zoom) ── */}
      {/* CSS custom properties updated via ref — zero React re-renders on mouse move */}
      <div
        ref={overlayRef}
        className={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-200 ease-out will-change-[background-position] ${
          isZooming ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: `url(${src})`,
          backgroundPosition: 'var(--zoom-x, 50%) var(--zoom-y, 50%)',
          backgroundSize: '200%',
          backgroundRepeat: 'no-repeat',
          transform: 'translateZ(0)',
        }}
      />

      {/* ── Mobile: Tap-to-zoom overlay ── */}
      <div
        className={`absolute inset-0 pointer-events-none z-10 transition-opacity duration-300 ease-out will-change-opacity ${
          isTouchZoomed ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          backgroundImage: `url(${src})`,
          backgroundPosition: 'center center',
          backgroundSize: 'contain',
          backgroundRepeat: 'no-repeat',
          backgroundColor: 'white',
        }}
      />

      {/* ── Mobile: Close button on zoom overlay ── */}
      {isTouchZoomed && (
        <button
          onClick={(e) => { e.stopPropagation(); setIsTouchZoomed(false); }}
          className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
});

import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { getImageUrl } from '../../utils/formatters';

/**
 * ReviewImageLightbox — Full-screen image viewer for review photos.
 *
 * Extracted as a shared component to avoid duplication between
 * AllReviewsModal and ProductDetailPage.
 *
 * @param {string[]}  images       - Array of image URLs (strings)
 * @param {number}    initialIndex - Starting image index
 * @param {function}  onClose      - Callback when lightbox is dismissed
 * @param {number}    zIndex       - CSS z-index (default 200)
 */
export default function ReviewImageLightbox({
  images = [],
  initialIndex = 0,
  onClose,
  zIndex = 200,
}) {
  const [currentIdx, setCurrentIdx] = useState(initialIndex);

  /* ── Swipe / drag state ── */
  const dragRef = useRef({
    startX: 0,
    startY: 0,
    offsetX: 0,
    isDragging: false,
    moved: false,
  });
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const suppressClick = useRef(false);

  const goNext = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIdx(prev => (prev + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    if (images.length <= 1) return;
    setCurrentIdx(prev => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  /* ── Progressive resistance helper ── */
  const calcResistance = useCallback((deltaX) => {
    const ratio = Math.abs(deltaX) / window.innerWidth;
    // Resistance increases the further you drag: starts at ~0.65, drops to ~0.15
    return Math.max(0.15, 0.65 - ratio * 0.8);
  }, []);

  /* ── Touch handlers ── */
  const handleTouchStart = useCallback((e) => {
    // Don't start drag if touching thumbnails strip (allow scroll)
    if (e.target.closest('[data-thumbnails]')) return;
    const touch = e.touches[0];
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      offsetX: 0,
      isDragging: true,
      moved: false,
    };
    setIsDragging(true);
    setDragOffset(0);
  }, []);

  const handleTouchMove = useCallback((e) => {
    const dr = dragRef.current;
    if (!dr.isDragging) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - dr.startX;
    const deltaY = touch.clientY - dr.startY;

    // Only prevent default for horizontal swipes (keep vertical scrolling)
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 5) {
      e.preventDefault();
      dr.moved = true;
      const resist = calcResistance(deltaX);
      const maxOffset = window.innerWidth * 0.35;
      const offset = Math.max(-maxOffset, Math.min(maxOffset, deltaX * resist));
      dr.offsetX = offset;
      setDragOffset(offset);
    }
  }, [calcResistance]);

  const handleTouchEnd = useCallback(() => {
    const dr = dragRef.current;
    if (!dr.isDragging) return;
    dr.isDragging = false;
    setIsDragging(false);

    const absOffset = Math.abs(dr.offsetX);
    const threshold = window.innerWidth > 768 ? 100 : 80;

    if (dr.moved && absOffset > threshold) {
      if (dr.offsetX > 0) {
        goPrev(); // Swiped right → prev
      } else {
        goNext(); // Swiped left → next
      }
    }

    // Reset offset with slight delay for animation
    setDragOffset(0);
    setTimeout(() => { dr.moved = false; }, 100);
  }, [goNext, goPrev]);

  /* ── Mouse drag (desktop) ── */
  const handleMouseDown = useCallback((e) => {
    // Ignore clicks on buttons/controls
    if (e.target.closest('button') || e.target.closest('[data-thumbnails]')) return;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: 0,
      isDragging: true,
      moved: false,
    };
    setIsDragging(true);
    setDragOffset(0);
    suppressClick.current = false;
  }, []);

  const handleMouseMove = useCallback((e) => {
    const dr = dragRef.current;
    if (!dr.isDragging) return;
    const deltaX = e.clientX - dr.startX;
    if (Math.abs(deltaX) > 5) {
      dr.moved = true;
      suppressClick.current = true;
      const resist = calcResistance(deltaX);
      const maxOffset = window.innerWidth * 0.35;
      const offset = Math.max(-maxOffset, Math.min(maxOffset, deltaX * resist));
      dr.offsetX = offset;
      setDragOffset(offset);
    }
  }, [calcResistance]);

  const handleMouseUp = useCallback(() => {
    const dr = dragRef.current;
    if (!dr.isDragging) return;
    dr.isDragging = false;
    setIsDragging(false);

    const absOffset = Math.abs(dr.offsetX);
    const threshold = 100;

    if (dr.moved && absOffset > threshold) {
      if (dr.offsetX > 0) {
        goPrev();
      } else {
        goNext();
      }
    }

    setDragOffset(0);
    setTimeout(() => { dr.moved = false; }, 100);
  }, [goNext, goPrev]);

  /* ── Guarded close: prevent click-after-drag ── */
  const handleBackdropClick = useCallback(() => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onClose();
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center overflow-hidden select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-default'
      }`}
      style={{ zIndex }}
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Close button */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white flex items-center justify-center transition-all duration-200"
      >
        <X size={20} />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm text-white text-xs font-medium">
        {currentIdx + 1} / {images.length}
      </div>

      {/* Prev button */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white flex items-center justify-center transition-all duration-200 active:scale-90"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* Adjacent image peek (visual hint for next/prev while dragging) */}
      {images.length > 1 && isDragging && dragOffset !== 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 0 }}>
          <div
            className="max-w-[90vw] max-h-[85vh] flex items-center justify-center"
            style={{
              transform: `translateX(${dragOffset > 0 ? '-120px' : '120px'})`,
              opacity: 0.15,
              transition: 'none',
            }}
          >
            <img
              src={getImageUrl(images[dragOffset > 0 ? (currentIdx - 1 + images.length) % images.length : (currentIdx + 1) % images.length])}
              alt=""
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* Image with drag offset */}
      <motion.div
        key={currentIdx}
        initial={false}
        animate={{
          opacity: 1,
          scale: 1,
          x: dragOffset,
        }}
        transition={{
          x: { type: 'spring', stiffness: 300, damping: 30, mass: 0.8 },
          opacity: { duration: 0.2 },
          scale: { duration: 0.2 },
        }}
        className="max-w-[90vw] max-h-[85vh] flex items-center justify-center relative z-[1]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={getImageUrl(images[currentIdx])}
          alt={`Photo ${currentIdx + 1}`}
          className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
          draggable={false}
        />
      </motion.div>

      {/* Next button */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white flex items-center justify-center transition-all duration-200 active:scale-90"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* Swipe hint */}
      {images.length > 1 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 text-white/30 text-[10px] font-medium uppercase tracking-widest pointer-events-none">
          <ChevronLeft size={12} />
          <span>swipe</span>
          <ChevronRight size={12} />
        </div>
      )}

      {/* Thumbnails strip at bottom */}
      {images.length > 1 && (
        <div
          data-thumbnails
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10 max-w-[80vw] overflow-x-auto no-scrollbar px-2 py-[10px]"
          style={{ scrollbarWidth: 'none' }}
        >
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={(e) => { e.stopPropagation(); setCurrentIdx(idx); }}
              className={`w-10 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition-all duration-200 ${
                idx === currentIdx
                  ? 'border-white opacity-100 scale-110 shadow-lg'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

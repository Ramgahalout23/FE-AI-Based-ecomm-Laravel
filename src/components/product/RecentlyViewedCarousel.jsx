import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import ProductCardSkeleton from '../ui/ProductCardSkeleton';

/* ═══════════════════════════════════════════════════
   Brand Tokens
   ═══════════════════════════════════════════════════ */
const INK = '#1a1a1a';
const PAPER = '#ffffff';

/**
 * RecentlyViewedCarousel — Premium horizontal scrollable carousel
 * for displaying recently viewed products. Uses the standard ProductCard
 * component for consistency with all product listings.
 *
 * @param {Object[]} products - Array of product objects
 */
export default function RecentlyViewedCarousel({ products = [] }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Left Arrow */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: canScrollLeft ? 1 : 0, scale: canScrollLeft ? 1 : 0.8 }}
        transition={{ duration: 0.2 }}
        onClick={() => scrollRef.current?.scrollBy({ left: -400, behavior: 'smooth' })}
        style={{
          position: 'absolute',
          left: -14,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: PAPER,
          border: '1px solid rgba(0,0,0,0.08)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: canScrollLeft ? 'auto' : 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.25s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = INK; e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
      >
        <ChevronLeft size={18} strokeWidth={1.5} color={INK} />
      </motion.button>

      {/* Scroll Container */}
      <div
        ref={scrollRef}
        onScroll={updateScrollButtons}
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          scrollbarWidth: 'none',
          paddingBottom: 8,
          paddingLeft: 2,
          paddingRight: 2,
        }}
      >
        {products.map((p, idx) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-30px' }}
            transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
            style={{ flexShrink: 0, width: 220 }}
          >
            <ProductCard product={p} />
          </motion.div>
        ))}
      </div>

      {/* Right Arrow */}
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: canScrollRight ? 1 : 0, scale: canScrollRight ? 1 : 0.8 }}
        transition={{ duration: 0.2 }}
        onClick={() => scrollRef.current?.scrollBy({ left: 400, behavior: 'smooth' })}
        style={{
          position: 'absolute',
          right: -14,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: PAPER,
          border: '1px solid rgba(0,0,0,0.08)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: canScrollRight ? 'auto' : 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
          transition: 'all 0.25s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = INK; e.currentTarget.style.transform = 'translateY(-50%) scale(1.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
      >
        <ChevronRight size={18} strokeWidth={1.5} color={INK} />
      </motion.button>
    </div>
  );
}

/**
 * RecentlyViewedCarouselSkeleton — Loading placeholder matching
 * the same carousel layout, using ProductCardSkeleton components.
 */
export function RecentlyViewedCarouselSkeleton() {
  return (
    <div style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          paddingBottom: 8,
          paddingLeft: 2,
          paddingRight: 2,
        }}
      >
        {[1, 2, 3, 4, 5].map((_, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
            style={{ flexShrink: 0, width: 220 }}
          >
            <ProductCardSkeleton />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

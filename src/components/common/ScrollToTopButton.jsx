/**
 * ScrollToTopButton
 * Reusable premium scroll-to-top button with glass-morphism styling.
 * Positioned safely above the WhatsApp button and MobileNav on mobile,
 * and above the WhatsApp button on desktop.
 *
 * Mobile:   120px from bottom (above MobileNav + WhatsApp)
 * Desktop:  88px from bottom (above WhatsApp at 24px)
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  // Watch body overflow & reel-player data attr — ReelPlayer sets both when open
  useEffect(() => {
    const checkOverlay = () => {
      setIsOverlayOpen(
        document.body.style.overflow === 'hidden' ||
        document.body.getAttribute('data-reel-player') === 'active'
      );
    };
    checkOverlay();
    const observer = new MutationObserver(checkOverlay);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'data-reel-player'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <AnimatePresence>
      {visible && !isOverlayOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          onClick={scrollToTop}
          className="scroll-to-top-desktop fixed z-[9997] flex items-center justify-center"
          style={{
            bottom: '24px',
            left: '20px',
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(26, 26, 26, 0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)',
            color: '#fff',
            cursor: 'pointer',
            padding: 0,
            outline: 'none',
          }}
          whileHover={{
            scale: 1.08,
            background: 'rgba(26, 26, 26, 1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)',
          }}
          whileTap={{ scale: 0.92 }}
          aria-label="Scroll to top"
        >
          {/* Glass highlight overlay */}
          <span
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, transparent 50%)',
            }}
          />

          {/* Inner ring */}
          <span
            className="absolute inset-[3px] rounded-full pointer-events-none"
            style={{
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          />

          <ArrowUp size={20} className="relative z-10" />

          <style>{`
            @media (min-width: 1024px) {
              .scroll-to-top-desktop {
                bottom: 24px !important;
                left: 28px !important;
              }
            }
          `}</style>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

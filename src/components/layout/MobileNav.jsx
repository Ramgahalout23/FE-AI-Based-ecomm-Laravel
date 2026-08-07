import { Home, Search, Heart, User } from 'lucide-react';
import { memo, useRef, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import CartIcon from '../common/CartIcon';
import useCartStore from '../../store/cartStore';
import useAuthStore from '../../store/authStore';

// ── Brand Colors ─────────────────────────────────────
const BRAND_DARK = '#1A1A1A';
const BRAND_MUTED = '#9CA3AF';

// ── Spring animation configs ─────────────────────────
const springBounce = {
  type: 'spring',
  stiffness: 500,
  damping: 12,
  mass: 0.6,
};

const springGlow = {
  type: 'spring',
  stiffness: 300,
  damping: 20,
  mass: 0.8,
};

const springDot = {
  type: 'spring',
  stiffness: 600,
  damping: 15,
  mass: 0.4,
};

/**
 * Instagram-style bottom navigation bar with spring animations
 * - Light glass-morphism floating pill (matches light website theme)
 * - Spring bounce on icon when switching tabs
 * - Smooth glow transition on active background
 * - Animated indicator dot
 * - Auto-hides on scroll down, reappears on scroll up
 */
export default memo(function MobileNav() {
  const location = useLocation();
  const { count } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  // ── Hooks MUST be declared before any early return ──
  const lastScrollY = useRef(0);
  const [navVisible, setNavVisible] = useState(true);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const SCROLL_THRESHOLD = 10;
  const HIDE_OFFSET = 100;

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;

      if (currentY <= 10) {
        setNavVisible(true);
        lastScrollY.current = currentY;
        return;
      }

      const delta = currentY - lastScrollY.current;

      if (Math.abs(delta) < SCROLL_THRESHOLD) {
        return;
      }

      if (delta > 0 && currentY > HIDE_OFFSET) {
        setNavVisible(false);
      } else if (delta < 0) {
        setNavVisible(true);
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

  // ── Early return (must come after all hooks) ──
  if (isOverlayOpen || location.pathname === '/checkout' || 
      (location.pathname.startsWith('/products/') && !location.pathname.startsWith('/products/section/'))) {
    return null;
  }

  const isActive = (path) => {
    if (path === location.pathname) return true;
    if (path === '/products' && location.pathname.startsWith('/products')) return true;
    if (path === '/wishlist' && location.pathname === '/wishlist') return true;
    if (path === '/cart' && location.pathname === '/cart') return true;
    if (path === '/profile' || path === '/login') {
      return location.pathname === '/profile' || location.pathname === '/login';
    }
    return false;
  };

  const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/products', icon: Search, label: 'Search' },
    { path: '/wishlist', icon: Heart, label: 'Wishlist' },
    { path: '/cart', icon: CartIcon, label: 'Cart', badge: count },
    { path: isAuthenticated ? '/profile' : '/login', icon: User, label: 'Profile' },
  ];

  return (
    <>
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pointer-events-none"
        style={{ height: '80px' }}
        animate={{ y: navVisible ? 0 : 100 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.6,
        }}
      >
        {/* Gradient border ring wrapper */}
        <div
          className="absolute bottom-2 left-3 right-3 mx-auto max-w-sm pointer-events-auto rounded-[30px] p-[1px]"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.45), rgba(255,255,255,0.06), rgba(255,255,255,0.18))',
            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
          }}
        >
        <nav
          className="relative rounded-[30px] overflow-hidden"
          style={{
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(36px) saturate(2)',
            WebkitBackdropFilter: 'blur(36px) saturate(2)',
          }}
        >
          {/* Premium glass sheen — soft light gradient overlay */}
          <div className="absolute inset-0 rounded-[30px]" style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.02) 100%)',
            pointerEvents: 'none',
          }} />

          {/* Top edge light catch */}
          <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent z-10" />

          {/* Subtle bottom glow */}
          <div className="absolute bottom-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />

          {/* Tiny light refraction dots (premium detail) */}
          <div className="absolute top-[7px] right-[24px] w-[3px] h-[3px] rounded-full" style={{ background: 'rgba(255,255,255,0.45)' }} />
          <div className="absolute top-[7px] right-[32px] w-[2px] h-[2px] rounded-full" style={{ background: 'rgba(255,255,255,0.25)' }} />

          <div className="relative flex items-center justify-around py-0.5 px-0.5 z-[1]">
            {navItems.map((item) => {
              const active = isActive(item.path);
              const Icon = item.icon;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="relative flex flex-col items-center justify-center gap-0.5 w-[56px] h-[52px] rounded-2xl active:scale-90"
                >
                  {/* Active background — spring-animated subtle dark wash */}
                  <AnimatePresence>
                    {active && (
                      <motion.div
                        key="active-bg"
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={springGlow}
                        className="absolute inset-0 rounded-2xl"
                        style={{ background: `${BRAND_DARK}08` }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon with spring bounce */}
                  <div className="relative flex items-center justify-center">
                    <motion.div
                      key={`icon-${active}`}
                      initial={false}
                      animate={{
                        scale: active ? [1, 1.25, 0.95, 1.05, 1] : 1,
                      }}
                      transition={springBounce}
                    >
                      <Icon
                        size={22}
                        strokeWidth={active ? 2.5 : 1.8}
                        className="relative"
                        style={{
                          color: active ? BRAND_DARK : BRAND_MUTED,
                        }}
                      />
                    </motion.div>

                    {/* Cart badge */}
                    {item.badge > 0 && (
                      <motion.span
                        key={`badge-${item.badge}`}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 10,
                        }}
                        className="absolute -top-2 -right-2.5 text-[9px] font-bold flex items-center justify-center rounded-full min-w-[17px] h-[17px] px-1 shadow-md"
                        style={{
                          background: BRAND_DARK,
                          color: '#fff',
                        }}
                      >
                        {item.badge > 9 ? '9+' : item.badge}
                      </motion.span>
                    )}
                  </div>

                  {/* Label */}
                  <motion.span
                    className="text-[9px] leading-none"
                    animate={{
                      color: active ? BRAND_DARK : BRAND_MUTED,
                      fontWeight: active ? 600 : 500,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {item.label}
                  </motion.span>

                  {/* Active indicator dot — spring animated */}
                  <AnimatePresence>
                    {active && (
                      <motion.div
                        key="indicator"
                        initial={{ scaleX: 0, opacity: 0 }}
                        animate={{ scaleX: 1, opacity: 1 }}
                        exit={{ scaleX: 0, opacity: 0 }}
                        transition={springDot}
                        className="absolute -bottom-0 w-[4px] h-[4px] rounded-full origin-center"
                        style={{ background: BRAND_DARK }}
                      />
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        </nav>
        </div>
      </motion.div>

    </>
  );
});

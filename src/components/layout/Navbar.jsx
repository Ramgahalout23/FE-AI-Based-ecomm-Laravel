import { Search, User, Menu, X, Heart, LogOut, Home, Info, ArrowRight, LayoutDashboard } from 'lucide-react';
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import CartIcon from '../common/CartIcon';
import NotificationBell from '../common/NotificationBell';
// Search modal only loads its chunk when the user opens search
const SearchModal = lazy(() => import('../common/SearchModal'));
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import useCartStore from '../../store/cartStore';
import { useSettings } from '../../store/useSettings';
import { productsAPI } from '../../api/products';
import { getImageUrl, getUserFullName } from '../../utils/formatters';
import { useAppInit } from '../../contexts/AppInitContext';
import AnnouncementBar from './AnnouncementBar';
import CurrencySwitcher from '../common/CurrencySwitcher';
import LanguageSwitcher from '../common/LanguageSwitcher';



export default function Navbar() {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { count, openCart } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = isAuthenticated && (user?.role === 'ADMIN' || localStorage.getItem('adminToken'));

  // Full display name — backend returns snake_case (first_name/last_name) on login,
  // while setUser() after a profile edit stores camelCase (firstName/lastName).
  const fullName = getUserFullName(user);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showAccount, setShowAccount] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  // Mount SearchModal on first open, then keep it mounted so its internal
  // AnimatePresence exit animation plays on close — the chunk is deferred
  // until the user actually opens search.
  const [searchEverOpened, setSearchEverOpened] = useState(false);
  useEffect(() => {
    if (showSearchModal) setSearchEverOpened(true);
  }, [showSearchModal]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [isReelsOpen, setIsReelsOpen] = useState(false);
  const searchRef = useRef(null);

  const { getSetting } = useSettings();
  const siteName = getSetting('storeName', 'THREVOLT');
  const logo = getSetting('logoDarkUrl') || getSetting('logoUrl') || null;

  // Use consolidated app-init data for nav — replaces 2 individual API calls
  const { data: appInitData } = useAppInit();
  const activePromotions = appInitData?.promotions || [];
  const customPages = appInitData?.pages || [];

  // Short display names for the navbar (e.g. "Frequently Asked Questions" → "FAQ")
  const SHORT_NAMES = {
    faq: t('nav.faq', { defaultValue: 'FAQ' }),
    'care-instructions': t('nav.care', { defaultValue: 'Care' }),
    'shipping-information': t('nav.shipping', { defaultValue: 'Shipping' }),
    'size-guide': t('nav.size_guide', { defaultValue: 'Size Guide' }),
    'privacy-policy': t('nav.privacy', { defaultValue: 'Privacy' }),
    'return-policy': t('nav.returns', { defaultValue: 'Returns' }),
  };
  const navLabel = (page) => SHORT_NAMES[page.slug] || page.title;
  const hasActivePromotions = activePromotions.length > 0;

  // Sync brand colors from settings onto CSS custom properties
  useEffect(() => {
    const primary = getSetting('primaryColor');
    const secondary = getSetting('secondaryColor');
    if (primary) document.documentElement.style.setProperty('--primary', primary);
    if (secondary) document.documentElement.style.setProperty('--secondary', secondary);
  }, [getSetting]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
     
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close suggestions & category menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      return;
    }
    const timer = setTimeout(async () => {
      try {
        await productsAPI.search(searchQuery);
      } catch (err) {
        console.error('Search failed:', err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Hide the sticky navbar while the reel player is open — ReelPlayer sets
  // data-reel-player="active" on <body>, and the navbar (z-index 100) would
  // otherwise cover the player's close button (player root is z-50).
  useEffect(() => {
    const checkReels = () => {
      setIsReelsOpen(document.body.getAttribute('data-reel-player') === 'active');
    };
    checkReels();
    const observer = new MutationObserver(checkReels);
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-reel-player'] });
    return () => observer.disconnect();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className={`sticky top-0 z-sticky transition-all duration-300 flex flex-col ${
      isReelsOpen ? '-translate-y-full opacity-0 pointer-events-none' : ''
    } ${
      scrolled 
        ? 'bg-charcoal/95 backdrop-blur-md shadow-card border-b border-white/[0.04]' 
        : 'bg-charcoal shadow-soft'
    }`}
      style={scrolled ? { boxShadow: '0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3)' } : {}}
    >
      {/* Announcement Bar - above main navigation */}
      <AnnouncementBar />
      {/* Main Navbar */}
      <nav>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16 gap-4">

            {/* Mobile Left — Menu + Search (hidden on desktop) */}
            <div className="flex items-center gap-0.5 lg:hidden">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-primary transition-colors hover:bg-white/10 rounded-lg"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              {/* Mobile Search */}
              <button
                onClick={() => setShowSearchModal(true)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-primary transition-colors rounded-lg hover:bg-white/10"
                aria-label="Search"
              >
                <Search size={22} />
              </button>
            </div>

            {/* Center Logo — absolutely centered on desktop (lg+), in-flow on mobile */}
            <Link to="/" className="flex items-center flex-shrink-0 group lg:absolute lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2">
              {logo ? (
                <div className="h-10 sm:h-12 flex items-center transition-transform group-hover:scale-105">
                  <img 
                    src={getImageUrl(logo)} 
                    alt={siteName} 
                    className="h-full w-auto max-w-[180px] object-contain" 
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
              ) : (
                <span className="font-display text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {siteName}
                </span>
              )}
            </Link>

            {/* Left Nav Links — Desktop only (logo floats centered, links sit left) */}
            <div className="hidden lg:flex items-center justify-start gap-1">
              {/* Watch & Buy */}
              <Link
                to="/watch-and-buy"
                className={`px-3 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                  location.pathname === '/watch-and-buy'
                    ? 'text-white bg-white/15'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Watch & Buy
              </Link>
              {hasActivePromotions && (
                <Link
                  to="/sales"
                  className={`px-3 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    location.pathname === '/sales'
                      ? 'text-red-400 bg-red-500/10'
                      : 'text-red-400/80 hover:text-red-400 hover:bg-red-500/10'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  {t('nav.sales')}
                </Link>
              )}
              {customPages.filter((p) => p.slug !== 'care-instructions').slice(0, 4).map((page) => {
                const isActive = location.pathname === `/pages/${page.slug}`;
                return (
                  <Link
                    key={page.slug}
                    to={`/pages/${page.slug}`}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'text-primary bg-white/10'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {navLabel(page)}
                  </Link>
                );
              })}
              {/* Track Order */}
              <Link
                to="/track-order"
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === '/track-order'
                    ? 'text-primary bg-white/10'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {t('nav.track')}
              </Link>
              {/* About Us */}
              <Link
                to="/about"
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  location.pathname === '/about'
                    ? 'text-primary bg-white/10'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {t('nav.about')}
              </Link>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
              {/* Desktop Only — Currency, Language, Search, Wishlist */}
              <div className="hidden lg:flex items-center gap-1">
                {getSetting('currencySwitcherEnabled', 'true') !== 'false' && <CurrencySwitcher variant="navbar" />}
                {getSetting('languageSwitcherEnabled', 'true') !== 'false' && <LanguageSwitcher variant="navbar" />}
                {/* Desktop Search */}
                <button
                  onClick={() => setShowSearchModal(true)}
                  className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-primary transition-colors rounded-lg hover:bg-white/10"
                >
                  <Search size={22} />
                </button>
                {/* Wishlist */}
                <Link 
                  to="/wishlist" 
                  className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-primary transition-colors rounded-lg hover:bg-white/10"
                >
                  <Heart size={22} />
                </Link>
              </div>

              {/* Notification Bell — visible on all screens when logged in */}
              {(isAuthenticated || isAdmin) && <NotificationBell />}

              {/* Account — visible on all screens */}
              {(isAuthenticated || isAdmin) ? (
                <div
                  className="relative"
                  onMouseEnter={() => setShowAccount(true)}
                  onMouseLeave={() => setShowAccount(false)}
                >
                  <button className="flex items-center gap-2 px-2 sm:px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium text-white/80 hover:text-primary hover:bg-white/10 transition-colors">
                    <User size={20} />
                    <span className="hidden lg:inline">{isAdmin ? t('nav.admin') : (fullName || t('nav.account'))}</span>
                  </button>

                  <AnimatePresence>
                    {showAccount && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lift border border-border min-w-[200px] overflow-hidden"
                      >
                        <div className="p-4 bg-gradient-to-r from-primary to-primary-light text-white">
                          <div className="font-semibold">{isAdmin ? 'Admin' : (fullName || user?.email || 'User')}</div>
                          <div className="text-xs opacity-80">{user?.email || 'Admin User'}</div>
                        </div>
                        <div className="py-1">
                          {isAdmin ? (
                            <Link to="/admin" className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-surface hover:text-primary transition-colors">{t('nav.dashboard')}</Link>
                          ) : (
                            <>
                              <Link to="/profile" className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-surface hover:text-primary transition-colors">{t('nav.my_profile')}</Link>
                              <Link to="/orders" className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-surface hover:text-primary transition-colors">{t('nav.my_orders')}</Link>
                              <Link to="/addresses" className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-surface hover:text-primary transition-colors">{t('nav.addresses')}</Link>
                              <Link to="/support" className="block px-4 py-2.5 text-sm text-text-secondary hover:bg-surface hover:text-primary transition-colors">{t('nav.support')}</Link>
                            </>
                          )}
                        </div>
                        <button onClick={async () => { await logout(); localStorage.removeItem('adminToken'); navigate('/'); }} className="w-full text-left px-4 py-3 text-sm text-danger hover:bg-danger-bg transition-colors border-t border-border flex items-center gap-2">
                          <LogOut size={16} /> {t('nav.sign_out')}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <>
                  {/* User icon — visible on all screens */}
                  <Link
                    to="/login"
                    aria-label={t('nav.sign_in')}
                    className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-primary transition-colors rounded-lg hover:bg-white/10"
                  >
                    <User size={22} />
                  </Link>
                </>
              )}

              {/* Cart — visible on all screens */}
              <button
                id="cart-btn"
                data-cart-btn
                onClick={openCart}
                aria-label={t('nav.cart')}
                className="relative flex items-center gap-2 p-2 min-h-[44px] text-white/80 hover:text-primary transition-colors rounded-lg hover:bg-white/10"
              >
                <CartIcon size={22} />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 bg-[#232323] text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-count-pulse border border-white/20"
                    style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
                  >
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu — premium fullscreen overlay with glass-morphism & gold accents */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                key="menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-40 lg:hidden"
                style={{
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                }}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* Menu panel — slides up from bottom */}
              <motion.div
                key="menu-panel"
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 32, mass: 0.85 }}
                className="fixed bottom-0 left-0 right-0 z-50 lg:hidden rounded-t-[32px] overflow-hidden"
                style={{
                  maxHeight: '92dvh',
                  background: 'rgba(22, 22, 24, 0.98)',
                  backdropFilter: 'blur(40px) saturate(1.4)',
                  WebkitBackdropFilter: 'blur(40px) saturate(1.4)',
                  boxShadow: '0 -8px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                {/* White top accent bar */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-[3px] rounded-full bg-white/30" />

                {/* Drag handle */}
                <div className="flex justify-center pt-4 pb-1">
                  <div className="w-10 h-1 rounded-full bg-white/15" />
                </div>

                {/* Top glass edge */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

                {/* Close button */}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
                >
                  <X size={15} className="text-white/60" />
                </button>

                <div className="px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] overflow-y-auto"
                  style={{ maxHeight: 'calc(92dvh - 44px)', overscrollBehavior: 'contain' }}>

                  <div className="space-y-6">
                    {/* ── Profile Section ── */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05, type: 'spring', stiffness: 300, damping: 28 }}
                    >
                      <div className="flex items-center gap-4 pb-4 border-b border-white/[0.06]">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0"
                          style={{
                            background: isAuthenticated
                              ? 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.06))'
                              : 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))',
                            border: isAuthenticated ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <User size={20} className={isAuthenticated ? 'text-white' : 'text-white/50'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-semibold text-base truncate">
                            {isAuthenticated ? (fullName || user?.email || 'User') : 'Guest'}
                          </div>
                          <div className="text-white/35 text-sm truncate">
                            {isAuthenticated ? (user?.email || '') : 'Sign in for personalized experience'}
                          </div>
                        </div>
                        {!isAuthenticated && !isAdmin && (
                          <Link
                            to="/login"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95"
                            style={{
                              background: 'rgba(255,255,255,0.1)',
                              color: '#fff',
                              border: '1px solid rgba(255,255,255,0.15)',
                            }}
                          >
                            Sign In
                          </Link>
                        )}
                      </div>
                    </motion.div>

                    {/* ── Mobile Search ── */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 28 }}
                    >
                      <form onSubmit={handleSearch} className="relative group">
                        <input
                          type="text"
                          placeholder={t('search.placeholder')}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onFocus={() => setSearchFocused(true)}
                          onBlur={() => setSearchFocused(false)}
                          className="w-full rounded-2xl py-3.5 px-4 pl-11 text-sm outline-none transition-all duration-200 placeholder:text-white/30"
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: `1px solid ${searchFocused ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.06)'}`,
                            color: '#fff',
                            boxShadow: searchFocused ? '0 0 0 3px rgba(255,255,255,0.1)' : 'none',
                          }}
                        />
                        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200" style={{ color: 'rgba(255,255,255,0.25)' }} />
                      </form>
                    </motion.div>

                    {/* ── Navigation Links ── */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 28 }}
                    >
                      <div className="flex items-center gap-2 px-1 mb-3">
                        <div className="w-1 h-4 rounded-full bg-white/30" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/30">Navigate</span>
                        <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.06), transparent)' }} />
                      </div>

                      <div className="flex flex-col gap-1">
                        {isAdmin && (
                          <Link
                            to="/admin"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                              color: '#fff',
                              background: 'rgba(255,255,255,0.08)',
                            }}
                          >
                            <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.12)' }}>
                              <LayoutDashboard size={15} className="text-white/80" />
                            </span>
                            <span className="flex-1">Admin Dashboard</span>
                            <ArrowRight size={14} className="text-white/30" />
                          </Link>
                        )}

                        {/* Watch & Buy */}
                        <Link
                          to="/watch-and-buy"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            color: location.pathname === '/watch-and-buy' ? '#fff' : 'rgba(255,255,255,0.6)',
                            background: location.pathname === '/watch-and-buy' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.06)',
                            border: location.pathname === '/watch-and-buy' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid transparent',
                          }}
                        >
                          <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                              <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                          </span>
                          <span className="flex-1 text-emerald-400">Watch & Buy</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </Link>

                        {[
                          { to: '/', label: t('nav.home') },
                          { to: '/products', label: t('nav.products') },
                          { to: '/wishlist', label: t('nav.wishlist') },
                          { to: '/cart', label: t('nav.cart') },
                          { to: '/about', label: t('nav.about') },
                        ].map((link, idx) => {
                          const Icon = [Home, Search, Heart, CartIcon, Info][idx];
                          const isLinkActive = location.pathname === link.to ||
                            (link.to === '/products' && location.pathname.startsWith('/products'));
                          return (
                            <Link
                              key={link.to}
                              to={link.to}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                              style={{
                                color: isLinkActive ? '#fff' : 'rgba(255,255,255,0.5)',
                                background: isLinkActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                              }}
                            >
                              <span
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
                                style={{
                                  background: isLinkActive
                                    ? 'rgba(255,255,255,0.12)'
                                    : 'rgba(255,255,255,0.04)',
                                  border: isLinkActive ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.04)',
                                }}
                              >
                                <Icon size={16} className={isLinkActive ? 'text-white' : 'text-white/40'} />
                              </span>
                              <span className="flex-1">{link.label}</span>
                              {link.to === '/cart' && count > 0 && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-[#1A1A1A]">
                                  {count > 9 ? '9+' : count}
                                </span>
                              )}
                              {!isLinkActive && (
                                <ArrowRight size={14} style={{ color: 'rgba(255,255,255,0.15)' }} />
                              )}
                            </Link>
                          );
                        })}

                        {/* Promotions link */}
                        {hasActivePromotions && (
                          <Link
                            to="/sales"
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            style={{ color: '#F87171', background: 'rgba(248, 113, 113, 0.06)' }}
                          >
                            <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(248, 113, 113, 0.12)' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                            </span>
                            <span className="flex-1">Sales</span>
                            <span className="text-[10px] font-medium text-red-400/60">Active</span>
                          </Link>
                        )}

                        {/* Custom pages */}
                        {customPages.filter((p) => p.slug !== 'care-instructions').slice(0, 5).map((page) => {
                          const isActive = location.pathname === `/pages/${page.slug}`;
                          return (
                            <Link
                              key={page.slug}
                              to={`/pages/${page.slug}`}
                              onClick={() => setIsMobileMenuOpen(false)}
                              className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                              style={{
                                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                                background: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                              }}
                            >
                              <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                                background: isActive ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                                border: isActive ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.04)',
                              }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={isActive ? 'text-white' : 'text-white/40'}>
                                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                                </svg>
                              </span>
                              {navLabel(page)}
                            </Link>
                          );
                        })}

                        {/* Track Order */}
                        <Link
                          to="/track-order"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            color: location.pathname === '/track-order' ? '#fff' : 'rgba(255,255,255,0.5)',
                            background: location.pathname === '/track-order' ? 'rgba(255,255,255,0.08)' : 'transparent',
                          }}
                        >
                          <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                            background: location.pathname === '/track-order' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                            border: location.pathname === '/track-order' ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.04)',
                          }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={location.pathname === '/track-order' ? 'text-white' : 'text-white/40'}>
                              <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
                            </svg>
                          </span>
                          {t('nav.track')}
                        </Link>
                      </div>
                    </motion.div>

                    {/* ── Bottom Stack ── */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 28 }}
                    >
                      <div className="pt-3 pb-2 border-t border-white/[0.06] space-y-3">
                        {/* Currency & Language */}
                        <div className="flex items-center gap-2 px-4">
                          {getSetting('currencySwitcherEnabled', 'true') !== 'false' && <CurrencySwitcher variant="mobile" />}
                          {getSetting('languageSwitcherEnabled', 'true') !== 'false' && <LanguageSwitcher variant="mobile" />}
                        </div>

                        {/* Sign Out */}
                        {(isAuthenticated || isAdmin) && (
                          <button
                            onClick={async () => {
                              await logout();
                              localStorage.removeItem('adminToken');
                              navigate('/');
                            }}
                            className="flex items-center gap-3.5 w-full px-4 py-3.5 rounded-2xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            style={{ color: 'rgba(255,255,255,0.35)' }}
                          >
                            <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.04)' }}>
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                            </span>
                            Sign Out
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>

      {/* Search Modal — lazily loaded; mounts on first open, then stays mounted
          so its internal exit animation still plays when closing */}
      {(showSearchModal || searchEverOpened) && (
        <Suspense fallback={null}>
          <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />
        </Suspense>
      )}

    </header>
  );
}
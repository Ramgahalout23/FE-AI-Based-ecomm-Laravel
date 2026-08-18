import { Search, User, Menu, X, Heart, LogOut, Home, Info, Mail, Package, ArrowRight, LayoutDashboard } from 'lucide-react';
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
import useUIStore from '../../store/uiStore';
import { useSettings } from '../../store/useSettings';
import { useAppInit } from '../../contexts/AppInitContext';
import { productsAPI } from '../../api/products';
import { getImageUrl, getUserFullName } from '../../utils/formatters';
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
  const adminSidebarOpen = useUIStore((s) => s.mobileMenuOpen);

  // Sync mobile menu state to body attribute so chatbot & other widgets can hide
  useEffect(() => {
    if (isMobileMenuOpen || adminSidebarOpen) {
      document.body.setAttribute('data-mobile-menu', 'open');
    } else {
      document.body.removeAttribute('data-mobile-menu');
    }
    return () => document.body.removeAttribute('data-mobile-menu');
  }, [isMobileMenuOpen, adminSidebarOpen]);

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
  const { data: appInitData } = useAppInit();
  const activePromotions = appInitData?.promotions || [];
  const salesActive = getSetting('salesEnabled', 'true') !== 'false' && activePromotions.length > 0;
  const watchAndBuyActive = getSetting('reelsEnabled', 'true') !== 'false';
  const siteName = getSetting('storeName', 'THREVOLT');
  const logo = getSetting('logoDarkUrl') || getSetting('logoUrl') || null;

  // Use consolidated app-init data for nav — replaces 2 individual API calls

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
      {/* Announcement Bar - hidden when mobile menu is open */}
      {!isMobileMenuOpen && <AnnouncementBar />}
      {/* Main Navbar */}
      <nav>
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16 gap-4">

            {/* Mobile Left — Menu + Search (hidden on desktop) */}
            <div className="flex items-center gap-0.5 lg:hidden">
              {/* Mobile Menu Toggle — storefront or admin sidebar */}
              <button
                onClick={() => {
                  if (location.pathname.startsWith('/admin')) {
                    useUIStore.getState().toggleMobileMenu();
                  } else {
                    setIsMobileMenuOpen(!isMobileMenuOpen);
                  }
                }}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-primary transition-colors hover:bg-white/10 rounded-lg"
                aria-label="Toggle menu"
              >
                {(isMobileMenuOpen || adminSidebarOpen) ? <X size={24} /> : <Menu size={24} />}
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
              {watchAndBuyActive && (
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
              )}
              {salesActive && (
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
              {[
                { to: '/', label: t('nav.home') },
                { to: '/products', label: t('nav.shop') },
                { to: '/track-order', label: t('nav.track') },
                { to: '/about', label: t('nav.about') },
                { to: '/contact', label: t('nav.contact') },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === link.to
                      ? 'text-primary bg-white/10'
                      : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
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

        {/* Mobile Menu — premium left-side drawer with glass-morphism (hidden on admin routes) */}
        <AnimatePresence>
          {isMobileMenuOpen && !location.pathname.startsWith('/admin') && (
            <>
              {/* Backdrop with premium blur */}
              <motion.div
                key="menu-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 z-40 lg:hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,0,0,0.4), rgba(0,0,0,0.7))',
                  backdropFilter: 'blur(16px) saturate(1.2)',
                  WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
                }}
                onClick={() => setIsMobileMenuOpen(false)}
              />

              {/* Menu panel — slides in from left with premium spring */}
              <motion.div
                key="menu-panel"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
                className="fixed top-0 left-0 bottom-0 z-50 lg:hidden w-full overflow-hidden flex flex-col"
                style={{
                  background: 'linear-gradient(180deg, rgba(18,18,20,1) 0%, rgba(22,22,24,0.98) 100%)',
                  boxShadow: '8px 0 80px rgba(0,0,0,0.6), 2px 0 20px rgba(0,0,0,0.3)',
                }}
              >
                {/* Premium right edge accent line */}
                <div className="absolute top-0 right-0 w-px h-full" style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 40%, rgba(255,255,255,0.08) 100%)' }} />

                {/* Top glow accent */}
                <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)' }} />

                {/* ── Header with brand + close ── */}
                <div className="relative flex items-center justify-between px-5 pt-5 pb-4">
                  <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3">
                    {logo ? (
                      <div className="h-9 flex items-center">
                        <img
                          src={getImageUrl(logo)}
                          alt={siteName}
                          className="h-full w-auto max-w-[140px] object-contain brightness-0 invert opacity-90"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    ) : (
                      <span className="font-display text-lg font-bold text-white/90 tracking-tight">
                        {siteName}
                      </span>
                    )}
                  </Link>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-200"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <X size={16} className="text-white/50" />
                  </motion.button>
                </div>

                {/* ── Scrollable content ── */}
                <div className="flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
                  style={{ overscrollBehavior: 'contain' }}>

                  {/* ── Profile Section ── */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08, type: 'spring', stiffness: 300, damping: 26 }}
                    className="mb-5"
                  >
                    <div className="flex items-center gap-3.5 p-3.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: isAuthenticated
                            ? 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))'
                            : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
                          border: isAuthenticated ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <User size={18} className={isAuthenticated ? 'text-white/90' : 'text-white/40'} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white/90 font-medium text-sm truncate">
                          {isAuthenticated ? (fullName || user?.email || 'User') : 'Guest'}
                        </div>
                        <div className="text-white/30 text-xs truncate mt-0.5">
                          {isAuthenticated ? (user?.email || '') : 'Sign in for the full experience'}
                        </div>
                      </div>
                      {!isAuthenticated && !isAdmin && (
                        <Link
                          to="/login"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide uppercase transition-all duration-200"
                          style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))',
                            color: 'rgba(255,255,255,0.9)',
                            border: '1px solid rgba(255,255,255,0.12)',
                          }}
                        >
                          Sign In
                        </Link>
                      )}
                    </div>
                  </motion.div>

                  {/* ── Search ── */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12, type: 'spring', stiffness: 300, damping: 26 }}
                    className="mb-5"
                  >
                    <form onSubmit={handleSearch} className="relative">
                      <input
                        type="text"
                        placeholder={t('search.placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                        className="w-full rounded-xl py-3 px-4 pl-10 text-sm outline-none transition-all duration-300 placeholder:text-white/25"
                        style={{
                          background: searchFocused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${searchFocused ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)'}`,
                          color: '#fff',
                          boxShadow: searchFocused ? '0 0 0 3px rgba(255,255,255,0.04)' : 'none',
                        }}
                      />
                      <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.2)' }} />
                    </form>
                  </motion.div>

                  {/* ── Section Label ── */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="flex items-center gap-2.5 px-1 mb-2.5"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/20">Menu</span>
                    <div className="flex-1 h-px" style={{ background: 'linear-gradient(to right, rgba(255,255,255,0.06), transparent)' }} />
                  </motion.div>

                  {/* ── Navigation Links with staggered entry ── */}
                  <div className="flex flex-col gap-0.5">
                    {/* Admin link */}
                    {isAdmin && (
                      <motion.div
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.16, type: 'spring', stiffness: 300, damping: 26 }}
                      >
                        <Link
                          to="/admin"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                          style={{ color: '#fff', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
                            <LayoutDashboard size={15} className="text-white/70" />
                          </span>
                          <span className="flex-1">Admin Dashboard</span>
                          <ArrowRight size={14} className="text-white/25" />
                        </Link>
                      </motion.div>
                    )}

                    {/* Watch & Buy */}
                    {watchAndBuyActive && (
                      <motion.div
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.17, type: 'spring', stiffness: 300, damping: 26 }}
                      >
                        <Link
                          to="/watch-and-buy"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                          style={{
                            color: location.pathname === '/watch-and-buy' ? '#fff' : 'rgba(255,255,255,0.55)',
                            background: location.pathname === '/watch-and-buy' ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                            borderLeft: location.pathname === '/watch-and-buy' ? '2px solid rgba(16, 185, 129, 0.6)' : '2px solid transparent',
                          }}
                        >
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                              <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                            </svg>
                          </span>
                          <span className="flex-1">Watch & Buy</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </Link>
                      </motion.div>
                    )}

                    {/* Sales */}
                    {salesActive && (
                      <motion.div
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.18, type: 'spring', stiffness: 300, damping: 26 }}
                      >
                        <Link
                          to="/sales"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                          style={{
                            color: location.pathname === '/sales' ? '#fff' : 'rgba(255,255,255,0.55)',
                            background: location.pathname === '/sales' ? 'rgba(248, 113, 113, 0.08)' : 'transparent',
                            borderLeft: location.pathname === '/sales' ? '2px solid rgba(248, 113, 113, 0.5)' : '2px solid transparent',
                          }}
                        >
                          <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(248, 113, 113, 0.1)' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          </span>
                          <span className="flex-1">Sales</span>
                          <span className="text-[10px] font-medium text-red-400/50">Active</span>
                        </Link>
                      </motion.div>
                    )}

                    {/* Main nav links with staggered animation */}
                    {[
                      { to: '/', label: t('nav.home'), icon: Home },
                      { to: '/products', label: t('nav.shop'), icon: Package },
                      { to: '/about', label: t('nav.about'), icon: Info },
                      { to: '/contact', label: t('nav.contact'), icon: Mail },
                      { to: '/track-order', label: t('nav.track'), icon: null },
                      { to: '/wishlist', label: t('nav.wishlist'), icon: Heart },
                      { to: '/cart', label: t('nav.cart'), icon: null },
                    ].map((link, idx) => {
                      const Icon = link.icon;
                      const isActive = location.pathname === link.to ||
                        (link.to === '/products' && location.pathname.startsWith('/products'));
                      const staggerDelay = 0.18 + idx * 0.03;
                      return (
                        <motion.div
                          key={link.to}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: staggerDelay, type: 'spring', stiffness: 300, damping: 26 }}
                        >
                          <Link
                            to={link.to}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                            style={{
                              color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                              background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                              borderLeft: isActive ? '2px solid rgba(255,255,255,0.25)' : '2px solid transparent',
                            }}
                          >
                            {Icon && (
                              <span
                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
                                style={{
                                  background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                                }}
                              >
                                <Icon size={15} className={isActive ? 'text-white/80' : 'text-white/30'} />
                              </span>
                            )}
                            {!Icon && <span className="w-8" />}
                            <span className="flex-1">{link.label}</span>
                            {link.to === '/cart' && count > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.9)', color: '#1A1A1A' }}>
                                {count > 9 ? '9+' : count}
                              </span>
                            )}
                            {isActive && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                            )}
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* ── Bottom section ── */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mt-6 pt-4 space-y-3"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    {/* Currency & Language */}
                    <div className="flex items-center gap-2 px-1">
                      {getSetting('currencySwitcherEnabled', 'true') !== 'false' && <CurrencySwitcher variant="mobile" />}
                      {getSetting('languageSwitcherEnabled', 'true') !== 'false' && <LanguageSwitcher variant="mobile" />}
                    </div>

                    {/* Sign Out */}
                    {(isAuthenticated || isAdmin) && (
                      <motion.button
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={async () => {
                          await logout();
                          localStorage.removeItem('adminToken');
                          navigate('/');
                        }}
                        className="flex items-center gap-3 w-full px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <LogOut size={14} className="text-white/30" />
                        </span>
                        Sign Out
                      </motion.button>
                    )}

                    {/* Brand tagline */}
                    <div className="px-1 pt-2 pb-1">
                      <p className="text-[10px] text-white/15 tracking-wider uppercase">Premium Streetwear</p>
                    </div>
                  </motion.div>
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
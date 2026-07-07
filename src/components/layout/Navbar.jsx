import { ShoppingCart, Search, User, Menu, X, Heart, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';


import NotificationBell from '../common/NotificationBell';
import SearchModal from '../common/SearchModal';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../../store/authStore';
import useCartStore from '../../store/cartStore';
import { useSettings } from '../../store/useSettings';
import { productsAPI } from '../../api/products';
import { getImageUrl } from '../../utils/formatters';
import { useAppInit } from '../../contexts/AppInitContext';
import AnnouncementBar from './AnnouncementBar';
import CurrencySwitcher from '../common/CurrencySwitcher';
import LanguageSwitcher from '../common/LanguageSwitcher';



export default function Navbar() {
  const { t } = useTranslation();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { count } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = isAuthenticated && (user?.role === 'ADMIN' || localStorage.getItem('adminToken'));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showAccount, setShowAccount] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const searchRef = useRef(null);

  const { getSetting } = useSettings();
  const siteName = getSetting('storeName', 'THREVOLT');
  const logo = getSetting('logoDarkUrl') || getSetting('logoUrl') || null;

  // Use consolidated app-init data for nav — replaces 2 individual API calls
  const { data: appInitData } = useAppInit();
  const activePromotions = appInitData?.promotions || [];
  const customPages = appInitData?.pages || [];
  const keySettings = appInitData?.keySettings || {};
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

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery('');
    }
  };

  return (
    <header className={`sticky top-0 z-sticky transition-all duration-300 flex flex-col ${
      scrolled 
        ? 'bg-charcoal/95 backdrop-blur-md shadow-card' 
        : 'bg-charcoal shadow-soft'
    }`}>
      {/* Announcement Bar - above main navigation */}
      <AnnouncementBar />
      {/* Main Navbar */}
      <nav>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Logo */}
            <Link to="/" className="flex items-center flex-shrink-0 group">
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

            {/* Center Nav - Custom Pages */}
            <div className="hidden lg:flex items-center justify-center flex-1 gap-1">
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
              {customPages.slice(0, 4).map((page) => {
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
                    {page.title}
                  </Link>
                );
              })}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              {/* Currency & Language Switchers */}
              {getSetting('currencySwitcherEnabled', 'true') !== 'false' && <CurrencySwitcher variant="navbar" />}
              {getSetting('languageSwitcherEnabled', 'true') !== 'false' && <LanguageSwitcher variant="navbar" />}

              {/* Search */}
              <button
                onClick={() => setShowSearchModal(true)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-primary transition-colors rounded-lg hover:bg-white/10"
              >
                <Search size={22} />
              </button>
              {(isAuthenticated || isAdmin) && <NotificationBell />}
              {/* Wishlist */}
              <Link 
                to="/wishlist" 
                className="relative p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-primary transition-colors rounded-lg hover:bg-white/10 hidden sm:flex"
              >
                <Heart size={22} />
              </Link>

              {/* Account */}
              {(isAuthenticated || isAdmin) ? (
                <div
                  className="relative"
                  onMouseEnter={() => setShowAccount(true)}
                  onMouseLeave={() => setShowAccount(false)}
                >
                  <button className="flex items-center gap-2 px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium text-white/80 hover:text-primary hover:bg-white/10 transition-colors">
                    <User size={20} />
                    <span className="hidden lg:inline">{isAdmin ? t('nav.admin') : (user?.firstName || t('nav.account'))}</span>
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
                          <div className="font-semibold">{isAdmin ? 'Admin' : (user?.firstName || 'User')}</div>
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
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm hidden sm:block"
                >
                  {t('nav.sign_in')}
                </Link>
              )}

              {/* Cart */}
              <button
                id="cart-btn"
                data-cart-btn
                onClick={() => navigate('/cart')}
                className="relative flex items-center gap-2 p-2 min-h-[44px] text-white/80 hover:text-primary transition-colors rounded-lg hover:bg-white/10"
              >
                <ShoppingCart size={22} />
                {count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-primary text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full animate-count-pulse shadow-glow-orange">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
                <span className="hidden lg:inline text-sm font-medium">{t('nav.cart')}</span>
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-primary transition-colors hover:bg-white/10 rounded-lg"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu — full remaining viewport with safe-area */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden bg-charcoal border-t border-white/10 overflow-hidden"
            >
              <div className="px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] space-y-4"
                style={{ minHeight: 'calc(100dvh - 4rem)', overscrollBehavior: 'contain' }}>
                {/* Mobile Search */}
                <form onSubmit={handleSearch} className="relative">
                  <input
                    type="text"
                    placeholder={t('search.placeholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border-2 border-white/10 bg-white/5 rounded-xl py-3.5 px-4 pl-11 text-sm text-white focus:border-primary outline-none placeholder:text-white/50"
                  />
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
                </form>

                {/* Mobile Currency & Language Switchers */}
                <div className="flex items-center gap-1 border-t border-white/10 pt-3 pb-2">
                  {getSetting('currencySwitcherEnabled', 'true') !== 'false' && <CurrencySwitcher variant="mobile" />}
                  {getSetting('languageSwitcherEnabled', 'true') !== 'false' && <LanguageSwitcher variant="mobile" />}
                </div>

                {/* Mobile Links */}
                <div className="flex flex-col gap-1 pt-2">
                  {isAdmin && (
                    <Link to="/admin" className="px-4 py-3.5 rounded-xl text-sm font-medium text-amber-400 hover:bg-white/10">Admin Dashboard</Link>
                  )}
                  <Link to="/" className="px-4 py-3.5 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10">{t('nav.home')}</Link>
                  <Link to="/products" className="px-4 py-3.5 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10">{t('nav.products')}</Link>
                  {hasActivePromotions && (
                    <Link to="/sales" className="px-4 py-3.5 rounded-xl text-sm font-medium text-red-400 hover:bg-white/10 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                      Sales
                    </Link>
                  )}
                  {/* Custom pages */}
                  {customPages.slice(0, 5).map((page) => (
                    <Link
                      key={page.slug}
                      to={`/pages/${page.slug}`}
                      className="px-4 py-3.5 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10"
                    >
                      {page.title}
                    </Link>
                  ))}
                  <Link to="/wishlist" className="px-4 py-3.5 rounded-xl text-sm font-medium text-white/80 hover:bg-white/10">{t('nav.wishlist')}</Link>
                  {!isAuthenticated && !isAdmin && (
                    <Link to="/login" className="mt-2 text-center py-3 rounded-xl text-sm font-bold bg-primary text-white">{t('nav.sign_in')}</Link>
                  )}
                  {(isAuthenticated || isAdmin) && (
                    <button onClick={async () => { await logout(); localStorage.removeItem('adminToken'); navigate('/'); }} className="mt-2 text-center py-3 rounded-xl text-sm font-bold bg-red-600 text-white">{t('nav.sign_out')}</button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Search Modal */}
      <SearchModal isOpen={showSearchModal} onClose={() => setShowSearchModal(false)} />

    </header>
  );
}
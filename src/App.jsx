import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AnimatePresence } from 'framer-motion';
import { QueryClient, useQuery } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { Toaster } from './utils/toast';
import useAuthStore from './store/authStore';
import useWishlistStore from './store/wishlistStore';
import { wishlistAPI } from './api/wishlist';
import { SettingsProvider } from './store/settingsStore';
import { useSettings } from './store/useSettings';
import { connectSocket, disconnectSocket } from './services/socketService';

import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import CartDrawer from './components/layout/CartDrawer';
import MobileNav from './components/layout/MobileNav';
import AdminSidebar from './components/layout/AdminSidebar';
import ProtectedRoute from './components/auth/ProtectedRoute';
import CookieConsent from './components/common/CookieConsent';
import ScrollToTop from './components/layout/ScrollToTop';
import PageTransition from './components/common/PageTransition';
import SessionTimeoutModal from './components/common/SessionTimeoutModal';
import ErrorBoundary from './components/common/ErrorBoundary';
import { initTracker, trackPageView } from './services/tracker';
import PwaUpdatePrompt from './components/common/PwaUpdatePrompt';
import LiveChatWidget from './components/chat/LiveChatWidget';
import useIdleTimer from './hooks/useIdleTimer';

import { settingsAPI } from './api/settings';

// Storefront pages
import HomePage from './pages/storefront/HomePage';
import ProductsPage from './pages/storefront/ProductsPage';
import ProductDetailPage from './pages/storefront/ProductDetailPage';
import WishlistPage from './pages/storefront/WishlistPage';
import OrdersPage from './pages/storefront/OrdersPage';
import OrderDetailPage from './pages/storefront/OrderDetailPage';
import OrderThankYouPage from './pages/storefront/OrderThankYouPage';
import CheckoutPage from './pages/storefront/CheckoutPage';
import ProfilePage from './pages/storefront/ProfilePage';
import AddressesPage from './pages/storefront/AddressesPage';
import NotificationsPage from './pages/storefront/NotificationsPage';
import AboutPage from './pages/storefront/AboutPage';
import ContactPage from './pages/storefront/ContactPage';
import PrivacyPage from './pages/storefront/PrivacyPage';
import ReturnPolicyPage from './pages/storefront/ReturnPolicyPage';
import CustomPageView from './pages/storefront/CustomPageView';
import SectionProductsPage from './pages/storefront/SectionProductsPage';
import CartPage from './pages/storefront/CartPage';
import TrackOrderPage from './pages/storefront/TrackOrderPage';
import NotFoundPage from './pages/storefront/NotFoundPage';
import MaintenancePage from './pages/storefront/MaintenancePage';
import UnsubscribePage from './pages/storefront/UnsubscribePage';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Admin pages
import DashboardPage from './pages/admin/DashboardPage';
import ProductsAdminPage from './pages/admin/ProductsAdminPage';
import OrdersAdminPage from './pages/admin/OrdersAdminPage';
import OrderDetailAdminPage from './pages/admin/OrderDetailAdminPage';
import UsersAdminPage from './pages/admin/UsersAdminPage';
import CategoriesAdminPage from './pages/admin/CategoriesAdminPage';
import InventoryAdminPage from './pages/admin/InventoryAdminPage';
import CouponsAdminPage from './pages/admin/CouponsAdminPage';
import ReviewsAdminPage from './pages/admin/ReviewsAdminPage';
import PaymentsAdminPage from './pages/admin/PaymentsAdminPage';
import ShippingAdminPage from './pages/admin/ShippingAdminPage';
import NotificationsAdminPage from './pages/admin/NotificationsAdminPage';
import BannersAdminPage from './pages/admin/BannersAdminPage';
import VariantsAdminPage from './pages/admin/VariantsAdminPage';
import AnalyticsAdminPage from './pages/admin/AnalyticsAdminPage';
import SettingsAdminPage from './pages/admin/SettingsAdminPage';
import SEOAdminPage from './pages/admin/SEOAdminPage';
import SEODashboardPage from './pages/admin/SEODashboardPage';
import EmailTemplatesAdminPage from './pages/admin/EmailTemplatesAdminPage';
import BrandsAdminPage from './pages/admin/BrandsAdminPage';

import SupportAdminPage from './pages/admin/SupportAdminPage';
import AbandonedCartsAdminPage from './pages/admin/AbandonedCartsAdminPage';
import PagesAdminPage from './pages/admin/PagesAdminPage';
import PromotionsAdminPage from './pages/admin/PromotionsAdminPage';
import StaffAdminPage from './pages/admin/StaffAdminPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import MarketingAdminPage from './pages/admin/MarketingAdminPage';
import AdsAdminPage from './pages/admin/AdsAdminPage';
import TrackingAdminPage from './pages/admin/TrackingAdminPage';
import ProductImportAdminPage from './pages/admin/ProductImportAdminPage';
import AuditLogAdminPage from './pages/admin/AuditLogAdminPage';
import CuratedLooksAdminPage from './pages/admin/CuratedLooksAdminPage';
import ReelsAdminPage from './pages/admin/ReelsAdminPage';

/* ── Cache version bump — increment to clear all persisted query caches ── */
const CACHE_VERSION = 3;
const CACHE_VERSION_KEY = 'THREVOLT_CACHE_VERSION';

// On boot, clear persisted query cache if the version has changed.
// This ensures returning visitors don't see stale data after cache-invalidating updates.
(() => {
  try {
    const storedVersion = parseInt(localStorage.getItem(CACHE_VERSION_KEY), 10);
    if (storedVersion !== CACHE_VERSION) {
      localStorage.removeItem('THREVOLT_QUERY_CACHE');
      localStorage.setItem(CACHE_VERSION_KEY, String(CACHE_VERSION));
    }
  } catch {
    // localStorage may be unavailable (e.g. private browsing restrictions)
  }
})();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute — re-fetch in background after this time
      gcTime: 1000 * 60 * 10, // 10 minutes — keep in memory cache, don't persist to localStorage
    },
  },
});

const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'THREVOLT_QUERY_CACHE',
  throttleTime: 1000,
});

function MaintenanceWrapper({ children }) {
  const { isAdmin } = useAuthStore();
  const location = useLocation();

  const { data: maintenanceData, isLoading } = useQuery({
    queryKey: ['maintenance-status'],
    queryFn: () => settingsAPI.getMaintenanceStatus(),
    staleTime: 60000,
    retry: false,
  });

  // Never block admin routes — admin login page must be reachable to turn off maintenance
  if (location.pathname.startsWith('/admin')) {
    return children;
  }

  const isMaintenance = maintenanceData?.data?.data?.enabled;

  if (isLoading) {
    return <div className="loading-page"><div className="spinner" /></div>;
  }

  if (isMaintenance && !isAdmin) {
    return <MaintenancePage embedded />;
  }

  return children;
}

function StorefrontLayout() {
  const location = useLocation();
  const { settings: appSettings } = useSettings();
  const chatbotEnabled = appSettings.chatbotEnabled !== 'false';

  // Initialize user tracking on first mount
  useEffect(() => {
    const cleanup = initTracker();
    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Track page views on route change
  useEffect(() => {
    const title = document.title;
    trackPageView(window.location.href, title);
  }, [location.pathname]);

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <Navbar />
      <CartDrawer />
      <main className="flex-1 flex flex-col pb-20">
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>
      <Footer />
      <MobileNav />
      {chatbotEnabled && <LiveChatWidget />}
    </div>
  );
}

function AdminLayout() {
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const { logout } = useAuthStore();

  const handleTimeoutWarning = useCallback(() => {
    setShowTimeoutWarning(true);
  }, []);

  const handleTimeout = useCallback(() => {
    setShowTimeoutWarning(false);
    logout();
  }, [logout]);

  const handleStayLoggedIn = useCallback(() => {
    setShowTimeoutWarning(false);
    resetTimer();
  }, []);

  const { resetTimer } = useIdleTimer({
    idleTimeout: 30 * 60 * 1000,    // 30 min → auto-logout
    warningTimeout: 25 * 60 * 1000,  // 25 min → warning modal
    onWarning: handleTimeoutWarning,
    onTimeout: handleTimeout,
    enabled: true,
  });

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <Navbar />
      <div className="flex flex-col md:flex-row flex-1">
        <AdminSidebar />
        <main className="flex-1 bg-cream p-4 md:p-8"><Outlet /></main>
      </div>
      <SessionTimeoutModal
        open={showTimeoutWarning}
        onStayLoggedIn={handleStayLoggedIn}
      />
    </div>
  );
}

function AppContent() {
  const { settings: appSettings } = useSettings();
  const { isAuthenticated } = useAuthStore();

  // Dynamic title/favicon from settings
  useEffect(() => {
    const name = appSettings.storeName;
    const favicon = appSettings.faviconUrl;
    if (name) document.title = name;
    if (favicon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = favicon;
    }
  }, [appSettings]);

  // Connect/disconnect WebSocket based on auth state
  useEffect(() => {
    if (isAuthenticated || localStorage.getItem('authToken')) {
      connectSocket();
    }
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated]);

  // ── Sync wishlist from server on auth state change ──
  // When the user logs in (or returns with a valid token), replace the local
  // wishlist with the server wishlist (server is the source of truth for
  // authenticated users). Always calls setItems even when empty so guest
  // items from before login don't linger.
  useEffect(() => {
    if (!isAuthenticated) return;

    wishlistAPI.get().then((res) => {
      const serverItems = res?.data?.data?.items || [];
      useWishlistStore.getState().setItems(serverItems);
    }).catch(() => {
      // Server sync failure is silent — local wishlist state remains
    });
  }, [isAuthenticated]);

  return (
    <BrowserRouter>
      <Toaster
        position="bottom-center"
        gutter={16}
        containerClassName="toaster-container"
        toastOptions={{
          className: 'toast-premium',
          duration: 2800,
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            fontWeight: 600,
            background: '#ffffff',
            color: '#1a1a1a',
            borderRadius: '14px',
            padding: '14px 20px',
            boxShadow: '0 12px 48px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)',
            letterSpacing: '0.01em',
            lineHeight: 1.5,
            border: '1px solid rgba(0,0,0,0.1)',
          },
          success: {
            icon: (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="9" cy="9" r="7" fill="#22c55e" />
                <path d="M5.5 9.5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
            style: {
              background: '#ffffff',
              borderLeft: '4px solid #22c55e',
            },
          },
          error: {
            icon: (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="9" cy="9" r="7" fill="#ef4444" />
                <path d="M6.5 6.5l5 5M11.5 6.5l-5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ),
            style: {
              background: '#ffffff',
              borderLeft: '4px solid #ef4444',
            },
          },
        }}
      />
      <CookieConsent />
      <ScrollToTop />
      <MaintenanceWrapper>
      <Routes>
        {/* Auth + Storefront - with Navbar + Footer */}
        <Route element={<StorefrontLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/section/:section" element={<SectionProductsPage />} />
          <Route path="/products/:slug" element={<ProductDetailPage />} />
          <Route path="/track-order" element={<TrackOrderPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
          <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
          <Route path="/order/thank-you/:id" element={<OrderThankYouPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/addresses" element={<ProtectedRoute><AddressesPage /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/privacy-policy" element={<PrivacyPage />} />
          <Route path="/return-policy" element={<ReturnPolicyPage />} />
          <Route path="/pages/:slug" element={<CustomPageView />} />

          {/* Unsubscribe */}
          <Route path="/unsubscribe" element={<UnsubscribePage />} />

          {/* Maintenance Mode */}
          <Route path="/maintenance" element={<MaintenancePage />} />
        </Route>

        {/* Admin Login - Public (standalone, no storefront layout) */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* Admin */}
        <Route element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
          <Route path="/admin" element={<ErrorBoundary title="Dashboard Error" description="The admin dashboard encountered an error. Try refreshing or check the console for details."><DashboardPage /></ErrorBoundary>} />
          <Route path="/admin/analytics" element={<AnalyticsAdminPage />} />
          <Route path="/admin/products" element={<ProductsAdminPage />} />
          <Route path="/admin/products/import" element={<ProductImportAdminPage />} />
          <Route path="/admin/orders" element={<OrdersAdminPage />} />
          <Route path="/admin/orders/:id" element={<OrderDetailAdminPage />} />
          <Route path="/admin/users" element={<UsersAdminPage />} />
          <Route path="/admin/categories" element={<CategoriesAdminPage />} />
          <Route path="/admin/inventory" element={<InventoryAdminPage />} />
          <Route path="/admin/coupons" element={<CouponsAdminPage />} />
          <Route path="/admin/reviews" element={<ReviewsAdminPage />} />
          <Route path="/admin/payments" element={<PaymentsAdminPage />} />
          <Route path="/admin/shipping" element={<ShippingAdminPage />} />
          <Route path="/admin/notifications" element={<NotificationsAdminPage />} />
          <Route path="/admin/banners" element={<BannersAdminPage />} />
          <Route path="/admin/variants" element={<VariantsAdminPage />} />

          <Route path="/admin/support" element={<SupportAdminPage />} />
          <Route path="/admin/abandoned-carts" element={<AbandonedCartsAdminPage />} />
          <Route path="/admin/pages" element={<PagesAdminPage />} />
          <Route path="/admin/promotions" element={<PromotionsAdminPage />} />
          <Route path="/admin/staff" element={<StaffAdminPage />} />
          <Route path="/admin/brands" element={<BrandsAdminPage />} />
          <Route path="/admin/settings" element={<SettingsAdminPage />} />
          <Route path="/admin/seo" element={<SEOAdminPage />} />
          <Route path="/admin/seo/dashboard" element={<SEODashboardPage />} />
          <Route path="/admin/email-templates" element={<EmailTemplatesAdminPage />} />
          <Route path="/admin/marketing" element={<MarketingAdminPage />} />
          <Route path="/admin/ads" element={<AdsAdminPage />} />
          <Route path="/admin/tracking" element={<TrackingAdminPage />} />
          <Route path="/admin/curated-looks" element={<CuratedLooksAdminPage />} />
          <Route path="/admin/reels" element={<ReelsAdminPage />} />
          <Route path="/admin/audit-logs" element={<AuditLogAdminPage />} />
        </Route>

        {/* 404 Catch-all */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      </MaintenanceWrapper>
      <PwaUpdatePrompt />
    </BrowserRouter>
  );
}

export default function App() {
  const { init, loading } = useAuthStore();

  useEffect(() => { init(); }, [init]);

  // Change browser tab title & favicon when user leaves and comes back
  useEffect(() => {
    let originalTitle = document.title;
    let originalFavicon = null;
    let wasHidden = false;

    const comebackFaviconSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="#d4af37" />
        <text x="16" y="22" text-anchor="middle" font-size="20">👋</text>
      </svg>
    `;

    const handleVisibility = () => {
      const faviconEl = document.querySelector("link[rel~='icon']");

      if (document.hidden) {
        wasHidden = true;
        originalTitle = document.title;
        originalFavicon = faviconEl ? faviconEl.href : null;
        document.title = `🔙 Come back to ${originalTitle}!`;
        if (faviconEl) {
          faviconEl.href = 'data:image/svg+xml,' + encodeURIComponent(comebackFaviconSvg);
        }
      } else if (wasHidden) {
        wasHidden = false;
        document.title = originalTitle;
        if (faviconEl && originalFavicon) {
          faviconEl.href = originalFavicon;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.title = originalTitle;
      if (originalFavicon) {
        const faviconEl = document.querySelector("link[rel~='icon']");
        if (faviconEl) faviconEl.href = originalFavicon;
      }
    };
  }, []);

  if (loading) {
    return <div className="loading-page"><div className="spinner" /><p style={{ color: '#8a8a9a', fontFamily: 'Jost, sans-serif', fontWeight: 600 }}>Loading THREVOLT...</p></div>;
  }

  return (
    <HelmetProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={{
          persister: localStoragePersister,
          dehydrateOptions: {
            shouldDehydrateQuery: (query) => {
              const queryKey = query.queryKey;
              if (queryKey?.[0] === 'auth' || queryKey?.[0] === 'maintenance-status' || queryKey?.[0] === 'homepage') {
                return false;
              }
              return query.state.status === 'success';
            },
          },
        }}
      >
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </PersistQueryClientProvider>
    </HelmetProvider>
  );
}

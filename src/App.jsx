import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { QueryClient } from '@tanstack/react-query';
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
import ScrollToTopButton from './components/common/ScrollToTopButton';
import PageTransition from './components/common/PageTransition';
import SessionTimeoutModal from './components/common/SessionTimeoutModal';
import ErrorBoundary from './components/common/ErrorBoundary';
import { initTracker, trackPageView } from './services/tracker';
import { setDefaultCurrency, setDefaultTimezone } from './utils/formatters';
import { initI18nSync, loadApiTranslations } from './utils/i18n';

// Initialize i18n synchronously with English defaults BEFORE the first React render.
// This prevents a flash of raw translation keys in the Navbar on initial page load.
initI18nSync();
import { AppInitProvider, useAppInit } from './contexts/AppInitContext';
import PwaUpdatePrompt from './components/common/PwaUpdatePrompt';
import ThemeInjector from './components/common/ThemeInjector';
import LiveChatWidget from './components/chat/LiveChatWidget';
import WhatsAppChatWidget from './components/chat/WhatsAppChatWidget';
import PhoneLeadBanner from './components/common/PhoneLeadBanner';
import CurrencyProvider from './components/common/CurrencyProvider';
import useIdleTimer from './hooks/useIdleTimer';

// ── Route-level Code Splitting (React.lazy) ──
// Pages are loaded on-demand, reducing the initial JS bundle significantly.

// Storefront pages
const CustomizePage = lazy(() => import('./pages/storefront/CustomizePage'));
const HomePage = lazy(() => import('./pages/storefront/HomePage'));
const ProductsPage = lazy(() => import('./pages/storefront/ProductsPage'));
const ProductDetailPage = lazy(() => import('./pages/storefront/ProductDetailPage'));
const WishlistPage = lazy(() => import('./pages/storefront/WishlistPage'));
const OrdersPage = lazy(() => import('./pages/storefront/OrdersPage'));
const OrderDetailPage = lazy(() => import('./pages/storefront/OrderDetailPage'));
const OrderThankYouPage = lazy(() => import('./pages/storefront/OrderThankYouPage'));
const CheckoutPage = lazy(() => import('./pages/storefront/CheckoutPage'));
const ProfilePage = lazy(() => import('./pages/storefront/ProfilePage'));
const AddressesPage = lazy(() => import('./pages/storefront/AddressesPage'));
const NotificationsPage = lazy(() => import('./pages/storefront/NotificationsPage'));
const AboutPage = lazy(() => import('./pages/storefront/AboutPage'));
const ContactPage = lazy(() => import('./pages/storefront/ContactPage'));
const PrivacyPage = lazy(() => import('./pages/storefront/PrivacyPage'));
const ReturnPolicyPage = lazy(() => import('./pages/storefront/ReturnPolicyPage'));
const CustomPageView = lazy(() => import('./pages/storefront/CustomPageView'));
const SectionProductsPage = lazy(() => import('./pages/storefront/SectionProductsPage'));
const SalesPage = lazy(() => import('./pages/storefront/SalesPage'));
const CartPage = lazy(() => import('./pages/storefront/CartPage'));
const TrackOrderPage = lazy(() => import('./pages/storefront/TrackOrderPage'));
const NotFoundPage = lazy(() => import('./pages/storefront/NotFoundPage'));
// MaintenancePage is eagerly imported — used in MaintenanceWrapper (no Suspense boundary there)
import MaintenancePage from './pages/storefront/MaintenancePage';
const UnsubscribePage = lazy(() => import('./pages/storefront/UnsubscribePage'));
const ReturnsPage = lazy(() => import('./pages/storefront/ReturnsPage'));
const WatchAndBuyPage = lazy(() => import('./pages/storefront/WatchAndBuyPage'));

// MaintenancePage kept as static import — used eagerly in MaintenanceWrapper (outside Suspense)
// Auth pages
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Admin pages
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'));
const ProductsAdminPage = lazy(() => import('./pages/admin/ProductsAdminPage'));
const OrdersAdminPage = lazy(() => import('./pages/admin/OrdersAdminPage'));
const OrderDetailAdminPage = lazy(() => import('./pages/admin/OrderDetailAdminPage'));
const UsersAdminPage = lazy(() => import('./pages/admin/UsersAdminPage'));
const UserDetailAdminPage = lazy(() => import('./pages/admin/UserDetailAdminPage'));
const ProductDetailAdminPage = lazy(() => import('./pages/admin/ProductDetailAdminPage'));
const CategoriesAdminPage = lazy(() => import('./pages/admin/CategoriesAdminPage'));
const InventoryAdminPage = lazy(() => import('./pages/admin/InventoryAdminPage'));
const CouponsAdminPage = lazy(() => import('./pages/admin/CouponsAdminPage'));
const ReviewsAdminPage = lazy(() => import('./pages/admin/ReviewsAdminPage'));
const ReviewDetailAdminPage = lazy(() => import('./pages/admin/ReviewDetailAdminPage'));
const PaymentsAdminPage = lazy(() => import('./pages/admin/PaymentsAdminPage'));
const ShippingAdminPage = lazy(() => import('./pages/admin/ShippingAdminPage'));
const NotificationsAdminPage = lazy(() => import('./pages/admin/NotificationsAdminPage'));
const BannersAdminPage = lazy(() => import('./pages/admin/BannersAdminPage'));
const VariantsAdminPage = lazy(() => import('./pages/admin/VariantsAdminPage'));
const AnalyticsAdminPage = lazy(() => import('./pages/admin/AnalyticsAdminPage'));
const SettingsAdminPage = lazy(() => import('./pages/admin/SettingsAdminPage'));
const SEOAdminPage = lazy(() => import('./pages/admin/SEOAdminPage'));
const SEODashboardPage = lazy(() => import('./pages/admin/SEODashboardPage'));
const EmailTemplatesAdminPage = lazy(() => import('./pages/admin/EmailTemplatesAdminPage'));
const NotificationTemplatesAdminPage = lazy(() => import('./pages/admin/NotificationTemplatesAdminPage'));
const BrandsAdminPage = lazy(() => import('./pages/admin/BrandsAdminPage'));

const SupportAdminPage = lazy(() => import('./pages/admin/SupportAdminPage'));
const AbandonedCartsAdminPage = lazy(() => import('./pages/admin/AbandonedCartsAdminPage'));
const PagesAdminPage = lazy(() => import('./pages/admin/PagesAdminPage'));
const PromotionsAdminPage = lazy(() => import('./pages/admin/PromotionsAdminPage'));
const StaffAdminPage = lazy(() => import('./pages/admin/StaffAdminPage'));
const AdminLoginPage = lazy(() => import('./pages/admin/AdminLoginPage'));
const MarketingAdminPage = lazy(() => import('./pages/admin/MarketingAdminPage'));
const AdsAdminPage = lazy(() => import('./pages/admin/AdsAdminPage'));
const TrackingAdminPage = lazy(() => import('./pages/admin/TrackingAdminPage'));
const ProductImportAdminPage = lazy(() => import('./pages/admin/ProductImportAdminPage'));
const AuditLogAdminPage = lazy(() => import('./pages/admin/AuditLogAdminPage'));
const LogViewerAdminPage = lazy(() => import('./pages/admin/LogViewerAdminPage'));
const CuratedLooksAdminPage = lazy(() => import('./pages/admin/CuratedLooksAdminPage'));
const ReelsAdminPage = lazy(() => import('./pages/admin/ReelsAdminPage'));
const TranslationsAdminPage = lazy(() => import('./pages/admin/TranslationsAdminPage'));
const CampaignTemplatesAdminPage = lazy(() => import('./pages/admin/CampaignTemplatesAdminPage'));
const CurrencyAdminPage = lazy(() => import('./pages/admin/CurrencyAdminPage'));
const CustomDesignsAdminPage = lazy(() => import('./pages/admin/CustomDesignsAdminPage'));
const ReturnsAdminPage = lazy(() => import('./pages/admin/ReturnsAdminPage'));
const TaxAdminPage = lazy(() => import('./pages/admin/TaxAdminPage'));
const SmsAdminPage = lazy(() => import('./pages/admin/SmsAdminPage'));
const WebhooksAdminPage = lazy(() => import('./pages/admin/WebhooksAdminPage'));
const QueueMonitorAdminPage = lazy(() => import('./pages/admin/QueueMonitorAdminPage'));
const BackupsAdminPage = lazy(() => import('./pages/admin/BackupsAdminPage'));

// ── Route Loading Fallback ──
function RouteFallback() {
  return (
    <div className="loading-page" style={{ minHeight: '60vh' }}>
      <div className="spinner" />
    </div>
  );
}

/* ── Cache version bump — increment to clear all persisted query caches ── */
const CACHE_VERSION = 4;
const STORAGE_PREFIX = 'THREVOLT';
const CACHE_VERSION_KEY = `${STORAGE_PREFIX}_CACHE_VERSION`;
const QUERY_CACHE_KEY = `${STORAGE_PREFIX}_QUERY_CACHE`;
const DEFAULT_LOADING_NAME = 'THREVOLT';

// On boot, clear persisted query cache if the version has changed.
// This ensures returning visitors don't see stale data after cache-invalidating updates.
(() => {
  try {
    const storedVersion = parseInt(localStorage.getItem(CACHE_VERSION_KEY), 10);
    if (storedVersion !== CACHE_VERSION) {
      localStorage.removeItem(QUERY_CACHE_KEY);
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
  key: QUERY_CACHE_KEY,
  throttleTime: 1000,
});

function MaintenanceWrapper({ children }) {
  const { isAdmin } = useAuthStore();
  const location = useLocation();
  const { data: appInitData, loading: appInitLoading } = useAppInit();

  // Never block admin routes — admin login page must be reachable to turn off maintenance
  if (location.pathname.startsWith('/admin')) {
    return children;
  }

  const isMaintenance = appInitData?.maintenance?.enabled;

  if (appInitLoading) {
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
  const whatsappEnabled = appSettings.whatsappButtonEnabled !== 'false';
  const whatsappNumber = appSettings.whatsappButtonNumber || '';
  const whatsappMessage = appSettings.whatsappButtonMessage || '';
  const whatsappPosition = appSettings.whatsappButtonPosition || 'left';
  const brandPrimaryColor = appSettings.primaryColor || '#1a1a1a';
  // Parse quick replies from settings (JSON string), or undefined to use widget defaults
  let whatsappQuickReplies;
  try {
    const parsed = JSON.parse(appSettings.whatsappQuickReplies || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) {
      whatsappQuickReplies = parsed;
    }
  } catch {}

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
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </PageTransition>
        </AnimatePresence>
      </main>
      <Footer />
      <MobileNav />
      <PhoneLeadBanner />
      {chatbotEnabled && <LiveChatWidget />}
      {location.pathname === '/' && whatsappEnabled && whatsappNumber && <WhatsAppChatWidget phoneNumber={whatsappNumber} message={whatsappMessage || undefined} position={whatsappPosition} quickReplies={whatsappQuickReplies} />}
      <ScrollToTopButton />
    </div>
  );
}

function AdminLayout() {
  // ── Responsive Table Labels ──
  // Reads <th> headers from table.admin-table and injects data-label
  // into matching <td> cells so mobile card CSS can show column labels.
  // useRef guard skips re-processing if table count hasn't changed.
  const tableCountRef = useRef(0);
  useEffect(() => {
    const tables = document.querySelectorAll('table.admin-table');
    if (!tables.length) return;
    const count = tables.length;
    if (count === tableCountRef.current) return;
    tableCountRef.current = count;

    tables.forEach(table => {
      const headerCells = table.querySelectorAll('thead th');
      if (!headerCells.length) return;
      const rows = table.querySelectorAll('tbody tr');
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        cells.forEach((cell, idx) => {
          if (cell.hasAttribute('colspan')) return;
          if (cell.hasAttribute('data-label')) return;
          const header = headerCells[idx];
          if (header) {
            cell.setAttribute('data-label', header.textContent.trim());
          }
        });
      });
    });
  });
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const { logout } = useAuthStore();

  const handleTimeoutWarning = useCallback(() => {
    setShowTimeoutWarning(true);
  }, []);

  const handleTimeout = useCallback(() => {
    setShowTimeoutWarning(false);
    logout();
  }, [logout]);

  const { resetTimer } = useIdleTimer({
    idleTimeout: 8 * 60 * 60 * 1000,        // 8 hr → auto-logout
    warningTimeout: 7 * 60 * 60 * 1000 + 55 * 60 * 1000, // 7h55m → warning modal (5 min heads-up)
    onWarning: handleTimeoutWarning,
    onTimeout: handleTimeout,
    enabled: true,
  });

  const handleStayLoggedIn = useCallback(() => {
    setShowTimeoutWarning(false);
    resetTimer();
  }, [resetTimer]);

  return (
    <div className="flex flex-col min-h-[100dvh]">
      <Navbar />
      <div className="flex flex-col md:flex-row flex-1">
        <AdminSidebar />
        <main className="flex-1 bg-cream p-4 md:p-8">
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </main>
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
  const tokenVersion = useAuthStore((s) => s._tokenVersion);

  // Load API translations asynchronously after the first render
  useEffect(() => {
    loadApiTranslations().catch(() => {
      // Silently fail — app already has default English translations
    });
  }, [loadApiTranslations]);

  // Dynamic title/favicon/currency from settings
  useEffect(() => {
    const name = appSettings.storeName;
    const favicon = appSettings.faviconUrl;
    const currency = appSettings.currency;
    const timezone = appSettings.timezone;
    if (name) document.title = name;
    if (currency) setDefaultCurrency(currency);
    if (timezone) setDefaultTimezone(timezone);
    if (favicon) {
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = favicon;
    }
  }, [appSettings, setDefaultCurrency, setDefaultTimezone]);

  // Connect/disconnect WebSocket based on auth state and token version
  // The tokenVersion dependency ensures the socket reconnects with a fresh
  // JWT when the token is silently refreshed (e.g. OAuth redirect, refresh flow).
  useEffect(() => {
    if (isAuthenticated || localStorage.getItem('authToken')) {
      connectSocket();
    }
    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, tokenVersion, connectSocket, disconnectSocket]);

  // ── Sync wishlist from server on auth state change ──
  useEffect(() => {
    if (!isAuthenticated) return;

    wishlistAPI.get().then((res) => {
      const serverItems = res?.data?.data?.items || [];
      useWishlistStore.getState().setItems(serverItems);
    }).catch(() => {
      // Server sync failure is silent — local wishlist state remains
    });
  }, [isAuthenticated, wishlistAPI, useWishlistStore]);

  return (
    <BrowserRouter>
      <ThemeInjector />
      <Toaster
        position="top-center"
        gutter={12}
        containerClassName="toaster-container"
        reverseOrder={false}
        toastOptions={{
          className: 'toast-premium',
          duration: 2800,
          style: {
            fontFamily: 'var(--font-body)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: '#1a1a1a',
            borderRadius: '16px',
            padding: '14px 20px 18px',
            boxShadow: '0 12px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)',
            letterSpacing: '0.01em',
            lineHeight: 1.5,
          },
          success: {
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="10" cy="10" r="8" fill="#22c55e" />
                <path d="M6 10.5l2.5 2.5 5-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ),
            style: {
              borderLeft: '4px solid #22c55e',
            },
          },
          error: {
            icon: (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="10" cy="10" r="8" fill="#ef4444" />
                <path d="M7 7l6 6M13 7l-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ),
            style: {
              borderLeft: '4px solid #ef4444',
            },
          },
        }}
      />
      <CookieConsent enabled={appSettings.cookieConsentEnabled !== 'false'} />
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
          {/* Custom tee design product — redirect to the customize page */}
          <Route path="/products/custom-t-shirt-design" element={<Navigate to="/customize" replace />} />
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
          <Route path="/returns" element={<ProtectedRoute><ReturnsPage /></ProtectedRoute>} />
          <Route path="/customize" element={<CustomizePage />} />
          <Route path="/watch-and-buy" element={<WatchAndBuyPage />} />
          <Route path="/sales" element={<SalesPage />} />
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
          <Route path="/admin/analytics" element={<ErrorBoundary title="Analytics Error" description="The analytics page encountered an error. Try refreshing or check the console for details."><AnalyticsAdminPage /></ErrorBoundary>} />
          <Route path="/admin/products" element={<ProductsAdminPage />} />
          <Route path="/admin/products/import" element={<ProductImportAdminPage />} />
          <Route path="/admin/products/:id" element={<ProductDetailAdminPage />} />
          <Route path="/admin/orders" element={<OrdersAdminPage />} />
          <Route path="/admin/orders/:id" element={<OrderDetailAdminPage />} />
          <Route path="/admin/users" element={<UsersAdminPage />} />
          <Route path="/admin/users/:id" element={<UserDetailAdminPage />} />
          <Route path="/admin/categories" element={<CategoriesAdminPage />} />
          <Route path="/admin/inventory" element={<InventoryAdminPage />} />
          <Route path="/admin/coupons" element={<CouponsAdminPage />} />
          <Route path="/admin/reviews" element={<ReviewsAdminPage />} />
          <Route path="/admin/reviews/:id" element={<ReviewDetailAdminPage />} />
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
          <Route path="/admin/notification-templates" element={<NotificationTemplatesAdminPage />} />
          <Route path="/admin/email-templates" element={<EmailTemplatesAdminPage />} />
          <Route path="/admin/marketing" element={<MarketingAdminPage />} />
          <Route path="/admin/ads" element={<AdsAdminPage />} />
          <Route path="/admin/tracking" element={<TrackingAdminPage />} />
          <Route path="/admin/curated-looks" element={<CuratedLooksAdminPage />} />
          <Route path="/admin/reels" element={<ReelsAdminPage />} />
          <Route path="/admin/custom-designs" element={<CustomDesignsAdminPage />} />
          <Route path="/admin/returns" element={<ReturnsAdminPage />} />
          <Route path="/admin/campaign-templates" element={<CampaignTemplatesAdminPage />} />
          <Route path="/admin/currencies" element={<CurrencyAdminPage />} />
          <Route path="/admin/translations" element={<TranslationsAdminPage />} />
          <Route path="/admin/tax" element={<TaxAdminPage />} />
          <Route path="/admin/sms" element={<SmsAdminPage />} />
          <Route path="/admin/backups" element={<BackupsAdminPage />} />
          <Route path="/admin/queue" element={<QueueMonitorAdminPage />} />
          <Route path="/admin/webhooks" element={<WebhooksAdminPage />} />
          <Route path="/admin/audit-logs" element={<AuditLogAdminPage />} />
          <Route path="/admin/logs" element={<LogViewerAdminPage />} />
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

  // Initialize auth — check for existing token and fetch user data
  useEffect(() => { init(); }, [init]);

  // In dev mode, unregister any stale service worker that may have been
  // cached from a previous production build — prevents CORB warnings when
  // the SW intercepts cross-origin requests (images, fonts, etc.).
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      }).catch(() => {});
    }
  }, []);

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
        document.title = `\u{1F519} Come back to ${originalTitle}!`;
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
    return <div className="loading-page"><div className="spinner" /><p style={{ color: '#8a8a9a', fontFamily: 'Jost, sans-serif', fontWeight: 600 }}>Loading {DEFAULT_LOADING_NAME}...</p></div>;
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
              if (queryKey?.[0] === 'auth' || queryKey?.[0] === 'homepage') {
                return false;
              }
              return query.state.status === 'success';
            },
          },
        }}
      >
        <AppInitProvider>
        <SettingsProvider>
          <CurrencyProvider>
            <MotionConfig reducedMotion="user">
              <AppContent />
            </MotionConfig>
          </CurrencyProvider>
        </SettingsProvider>
        </AppInitProvider>
      </PersistQueryClientProvider>
    </HelmetProvider>
  );
}

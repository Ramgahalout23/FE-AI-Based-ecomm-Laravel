/**
 * User Tracking Service
 * Manages sessions, page views, and event tracking for user behavior analytics.
 * Handles both authenticated and anonymous users with session-based tracking.
 */

import { trackingAPI } from '../api/tracking';

const TRACKING_ENABLED_KEY = '_trk_enabled';
const SESSION_KEY = '_trk_session';
const SESSION_START_KEY = '_trk_session_start';

// Debounce rapid page navigations
const PAGEVIEW_DEBOUNCE_MS = 500;
// Batch events and flush every N seconds
const BATCH_FLUSH_INTERVAL = 5000;

// ── Helpers ──

function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getSessionId() {
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = generateId();
    sessionStorage.setItem(SESSION_KEY, id);
    sessionStorage.setItem(SESSION_START_KEY, String(Date.now()));
  }
  return id;
}

function getUserId() {
  try {
    const authStr = localStorage.getItem('auth-storage');
    if (authStr) {
      const auth = JSON.parse(authStr);
      return auth?.state?.user?.id || null;
    }
    // Fallback: try to decode JWT
    const token = localStorage.getItem('authToken');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.id || payload?.sub || null;
    }
  } catch {
    // Not authenticated
  }
  return null;
}

function getDeviceInfo() {
  const ua = navigator.userAgent;
  let device = 'Desktop';
  let os = 'Unknown';
  let browser = 'Unknown';

  if (/Mobi|Android|iPhone|iPad/i.test(ua)) device = 'Mobile';
  if (/iPad/i.test(ua)) device = 'Tablet';

  if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iOS|iPhone|iPad/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = 'Chrome';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Safari/i.test(ua)) browser = 'Safari';
  else if (/Edg/i.test(ua)) browser = 'Edge';

  return { device, os, browser };
}

// ── Event Batching ──

let eventBatch = [];
let batchTimer = null;

function flushBatch() {
  if (eventBatch.length === 0) return;
  const batch = [...eventBatch];
  eventBatch = [];
  // Send each event individually (POST /event handles one at a time)
  batch.forEach((evt) => {
    trackingAPI.recordEvent(evt).catch(() => {
      // Silently fail - don't disrupt user experience
    });
  });
}

function scheduleBatchFlush() {
  if (batchTimer) clearTimeout(batchTimer);
  batchTimer = setTimeout(flushBatch, BATCH_FLUSH_INTERVAL);
}

function queueEvent(eventData) {
  if (!isTrackingEnabled()) return;
  eventBatch.push(eventData);
  scheduleBatchFlush();
}

// ── Tracking Controls ──

export function isTrackingEnabled() {
  return localStorage.getItem(TRACKING_ENABLED_KEY) !== 'false';
}

export function enableTracking() {
  localStorage.setItem(TRACKING_ENABLED_KEY, 'true');
}

export function disableTracking() {
  localStorage.setItem(TRACKING_ENABLED_KEY, 'false');
  flushBatch();
}

// ── Session Management ──

let sessionCreated = false;

export function createTrackingSession() {
  if (sessionCreated) return;
  sessionCreated = true;

  const sessionId = getSessionId();
  const userId = getUserId();
  const deviceInfo = getDeviceInfo();

  trackingAPI
    .createSession({
      session_id: sessionId,
      user_id: userId,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      os: deviceInfo.os,
      referrer: document.referrer || null,
      landing_page: window.location.href,
      user_agent: navigator.userAgent,
    })
    .catch(() => {
      // Silently fail
    });
}

export function endTrackingSession() {
  const sessionId = sessionStorage.getItem(SESSION_KEY);
  if (sessionId) {
    trackingAPI.endSession(sessionId).catch(() => {});
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_START_KEY);
    sessionCreated = false;
  }
  flushBatch();
}

// ── Page View Tracking ──

let lastPageViewUrl = '';
let lastPageViewTime = 0;
let pageViewTimer = null;

export function trackPageView(url, title) {
  if (!isTrackingEnabled()) return;

  // Ensure session is created
  if (!sessionCreated) createTrackingSession();

  // Debounce rapid navigations
  const now = Date.now();
  if (url === lastPageViewUrl && now - lastPageViewTime < PAGEVIEW_DEBOUNCE_MS) {
    return;
  }

  lastPageViewUrl = url;
  lastPageViewTime = now;

  const sessionId = getSessionId();
  const userId = getUserId();

  // Delay tracking to measure time on page
  if (pageViewTimer) clearTimeout(pageViewTimer);

  pageViewTimer = setTimeout(() => {
    trackingAPI
      .recordPageView({
        session_id: sessionId,
        user_id: userId,
        url,
        title: title || document.title,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent,
        device: getDeviceInfo().device,
      })
      .catch(() => {});
  }, 500); // Track after 500ms on the page
}

// ── Event Tracking ──

export function trackEvent(eventType, eventName, data = {}) {
  if (!isTrackingEnabled()) return;

  const sessionId = getSessionId();
  const userId = getUserId();

  // Send rich event fields as individual snake_case params + event_data JSON backup
  queueEvent({
    session_id: sessionId,
    user_id: userId,
    event_type: eventName || eventType,
    event_name: eventName || null,
    category: data.category || null,
    label: data.label || null,
    value: data.value || null,
    url: data.url || window.location.href,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
  });
}

// ── Predefined Events ──

export function trackProductView(productId, productName, category) {
  trackEvent('view', 'product_view', {
    label: productId,
    value: productName,
    category,
    metadata: { productId, productName },
  });
}

export function trackAddToCart(productId, productName, quantity, price) {
  trackEvent('cart', 'add_to_cart', {
    label: productId,
    value: productName,
    metadata: { productId, productName, quantity, price },
  });
}

export function trackRemoveFromCart(productId, productName) {
  trackEvent('cart', 'remove_from_cart', {
    label: productId,
    value: productName,
    metadata: { productId, productName },
  });
}

export function trackSearch(query, resultsCount) {
  trackEvent('search', 'search_query', {
    label: query,
    value: String(resultsCount),
    metadata: { query, resultsCount },
  });
}

export function trackCheckoutStart(orderValue, itemCount) {
  trackEvent('conversion', 'checkout_start', {
    value: String(orderValue),
    metadata: { orderValue, itemCount },
  });
}

export function trackCheckoutComplete(orderId, orderValue) {
  trackEvent('conversion', 'checkout_complete', {
    label: orderId,
    value: String(orderValue),
    metadata: { orderId, orderValue },
  });
}

export function trackSignUp(method) {
  trackEvent('auth', 'sign_up', {
    category: method,
    metadata: { method },
  });
}

export function trackLogin(method) {
  trackEvent('auth', 'login', {
    category: method,
    metadata: { method },
  });
}

export function trackWishlistAdd(productId, productName) {
  trackEvent('wishlist', 'add_to_wishlist', {
    label: productId,
    value: productName,
    metadata: { productId, productName },
  });
}

// ── Initialize ──

export function initTracker() {
  if (!isTrackingEnabled()) return;

  // Clean up orphaned localStorage keys from previous versions
  localStorage.removeItem('_trk_visitor');

  // Create initial session
  createTrackingSession();

  // End session on tab/browser close
  const handleBeforeUnload = () => {
    endTrackingSession();
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  // Note: initial page view is tracked by the StorefrontLayout useEffect([location.pathname])
  // which fires on first render, so we don't call trackPageView here to avoid duplicates.

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    if (batchTimer) clearTimeout(batchTimer);
    flushBatch();
  };
}

export default {
  initTracker,
  trackPageView,
  trackEvent,
  trackProductView,
  trackAddToCart,
  trackRemoveFromCart,
  trackSearch,
  trackCheckoutStart,
  trackCheckoutComplete,
  trackSignUp,
  trackLogin,
  trackWishlistAdd,
  createTrackingSession,
  endTrackingSession,
  enableTracking,
  disableTracking,
  isTrackingEnabled,
};

import axios from 'axios';
import useSessionStore from '../store/sessionStore';

// ── API Base URLs ──
// Main storefront API → Node.js backend (port 3000 via Vite proxy in dev, proxied via vercel.json in production)
const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Admin API → same Node.js backend
const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_BASE_URL || API_BASE;

// Production (Render.com) needs longer timeout due to cold-start spin-up (30-60s)
const isProduction = API_BASE.includes('onrender.com') || API_BASE.includes('https://') || (!API_BASE.includes('localhost') && API_BASE.startsWith('/'));
const REQUEST_TIMEOUT = isProduction ? 60000 : 15000;
const MAX_RETRIES = isProduction ? 2 : 0;

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: REQUEST_TIMEOUT,
});

// ── Shared token refresh ──
// The storefront (`client`) and admin (`adminClient`) axios instances share ONE
// Laravel Sanctum token — AdminLoginPage stores the same value in both
// `adminToken` and `authToken`. The Laravel refresh-token endpoint REVOKES the
// current token and issues a new one, so refreshing it from two independent
// places races: the first refresh revokes the token, the second 401s and wipes
// the session (the old code had separate promises AND only updated `authToken`,
// leaving `adminToken` pointing at a revoked token — which logged admins out on
// the next reload). A single in-flight promise, shared by both clients, means
// concurrent 401s produce exactly ONE refresh that atomically updates both keys.
let refreshPromise = null;

export async function refreshSharedToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    // authToken is the canonical key — adminToken mirrors it. Preferring
    // authToken avoids using a stale/revoked adminToken left behind by an
    // older session.
    const currentToken = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
    if (!currentToken) throw new Error('No auth token to refresh');

    // Send the current Bearer token to Laravel's refresh-token endpoint
    const { data } = await axios.post(`${API_BASE}/auth/refresh-token`, {}, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    const payload = data?.data || data || {};
    const newToken = payload?.token || payload?.accessToken;

    if (!newToken) throw new Error('No access token in refresh response');

    // Update BOTH storage keys atomically so the storefront and admin clients
    // never hold divergent tokens.
    localStorage.setItem('authToken', newToken);
    localStorage.setItem('adminToken', newToken);

    // Record the refresh for the sidebar session indicator, and remember the
    // new token's expiry so the admin countdown banner can warn before it runs out.
    useSessionStore.getState().recordTokenRefresh();
    useSessionStore.getState().setTokenExpiry(payload?.expires_at ?? null);

    return newToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Log database connection errors to the browser developer console
 * with a formatted group for easy debugging.
 */
function logDbError(error) {
  if (error.response?.data?.error === 'database_connection_failed') {
    const dbError = error.response.data;
    console.group('%c🔴 Database Connection Error', 'color: #ef4444; font-size: 14px; font-weight: bold;');
    console.error('Message:', dbError.message);
    if (dbError.debug) {
      console.table(dbError.debug);
    }
    console.groupEnd();
  }
}

function clearAuthAndRedirect() {
  const isAdminArea =
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/admin');

  localStorage.removeItem('authToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('adminToken');

  const loginPath = isAdminArea ? '/admin/login' : '/login';
  if (typeof window !== 'undefined' && window.location.pathname !== loginPath) {
    window.location.href = loginPath;
  }
}

function shouldSkipAuthRetry(url) {
  return url?.includes('/auth/login') || url?.includes('/auth/register');
}

/**
 * Create a response interceptor that handles 401 errors by attempting a token refresh.
 * Accepts a custom refresh function so that storefront (JWT) and admin (Sanctum)
 * can each refresh against their own backend.
 */
export function createAuthErrorHandler(axiosInstance, refreshFn) {
  return async (error) => {
    const original = error.config;
    if (shouldSkipAuthRetry(original?.url)) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const newAccess = await refreshFn();
        original.headers.Authorization = `Bearer ${newAccess}`;
        return axiosInstance(original);
      } catch {
        clearAuthAndRedirect();
      }
    }
    return Promise.reject(error);
  };
}

// Request interceptor — attach auth token (fall back to adminToken so an
// admin reload still authenticates /auth/me even if authToken was lost)
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle timeout retries, then 401 / token refresh + log DB errors
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    // Retry on timeout/abort (Render cold start)
    const original = error.config;
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message?.includes('aborted');
    if (isTimeout) {
      original._retryCount = (original._retryCount || 0) + 1;
      if (original._retryCount <= MAX_RETRIES) {
        const delay = 2000 * Math.pow(2, original._retryCount - 1);
        await new Promise((r) => setTimeout(r, delay));
        original.timeout = REQUEST_TIMEOUT;
        return client(original);
      }
    }
    logDbError(error);
    return createAuthErrorHandler(client, refreshSharedToken)(error);
  }
);

// ── Admin Client → Laravel API ──
// Uses separate ADMIN_API_BASE that points to Laravel (port 8000) via Vite proxy.
//
// ! XSS NOTE — Both adminToken and authToken use localStorage. For production
// hardening, migrate to httpOnly cookies via Sanctum SPA auth.
// Laravel's AdminRepository already has:
//   - Cache::remember() with 300s TTL on all dashboard/analytics queries
//   - Single optimized SQL with subselects for dashboard metrics
//   - SQL-level aggregation (DB::raw, GROUP BY, EXTRACT) — no in-memory grouping
//   - No blocking external service checks in health
// This makes admin dashboard loads significantly faster than Node.js.
export const adminClient = axios.create({
  baseURL: ADMIN_API_BASE,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

adminClient.interceptors.request.use((config) => {
  // authToken is canonical (adminToken mirrors it) — prevents a stale
  // adminToken from an older session from sending a revoked token.
  const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Admin client 401 interceptor — shares the SAME refresh promise as the
// storefront client, since both clients authenticate with the same token.
adminClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    // Retry on timeout/abort (Render cold start)
    const original = error.config;
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout') || error.message?.includes('aborted');
    if (isTimeout) {
      original._retryCount = (original._retryCount || 0) + 1;
      if (original._retryCount <= MAX_RETRIES) {
        const delay = 2000 * Math.pow(2, original._retryCount - 1);
        await new Promise((r) => setTimeout(r, delay));
        original.timeout = REQUEST_TIMEOUT;
        return adminClient(original);
      }
    }
    logDbError(error);
    return createAuthErrorHandler(adminClient, refreshSharedToken)(error);
  }
);

export default client;

import axios from 'axios';

// ── API Base URLs ──
// Main storefront API → Laravel (port 8000 via Vite proxy in dev, same-domain in production)
const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api/v1';

// Admin API → Laravel (port 8000 via Vite proxy in dev, same-domain in production)
// Laravel already has efficient caching (Cache::remember 300s), optimized SQL aggregation,
// and NO blocking external service calls in health checks.
const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_BASE_URL || '/api/v1';

const client = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Shared refresh promises — separate for Node.js (storefront) and Laravel (admin)
let refreshPromise = null;
let adminRefreshPromise = null;

/**
 * Refresh storefront token via Laravel Sanctum.
 * Sends the current Bearer token to the refresh-token endpoint (under auth:sanctum
 * middleware), which revokes the old token and issues a new one.
 */
async function refreshAuthToken() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const currentToken = localStorage.getItem('authToken');
    if (!currentToken) throw new Error('No auth token to refresh');

    const { data } = await axios.post(`${API_BASE}/auth/refresh-token`, {}, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    const payload = data?.data || data || {};
    const newToken = payload?.token || payload?.accessToken;

    if (!newToken) throw new Error('No access token in refresh response');

    localStorage.setItem('authToken', newToken);
    return newToken;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

/**
 * Refresh admin token via Laravel backend (Sanctum-based).
 * Unlike the Node.js refresh, the Laravel endpoint requires a valid Bearer token
 * (under auth:sanctum middleware), not a separate refresh token. It revokes the
 * current token and issues a new one.
 */
async function refreshAdminToken() {
  if (adminRefreshPromise) return adminRefreshPromise;

  adminRefreshPromise = (async () => {
    const currentToken = localStorage.getItem('adminToken') || localStorage.getItem('authToken');
    if (!currentToken) throw new Error('No admin token to refresh');

    // Send current Bearer token to Laravel's refresh-token endpoint
    const { data } = await axios.post(`${ADMIN_API_BASE}/auth/refresh-token`, {}, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });
    const payload = data?.data || data || {};
    const newToken = payload?.token || payload?.accessToken;

    if (!newToken) throw new Error('No token in admin refresh response');

    localStorage.setItem('adminToken', newToken);
    localStorage.setItem('authToken', newToken);
    return newToken;
  })();

  try {
    return await adminRefreshPromise;
  } finally {
    adminRefreshPromise = null;
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
function createAuthErrorHandler(axiosInstance, refreshFn) {
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

// Request interceptor — attach auth token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — handle 401 / token refresh + log DB errors
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    logDbError(error);
    return createAuthErrorHandler(client, refreshAuthToken)(error);
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
});

adminClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Admin client 401 interceptor — uses Laravel-specific Sanctum token refresh + log DB errors
adminClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    logDbError(error);
    return createAuthErrorHandler(adminClient, refreshAdminToken)(error);
  }
);

export default client;

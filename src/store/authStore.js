import { create } from 'zustand';
import { authAPI } from '../api/auth';
import { cartAPI } from '../api/cart';
import useCartStore from './cartStore';
import { showError } from '../utils/toast';

// Backend envelope shape: { success, statusCode, message, data: {...} }
// Login/register data: { user, tokens: { accessToken, refreshToken } }
// getMe data: { user } (or just the user object — both tolerated)
function unwrap(res) {
  const body = res?.data;
  return body?.data ?? body ?? {};
}
function pickToken(payload) {
  return (
    payload?.tokens?.accessToken ||
    payload?.accessToken ||
    payload?.token ||
    null
  );
}
function pickRefresh(payload) {
  return (
    payload?.tokens?.refreshToken ||
    payload?.refreshToken ||
    null
  );
}
function pickUser(payload) {
  if (!payload) return null;
  // If payload has a `user` field, use it; otherwise assume payload IS the user.
  return payload.user || (payload.email || payload.id ? payload : null);
}

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  loading: true,
  _tokenVersion: 0,

  init: async () => {
    // Track whether this is an OAuth redirect so we know to merge guest cart
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get('token');
    const oauthRefresh = params.get('refresh');
    const isOAuthRedirect = !!oauthToken;
    if (oauthToken) {
      localStorage.setItem('authToken', oauthToken);
      if (oauthRefresh) localStorage.setItem('refreshToken', oauthRefresh);
      // Clean up URL without page reload
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
      set({ _tokenVersion: get()._tokenVersion + 1 });
    }

    const token = localStorage.getItem('authToken');
    if (!token) { set({ loading: false }); return; }
    try {
      const res = await authAPI.getMe();
      const payload = unwrap(res);
      const user = pickUser(payload);
      set({
        user,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
        loading: false,
      });

      // If the user just authenticated via OAuth, merge any guest cart items
      if (isOAuthRedirect) {
        await mergeGuestCart();
      }
    } catch (err) {
      // Only clear auth on 401 (unauthorized) — transient network/server errors
      // should not log the user out automatically.
      const status = err?.response?.status;
      if (status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, isAuthenticated: false, isAdmin: false, loading: false });
      } else {
        // For network/server errors, keep the existing state — the user is still
        // authenticated, just temporarily unable to reach the server.
        set({ loading: false });
      }
    }
  },

  login: async (credentials) => {
    const res = await authAPI.login(credentials);
    const payload = unwrap(res);
    const token = pickToken(payload);
    const refresh = pickRefresh(payload);
    if (!token) {
      throw new Error('No access token in login response');
    }
    localStorage.setItem('authToken', token);
    if (refresh) localStorage.setItem('refreshToken', refresh);
    const user = pickUser(payload);
    set({
      user,
      isAuthenticated: true,
      isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
      _tokenVersion: get()._tokenVersion + 1,
    });

    // Merge guest cart items into server cart after login
    await mergeGuestCart();

    return payload;
  },

  register: async (userData) => {
    const res = await authAPI.register(userData);
    const payload = unwrap(res);
    const token = pickToken(payload);
    const refresh = pickRefresh(payload);
    if (token) {
      localStorage.setItem('authToken', token);
      if (refresh) localStorage.setItem('refreshToken', refresh);
      const user = pickUser(payload);
      set({
        user,
        isAuthenticated: true,
        isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
        _tokenVersion: get()._tokenVersion + 1,
      });

      // Merge guest cart items into server cart after registration
      await mergeGuestCart();
    }
    return payload;
  },

  logout: async () => {
    try { await authAPI.logout(); } catch { /* ignore — local logout still works */ }
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    // ! XSS NOTE — adminToken in localStorage is accessible to any JS.
    // For production, migrate to httpOnly cookies via Sanctum SPA auth.
    localStorage.removeItem('adminToken');
    set({ user: null, isAuthenticated: false, isAdmin: false, _tokenVersion: get()._tokenVersion + 1 });
  },

  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
  }),
}));

/**
 * Merge guest localStorage cart items into the server-side cart.
 * Called automatically after login/register to preserve guest cart contents.
 * The backend now handles OOS items per-item (skipping them) so a single OOS
 * item doesn't block the entire merge.
 */
async function mergeGuestCart() {
  try {
    const { items } = useCartStore.getState();
    if (!items || items.length === 0) return;

    // Transform cart store items to match backend snake_case validation
    const cartItems = items.map((i) => ({
      product_id: i.productId ?? i.id,
      quantity: i.quantity ?? 1,
      size: i.size || null,
      color: i.color || null,
    }));

    // Send to server — merges by productId + size + color
    // The server skips OOS items individually, so a single OOS item won't
    // break the entire merge. merge_summary is returned with failed counts.
    const mergeRes = await cartAPI.mergeItems(cartItems);
    const mergeData = mergeRes?.data?.data || mergeRes?.data || {};
    const mergeSummary = mergeData.merge_summary;

    if (mergeSummary?.failed > 0) {
      const msg = mergeSummary.failed === 1
        ? '1 item from your guest cart was out of stock and could not be added'
        : `${mergeSummary.failed} items from your guest cart were out of stock and could not be added`;
      showError(msg, { duration: 5000 });
    }

    // Fetch the merged cart from server and update the local cart store
    const res = await cartAPI.get();
    const serverData = res?.data?.data || res?.data || {};
    const serverItems = serverData.items || [];
    useCartStore.getState().setItems(serverItems);
  } catch (err) {
    // If even the graceful merge failed (e.g. network error), keep local state
    console.warn('Failed to merge guest cart after login:', err);
  }
}

export default useAuthStore;

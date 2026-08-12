import { create } from 'zustand';

/**
 * sessionStore — records the last successful auth check and token refresh so
 * the admin sidebar can surface a small "session active" indicator. Persisted
 * to localStorage so the times survive page reloads (and make silent session
 * drops visible — if the numbers stop updating, the session is no longer
 * being validated).
 */
const STORAGE_KEY = 'threvolt_session_times';

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lastAuthCheck: null, lastTokenRefresh: null, tokenExpiresAt: null };
    const parsed = JSON.parse(raw);
    return {
      lastAuthCheck: typeof parsed.lastAuthCheck === 'number' ? parsed.lastAuthCheck : null,
      lastTokenRefresh: typeof parsed.lastTokenRefresh === 'number' ? parsed.lastTokenRefresh : null,
      tokenExpiresAt: typeof parsed.tokenExpiresAt === 'number' ? parsed.tokenExpiresAt : null,
    };
  } catch {
    return { lastAuthCheck: null, lastTokenRefresh: null, tokenExpiresAt: null };
  }
}

function persist(state) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lastAuthCheck: state.lastAuthCheck,
        lastTokenRefresh: state.lastTokenRefresh,
        tokenExpiresAt: state.tokenExpiresAt,
      })
    );
  } catch {
    // storage unavailable — keep the times in memory only
  }
}

/** Normalize an ISO string / epoch-ms number / null into epoch ms (or null). */
function toEpochMs(value) {
  if (value === null || value === undefined || value === '') return null;
  const ms = typeof value === 'number' ? value : Date.parse(String(value));
  return Number.isFinite(ms) ? ms : null;
}

const initial = readStored();

const useSessionStore = create((set, get) => ({
  lastAuthCheck: initial.lastAuthCheck,
  lastTokenRefresh: initial.lastTokenRefresh,
  /** Epoch ms when the current access token expires (null = unknown/no expiry). */
  tokenExpiresAt: initial.tokenExpiresAt,

  /** Call after a successful authenticated request that proves the session (getMe, login, register, setUser). */
  recordAuthCheck: () => {
    const next = { ...get(), lastAuthCheck: Date.now() };
    set(next);
    persist(next);
  },

  /** Call after a new token was issued (refresh-token success, login, register). */
  recordTokenRefresh: () => {
    const next = { ...get(), lastTokenRefresh: Date.now() };
    set(next);
    persist(next);
  },

  /**
   * Record when the current access token expires (ISO string from the API,
   * epoch ms, or null to clear). Drives the admin expiry-countdown banner.
   */
  setTokenExpiry: (value) => {
    const tokenExpiresAt = toEpochMs(value);
    const next = { ...get(), tokenExpiresAt };
    set(next);
    persist(next);
  },

  /** Reset all session metadata (logout / full session wipe). */
  clearSessionTimes: () => {
    set({ lastAuthCheck: null, lastTokenRefresh: null, tokenExpiresAt: null });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
}));

export default useSessionStore;

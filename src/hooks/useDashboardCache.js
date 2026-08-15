import { useRef, useCallback, useMemo } from 'react';

/**
 * A lightweight cache for dashboard/analytics data keyed by date range.
 * Stores a snapshot of all dashboard state per range key.
 * Automatically evicts oldest entries when exceeding maxEntries.
 * Persists to sessionStorage so data survives page refreshes (instant back navigation).
 *
 * # Cache Versioning
 * Increment CACHE_VERSION whenever the cached data shape changes
 * (e.g., adding/removing/renaming fields). Old entries are silently
 * discarded, forcing a fresh fetch from the API.
 */
const CACHE_VERSION = 2;

function loadFromStorage(prefix, key) {
  try {
    const raw = sessionStorage.getItem(prefix + key);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Check version — discard if data shape has changed
      if (parsed.v !== CACHE_VERSION) return null;
      // Check freshness — expire after 30 seconds so order-related metrics update quickly
      if (parsed.ts && Date.now() - parsed.ts < 30 * 1000) {
        return parsed.data;
      }
    }
  } catch { /* ignore */ }
  return null;
}

function saveToStorage(prefix, key, data) {
  try {
    sessionStorage.setItem(prefix + key, JSON.stringify({ v: CACHE_VERSION, ts: Date.now(), data }));
  } catch { /* quota exceeded, ignore */ }
}

function removeFromStorage(prefix, key) {
  try {
    sessionStorage.removeItem(prefix + key);
  } catch { /* ignore */ }
}

function clearAllStorage(prefix) {
  try {
    const keys = Object.keys(sessionStorage).filter(k => k.startsWith(prefix));
    keys.forEach(k => sessionStorage.removeItem(k));
  } catch { /* ignore */ }
}

export default function useDashboardCache(maxEntries = 10, namespace = 'default') {
  const STORAGE_KEY_PREFIX = 'dash_cache_' + namespace + '_';
  const cacheRef = useRef(new Map());
  const orderRef = useRef([]); // insertion order for LRU eviction

  /**
   * Build a stable string key from a date range.
   */
  const buildKey = useCallback((range) => {
    if (!range) return 'default';
    const start = range.start instanceof Date
      ? range.start.toISOString().split('T')[0]
      : String(range.start);
    const end = range.end instanceof Date
      ? range.end.toISOString().split('T')[0]
      : String(range.end);
    return `${start}_${end}`;
  }, []);

  /**
   * Retrieve cached data for a range. Returns null if not cached.
   * Checks memory cache first, then sessionStorage.
   */
  const get = useCallback((range) => {
    const key = buildKey(range);
    // Check memory cache first
    const mem = cacheRef.current.get(key);
    if (mem) return mem;
    // Fall back to sessionStorage (survives page refreshes)
    const stored = loadFromStorage(STORAGE_KEY_PREFIX, key);
    if (stored) {
      // Restore into memory cache and update LRU order
      cacheRef.current.set(key, stored);
      if (!orderRef.current.includes(key)) {
        orderRef.current.push(key);
      }
      return stored;
    }
    return null;
  }, [buildKey, STORAGE_KEY_PREFIX]);

  /**
   * Store data snapshot for a range.
   * Persists to both memory cache AND sessionStorage.
   */
  const set = useCallback((range, data) => {
    const key = buildKey(range);

    // If key exists, move to end of order
    if (cacheRef.current.has(key)) {
      const idx = orderRef.current.indexOf(key);
      if (idx !== -1) orderRef.current.splice(idx, 1);
    }

    cacheRef.current.set(key, data);
    orderRef.current.push(key);

    // Persist to sessionStorage
    saveToStorage(STORAGE_KEY_PREFIX, key, data);

    // Evict oldest if over limit (both memory and storage)
    if (orderRef.current.length > maxEntries) {
      const oldest = orderRef.current.shift();
      cacheRef.current.delete(oldest);
      removeFromStorage(STORAGE_KEY_PREFIX, oldest);
    }
  }, [buildKey, maxEntries, STORAGE_KEY_PREFIX]);

  /**
   * Check if a range has cached data.
   */
  const has = useCallback((range) => {
    const key = buildKey(range);
    return cacheRef.current.has(key) || loadFromStorage(STORAGE_KEY_PREFIX, key) !== null;
  }, [buildKey, STORAGE_KEY_PREFIX]);

  /**
   * Clear the entire cache (memory + sessionStorage).
   */
  const clear = useCallback(() => {
    cacheRef.current.clear();
    orderRef.current = [];
    clearAllStorage(STORAGE_KEY_PREFIX);
  }, [STORAGE_KEY_PREFIX]);

  // Stable object reference — prevents cascading re-renders in consuming components
  // (DashboardPage depends on this via useCallback(fn, [cache]) -> useEffect -> fetch -> dispatch -> re-render)
  return useMemo(() => ({ get, set, has, clear }), [get, set, has, clear]);
}

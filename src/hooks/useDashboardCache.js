import { useRef, useCallback } from 'react';

/**
 * A lightweight cache for dashboard/analytics data keyed by date range.
 * Stores a snapshot of all dashboard state per range key.
 * Automatically evicts oldest entries when exceeding maxEntries.
 */
export default function useDashboardCache(maxEntries = 10) {
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
   */
  const get = useCallback((range) => {
    const key = buildKey(range);
    return cacheRef.current.get(key) ?? null;
  }, [buildKey]);

  /**
   * Store data snapshot for a range.
   * Moves entry to the end of the LRU order on re-set.
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

    // Evict oldest if over limit
    if (orderRef.current.length > maxEntries) {
      const oldest = orderRef.current.shift();
      cacheRef.current.delete(oldest);
    }
  }, [buildKey, maxEntries]);

  /**
   * Check if a range has cached data.
   */
  const has = useCallback((range) => {
    return cacheRef.current.has(buildKey(range));
  }, [buildKey]);

  /**
   * Clear the entire cache.
   */
  const clear = useCallback(() => {
    cacheRef.current.clear();
    orderRef.current = [];
  }, []);

  return { get, set, has, clear };
}

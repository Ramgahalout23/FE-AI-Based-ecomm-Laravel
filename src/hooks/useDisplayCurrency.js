import { useEffect, useCallback, useMemo } from 'react';
import { useAppInit } from '../contexts/AppInitContext';
import { useDisplayCurrencyStore } from '../store/displayCurrencyStore';
import { setDefaultCurrency } from '../utils/formatters';

/**
 * useDisplayCurrency — manages the user's display currency preference.
 *
 * - Reads available currencies from AppInitContext (already fetched by app-init).
 * - Persists the user's selected currency to localStorage (via Zustand store).
 * - Calls `setDefaultCurrency()` from formatters to update all price displays.
 * - Subscribes to the Zustand store so that price-displaying components re-render
 *   when the currency changes.
 */
export function useDisplayCurrency() {
  // Read currencies from app-init (already fetched, no separate API call needed)
  const { data: appInitData, loading: appInitLoading } = useAppInit();
  const currencies = useMemo(() => appInitData?.currencies || [], [appInitData]);
  const loading = appInitLoading;

  // Subscribe to the Zustand store for re-render-driven currency updates
  const displayCurrency = useDisplayCurrencyStore((s) => s.code);
  const setCode = useDisplayCurrencyStore((s) => s.setCode);

  // Setter that persists to store AND updates formatters
  const setDisplayCurrency = useCallback((code) => {
    if (!code) return;
    setCode(code);
    setDefaultCurrency(code);
  }, [setCode]);

  // Initialize formatter on mount (and keep in sync when the currency changes)
  useEffect(() => {
    setDefaultCurrency(displayCurrency);
  }, [displayCurrency]);

  // Validate stored currency against API response
  useEffect(() => {
    if (!loading && currencies.length > 0) {
      const exists = currencies.some((c) => c.code === displayCurrency);
      if (!exists) {
        const fallback = currencies.find((c) => c.is_default) || currencies[0];
        if (fallback) {
          setCode(fallback.code);
          setDefaultCurrency(fallback.code);
        }
      }
    }
  }, [loading, currencies, displayCurrency, setCode]);

  return {
    currencies,
    displayCurrency,
    setDisplayCurrency,
    loading,
  };
}

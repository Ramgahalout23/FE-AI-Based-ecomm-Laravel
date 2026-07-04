import { useState, useEffect, useCallback } from 'react';
import { currenciesAPI } from '../api/currencies';
import { useDisplayCurrencyStore } from '../store/displayCurrencyStore';
import { setDefaultCurrency } from '../utils/formatters';

/**
 * useDisplayCurrency — manages the user's display currency preference.
 *
 * - Fetches the list of available currencies from the API on first mount.
 * - Persists the user's selected currency to localStorage (via Zustand store).
 * - Calls `setDefaultCurrency()` from formatters to update all price displays.
 * - Subscribes to the Zustand store so that price-displaying components re-render
 *   when the currency changes.
 */
export function useDisplayCurrency() {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to the Zustand store for re-render-driven currency updates
  const displayCurrency = useDisplayCurrencyStore((s) => s.code);
  const setCode = useDisplayCurrencyStore((s) => s.setCode);

  // Fetch available currencies on mount
  useEffect(() => {
    let mounted = true;
    const fetchCurrencies = async () => {
      try {
        const res = await currenciesAPI.getAll();
        const data = res?.data?.data || [];
        if (mounted && Array.isArray(data) && data.length > 0) {
          setCurrencies(data);
        }
      } catch {
        // Silently fail — fall back to defaults
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchCurrencies();
    return () => { mounted = false; };
  }, []);

  // Setter that persists to store AND updates formatters
  const setDisplayCurrency = useCallback((code) => {
    if (!code) return;
    setCode(code);
    setDefaultCurrency(code);
  }, [setCode]);

  // Initialize formatter on mount
  useEffect(() => {
    setDefaultCurrency(displayCurrency);
  }, []);

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

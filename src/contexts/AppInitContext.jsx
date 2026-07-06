import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { appInitAPI } from '../api/appInit';

const AppInitContext = createContext(null);

/**
 * AppInitProvider — fetches ALL app-level initialization data in a single
 * request on mount and shares it across the app via context.
 *
 * This replaces 8+ individual API calls (maintenance, currencies, languages,
 * pages, promotions, tracking config, key settings) with one consolidated call.
 */
export function AppInitProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAppInit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await appInitAPI.getAll();
      setData(res?.data || {});
    } catch (err) {
      setError(err);
      setData({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppInit();
  }, [fetchAppInit]);

  return (
    <AppInitContext.Provider value={{ data, loading, error, refetch: fetchAppInit }}>
      {children}
    </AppInitContext.Provider>
  );
}

/**
 * Hook to access app-init data from any component.
 */
export function useAppInit() {
  const ctx = useContext(AppInitContext);
  if (!ctx) {
    return { data: {}, loading: false, error: null, refetch: () => {} };
  }
  return ctx;
}

export default AppInitContext;

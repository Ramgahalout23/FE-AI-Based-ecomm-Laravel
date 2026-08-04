import client from './client';

export const appInitAPI = {
  /**
   * Fetch ALL app-level initialization data in a single request.
   * This replaces 8+ individual API calls (maintenance, currencies,
   * languages, pages, promotions, tracking config, key settings).
   */
  getAll: async () => {
    const res = await client.get('/app-init');
    return res?.data?.data ?? res?.data ?? {};
  },
};

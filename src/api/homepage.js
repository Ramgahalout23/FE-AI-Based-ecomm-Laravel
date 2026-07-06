import client from './client';

/**
 * Consolidated homepage API — fetches ALL data needed for the storefront
 * homepage in a single request, eliminating 15+ separate API calls.
 */
export const homepageAPI = {
  getAll: () => client.get('/homepage'),
};

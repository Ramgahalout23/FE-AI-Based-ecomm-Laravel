import client from './client';

export const recentlyViewedAPI = {
  /** Get recently viewed products for the authenticated user */
  getAll: (params) => client.get('/recently-viewed', { params }),

  /** Track a product view */
  trackView: (productId) => client.post('/recently-viewed', { product_id: productId }),
};

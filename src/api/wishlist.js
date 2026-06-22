import client from './client';

export const wishlistAPI = {
  get: () => client.get('/wishlist'),
  add: (data) => client.post('/wishlist', { product_id: data.productId ?? data.product_id }),
  remove: (productId) => client.delete(`/wishlist/${productId}`),
  check: (productId) => client.get(`/wishlist/check/${productId}`),
  getCount: () => client.get('/wishlist/count'),
  clear: () => client.delete('/wishlist'),
  bulkAdd: (data) => client.post('/wishlist/bulk', data),
  moveToCart: (productId) => client.post(`/wishlist/${productId}/move-to-cart`),
};

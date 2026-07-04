import client from './client';

export const cartAPI = {
  get: () => client.get('/cart'),
  add: (data) => client.post('/cart/items', data),
  addItem: (data) => client.post('/cart/items', data),
  updateItem: (cartItemId, data) => client.patch(`/cart/${cartItemId}`, data),
  removeItem: (cartItemId) => client.delete(`/cart/${cartItemId}`),
  clear: () => client.delete('/cart'),
  validate: () => client.post('/cart/validate'),
  mergeItems: (items) => client.post('/cart/merge', { items }),
};

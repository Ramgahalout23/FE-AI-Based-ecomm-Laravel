import client from './client';

export const abandonedCartAPI = {
  // Get user's abandoned carts
  getUserCarts: () => client.get('/abandoned-carts'),
  // Get abandoned cart by ID
  getCartById: (id) => client.get(`/abandoned-carts/${id}`),
  // Save current cart as abandoned
  saveCart: (data) => client.post('/abandoned-carts', data),
};

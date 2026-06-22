import client from './client';
import { toSnakePayload } from '../utils/apiUtils';

// Backend (CartRoutes.ts) exposes:
//   GET    /cart
//   POST   /cart          (add item)
//   POST   /cart/items    (alias of add item)
//   PATCH  /cart/:cartItemId
//   DELETE /cart/:cartItemId
//   DELETE /cart          (clear)
//   POST   /cart/validate

const cartMappings = {
  cartItemId: 'cart_item_id',
};

export const cartAPI = {
  get: () => client.get('/cart'),
  // Canonical add — convert camelCase payload to snake_case
  add: (data) => client.post('/cart/items', toSnakePayload(data, cartMappings)),
  addItem: (data) => client.post('/cart/items', toSnakePayload(data, cartMappings)),
  updateItem: (cartItemId, data) => client.patch(`/cart/${cartItemId}`, toSnakePayload(data, cartMappings)),
  removeItem: (cartItemId) => client.delete(`/cart/${cartItemId}`),
  clear: () => client.delete('/cart'),
  validate: () => client.post('/cart/validate'),
  // Merge guest localStorage cart items into the server cart after login/register
  mergeItems: (items) => client.post('/cart/merge', { items }),
};

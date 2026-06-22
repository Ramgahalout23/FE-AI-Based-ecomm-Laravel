import client from './client';
import { adminClient } from './client';

export const inventoryAPI = {
  getForProduct: (productId) => client.get(`/inventory/${productId}`),
  checkStock: (productId, quantity) => client.get(`/inventory/${productId}/check`, { params: { quantity } }),
  // Admin
  getAll: (params) => adminClient.get('/admin/inventory', { params }),
  getStats: () => adminClient.get('/admin/inventory/stats'),
  getLowStock: () => adminClient.get('/admin/inventory/low-stock'),
  addStock: (data) => adminClient.post('/admin/inventory/add', data),
  reduceStock: (data) => adminClient.post('/admin/inventory/reduce', data),
  getMovement: (productId) => adminClient.get(`/admin/inventory/${productId}/movement`),
  batchUpdate: (data) => adminClient.post('/admin/inventory/batch-update', data),
};

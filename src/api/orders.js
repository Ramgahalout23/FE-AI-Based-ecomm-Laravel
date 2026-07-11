import client from './client';
import { adminClient } from './client';

export const ordersAPI = {
  create: (data) => client.post('/orders', data),
  getUserOrders: (params) => client.get('/orders', { params }),
  getById: (id) => client.get(`/orders/${id}`),
  cancel: (id) => client.patch(`/orders/${id}/cancel`),
  getTracking: (id) => client.get(`/orders/${id}/tracking`),
  requestReturn: (id, data) => client.post(`/orders/${id}/return`, data),
  trackByNumber: (orderNumber) => client.get(`/orders/track-by-number/${orderNumber}`),
  subscribeUpdates: (id, data) => client.post(`/orders/${id}/subscribe-updates`, data),
  // Public: Recent orders for FOMO purchase notifications
  getRecentOrders: () => client.get('/orders/recent'),
  // Admin
  getAll: (params) => adminClient.get('/admin/orders', { params }),
  updateStatus: (id, data) => adminClient.patch(`/admin/orders/${id}/status`, data),
};

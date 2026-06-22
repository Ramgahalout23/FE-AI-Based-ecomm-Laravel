import client from './client';
import { adminClient } from './client';

export const shippingAPI = {
  calculate: (data) => client.post('/shipping/calculate', data),
  getProviders: () => client.get('/shipping/providers'),
  track: (trackingId) => client.get(`/shipping/track/${trackingId}`),
  getByOrder: (orderId) => client.get(`/shipping/order/${orderId}`),
  getUserShipments: () => client.get('/shipping/my-shipments'),
  getById: (id) => client.get(`/shipping/${id}`),
  // Admin
  getAll: (params) => adminClient.get('/admin/shipping/all', { params }),
  getByStatus: (params) => adminClient.get('/admin/shipping/by-status', { params }),
  create: (data) => adminClient.post('/admin/shipping', data),
  update: (id, data) => adminClient.put(`/admin/shipping/${id}`, data),
  createZone: (data) => adminClient.post('/admin/shipping/zones', data),
  getZones: () => adminClient.get('/admin/shipping/zones/list'),
  createRate: (data) => adminClient.post('/admin/shipping/rates', data),
};

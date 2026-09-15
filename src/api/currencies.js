import client from './client';
import adminClient from './adminClient';

export const currenciesAPI = {
  /** Public: Get all active currencies */
  getAll: () => client.get('/currencies'),

  /** Public: Get the default currency */
  getDefault: () => client.get('/currencies/default'),

  /** Public: Convert amount from default currency (or specified source) to target currency */
  convert: (amount, to, from) =>
    client.post('/currencies/convert', { amount, to, from }),

  // ── Admin Endpoints ──
  getAdminAll: (params) => adminClient.get('/admin/currencies', { params }),
  getById: (id) => adminClient.get(`/admin/currencies/${id}`),
  create: (data) => adminClient.post('/admin/currencies', data),
  update: (id, data) => adminClient.put(`/admin/currencies/${id}`, data),
  delete: (id) => adminClient.delete(`/admin/currencies/${id}`),
  setDefault: (id) => adminClient.patch(`/admin/currencies/${id}/default`),
  toggleActive: (id, isActive) => adminClient.patch(`/admin/currencies/${id}/toggle`, { is_active: isActive }),
  syncRates: () => adminClient.post('/admin/currencies/sync'),
  resetDefaults: () => adminClient.post('/admin/currencies/reset'),
};

export default currenciesAPI;

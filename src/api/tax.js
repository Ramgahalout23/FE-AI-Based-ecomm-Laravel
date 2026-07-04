import client, { adminClient } from './client';

export const taxAPI = {
  // Admin: Get all tax rates
  getAll: (params = {}) => adminClient.get('/admin/tax-rates', { params }),
  // Admin: Get single tax rate
  getById: (id) => adminClient.get(`/admin/tax-rates/${id}`),
  // Admin: Create tax rate
  create: (data) => adminClient.post('/admin/tax-rates', data),
  // Admin: Update tax rate
  update: (id, data) => adminClient.put(`/admin/tax-rates/${id}`, data),
  // Admin: Delete tax rate
  delete: (id) => adminClient.delete(`/admin/tax-rates/${id}`),
  // Public: Calculate tax
  calculate: (subtotal, country, state) => client.post('/tax/calculate', { subtotal, country, state }),
};

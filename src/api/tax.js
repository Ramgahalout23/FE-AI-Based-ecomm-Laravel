import client from './client';

export const taxAPI = {
  // Admin: Get all tax rates
  getAll: (params = {}) => client.get('/admin/tax-rates', { params }),
  // Admin: Get single tax rate
  getById: (id) => client.get(`/admin/tax-rates/${id}`),
  // Admin: Create tax rate
  create: (data) => client.post('/admin/tax-rates', data),
  // Admin: Update tax rate
  update: (id, data) => client.put(`/admin/tax-rates/${id}`, data),
  // Admin: Delete tax rate
  delete: (id) => client.delete(`/admin/tax-rates/${id}`),
  // Public: Calculate tax
  calculate: (subtotal, country, state) => client.post('/tax/calculate', { subtotal, country, state }),
};

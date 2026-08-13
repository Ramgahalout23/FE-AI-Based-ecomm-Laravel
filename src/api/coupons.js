import client from './client';
import { adminClient } from './client';

export const couponsAPI = {
  // Public / Storefront
  getPublic: () => client.get('/coupons'),
  getByCode: (code) => client.get(`/coupons/${code}`),
  validate: (data) => client.post('/coupons/validate', data),
  apply: (data) => client.post('/coupons/apply', data),
  remove: () => client.delete('/coupons/remove'),
  getBest: (data) => client.post('/coupons/best', data),
  getAutoApply: () => client.get('/coupons/auto-apply/list'),
  // Admin CRUD — all prefixed with /admin
  getAll: (params) => adminClient.get('/admin/coupons', { params }),
  aiSuggest: (data) => adminClient.post('/admin/coupons/ai-suggest', data),
  create: (data) => adminClient.post('/admin/coupons', data),
  getById: (id) => adminClient.get(`/admin/coupons/${id}`),
  update: (id, data) => adminClient.patch(`/admin/coupons/${id}`, data),
  delete: (id) => adminClient.delete(`/admin/coupons/${id}`),
  toggleStatus: (id) => adminClient.patch(`/admin/coupons/${id}/toggle`),
  bulkGenerate: (data) => adminClient.post('/admin/coupons/bulk-generate', data),
  getAnalytics: (id) => adminClient.get(`/admin/coupons/${id}/analytics`),
  getUsageHistory: (id) => adminClient.get(`/admin/coupons/${id}/usage-history`),
};

import client from './client';
import { adminClient } from './client';

export const categoriesAPI = {
  getAll: (params, config) => client.get('/categories', { params, ...config }),
  getHierarchy: () => client.get('/categories/hierarchy'),
  getById: (id) => client.get(`/categories/${id}`),
  getSubcategories: (id) => client.get(`/categories/${id}/subcategories`),
  getStats: (id) => client.get(`/categories/${id}/stats`),
  create: (data) => adminClient.post('/admin/categories', data),
  update: (id, data) => adminClient.put(`/admin/categories/${id}`, data),
  delete: (id) => adminClient.delete(`/admin/categories/${id}`),
};

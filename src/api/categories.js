import client from './client';
import { adminClient } from './client';

export const categoriesAPI = {
  getAll: (params) => client.get('/categories', { params }),
  getHierarchy: () => client.get('/categories/hierarchy'),
  getById: (id) => client.get(`/categories/${id}`),
  getSubcategories: (id) => client.get(`/categories/${id}/subcategories`),
  getStats: (id) => client.get(`/categories/${id}/stats`),
  create: (data) => adminClient.post('/categories', data),
  update: (id, data) => adminClient.put(`/categories/${id}`, data),
  delete: (id) => adminClient.delete(`/categories/${id}`),
};

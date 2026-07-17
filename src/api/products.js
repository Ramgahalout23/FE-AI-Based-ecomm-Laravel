import client from './client';
import { adminClient } from './client';

export const productsAPI = {
  getAll: (params) => client.get('/products', { params }),
  search: (q) => client.get('/products/search', { params: { q } }),
  getFeatured: () => client.get('/products/featured'),
  getNewArrivals: (params) => client.get('/products/new-arrivals', { params }),
  getBestSellers: (params) => client.get('/products/best-sellers', { params }),
  getBrands: () => client.get('/products/brand'),
  getByCategory: (categoryId) => client.get(`/products/category/${categoryId}`),
  getById: (id) => client.get(`/products/${id}`),
  checkAvailability: (id, quantity) => client.get(`/products/${id}/availability`, { params: { quantity } }),
  getVariants: (id) => client.get(`/products/${id}/variants`),
  getVariantByAttributes: (id, params) => client.get(`/products/${id}/variants/attributes`, { params }),
  getRelated: (id, params) => client.get(`/products/${id}/related`, { params }),
  // Admin
  create: (data) => adminClient.post('/admin/products', data),
  update: (id, data) => adminClient.put(`/admin/products/${id}`, data),
  delete: (id) => adminClient.delete(`/admin/products/${id}`),
  publish: (id) => adminClient.patch(`/admin/products/${id}/publish`),
  archive: (id) => adminClient.patch(`/admin/products/${id}/archive`),
  getLowStock: () => adminClient.get('/admin/products/low-stock'),
};

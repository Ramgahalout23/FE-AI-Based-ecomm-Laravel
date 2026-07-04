import client from './client';
import { adminClient } from './client';

export const reviewsAPI = {
  create: (data) => client.post('/reviews', data),
  getByProduct: (productId, params) => client.get(`/reviews/product/${productId}`, { params }),
  getStats: (productId) => client.get(`/reviews/stats/${productId}`),
  getVerified: (productId) => client.get(`/reviews/verified/${productId}`),
  getUserReviews: () => client.get('/reviews/user'),
  getById: (id) => client.get(`/reviews/${id}`),
  update: (id, data) => client.put(`/reviews/${id}`, data),
  delete: (id) => client.delete(`/reviews/${id}`),
  markHelpful: (id) => client.post(`/reviews/${id}/helpful`),
  markUnhelpful: (id) => client.post(`/reviews/${id}/unhelpful`),
  getHomepage: (params) => client.get('/reviews/homepage', { params }),
  uploadImage: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return client.post('/uploads/review-image', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadImages: (files) => {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    return client.post('/uploads/review-images', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  // Admin
  getAll: (params) => adminClient.get('/admin/reviews', { params }),
  approve: (id) => adminClient.post(`/admin/reviews/${id}/approve`),
  reject: (id) => adminClient.post(`/admin/reviews/${id}/reject`),
  getPending: (params) => adminClient.get('/admin/reviews/pending', { params }),
  adminDelete: (id) => adminClient.delete(`/admin/reviews/${id}`),
};

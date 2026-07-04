import { adminClient } from './client';

export const webhooksAPI = {
  getAll: () => adminClient.get('/admin/webhooks'),
  create: (data) => adminClient.post('/admin/webhooks', data),
  update: (id, data) => adminClient.put(`/admin/webhooks/${id}`, data),
  delete: (id) => adminClient.delete(`/admin/webhooks/${id}`),
  getLogs: (id) => adminClient.get(`/admin/webhooks/${id}/logs`),
  test: (id) => adminClient.post(`/admin/webhooks/${id}/test`),
};

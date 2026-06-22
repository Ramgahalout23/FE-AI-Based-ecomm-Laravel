import client from './client';
import { adminClient } from './client';

export const notificationsAPI = {
  getAll: () => client.get('/notifications'),
  getStats: () => client.get('/notifications/stats'),
  getUnread: () => client.get('/notifications/unread'),
  getByType: (type) => client.get(`/notifications/type/${type}`),
  markAsRead: (id) => client.put(`/notifications/${id}/read`),
  markAllRead: () => client.put('/notifications/mark-all-read'),
  delete: (id) => client.delete(`/notifications/${id}`),
  // Admin
  create: (data) => adminClient.post('/notifications', data),
  sendBulk: (data) => adminClient.post('/notifications/bulk', data),
};

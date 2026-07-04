import client, { adminClient } from './client';

export const settingsAPI = {
  // Get all settings at once (returns public, social, etc.)
  getAll: (config) => client.get('/settings', config),
  // Get single setting by key
  getSetting: (key) => client.get(`/settings/${key}`),
  // Maintenance status
  getMaintenanceStatus: () => client.get('/settings/maintenance'),
  // 404 settings
  get404Settings: () => client.get('/settings/404'),
  // Admin-protected endpoints (prefixed with /admin) — use adminClient for proper auth
  updateSetting: (key, value) => adminClient.put(`/admin/settings/${key}`, { value }),
  updateSettings: (settings) => adminClient.post('/admin/settings/update-multiple', settings),
  toggleMaintenance: (enabled, message) => adminClient.post('/admin/settings/maintenance', { enabled, message }),
  updateCustom404: (config) => adminClient.put('/admin/settings/404', config),
  // Maintenance Schedules (admin-protected)
  getSchedules: () => adminClient.get('/admin/settings/maintenance/schedules'),
  createSchedule: (data) => adminClient.post('/admin/settings/maintenance/schedules', data),
  updateSchedule: (id, data) => adminClient.put(`/admin/settings/maintenance/schedules/${id}`, data),
  deleteSchedule: (id) => adminClient.delete(`/admin/settings/maintenance/schedules/${id}`),
  // Legacy - kept for compatibility
  getPublic: () => client.get('/settings'),
  getSocialLinks: () => client.get('/settings'),
  getSiteName: () => client.get('/settings'),
  getFooterLinks: () => client.get('/settings'),
};
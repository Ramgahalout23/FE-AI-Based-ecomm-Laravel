import client from './client';

export const settingsAPI = {
  // Get all settings at once (returns public, social, etc.)
  getAll: (config) => client.get('/settings', config),
  // Get single setting by key
  getSetting: (key) => client.get(`/settings/${key}`),
  // Maintenance status
  getMaintenanceStatus: () => client.get('/settings/maintenance'),
  // 404 settings
  get404Settings: () => client.get('/settings/404'),
  // Update single setting
  // Admin-protected endpoints (prefixed with /admin)
  updateSetting: (key, value) => client.put(`/admin/settings/${key}`, { value }),
  updateSettings: (settings) => client.post('/admin/settings', { settings }),
  toggleMaintenance: (enabled, message) => client.post('/admin/settings/maintenance', { enabled, message }),
  updateCustom404: (config) => client.put('/admin/settings/404', config),
  // Maintenance Schedules (admin-protected)
  getSchedules: () => client.get('/admin/settings/maintenance/schedules'),
  createSchedule: (data) => client.post('/admin/settings/maintenance/schedules', data),
  updateSchedule: (id, data) => client.put(`/admin/settings/maintenance/schedules/${id}`, data),
  deleteSchedule: (id) => client.delete(`/admin/settings/maintenance/schedules/${id}`),
  // Legacy - kept for compatibility
  getPublic: () => client.get('/settings'),
  getSocialLinks: () => client.get('/settings'),
  getSiteName: () => client.get('/settings'),
  getFooterLinks: () => client.get('/settings'),
};
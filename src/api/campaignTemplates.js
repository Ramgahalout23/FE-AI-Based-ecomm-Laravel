import { adminClient } from './client';

export const campaignTemplatesAPI = {
  getTemplates: (params) => adminClient.get('/admin/campaign-templates', { params }),
  getTemplateById: (id) => adminClient.get(`/admin/campaign-templates/${id}`),
  createTemplate: (data) => adminClient.post('/admin/campaign-templates', data),
  updateTemplate: (id, data) => adminClient.put(`/admin/campaign-templates/${id}`, data),
  deleteTemplate: (id) => adminClient.delete(`/admin/campaign-templates/${id}`),
  seedDefaults: () => adminClient.post('/admin/campaign-templates/seed-defaults'),
  renderTemplate: (data) => adminClient.post('/admin/campaign-templates/render', data),
};

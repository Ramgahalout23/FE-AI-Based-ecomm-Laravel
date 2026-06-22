import { adminClient } from './client';

export const marketingAPI = {
  // ── CSV Import ──
  importSubscribersCSV: (formData) => adminClient.post('/admin/marketing/subscribers/import', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),

  // ── Campaign from Template ──
  createCampaignFromTemplate: (data) => adminClient.post('/admin/marketing/campaigns/from-template', data),
  // ── Dashboard ──
  getDashboard: () => adminClient.get('/admin/marketing/dashboard'),

  // ── Subscribers ──
  getSubscribers: (params) => adminClient.get('/admin/marketing/subscribers', { params }),
  getSubscriberStats: () => adminClient.get('/admin/marketing/subscribers/stats'),
  getSubscriberById: (id) => adminClient.get(`/admin/marketing/subscribers/${id}`),
  createSubscriber: (data) => adminClient.post('/admin/marketing/subscribers', data),
  updateSubscriber: (id, data) => adminClient.put(`/admin/marketing/subscribers/${id}`, data),
  deleteSubscriber: (id) => adminClient.delete(`/admin/marketing/subscribers/${id}`),

  // ── Campaigns ──
  getCampaigns: (params) => adminClient.get('/admin/marketing/campaigns', { params }),
  getCampaignById: (id) => adminClient.get(`/admin/marketing/campaigns/${id}`),
  createCampaign: (data) => adminClient.post('/admin/marketing/campaigns', data),
  updateCampaign: (id, data) => adminClient.put(`/admin/marketing/campaigns/${id}`, data),
  deleteCampaign: (id) => adminClient.delete(`/admin/marketing/campaigns/${id}`),
  sendCampaign: (id, data) => adminClient.post(`/admin/marketing/campaigns/${id}/send`, data),
  duplicateCampaign: (id) => adminClient.post(`/admin/marketing/campaigns/${id}/clone`),
  getCampaignStats: (id) => adminClient.get(`/admin/marketing/campaigns/${id}/stats`),
  getCampaignRecipients: (id, params) => adminClient.get(`/admin/marketing/campaigns/${id}/recipients`, { params }),

  // ── CSV Export ──
  exportSubscribersCSV: () => adminClient.get('/admin/marketing/subscribers/export', { responseType: 'blob' }),
  exportCampaignRecipientsCSV: (id) => adminClient.get(`/admin/marketing/campaigns/${id}/recipients/export`, { responseType: 'blob' }),

  // ── Public Subscribe (no auth) ──
  subscribe: (data) => adminClient.post('/marketing/subscribe', data),

  // ── Public Unsubscribe (no auth) ──
  unsubscribe: (email) => adminClient.post('/marketing/unsubscribe', { email }),
};

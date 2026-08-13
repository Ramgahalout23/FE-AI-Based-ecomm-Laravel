import { adminClient } from './client';

export const adsAPI = {
  // CRUD
  getCampaigns: (params) => adminClient.get('/admin/ads', { params }),
  getCampaignById: (id) => adminClient.get(`/admin/ads/${id}`),
  createCampaign: (data) => adminClient.post('/admin/ads', data),
  updateCampaign: (id, data) => adminClient.put(`/admin/ads/${id}`, data),
  deleteCampaign: (id) => adminClient.delete(`/admin/ads/${id}`),
  getStats: (params) => adminClient.get('/admin/ads/stats', { params }),

  // Advanced Analytics & Performance
  getPerformanceReport: (params) => adminClient.get('/admin/ads/analytics/performance', { params }),
  getBrandPresetPerformance: () => adminClient.get('/admin/ads/analytics/brand-presets'),
  compareCampaigns: (id1, id2) => adminClient.post(`/admin/ads/compare/${id1}/${id2}`),

  // AI-Powered Ad Copy Generation
  aiGenerateAdCopy: (data) => adminClient.post('/admin/ads/ai/generate-copy', data),
  aiGenerateVariants: (data) => adminClient.post('/admin/ads/ai/generate-variants', data),
  aiGenerateStrategy: (data) => adminClient.post('/admin/ads/ai/generate-strategy', data),
  aiSuggestAudience: (data) => adminClient.post('/admin/ads/ai/suggest-audience', data),
  aiGenerateBannerDesign: (data) => adminClient.post('/admin/ads/ai/generate-banner', data),
  aiWeeklySummary: (data) => adminClient.post('/admin/ads/ai/weekly-summary', data),

  // Product Linking
  getCampaignProducts: (id) => adminClient.get(`/admin/ads/${id}/products`),
  linkProduct: (id, data) => adminClient.post(`/admin/ads/${id}/products`, data),
  updateProductLink: (id, productId, data) => adminClient.put(`/admin/ads/${id}/products/${productId}`, data),
  unlinkProduct: (id, productId) => adminClient.delete(`/admin/ads/${id}/products/${productId}`),
  bulkLinkProducts: (id, data) => adminClient.post(`/admin/ads/${id}/products/bulk`, data),
  generateCreativeFromProduct: (id, productId) => adminClient.post(`/admin/ads/${id}/products/${productId}/generate-creative`),

  // Budget Optimization & Templates
  getBudgetOptimization: () => adminClient.get('/admin/ads/analytics/budget-optimization'),
  getAdTemplates: () => adminClient.get('/admin/ads/analytics/templates'),

  // Platform Connections
  testMetaConnection: () => adminClient.post('/admin/ads/test-meta-connection'),
  testGoogleAdsConnection: () => adminClient.post('/admin/ads/test-google-connection'),

  // WhatsApp
  getWhatsAppRecipients: (params) => adminClient.get('/admin/ads/whatsapp-recipients', { params }),

  // Push to Platforms
  pushToMeta: (id) => adminClient.post(`/admin/ads/${id}/push-meta`),
  syncMetaStats: (id) => adminClient.post(`/admin/ads/${id}/sync-stats`),
  pushToGoogle: (id) => adminClient.post(`/admin/ads/${id}/push-google`),
  syncGoogleStats: (id) => adminClient.post(`/admin/ads/${id}/sync-google-stats`),
  pushToWhatsApp: (id, data) => adminClient.post(`/admin/ads/${id}/push-whatsapp`, data),
  syncWhatsAppStats: (id) => adminClient.post(`/admin/ads/${id}/sync-whatsapp-stats`),

  // ── High-Level Tracking & Attribution ──
  getTrackingDashboard: (params) => adminClient.get('/admin/ads/tracking/dashboard', { params }),
  getTrackingEvents: (params) => adminClient.get('/admin/ads/tracking/events', { params }),
  getTrackingAttribution: (params) => adminClient.get('/admin/ads/tracking/attribution', { params }),
  getCampaignDailyStats: (id, params) => adminClient.get(`/admin/ads/${id}/tracking/daily`, { params }),
  getCampaignTrackingUrls: (id) => adminClient.get(`/admin/ads/${id}/tracking/urls`),

  // ── Automation Rules ──
  getAutomationRules: () => adminClient.get('/admin/ads/automation/rules'),
  createAutomationRule: (data) => adminClient.post('/admin/ads/automation/rules', data),
  updateAutomationRule: (id, data) => adminClient.put(`/admin/ads/automation/rules/${id}`, data),
  deleteAutomationRule: (id) => adminClient.delete(`/admin/ads/automation/rules/${id}`),
  runAutomationRules: () => adminClient.post('/admin/ads/automation/run'),

  // ── Audience Manager ──
  getAudienceDashboard: () => adminClient.get('/admin/ads/audiences/dashboard'),
  getAudiences: (params) => adminClient.get('/admin/ads/audiences', { params }),
  createAudience: (data) => adminClient.post('/admin/ads/audiences', data),
  updateAudience: (id, data) => adminClient.put(`/admin/ads/audiences/${id}`, data),
  deleteAudience: (id) => adminClient.delete(`/admin/ads/audiences/${id}`),
  refreshAudienceCount: (id) => adminClient.post(`/admin/ads/audiences/${id}/refresh`),
  refreshAllAudienceCounts: () => adminClient.post('/admin/ads/audiences/refresh-all'),

  // ── Creative Library ──
  getCreativeDashboard: () => adminClient.get('/admin/ads/creatives/dashboard'),
  getCreatives: (params) => adminClient.get('/admin/ads/creatives', { params }),
  createCreative: (data) => adminClient.post('/admin/ads/creatives', data),
  updateCreative: (id, data) => adminClient.put(`/admin/ads/creatives/${id}`, data),
  deleteCreative: (id) => adminClient.delete(`/admin/ads/creatives/${id}`),
  applyCreativeToCampaign: (creativeId, campaignId) => adminClient.post(`/admin/ads/creatives/${creativeId}/apply/${campaignId}`),

  // ── A/B Experiments ──
  getExperiments: () => adminClient.get('/admin/ads/experiments'),
  createExperiment: (data) => adminClient.post('/admin/ads/experiments', data),
  startExperiment: (id) => adminClient.post(`/admin/ads/experiments/${id}/start`),
  declareExperimentWinner: (id) => adminClient.post(`/admin/ads/experiments/${id}/declare-winner`),
  deleteExperiment: (id) => adminClient.delete(`/admin/ads/experiments/${id}`),

  // ── Scheduled Reports & Exports ──
  getScheduledReports: () => adminClient.get('/admin/ads/reports/scheduled'),
  createScheduledReport: (data) => adminClient.post('/admin/ads/reports/scheduled', data),
  updateScheduledReport: (id, data) => adminClient.put(`/admin/ads/reports/scheduled/${id}`, data),
  deleteScheduledReport: (id) => adminClient.delete(`/admin/ads/reports/scheduled/${id}`),
  sendReportNow: (id) => adminClient.post(`/admin/ads/reports/scheduled/${id}/send-now`),
  exportCsv: (kind, params) => adminClient.get(`/admin/ads/export/${kind}`, { params, responseType: 'blob' }),

};

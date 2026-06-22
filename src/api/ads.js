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
};

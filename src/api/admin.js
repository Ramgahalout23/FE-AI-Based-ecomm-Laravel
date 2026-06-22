import { adminClient } from './client';

export const adminAPI = {
  // Auth
  adminLogin: (credentials) => adminClient.post('/auth/login', credentials),
  // Dashboard
  getDashboardMetrics: (params) => adminClient.get('/admin/dashboard/metrics', { params }),
  getSystemHealth: () => adminClient.get('/admin/dashboard/health'),
  getActivityLogs: () => adminClient.get('/admin/dashboard/activity-logs'),
  // Users
  getAllUsers: (params) => adminClient.get('/admin/users', { params }),
  getUserDetails: (id) => adminClient.get(`/admin/users/${id}`),
  manageUser: (id, data) => adminClient.post(`/admin/users/${id}/manage`, data),
  updateUserRole: (id, data) => adminClient.patch(`/admin/users/${id}/role`, data),
  exportUsers: (params) => adminClient.get('/admin/users/export', { params, responseType: 'blob' }),
  // Products
  getProducts: (params) => adminClient.get('/admin/products', { params }),
  createProduct: (data) => adminClient.post('/admin/products', data),
  updateProduct: (id, data) => adminClient.put(`/admin/products/${id}`, data),
  deleteProduct: (id) => adminClient.delete(`/admin/products/${id}`),
  bulkDeleteProducts: (ids) => adminClient.post('/admin/products/bulk-delete', { ids }),
  // Categories
  getCategories: (params) => adminClient.get('/admin/categories', { params }),
  createCategory: (data) => adminClient.post('/admin/categories', data),
  updateCategory: (id, data) => adminClient.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => adminClient.delete(`/admin/categories/${id}`),
  // Orders
  getOrders: (params) => adminClient.get('/admin/orders', { params }),
  getOrderDetails: (id) => adminClient.get(`/admin/orders/${id}`),
  updateOrderStatus: (id, data) => adminClient.patch(`/admin/orders/${id}/status`, data),
  exportOrders: (params) => adminClient.get('/admin/orders/export', { params, responseType: 'blob' }),
  // Coupons
  getCoupons: (params) => adminClient.get('/admin/coupons', { params }),
  createCoupon: (data) => adminClient.post('/admin/coupons', data),
  getCouponById: (id) => adminClient.get(`/admin/coupons/${id}`),
  updateCoupon: (id, data) => adminClient.patch(`/admin/coupons/${id}`, data),
  deleteCoupon: (id) => adminClient.delete(`/admin/coupons/${id}`),
  toggleCoupon: (id) => adminClient.patch(`/admin/coupons/${id}/toggle`),
  bulkGenerateCoupons: (data) => adminClient.post('/admin/coupons/bulk-generate', data),
  getCouponAnalytics: (id) => adminClient.get(`/admin/coupons/${id}/analytics`),
  getCouponUsageHistory: (id) => adminClient.get(`/admin/coupons/${id}/usage-history`),
  // Reviews
  getPendingReviews: () => adminClient.get('/admin/reviews/pending'),
  getAllReviews: (params) => adminClient.get('/admin/reviews', { params }),
  approveReview: (id) => adminClient.patch(`/admin/reviews/${id}/approve`),
  rejectReview: (id) => adminClient.patch(`/admin/reviews/${id}/reject`),
  deleteReview: (id) => adminClient.delete(`/admin/reviews/${id}`),
  // Notifications
  sendSystemNotif: (data) => adminClient.post('/notifications', { ...data, type: 'SYSTEM' }),
  getNotifications: (params) => adminClient.get('/admin/notifications/all', { params }),
  // POST /notifications targets a single userId (requires `userId`).
  sendNotification: (data) => adminClient.post('/notifications', data),
  // POST /notifications/bulk for broadcasting to multiple users (requires `userIds: string[]`).
  sendBulkNotification: (data) => adminClient.post('/notifications/bulk', data),
  // Backend does NOT support scheduled notifications yet — kept for backward compat; do not rely on it.
  scheduleNotification: (data) => adminClient.post('/notifications', data),
  deleteNotification: (id) => adminClient.delete(`/admin/notifications/${id}`),
  // Settings
  getSettings: () => adminClient.get('/settings'),
  // Backend expects { settings: {...} } — see SettingsController.updateSettings
  updateSettings: (data) => adminClient.post('/settings', { settings: data }),
  updateBranding: (data) => adminClient.post('/settings', { settings: data }),
  // SEO
  getSEO: async () => {
    const r = await adminClient.get('/settings');
    const data = r.data?.data || r.data || {};
    return {
      data: {
        title: data.seoTitle || '',
        description: data.seoDescription || '',
        keywords: data.seoKeywords || ''
      }
    };
  },
  updateSEO: (data) => adminClient.post('/settings', {
    settings: {
      seoTitle: data.title || '',
      seoDescription: data.description || '',
      seoKeywords: data.keywords || ''
    }
  }),
  // New SEO Routes API
  getGlobalSEO: () => adminClient.get('/seo/global'),
  updateGlobalSEO: (data) => adminClient.put('/admin/seo/global', data),
  getEntitySEO: (entityType, entityId) => adminClient.get(`/seo/${entityType}/${entityId}`),
  updateEntitySEO: (entityType, entityId, data) => adminClient.put(`/admin/seo/${entityType}/${entityId}`, data),
  getSitemap: () => adminClient.get('/seo/sitemap'),
  getSitemapFromDB: () => adminClient.get('/admin/seo/sitemap/db'),
  refreshSitemap: () => adminClient.post('/admin/seo/sitemap/refresh'),
  getRobotsTxt: () => adminClient.get('/seo/robots'),
  updateRobotsTxt: (content) => adminClient.put('/admin/seo/robots', { content }),
  listSEO: (entityType, params) => adminClient.get(`/admin/seo/list/${entityType}`, { params }),
  deleteSEO: (id) => adminClient.delete(`/admin/seo/${id}`),
  // ── SEO Dashboard ──
  getSEODashboard: () => adminClient.get('/admin/seo/dashboard'),

  // ── Advanced SEO API ──
  getAdvancedSEOSettings: () => adminClient.get('/admin/seo/advanced/settings'),
  updateAdvancedSEOSettings: (data) => adminClient.put('/admin/seo/advanced/settings', data),
  getOrganizationSchema: () => adminClient.get('/admin/seo/advanced/schema/organization'),
  getWebsiteSchema: () => adminClient.get('/admin/seo/advanced/schema/website'),
  autoGenerateSchemas: (entityType, entityId) => adminClient.post(`/admin/seo/advanced/schema/auto/${entityType}/${entityId}`),
  auditEntitySEO: (entityType, entityId) => adminClient.get(`/admin/seo/advanced/audit/${entityType}/${entityId}`),
  bulkAuditSEO: (entityType) => adminClient.post('/admin/seo/advanced/audit/bulk', { entity_type: entityType }),
  generateBreadcrumbs: (entityType, entityId) => adminClient.get(`/admin/seo/advanced/breadcrumbs/${entityType}/${entityId}`),
  pushIndexNow: (url) => adminClient.post('/admin/seo/advanced/indexnow', { url }),
  // System — Backup & Monitoring
  triggerBackup: () => adminClient.post('/admin/backup'),
  listBackups: () => adminClient.get('/admin/backups'),
  downloadBackup: (filename) => adminClient.get(`/admin/backups/${filename}`, { responseType: 'blob' }),
  deleteBackup: (filename) => adminClient.delete(`/admin/backups/${filename}`),
  getBackupSchedule: () => adminClient.get('/admin/backup-settings'),
  updateBackupSchedule: (data) => adminClient.patch('/admin/backup-settings', data),
  clearCache: () => adminClient.post('/admin/cache/clear'),
  getAuditLogs: (params) => adminClient.get('/admin/audit-logs', { params }),
  // Banners
  getBanners: (params) => adminClient.get('/admin/banners', { params }),
  createBanner: (data) => adminClient.post('/admin/banners', data),
  updateBanner: (id, data) => adminClient.put(`/admin/banners/${id}`, data),
  deleteBanner: (id) => adminClient.delete(`/admin/banners/${id}`),
  toggleBanner: (id) => adminClient.patch(`/admin/banners/${id}/toggle`),
  reorderBanners: (data) => adminClient.patch('/admin/banners/reorder', data),
  // Variants
  createVariant: (productId, data) => adminClient.post(`/admin/products/${productId}/variants`, data),
  getVariants: (productId) => adminClient.get(`/admin/products/${productId}/variants`),
  bulkCreateVariants: (productId, data) => adminClient.post(`/admin/products/${productId}/variants/bulk`, data),
  getLowStockVariants: (params) => adminClient.get('/admin/variants/low-stock', { params }),
  getAllVariants: (params) => adminClient.get('/admin/variants', { params }),
  getVariantById: (id) => adminClient.get(`/admin/variants/${id}`),
  updateVariant: (id, data) => adminClient.put(`/admin/variants/${id}`, data),
  deleteVariant: (id) => adminClient.delete(`/admin/variants/${id}`),
  updateVariantQty: (id, data) => adminClient.patch(`/admin/variants/${id}/quantity`, data),
  bulkUpdateQty: (data) => adminClient.patch('/admin/variants/bulk-quantity', data),
  // Inventory
  getInventory: (params) => adminClient.get('/admin/inventory', { params }),
  updateStock: (id, data) => adminClient.patch(`/admin/inventory/${id}/stock`, data),
  getLowStock: () => adminClient.get('/admin/inventory/low-stock'),
  // Shipping
  getShipments: (params) => adminClient.get('/admin/shipping', { params }),
  updateShipment: (id, data) => adminClient.patch(`/admin/shipping/${id}`, data),
  createShipment: (data) => adminClient.post('/admin/shipping', data),
  // Payments
  getPayments: (params) => adminClient.get('/admin/payments/all', { params }),
  getPaymentDetails: (id) => adminClient.get(`/admin/payments/${id}`),
  refundPayment: (id, data) => adminClient.post(`/admin/payments/${id}/refund`, data),
  // Abandoned Carts
  getAbandonedCarts: (params) => adminClient.get('/admin/abandoned-carts', { params }),
  getAbandonedCartStats: () => adminClient.get('/admin/abandoned-carts/stats'),
  sendCartReminder: (id) => adminClient.post(`/admin/abandoned-carts/${id}/remind`),
  deleteAbandonedCart: (id) => adminClient.delete(`/admin/abandoned-carts/${id}`),
  // Support Tickets
  getSupportTickets: (params) => adminClient.get('/admin/tickets', { params }),
  getSupportTicketStats: () => adminClient.get('/admin/tickets/stats'),
  updateSupportTicket: (id, data) => adminClient.put(`/admin/tickets/${id}`, data),
  updateSupportTicketStatus: (id, data) => adminClient.patch(`/admin/tickets/${id}/status`, data),
  deleteSupportTicket: (id) => adminClient.delete(`/admin/tickets/${id}`),
  // Note: reply uses user-level endpoint - admin needs this endpoint added to backend
  replySupportTicket: (id, data) => adminClient.post(`/tickets/${id}/messages`, data),
  // Pages (CMS)
  getPages: (params) => adminClient.get('/admin/pages', { params }),
  createPage: (data) => adminClient.post('/admin/pages', data),
  updatePage: (id, data) => adminClient.put(`/admin/pages/${id}`, data),
  deletePage: (id) => adminClient.delete(`/admin/pages/${id}`),
  // Promotions
  getPromotions: (params) => adminClient.get('/admin/promotions', { params }),
  createPromotion: (data) => adminClient.post('/promotions', data),
  updatePromotion: (id, data) => adminClient.put(`/promotions/${id}`, data),
  deletePromotion: (id) => adminClient.delete(`/promotions/${id}`),
  updatePromotionStatus: (id, data) => adminClient.patch(`/promotions/${id}/status`, data),
  togglePromotion: (id, data) => adminClient.patch(`/promotions/${id}/status`, data),
  // Brands
  getBrands: (params) => adminClient.get('/admin/brands', { params }),
  createBrand: (data) => adminClient.post('/admin/brands', data),
  updateBrand: (id, data) => adminClient.put(`/admin/brands/${id}`, data),
  deleteBrand: (id) => adminClient.delete(`/admin/brands/${id}`),
  // Staff
  getStaff: () => adminClient.get('/admin/staff'),
  createStaff: (data) => adminClient.post('/admin/staff', data),
  updateStaff: (id, data) => adminClient.patch(`/admin/staff/${id}`, data),
  // Uploads
  uploadFile: (formData) => adminClient.post('/admin/upload', formData),
  uploadMultipleFiles: (formData) => adminClient.post('/admin/upload/multiple', formData),
  // Email Templates
  getEmailPreview: () => adminClient.get('/admin/email/preview'),
  sendTestEmail: (data) => adminClient.post('/admin/email/test', data),

  // Products Import (CSV)
  importProducts: (formData) => adminClient.post('/admin/products/import', formData),

  // Email Template Management (multi-template system)
  getEmailTemplates: () => adminClient.get('/admin/email-templates'),
  getEmailTemplate: (id) => adminClient.get(`/admin/email-templates/${id}`),
  updateEmailTemplate: (id, data) => adminClient.put(`/admin/email-templates/${id}`, data),
  toggleEmailTemplate: (id) => adminClient.patch(`/admin/email-templates/${id}/toggle`),
  previewEmailTemplate: (id) => adminClient.get(`/admin/email-templates/${id}/preview`),
  sendTestEmailTemplate: (id, data) => adminClient.post(`/admin/email-templates/${id}/test`, data),
};

import { adminClient } from './client';

export const analyticsAPI = {
  getFullAnalytics: (params) => adminClient.get('/admin/analytics/full', { params }),
  getSales: (params) => adminClient.get('/admin/analytics/sales', { params }),
  getProducts: (params) => adminClient.get('/admin/analytics/products', { params }),
  getUsers: (params) => adminClient.get('/admin/analytics/users', { params }),
  getRevenueTrends: (params) => adminClient.get('/admin/analytics/revenue-trends', { params }),
  getOrderStatus: (params) => adminClient.get('/admin/analytics/order-status', { params }),
  getPaymentMethods: (params) => adminClient.get('/admin/analytics/payment-methods', { params }),
  getCategoryPerformance: (params) => adminClient.get('/admin/analytics/categories', { params }),
  getTopCustomers: (params) => adminClient.get('/admin/analytics/top-customers', { params }),
  getCustomerLTV: (userId) => adminClient.get(`/admin/analytics/customers/${userId}/lifetime-value`),
  getDashboardSummary: (params) => adminClient.get('/admin/dashboard/summary', { params }),
  // New advanced analytics endpoints
  getDailySales: (params) => adminClient.get('/admin/analytics/daily-sales', { params }),
  getHourlyDistribution: (params) => adminClient.get('/admin/analytics/hourly-distribution', { params }),
  getRevenueComparison: (params) => adminClient.get('/admin/analytics/revenue-comparison', { params }),
  getCustomerGrowth: (params) => adminClient.get('/admin/analytics/customer-growth', { params }),
  getConversionMetrics: (params) => adminClient.get('/admin/analytics/conversion-metrics', { params }),
  getPaymentMethodTrends: (params) => adminClient.get('/admin/analytics/payment-method-trends', { params }),
  getReviewAnalytics: (params) => adminClient.get('/admin/analytics/reviews', { params }),
};

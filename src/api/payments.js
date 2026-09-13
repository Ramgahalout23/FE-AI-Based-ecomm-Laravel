import client from './client';
import { adminClient } from './client';

export const paymentsAPI = {
  getMethods: () => client.get('/payments/methods'),
  initiate: (data) => client.post('/payments/initiate', data),
  verify: (id, data) => client.post(`/payments/${id}/verify`, data),
  getUserPayments: () => client.get('/payments'),
  getDetails: (id) => client.get(`/payments/${id}`),
  requestRefund: (id, data) => client.post(`/payments/${id}/refund`, data),
  getUserRefunds: () => client.get('/payments/refunds/list'),
  // Admin
  getAll: (params) => adminClient.get('/admin/payments/all', { params }),
  getStats: () => adminClient.get('/admin/payments/stats'),
  approveRefund: (id) => adminClient.post(`/admin/refunds/${id}/approve`),
  rejectRefund: (id) => adminClient.post(`/admin/refunds/${id}/reject`),
  // Razorpay
  createRazorpayOrder: (data) => client.post('/payments/razorpay/create-order', data),
  verifyRazorpayPayment: (data) => client.post('/payments/razorpay/verify', data),
  // Custom gateways
  initiateCustomGateway: (data) => client.post('/payments/custom/initiate', data),
  // COD restrictions & OTP
  checkCodAvailability: (data) => client.post('/orders/check-cod', data),
  generateOtp: () => client.post('/orders/generate-otp'),
};

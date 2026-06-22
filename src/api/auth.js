import client from './client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api/v1';

// Remove /api/v1 to get the base server URL for redirect-based OAuth
const SERVER_BASE = API_BASE.replace(/\/api\/v1\/?$/, '');

export const authAPI = {
  register: (data) => client.post('/auth/register', data),
  login: (data) => client.post('/auth/login', data),
  refreshToken: (data) => client.post('/auth/refresh-token', data),
  forgotPassword: (data) => client.post('/auth/forgot-password', data),
  resetPassword: (data) => client.post('/auth/reset-password', data),
  sendVerification: (data) => client.post('/auth/send-verification', data),
  verifyEmail: (data) => client.post('/auth/verify-email', data),
  sendOtp: (data) => client.post('/auth/send-otp', data),
  verifyOtp: (data) => client.post('/auth/verify-otp', data),
  changePassword: (data) => client.post('/auth/change-password', data),
  getMe: () => client.get('/auth/me'),
  logout: () => client.post('/auth/logout'),

  // OAuth login URLs (redirect-based)
  googleLogin: () => `${SERVER_BASE}/api/v1/auth/google`,
  facebookLogin: () => `${SERVER_BASE}/api/v1/auth/facebook`,

  // Refresh OAuth strategies from server DB settings (admin only)
  refreshOAuth: () => client.post('/auth/refresh-oauth'),

  // Get OAuth provider credential status (env vs DB, configured or not)
  oauthStatus: () => client.get('/auth/oauth/status'),
};

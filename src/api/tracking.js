import client, { adminClient } from './client.js';

export const trackingAPI = {
  // Public tracking endpoints (no auth needed)
  recordPageView: (data) => client.post('/tracking/pageview', data),
  createSession: (data) => client.post('/tracking/session', data),
  recordEvent: (data) => client.post('/tracking/event', data),
  endSession: (sessionId) => client.patch(`/tracking/session/${sessionId}/end`),

  // Admin endpoints (auth required)
  getTrackingDashboard: () => adminClient.get('/admin/tracking/dashboard'),
  getPageViews: (params) => adminClient.get('/admin/tracking/pageviews', { params }),
  getPageViewStats: (params) => adminClient.get('/admin/tracking/pageviews/stats', { params }),
  getActiveSessions: () => adminClient.get('/admin/tracking/sessions/active'),
  getSessionStats: (params) => adminClient.get('/admin/tracking/sessions/stats', { params }),
  getEvents: (params) => adminClient.get('/admin/tracking/events', { params }),
  getEventStats: (params) => adminClient.get('/admin/tracking/events/stats', { params }),
  getUserJourney: (userId) => adminClient.get(`/admin/tracking/journey/${userId}`),
};

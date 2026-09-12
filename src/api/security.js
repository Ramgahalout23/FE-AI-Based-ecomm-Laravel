import { adminClient } from './client';

export const securityAPI = {
  // Metrics overview
  getMetrics: () => adminClient.get('/admin/security/metrics'),

  // IP Firewall
  getFirewallRules: (params) => adminClient.get('/admin/security/firewall', { params }),
  addFirewallRule: (data) => adminClient.post('/admin/security/firewall', data),
  deleteFirewallRule: (id) => adminClient.delete(`/admin/security/firewall/${id}`),
  toggleFirewallRule: (id) => adminClient.patch(`/admin/security/firewall/${id}/toggle`),
  testFirewallIp: (ip) => adminClient.post('/admin/security/firewall/test', { ip }),

  // Brute Force & Lockouts
  getLockoutData: () => adminClient.get('/admin/security/lockouts'),
  unlockTarget: (target) => adminClient.post('/admin/security/lockouts/unlock', { target }),
  clearAllLockouts: () => adminClient.post('/admin/security/lockouts/clear-all'),

  // Active Sessions
  getActiveSessions: () => adminClient.get('/admin/security/sessions'),
  terminateSession: (sessionId) => adminClient.delete(`/admin/security/sessions/${sessionId}`),
  terminateAllOtherSessions: () => adminClient.post('/admin/security/sessions/terminate-all'),

  // E-Commerce Fraud Radar
  getFraudAnomalies: (params) => adminClient.get('/admin/security/fraud-radar', { params }),
  updateAnomalyStatus: (id, status) => adminClient.patch(`/admin/security/fraud-radar/${id}/status`, { status }),

  // Security Policies & Master PIN
  getPolicies: () => adminClient.get('/admin/security/policies'),
  updatePolicies: (data) => adminClient.put('/admin/security/policies', data),
  verifyMasterPin: (pin) => adminClient.post('/admin/security/master-pin/verify', { pin }),
  updateMasterPin: (data) => adminClient.post('/admin/security/master-pin/update', data),
};

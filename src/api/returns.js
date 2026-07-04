import client from './client';

export const returnsAPI = {
  // ── Return Requests ──
  createReturnRequest: (data) => client.post('/return-requests', data),
  getReturnRequests: () => client.get('/return-requests'),
};

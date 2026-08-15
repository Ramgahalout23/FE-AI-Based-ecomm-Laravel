import client from './client';

export const returnsAPI = {
  // ── Return Requests ──
  createReturnRequest: (data) => client.post('/return-requests', data),
  getReturnRequests: () => client.get('/return-requests'),

  // ── Return Request Photo Uploads ──
  // Uses 'files[]' so PHP parses even a single file as an array (required|array).
  uploadImages: (files) => {
    const fd = new FormData();
    files.forEach(f => fd.append('files[]', f));
    return client.post('/uploads/return-images', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

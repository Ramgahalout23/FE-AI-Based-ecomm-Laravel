import client from './client';

export const promotionsAPI = {
  // Public endpoints
  getActive: () => client.get('/promotions'),
  getById: (id) => client.get(`/promotions/${id}`),
  // Legacy endpoints
  getCurrentDeal: () => client.get('/promotions'),
  getFlashSales: () => client.get('/promotions'),
};
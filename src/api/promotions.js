import client from './client';

export const promotionsAPI = {
  // Public endpoints
  getActive: () => client.get('/promotions'),
  // Legacy endpoints
  getCurrentDeal: () => client.get('/promotions'),
  getFlashSales: () => client.get('/promotions'),
  // Store offer cards (Smart Deal, Prepaid Offer, Summer Bonus)
  getStoreOffers: () => client.get('/store-offers'),
};
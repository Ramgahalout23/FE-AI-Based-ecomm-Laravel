import client from './client';

export const bannersAPI = {
  getActive: () => client.get('/banners'),
  getHomepage: () => client.get('/banners/homepage'),
  getHero: () => client.get('/banners/hero'),
  getSale: () => client.get('/banners/sale'),
  getCategory: () => client.get('/banners/category'),
  getPopup: () => client.get('/banners/popup'),
};

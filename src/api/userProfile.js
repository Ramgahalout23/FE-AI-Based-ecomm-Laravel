import client from './client';

export const userProfileAPI = {
  get: () => client.get('/user-profile'),
  update: (data) => client.put('/user-profile', data),
  getStats: () => client.get('/user-profile/stats'),
  // Addresses
  getAddresses: () => client.get('/user-profile/addresses'),
  getDefaultAddress: () => client.get('/user-profile/addresses/default'),
  createAddress: (data) => client.post('/user-profile/addresses', data),
  updateAddress: (id, data) => client.put(`/user-profile/addresses/${id}`, data),
  setDefaultAddress: (id) => client.post(`/user-profile/addresses/${id}/set-default`),
  deleteAddress: (id) => client.delete(`/user-profile/addresses/${id}`),
};

export const addressesAPI = {
  create: (data) => client.post('/addresses', data),
  getAll: () => client.get('/addresses'),
  getById: (id) => client.get(`/addresses/${id}`),
  update: (id, data) => client.put(`/addresses/${id}`, data),
  delete: (id) => client.delete(`/addresses/${id}`),
};

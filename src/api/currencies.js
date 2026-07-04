import client from './client';

export const currenciesAPI = {
  /** Get all active currencies */
  getAll: () => client.get('/currencies'),

  /** Get the default currency */
  getDefault: () => client.get('/currencies/default'),

  /** Convert amount from default currency to target currency */
  convert: (amount, to) =>
    client.post('/currencies/convert', { amount, to }),
};

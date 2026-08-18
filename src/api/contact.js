import client from './client';

export const contactAPI = {
  send: (data) => client.post('/contact', data),
};

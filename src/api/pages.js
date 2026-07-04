import client from './client';

export const pagesAPI = {
  getAll: () => client.get('/pages'),
  getBySlug: (slug) => client.get(`/pages/${slug}`),
};
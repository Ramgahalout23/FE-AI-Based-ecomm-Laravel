import client from './client';

/**
 * SEO API — used by storefront pages to fetch SEO metadata
 * (Admin write endpoints are in admin.js)
 */
export const seoAPI = {
  /** Get global site SEO (title, description, keywords) */
  getGlobalSEO: () => client.get('/seo/global'),

  /** Get SEO metadata for a specific entity (product, category, page) */
  getEntitySEO: (entityType, entityId) =>
    client.get(`/seo/${entityType}/${entityId}`),
};

import client from './client';

/**
 * Consolidated homepage API.
 *
 * getAll() returns the CORE payload (hero, featured, categories, settings…)
 * in one request. The below-the-fold sections (new arrivals, best sellers,
 * reviews, reels) are fetched lazily on scroll via the section endpoints so
 * the initial page payload stays small.
 */
export const homepageAPI = {
  getAll: () => client.get('/homepage'),
  getNewArrivals: () => client.get('/homepage/sections/new-arrivals'),
  getBestSellers: () => client.get('/homepage/sections/best-sellers'),
  getReviews: () => client.get('/homepage/sections/reviews'),
  getReels: () => client.get('/homepage/sections/reels'),
};

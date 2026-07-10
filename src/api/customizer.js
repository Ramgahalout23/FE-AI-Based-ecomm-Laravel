import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const customizerAPI = {
  /**
   * List all saved designs for the authenticated user.
   */
  list: async () => {
    const res = await api.get('/customizer/designs');
    return res.data?.data || [];
  },

  /**
   * Save a new t-shirt design.
   */
  save: async (design) => {
    const res = await api.post('/customizer/designs', design);
    return res.data;
  },

  /**
   * Get a single saved design by ID.
   */
  get: async (id) => {
    const res = await api.get(`/customizer/designs/${id}`);
    return res.data?.data || null;
  },

  /**
   * Update an existing saved design.
   */
  update: async (id, design) => {
    const res = await api.put(`/customizer/designs/${id}`, design);
    return res.data;
  },

  /**
   * Delete a saved design.
   */
  delete: async (id) => {
    const res = await api.delete(`/customizer/designs/${id}`);
    return res.data;
  },

  /**
   * Upload a custom design image (legacy 3D customizer).
   */
  uploadDesignImage: async (formData) => {
    const res = await api.post('/customizer/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
};

/**
 * Dedicated API for custom design orders (simplified order-based flow).
 */
export const customDesignAPI = {
  /**
   * Upload a custom design image for an order.
   */
  uploadDesignImage: async (formData) => {
    const res = await api.post('/custom-designs/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /**
   * Create a custom design record (called when order is placed).
   */
  create: async (data) => {
    const res = await api.post('/custom-designs', data);
    return res.data;
  },

  /**
   * Get the authenticated user's custom designs.
   */
  getUserDesigns: async () => {
    const res = await api.get('/custom-designs/user');
    return res.data?.data || [];
  },
};


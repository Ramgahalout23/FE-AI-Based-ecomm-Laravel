import client from './client';
import { adminClient } from './client';

export const curatedLooksAPI = {
  // Public: Get active curated looks
  get: () => client.get('/curated-looks'),

  // Admin: Get all curated looks (including inactive)
  getAll: (params) => adminClient.get('/admin/curated-looks', { params }),

  // Admin: Get single curated look
  getById: (id) => adminClient.get(`/admin/curated-looks/${id}`),

  // Admin: Create curated look
  create: (data) => adminClient.post('/admin/curated-looks', {
    name: data.name,
    image_url: data.imageUrl ?? data.image_url ?? data.image,
    description: data.description,
    display_order: data.displayOrder ?? data.display_order ?? 0,
    is_active: data.isActive ?? data.is_active ?? true,
  }),

  // Admin: Update curated look
  update: (id, data) => adminClient.put(`/admin/curated-looks/${id}`, {
    name: data.name,
    image_url: data.imageUrl ?? data.image_url ?? data.image,
    description: data.description,
    display_order: data.displayOrder ?? data.display_order,
    is_active: data.isActive ?? data.is_active,
  }),

  // Admin: Delete curated look
  delete: (id) => adminClient.delete(`/admin/curated-looks/${id}`),

  // Admin: Reorder curated looks
  reorder: (looks) => adminClient.patch('/admin/curated-looks/reorder', {
    looks: looks.map((l, i) => ({ id: l.id, display_order: l.displayOrder ?? i })),
  }),

  // Admin: Sync products for a curated look
  syncProducts: (id, productIds) =>
    adminClient.post(`/admin/curated-looks/${id}/products`, { product_ids: productIds }),
};

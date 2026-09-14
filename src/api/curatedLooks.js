import client from './client';
import { adminClient } from './client';

export const curatedLooksAPI = {
  // Public: Get active curated looks
  get: () => client.get('/curated-looks'),

  // Public: Get single curated look by slug
  getBySlug: (slug) => client.get(`/curated-looks/${slug}`),

  // Admin: Get all curated looks (including inactive)
  getAll: (params) => adminClient.get('/admin/curated-looks', { params }),

  // Admin: Get single curated look
  getById: (id) => adminClient.get(`/admin/curated-looks/${id}`),

  // Admin: Create curated look
  create: (data) => adminClient.post('/admin/curated-looks', {
    name: data.name,
    imageUrl: data.imageUrl ?? data.image_url ?? data.image,
    image_url: data.imageUrl ?? data.image_url ?? data.image,
    description: data.description,
    displayOrder: data.displayOrder ?? data.display_order ?? 0,
    display_order: data.displayOrder ?? data.display_order ?? 0,
    isActive: data.isActive ?? data.is_active ?? true,
    is_active: data.isActive ?? data.is_active ?? true,
    productIds: data.productIds ?? data.product_ids ?? [],
    product_ids: data.productIds ?? data.product_ids ?? [],
  }),

  // Admin: Update curated look
  update: (id, data) => adminClient.put(`/admin/curated-looks/${id}`, {
    name: data.name,
    imageUrl: data.imageUrl ?? data.image_url ?? data.image,
    image_url: data.imageUrl ?? data.image_url ?? data.image,
    description: data.description,
    displayOrder: data.displayOrder ?? data.display_order,
    display_order: data.displayOrder ?? data.display_order,
    isActive: data.isActive ?? data.is_active,
    is_active: data.isActive ?? data.is_active,
    productIds: data.productIds ?? data.product_ids,
    product_ids: data.productIds ?? data.product_ids,
  }),

  // Admin: Delete curated look
  delete: (id) => adminClient.delete(`/admin/curated-looks/${id}`),

  // Admin: Reorder curated looks
  reorder: (looks) => adminClient.patch('/admin/curated-looks/reorder', {
    looks: looks.map((l, i) => ({
      id: l.id,
      displayOrder: l.displayOrder ?? l.display_order ?? i,
      display_order: l.displayOrder ?? l.display_order ?? i,
    })),
  }),

  // Admin: Sync products for a curated look
  syncProducts: (id, productIds) =>
    adminClient.post(`/admin/curated-looks/${id}/products`, {
      product_ids: productIds,
      productIds: productIds,
    }),
};

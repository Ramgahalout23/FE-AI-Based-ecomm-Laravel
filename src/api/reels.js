import client from './client';
import { adminClient } from './client';

export const reelsAPI = {
  // Public: Get active reels for homepage
  get: () => client.get('/reels'),

  // Admin: Get all reels (including inactive) with pagination
  getAll: (params) => adminClient.get('/admin/reels', { params }),

  // Admin: Get single reel
  getById: (id) => adminClient.get(`/admin/reels/${id}`),

  // Admin: Create reel
  create: (data) => adminClient.post('/admin/reels', {
    title: data.title,
    badge: data.badge ?? '',
    description: data.description,
    videoUrl: data.videoUrl ?? data.video_url ?? '',
    imageUrl: data.imageUrl ?? data.image_url ?? '',
    linkUrl: data.linkUrl ?? data.link_url ?? '',
    displayOrder: data.displayOrder ?? data.display_order ?? 0,
    isActive: data.isActive ?? data.is_active ?? true,
    productIds: data.productIds ?? data.product_ids ?? [],
  }),

  // Admin: Update reel
  update: (id, data) => adminClient.put(`/admin/reels/${id}`, {
    title: data.title,
    badge: data.badge ?? '',
    description: data.description,
    videoUrl: data.videoUrl ?? data.video_url,
    imageUrl: data.imageUrl ?? data.image_url,
    linkUrl: data.linkUrl ?? data.link_url,
    displayOrder: data.displayOrder ?? data.display_order,
    isActive: data.isActive ?? data.is_active,
    productIds: data.productIds ?? data.product_ids ?? [],
  }),

  // Admin: Delete reel
  delete: (id) => adminClient.delete(`/admin/reels/${id}`),

  // Admin: Toggle reel status
  toggleStatus: (id) => adminClient.patch(`/admin/reels/${id}/toggle`),

  // Admin: Get users who liked a reel
  getLikes: (id) => adminClient.get(`/admin/reels/${id}/likes`),

  // Admin: Reorder reels
  reorder: (reels) => adminClient.patch('/admin/reels/reorder', {
    reels: reels.map((r, i) => ({ id: r.id, displayOrder: r.displayOrder ?? r.display_order ?? i })),
  }),
};

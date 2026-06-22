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
    description: data.description,
    video_url: data.videoUrl ?? data.video_url ?? '',
    image_url: data.imageUrl ?? data.image_url ?? '',
    link_url: data.linkUrl ?? data.link_url ?? '',
    display_order: data.displayOrder ?? data.display_order ?? 0,
    is_active: data.isActive ?? data.is_active ?? true,
  }),

  // Admin: Update reel
  update: (id, data) => adminClient.put(`/admin/reels/${id}`, {
    title: data.title,
    description: data.description,
    video_url: data.videoUrl ?? data.video_url,
    image_url: data.imageUrl ?? data.image_url,
    link_url: data.linkUrl ?? data.link_url,
    display_order: data.displayOrder ?? data.display_order,
    is_active: data.isActive ?? data.is_active,
  }),

  // Admin: Delete reel
  delete: (id) => adminClient.delete(`/admin/reels/${id}`),

  // Admin: Toggle reel status
  toggleStatus: (id) => adminClient.patch(`/admin/reels/${id}/toggle`),

  // Admin: Reorder reels
  reorder: (reels) => adminClient.patch('/admin/reels/reorder', {
    reels: reels.map((r, i) => ({ id: r.id, display_order: r.displayOrder ?? i })),
  }),
};

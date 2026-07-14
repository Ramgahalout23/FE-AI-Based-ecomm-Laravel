import client from './client';

export const reelLikesAPI = {
  like: (reelId) => client.post(`/reels/${reelId}/like`),
  unlike: (reelId) => client.delete(`/reels/${reelId}/like`),
  check: (reelId) => client.get(`/reels/${reelId}/liked`),
};

import client, { adminClient } from './client';

export const ticketsAPI = {
  // Get user's tickets
  getUserTickets: () => client.get('/tickets'),
  // Get ticket by ID
  getTicketById: (id) => client.get(`/tickets/${id}`),
  // Create new ticket
  createTicket: (data) => client.post('/tickets', data),
  // Add message to ticket
  addMessage: (id, data) => client.post(`/tickets/${id}/messages`, data),

  // ── Ticket Screenshot Uploads ──
  // Uses 'files[]' so PHP parses even a single file as an array (required|array).
  uploadImages: (files) => {
    const fd = new FormData();
    files.forEach(f => fd.append('files[]', f));
    return client.post('/uploads/ticket-images', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// ─── Live Chat API ────────────────────────────────────────

export const chatAPI = {
  /** Init or return an existing chat ticket */
  initChat: (sessionId) => client.post('/chat/init', {}, { headers: sessionId ? { 'X-Session-ID': sessionId } : {} }),

  /** Send a message in a chat */
  sendMessage: (ticketId, content, sessionId) =>
    client.post(`/chat/${ticketId}/messages`, { content }, { headers: sessionId ? { 'X-Session-ID': sessionId } : {} }),

  /** Get messages for a chat */
  getMessages: (ticketId) =>
    client.get(`/chat/${ticketId}/messages`),

  /** Send typing indicator */
  sendTyping: (ticketId, isTyping) =>
    client.post(`/chat/${ticketId}/typing`, { isTyping }),

  /** Admin: get active conversations */
  getAdminConversations: (params) =>
    adminClient.get('/admin/chat/conversations', { params }),

  /** Admin: update chat status */
  updateChatStatus: (ticketId, status) =>
    adminClient.patch(`/admin/chat/${ticketId}/status`, { status }),

  /** Admin: get chat stats */
  getChatStats: () =>
    adminClient.get('/admin/chat/stats'),

  /** Get current chat mode (ai or live) */
  getChatMode: () =>
    client.get('/chat/mode'),

  /** Get welcome message with suggestions */
  getWelcomeMessage: () =>
    client.get('/chat/welcome'),

  /** Track order by number */
  trackOrder: (orderNumber) =>
    client.post('/chat/track-order', { orderNumber }),

  /** Submit CSAT rating */
  submitCsat: (ticketId, rating) =>
    client.post('/chat/csat', { ticketId, rating }),

  /** Admin: get chat analytics */
  getChatAnalytics: (params) =>
    adminClient.get('/admin/chat/analytics', { params }),

  /** Admin: switch chat mode */
  setChatMode: (mode) =>
    adminClient.put('/admin/chat/mode', { mode }),

  /** Admin: send message in a conversation */
  adminSendMessage: (ticketId, content) =>
    adminClient.post(`/admin/chat/${ticketId}/messages`, { content }),

  /** Admin: get messages for a conversation */
  adminGetMessages: (ticketId) =>
    adminClient.get(`/admin/chat/${ticketId}/messages`),

  /** User: send chat image */
  sendChatImage: (ticketId, file, sessionId) => {
    const fd = new FormData();
    fd.append('file', file);
    return client.post(`/chat/${ticketId}/upload-image`, fd, {
      headers: { 'Content-Type': 'multipart/form-data', ...(sessionId ? { 'X-Session-ID': sessionId } : {}) },
    });
  },

  /** Admin: send chat image */
  adminSendChatImage: (ticketId, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return adminClient.post(`/admin/chat/${ticketId}/upload-image`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** Admin: clear all messages in a chat */
  adminClearMessages: (ticketId) =>
    adminClient.delete(`/admin/chat/${ticketId}/messages`),

  /** Admin: delete entire chat */
  adminDeleteChat: (ticketId) =>
    adminClient.delete(`/admin/chat/${ticketId}`),
};

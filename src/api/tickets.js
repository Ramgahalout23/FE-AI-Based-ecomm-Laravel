import client from './client';

export const ticketsAPI = {
  // Get user's tickets
  getUserTickets: () => client.get('/tickets'),
  // Get ticket by ID
  getTicketById: (id) => client.get(`/tickets/${id}`),
  // Create new ticket
  createTicket: (data) => client.post('/tickets', data),
  // Add message to ticket
  addMessage: (id, data) => client.post(`/tickets/${id}/messages`, data),
};

// ─── Live Chat API ────────────────────────────────────────

export const chatAPI = {
  /** Init or return an existing chat ticket */
  initChat: () => client.post('/chat/init'),

  /** Send a message in a chat */
  sendMessage: (ticketId, content) =>
    client.post(`/chat/${ticketId}/messages`, { content }),

  /** Get messages for a chat */
  getMessages: (ticketId) =>
    client.get(`/chat/${ticketId}/messages`),

  /** Send typing indicator */
  sendTyping: (ticketId, isTyping) =>
    client.post(`/chat/${ticketId}/typing`, { isTyping }),

  /** Admin: get active conversations */
  getAdminConversations: (params) =>
    client.get('/chat/admin/conversations', { params }),

  /** Admin: update chat status */
  updateChatStatus: (ticketId, status) =>
    client.patch(`/chat/admin/${ticketId}/status`, { status }),

  /** Admin: get chat stats */
  getChatStats: () =>
    client.get('/chat/admin/stats'),
};
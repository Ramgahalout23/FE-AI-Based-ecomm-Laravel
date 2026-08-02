import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the axios client so chatAPI never makes real HTTP calls.
// The module under test does `import client, { adminClient } from './client'`,
// so both the default and named exports must be provided.
vi.mock('./client', () => ({
  default: { post: vi.fn(), get: vi.fn(), patch: vi.fn() },
  adminClient: { post: vi.fn(), get: vi.fn(), patch: vi.fn() },
}));

import client from './client';
import { chatAPI } from './tickets';

beforeEach(vi.clearAllMocks);

/**
 * Regression guard — the `support_tickets` table ENUMs must only ever be set
 * by the backend (TicketService defaults). The chat endpoints (`/chat/init`,
 * `/chat/{id}/messages`) never accept these fields, so a payload containing
 * them (e.g. the old hardcoded `priority: 'NORMAL'` bug) would cause a
 * "Data truncated" SQL error on insert.
 */
const FORBIDDEN_FIELDS = ['priority', 'category', 'status'];

function assertNoForbiddenFields(payload, context) {
  for (const field of FORBIDDEN_FIELDS) {
    expect(payload, `${context} must not contain '${field}'`).not.toHaveProperty(field);
  }
}

describe('chatAPI — chat payloads never leak ticket ENUM fields', () => {
  it('initChat posts to /chat/init with no body', () => {
    chatAPI.initChat();

    const [url, payload] = client.post.mock.calls[0];
    expect(url).toBe('/chat/init');
    // No body at all — stronger than just forbidding ENUM fields.
    expect(payload).toBeUndefined();
  });

  it('sendMessage payload is exactly { content } — no priority/category/status', () => {
    chatAPI.sendMessage('ticket-123', 'Hello, I need help');

    const [url, payload] = client.post.mock.calls[0];
    expect(url).toBe('/chat/ticket-123/messages');
    expect(payload).toEqual({ content: 'Hello, I need help' });
    assertNoForbiddenFields(payload, 'sendMessage');
  });

  it('sendMessage accepts empty content without injecting extra fields', () => {
    chatAPI.sendMessage('ticket-456', '');

    const payload = client.post.mock.calls[0][1];
    expect(payload).toEqual({ content: '' });
    assertNoForbiddenFields(payload, 'sendMessage');
  });
});

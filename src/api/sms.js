import { adminClient } from './client';

export const smsAPI = {
  health: () => adminClient.get('/admin/sms/health'),
  send: (data) => adminClient.post('/admin/sms/send', data),
  aiDraft: (data) => adminClient.post('/admin/sms/ai-draft', data),
};

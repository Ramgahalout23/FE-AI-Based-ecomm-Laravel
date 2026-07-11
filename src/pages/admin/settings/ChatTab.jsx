import { X, Minus, Send, MessageCircle, Plus, Trash2, GripVertical } from 'lucide-react';
import { useState, useCallback } from 'react';
import { formatTime } from '../../../utils/formatters';

;

function parseQuickReplies(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ChatTab({ settings, setSettings, loading, handleSaveSettings }) {
  const [previewOpen, setPreviewOpen] = useState(false);

  // Parse quick replies from settings (JSON string), with fallback
  const quickReplies = parseQuickReplies(settings.whatsappQuickReplies);

  const updateQuickReplies = useCallback((updated) => {
    setSettings({ ...settings, whatsappQuickReplies: JSON.stringify(updated) });
  }, [settings, setSettings]);

  const addQuickReply = useCallback(() => {
    updateQuickReplies([...quickReplies, { label: '📌 New Topic', message: 'Hi, I have a question about...' }]);
  }, [quickReplies, updateQuickReplies]);

  const removeQuickReply = useCallback((idx) => {
    const updated = quickReplies.filter((_, i) => i !== idx);
    updateQuickReplies(updated);
  }, [quickReplies, updateQuickReplies]);

  const updateQuickReply = useCallback((idx, field, value) => {
    const updated = quickReplies.map((reply, i) =>
      i === idx ? { ...reply, [field]: value } : reply
    );
    updateQuickReplies(updated);
  }, [quickReplies, updateQuickReplies]);

  const moveQuickReply = useCallback((idx, direction) => {
    const target = idx + direction;
    if (target < 0 || target >= quickReplies.length) return;
    const updated = [...quickReplies];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    updateQuickReplies(updated);
  }, [quickReplies, updateQuickReplies]);

  return (
    <div>
      {/* General Settings */}
      <div className="detail-panel">
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3>Chat / Support Configuration</h3>
            <span className={`status-badge ${settings.chatbotEnabled !== 'false' ? 'status-active' : 'status-pending'}`}>
              {settings.chatbotEnabled !== 'false' ? 'Active' : 'Disabled'}
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.chatbotEnabled !== 'false'} onChange={e => setSettings({ ...settings, chatbotEnabled: e.target.checked ? 'true' : 'false' })} />
            <strong>Enable live chat widget</strong>
          </label>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
          When enabled, a floating chat bubble appears at the bottom-right of the storefront.
          Customers can reach out for support without leaving the page.
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label>Support Team Name</label>
            <input value={settings.chatSupportName || 'Support Team'} onChange={e => setSettings({ ...settings, chatSupportName: e.target.value })} placeholder="Support Team" />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Displayed as the sender name in the chat header</span>
          </div>
          <div className="form-group">
            <label>Response Time Text</label>
            <input value={settings.chatResponseTime || 'We typically reply in minutes'} onChange={e => setSettings({ ...settings, chatResponseTime: e.target.value })} placeholder="We typically reply in minutes" />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Shown below the chat header to set response expectations</span>
          </div>
        </div>
      </div>

      {/* Messages & Auto-Reply */}
      <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
        <div className="detail-header" style={{ marginBottom: '1rem' }}>
          <h3>Messages & Auto-Reply</h3>
        </div>
        <div className="form-grid">
          <div className="form-group form-full">
            <label>Welcome Message</label>
            <textarea rows={3} value={settings.chatWelcomeMessage || 'Hi there! How can we help you today?'} onChange={e => setSettings({ ...settings, chatWelcomeMessage: e.target.value })} placeholder="Hi there! How can we help you today?" />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Shown as the first message when a customer opens the chat</span>
          </div>
          <div className="form-group form-full">
            <label>Offline Message</label>
            <textarea rows={3} value={settings.chatOfflineMessage || 'We are currently offline. Please leave a message and we will get back to you during business hours.'} onChange={e => setSettings({ ...settings, chatOfflineMessage: e.target.value })} placeholder="We are currently offline..." />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Shown when a customer opens the chat outside of working hours</span>
          </div>
          <div className="form-group form-full">
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ margin: 0 }}>Auto-Reply</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={settings.chatAutoReplyEnabled !== 'false'} onChange={e => setSettings({ ...settings, chatAutoReplyEnabled: e.target.checked ? 'true' : 'false' })} />
                <strong>Enable auto-reply</strong>
              </label>
            </div>
            {settings.chatAutoReplyEnabled !== 'false' && (
              <textarea rows={2} value={settings.chatAutoReplyMessage || ''} onChange={e => setSettings({ ...settings, chatAutoReplyMessage: e.target.value })} placeholder="Thank you for your message! One of our team members will get back to you shortly." />
            )}
          </div>
        </div>
      </div>

      {/* Working Hours */}
      <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3>Working Hours</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
              Configure when your support team is available. Outside these hours, the offline message is shown.
            </p>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.chatWorkingHoursEnabled !== 'false'} onChange={e => setSettings({ ...settings, chatWorkingHoursEnabled: e.target.checked ? 'true' : 'false' })} />
            <strong>Enable Working Hours</strong>
          </label>
        </div>
        {settings.chatWorkingHoursEnabled !== 'false' && (
          <div className="form-grid">
            <div className="form-group">
              <label>Start Time</label>
              <input type="time" value={settings.chatWorkingHoursStart || '09:00'} onChange={e => setSettings({ ...settings, chatWorkingHoursStart: e.target.value })} />
            </div>
            <div className="form-group">
              <label>End Time</label>
              <input type="time" value={settings.chatWorkingHoursEnd || '18:00'} onChange={e => setSettings({ ...settings, chatWorkingHoursEnd: e.target.value })} />
            </div>
            <div className="form-group form-full">
              <label>Working Days</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => {
                  const selected = (settings.chatWorkingDays || 'Monday,Tuesday,Wednesday,Thursday,Friday').split(',').map(d => d.trim()).includes(day);
                  return (
                    <button key={day} type="button" onClick={() => {
                      const days = (settings.chatWorkingDays || 'Monday,Tuesday,Wednesday,Thursday,Friday').split(',').map(d => d.trim()).filter(Boolean);
                      const updated = selected ? days.filter(d => d !== day) : [...days, day];
                      setSettings({ ...settings, chatWorkingDays: updated.join(',') });
                    }} style={{
                      padding: '0.35rem 0.65rem', borderRadius: '6px',
                      border: selected ? '2px solid var(--charcoal)' : '1px solid var(--border)',
                      background: selected ? 'var(--charcoal)' : 'var(--off-white)',
                      color: selected ? 'white' : 'var(--charcoal)',
                      cursor: 'pointer', fontSize: '0.78rem', fontWeight: selected ? 600 : 400,
                    }}>{day.slice(0, 3)}</button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Preview */}
      <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
        <div className="detail-header" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3>Chat Preview</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic' }}>
            Click the chat bubble to see a live preview with current settings
          </span>
        </div>
        <div style={{
          background: '#f0f0f0', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
          padding: '1.5rem', position: 'relative', minHeight: '380px', overflow: 'hidden',
        }}>
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '0.5rem', opacity: 0.5 }}>Storefront</div>
              <div style={{ fontSize: '14px', color: '#aaa', fontWeight: 500 }}>Storefront Preview</div>
            </div>
          </div>
          <button onClick={() => setPreviewOpen(!previewOpen)} style={{
            position: 'absolute', bottom: '24px', right: '24px', zIndex: 10,
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #1a1a1a, #333)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            transition: 'transform 0.2s ease, boxShadow 0.2s ease',
          }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.3)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)'; }}
            aria-label="Toggle chat preview"
          >
            {previewOpen ? <X size={20} color="white" /> : <MessageCircle size={20} color="white" />}
          </button>
          {previewOpen && (
            <div style={{
              position: 'absolute', bottom: '80px', right: '24px', zIndex: 11,
              width: '320px', maxWidth: 'calc(100% - 48px)', maxHeight: '360px',
              background: '#ffffff', borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)', color: 'white',
                padding: '14px 16px', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexShrink: 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: settings.chatWorkingHoursEnabled !== 'false' ? '#22c55e' : '#f59e0b',
                    boxShadow: settings.chatWorkingHoursEnabled !== 'false' ? '0 0 8px rgba(34,197,94,0.5)' : '0 0 8px rgba(245,158,11,0.5)',
                  }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700 }}>{settings.chatSupportName || 'Support Team'}</div>
                    <div style={{ fontSize: '10px', opacity: 0.7 }}>
                      {settings.chatWorkingHoursEnabled !== 'false' ? 'Online' : 'Away'} &middot;{' '}
                      {settings.chatResponseTime || 'We reply in minutes'}
                    </div>
                  </div>
                </div>
                <button onClick={() => setPreviewOpen(false)} style={{
                  background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '2px', display: 'flex', borderRadius: '4px',
                }} aria-label="Close chat preview">
                  <Minus size={16} />
                </button>
              </div>
              <div style={{
                flex: 1, padding: '16px', background: '#f8f9fa',
                display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '160px', overflowY: 'auto',
              }}>
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%', padding: '10px 14px',
                    borderRadius: '4px 16px 16px 16px', background: '#e8e8e8',
                    color: '#1a1a1a', fontSize: '13px', lineHeight: 1.4,
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '3px', color: '#555' }}>
                      {settings.chatSupportName || 'Support Team'}
                    </div>
                    <div>{settings.chatWelcomeMessage || 'Hi there! How can we help you today?'}</div>
                    <div style={{ fontSize: '9px', opacity: 0.5, marginTop: '4px', textAlign: 'right' }}>
                      {formatTime(new Date())}
                    </div>
                  </div>
                </div>
                {settings.chatAutoReplyEnabled !== 'false' && settings.chatAutoReplyMessage && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <div style={{
                        maxWidth: '80%', padding: '8px 14px', borderRadius: '16px 4px 16px 16px',
                        background: '#1a1a1a', color: 'white', fontSize: '13px', lineHeight: 1.4,
                      }}>
                        <div>I need help with my order #1234</div>
                        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>Just now</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{
                        maxWidth: '85%', padding: '10px 14px', borderRadius: '4px 16px 16px 16px',
                        background: '#e8e8e8', color: '#1a1a1a', fontSize: '13px', lineHeight: 1.4,
                      }}>
                        <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '2px', color: '#888' }}>Auto-Reply</div>
                        <div>{settings.chatAutoReplyMessage}</div>
                        <div style={{ fontSize: '9px', opacity: 0.5, marginTop: '4px', textAlign: 'right' }}>Just now</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div style={{
                borderTop: '1px solid #e8e8e8', padding: '10px 12px', background: 'white',
                display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0,
              }}>
                <div style={{
                  flex: 1, border: '1px solid #ddd', borderRadius: '10px', padding: '8px 12px',
                  fontSize: '13px', color: '#999', fontFamily: 'inherit', lineHeight: 1.4,
                }}>Type your message...</div>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px', background: '#e8e8e8',
                  color: '#999', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}><Send size={14} /></div>
              </div>
            </div>
          )}
        </div>
      </div>

      
      {/* -- WhatsApp Quick Replies -- */}
      <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
        <div className="detail-header" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>WhatsApp Quick Replies</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                Customize the quick reply chips shown in the WhatsApp chat popup.
                Clicking a chip sends the customer directly to WhatsApp with that message.
              </p>
            </div>
            <button className="btn-dark btn-sm" onClick={addQuickReply} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Plus size={14} /> Add Reply
            </button>
          </div>
        </div>

        {quickReplies.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
            <p>No quick replies configured. Add one to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {quickReplies.map((reply, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem',
                background: 'var(--off-white)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
              }}>
                {/* Drag Handle */}
                <div style={{ color: '#bbb', cursor: 'grab', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                  <GripVertical size={16} />
                </div>

                {/* Index */}
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50%',
                  background: 'var(--charcoal)', color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, flexShrink: 0,
                }}>
                  {idx + 1}
                </div>

                {/* Label */}
                <div style={{ flex: '0 0 30%', minWidth: '120px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.2rem' }}>
                    Label
                  </label>
                  <input
                    value={reply.label}
                    onChange={(e) => updateQuickReply(idx, 'label', e.target.value)}
                    placeholder="👋 Hi!"
                    style={{
                      width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px',
                      border: '1px solid var(--border)', fontSize: '0.82rem',
                      fontFamily: 'inherit', background: 'white',
                    }}
                  />
                </div>

                {/* Message */}
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#555', display: 'block', marginBottom: '0.2rem' }}>
                    WhatsApp Message
                  </label>
                  <input
                    value={reply.message}
                    onChange={(e) => updateQuickReply(idx, 'message', e.target.value)}
                    placeholder="Hi, I have a question..."
                    style={{
                      width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px',
                      border: '1px solid var(--border)', fontSize: '0.82rem',
                      fontFamily: 'inherit', background: 'white',
                    }}
                  />
                </div>

                {/* Move up / down */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
                  <button
                    onClick={() => moveQuickReply(idx, -1)}
                    disabled={idx === 0}
                    style={{
                      width: '24px', height: '20px', borderRadius: '4px',
                      border: '1px solid var(--border)', background: 'white',
                      cursor: idx === 0 ? 'not-allowed' : 'pointer',
                      opacity: idx === 0 ? 0.3 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: '#555', padding: 0,
                    }}
                    aria-label="Move up"
                  >▲</button>
                  <button
                    onClick={() => moveQuickReply(idx, 1)}
                    disabled={idx === quickReplies.length - 1}
                    style={{
                      width: '24px', height: '20px', borderRadius: '4px',
                      border: '1px solid var(--border)', background: 'white',
                      cursor: idx === quickReplies.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: idx === quickReplies.length - 1 ? 0.3 : 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', color: '#555', padding: 0,
                    }}
                    aria-label="Move down"
                  >▼</button>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeQuickReply(idx)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    border: '1px solid #fecaca', background: '#fef2f2',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, color: '#dc2626',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#fee2e2'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                  aria-label="Remove reply"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Preview of how replies look */}
        {quickReplies.length > 0 && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            background: 'white',
            border: '1px dashed var(--border)',
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#999', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Preview
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {quickReplies.map((reply, idx) => (
                <span key={idx} style={{
                  padding: '6px 12px', borderRadius: '20px',
                  border: '1px solid #ddd', background: '#f5f5f5',
                  fontSize: '12px', fontWeight: 600, color: '#555',
                  whiteSpace: 'nowrap',
                }}>
                  {reply.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
            {loading ? 'Saving...' : 'Save Quick Replies'}
          </button>
        </div>
      </div>

      {/* -- Phone Lead Banner -- */}
      <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3>Phone Lead Banner</h3>
            <span className={`status-badge ${settings.phoneLeadBannerEnabled !== 'false' ? 'status-active' : 'status-pending'}`}>
              {settings.phoneLeadBannerEnabled !== 'false' ? 'Visible' : 'Hidden'}
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.phoneLeadBannerEnabled !== 'false'} onChange={e => setSettings({ ...settings, phoneLeadBannerEnabled: e.target.checked ? 'true' : 'false' })} />
            <strong>Show banner on storefront</strong>
          </label>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          A full-screen welcome overlay that asks visitors for their phone number to receive 
          exclusive offers and discounts. Appears 2 seconds after page load and dismisses permanently on close.
        </p>
        <div className="form-grid">
          <div className="form-group form-full">
            <label>Banner Heading</label>
            <input
              value={settings.phoneLeadBannerHeading || 'Get 100 Off Your First Order!'}
              onChange={e => setSettings({ ...settings, phoneLeadBannerHeading: e.target.value })}
              placeholder="Get 100 Off Your First Order!"
              disabled={settings.phoneLeadBannerEnabled === 'false'}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>The bold heading shown at the top of the banner</span>
          </div>
          <div className="form-group form-full">
            <label>Offer Description</label>
            <textarea
              rows={2}
              value={settings.phoneLeadBannerOfferText || 'Enter your phone number to receive exclusive offers, updates, and instant 100 discount on your first purchase!'}
              onChange={e => setSettings({ ...settings, phoneLeadBannerOfferText: e.target.value })}
              placeholder="Enter your phone number to receive exclusive offers..."
              disabled={settings.phoneLeadBannerEnabled === 'false'}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>The paragraph text below the heading explaining the offer</span>
          </div>
        </div>

        {/* Preview */}
        <div style={{
          marginTop: '1rem',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          opacity: settings.phoneLeadBannerEnabled !== 'false' ? 1 : 0.4,
          transition: 'opacity 0.3s ease',
          position: 'relative',
        }}>
          <div style={{
            background: '#1A1A1A',
            padding: '1.25rem 1.5rem',
            textAlign: 'center',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.04,
              backgroundImage: 'radial-gradient(circle at 30% 30%, #C9A96E 0%, transparent 60%), radial-gradient(circle at 70% 80%, #C9A96E 0%, transparent 50%)',
            }} />
            <div style={{
              position: 'absolute', bottom: 0, left: '25%', right: '25%',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, rgba(201, 169, 110, 0.3), transparent)',
            }} />
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 0.75rem', fontSize: '1.25rem',
                border: '1px solid rgba(255,255,255,0.08)',
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C9A96E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 12 20 22 4 22 4 12" /><rect x="2" y="7" width="20" height="5" /><line x1="12" y1="22" x2="12" y2="7" /><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
                </svg>
              </div>
              <h4 style={{
                color: 'white', margin: 0, fontSize: '1.1rem', fontWeight: 700,
                fontFamily: 'var(--font-display)', letterSpacing: '-0.01em',
              }}>
                {settings.phoneLeadBannerHeading || 'Get 100 Off Your First Order!'}
              </h4>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', margin: '0.5rem auto 0', maxWidth: '280px', fontWeight: 300 }}>
                {settings.phoneLeadBannerOfferText || 'Enter your phone number to receive exclusive offers...'}
              </p>
            </div>
          </div>
          <div style={{ padding: '1rem 1.25rem', background: '#FAF7F2' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#6B6560', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
              Phone Number
            </div>
            <div style={{
              display: 'flex', gap: '0.5rem',
            }}>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                readOnly
                style={{
                  flex: 1,
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  border: '2px solid #E8E2D9',
                  fontSize: '0.85rem',
                  fontFamily: 'inherit',
                  color: '#999',
                  cursor: 'not-allowed',
                  background: 'white',
                }}
                value=""
              />
              <button
                disabled
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#1A1A1A',
                  color: 'white',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'not-allowed',
                  opacity: 0.7,
                }}
              >
                Claim &gt;
              </button>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#9B958E', textAlign: 'center', marginTop: '0.5rem' }}>
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </div>


      <div className="form-actions" style={{ marginTop: '1rem' }}>
        <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
          {loading ? 'Saving...' : 'Save Chat Settings'}
        </button>
      </div>
    </div>
  );
}

import { Settings, Send, Activity, RefreshCw, AlertTriangle, Sparkles, PenLine } from 'lucide-react';
import { smsAPI } from '../../api/sms';
import { useState, useEffect } from 'react';
import toast from '../../utils/toast';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField } from '../../hooks/validationRules';

;

export default function SmsAdminPage() {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [smsForm, setSmsForm] = useState({ to: '', message: '' });
  const [sending, setSending] = useState(false);
  // AI draft
  const [aiDraft, setAiDraft] = useState(null);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiDraftType, setAiDraftType] = useState('sms_order_confirmation');
  // Animated inline validation for the send-test-SMS form.
  const smsValidation = useAdminFormValidation({
    to: requiredField('Phone number'),
    message: requiredField('Message'),
  });

  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await smsAPI.health();
      setHealth(res.data?.data || res.data || null);
    } catch {
      setHealth({ status: 'error', message: 'Failed to check SMS health' });
    }
    setHealthLoading(false);
  };

  useEffect(() => { checkHealth(); }, []);

  const handleSend = async () => {
    if (!smsValidation.validateForm({ to: smsForm.to, message: smsForm.message })) return;
    setSending(true);
    try {
      await smsAPI.send({ to: smsForm.to, message: smsForm.message });
      toast.success('SMS sent successfully!');
      setSmsForm({ to: '', message: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send SMS');
    }
    setSending(false);
  };

  const SMS_TYPES = [
    { id: 'sms_order_confirmation', label: 'Order Confirmation' },
    { id: 'sms_order_shipped', label: 'Order Shipped' },
    { id: 'sms_order_delivered', label: 'Order Delivered' },
    { id: 'sms_order_cancelled', label: 'Order Cancelled' },
    { id: 'sms_order_status_update', label: 'Order Status Update' },
    { id: 'sms_otp', label: 'OTP Verification' },
  ];

  const handleAiDraft = async () => {
    setAiDraftLoading(true);
    setAiDraft(null);
    try {
      const typeDef = SMS_TYPES.find(t => t.id === aiDraftType);
      const r = await smsAPI.aiDraft({
        type: aiDraftType,
        name: typeDef?.label || 'SMS',
        description: '',
        tone: 'friendly',
      });
      setAiDraft(r.data?.data || null);
    } catch {
      toast.error('Failed to generate AI draft');
    } finally {
      setAiDraftLoading(false);
    }
  };

  const useAiDraft = () => {
    if (!aiDraft?.body) return;
    setSmsForm(prev => ({ ...prev, message: aiDraft.body }));
    setAiDraft(null);
    toast.success('AI draft loaded into the message editor');
  };

  const getStatusIcon = () => {
    if (!health) return <Activity size={20} />;
    switch (health.status) {
      case 'connected': return <span style={{ color: '#16a34a' }}>✅</span>;
      case 'not_configured': return <AlertTriangle size={20} />;
      default: return <span style={{ color: '#dc2626' }}>❌</span>;
    }
  };

  const getStatusColor = () => {
    if (!health) return 'var(--muted)';
    switch (health.status) {
      case 'connected': return '#16a34a';
      case 'not_configured': return '#d97706';
      default: return '#dc2626';
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="admin-header admin-header-row">
        <div>
          <h2>SMS Management</h2>
          <p>Check Twilio health status and send test SMS messages</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost btn-sm flex items-center gap-1.5" onClick={checkHealth} disabled={healthLoading}>
            <RefreshCw size={14} className={healthLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <a href="/admin/settings" className="btn-dark btn-sm flex items-center gap-1.5" style={{ textDecoration: 'none' }}>
            <Settings size={14} />
            SMS Settings
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Health Check ── */}
        <div className="table-card">
          <div className="detail-header">
            <h3>🔌 Twilio Connection</h3>
          </div>
          {healthLoading ? (
            <div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div>
          ) : (
            <div className="form-grid" style={{ gap: '1rem' }}>
              <div className="form-group form-full">
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '1rem', borderRadius: '12px',
                  background: health?.status === 'connected' ? 'rgba(22,163,74,0.06)' :
                              health?.status === 'not_configured' ? 'rgba(217,119,6,0.06)' :
                              'rgba(220,38,38,0.06)',
                  border: `1px solid ${getStatusColor()}33`,
                }}>
                  <div style={{ color: getStatusColor() }}>{getStatusIcon()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: getStatusColor() }}>
                      {health?.status === 'connected' ? '✅ Connected' :
                       health?.status === 'not_configured' ? '⚠️ Not Configured' :
                       '❌ Error'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                      {health?.message || 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>

              {health?.status === 'connected' && health?.latency_ms !== undefined && (
                <div className="form-group form-full">
                  <label>Latency</label>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {health.latency_ms}ms
                  </div>
                </div>
              )}

              {health?.status === 'not_configured' && (
                <div className="form-group form-full">
                  <div style={{
                    background: 'rgba(217,119,6,0.06)', borderRadius: '10px',
                    padding: '0.85rem', fontSize: '0.78rem', color: 'var(--muted)',
                    border: '1px solid rgba(217,119,6,0.15)'
                  }}>
                    <strong>Twilio not configured.</strong> Go to{' '}
                    <a href="/admin/settings" style={{ color: '#C9A96E', fontWeight: 600 }}>Settings → SMS & Twilio</a>
                    {' '}to add your Account SID, Auth Token, and Phone Number.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Send Test SMS ── */}
        <div className="table-card">
          <div className="detail-header">
            <h3>📱 Send Test SMS</h3>
          </div>
          <div className="form-grid">
            <div className={`form-group form-full ${smsValidation.errors.to ? 'has-error' : ''} ${smsValidation.validFields.to ? 'is-valid' : ''}`}>
              <label>Phone Number *</label>
              <input
                value={smsForm.to}
                onChange={(e) => { setSmsForm({ ...smsForm, to: e.target.value }); smsValidation.handleChange('to', e.target.value); }}
                placeholder="+1234567890"
                type="tel"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem', display: 'block' }}>
                Include country code (e.g. +1 for US, +91 for India)
              </span>
              {smsValidation.errors.to && <div className="form-error" role="alert">{smsValidation.errors.to}</div>}
            </div>
            <div className={`form-group form-full ${smsValidation.errors.message ? 'has-error' : ''} ${smsValidation.validFields.message ? 'is-valid' : ''}`}>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span>Message *</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <select
                    value={aiDraftType}
                    onChange={(e) => setAiDraftType(e.target.value)}
                    style={{ padding: '0.25rem 0.4rem', fontSize: '0.72rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'white' }}
                    title="Message type for the AI draft"
                  >
                    {SMS_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={handleAiDraft}
                    disabled={aiDraftLoading}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.5rem', fontSize: '0.72rem' }}
                    title="Generate an AI draft message"
                  >
                    {aiDraftLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {aiDraftLoading ? 'Drafting...' : 'AI Draft'}
                  </button>
                </span>
              </label>
              <textarea
                value={smsForm.message}
                onChange={(e) => { setSmsForm({ ...smsForm, message: e.target.value }); smsValidation.handleChange('message', e.target.value); }}
                placeholder="Your SMS message here..."
                rows={4}
                maxLength={1600}
              />
              {aiDraft && (
                <div style={{
                  marginTop: '0.6rem', padding: '0.7rem 0.85rem', borderRadius: '8px',
                  background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', border: '1px solid #e0e7ff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4f46e5', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
                      <Sparkles size={12} /> AI Draft
                      {aiDraft._mock && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 600, padding: '0.1rem 0.4rem', borderRadius: 999, background: '#f3e8ff', color: '#7c3aed', border: '1px solid #e9d5ff' }}>🧪 Mock</span>
                      )}
                    </span>
                    <button
                      className="btn-dark btn-sm"
                      onClick={useAiDraft}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.55rem', fontSize: '0.72rem' }}
                    >
                      <PenLine size={11} /> Use Draft
                    </button>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#333', lineHeight: 1.5 }}>{aiDraft.body}</div>
                  <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '0.3rem' }}>
                    {aiDraft.characterCount} characters · {aiDraft.segments} segment{aiDraft.segments > 1 ? 's' : ''}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.25rem 0.75rem', flexWrap: 'wrap', fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                <span>{smsForm.message.length} / 1600 characters</span>
                <span>{Math.ceil(smsForm.message.length / 160)} SMS segment(s)</span>
              </div>
              {smsValidation.errors.message && <div className="form-error" role="alert">{smsValidation.errors.message}</div>}
            </div>
            <div className="form-group form-full" style={{ marginTop: '0.5rem' }}>
              <button
                className="btn-dark btn-sm flex items-center gap-1.5"
                onClick={handleSend}
                disabled={sending}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                <Send size={14} />
                {sending ? 'Sending...' : 'Send SMS'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="table-card" style={{ marginTop: '1.5rem' }}>
        <div className="detail-header">
          <h3>ℹ️ About SMS</h3>
        </div>
        <div className="form-grid">
          <div className="form-group form-full">
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.7 }}>
              SMS messages are sent via <strong>Twilio</strong>. Messages are dispatched asynchronously via the queue
              system. To configure Twilio credentials, visit{' '}
              <a href="/admin/settings" style={{ color: '#C9A96E', fontWeight: 600 }}>Settings → SMS & Twilio</a>.
            </p>
            <ul style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 2, paddingLeft: '1.25rem', marginTop: '0.5rem' }}>
              <li><strong>Order Confirmation SMS</strong> — sent automatically when an order is placed</li>
              <li><strong>Shipping Updates</strong> — sent automatically on status changes (shipped, delivered, etc.)</li>
              <li><strong>OTP Verification</strong> — sent during login/registration if SMS OTP is configured</li>
              <li><strong>Test SMS</strong> — use the form above to verify your Twilio setup</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Settings, Send, Activity, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { smsAPI } from '../../api/sms';
import toast from '../../utils/toast';

;

export default function SmsAdminPage() {
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [smsForm, setSmsForm] = useState({ to: '', message: '' });
  const [sending, setSending] = useState(false);

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
    if (!smsForm.to.trim()) { toast.error('Phone number is required'); return; }
    if (!smsForm.message.trim()) { toast.error('Message is required'); return; }
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

  const getStatusIcon = () => {
    if (!health) return <Activity size={20} />;
    switch (health.status) {
      case 'connected': return <Check size={20} Circle />;
      case 'not_configured': return <AlertTriangle size={20} />;
      default: return <X size={20} Circle />;
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
            <div className="form-group form-full">
              <label>Phone Number *</label>
              <input
                value={smsForm.to}
                onChange={(e) => setSmsForm({ ...smsForm, to: e.target.value })}
                placeholder="+1234567890"
                type="tel"
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem', display: 'block' }}>
                Include country code (e.g. +1 for US, +91 for India)
              </span>
            </div>
            <div className="form-group form-full">
              <label>Message *</label>
              <textarea
                value={smsForm.message}
                onChange={(e) => setSmsForm({ ...smsForm, message: e.target.value })}
                placeholder="Your SMS message here..."
                rows={4}
                maxLength={1600}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                <span>{smsForm.message.length} / 1600 characters</span>
                <span>{Math.ceil(smsForm.message.length / 160)} SMS segment(s)</span>
              </div>
            </div>
            <div className="form-group form-full" style={{ marginTop: '0.5rem' }}>
              <button
                className="btn-dark btn-sm flex items-center gap-1.5"
                onClick={handleSend}
                disabled={sending || !smsForm.to.trim() || !smsForm.message.trim()}
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

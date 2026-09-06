import { useState } from 'react';
import { adminAPI } from '../../../api/admin';
import toast from '../../../utils/toast';

export default function EmailTab({ settings, setSettings, loading, handleSaveSettings }) {
  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const handleSendTest = async () => {
    const recipient = testRecipient.trim() || settings.fromEmailAddress?.trim();
    if (!recipient) {
      toast.error('Enter a test recipient email address');
      return;
    }

    setSendingTest(true);
    try {
      await adminAPI.sendTestEmail({ to: recipient });
      toast.success(`Test email sent to ${recipient}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send test email');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="detail-panel">
      <div className="detail-header"><h3>SMTP & Email Settings</h3></div>
      <div className="form-grid">
        <div className="form-group"><label>SMTP Host</label><input value={settings.smtpHost || ''} onChange={e => setSettings({ ...settings, smtpHost: e.target.value })} /></div>
        <div className="form-group"><label>SMTP Port</label><input value={settings.smtpPort || ''} onChange={e => setSettings({ ...settings, smtpPort: e.target.value })} /></div>
        <div className="form-group"><label>SMTP Username</label><input value={settings.smtpUsername || ''} onChange={e => setSettings({ ...settings, smtpUsername: e.target.value })} /></div>
        <div className="form-group"><label>SMTP Password</label><input type="password" value={settings.smtpPassword || ''} onChange={e => setSettings({ ...settings, smtpPassword: e.target.value })} placeholder="••••••••" autoComplete="off" /></div>
        <div className="form-group form-full"><label>From Email Address</label><input value={settings.fromEmailAddress || ''} onChange={e => setSettings({ ...settings, fromEmailAddress: e.target.value })} autoComplete="email" /></div>
        <div className="form-group form-full"><label>Order Confirmation Template</label><select value={settings.emailTemplate || 'default'} onChange={e => setSettings({ ...settings, emailTemplate: e.target.value })}><option value="default">Default Template</option><option value="custom">Custom Template (Raw HTML)</option></select></div>
      </div>
      <div className="form-actions">
        <input
          className="input-sm"
          type="email"
          value={testRecipient}
          onChange={e => setTestRecipient(e.target.value)}
          placeholder="Test recipient email"
          aria-label="Test recipient email"
        />
        <button className="btn-ghost btn-sm" onClick={handleSendTest} disabled={sendingTest || loading}>
          {sendingTest ? 'Sending...' : 'Send Test Email'}
        </button>
        <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Email Settings'}</button>
      </div>
    </div>
  );
}

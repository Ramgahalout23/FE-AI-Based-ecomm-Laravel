import toast from '../../../utils/toast';

export default function EmailTab({ settings, setSettings, loading, handleSaveSettings }) {
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
        <button className="btn-ghost btn-sm" onClick={() => toast.success('Test email sent')}>Send Test Email</button>
        <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Email Settings'}</button>
      </div>
    </div>
  );
}

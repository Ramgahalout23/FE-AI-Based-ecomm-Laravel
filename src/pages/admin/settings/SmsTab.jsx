import toast from '../../../utils/toast';

export default function SmsTab({ settings, setSettings, loading, handleSaveSettings }) {
  return (
    <div className="detail-panel">
      <div className="detail-header"><h3>SMS & Twilio Configuration</h3></div>
      <div className="form-grid">
        <div className="form-group"><label>Twilio Account SID</label><input value={settings.twilioAccountSid || ''} onChange={e => setSettings({ ...settings, twilioAccountSid: e.target.value })} placeholder="AC..." autoComplete="off" /></div>
        <div className="form-group"><label>Twilio Auth Token</label><input type="password" value={settings.twilioAuthToken || ''} onChange={e => setSettings({ ...settings, twilioAuthToken: e.target.value })} placeholder="••••••••" autoComplete="off" /></div>
        <div className="form-group"><label>Twilio Phone Number</label><input value={settings.twilioPhoneNumber || ''} onChange={e => setSettings({ ...settings, twilioPhoneNumber: e.target.value })} placeholder="+1234567890" autoComplete="tel" /></div>
        <div className="form-group form-full"><label>SMS Order Confirmation Template</label><textarea rows={3} value={settings.smsOrderTemplate || 'Your order #{orderNumber} has been confirmed! Total: ₹{amount}. Track: {trackingUrl}'} onChange={e => setSettings({ ...settings, smsOrderTemplate: e.target.value })} placeholder="Your order template..." /></div>
        <div className="form-group form-full"><label>SMS Shipping Update Template</label><textarea rows={3} value={settings.smsShippingTemplate || 'Your order #{orderNumber} has been shipped! Expected delivery: {deliveryDate}. Track: {trackingUrl}'} onChange={e => setSettings({ ...settings, smsShippingTemplate: e.target.value })} placeholder="Your shipping template..." /></div>
      </div>
      <div className="form-actions">
        <button className="btn-ghost btn-sm" onClick={() => toast.success('Test SMS sent!')}>Send Test SMS</button>
        <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save SMS Settings'}</button>
      </div>
    </div>
  );
}

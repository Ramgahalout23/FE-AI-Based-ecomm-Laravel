import ImageUploadZone from '../../../components/common/ImageUploadZone';

export default function ShippingLabelsTab({ settings, setSettings, loading, handleSaveSettings }) {
  return (
    <div className="detail-panel">
      <div className="detail-header"><h3>Shipping Label Configuration</h3></div>
      <div className="form-grid">
        <div className="form-group form-full">
          <ImageUploadZone
            label="Shipping Label Logo"
            value={settings.shippingLabelLogo || ''}
            onChange={url => setSettings({...settings, shippingLabelLogo: url})}
          />
        </div>
        <div className="form-group form-full"><label>Pickup Address</label><textarea rows={2} value={settings.shippingPickupAddress} onChange={e => setSettings({...settings, shippingPickupAddress: e.target.value})} placeholder="Warehouse name & address..." /></div>
        <div className="form-group form-full"><label>Return Address</label><textarea rows={2} value={settings.shippingReturnAddress} onChange={e => setSettings({...settings, shippingReturnAddress: e.target.value})} placeholder="Return center address..." /></div>
        <div className="form-group"><label>Customer Support Phone</label><input value={settings.shippingQueryPhone || ''} onChange={e => setSettings({...settings, shippingQueryPhone: e.target.value})} placeholder="+1 (555) 019-2834" autoComplete="tel" /></div>
        <div className="form-group"><label>Customer Support Mobile</label><input value={settings.shippingQueryMobile || ''} onChange={e => setSettings({...settings, shippingQueryMobile: e.target.value})} placeholder="+1 (555) 019-2834" autoComplete="tel" /></div>
        <div className="form-group"><label>Customer Support Email</label><input value={settings.shippingQueryEmail || ''} onChange={e => setSettings({...settings, shippingQueryEmail: e.target.value})} placeholder="support@yourstore.com" autoComplete="email" /></div>
        <div className="form-group form-full"><label>Footnote / Label Note</label><textarea rows={2} value={settings.shippingLabelNote} onChange={e => setSettings({...settings, shippingLabelNote: e.target.value})} placeholder="Special shipping instructions or customer note at the bottom of the label..." /></div>
      </div>
      <div className="form-actions"><button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Shipping Settings'}</button></div>
    </div>
  );
}

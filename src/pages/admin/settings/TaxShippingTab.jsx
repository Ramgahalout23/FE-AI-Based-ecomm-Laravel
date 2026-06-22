export default function TaxShippingTab({ settings, setSettings, loading, handleSaveSettings }) {
  return (
    <div className="detail-panel">
      <div className="detail-header"><h3>Tax & Global Shipping Rules</h3></div>
      <div className="form-grid">
        <div className="form-group"><label>Global Tax Rate (%)</label><input type="number" value={settings.taxRate || ''} onChange={e => setSettings({ ...settings, taxRate: e.target.value })} /></div>
        <div className="form-group"><label>Tax Calculation</label><select value={settings.taxCalculation || 'exclusive'} onChange={e => setSettings({ ...settings, taxCalculation: e.target.value })}><option value="inclusive">Prices include tax</option><option value="exclusive">Add tax at checkout</option></select></div>
        <div className="form-group form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}></div>
        <div className="form-group"><label>Free Shipping Threshold ($)</label><input type="number" value={settings.freeShippingThreshold || ''} onChange={e => setSettings({ ...settings, freeShippingThreshold: e.target.value })} /></div>
        <div className="form-group"><label>Default Flat Rate ($)</label><input type="number" value={settings.shippingFlatRate || ''} onChange={e => setSettings({ ...settings, shippingFlatRate: e.target.value })} /></div>
      </div>
      <div className="form-actions"><button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Tax & Shipping'}</button></div>
    </div>
  );
}

export default function GeneralTab({ settings, setSettings, loading, handleSaveSettings }) {
  return (
    <div className="detail-panel">
      <div className="detail-header"><h3>Store Configuration</h3></div>
      <div className="form-grid">
        <div className="form-group"><label>Store Name</label><input value={settings.storeName} onChange={e => setSettings({...settings, storeName: e.target.value})} /></div>
        <div className="form-group"><label>Contact Email</label><input value={settings.contactEmail} onChange={e => setSettings({...settings, contactEmail: e.target.value})} /></div>
        <div className="form-group"><label>Currency</label><select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})}><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option></select></div>
        <div className="form-group"><label>Timezone</label><select value={settings.timezone} onChange={e => setSettings({...settings, timezone: e.target.value})}><option>UTC</option><option>EST</option><option>PST</option><option>IST</option></select></div>
        <div className="form-group form-full"><label>Store Address</label><input value={settings.storeAddress} onChange={e => setSettings({...settings, storeAddress: e.target.value})} /></div>
      </div>
      <div className="form-actions"><button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button></div>

      {/* Announcement Bar Settings */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3>Announcement Bar</h3>
            <span className={`status-badge ${settings.announcementEnabled !== 'false' ? 'status-active' : 'status-pending'}`}>
              {settings.announcementEnabled !== 'false' ? 'Active' : 'Hidden'}
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.announcementEnabled !== 'false'} onChange={e => setSettings({ ...settings, announcementEnabled: e.target.checked ? 'true' : 'false' })} />
            <strong>Show Announcement Bar</strong>
          </label>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          A scrolling marquee strip displayed at the very top of the storefront. Perfect for promotions, shipping info, and brand messaging.
        </p>
        <div className="form-grid">
          <div className="form-group form-full">
            <label>Announcement Message</label>
            <textarea
              rows={2}
              value={settings.announcementText || 'THREVOLT  ✦  Premium Quality Guaranteed  ✦  Free Shipping on orders above ₹499'}
              onChange={e => setSettings({ ...settings, announcementText: e.target.value })}
              placeholder="Separate items with  ✦  (star symbol)"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Use <strong>✦</strong> to separate announcement items. The text scrolls continuously.
            </span>
          </div>
        </div>
        {/* Preview — matches the storefront dark/gold theme */}
        <div style={{
          marginTop: '1rem',
          background: '#1A1A1A',
          borderRadius: 'var(--radius-lg)',
          padding: '0.5rem 1rem',
          overflow: 'hidden',
          opacity: settings.announcementEnabled !== 'false' ? 1 : 0.4,
          transition: 'opacity 0.3s ease',
          border: '1px solid rgba(201, 169, 110, 0.15)',
        }}>
          <style>{`
            @keyframes announcement-preview {
              0% { transform: translateX(0); }
              100% { transform: translateX(-50%); }
            }
          `}</style>
          <div style={{
            display: 'flex',
            gap: 0,
            whiteSpace: 'nowrap',
            animation: settings.announcementEnabled !== 'false' ? 'announcement-preview 20s linear infinite' : 'none',
            fontFamily: 'Jost, sans-serif',
            fontSize: '0.65rem',
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.85)',
            padding: '0.35rem 0',
          }}>
            {(() => {
              const previewItems = (settings.announcementText || 'THREVOLT  ✦  Premium Quality Guaranteed  ✦  Free Shipping on orders above ₹499').split('✦').filter(Boolean);
              const renderRow = (key) => (
                <span key={key}>
                  {previewItems.map((item, idx) => (
                    <span key={idx}>
                      {idx > 0 && <>&nbsp;<span style={{color: '#C9A96E', opacity: 0.6}}>✦</span>&nbsp;</>}
                      {item}
                    </span>
                  ))}
                  &nbsp;<span style={{color: '#C9A96E', opacity: 0.6}}>✦</span>&nbsp;
                </span>
              );
              return [renderRow('a'), renderRow('b')];
            })()}
          </div>
        </div>
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Announcement Settings'}</button>
        </div>
      </div>
    </div>
  );
}

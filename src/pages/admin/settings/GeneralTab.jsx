export default function GeneralTab({ settings, setSettings, loading, handleSaveSettings }) {
  return (
    <div className="detail-panel">
      <div className="detail-header"><h3>Store Configuration</h3></div>
      <div className="form-grid">
        <div className="form-group"><label>Store Name</label><input value={settings.storeName} onChange={e => setSettings({...settings, storeName: e.target.value})} /></div>
        <div className="form-group"><label>Contact Email</label><input value={settings.contactEmail} onChange={e => setSettings({...settings, contactEmail: e.target.value})} /></div>
        <div className="form-group"><label>Currency</label><select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})}>
              <option value="USD">USD ($) — US Dollar</option>
              <option value="EUR">EUR (€) — Euro</option>
              <option value="GBP">GBP (£) — British Pound</option>
              <option value="INR">INR (₹) — Indian Rupee</option>
              <option value="CAD">CAD (CA$) — Canadian Dollar</option>
              <option value="AUD">AUD (A$) — Australian Dollar</option>
              <option value="JPY">JPY (¥) — Japanese Yen</option>
              <option value="AED">AED (AED) — UAE Dirham</option>
              <option value="SAR">SAR (SR) — Saudi Riyal</option>
            </select></div>
        <div className="form-group"><label>Timezone</label><select value={settings.timezone} onChange={e => setSettings({...settings, timezone: e.target.value})}>
              <option value="UTC">UTC (Coordinated Universal Time)</option>
              <option value="GMT">GMT (Greenwich Mean Time)</option>
              <option value="IST">IST (Indian Standard Time)</option>
              <option value="EST">EST (Eastern Standard Time)</option>
              <option value="CST">CST (Central Standard Time)</option>
              <option value="MST">MST (Mountain Standard Time)</option>
              <option value="PST">PST (Pacific Standard Time)</option>
              <option value="AST">AST (Atlantic Standard Time)</option>
              <option value="NST">NST (Newfoundland Standard Time)</option>
              <option value="AKST">AKST (Alaska Standard Time)</option>
              <option value="HST">HST (Hawaii Standard Time)</option>
              <option value="BST">BST (British Summer Time)</option>
              <option value="CET">CET (Central European Time)</option>
              <option value="EET">EET (Eastern European Time)</option>
              <option value="GST">GST (Gulf Standard Time)</option>
              <option value="CST_CN">CST (China Standard Time)</option>
              <option value="HKT">HKT (Hong Kong Time)</option>
              <option value="SGT">SGT (Singapore Time)</option>
              <option value="JST">JST (Japan Standard Time)</option>
              <option value="KST">KST (Korea Standard Time)</option>
              <option value="AEST">AEST (Australian Eastern Standard Time)</option>
              <option value="AEDT">AEDT (Australian Eastern Daylight Time)</option>
              <option value="NZST">NZST (New Zealand Standard Time)</option>
            </select></div>
        <div className="form-group form-full"><label>Store Address</label><input value={settings.storeAddress} onChange={e => setSettings({...settings, storeAddress: e.target.value})} /></div>
        <div className="form-group form-full">
          <label>Store Map Embed URL</label>
          <input
            value={settings.storeMapEmbedUrl || ''}
            onChange={e => setSettings({...settings, storeMapEmbedUrl: e.target.value})}
            placeholder="https://www.google.com/maps?q=27.4854301,77.6411272&z=15&output=embed"
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            Google Maps embed URL shown on the About Us page. Get it from Google Maps → Share → Embed a map, or use a <code>?q=lat,lng&output=embed</code> link. Leave empty to keep the default store pin.
          </span>
        </div>
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
              value={settings.announcementText || `${settings.storeName || 'THREVOLT'}  ✦  Premium Quality Guaranteed  ✦  Free Shipping on orders above ₹499`}
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
              const previewItems = (settings.announcementText || `${settings.storeName || 'THREVOLT'}  ✦  Premium Quality Guaranteed  ✦  Free Shipping on orders above ₹499`).split('✦').filter(Boolean);
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

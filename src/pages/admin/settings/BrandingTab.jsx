import ImageUploadZone from '../../../components/common/ImageUploadZone';

export default function BrandingTab({ branding, setBranding, loading, handleSaveBranding }) {
  return (
    <div className="detail-panel">
      <div className="detail-header"><h3>Site Branding</h3></div>
      <div className="form-grid">
        <div className="form-group form-full">
          <ImageUploadZone
            label="Store Logo - Light Background (Black Logo)"
            value={branding.logoUrl}
            onChange={url => setBranding({...branding, logoUrl: url})}
          />
        </div>
        <div className="form-group form-full">
          <ImageUploadZone
            label="Store Logo - Dark Background (White Logo)"
            value={branding.logoDarkUrl}
            onChange={url => setBranding({...branding, logoDarkUrl: url})}
          />
        </div>
        <div className="form-group form-full">
          <ImageUploadZone
            label="Site Favicon"
            value={branding.faviconUrl}
            onChange={url => setBranding({...branding, faviconUrl: url})}
          />
        </div>
        <div className="form-group"><label>Primary Brand Color</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="color" value={branding.primaryColor} onChange={e => setBranding({...branding, primaryColor: e.target.value})} style={{ width: '40px', height: '38px', padding: 0 }} />
            <input value={branding.primaryColor} onChange={e => setBranding({...branding, primaryColor: e.target.value})} style={{ flex: 1, fontFamily: 'monospace' }} />
          </div>
        </div>
        <div className="form-group"><label>Secondary / Accent Color</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input type="color" value={branding.secondaryColor} onChange={e => setBranding({...branding, secondaryColor: e.target.value})} style={{ width: '40px', height: '38px', padding: 0 }} />
            <input value={branding.secondaryColor} onChange={e => setBranding({...branding, secondaryColor: e.target.value})} style={{ flex: 1, fontFamily: 'monospace' }} />
          </div>
        </div>
        <div className="form-group form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}><label style={{ fontSize: '1rem', color: 'var(--charcoal)', marginBottom: '1rem' }}>Social Links</label></div>
        <div className="form-group"><label>Instagram URL</label><input value={branding.instagram} onChange={e => setBranding({...branding, instagram: e.target.value})} placeholder="https://instagram.com/..." autoComplete="url" /></div>
        <div className="form-group"><label>Twitter URL</label><input value={branding.twitter} onChange={e => setBranding({...branding, twitter: e.target.value})} placeholder="https://twitter.com/..." autoComplete="url" /></div>
        <div className="form-group"><label>Facebook URL</label><input value={branding.facebook} onChange={e => setBranding({...branding, facebook: e.target.value})} placeholder="https://facebook.com/..." autoComplete="url" /></div>
        <div className="form-group"><label>YouTube URL</label><input value={branding.youtube} onChange={e => setBranding({...branding, youtube: e.target.value})} placeholder="https://youtube.com/..." autoComplete="url" /></div>
      </div>
      <div className="form-actions"><button className="btn-dark btn-sm" onClick={handleSaveBranding} disabled={loading}>{loading ? 'Saving...' : 'Save Branding'}</button></div>
    </div>
  );
}

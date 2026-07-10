import { Palette, Upload, DollarSign, Printer } from 'lucide-react';

const DESIGN_PLACEMENTS = [
  { value: 'front', label: 'Front Center' },
  { value: 'back', label: 'Back Center' },
  { value: 'left-chest', label: 'Left Chest' },
  { value: 'full-front', label: 'Full Front' },
  { value: 'full-back', label: 'Full Back' },
  { value: 'sleeve-left', label: 'Left Sleeve' },
  { value: 'sleeve-right', label: 'Right Sleeve' },
];

const ACCEPTED_FORMATS = [
  { value: 'image/png,.png', label: 'PNG' },
  { value: 'image/jpeg,.jpg,.jpeg', label: 'JPEG' },
  { value: 'image/svg+xml,.svg', label: 'SVG' },
  { value: 'application/pdf,.pdf', label: 'PDF' },
  { value: '.ai', label: 'Adobe Illustrator (.ai)' },
  { value: '.eps', label: 'EPS' },
  { value: '.psd', label: 'Photoshop (.psd)' },
];

export default function CustomDesignTab({ settings, setSettings, loading, handleSaveSettings }) {
  const enabled = settings.customDesignEnabled !== 'false';

  return (
    <div>
      {/* ── Master Toggle ── */}
      <div className="detail-panel">
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3>Custom Design Configuration</h3>
            <span className={`status-badge ${enabled ? 'status-active' : 'status-pending'}`}>
              {enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setSettings({ ...settings, customDesignEnabled: e.target.checked ? 'true' : 'false' })}
            />
            <strong>Enable Custom Design Feature</strong>
          </label>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
          When enabled, customers can upload artwork and order custom-designed t-shirts.
          This controls the custom design CTA section on the homepage, the dedicated design page,
          and the checkout custom design option.
        </p>

        {/* Section Visibility Toggle */}
        <div className="form-section" style={{ marginBottom: '1.5rem' }}>
          <div className="detail-header-inline">
            <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Homepage Section</h4>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            background: 'var(--off-white)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🎨</span>
              <div>
                <strong style={{ fontSize: '0.9rem' }}>Custom Design Section</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.15rem 0 0' }}>
                  Show the \"Design Your Own Custom T-Shirt\" section on the storefront homepage
                </p>
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>
              <input
                type="checkbox"
                checked={settings.customDesignSectionEnabled !== 'false'}
                onChange={e => setSettings({ ...settings, customDesignSectionEnabled: e.target.checked ? 'true' : 'false' })}
                disabled={!enabled}
              />
              <span className={`status-badge ${settings.customDesignSectionEnabled !== 'false' ? 'status-active' : 'status-pending'}`}>
                {settings.customDesignSectionEnabled !== 'false' ? 'Visible' : 'Hidden'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* ── Pricing Configuration ── */}
      <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
        <div className="detail-header" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Printer size={18} />
            <h3>Print Pricing</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
            Set explicit prices for single-side and both-sides print. Customers are charged the full price directly — no base + fee calculation.
          </p>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Single-Side Print Price (₹)</label>
            <input
              type="number"
              min={0}
              value={settings.customDesignSinglePrintPrice || '699'}
              onChange={e => setSettings({ ...settings, customDesignSinglePrintPrice: e.target.value })}
              disabled={!enabled}
              placeholder="699"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Full price for a custom tee with print on one side (Front OR Back)</span>
          </div>
          <div className="form-group">
            <label>Both-Sides Print Price (₹)</label>
            <input
              type="number"
              min={0}
              value={settings.customDesignBothSidesPrice || '899'}
              onChange={e => setSettings({ ...settings, customDesignBothSidesPrice: e.target.value })}
              disabled={!enabled}
              placeholder="899"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Full price for a custom tee with print on both sides (Front &amp; Back)</span>
          </div>
        </div>

        {/* ── Price Preview ── */}
        <div style={{
          marginTop: '1rem',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem',
        }}>
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>Single Side (Front or Back)</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#16a34a' }}>
              ₹{Number(settings.customDesignSinglePrintPrice || 699)}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
              Per shirt — one side print
            </div>
          </div>
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            background: '#fefce8',
            border: '1px solid #fde68a',
          }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.25rem' }}>Both Sides (Front &amp; Back)</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#ca8a04' }}>
              ₹{Number(settings.customDesignBothSidesPrice || 899)}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>
              Per shirt — both sides print
            </div>
          </div>
        </div>

        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          background: '#f8fafc',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.25rem' }}>💡</span>
          <div>
            <strong style={{ fontSize: '0.85rem' }}>Note:</strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)', marginLeft: '0.3rem' }}>
              These are the full prices charged to customers. The old "Base Price + Design Fee × 1 or 2" model has been replaced with explicit single/both prices for clarity.
            </span>
          </div>
        </div>
      </div>

      {/* ── Design Options ── */}
      <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
        <div className="detail-header" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Palette size={18} />
            <h3>Design Options</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
            Configure the design options available to customers during customization.
          </p>
        </div>

        <div className="form-grid">
          {/* Available Colors */}
          <div className="form-group form-full">
            <label>Available T-Shirt Colors</label>
            <textarea
              rows={3}
              value={settings.customDesignColors || ''}
              onChange={e => setSettings({ ...settings, customDesignColors: e.target.value })}
              placeholder="White, Black, Navy, Charcoal, Olive, Burgundy, Forest Green, Royal Blue"
              disabled={!enabled}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Comma-separated list of t-shirt colors available for custom designs
            </span>
          </div>

          {/* Available Sizes */}
          <div className="form-group form-full">
            <label>Available Sizes</label>
            <input
              value={settings.customDesignSizes || ''}
              onChange={e => setSettings({ ...settings, customDesignSizes: e.target.value })}
              placeholder="XS, S, M, L, XL, XXL, 3XL"
              disabled={!enabled}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Comma-separated list of sizes (e.g. XS, S, M, L, XL)
            </span>
          </div>

          {/* Print Placement */}
          <div className="form-group form-full">
            <label>Print Placement Options</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {DESIGN_PLACEMENTS.map(p => {
                const selected = (settings.customDesignPlacements || 'front,back,left-chest').split(',').map(d => d.trim()).includes(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      const current = (settings.customDesignPlacements || 'front,back,left-chest').split(',').map(d => d.trim()).filter(Boolean);
                      const updated = selected ? current.filter(d => d !== p.value) : [...current, p.value];
                      setSettings({ ...settings, customDesignPlacements: updated.join(',') });
                    }}
                    disabled={!enabled}
                    style={{
                      padding: '0.35rem 0.65rem', borderRadius: '6px',
                      border: selected ? '2px solid var(--charcoal)' : '1px solid var(--border)',
                      background: selected ? 'var(--charcoal)' : 'var(--off-white)',
                      color: selected ? 'white' : 'var(--charcoal)',
                      cursor: enabled ? 'pointer' : 'not-allowed',
                      fontSize: '0.78rem', fontWeight: selected ? 600 : 400,
                      opacity: enabled ? 1 : 0.5,
                    }}
                  >{p.label}</button>
                );
              })}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.3rem', display: 'block' }}>
              Select which print placement options to offer to customers
            </span>
          </div>
        </div>
      </div>

      {/* ── File Upload Configuration ── */}
      <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
        <div className="detail-header" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Upload size={18} />
            <h3>File Upload Settings</h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
            Configure what files customers can upload for their custom designs.
          </p>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Max File Size (MB)</label>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.customDesignMaxFileSize || '10'}
              onChange={e => setSettings({ ...settings, customDesignMaxFileSize: e.target.value })}
              disabled={!enabled}
              placeholder="10"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Maximum upload file size in megabytes</span>
          </div>
          <div className="form-group">
            <label>Accepted File Formats</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {ACCEPTED_FORMATS.map(f => {
                const selected = (settings.customDesignAcceptedFormats || 'image/png,.png,image/jpeg,.jpg,.jpeg,image/svg+xml,.svg,.ai,.eps').includes(f.value.split(',')[0]);
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => {
                      const current = (settings.customDesignAcceptedFormats || 'image/png,.png,image/jpeg,.jpg,.jpeg,image/svg+xml,.svg,.ai,.eps').split(',');
                      const mimeTypes = f.value.split(',');
                      const allCurrentlyPresent = mimeTypes.every(m => current.includes(m));
                      const updated = allCurrentlyPresent
                        ? current.filter(m => !mimeTypes.includes(m))
                        : [...current, ...mimeTypes.filter(m => !current.includes(m))];
                      setSettings({ ...settings, customDesignAcceptedFormats: updated.join(',') });
                    }}
                    disabled={!enabled}
                    style={{
                      padding: '0.3rem 0.55rem', borderRadius: '6px',
                      border: selected ? '2px solid var(--charcoal)' : '1px solid var(--border)',
                      background: selected ? 'var(--charcoal)' : 'var(--off-white)',
                      color: selected ? 'white' : 'var(--charcoal)',
                      cursor: enabled ? 'pointer' : 'not-allowed',
                      fontSize: '0.7rem', fontWeight: selected ? 600 : 400,
                      opacity: enabled ? 1 : 0.5,
                    }}
                  >{f.label}</button>
                );
              })}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.3rem', display: 'block' }}>
              Select which file formats to accept for design uploads
            </span>
          </div>
        </div>
      </div>

      {/* ── Save ── */}
      <div className="form-actions" style={{ marginTop: '1rem' }}>
        <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
          {loading ? 'Saving...' : 'Save Custom Design Settings'}
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';

const FONT_FAMILIES = [
  { value: "'Inter', sans-serif", label: 'Inter', category: 'sans-serif' },
  { value: "'Jost', sans-serif", label: 'Jost', category: 'sans-serif' },
  { value: "'DM Sans', sans-serif", label: 'DM Sans', category: 'sans-serif' },
  { value: "'Poppins', sans-serif", label: 'Poppins', category: 'sans-serif' },
  { value: "'Plus Jakarta Sans', sans-serif", label: 'Jakarta Sans', category: 'sans-serif' },
  { value: "'Space Grotesk', sans-serif", label: 'Space Grotesk', category: 'sans-serif' },
  { value: "'Playfair Display', serif", label: 'Playfair Display', category: 'serif' },
  { value: "'DM Serif Display', serif", label: 'DM Serif Display', category: 'serif' },
  { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono', category: 'monospace' },
];

const BORDER_RADIUS_OPTIONS = [
  { value: '0px', label: 'Sharp (0px)' },
  { value: '4px', label: 'Subtle (4px)' },
  { value: '8px', label: 'Standard (8px)' },
  { value: '12px', label: 'Rounded (12px)' },
  { value: '16px', label: 'Pill (16px)' },
];

const LAYOUT_WIDTHS = [
  { value: '1100px', label: 'Narrow (1100px)' },
  { value: '1200px', label: 'Standard (1200px)' },
  { value: '1280px', label: 'Wide (1280px)' },
  { value: '1400px', label: 'Extra Wide (1400px)' },
];

export default function ThemeTab({ theme, setTheme, loading, handleSaveTheme }) {
  const [previewTheme, setPreviewTheme] = useState(theme);

  useEffect(() => {
    setPreviewTheme(theme);
  }, [theme]);

  // Inject CSS variables for live preview
  useEffect(() => {
    const styleId = 'theme-preview-vars';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    const cssVars = `
      :root {
        --preview-primary: ${previewTheme.primaryColor || '#1a1a1a'};
        --preview-secondary: ${previewTheme.secondaryColor || '#6b7280'};
        --preview-accent: ${previewTheme.accentColor || '#888888'};
        --preview-surface: ${previewTheme.surfaceColor || '#f8f9fb'};
        --preview-text: ${previewTheme.textColor || '#191c1e'};
        --preview-border: ${previewTheme.borderColor || '#e5e5ea'};
        --preview-success: ${previewTheme.successColor || '#22c55e'};
        --preview-danger: ${previewTheme.dangerColor || '#ef4444'};
        --preview-warning: ${previewTheme.warningColor || '#f59e0b'};
        --preview-info: ${previewTheme.infoColor || '#3b82f6'};
        --preview-font-display: ${previewTheme.fontDisplay || "'Jost', sans-serif"};
        --preview-font-body: ${previewTheme.fontBody || "'Jost', sans-serif"};
        --preview-font-headline: ${previewTheme.fontHeadline || "'Jost', sans-serif"};
        --preview-radius: ${previewTheme.borderRadius || '8px'};
        --preview-container-max: ${previewTheme.containerMaxWidth || '1280px'};
      }
    `;
    styleEl.textContent = cssVars;

    return () => {
      if (styleEl && styleEl.parentNode) {
        styleEl.parentNode.removeChild(styleEl);
      }
    };
  }, [previewTheme]);

  const updateField = useCallback((key, value) => {
    setPreviewTheme(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleApply = () => {
    setTheme(previewTheme);
    handleSaveTheme(previewTheme); // pass explicitly to avoid stale closure
  };

  const handleReset = () => {
    const defaults = getDefaultTheme();
    setPreviewTheme(defaults);
    setTheme(defaults);
    handleSaveTheme(defaults); // also save the defaults
  };

  return (
    <div className="detail-panel">
      <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>Theme & Appearance</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
            Customize the storefront look and feel — colors, fonts, layout. Changes preview live and apply on save.
          </p>
        </div>
        <button className="btn-ghost btn-sm" onClick={handleReset} disabled={loading}>
          Reset to Defaults
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
        {/* Settings Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* ── Typography ── */}
          <div className="form-section">
            <div className="detail-header" style={{ marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Typography</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                Choose fonts for different text roles across the storefront.
              </p>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Display Font</label>
                <select
                  value={previewTheme.fontDisplay}
                  onChange={e => updateField('fontDisplay', e.target.value)}
                >
                  {FONT_FAMILIES.filter(f => f.category !== 'monospace').map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Headings, logos, hero text</span>
              </div>
              <div className="form-group">
                <label>Body Font</label>
                <select
                  value={previewTheme.fontBody}
                  onChange={e => updateField('fontBody', e.target.value)}
                >
                  {FONT_FAMILIES.map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Product descriptions, paragraphs</span>
              </div>
              <div className="form-group">
                <label>Headline Font</label>
                <select
                  value={previewTheme.fontHeadline}
                  onChange={e => updateField('fontHeadline', e.target.value)}
                >
                  {FONT_FAMILIES.filter(f => f.category !== 'monospace').map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Section titles, feature headlines</span>
              </div>
            </div>
          </div>

          {/* ── Colors ── */}
          <div className="form-section">
            <div className="detail-header" style={{ marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Colors</h4>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                Define your brand color palette. Click the swatch or type a hex value.
              </p>
            </div>
            <div className="form-grid">
              {[
                { key: 'primaryColor', label: 'Primary', desc: 'Main brand color — buttons, links, header' },
                { key: 'secondaryColor', label: 'Secondary', desc: 'Accent elements, badges, highlights' },
                { key: 'accentColor', label: 'Accent / Gray', desc: 'Subtle accents, secondary text' },
                { key: 'surfaceColor', label: 'Surface / Background', desc: 'Page background, card backgrounds' },
                { key: 'textColor', label: 'Text Primary', desc: 'Main body text color' },
                { key: 'borderColor', label: 'Border', desc: 'Dividers, card borders, inputs' },
                { key: 'successColor', label: 'Success', desc: 'Positive actions, confirmations' },
                { key: 'dangerColor', label: 'Danger', desc: 'Errors, destructive actions' },
                { key: 'warningColor', label: 'Warning', desc: 'Caution, alerts' },
                { key: 'infoColor', label: 'Info', desc: 'Informational elements' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="form-group">
                  <label>{label}</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={previewTheme[key] || '#000000'}
                      onChange={e => updateField(key, e.target.value)}
                      style={{ width: '36px', height: '34px', padding: 0, border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer' }}
                    />
                    <input
                      value={previewTheme[key] || ''}
                      onChange={e => updateField(key, e.target.value)}
                      style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.82rem' }}
                      placeholder="#000000"
                    />
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Layout & Borders ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-section">
              <div className="detail-header" style={{ marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Layout</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                  Container width and spacing
                </p>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Container Max Width</label>
                  <select
                    value={previewTheme.containerMaxWidth}
                    onChange={e => updateField('containerMaxWidth', e.target.value)}
                  >
                    {LAYOUT_WIDTHS.map(w => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Section Gap (px)</label>
                  <input
                    type="number"
                    min="40"
                    max="160"
                    step="8"
                    value={parseInt(previewTheme.sectionGap) || 80}
                    onChange={e => updateField('sectionGap', `${e.target.value}px`)}
                  />
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Spacing between page sections</span>
                </div>
              </div>
            </div>
            <div className="form-section">
              <div className="detail-header" style={{ marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Borders & Radius</h4>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.15rem' }}>
                  Button and card corner rounding
                </p>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>Default Border Radius</label>
                  <select
                    value={previewTheme.borderRadius}
                    onChange={e => updateField('borderRadius', e.target.value)}
                  >
                    {BORDER_RADIUS_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Card Border Radius</label>
                  <select
                    value={previewTheme.cardBorderRadius || previewTheme.borderRadius}
                    onChange={e => updateField('cardBorderRadius', e.target.value)}
                  >
                    {BORDER_RADIUS_OPTIONS.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Column */}
        <div style={{ position: 'sticky', top: '1rem', alignSelf: 'start' }}>
          <div className="detail-header" style={{ marginBottom: '0.75rem' }}>
            <h4 style={{ fontSize: '0.9rem', margin: 0 }}>Live Preview</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Changes preview instantly</p>
          </div>

          <div style={{
            background: previewTheme.surfaceColor || '#f8f9fb',
            borderRadius: previewTheme.borderRadius || '8px',
            border: `1px solid ${previewTheme.borderColor || '#e5e5ea'}`,
            overflow: 'hidden',
            fontFamily: previewTheme.fontBody || "'Jost', sans-serif",
            transition: 'all 0.3s ease',
          }}>
            {/* Preview Header */}
            <div style={{
              background: previewTheme.primaryColor || '#1a1a1a',
              padding: '1rem 1.25rem',
              fontFamily: previewTheme.fontDisplay || "'Jost', sans-serif",
            }}>
              <div style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.7, marginBottom: '0.15rem' }}>
                YOUR STORE
              </div>
              <div style={{ color: '#fff', fontSize: '1rem', fontWeight: 800 }}>
                Summer Collection 2026
              </div>
            </div>

            {/* Preview Body */}
            <div style={{ padding: '1rem 1.25rem' }}>
              <h5 style={{
                fontFamily: previewTheme.fontDisplay || "'Jost', sans-serif",
                fontSize: '0.95rem',
                fontWeight: 700,
                margin: '0 0 0.5rem',
                color: previewTheme.textColor || '#191c1e',
              }}>
                Premium Quality Tees
              </h5>
              <p style={{
                fontSize: '0.78rem',
                lineHeight: 1.5,
                color: (previewTheme.accentColor || '#888888'),
                margin: '0 0 0.75rem',
              }}>
                Discover our latest collection of premium cotton t-shirts. Designed for comfort, built to last.
              </p>

              {/* Product Card Preview */}
              <div style={{
                background: '#fff',
                borderRadius: previewTheme.cardBorderRadius || previewTheme.borderRadius || '8px',
                border: `1px solid ${previewTheme.borderColor || '#e5e5ea'}`,
                overflow: 'hidden',
                marginBottom: '0.75rem',
                transition: 'all 0.3s ease',
              }}>
                <div style={{
                  height: '80px',
                  background: `linear-gradient(135deg, ${previewTheme.primaryColor || '#1a1a1a'}, ${previewTheme.secondaryColor || '#6b7280'})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{ color: '#fff', fontSize: '1.5rem', opacity: 0.5 }}>🛍️</div>
                </div>
                <div style={{ padding: '0.65rem' }}>
                  <div style={{
                    fontFamily: previewTheme.fontBody || "'Jost', sans-serif",
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    color: previewTheme.textColor || '#191c1e',
                  }}>
                    Classic Fit Tee
                  </div>
                  <div style={{
                    fontFamily: previewTheme.fontHeadline || "'Jost', sans-serif",
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    color: previewTheme.primaryColor || '#1a1a1a',
                    marginTop: '0.2rem',
                  }}>
                    ₹1,299
                  </div>
                  <div style={{
                    marginTop: '0.5rem',
                    display: 'flex',
                    gap: '0.25rem',
                  }}>
                    {['S', 'M', 'L', 'XL'].map(size => (
                      <span key={size} style={{
                        padding: '0.15rem 0.35rem',
                        fontSize: '0.62rem',
                        fontWeight: 600,
                        borderRadius: previewTheme.borderRadius || '8px',
                        border: `1px solid ${previewTheme.borderColor || '#e5e5ea'}`,
                        color: previewTheme.textColor || '#191c1e',
                      }}>
                        {size}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Buttons Preview */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{
                  background: previewTheme.primaryColor || '#1a1a1a',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  borderRadius: previewTheme.borderRadius || '8px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}>
                  Add to Cart
                </div>
                <div style={{
                  background: 'transparent',
                  color: previewTheme.primaryColor || '#1a1a1a',
                  padding: '0.5rem 1rem',
                  borderRadius: previewTheme.borderRadius || '8px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  border: `1px solid ${previewTheme.borderColor || '#e5e5ea'}`,
                  cursor: 'pointer',
                }}>
                  Wishlist
                </div>
              </div>

              {/* Status Badges */}
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: `${previewTheme.successColor || '#22c55e'}15`,
                  color: previewTheme.successColor || '#22c55e',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                }}>
                  ✓ In Stock
                </span>
                <span style={{
                  background: `${previewTheme.warningColor || '#f59e0b'}15`,
                  color: previewTheme.warningColor || '#f59e0b',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                }}>
                  ⚡ Best Seller
                </span>
                <span style={{
                  background: `${previewTheme.dangerColor || '#ef4444'}15`,
                  color: previewTheme.dangerColor || '#ef4444',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                  fontSize: '0.62rem',
                  fontWeight: 700,
                }}>
                  Limited Edition
                </span>
              </div>
            </div>

            {/* Preview Footer */}
            <div style={{
              borderTop: `1px solid ${previewTheme.borderColor || '#e5e5ea'}`,
              padding: '0.65rem 1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.65rem',
              color: previewTheme.accentColor || '#888888',
            }}>
              <span>Free shipping on orders ₹499+</span>
              <span>🔒 Secure checkout</span>
            </div>
          </div>

          {/* Font Preview */}
          <div style={{
            marginTop: '0.75rem',
            padding: '0.75rem',
            borderRadius: previewTheme.borderRadius || '8px',
            border: `1px solid ${previewTheme.borderColor || '#e5e5ea'}`,
            background: (previewTheme.surfaceColor || '#f8f9fb'),
          }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: (previewTheme.accentColor || '#888888'), letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>Font Preview</div>
            <div style={{ fontFamily: previewTheme.fontDisplay || "'Jost', sans-serif", fontSize: '1rem', fontWeight: 800, color: previewTheme.textColor || '#191c1e' }}>
              Display Font
            </div>
            <div style={{ fontFamily: previewTheme.fontHeadline || "'Jost', sans-serif", fontSize: '0.85rem', fontWeight: 700, color: previewTheme.textColor || '#191c1e', marginTop: '0.3rem' }}>
              Headline Font — Section Titles
            </div>
            <div style={{ fontFamily: previewTheme.fontBody || "'Jost', sans-serif", fontSize: '0.78rem', color: (previewTheme.accentColor || '#888888'), lineHeight: 1.5, marginTop: '0.3rem' }}>
              Body font for product descriptions, paragraphs, and longer text content across the storefront. Choose a highly readable option.
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="form-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <button className="btn-dark btn-sm" onClick={handleApply} disabled={loading}>
          {loading ? 'Saving...' : 'Apply Theme'}
        </button>
      </div>
    </div>
  );
}

function getDefaultTheme() {
  return {
    // Colors (matching tokens.css exactly)
    primaryColor: '#1a1a1a',
    secondaryColor: '#6b7280',
    accentColor: '#4b5563',
    surfaceColor: '#f8f9fb',
    textColor: '#191c1e',
    borderColor: '#E8E2D9',
    successColor: '#27AE60',
    dangerColor: '#C0392B',
    warningColor: '#F39C12',
    infoColor: '#2980B9',
    // Fonts
    fontDisplay: "'Jost', sans-serif",
    fontBody: "'Jost', sans-serif",
    fontHeadline: "'Jost', sans-serif",
    // Layout
    containerMaxWidth: '1280px',
    sectionGap: '80px',
    // Borders
    borderRadius: '8px',
    cardBorderRadius: '12px',
  };
}

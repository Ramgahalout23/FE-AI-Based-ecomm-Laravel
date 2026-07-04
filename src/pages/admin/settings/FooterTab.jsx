export default function FooterTab({ settings, setSettings, loading, handleSaveSettings }) {
  return (
    <div className="detail-panel">
      <div className="detail-header"><h3>Footer Configuration</h3></div>
      <p className="field-hint">
        Customize the footer content — brand tagline, newsletter signup, navigation links, and trust badges. Changes apply instantly.
      </p>

      <div className="footer-section">
        <h4 className="footer-section-title">Brand Tagline</h4>
        <div className="form-grid">
          <div className="form-group form-full">
            <textarea
              rows={3}
              value={settings.footerBrandTagline || "India's favorite t-shirt brand. Premium quality, bold designs, and unbeatable comfort — all at prices that make you smile."}
              onChange={e => setSettings({ ...settings, footerBrandTagline: e.target.value })}
              placeholder="Your brand tagline shown in the footer..."
            />
          </div>
        </div>
      </div>

      <div className="footer-section">
        <div className="detail-header detail-header-inline">
          <h4 className="footer-section-title" style={{ margin: 0 }}>Newsletter Signup</h4>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.footerNewsletterEnabled !== 'false'} onChange={e => setSettings({ ...settings, footerNewsletterEnabled: e.target.checked ? 'true' : 'false' })} />
            <strong className="newsletter-label">Show Newsletter</strong>
          </label>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label>Title</label>
            <input value={settings.footerNewsletterTitle || 'Get 10% Off'} onChange={e => setSettings({ ...settings, footerNewsletterTitle: e.target.value })} placeholder="Get 10% Off" />
          </div>
          <div className="form-group">
            <label>Button Text</label>
            <input value={settings.footerNewsletterBtnText || 'Join'} onChange={e => setSettings({ ...settings, footerNewsletterBtnText: e.target.value })} placeholder="Join" />
          </div>
          <div className="form-group form-full">
            <label>Subtitle</label>
            <input value={settings.footerNewsletterSubtitle || 'Subscribe for early access to new drops & exclusive deals!'} onChange={e => setSettings({ ...settings, footerNewsletterSubtitle: e.target.value })} placeholder="Subscribe for early access..." />
          </div>
        </div>
      </div>

      <div className="footer-section">
        <h4 className="footer-section-title">Shop Links</h4>
        <p className="footer-section-hint">
          JSON array of link objects: <code>{`[{ "label": "Oversized Tees", "to": "/products?category=oversized" }]`}</code>
        </p>
        <div className="form-group form-full">
          <textarea
            rows={6}
            value={settings.footerShopLinks || ''}
            onChange={e => setSettings({ ...settings, footerShopLinks: e.target.value })}
            placeholder='[{ "label": "Oversized Tees", "to": "/products?category=oversized" }, ...]'
            style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      <div className="footer-section">
        <h4 className="footer-section-title">Help Links</h4>
        <p className="footer-section-hint">
          JSON array of link objects. Use <code>{"to: \"\""}</code> for non-link items (plain text).
        </p>
        <div className="form-group form-full">
          <textarea
            rows={7}
            value={settings.footerHelpLinks || ''}
            onChange={e => setSettings({ ...settings, footerHelpLinks: e.target.value })}
            placeholder='[{ "label": "Track Order", "to": "/orders" }, ...]'
            style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      <div className="footer-section">
        <h4 className="footer-section-title">Bottom Bar Links</h4>
        <p className="footer-section-hint">
          JSON array of link label objects: <code>{`[{ "label": "Privacy Policy" }]`}</code>
        </p>
        <div className="form-group form-full">
          <textarea
            rows={3}
            value={settings.footerBottomLinks || ''}
            onChange={e => setSettings({ ...settings, footerBottomLinks: e.target.value })}
            placeholder='[{ "label": "Privacy Policy" }, ...]'
            style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
          />
        </div>
      </div>

      <div className="footer-section">
        <h4 className="footer-section-title">Trust Badges</h4>
        <p className="footer-section-hint">
          JSON array of badge objects: <code>{`[{ "title": "Free Shipping", "desc": "On orders over ₹499" }]`}</code>
        </p>
        <div className="form-group form-full">
          <textarea
            rows={5}
            value={settings.footerTrustBadges || ''}
            onChange={e => setSettings({ ...settings, footerTrustBadges: e.target.value })}
            placeholder='[{ "title": "Free Shipping", "desc": "On orders over ₹499" }, ...]'
            className="json-textarea"
          />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
          {loading ? 'Saving...' : 'Save Footer Settings'}
        </button>
      </div>
    </div>
  );
}

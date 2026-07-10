const fs = require('fs');
const path = 'luxe-ecommerce-laravel-frontend/src/pages/admin/SettingsAdminPage.jsx';
let c = fs.readFileSync(path, 'utf8');

// 1. Add reelsEnabled to TAB_SETTING_KEYS
c = c.replace(
  "'tshirtCustomizerEnabled',",
  "'tshirtCustomizerEnabled',\n      'reelsEnabled',"
);

// 2. Add reels toggle UI in Homepage Sections area (after Curated Looks toggle)
const curatedLooksToggle = `              {/* Curated Looks Section Toggle */}`;
const reelsToggle = `              {/* Reels Section Toggle */}
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
                  <span style={{ fontSize: '1.25rem' }}>🎥</span>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>Featured Reels</strong>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.15rem 0 0' }}>
                      Video reels slider section on the homepage
                    </p>
                  </div>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={settings.reelsEnabled !== 'false'}
                    onChange={e => setSettings({ ...settings, reelsEnabled: e.target.checked ? 'true' : 'false' })}
                  />
                  <span className={\`status-badge \${settings.reelsEnabled !== 'false' ? 'status-active' : 'status-pending'}\`}>
                    {settings.reelsEnabled !== 'false' ? 'Visible' : 'Hidden'}
                  </span>
                </label>
              </div>

              {/* Curated Looks Section Toggle */}`;

c = c.replace(
  '              {/* Curated Looks Section Toggle */}',
  reelsToggle
);

fs.writeFileSync(path, c);
console.log('Done - reelsEnabled added to settings');

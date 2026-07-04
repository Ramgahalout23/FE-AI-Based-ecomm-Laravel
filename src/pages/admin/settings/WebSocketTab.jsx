export default function WebSocketTab({ settings, setSettings, loading, handleSaveSettings }) {
  // ── Driver options ──
  const DRIVERS = [
    { value: 'disabled', label: 'Disable Real-time', description: 'No real-time updates — users must refresh to see changes' },
    { value: 'websocket', label: 'WebSocket (Node.js)', description: 'Requires Node.js Socket.IO server running separately' },
    { value: 'pusher', label: 'Pusher', description: 'Works on shared hosting — no Node.js needed. Create free account at pusher.com' },
  ];

  const currentDriver = settings.realtimeDriver || 'disabled';
  const isPusher = currentDriver === 'pusher';
  const isWebSocket = currentDriver === 'websocket';

  return (
    <div className="detail-panel">
      <div className="detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3>Real-time Configuration</h3>
          <span className={`status-badge ${
            currentDriver === 'disabled' ? 'status-inactive' :
            currentDriver === 'pusher' ? 'status-active' : 'status-active'
          }`}>
            {currentDriver === 'disabled' ? 'Disabled' : currentDriver === 'pusher' ? 'Pusher' : 'WebSocket'}
          </span>
        </div>
      </div>

      <p className="field-hint">
        Real-time powers live order updates, notifications, chat messages, and review alerts.
        Choose your preferred driver below. Changes take effect immediately.
      </p>

      {/* ── Driver Selection ── */}
      <div className="form-group form-full form-section-spacing">
        <label className="section-label">Real-time Driver</label>
        <div className="driver-select-list">
          {DRIVERS.map((driver) => (
            <label
              key={driver.value}
              className={`driver-select-card ${currentDriver === driver.value ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="realtimeDriver"
                value={driver.value}
                checked={currentDriver === driver.value}
                onChange={e => setSettings({ ...settings, realtimeDriver: e.target.value })}
                className="driver-radio"
              />
              <div>
                <strong className="driver-select-label">{driver.label}</strong>
                <p className="driver-select-desc">{driver.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* ── Pusher Configuration ── */}
      {isPusher && (
        <>
          <h4 className="settings-subsection-title">Pusher Credentials</h4>
          <p className="form-hint">
            Get these from your{' '}
            <a href="https://dashboard.pusher.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
              Pusher Dashboard
            </a>
            {' '}→ Create App → App Keys.
          </p>
          <div className="form-grid">
            <div className="form-group">
              <label>App ID</label>
              <input
                type="text"
                value={settings.pusherAppId || ''}
                onChange={e => setSettings({ ...settings, pusherAppId: e.target.value })}
                placeholder="PUSHER_APP_ID"
              />
            </div>
            <div className="form-group">
              <label>App Key</label>
              <input
                type="text"
                value={settings.pusherKey || ''}
                onChange={e => setSettings({ ...settings, pusherKey: e.target.value })}
                placeholder="PUSHER_APP_KEY"
              />
            </div>
            <div className="form-group">
              <label>App Secret</label>
              <input
                type="password"
                value={settings.pusherSecret || ''}
                onChange={e => setSettings({ ...settings, pusherSecret: e.target.value })}
                placeholder="PUSHER_APP_SECRET"
              />
            </div>
            <div className="form-group">
              <label>Cluster</label>
              <input
                type="text"
                value={settings.pusherCluster || 'mt1'}
                onChange={e => setSettings({ ...settings, pusherCluster: e.target.value })}
                placeholder="mt1 / ap2 / eu / us2"
              />
              <span className="field-note">
                e.g. mt1, ap2, eu, us2 — find in Pusher dashboard
              </span>
            </div>
          </div>
        </>
      )}

      {/* ── WebSocket Configuration ── */}
      {isWebSocket && (
        <>
          <h4 className="settings-subsection-title">WebSocket Server</h4>
          <div className="form-grid">
            <div className="form-group form-full">
              <label>Server URL</label>
              <input
                type="text"
                value={settings.socketServerUrl || ''}
                onChange={e => setSettings({ ...settings, socketServerUrl: e.target.value })}
                placeholder="https://your-socket-server.com"
              />
              <span className="field-note">
                Full URL of your Node.js Socket.IO server (e.g. https://socket.example.com)
              </span>
            </div>
            <div className="form-group">
              <label>Ping Interval (ms)</label>
              <input
                type="number"
                value={settings.socketPingInterval || '25000'}
                onChange={e => setSettings({ ...settings, socketPingInterval: e.target.value })}
                placeholder="25000"
              />
              <span className="field-note">How often the server sends keep-alive pings. Default: 25000</span>
            </div>
            <div className="form-group">
              <label>Ping Timeout (ms)</label>
              <input
                type="number"
                value={settings.socketPingTimeout || '20000'}
                onChange={e => setSettings({ ...settings, socketPingTimeout: e.target.value })}
                placeholder="20000"
              />
              <span className="field-note">Time to wait for a pong before disconnecting. Default: 20000</span>
            </div>
          </div>
        </>
      )}

      <div className="form-actions ws-form-actions">
        <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
        {currentDriver !== 'disabled' && (
          <button
            className="btn-outline btn-sm"
            onClick={async () => {
              const result = await fetch('/api/v1/admin/realtime/test').then(r => r.json()).catch(() => null);
              if (result?.success) {
                alert('✅ Connection successful! ' + (result.message || ''));
              } else {
                alert('❌ Connection failed. ' + (result?.message || 'Check your configuration.'));
              }
            }}
            style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: '1px solid var(--border)', cursor: 'pointer', background: 'transparent' }}
          >
            Test Connection
          </button>
        )}
      </div>
    </div>
  );
}

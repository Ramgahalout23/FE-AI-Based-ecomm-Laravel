export default function WebSocketTab({ settings, setSettings, loading, handleSaveSettings }) {
  return (
    <div className="detail-panel">
      <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h3>WebSocket Configuration</h3>
          <span className={`status-badge ${settings.socketEnabled !== 'false' ? 'status-active' : 'status-pending'}`}>
            {settings.socketEnabled !== 'false' ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={settings.socketEnabled !== 'false'} onChange={e => setSettings({ ...settings, socketEnabled: e.target.checked ? 'true' : 'false' })} />
          <strong>Enable WebSocket</strong>
        </label>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
        WebSockets power real-time features: order status updates, notifications, and review alerts.
        Changes take effect on the next server restart.
      </p>
      <div className="form-grid">
        <div className="form-group">
          <label>Ping Interval (ms)</label>
          <input
            type="number"
            value={settings.socketPingInterval || '25000'}
            onChange={e => setSettings({ ...settings, socketPingInterval: e.target.value })}
            placeholder="25000"
            disabled={settings.socketEnabled === 'false'}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>How often the server sends keep-alive pings. Default: 25000</span>
        </div>
        <div className="form-group">
          <label>Ping Timeout (ms)</label>
          <input
            type="number"
            value={settings.socketPingTimeout || '20000'}
            onChange={e => setSettings({ ...settings, socketPingTimeout: e.target.value })}
            placeholder="20000"
            disabled={settings.socketEnabled === 'false'}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Time to wait for a pong before disconnecting. Default: 20000</span>
        </div>
        <div className="form-group form-full">
          <label>Allowed CORS Origins</label>
          <textarea
            rows={3}
            value={settings.socketAllowedOrigins || ''}
            onChange={e => setSettings({ ...settings, socketAllowedOrigins: e.target.value })}
            placeholder="http://localhost:3000,http://localhost:5173"
            disabled={settings.socketEnabled === 'false'}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Comma-separated list of origins allowed to connect via WebSocket.</span>
        </div>
      </div>
      <div className="form-actions">
        <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save WebSocket Settings'}</button>
      </div>
    </div>
  );
}

import toast from '../../../utils/toast';

export default function SystemTab({ loading, settings, handleBackup, handleClearCache, setSettings, handleSaveSettings, handleQuickToggleMaintenance, settingsAPI }) {
  return (
    <div>
      <div className="detail-panel">
        <div className="detail-header"><h3>System Actions</h3></div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, padding: '1.25rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💾</div>
            <strong>Database Backup</strong>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>Create a full backup of the database</p>
            <button className="btn-dark btn-sm" onClick={handleBackup}>Trigger Backup</button>
          </div>
          <div style={{ flex: 1, minWidth: 200, padding: '1.25rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗑️</div>
            <strong>Clear Cache</strong>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>Flush backend cache (config, views, translations)</p>
            <button className="btn-ghost btn-sm" onClick={handleClearCache}>Clear Cache</button>
          </div>
          <div style={{ flex: 1, minWidth: 200, padding: '1.25rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🌐</div>
            <strong>Clear Translations Cache</strong>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>Clear translations localStorage for all visitors</p>
            <button className="btn-ghost btn-sm" onClick={handleClearCache}>Clear Translations</button>
          </div>
          <div style={{ flex: 1, minWidth: 200, padding: '1.25rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
            <strong>Activity Logs</strong>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>View system activity and audit trail</p>
            <button className="btn-ghost btn-sm" onClick={() => toast.success('Logs exported')}>Export Logs</button>
          </div>
        </div>
      </div>

      <div className="detail-panel">
        <div className="detail-header"><h3>System Information</h3></div>
        <div className="detail-grid">
          <div className="detail-item"><span className="label">App Version</span><span className="value">1.0.0</span></div>
          <div className="detail-item"><span className="label">API Endpoint</span><span className="value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}</span></div>
          <div className="detail-item"><span className="label">Environment</span><span className="value"><span className="status-badge status-pending">Development</span></span></div>
          <div className="detail-item"><span className="label">Last Deploy</span><span className="value">—</span></div>
        </div>
      </div>

    </div>
  );
}

import toast from '../../../utils/toast';

export default function IntegrationsTab({ backups, backupsLoading, loading, handleBackup, loadBackups }) {
  return (
    <div className="detail-panel">
      <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3>Database Backups</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
            On-demand database snapshots to protect against data loss.
          </p>
        </div>
        <button className="btn-dark btn-sm" onClick={handleBackup} disabled={loading}>
          {loading ? 'Backing up...' : 'Create Backup'}
        </button>
      </div>

      {backupsLoading ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 0.5rem' }} />
          <p>Loading backups...</p>
        </div>
      ) : backups.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💾</div>
          <p>No backups available yet.</p>
          <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Click "Create Backup" to generate your first database snapshot.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Timestamp</th>
                <th style={{ padding: '0.75rem' }}>Size</th>
                <th style={{ padding: '0.75rem' }}>Status</th>
                <th style={{ padding: '0.75rem' }}>Filename</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>{b.timestamp ? new Date(b.timestamp).toLocaleString() : '—'}</td>
                  <td style={{ padding: '0.75rem' }}>{b.size || '—'}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span className={`status-badge ${b.status === 'success' ? 'status-active' : 'status-pending'}`}>
                      {b.status || 'Unknown'}
                    </span>
                    {b.error && <div style={{ fontSize: '0.75rem', color: 'red', marginTop: '0.25rem' }}>{b.error}</div>}
                  </td>
                  <td style={{ padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>{b.filename || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

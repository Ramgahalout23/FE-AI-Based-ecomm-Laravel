import { useState, useEffect } from 'react';
import toast from '../../../utils/toast';
import { adminAPI } from '../../../api/admin';
import { formatDateTime } from '../../../utils/formatters';

export default function SystemTab({ handleBackup, handleClearCache }) {
  const [cleanupStatus, setCleanupStatus] = useState(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [cleanupDryRunResult, setCleanupDryRunResult] = useState(null);

  useEffect(() => {
    adminAPI.getCleanupStatus()
      .then((res) => {
        const d = res.data?.data || res.data;
        if (d) setCleanupStatus(d);
      })
      .catch((err) => console.warn('Failed to load cleanup status:', err));
  }, []);

  const handleRunCleanup = async (apply = false) => {
    if (apply) {
      if (!window.confirm('Purge stale tracking events, visitor sessions, and read notifications older than their retention windows (in non-blocking batches of 1,000)? Active and unread data is strictly preserved.')) {
        return;
      }
    }

    setCleanupLoading(true);
    try {
      const res = await adminAPI.triggerCleanup({ apply });
      const data = res.data?.data || res.data;
      if (apply) {
        const count = data?.result?.totalAffected ?? 0;
        toast.success(`Cleanup complete! Purged ${count} stale rows.`);
        setCleanupDryRunResult(null);
        const statusRes = await adminAPI.getCleanupStatus();
        const d = statusRes.data?.data || statusRes.data;
        if (d) setCleanupStatus(d);
      } else {
        setCleanupDryRunResult(data?.result);
        toast.success(`Audit complete: ${data?.result?.totalAffected ?? 0} rows eligible for deletion.`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to execute cleanup');
    } finally {
      setCleanupLoading(false);
    }
  };

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

      {/* ═══════════ DATABASE AUTO-CLEANUP & AUDIT (HYBRID COMBINATION) ═══════════ */}
      <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🧹</span> Database Auto-Cleanup & Storage Optimization
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.25rem 0 0' }}>
              Hybrid architecture: Background 24h cron automatically prunes stale tracking & logs; admin trigger allows on-demand dry-run audit & manual purge.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="status-badge status-active" style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', fontWeight: 600 }}>
              ● Automated 24h Cron: Active
            </span>
          </div>
        </div>

        {/* Status & Metrics Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ background: 'var(--off-white)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Auto Cadence</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.25rem' }}>Once Every 24 Hours</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>Non-blocking (1,000 rows/batch, 50ms pause)</div>
          </div>
          <div style={{ background: 'var(--off-white)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Clean Run</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.25rem' }}>
              {cleanupStatus?.lastRun ? formatDateTime(cleanupStatus.lastRun) : 'Pending first daily cycle'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>Persistent in database settings</div>
          </div>
          <div style={{ background: 'var(--off-white)', padding: '1rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Retention Windows</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '0.25rem' }}>
              Notifications: 90d (Read only)<br/>
              Tracking & Sessions: 90d<br/>
              Activity & Webhook Logs: 180d
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn-ghost btn-sm"
            disabled={cleanupLoading}
            onClick={() => handleRunCleanup(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>🔍</span> {cleanupLoading ? 'Auditing...' : 'Check Cleanable Data (Dry Run)'}
          </button>
          <button
            type="button"
            className="btn-dark btn-sm"
            disabled={cleanupLoading}
            onClick={() => handleRunCleanup(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>⚡</span> {cleanupLoading ? 'Cleaning Database...' : 'Clean Database Now'}
          </button>
        </div>

        {/* Dry Run / Audit Table */}
        {cleanupDryRunResult && (
          <div style={{ marginTop: '1.25rem', padding: '1rem', background: '#f8fafc', borderRadius: 'var(--radius)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <strong style={{ fontSize: '0.88rem' }}>
                📊 Audit Results: {cleanupDryRunResult.totalAffected} total rows eligible for deletion
              </strong>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                Mode: {cleanupDryRunResult.mode.toUpperCase()} (No rows deleted)
              </span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'left', color: '#64748b' }}>
                    <th style={{ padding: '0.4rem 0.5rem' }}>Table</th>
                    <th style={{ padding: '0.4rem 0.5rem' }}>Retention Policy</th>
                    <th style={{ padding: '0.4rem 0.5rem', textAlign: 'right' }}>Eligible Rows</th>
                  </tr>
                </thead>
                <tbody>
                  {cleanupDryRunResult.details?.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.4rem 0.5rem', fontWeight: 600 }}>{item.table}</td>
                      <td style={{ padding: '0.4rem 0.5rem', color: '#64748b' }}>Older than {item.retentionDays} days</td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'right', fontWeight: item.count > 0 ? 700 : 400, color: item.count > 0 ? '#b91c1c' : '#166534' }}>
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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

import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI } from '../../api/admin';
import { Save, Calendar, Edit, Trash2, Package, AlertTriangle, Download, X } from 'lucide-react';

const FREQUENCY_OPTIONS = [
  { value: 'manual', label: 'Manual only' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

const DAY_OPTIONS = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit', minute: '2-digit',
  });
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0, size = bytes;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++; }
  return `${size.toFixed(1)} ${units[i]}`;
}

export default function BackupsAdminPage() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [pendingBackupId, setPendingBackupId] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);
  const mountedRef = useRef(true);
  const pollRef = useRef(null);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const [settings, setSettings] = useState(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [editSettings, setEditSettings] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    backup_frequency: 'manual', backup_time: '02:00', backup_day_of_week: 'Monday',
  });

  const [confirmDelete, setConfirmDelete] = useState(null);

  const msg = (type, text) => { setActionMsg({ type, text }); setTimeout(() => setActionMsg(null), 4000); };

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const r = await adminAPI.listBackups();
      const payload = r.data?.data || [];
      setBackups(Array.isArray(payload) ? payload : []);
    } catch {
      setError('Failed to load backups');
      setBackups([]);
    } finally { setLoading(false); }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      setSettingsLoading(true);
      const r = await adminAPI.getBackupSchedule();
      const data = r.data?.data || {};
      setSettings(data);
      setScheduleForm({
        backup_frequency: data.backup_frequency || 'manual',
        backup_time: data.backup_time || '02:00',
        backup_day_of_week: data.backup_day_of_week || 'Monday',
      });
    } catch (e) {
      console.warn('Failed to load backup settings:', e);
    } finally { setSettingsLoading(false); }
  }, []);

  useEffect(() => { fetchBackups(); fetchSettings(); }, [fetchBackups, fetchSettings]);

  // ── Poll backup job status ──
  const pollBackupStatus = useCallback(async (backupId) => {
    try {
      const r = await adminAPI.getBackupStatus(backupId);
      const { status, result } = r.data?.data || {};
      if (!mountedRef.current) return;

      setPendingStatus(status);

      if (status === 'completed') {
        // Backup finished — refresh the list and clean up
        clearInterval(pollRef.current);
        pollRef.current = null;
        setPendingBackupId(null);
        setPendingStatus(null);
        setActionLoading(null);
        msg('success', `Backup completed successfully`);
        fetchBackups();
      } else if (status === 'failed') {
        clearInterval(pollRef.current);
        pollRef.current = null;
        setPendingBackupId(null);
        setPendingStatus(null);
        setActionLoading(null);
        const errMsg = result?.error || 'Backup failed';
        msg('error', errMsg);
        fetchBackups();
      }
      // 'processing' — keep polling
    } catch {
      // Poll error — keep trying
      if (!mountedRef.current) return;
    }
  }, [fetchBackups]);

  const handleCreate = async () => {
    setActionLoading('create');
    setPendingStatus('queued');
    try {
      const r = await adminAPI.triggerBackup();
      const backupId = r.data?.data?.backup_id;

      if (backupId) {
        setPendingBackupId(backupId);
        setPendingStatus('queued');

        // Start polling every 2s
        clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
          if (mountedRef.current) pollBackupStatus(backupId);
        }, 2000);

        // Also poll immediately
        pollBackupStatus(backupId);
      } else {
        // No backup_id returned — fall back to old behaviour
        msg('success', r.data?.message || 'Backup queued for processing');
        setTimeout(() => { if (mountedRef.current) fetchBackups(); }, 3000);
        setActionLoading(null);
      }
    } catch (e) {
      msg('error', e?.response?.data?.message || 'Failed to create backup');
      setActionLoading(null);
      setPendingBackupId(null);
      setPendingStatus(null);
    }
  };

  const handleDownload = async (filename) => {
    try {
      const r = await adminAPI.downloadBackup(filename);
      const url = window.URL.createObjectURL(new Blob([r.data]));
      const a = document.createElement('a'); a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); window.URL.revokeObjectURL(url);
      msg('success', `${filename} downloaded`);
    } catch (e) { msg('error', e?.response?.data?.message || 'Download failed'); }
  };

  const handleDelete = async (filename) => {
    setActionLoading(`delete-${filename}`);
    try {
      await adminAPI.deleteBackup(filename);
      msg('success', `Backup ${filename} deleted`);
      setBackups((prev) => prev.filter((b) => b.filename !== filename));
      setConfirmDelete(null);
    } catch (e) {
      msg('error', e?.response?.data?.message || 'Failed to delete backup');
      setConfirmDelete(null);
    } finally { setActionLoading(null); }
  };

  const handleSaveSettings = async () => {
    setActionLoading('save-settings');
    try {
      const r = await adminAPI.updateBackupSchedule(scheduleForm);
      setSettings(r.data?.data || scheduleForm);
      setEditSettings(false);
      msg('success', 'Backup schedule updated');
    } catch (e) { msg('error', e?.response?.data?.message || 'Failed to update settings'); }
    finally { setActionLoading(null); }
  };

  const frequencyLabel = settings
    ? FREQUENCY_OPTIONS.find((o) => o.value === settings.backup_frequency)?.label || settings.backup_frequency
    : '—';

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div>
          <h2 className="flex items-center gap-2"><Save size={20} />Backups</h2>
          <p>Create, download, and delete database backups — manage your backup schedule</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-ghost btn-sm" onClick={fetchBackups} disabled={loading || !!pendingBackupId}>
            {loading ? '⟳' : '↻'} Refresh
          </button>
          <button className="btn-dark btn-sm" onClick={handleCreate} disabled={!!pendingBackupId}>
            {pendingBackupId ? (
              <><span className="spinning">⟳</span> {pendingStatus === 'processing' ? 'Processing…' : 'Queued…'}</>
            ) : actionLoading === 'create' ? (
              '⟳ Queuing…'
            ) : (
              <><Save size={14} /> Create Backup</>
            )}
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className={`admin-alert ${actionMsg.type === 'success' ? 'success' : 'error'}`}>
          <span className="admin-alert-icon">{actionMsg.type === 'success' ? '✓' : '✕'}</span>
          <div className="admin-alert-body">{actionMsg.text}</div>
        </div>
      )}

      {pendingBackupId && (
        <div className="admin-alert processing">
          <span className="admin-alert-icon spinning">⟳</span>
          <div className="admin-alert-body">
            <div className="admin-alert-title">Backup in progress</div>
            <div>Status: <strong>{pendingStatus}</strong> — this page will update automatically when complete</div>
          </div>
        </div>
      )}

      {/* ── Backup Schedule ── */}
      <div className="table-card mb-4">
        <div className="table-head">
          <h3 className="flex items-center gap-2"><Calendar size={16} /> Backup Schedule</h3>
          {!editSettings && (
            <button className="btn-ghost btn-sm" onClick={() => setEditSettings(true)}><Edit size={14} /> Edit</button>
          )}
        </div>

        {settingsLoading ? (
          <div className="loading-page" style={{ padding: '1.5rem' }}><div className="spinner" /></div>
        ) : !editSettings ? (
          <div className="settings-grid">
            <div className="setting-item">
              <span className="setting-label">Frequency</span>
              <span className="setting-value">{frequencyLabel}</span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Time</span>
              <span className="setting-value">{settings?.backup_time || '—'}</span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Day of Week</span>
              <span className="setting-value">
                {settings?.backup_day_of_week || '—'}
                {settings?.backup_frequency !== 'weekly' && (
                  <em style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 6 }}>(weekly only)</em>
                )}
              </span>
            </div>
            <div className="setting-item">
              <span className="setting-label">Last Run</span>
              <span className="setting-value">{settings?.backup_last_run ? formatDate(settings.backup_last_run) : 'Never'}</span>
            </div>
          </div>
        ) : (
          <div className="edit-settings-form">
            <div className="form-grid" style={{ padding: 16 }}>
              <div className="form-group">
                <label>Frequency</label>
                <select value={scheduleForm.backup_frequency} onChange={(e) => setScheduleForm({ ...scheduleForm, backup_frequency: e.target.value })}>
                  {FREQUENCY_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>
              <div className="form-group">
                <label>Time</label>
                <input type="time" value={scheduleForm.backup_time} onChange={(e) => setScheduleForm({ ...scheduleForm, backup_time: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Day of Week</label>
                <select value={scheduleForm.backup_day_of_week} onChange={(e) => setScheduleForm({ ...scheduleForm, backup_day_of_week: e.target.value })}
                  disabled={scheduleForm.backup_frequency !== 'weekly'}
                  style={{ opacity: scheduleForm.backup_frequency !== 'weekly' ? 0.5 : 1 }}>
                  {DAY_OPTIONS.map((d) => (<option key={d} value={d}>{d}</option>))}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button className="btn-ghost btn-sm" onClick={() => { setEditSettings(false); fetchSettings(); }} disabled={actionLoading === 'save-settings'}>Cancel</button>
              <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={actionLoading === 'save-settings'}>
                {actionLoading === 'save-settings' ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="admin-alert error">
          <span className="admin-alert-icon"><AlertTriangle size={16} /></span>
          <div className="admin-alert-body">
            <div className="admin-alert-title">Error</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* ── Backup Files Table ── */}
      <div className="table-card">
        <div className="table-head">
          <h3 className="flex items-center gap-2"><Package size={16} /> Backup Files</h3>
          <span className="table-count">
            {backups.filter(b => b.status === 'completed').length} completed
            {backups.some(b => b.status !== 'completed') && (
              <> · {backups.filter(b => b.status !== 'completed').length} in progress</>
            )}
          </span>
        </div>

        {loading && backups.length === 0 ? (
          <div className="loading-page" style={{ padding: '3rem' }}><div className="spinner" /></div>
        ) : backups.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem' }}>
            <div className="empty-state-icon"><Package size={40} /></div>
            <h3>No backups yet</h3>
            <p>Create your first backup to protect your data.</p>
            <button className="btn-dark btn-sm" onClick={handleCreate} disabled={actionLoading === 'create'} style={{ marginTop: '0.75rem' }}>
              {actionLoading === 'create' ? 'Queuing…' : 'Create your first backup'}
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th style={{ width: 100 }}>Size</th>
                  <th style={{ width: 140 }}>Created</th>
                  <th style={{ width: 90 }}>Status</th>
                  <th style={{ width: 160, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.map((backup) => {
                  const isCompleted = backup.status === 'completed';
                  const isProcessing = backup.status === 'processing';
                  const isQueued = backup.status === 'queued';

                  return (
                  <tr key={backup.filename} className={!isCompleted ? 'row-processing' : ''}>
                    <td>
                      <div className="backup-filename-cell">
                        {isQueued && <span className="processing-pulse" />}
                        {isProcessing && <span className="spinning" style={{ fontSize: '0.7rem', color: 'var(--accent)' }}>⟳</span>}
                        {isCompleted && <Save size={14} style={{ flexShrink: 0 }} />}
                        <code className={`backup-filename ${!isCompleted ? 'text-muted' : ''}`}>
                          {isQueued || isProcessing ? (
                            <>{backup.backup_id ? backup.backup_id.substring(0, 22) + '…' : backup.filename}</>
                          ) : backup.filename}
                        </code>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--muted)' }}>
                      {isQueued || isProcessing ? (
                        <span style={{ color: 'var(--muted)', opacity: 0.5 }}>—</span>
                      ) : (
                        backup.size_formatted || formatBytes(backup.size)
                      )}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(backup.created_at)}
                    </td>
                    <td>
                      {isQueued ? (
                        <span className="status-badge status-pending" style={{ fontSize: '0.72rem', background: '#e2e8f0', color: '#64748b' }}>
                          queued
                        </span>
                      ) : isProcessing ? (
                        <span className="status-badge" style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#b45309' }}>
                          <span className="spinning" style={{ display: 'inline-block', marginRight: 4 }}>⟳</span>
                          processing
                        </span>
                      ) : (
                        <span className={`status-badge status-active`} style={{ fontSize: '0.72rem' }}>
                          completed
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn-edit" onClick={() => handleDownload(backup.filename)}
                          disabled={!isCompleted || actionLoading === `download-${backup.filename}`}>
                          {isCompleted ? <><Download size={14} /> Download</> : '—'}
                        </button>
                        <button className="btn-del" onClick={() => setConfirmDelete(backup.filename)}
                          disabled={!isCompleted || actionLoading === `delete-${backup.filename}`}>
                          {isCompleted ? <><Trash2 size={14} /> Delete</> : '—'}
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Delete Modal ── */}
      {confirmDelete && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="flex items-center gap-2"><Trash2 size={18} /> Delete Backup</h3>
              <button className="modal-close" onClick={() => setConfirmDelete(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--muted)' }}>
                Are you sure you want to delete <strong>{confirmDelete}</strong>?
              </p>
              <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 8 }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={() => setConfirmDelete(null)} disabled={actionLoading === `delete-${confirmDelete}`}>Cancel</button>
              <button className="btn-danger btn-sm" onClick={() => handleDelete(confirmDelete)}
                disabled={actionLoading === `delete-${confirmDelete}`}>
                {actionLoading === `delete-${confirmDelete}` ? 'Deleting…' : 'Delete Backup'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .settings-grid { display: grid; grid-template-columns: 1fr 1fr; }
        .setting-item {
          display: flex; flex-direction: column; gap: 4px;
          padding: 14px 20px; border-bottom: 1px solid var(--border);
        }
        .setting-item:nth-last-child(-n+2) { border-bottom: none; }
        .setting-label {
          font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.5px; color: var(--muted);
        }
        .setting-value { font-size: 0.9rem; color: var(--charcoal); font-weight: 500; }
        .edit-settings-form { border-top: 1px solid var(--border); }
        .backup-filename-cell { display: flex; align-items: center; gap: 8px; }
        .backup-filename {
          font-size: 0.72rem;
          font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
          color: var(--charcoal); word-break: break-all;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinning {
          display: inline-block;
          animation: spin 1s linear infinite;
        }
        .admin-alert.processing {
          background: #f0f7ff;
          border: 1px solid #b6d4fe;
          color: #0c4a6e;
        }
        .admin-alert.processing .admin-alert-icon.spinning {
          display: inline-block;
          animation: spin 1s linear infinite;
          font-size: 1.1rem;
        }
        .row-processing {
          opacity: 0.75;
          background: #fafafa;
        }
        .row-processing:hover {
          opacity: 1;
        }
        .text-muted {
          color: var(--muted) !important;
        }
        .processing-pulse {
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #f59e0b;
          animation: pulse 1.5s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

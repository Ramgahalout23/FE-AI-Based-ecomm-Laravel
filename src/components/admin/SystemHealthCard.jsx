import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import { formatDateTime } from '../../utils/formatters';

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export default function SystemHealthCard({ health }) {
  const navigate = useNavigate();
  const [queueMetrics, setQueueMetrics] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(false);

  // Fetch queue metrics if health doesn't include them yet
  const fetchQueueMetrics = useCallback(async () => {
    if (health?.queueHealth) return; // Already included
    setLoadingQueue(true);
    try {
      const res = await adminAPI.getFailedJobs({ per_page: 1 });
      const data = res.data?.data || res.data || {};
      const items = Array.isArray(data.items) ? data.items : [];
      const total = data.total || items.length;
      setQueueMetrics({
        failed_job_count: total,
        has_failed_jobs: total > 0,
        latest_failed_job: items.length > 0 ? {
          uuid: items[0].uuid,
          queue: items[0].queue,
          failed_at: items[0].failed_at,
        } : null,
      });
    } catch {
      setQueueMetrics({ failed_job_count: -1, has_failed_jobs: false, latest_failed_job: null });
    } finally {
      setLoadingQueue(false);
    }
  }, [health]);

  useEffect(() => {
    if (!health?.queueHealth) {
      fetchQueueMetrics();
    }
  }, [fetchQueueMetrics, health]);

  const qh = health?.queueHealth || queueMetrics;
  const bh = health?.backupHealth;

  if (!health && !qh && !bh) return null;

  return (
    <div className="bg-white border border-border rounded-2xl shadow-soft overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-charcoal text-white flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18" />
            </svg>
          </div>
          <div>
            <h3 className="font-display font-bold text-text-primary text-sm">System Health</h3>
            <p className="text-[11px] text-text-muted">Queue & Backup Status</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            className="text-[11px] font-semibold text-info hover:underline px-2.5 py-1 rounded-lg hover:bg-info-bg transition-colors"
            onClick={() => navigate('/admin/queue')}
          >
            Queue
          </button>
          <button
            className="text-[11px] font-semibold text-info hover:underline px-2.5 py-1 rounded-lg hover:bg-info-bg transition-colors"
            onClick={() => navigate('/admin/settings?tab=integrations')}
          >
            Backups
          </button>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* ── Queue Health ── */}
          <div className="bg-surface rounded-xl p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${qh ? (qh.has_failed_jobs ? 'bg-danger' : 'bg-accent-green') : 'bg-gray-300'}`} />
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Queue</span>
              {loadingQueue && <div className="spinner w-3 h-3 ml-auto" style={{ borderWidth: '1.5px' }} />}
            </div>

            <div className="space-y-2.5">
              {/* Failed jobs count */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Failed Jobs</span>
                <span className={`text-sm font-bold ${qh?.has_failed_jobs ? 'text-danger' : 'text-success'}`}>
                  {qh ? (
                    qh.failed_job_count >= 0 ? qh.failed_job_count : '—'
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </span>
              </div>

              {/* Latest failure */}
              {qh?.latest_failed_job && (
                <div className="pt-2 border-t border-border/40">
                  <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block mb-1">Latest Failure</span>
                  <div className="text-[11px] text-text-muted space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-danger font-medium">Queue:</span>
                      <span className="truncate">{qh.latest_failed_job.queue}</span>
                    </div>
                    {qh.latest_failed_job.failed_at && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-danger font-medium">At:</span>
                        <span>{formatDateTime(qh.latest_failed_job.failed_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No failures */}
              {qh && !qh.has_failed_jobs && qh.failed_job_count >= 0 && (
                <div className="flex items-center gap-1.5 text-success text-xs font-medium pt-0.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  All queues healthy
                </div>
              )}
              {qh && qh.failed_job_count === -1 && (
                <div className="text-[11px] text-text-muted italic">Queue metrics unavailable</div>
              )}
            </div>
          </div>

          {/* ── Backup Health ── */}
          <div className="bg-surface rounded-xl p-4 border border-border/60">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2 h-2 rounded-full ${bh?.last_backup_at ? 'bg-accent-green' : 'bg-warning'}`} />
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Backups</span>
            </div>

            <div className="space-y-2.5">
              {/* Backup count */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Total Backups</span>
                <span className="text-sm font-bold text-text-primary">
                  {bh ? (
                    bh.backup_count >= 0 ? bh.backup_count : '—'
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </span>
              </div>

              {/* Last backup */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Last Backup</span>
                <span className="text-xs font-semibold text-text-primary">
                  {bh?.last_backup_at ? formatDateTime(bh.last_backup_at) : (
                    <span className="text-warning font-medium">Never</span>
                  )}
                </span>
              </div>

              {/* Last backup size */}
              {bh?.last_backup_size != null && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Latest Size</span>
                  <span className="text-xs font-semibold text-text-primary">{formatFileSize(bh.last_backup_size)}</span>
                </div>
              )}

              {/* No backups warning */}
              {bh && (!bh.last_backup_at || bh.backup_count === 0) && (
                <div className="flex items-center gap-1.5 text-warning text-xs font-medium pt-0.5 border-t border-border/40">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  No backups created yet
                </div>
              )}
              {bh && bh.backup_count > 0 && !bh.last_backup_at && (
                <div className="flex items-center gap-1.5 text-warning text-xs font-medium pt-0.5 border-t border-border/40">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                  Backup files found but no schedule info
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

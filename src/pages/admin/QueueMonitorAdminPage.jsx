import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/admin';

/**
 * Parse the job class name from the serialized payload JSON string.
 */
function getJobClass(payload) {
  if (!payload) return 'Unknown';
  try {
    const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
    return parsed.displayName || parsed.job || 'Unknown';
  } catch {
    return payload.slice(0, 80);
  }
}

/**
 * Extract a short summary from the exception trace (first line).
 */
function getExceptionSummary(exception) {
  if (!exception) return '—';
  const firstLine = exception.split('\n')[0];
  return firstLine.length > 200 ? firstLine.slice(0, 200) + '…' : firstLine;
}

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
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Safely try to parse a serialized job payload for display.
 */
function tryParsePayload(payload) {
  if (!payload) return { displayName: 'Unknown' };
  try {
    const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
    return {
      displayName: parsed.displayName || 'Unknown',
      maxTries: parsed.maxTries ?? '—',
      maxExceptions: parsed.maxExceptions ?? '—',
      timeout: parsed.timeout ?? '—',
      data: parsed.data ? '⏤ serialized command ⏤' : '—',
    };
  } catch {
    return { raw: String(payload).slice(0, 200) };
  }
}

export default function QueueMonitorAdminPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [queueFilter, setQueueFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, per_page: 15, total: 0, total_pages: 1 });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);
  const [expandedException, setExpandedException] = useState(null);
  const [expandedPayload, setExpandedPayload] = useState(null);
  const [confirmFlush, setConfirmFlush] = useState(false);

  const fetchJobs = useCallback(async (p = page) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page: p, per_page: 15 };
      if (queueFilter) params.queue = queueFilter;

      const r = await adminAPI.getFailedJobs(params);
      const payload = r.data?.data || {};

      let items = Array.isArray(payload.items) ? payload.items : [];

      if (search) {
        const q = search.toLowerCase();
        items = items.filter(
          (job) =>
            job.uuid?.toLowerCase().includes(q) ||
            job.queue?.toLowerCase().includes(q) ||
            job.connection?.toLowerCase().includes(q) ||
            getJobClass(job.payload).toLowerCase().includes(q) ||
            (job.exception || '').toLowerCase().includes(q),
        );
      }

      setJobs(items);
      setPagination({
        page: payload.page || p,
        per_page: payload.per_page || 15,
        total: payload.total || items.length,
        total_pages: payload.total_pages || 1,
      });
    } catch {
      setError('Failed to load failed jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [page, queueFilter, search]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchJobs(page); }, [page, queueFilter]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchJobs(page), 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, page, fetchJobs]);

  const msg = (type, text) => { setActionMsg({ type, text }); setTimeout(() => setActionMsg(null), 4000); };

  const handleRetry = async (uuid) => {
    setActionLoading(`retry-${uuid}`);
    try {
      await adminAPI.retryFailedJob(uuid);
      msg('success', `Job ${uuid.slice(0, 8)}… requeued for retry`);
      setJobs((prev) => prev.filter((j) => j.uuid !== uuid));
      setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (e) {
      msg('error', e?.response?.data?.message || 'Failed to retry job');
    } finally { setActionLoading(null); }
  };

  const handleRetryAll = async () => {
    setActionLoading('retry-all');
    try {
      await adminAPI.retryAllFailedJobs();
      msg('success', 'All failed jobs requeued for retry');
      setJobs([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
    } catch (e) {
      msg('error', e?.response?.data?.message || 'Failed to retry all jobs');
    } finally { setActionLoading(null); }
  };

  const handleFlush = async () => {
    if (!confirmFlush) { setConfirmFlush(true); return; }
    setActionLoading('flush');
    try {
      await adminAPI.flushFailedJobs();
      msg('success', 'All failed jobs flushed');
      setJobs([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
      setConfirmFlush(false);
    } catch (e) {
      msg('error', e?.response?.data?.message || 'Failed to flush jobs');
      setConfirmFlush(false);
    } finally { setActionLoading(null); }
  };

  const uniqueQueues = [...new Set(jobs.map((j) => j.queue).filter(Boolean))];

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div>
          <h2>
            <span style={{ marginRight: 8 }}>⚙️</span>Queue Monitor
          </h2>
          <p>View and manage failed queue jobs — retry or flush as needed</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)', cursor: 'pointer' }}>
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} /> Auto-refresh
          </label>
          <button className="btn-ghost btn-sm" onClick={() => fetchJobs(page)} disabled={loading}>
            {loading ? '⟳' : '↻'} Refresh
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className={`admin-alert ${actionMsg.type === 'success' ? 'success' : 'error'}`}>
          <span className="admin-alert-icon">{actionMsg.type === 'success' ? '✓' : '✕'}</span>
          <div className="admin-alert-body">{actionMsg.text}</div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="search-input" style={{ flex: '1 1 280px', maxWidth: 400 }}>
          <input
            type="text"
            placeholder="Search by UUID, queue, job class, or exception..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
          />
        </div>

        <select
          className="table-filter"
          value={queueFilter}
          onChange={(e) => { setQueueFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Queues</option>
          {uniqueQueues.map((q) => (<option key={q} value={q}>{q}</option>))}
        </select>

        <span className="table-count">{pagination.total} failed job{pagination.total !== 1 ? 's' : ''}</span>

        <div className="flex items-center gap-2" style={{ marginLeft: 'auto' }}>
          <button
            className="btn-ghost btn-sm"
            onClick={handleRetryAll}
            disabled={actionLoading === 'retry-all' || jobs.length === 0}
          >
            {actionLoading === 'retry-all' ? '⟳ Retrying…' : '↻ Retry All'}
          </button>
          <button
            className="btn-ghost btn-sm"
            onClick={handleFlush}
            disabled={actionLoading === 'flush' || jobs.length === 0}
            style={confirmFlush ? { color: 'var(--danger)', borderColor: 'rgba(192,57,43,0.3)', background: 'var(--danger-bg)' } : {}}
          >
            {actionLoading === 'flush' ? '🗑️ Flushing…' : confirmFlush ? '🗑️ Click again to confirm' : '🗑️ Flush All'}
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-alert error">
          <span className="admin-alert-icon">⚠️</span>
          <div className="admin-alert-body">
            <div className="admin-alert-title">Error</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      <div className="table-card">
        <div className="table-head">
          <h3>Failed Jobs</h3>
          {pagination.total > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
              Showing {jobs.length} of {pagination.total}
            </span>
          )}
        </div>

        {loading && jobs.length === 0 ? (
          <div className="loading-page" style={{ padding: '3rem' }}><div className="spinner" /></div>
        ) : jobs.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem' }}>
            <div className="empty-state-icon">✅</div>
            <h3>No failed jobs</h3>
            <p>
              {search || queueFilter
                ? 'Try adjusting your filters or search terms'
                : 'All queue jobs are running smoothly.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>ID</th>
                  <th style={{ width: 100 }}>Connection</th>
                  <th style={{ width: 100 }}>Queue</th>
                  <th>Job Class</th>
                  <th>Exception</th>
                  <th style={{ width: 100 }}>Failed</th>
                  <th style={{ width: 80, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.uuid || job.id}>
                    <td><code style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>#{job.id}</code></td>
                    <td>
                      <span className="status-badge status-active" style={{ fontSize: '0.65rem' }}>
                        {job.connection || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="status-badge status-info" style={{ fontSize: '0.65rem' }}>
                        {job.queue || 'default'}
                      </span>
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <div>
                        <code
                          className="job-class"
                          onClick={() => setExpandedPayload(expandedPayload === job.uuid ? null : job.uuid)}
                        >
                          {getJobClass(job.payload).length > 50
                            ? getJobClass(job.payload).slice(0, 50) + '…'
                            : getJobClass(job.payload)}
                        </code>
                        <button
                          className="btn-ghost btn-xs"
                          onClick={() => setExpandedPayload(expandedPayload === job.uuid ? null : job.uuid)}
                        >
                          {expandedPayload === job.uuid ? '▲' : '▼'} Payload
                        </button>
                        {expandedPayload === job.uuid && (
                          <div className="payload-block">
                            <pre>{JSON.stringify(tryParsePayload(job.payload), null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ maxWidth: 280 }}>
                      <div>
                        <code
                          className={`exception-trace${expandedException === job.uuid ? ' expanded' : ''}`}
                          onClick={() => setExpandedException(expandedException === job.uuid ? null : job.uuid)}
                        >
                          {expandedException === job.uuid ? job.exception : getExceptionSummary(job.exception)}
                        </code>
                        {job.exception?.length > 200 && (
                          <button
                            className="btn-ghost btn-xs"
                            onClick={() => setExpandedException(expandedException === job.uuid ? null : job.uuid)}
                          >
                            {expandedException === job.uuid ? '▲' : '▼'} {expandedException === job.uuid ? 'Collapse' : 'Full trace'}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '0.78rem', color: 'var(--muted)' }}>
                      {formatDate(job.failed_at)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-edit"
                        onClick={() => handleRetry(job.uuid)}
                        disabled={actionLoading === `retry-${job.uuid}`}
                      >
                        {actionLoading === `retry-${job.uuid}` ? '⟳' : '↻'} Retry
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.total_pages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>←</button>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)', padding: '0 8px' }}>
              {pagination.page} / {pagination.total_pages}
            </span>
            <button className="page-btn" disabled={page >= pagination.total_pages} onClick={() => setPage((p) => p + 1)}>→</button>
          </div>
        )}
      </div>

      <style>{`
        .job-class {
          font-size: 0.72rem;
          font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
          background: var(--surface-container);
          padding: 1px 6px;
          border-radius: 4px;
          cursor: pointer;
          display: block;
          margin-bottom: 4px;
        }
        .job-class:hover { background: var(--off-white); }
        .payload-block {
          margin-top: 6px;
          padding: 8px 10px;
          background: #1a1a2e;
          border-radius: 8px;
          max-height: 260px;
          overflow-y: auto;
        }
        .payload-block pre {
          font-size: 0.62rem;
          color: #e2e8f0;
          margin: 0;
          white-space: pre-wrap;
          word-break: break-all;
          line-height: 1.5;
        }
        .exception-trace {
          font-size: 0.68rem;
          font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
          background: #fef2f2;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid #fecaca;
          display: block;
          max-height: 3.2em;
          overflow: hidden;
          cursor: pointer;
          line-height: 1.5;
          word-break: break-word;
          color: #dc2626;
        }
        .exception-trace:hover { background: #fee2e2; }
        .exception-trace.expanded { max-height: none; }
        .btn-xs {
          padding: 1px 6px;
          font-size: 0.62rem;
        }
      `}</style>
    </div>
  );
}

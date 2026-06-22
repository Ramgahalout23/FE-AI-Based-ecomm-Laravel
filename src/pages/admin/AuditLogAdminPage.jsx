import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/admin';

const ACTION_ICONS = {
  'Order Confirmed': '🛒',
  'Order Placed': '📦',
  'Staff Created': '👤',
  'Staff Updated': '🛡️',
  'Product Created': '🏷️',
  'Product Updated': '📝',
  'Product Deleted': '🗑️',
  'User Blocked': '🚫',
  'User Unblocked': '✅',
  'Setting Updated': '⚙️',
  'Backup Created': '💾',
  'System Notification': '🔔',
};

function getActionIcon(action) {
  for (const [key, icon] of Object.entries(ACTION_ICONS)) {
    if (action?.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '📋';
}

function getActionColor(action) {
  if (!action) return 'var(--muted)';
  const lower = action.toLowerCase();
  if (lower.includes('delete') || lower.includes('block') || lower.includes('revoke')) return '#ef4444';
  if (lower.includes('create') || lower.includes('confirmed') || lower.includes('placed')) return '#22c55e';
  if (lower.includes('update') || lower.includes('edit') || lower.includes('change')) return '#3b82f6';
  return 'var(--muted)';
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

export default function AuditLogAdminPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [autoRefresh, setAutoRefresh] = useState(false);
  const limit = 50;

  const fetchLogs = useCallback(async (p = page) => {
    try {
      setLoading(true);
      const params = { page: p, limit };
      if (actionFilter) params.action = actionFilter;
      if (search) params.search = search;

      const r = await adminAPI.getAuditLogs(params);
      const payload = r.data?.data || r.data || [];
      const pg = r.data?.pagination || {};

      setLogs(Array.isArray(payload) ? payload : []);
      setPagination({
        page: pg.page || p,
        limit: pg.limit || limit,
        total: pg.total || payload.length || 0,
        pages: pg.pages || pg.totalPages || 1,
      });
      setError(null);
    } catch (e) {
      setError('Failed to load audit logs');
      console.warn('Failed to load audit logs:', e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, search]);

  useEffect(() => {
    fetchLogs(page);
  }, [page, actionFilter]);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchLogs(page), 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, page, fetchLogs]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs(1);
  };

  const uniqueActions = [...new Set(logs.map((l) => l.action).filter(Boolean))];

  // Filter by search term on the client side for instant results
  const filtered = search
    ? logs.filter(
        (l) =>
          l.action?.toLowerCase().includes(search.toLowerCase()) ||
          l.description?.toLowerCase().includes(search.toLowerCase()) ||
          l.adminId?.toLowerCase().includes(search.toLowerCase()),
      )
    : logs;

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div>
          <h2>
            <span style={{ marginRight: 8 }}>📋</span>Audit Log
          </h2>
          <p>Track all administrative actions and system events</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ accentColor: 'var(--gold)' }}
            />
            Auto-refresh
          </label>
          <button
            className="btn-ghost btn-sm"
            onClick={() => fetchLogs(page)}
            disabled={loading}
          >
            {loading ? '⟳' : '↻'} Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="search-input" style={{ flex: '1 1 280px', maxWidth: 400 }}>
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search actions, descriptions, or IDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'white',
            fontSize: '0.82rem',
            minWidth: 180,
          }}
        >
          <option value="">All Actions</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>
              {getActionIcon(a)} {a}
            </option>
          ))}
        </select>

        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
          {pagination.total} event{pagination.total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="admin-alert danger mb-4">
          <span className="admin-alert-icon">⚠️</span>
          <div className="admin-alert-body">
            <div className="admin-alert-title">Error</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="table-card">
        <div className="table-head">
          <h3>Activity Timeline</h3>
        </div>

        {loading && logs.length === 0 ? (
          <div className="loading-page" style={{ padding: '3rem' }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem' }}>
            <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>📋</div>
            <h3>No activity logs found</h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              {search || actionFilter
                ? 'Try adjusting your filters or search terms'
                : 'Administrative actions will appear here as they happen'}
            </p>
          </div>
        ) : (
          <div className="audit-timeline">
            {filtered.map((log) => (
              <div key={log.id} className="audit-entry">
                <div className="audit-marker" style={{ color: getActionColor(log.action) }}>
                  {getActionIcon(log.action)}
                </div>
                <div className="audit-content">
                  <div className="audit-header">
                    <span className="audit-action" style={{ color: getActionColor(log.action) }}>
                      {log.action || 'Unknown Action'}
                    </span>
                    <span className="audit-time">{formatDate(log.createdAt)}</span>
                  </div>
                  <p className="audit-description">{log.description || '—'}</p>
                  <div className="audit-meta">
                    {log.targetType && log.targetId && (
                      <span className="audit-tag">
                        {log.targetType}: {log.targetId.slice(0, 8)}...
                      </span>
                    )}
                    {log.adminId && (
                      <span className="audit-tag" title={log.adminId}>
                        By: {log.adminId.slice(0, 8)}...
                      </span>
                    )}
                    {log.status && log.status !== 'SUCCESS' && (
                      <span
                        className="audit-tag"
                        style={{
                          background: log.status === 'FAILED' ? '#fee2e2' : '#fef3c7',
                          color: log.status === 'FAILED' ? '#dc2626' : '#d97706',
                        }}
                      >
                        {log.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="pagination-bar">
            <button
              className="btn-ghost btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ← Previous
            </button>
            <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              className="btn-ghost btn-sm"
              disabled={page >= pagination.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      <style>{`
        .audit-timeline {
          padding: 0;
        }
        .audit-entry {
          display: flex;
          gap: 14px;
          padding: 14px 20px;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
        }
        .audit-entry:last-child {
          border-bottom: none;
        }
        .audit-entry:hover {
          background: var(--off-white);
        }
        .audit-marker {
          font-size: 1.2rem;
          flex-shrink: 0;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--off-white);
          margin-top: 2px;
        }
        .audit-content {
          flex: 1;
          min-width: 0;
        }
        .audit-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 2px;
        }
        .audit-action {
          font-weight: 600;
          font-size: 0.85rem;
        }
        .audit-time {
          font-size: 0.72rem;
          color: var(--muted);
          white-space: nowrap;
        }
        .audit-description {
          font-size: 0.8rem;
          color: var(--muted);
          margin: 0;
          line-height: 1.4;
        }
        .audit-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 6px;
        }
        .audit-tag {
          font-size: 0.68rem;
          padding: 2px 8px;
          border-radius: 4px;
          background: var(--off-white);
          color: var(--muted);
          font-family: monospace;
          white-space: nowrap;
        }
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 14px 20px;
          border-top: 1px solid var(--border);
        }
      `}</style>
    </div>
  );
}

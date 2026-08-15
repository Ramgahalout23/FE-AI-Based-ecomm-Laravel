import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI } from '../../api/admin';
import { useSocketEvent } from '../../hooks/useSocket';

const LEVEL_STYLES = {
  EMERGENCY: { color: '#fff', bg: '#7c3aed', label: 'EMERGENCY' },
  ALERT: { color: '#fff', bg: '#dc2626', label: 'ALERT' },
  CRITICAL: { color: '#fff', bg: '#b91c1c', label: 'CRITICAL' },
  ERROR: { color: '#fff', bg: '#ef4444', label: 'ERROR' },
  WARNING: { color: '#1a1a1a', bg: '#f59e0b', label: 'WARNING' },
  NOTICE: { color: '#1a1a1a', bg: '#3b82f6', label: 'NOTICE' },
  INFO: { color: '#fff', bg: '#6366f1', label: 'INFO' },
  DEBUG: { color: '#1a1a1a', bg: '#9ca3af', label: 'DEBUG' },
};

const LEVEL_ORDER = ['EMERGENCY', 'ALERT', 'CRITICAL', 'ERROR', 'WARNING', 'NOTICE', 'INFO', 'DEBUG'];

function getLevelStyle(level) {
  return LEVEL_STYLES[level] || { color: 'var(--muted)', bg: 'var(--surface-grey)', label: level || 'UNKNOWN' };
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

/**
 * A single log entry row shared between Browse and Stream views.
 */
function LogEntryRow({ entry, index, expandedLines, onToggleExpand, onCopy, copiedId, page, perPage }) {
  const style = getLevelStyle(entry.level);
  const isExpanded = expandedLines?.has(index);
  const raw = entry.raw || '';
  const preview = raw.length > 200 ? raw.slice(0, 200) + '…' : raw;
  const hasStackTrace = entry.has_stack_trace || raw.includes('Stack trace') || raw.includes('#');
  const lineNum = page && perPage ? index + 1 + ((page - 1) * perPage) : index + 1;

  return (
    <div
      className={`log-entry ${isExpanded ? 'log-entry-expanded' : ''}`}
      style={{ borderLeft: `3px solid ${style.bg}` }}
    >
      <div className="log-entry-header">
        <div className="flex items-center gap-2">
          <span className="log-level-badge" style={{ background: style.bg, color: style.color }}>
            {style.label}
          </span>
          {entry.timestamp && (
            <span className="log-timestamp" title={entry.timestamp}>{entry.timestamp}</span>
          )}
          {!entry.timestamp && (
            <span className="log-line-number">Line {lineNum}</span>
          )}
          {entry.file && (
            <span className="log-tag" style={{ fontSize: '0.6rem' }}>{entry.file}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="log-action-btn"
            onClick={() => onCopy(raw, index)}
            title="Copy log line"
            style={{ color: copiedId === index ? '#22c55e' : 'var(--muted)' }}
          >
            {copiedId === index ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            )}
          </button>
          {(hasStackTrace || raw.length > 200) && (
            <button
              className="log-action-btn"
              onClick={() => onToggleExpand(index)}
              title={isExpanded ? 'Collapse' : 'Expand full entry'}
              style={{ color: 'var(--muted)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div className="log-entry-body">
        <pre className={`log-raw ${isExpanded ? 'log-raw-expanded' : ''}`}>
          {isExpanded ? raw : preview}
        </pre>
      </div>
      {isExpanded && (
        <div className="log-entry-meta">
          <span className="log-tag">{Math.ceil(raw.length / 1024 * 10) / 10} KB</span>
          <span className="log-tag">Line {lineNum}</span>
        </div>
      )}
    </div>
  );
}

export default function LogViewerAdminPage() {
  const [mode, setMode] = useState('browse'); // 'browse' | 'stream'

  // ── Browse State ──
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, per_page: 100, total: 0, total_pages: 1 });
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState('laravel.log');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [expandedLines, setExpandedLines] = useState(new Set());
  const [copiedId, setCopiedId] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // ── Archived Logs State ──
  const [archivedFiles, setArchivedFiles] = useState([]);
  const [archivedTotalSize, setArchivedTotalSize] = useState('');
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedViewing, setArchivedViewing] = useState(null); // { filename, entries, totalLines }
  const [archivedViewLoading, setArchivedViewLoading] = useState(false);

  // ── Live Stream State ──
  const [streamActive, setStreamActive] = useState(false);
  const [streamEntries, setStreamEntries] = useState([]);
  const [streamConnected, setStreamConnected] = useState(false);
  const [streamLevelFilter, setStreamLevelFilter] = useState('ERROR');
  const [streamPaused, setStreamPaused] = useState(false);
  const [streamError, setStreamError] = useState(null);
  const streamPollRef = useRef(null);
  const streamOffsetRef = useRef(null);
  const streamContainerRef = useRef(null);
  const streamFileRef = useRef('laravel.log');

  const fetchLogs = useCallback(async (p = page, file = selectedFile) => {
    try {
      setLoading(true);
      setError(null);
      const params = { page: p, per_page: 100, file };
      if (levelFilter) params.level = levelFilter;
      if (search) params.search = search;

      const r = await adminAPI.getLogs(params);
      const payload = r.data?.data || {};

      setLines(Array.isArray(payload.lines) ? payload.lines : []);
      setPagination({
        page: payload.page || p,
        per_page: payload.per_page || 100,
        total: payload.total || 0,
        total_pages: payload.total_pages || 1,
      });
      if (Array.isArray(payload.files)) {
        setFiles(payload.files);
      }
    } catch {
      setError('Failed to load server logs');
      setLines([]);
    } finally {
      setLoading(false);
    }
  }, [page, levelFilter, search, selectedFile]);

  useEffect(() => {
    if (mode === 'browse') {
      fetchLogs(page, selectedFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchLogs is recreated each render; the listed state is the intended trigger
  }, [page, levelFilter, selectedFile, mode]);

  // Auto-refresh every 10 seconds (browse mode only)
  useEffect(() => {
    if (!autoRefresh || mode !== 'browse') return;
    const interval = setInterval(() => fetchLogs(page, selectedFile), 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, page, selectedFile, fetchLogs, mode]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs(1, selectedFile);
  };

  const toggleExpand = (index) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const copyToClipboard = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const levelCounts = {};
  lines.forEach((l) => {
    const key = l.level || 'UNKNOWN';
    levelCounts[key] = (levelCounts[key] || 0) + 1;
  });

  // ── Live Stream: Handle incoming socket events ──
  const handleStreamEntry = useCallback((data) => {
    if (!streamActive || streamPaused) return;

    // Client-side level filtering
    if (streamLevelFilter && data.level !== streamLevelFilter) return;

    setStreamEntries((prev) => {
      const next = [...prev, { ...data, _received_at: Date.now() }];
      // Keep max 500 entries to prevent memory issues
      return next.length > 500 ? next.slice(-500) : next;
    });

    setStreamError(null);
  }, [streamActive, streamPaused, streamLevelFilter]);

  useSocketEvent('log:newEntry', handleStreamEntry, [handleStreamEntry]);

  // ── Live Stream: Polling fallback ──
  const startStreamPolling = useCallback(() => {
    // Initialize offset to current end of file
    streamOffsetRef.current = null;

    const poll = async () => {
      if (!streamActive) return;
      try {
        const r = await adminAPI.tailLog({
          file: streamFileRef.current,
          offset: streamOffsetRef.current ?? '',
        });
        const data = r.data?.data;
        if (data?.entries?.length > 0) {
          data.entries.forEach((entry) => {
            if (streamPaused) return;
            if (streamLevelFilter && entry.level !== streamLevelFilter) return;
            setStreamEntries((prev) => {
              const next = [...prev, { ...entry, _received_at: Date.now() }];
              return next.length > 500 ? next.slice(-500) : next;
            });
          });
          setStreamError(null);
        }
        if (data?.new_offset != null) {
          streamOffsetRef.current = data.new_offset;
        }
        setStreamConnected(true);
      } catch {
        setStreamConnected(false);
        setStreamError('Polling failed — server may be unreachable');
      }
    };

    // Poll immediately, then every 2 seconds
    poll();
    streamPollRef.current = setInterval(poll, 2000);
  }, [streamActive, streamPaused, streamLevelFilter]);

  const stopStreamPolling = useCallback(() => {
    if (streamPollRef.current) {
      clearInterval(streamPollRef.current);
      streamPollRef.current = null;
    }
    setStreamConnected(false);
  }, []);

  // ── Live Stream: Start / Stop ──
  const startStream = useCallback(() => {
    setStreamActive(true);
    setStreamPaused(false);

    // Reset connection state — both socket and polling will fire
    setStreamConnected(true);
    setStreamError(null);

    // Start polling (socket events also arrive via useSocketEvent)
    startStreamPolling();
  }, [startStreamPolling]);

  const stopStream = useCallback(() => {
    setStreamActive(false);
    setStreamPaused(false);
    stopStreamPolling();
    setStreamConnected(false);
  }, [stopStreamPolling]);

  // ── Archived Logs ──
  const fetchArchivedLogs = useCallback(async () => {
    try {
      setArchivedLoading(true);
      const res = await adminAPI.getArchivedLogs();
      const data = res.data?.data;
      setArchivedFiles(Array.isArray(data?.files) ? data.files : []);
      setArchivedTotalSize(data?.total_size_formatted || '');
    } catch {
      setArchivedFiles([]);
    } finally {
      setArchivedLoading(false);
    }
  }, []);

  const handleViewArchived = async (filename) => {
    try {
      // Show modal immediately with a placeholder so the user sees the loading spinner
      setArchivedViewLoading(true);
      setArchivedViewing({ filename, entries: [], totalLines: 0, size: '' });
      const res = await adminAPI.viewArchivedLog(filename);
      const data = res.data?.data;
      setArchivedViewing({
        filename: data?.filename || filename,
        entries: Array.isArray(data?.entries) ? data.entries : [],
        totalLines: data?.total_lines || 0,
        size: data?.size_formatted || '',
      });
    } catch (e) {
      const msg = e?.response?.data?.message || 'Failed to load archived log';
      setActionMessage({ type: 'error', text: msg });
      setTimeout(() => setActionMessage(null), 4000);
      setArchivedViewing(null);
    } finally {
      setArchivedViewLoading(false);
    }
  };

  const handleDownloadArchived = async (filename) => {
    try {
      const res = await adminAPI.downloadArchivedLog(filename);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setActionMessage({ type: 'success', text: `${filename} downloaded` });
      setTimeout(() => setActionMessage(null), 3000);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Download failed';
      setActionMessage({ type: 'error', text: msg });
      setTimeout(() => setActionMessage(null), 4000);
    }
  };

  const handleDeleteArchived = async (filename) => {
    try {
      setActionLoading(true);
      const res = await adminAPI.deleteArchivedLog(filename);
      const data = res.data?.data;
      setActionMessage({ type: 'success', text: res.data?.message || 'Archived log deleted' });
      setTimeout(() => setActionMessage(null), 3000);
      if (Array.isArray(data?.files)) {
        setArchivedFiles(data.files);
        setArchivedTotalSize(data?.total_size_formatted || '');
      } else {
        fetchArchivedLogs();
      }
      setActionModal(null);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Delete failed';
      setActionMessage({ type: 'error', text: msg });
      setTimeout(() => setActionMessage(null), 4000);
      setActionModal(null);
    } finally {
      setActionLoading(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreamPolling();
    };
  }, [stopStreamPolling]);

  // Auto-scroll when new entries arrive
  useEffect(() => {
    if (streamContainerRef.current && streamActive && !streamPaused) {
      const el = streamContainerRef.current;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [streamEntries, streamActive, streamPaused]);

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div>
          <h2>
            <span style={{ marginRight: 8 }}>📄</span>Server Logs
          </h2>
          <p>{mode === 'browse' ? 'Browse Laravel error and server logs' : 'Watch logs arrive in real-time'}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode toggle */}
          <div className="flex items-center" style={{
            background: '#f3f4f6',
            borderRadius: 8,
            padding: 2,
            fontSize: '0.78rem',
          }}>
            <button
              className={mode === 'browse' ? 'btn-active-tab' : 'btn-inactive-tab'}
              onClick={() => { setMode('browse'); stopStream(); }}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                background: mode === 'browse' ? '#fff' : 'transparent',
                color: mode === 'browse' ? '#111' : '#6b7280',
                fontWeight: mode === 'browse' ? 600 : 400,
                cursor: 'pointer',
                boxShadow: mode === 'browse' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              Browse
            </button>
            <button
              className={mode === 'stream' ? 'btn-active-tab' : 'btn-inactive-tab'}
              onClick={() => { setMode('stream'); setExpandedLines(new Set()); }}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                background: mode === 'stream' ? '#fff' : 'transparent',
                color: mode === 'stream' ? '#111' : '#6b7280',
                fontWeight: mode === 'stream' ? 600 : 400,
                cursor: 'pointer',
                boxShadow: mode === 'stream' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <span style={{ marginRight: 4 }}>⚡</span>Live Stream
            </button>
            <button
              className={mode === 'archived' ? 'btn-active-tab' : 'btn-inactive-tab'}
              onClick={() => { setMode('archived'); setExpandedLines(new Set()); fetchArchivedLogs(); }}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                background: mode === 'archived' ? '#fff' : 'transparent',
                color: mode === 'archived' ? '#111' : '#6b7280',
                fontWeight: mode === 'archived' ? 600 : 400,
                cursor: 'pointer',
                boxShadow: mode === 'archived' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <span style={{ marginRight: 4 }}>📦</span>Archived
            </button>
          </div>

          {mode === 'browse' && (
            <>
              <select
                value={selectedFile}
                onChange={(e) => { setSelectedFile(e.target.value); setPage(1); setExpandedLines(new Set()); }}
                style={{
                  padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)',
                  background: 'white', fontSize: '0.78rem', maxWidth: 220,
                }}
                title="Select log file"
              >
                {files.map((f) => (
                  <option key={f.name} value={f.name}>{f.name} ({formatBytes(f.size)})</option>
                ))}
                {files.length === 0 && <option value="laravel.log">laravel.log</option>}
              </select>
              <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)', cursor: 'pointer' }}>
                <input type="checkbox" checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  style={{ accentColor: 'var(--primary)' }} />
                Auto-refresh
              </label>
              <button className="btn-ghost btn-sm" onClick={() => fetchLogs(page, selectedFile)} disabled={loading}>
                {loading ? '⟳' : '↻'} Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {mode === 'browse' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="search-input" style={{ flex: '1 1 280px', maxWidth: 400 }}>
              <span className="search-icon">🔍</span>
              <input
                type="text" placeholder="Search log entries..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <select
              value={levelFilter}
              onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'white', fontSize: '0.82rem', minWidth: 150,
              }}
            >
              <option value="">All Levels</option>
              {LEVEL_ORDER.map((lvl) => (
                <option key={lvl} value={lvl}>{getLevelStyle(lvl).label}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {pagination.total} line{pagination.total !== 1 ? 's' : ''}
            </span>
            {Object.entries(levelCounts).length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {Object.entries(levelCounts).sort(([a], [b]) => {
                  const ia = LEVEL_ORDER.indexOf(a);
                  const ib = LEVEL_ORDER.indexOf(b);
                  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
                }).map(([lvl, count]) => {
                  const s = getLevelStyle(lvl);
                  return (
                    <span key={lvl} style={{
                      fontSize: '0.62rem', padding: '2px 8px', borderRadius: 999,
                      background: s.bg, color: s.color, fontWeight: 600, letterSpacing: '0.3px',
                    }}>
                      {count} {s.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Log file management card */}
          {files.length > 0 && (
            <div className="table-card mb-4">
              <div className="table-head">
                <h3 style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  <span style={{ marginRight: 6 }}>🗂️</span>Log Files
                </h3>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                  {files.length} file{files.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table" style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th style={{ width: 80 }}>Size</th>
                      <th style={{ width: 140 }}>Modified</th>
                      <th style={{ width: 200 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f) => (
                      <tr key={f.name}>
                        <td>
                          <span style={{
                            fontWeight: f.name === selectedFile ? 600 : 400, cursor: 'pointer',
                            color: f.name === selectedFile ? 'var(--primary)' : 'inherit',
                          }} onClick={() => { setSelectedFile(f.name); setPage(1); setExpandedLines(new Set()); }}>
                            {f.name}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--muted)' }}>
                          {formatBytes(f.size)}
                        </td>
                        <td style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{f.modified_at || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-ghost btn-xs"
                              onClick={() => setActionModal({ file: f.name, action: 'archive' })}
                              style={{ fontSize: '0.68rem', padding: '3px 8px' }}>📦 Archive</button>
                            <button className="btn-ghost btn-xs"
                              onClick={() => setActionModal({ file: f.name, action: 'truncate' })}
                              style={{ fontSize: '0.68rem', padding: '3px 8px', color: '#d97706' }}>🗑️ Clear</button>
                            <button className="btn-ghost btn-xs"
                              onClick={() => setActionModal({ file: f.name, action: 'delete' })}
                              style={{ fontSize: '0.68rem', padding: '3px 8px', color: '#dc2626' }}>🚫 Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action feedback toast */}
          {actionMessage && (
            <div style={{
              padding: '10px 16px', borderRadius: 8, marginBottom: 16,
              background: actionMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
              color: actionMessage.type === 'success' ? '#166534' : '#991b1b',
              border: `1px solid ${actionMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
              fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>{actionMessage.type === 'success' ? '✓' : '✕'}</span>
              <span>{actionMessage.text}</span>
            </div>
          )}

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

          {/* Log Entries */}
          <div className="table-card">
            <div className="table-head">
              <h3>Log Entries</h3>
              {pagination.total > 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 'auto' }}>
                  Showing {(pagination.page - 1) * pagination.per_page + 1}–
                  {Math.min(pagination.page * pagination.per_page, pagination.total)} of {pagination.total}
                </span>
              )}
            </div>
            {loading && lines.length === 0 ? (
              <div className="loading-page" style={{ padding: '3rem' }}><div className="spinner" /></div>
            ) : error && lines.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem' }}>
                <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>📄</div>
                <h3>Unable to load logs</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  {error}. The log file may not exist or the server may be unreachable.
                </p>
              </div>
            ) : lines.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem' }}>
                <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>✅</div>
                <h3>No log entries found</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  {search || levelFilter ? 'Try adjusting your filters or search terms' : 'No errors or server events have been logged yet'}
                </p>
              </div>
            ) : (
              <div className="log-entries">
                {lines.map((entry, index) => (
                  <LogEntryRow key={`${index}-${entry.timestamp || ''}`}
                    entry={entry} index={index}
                    expandedLines={expandedLines}
                    onToggleExpand={toggleExpand}
                    onCopy={copyToClipboard}
                    copiedId={copiedId}
                    page={pagination.page}
                    perPage={pagination.per_page}
                  />
                ))}
              </div>
            )}
            {pagination.total_pages > 1 && (
              <div className="pagination-bar">
                <button className="btn-ghost btn-sm" disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}>← Previous</button>
                <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <button className="btn-ghost btn-sm" disabled={page >= pagination.total_pages}
                  onClick={() => setPage((p) => p + 1)}>Next →</button>
              </div>
            )}
          </div>
        </>
      )}

      {mode === 'stream' && (
        <>
          {/* Live Stream Controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Stream toggle */}
            <button
              className={streamActive ? 'btn-danger' : 'btn-primary'}
              onClick={streamActive ? stopStream : startStream}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: streamActive ? '#dc2626' : 'var(--primary)',
                color: '#fff', fontSize: '0.82rem', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {streamActive ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                  Stop Stream
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  Start Stream
                </>
              )}
            </button>

            {/* Level filter during stream */}
            <select
              value={streamLevelFilter}
              onChange={(e) => setStreamLevelFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'white', fontSize: '0.82rem', minWidth: 120,
              }}
            >
              {LEVEL_ORDER.map((lvl) => (
                <option key={lvl} value={lvl}>{getLevelStyle(lvl).label}</option>
              ))}
            </select>

            {/* Connection status */}
            <div className="flex items-center gap-2" style={{ fontSize: '0.75rem' }}>
              <span style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                background: streamActive ? (streamConnected ? '#22c55e' : '#ef4444') : '#9ca3af',
                transition: 'background 0.3s',
              }} />
              <span style={{ color: 'var(--muted)' }}>
                {streamActive ? (streamConnected ? 'Connected' : 'Disconnected') : 'Idle'}
              </span>
            </div>

            {/* Pause / Resume */}
            {streamActive && (
              <button
                className="btn-ghost btn-sm"
                onClick={() => setStreamPaused((p) => !p)}
                style={{
                  padding: '6px 14px', fontSize: '0.78rem',
                  color: streamPaused ? '#d97706' : 'var(--muted)',
                }}
              >
                {streamPaused ? '▶ Resume' : '⏸ Pause'}
              </button>
            )}

            {/* Clear */}
            {streamEntries.length > 0 && (
              <button
                className="btn-ghost btn-sm"
                onClick={() => setStreamEntries([])}
                style={{ padding: '6px 14px', fontSize: '0.78rem', color: 'var(--muted)' }}
              >
                🗑️ Clear ({streamEntries.length})
              </button>
            )}

            {!streamActive && !streamError && (
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                Click <strong>Start Stream</strong> to watch log entries appear in real-time via WebSocket
              </span>
            )}
          </div>

          {/* Stream error */}
          {streamError && (
            <div className="admin-alert danger mb-4" style={{ fontSize: '0.82rem' }}>
              <span className="admin-alert-icon">⚠️</span>
              <div>{streamError}. Ensure the <code>logs:stream</code> artisan command is running (or polling fallback is active).</div>
            </div>
          )}

          {/* Stream live feed */}
          <div className="table-card">
            <div className="table-head">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {streamActive && (
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    background: streamConnected ? '#22c55e' : '#ef4444',
                    animation: streamConnected ? 'pulse-dot 1.5s infinite' : 'none',
                  }} />
                )}
                Live Feed
                {streamPaused && <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#d97706', marginLeft: 8 }}>(Paused)</span>}
              </h3>
              {streamActive && (
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                  {streamEntries.length} entry{streamEntries.length !== 1 ? 'ies' : 'y'} received
                  {streamPaused && streamEntries.length > 0 && (
                    <span style={{ marginLeft: 6, color: '#d97706' }}>
                      — <strong>{streamEntries.length}</strong> entries
                    </span>
                  )}
                </span>
              )}
            </div>

            {!streamActive && streamEntries.length === 0 ? (
              <div className="empty-state" style={{ padding: '3rem' }}>
                <div className="empty-state-icon" style={{ fontSize: '2.5rem' }}>⚡</div>
                <h3>Live Log Stream</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', maxWidth: 400, margin: '0 auto' }}>
                  Watch new log entries appear as they are written to the server.
                  Start the stream to begin receiving real-time log events.
                </p>
                <div style={{ marginTop: 16, fontSize: '0.78rem', color: 'var(--muted)' }}>
                  <div>💡 Requires the <code>logs:stream</code> artisan command running on the server</div>
                  <div style={{ marginTop: 4 }}>🔄 Falls back to polling every 2s if WebSocket is unavailable</div>
                </div>
              </div>
            ) : streamEntries.length === 0 && streamActive ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 12px' }} />
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  Listening for new log entries...
                </p>
              </div>
            ) : (
              <div
                ref={streamContainerRef}
                className="log-entries"
                style={{
                  maxHeight: '65vh',
                  overflowY: 'auto',
                  scrollBehavior: 'smooth',
                }}
              >
                {streamEntries.map((entry, idx) => (
                  <LogEntryRow
                    key={`stream-${idx}-${entry._received_at || idx}`}
                    entry={entry}
                    index={idx}
                    onCopy={copyToClipboard}
                    copiedId={copiedId}
                    onToggleExpand={toggleExpand}
                    expandedLines={expandedLines}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {mode === 'archived' && (
        <>
          {/* Archived controls */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2" style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              <span>📦 <strong>{archivedFiles.length}</strong> archived log{archivedFiles.length !== 1 ? 's' : ''}</span>
              {archivedTotalSize && <span>— {archivedTotalSize} total</span>}
            </div>
            <button className="btn-ghost btn-sm" onClick={fetchArchivedLogs} disabled={archivedLoading}>
              {archivedLoading ? '⟳' : '↻'} Refresh
            </button>
          </div>

          {/* Archived file view modal */}
          {archivedViewing && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 9999,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.45)',
            }} onClick={() => { setArchivedViewing(null); setExpandedLines(new Set()); }}>
              <div style={{
                background: 'white', borderRadius: 12, overflow: 'hidden',
                maxWidth: 900, width: '95%', maxHeight: '85vh',
                display: 'flex', flexDirection: 'column',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              }} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 20px', borderBottom: '1px solid var(--border)',
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>📂</span>
                      {archivedViewing.filename}
                    </h3>
                    <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                      {archivedViewing.totalLines} line{archivedViewing.totalLines !== 1 ? 's' : ''} · {archivedViewing.size}
                    </span>
                  </div>
                  <button
                    onClick={() => { setArchivedViewing(null); setExpandedLines(new Set()); }}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--muted)',
                    }}
                  >✕</button>
                </div>
                {/* Entries */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {archivedViewLoading ? (
                    <div className="loading-page" style={{ padding: '3rem' }}><div className="spinner" /></div>
                  ) : archivedViewing.entries.length === 0 ? (
                    <div className="empty-state" style={{ padding: '2rem' }}>
                      <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No log entries found in this archive.</p>
                    </div>
                  ) : (
                    <div className="log-entries">
                      {archivedViewing.entries.map((entry, index) => (
                        <LogEntryRow
                          key={`archived-${index}-${entry.timestamp || ''}`}
                          entry={entry}
                          index={index}
                          expandedLines={expandedLines}
                          onToggleExpand={toggleExpand}
                          onCopy={copyToClipboard}
                          copiedId={copiedId}
                          page={1}
                          perPage={archivedViewing.entries.length}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Archived files table */}
          <div className="table-card">
            <div className="table-head">
              <h3 style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                <span style={{ marginRight: 6 }}>📦</span>Archived Log Files
              </h3>
              {archivedFiles.length > 0 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                  Sorted by newest first
                </span>
              )}
            </div>
            {archivedLoading && archivedFiles.length === 0 ? (
              <div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div>
            ) : archivedFiles.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-state-icon" style={{ fontSize: '2rem' }}>📭</div>
                <h3>No archived logs</h3>
                <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                  Archived log files (.gz) in <code>storage/logs/archived/</code> will appear here.
                  Use the <strong>Archive</strong> action on a log file in Browse mode to create one.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="admin-table" style={{ fontSize: '0.75rem' }}>
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th style={{ width: 80 }}>Size</th>
                      <th style={{ width: 140 }}>Archived</th>
                      <th style={{ width: 200 }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archivedFiles.map((f) => (
                      <tr key={f.name}>
                        <td>
                          <span style={{
                            cursor: 'pointer', color: 'var(--primary)',
                            fontFamily: 'monospace', fontSize: '0.7rem',
                          }} onClick={() => handleViewArchived(f.name)} title="Click to view">
                            {f.name}
                          </span>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--muted)' }}>
                          {formatBytes(f.size)}
                        </td>
                        <td style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{f.modified_at || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn-ghost btn-xs"
                              onClick={() => handleViewArchived(f.name)}
                              disabled={archivedViewLoading}
                              style={{ fontSize: '0.68rem', padding: '3px 8px' }}>👁️ View</button>
                            <button className="btn-ghost btn-xs"
                              onClick={() => handleDownloadArchived(f.name)}
                              style={{ fontSize: '0.68rem', padding: '3px 8px' }}>⬇️ Download</button>
                            <button className="btn-ghost btn-xs"
                              onClick={() => setActionModal({ file: f.name, action: 'delete_archived' })}
                              style={{ fontSize: '0.68rem', padding: '3px 8px', color: '#dc2626' }}>🚫 Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Action confirmation modal */}
      {actionModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.45)',
        }} onClick={() => !actionLoading && setActionModal(null)}>
          <div style={{
            background: 'white', borderRadius: 12, padding: '24px 28px',
            maxWidth: 440, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>
                {actionModal.action === 'delete' || actionModal.action === 'delete_archived' ? '🚫' : actionModal.action === 'truncate' ? '🗑️' : '📦'}
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '1rem' }}>
                {actionModal.action === 'delete' ? 'Delete Log File' : actionModal.action === 'delete_archived' ? 'Delete Archived Log' : actionModal.action === 'truncate' ? 'Clear Log File' : 'Archive Log File'}
              </h3>
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: 0 }}>
                {actionModal.action === 'delete'
                  ? `This will permanently delete \`${actionModal.file}\`. This cannot be undone.`
                  : actionModal.action === 'delete_archived'
                  ? `This will permanently delete the archived log \`${actionModal.file}\`. This cannot be undone.`
                  : actionModal.action === 'truncate'
                  ? `This will erase all contents of \`${actionModal.file}\` but keep the file.`
                  : `Compress \`${actionModal.file}\` to a .gz archive and clear the original.`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setActionModal(null)} disabled={actionLoading}
                style={{ fontSize: '0.82rem', padding: '8px 18px' }}>Cancel</button>
              <button disabled={actionLoading} onClick={async () => {
                setActionLoading(true);
                try {
                  let res;
                  const file = actionModal.file;
                  if (actionModal.action === 'delete') res = await adminAPI.deleteLog(file);
                  else if (actionModal.action === 'truncate') res = await adminAPI.truncateLog(file);
                  else if (actionModal.action === 'archive') res = await adminAPI.archiveLog(file);
                  else if (actionModal.action === 'delete_archived') {
                    await handleDeleteArchived(file);
                    setActionLoading(false);
                    return;
                  }
                  const msg = res?.data?.message || 'Operation completed';
                  setActionMessage({ type: 'success', text: msg });
                  setTimeout(() => setActionMessage(null), 4000);
                  const newFiles = res?.data?.data?.files;
                  if (Array.isArray(newFiles)) setFiles(newFiles);
                  if (file === selectedFile) fetchLogs(page, selectedFile);
                  setActionModal(null);
                } catch (e) {
                  const errMsg = e?.response?.data?.message || e?.message || 'Operation failed';
                  setActionMessage({ type: 'error', text: errMsg });
                  setTimeout(() => setActionMessage(null), 5000);
                  setActionModal(null);
                } finally { setActionLoading(false); }
              }} style={{
                fontSize: '0.82rem', padding: '8px 18px',
                background: actionModal.action === 'delete' || actionModal.action === 'delete_archived' ? '#dc2626' : actionModal.action === 'truncate' ? '#d97706' : 'var(--primary)',
                border: 'none', color: '#fff', borderRadius: 8,
                cursor: actionLoading ? 'wait' : 'pointer', opacity: actionLoading ? 0.7 : 1,
              }}>
                {actionLoading ? 'Processing…' : actionModal.action === 'delete' || actionModal.action === 'delete_archived' ? 'Delete File' : actionModal.action === 'truncate' ? 'Clear File' : 'Archive File'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .log-entries { padding: 0; }
        .log-entry {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          transition: background 0.15s;
          font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
        }
        .log-entry:last-child { border-bottom: none; }
        .log-entry:hover { background: var(--off-white); }
        .log-entry-expanded { background: var(--surface-grey); }
        .log-entry-header {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 4px;
        }
        .log-level-badge {
          font-size: 0.58rem; font-weight: 700; padding: 1px 7px;
          border-radius: 4px; letter-spacing: 0.5px; flex-shrink: 0;
        }
        .log-timestamp {
          font-size: 0.7rem; color: var(--muted);
          font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
        }
        .log-line-number { font-size: 0.68rem; color: var(--muted-light); font-family: monospace; }
        .log-action-btn {
          width: 26px; height: 26px; display: flex; align-items: center;
          justify-content: center; border-radius: 6px; border: none;
          background: transparent; cursor: pointer; transition: all 0.15s; flex-shrink: 0;
        }
        .log-action-btn:hover { background: rgba(0, 0, 0, 0.06); }
        .log-entry-body { position: relative; }
        .log-raw {
          font-size: 0.72rem; line-height: 1.6; color: var(--text-main);
          margin: 0; white-space: pre-wrap; word-break: break-all;
          overflow: hidden; max-height: 3.2em; transition: max-height 0.25s ease;
        }
        .log-raw-expanded { max-height: 2000px; }
        .log-entry-meta {
          display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;
          padding-top: 6px; border-top: 1px solid var(--border);
        }
        .log-tag {
          font-size: 0.62rem; padding: 1px 7px; border-radius: 4px;
          background: var(--surface-container); color: var(--muted);
          font-family: 'SF Mono', 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
        }
        .pagination-bar {
          display: flex; align-items: center; justify-content: center;
          gap: 16px; padding: 14px 20px; border-top: 1px solid var(--border);
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

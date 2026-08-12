import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';

/**
 * Reusable CSV Export Modal with column selection and async job support.
 *
 * Props:
 *   isOpen       {boolean}                   - Whether the modal is visible
 *   onClose      {function}                  - Called when the modal should close
 *   columns      {Array<{key, label}>}       - Column definitions
 *   onExport     {function(selectedKeys)}    - Called with selected column keys; should return a promise or start async
 *   exporting    {boolean}                   - Whether an export is in progress
 *   exportStatus {string|null}               - 'dispatching' | 'processing' | 'completed' | 'failed' | null
 *   exportError  {string|null}               - Error message when exportStatus is 'failed'
 *   filename     {string}                    - Default filename for the export
 */
export default function ExportCSVModal({ isOpen, onClose, columns, onExport, exporting, exportStatus, exportError, filename }) {
  const [selected, setSelected] = useState([]);

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelected(columns.map(c => c.key));
    }
  }, [isOpen, columns]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // At least one column must be selected — animated inline error on submit.
  const selectionValidation = useAdminFormValidation({
    columns: (sel) => (sel && sel.length > 0 ? '' : 'Select at least one column to export'),
  });

  const handleExport = () => {
    if (!selectionValidation.validateForm(selected)) return;
    onExport(selected);
  };

  if (!isOpen) return null;

  const allSelected = selected.length === columns.length;
  const noneSelected = selected.length === 0;

  const toggleAll = () => {
    const next = allSelected ? [] : columns.map(c => c.key);
    setSelected(next);
    selectionValidation.handleChange('columns', next);
  };

  const toggle = (key) => {
    setSelected(prev => {
      const next = prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key];
      selectionValidation.handleChange('columns', next);
      return next;
    });
  };

  const showProgress = exporting || exportStatus === 'dispatching' || exportStatus === 'processing';
  const showError = exportStatus === 'failed';
  const showDone = exportStatus === 'completed';

  const progressTitle = exportStatus === 'dispatching' ? 'Dispatching export job...' :
    exportStatus === 'processing' ? 'Generating export...' :
    showProgress ? 'Exporting...' : '';

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && !showProgress && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <h3>
            {showProgress ? '⏳ Exporting...' : showDone ? 'Export Complete' : showError ? '❌ Export Failed' : `📥 Export CSV${filename ? ` — ${filename}` : ''}`}
          </h3>
          <button className="modal-close" onClick={onClose} disabled={showProgress}>✕</button>
        </div>
        <div className="modal-body">
          {showProgress && (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
            }}>
              <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--charcoal)', marginBottom: '0.35rem' }}>
                {progressTitle}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                {exportStatus === 'dispatching'
                  ? 'Starting your export...'
                  : exportStatus === 'processing'
                    ? `Please wait while we generate your ${filename || 'CSV file'}. This may take a moment for large datasets.`
                    : ''}
              </p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.75rem' }}>
                The download will start automatically once your export is ready.
              </p>
            </div>
          )}

          {showDone && (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
            }}>
              <div className="export-check-wrap">
                <div className="export-check">
                  <Check size={28} strokeWidth={3} />
                </div>
              </div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--charcoal)', marginTop: '0.75rem', marginBottom: '0.35rem' }}>
                Export Complete
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                Your file has been downloaded.
              </p>
            </div>
          )}

          {showError && (
            <div style={{
              textAlign: 'center',
              padding: '1.5rem 1rem',
            }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>❌</div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--danger)', marginBottom: '0.5rem' }}>
                Export Failed
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '0.75rem' }}>
                {exportError || 'An unexpected error occurred. Please try again.'}
              </p>
              <button
                className="btn-dark btn-sm"
                onClick={handleExport}
              >
                🔄 Retry Export
              </button>
            </div>
          )}

          {showDone && (
            <div style={{
              textAlign: 'center',
              padding: '2rem 1rem',
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: '#16a34a', marginBottom: '0.5rem' }}>
                Your export is ready!
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                {filename || 'CSV file'} has been generated successfully.
              </p>
              <button
                className="btn-dark btn-sm"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          )}

          {!showProgress && !showDone && !showError && (
            <div
              className={`form-group ${selectionValidation.errors.columns ? 'has-error' : ''}`}
              style={{ marginBottom: 0 }}
            >
              {/* Selection controls */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.75rem',
                padding: '0.5rem 0.75rem',
                background: '#f8f9fc',
                borderRadius: 8,
                border: '1px solid #e2e5ec',
                flexWrap: 'wrap',
              }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--charcoal)' }}>
                  Columns
                </span>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    type="button"
                    onClick={toggleAll}
                    style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: allSelected ? 'var(--charcoal)' : '#fff',
                      color: allSelected ? '#fff' : 'var(--charcoal)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)', marginLeft: 'auto' }}>
                  <strong style={{ color: 'var(--charcoal)' }}>{selected.length}</strong> / {columns.length} selected
                </span>
              </div>

              {/* Column list */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: '0.35rem',
                maxHeight: 320,
                overflowY: 'auto',
                paddingRight: '0.25rem',
              }}>
                {columns.map(col => (
                  <label
                    key={col.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.4rem 0.5rem',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      color: 'var(--charcoal)',
                      fontWeight: selected.includes(col.key) ? 600 : 400,
                      background: selected.includes(col.key) ? '#f0fdf4' : 'transparent',
                      border: selected.includes(col.key) ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
                      transition: 'all 0.12s',
                      userSelect: 'none',
                    }}
                    onMouseEnter={e => { if (!selected.includes(col.key)) e.currentTarget.style.background = '#f9fafb'; }}
                    onMouseLeave={e => { if (!selected.includes(col.key)) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(col.key)}
                      onChange={() => toggle(col.key)}
                      style={{ cursor: 'pointer', accentColor: '#22c55e' }}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
              {selectionValidation.errors.columns && (
                <div className="form-error" role="alert" style={{ marginTop: '0.5rem' }}>
                  {selectionValidation.errors.columns}
                </div>
              )}
            </div>
          )}
        </div>
        {!showProgress && !showDone && !showError && (
          <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
              {noneSelected ? 'Select at least one column' : `${selected.length} column${selected.length !== 1 ? 's' : ''} selected`}
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn-ghost btn-sm" onClick={onClose} disabled={exporting}>
                Cancel
              </button>
              <button
                className="btn-dark btn-sm"
                onClick={handleExport}
                disabled={exporting}
                style={{
                  opacity: exporting || noneSelected ? 0.6 : 1,
                  cursor: exporting || noneSelected ? 'not-allowed' : 'pointer',
                }}
              >
                {exporting ? (
                  <><span className="spinner" style={{ width: 12, height: 12, marginRight: 6 }} /> Exporting...</>
                ) : (
                  '📥 Download CSV'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

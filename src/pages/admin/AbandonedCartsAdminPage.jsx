import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { formatCurrency, formatDateTime, getUserFullName } from '../../utils/formatters';
import { PageSkeleton } from '../../components/admin/pageSkeletonConfig';
import Pagination from '../../components/admin/Pagination';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import { downloadBlob } from '../../utils/download';
import toast from '../../utils/toast';
import { Sparkles, RefreshCw, X } from 'lucide-react';

const ABANDONED_CART_COLUMNS = [
  { key: 'customerName', label: 'Customer' },
  { key: 'customerEmail', label: 'Email' },
  { key: 'sessionId', label: 'Session ID' },
  { key: 'itemsCount', label: 'Items' },
  { key: 'lastActiveAt', label: 'Last Active' },
  { key: 'reminderSent', label: 'Reminder Sent' },
  { key: 'createdAt', label: 'Created Date' },
];

export default function AbandonedCartsAdminPage() {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  // AI recovery suggestion
  const [aiPanelCart, setAiPanelCart] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [aiData, setAiData] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const r = await adminAPI.getAbandonedCarts({ page, limit: pageSize, search: debouncedSearch || undefined });
      const data = r.data?.data || r.data;
      const list = data?.carts || data?.items || data || [];
      setCarts(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || (data?.total !== undefined ? { page: data.page, pages: data.total_pages, total: data.total, per_page: data.limit } : {});
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / pageSize) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) { setError('Failed to load abandoned carts'); console.warn('Failed to load abandoned carts:', e); } finally { setLoading(false); }
  };

  // Reset page when search changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      load(1);
    }
  }, [debouncedSearch, pageSize]);

  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  const sendReminder = async (id) => {
    try { await adminAPI.sendCartReminder(id); toast.success('Recovery email sent'); }
    catch { toast.error('Failed to send reminder'); }
  };

  const generateAiSuggestion = async (id) => {
    setAiPanelCart(id);
    setAiLoading(true);
    setAiError(null);
    setAiData(null);
    try {
      const r = await adminAPI.aiCartSuggestion(id);
      setAiData(r.data?.data || r.data || {});
    } catch (e) {
      setAiError('Failed to generate AI suggestion');
      console.warn('AI cart suggestion failed:', e);
    } finally {
      setAiLoading(false);
    }
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast.success(`${label} copied`); }
      catch { toast.error('Copy failed — select the text manually'); }
      document.body.removeChild(ta);
    }
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div><h2>Abandoned Carts</h2><p>Track and recover incomplete checkouts</p></div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-dark btn-sm" onClick={() => setShowExportModal(true)}>📥 Export CSV</button>
          <button className="btn-dark btn-sm" onClick={() => toast.success('Bulk reminders sent')}>Send Bulk Reminders</button>
        </div>
      </div>

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">⚠️</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}
      {loading ? <PageSkeleton page="abandoned-carts" /> : (
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search by customer or email..." value={search} onChange={e => setSearch(e.target.value)} />
          <span className="table-count">{totalItems} carts</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Customer</th><th>Items</th><th>Total</th><th>Last Active</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {carts.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">🛒</div><h3>No abandoned carts</h3></div></td></tr>
            ) : carts.map(c => (
              <tr key={c.id}>
                <td>
                  <strong>{getUserFullName(c.user) || 'Guest'}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{c.user?.email || c.email || '—'}</div>
                </td>
                <td>{c.items?.length || 0} items</td>
                <td><strong>{formatCurrency(c.total || 0)}</strong></td>
                <td style={{ fontSize: '0.82rem' }}>{formatDateTime(c.updatedAt || c.lastActive)}</td>
                <td><span className={`status-badge ${c.recovered ? 'status-active' : 'status-pending'}`}>{c.recovered ? 'Recovered' : 'Pending'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn-approve" onClick={() => sendReminder(c.id)} disabled={c.recovered}>Send Reminder</button>
                    <button className="btn-approve" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={() => generateAiSuggestion(c.id)} disabled={c.recovered}>✨ AI Recover</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={pageSizeOptions}
        />
      </div>
      )}

      {/* CSV Export Modal */}
      <ExportCSVModal
        isOpen={showExportModal}
        onClose={() => { setShowExportModal(false); setExportStatus(null); setExportError(null); }}
        columns={ABANDONED_CART_COLUMNS}
        onExport={async (selectedColumns) => {
          setExporting(true);
          setExportStatus('dispatching');
          setExportError(null);
          try {
            const res = await adminAPI.dispatchExport({
              type: 'abandoned-carts',
              columns: selectedColumns,
              filters: { search: debouncedSearch || undefined },
            });
            const exportId = res.data?.data?.id || res.data?.id;
            if (!exportId) { throw new Error('No export ID returned'); }
            setExportStatus('processing');
            const poll = async () => {
              try {
                const statusRes = await adminAPI.checkExportStatus(exportId);
                const status = statusRes.data?.data?.status;
                if (status === 'completed') {
                  setExportStatus('completed');
                  const dlRes = await adminAPI.downloadExport(exportId);
                  downloadBlob(dlRes, `abandoned-carts-export-${new Date().toISOString().split('T')[0]}.csv`);
                  setTimeout(() => { setShowExportModal(false); setExportStatus(null); setExportError(null); }, 1500);
                } else if (status === 'failed') {
                  setExportStatus('failed');
                  setExportError(statusRes.data?.data?.error_message || 'Export failed');
                } else {
                  setTimeout(poll, 1500);
                }
              } catch (e) {
                if (!exportStatus || exportStatus === 'processing') {
                  setExportStatus('failed');
                  setExportError(e.response?.data?.message || 'Export failed');
                }
              }
            };
            setTimeout(poll, 1500);
          } catch (err) {
            setExportStatus('failed');
            setExportError(err.response?.data?.message || 'Failed to start export');
          } finally {
            setExporting(false);
          }
        }}
        exporting={exporting}
        exportStatus={exportStatus}
        exportError={exportError}
      />

      {/* AI Recovery Suggestion Modal */}
      {aiPanelCart && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setAiPanelCart(null)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Sparkles size={18} /> AI Recovery Suggestion</h3>
              <button className="modal-close" onClick={() => setAiPanelCart(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              {aiLoading && <div style={{ padding: '1.5rem 0', textAlign: 'center', color: 'var(--muted)' }}><RefreshCw size={18} className="spin" style={{ marginRight: 6 }} /> Generating personalized recovery copy…</div>}
              {aiError && <div className="admin-alert danger mb-3"><div className="admin-alert-body"><div>{aiError}</div></div></div>}
              {!aiLoading && !aiError && aiData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {aiData._mock && (
                    <div style={{ fontSize: '0.75rem', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '0.4rem 0.7rem' }}>
                      ✨ Sample output — no AI API key configured. Add one in Settings → AI Provider for real generations.
                    </div>
                  )}

                  {/* Subject line */}
                  <div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.35rem' }}>Personalized Subject</div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ flex: 1, padding: '0.6rem 0.8rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', fontSize: '0.85rem' }}>{aiData.subject}</div>
                      <button className="btn-dark btn-sm" onClick={() => copyText(aiData.subject, 'Subject')}>Copy</button>
                    </div>
                  </div>

                  {/* Incentive */}
                  {aiData.incentive && (
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.35rem' }}>Suggested Incentive</div>
                      <div style={{ padding: '0.7rem 0.9rem', borderRadius: 10, background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)', border: '1px solid #e0e7ff' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{aiData.incentive.label}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.2rem' }}>
                          {aiData.incentive.deadlineHours ? `Valid for ${aiData.incentive.deadlineHours} hours` : ''}
                          {aiData.incentive.minPurchase > 0 ? ` · min order ${formatCurrency(aiData.incentive.minPurchase)}` : ''}
                        </div>
                        <div style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>{aiData.incentive.reason}</div>
                      </div>
                    </div>
                  )}

                  {/* Message */}
                  {aiData.message && (
                    <div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', marginBottom: '0.35rem' }}>Draft Message</div>
                      <pre style={{ whiteSpace: 'pre-wrap', margin: 0, padding: '0.7rem 0.9rem', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg)', fontSize: '0.82rem', lineHeight: 1.5, fontFamily: 'inherit' }}>{aiData.message}</pre>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button className="btn-dark btn-sm" onClick={() => copyText(aiData.message || '', 'Message')}>Copy Message</button>
                    <button className="btn-dark btn-sm" onClick={() => sendReminder(aiPanelCart)}>Send Reminder</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

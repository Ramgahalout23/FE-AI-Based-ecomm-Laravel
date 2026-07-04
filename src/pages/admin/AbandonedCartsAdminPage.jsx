import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { PageSkeleton } from '../../components/admin/pageSkeletonConfig';
import Pagination from '../../components/admin/Pagination';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import { downloadBlob } from '../../utils/download';
import toast from '../../utils/toast';

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
                  <strong>{c.user?.name || 'Guest'}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{c.user?.email || c.email || '—'}</div>
                </td>
                <td>{c.items?.length || 0} items</td>
                <td><strong>{formatCurrency(c.total || 0)}</strong></td>
                <td style={{ fontSize: '0.82rem' }}>{formatDateTime(c.updatedAt || c.lastActive)}</td>
                <td><span className={`status-badge ${c.recovered ? 'status-active' : 'status-pending'}`}>{c.recovered ? 'Recovered' : 'Pending'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn-approve" onClick={() => sendReminder(c.id)} disabled={c.recovered}>Send Reminder</button>
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
    </div>
  );
}

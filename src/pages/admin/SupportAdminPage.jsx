import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { formatDate } from '../../utils/formatters';
import Pagination from '../../components/admin/Pagination';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import { downloadBlob } from '../../utils/download';
import toast from '../../utils/toast';

export default function SupportAdminPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  // CSV Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  const TICKET_COLUMNS = [
    { key: 'ticketNumber', label: 'Ticket #' },
    { key: 'customerName', label: 'Customer' },
    { key: 'customerEmail', label: 'Email' },
    { key: 'subject', label: 'Subject' },
    { key: 'description', label: 'Description' },
    { key: 'category', label: 'Category' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Created Date' },
  ];

  const handleExportCSV = async (selectedColumns) => {
    setExporting(true); setExportStatus('dispatching'); setExportError(null);
    try {
      const filters = { search: debouncedSearch || undefined, status: statusFilter !== 'ALL' ? statusFilter : undefined };
      Object.keys(filters).forEach(k => { if (filters[k] === undefined) delete filters[k]; });
      const dispatchRes = await adminAPI.dispatchExport({ type: 'tickets', filters, columns: selectedColumns });
      const jobId = dispatchRes.data?.data?.id;
      if (!jobId) throw new Error('No job ID returned');
      setExportStatus('processing');
      const poll = async () => {
        try {
          const statusRes = await adminAPI.checkExportStatus(jobId);
          const status = statusRes.data?.data?.status;
          if (status === 'completed') {
            const downloadRes = await adminAPI.downloadExport(jobId);
            const filename = statusRes.data?.data?.file_name || `tickets-export-${new Date().toISOString().slice(0, 10)}.csv`;
            downloadBlob(downloadRes, filename);
            setExportStatus('completed');
            toast.success('Tickets exported successfully');
            setTimeout(() => { setShowExportModal(false); setExportStatus(null); }, 1500);
          } else if (status === 'failed') {
            throw new Error(statusRes.data?.data?.error_message || 'Export failed');
          } else {
            setTimeout(poll, 1500);
          }
        } catch (pollErr) {
          console.error('Export poll error:', pollErr);
          if (!exportStatus || exportStatus === 'processing') {
            setExportStatus('failed'); setExportError(pollErr.response?.data?.message || pollErr.message || 'Export failed');
            toast.error('Export failed');
          }
        }
      };
      poll().catch(() => {});
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('failed'); setExportError(err.response?.data?.message || err.message || 'Failed to export tickets');
      toast.error('Export failed');
    } finally { setExporting(false); }
  };

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      };
      const r = await adminAPI.getSupportTickets(params);
      const data = r.data?.data || r.data;
      const list = data?.tickets || data?.items || data || [];
      setTickets(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || (data?.total !== undefined ? { page: data.page, pages: data.total_pages, total: data.total, per_page: data.limit } : {});
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / pageSize) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) { setError('Failed to load support tickets'); console.warn('Failed to load support tickets:', e); } finally { setLoading(false); }
  };

  // Reset page when search or filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      load(1);
    }
  }, [debouncedSearch, statusFilter, pageSize]);

  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      await adminAPI.replySupportTicket(replyModal.id, { message: replyText });
      setTickets(tickets.map(t => t.id === replyModal.id ? { ...t, status: 'ANSWERED' } : t));
      setReplyModal(null); setReplyText('');
      toast.success('Reply sent successfully');
    } catch { toast.error('Failed to send reply'); }
  };

  const resolveTicket = async (id) => {
    try {
      await adminAPI.updateSupportTicket(id, { status: 'RESOLVED' });
      setTickets(tickets.map(t => t.id === id ? { ...t, status: 'RESOLVED' } : t));
      toast.success('Ticket marked as resolved');
    } catch { toast.error('Failed to resolve ticket'); }
  };

  return (
    <div>
      <div className="admin-header"><h2>Support Tickets</h2><p>Manage customer inquiries and help requests</p></div>

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">⚠️</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
          <select className="table-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="ANSWERED">Answered</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          <button className="btn-ghost btn-sm" onClick={() => setShowExportModal(true)}>📥 Export CSV</button>
          <span className="table-count">{totalItems} tickets</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>ID</th><th>Customer</th><th>Subject</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : tickets.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📩</div><h3>No support tickets</h3></div></td></tr>
            ) : tickets.map(t => (
              <tr key={t.id}>
                <td><strong style={{ fontFamily: 'monospace' }}>#{t.id?.slice(0, 8)}</strong></td>
                <td>
                  <strong>{[t.user?.firstName || t.user?.first_name, t.user?.lastName || t.user?.last_name].filter(Boolean).join(' ') || t.name || 'Guest'}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{t.user?.email || t.email || '—'}</div>
                </td>
                <td style={{ maxWidth: 300 }}><strong>{t.subject}</strong><div style={{ fontSize: '0.8rem', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.message}</div></td>
                <td><span className={`status-badge ${t.status === 'RESOLVED' ? 'status-active' : t.status === 'OPEN' ? 'status-pending' : 'status-in-transit'}`}>{t.status || 'OPEN'}</span></td>
                <td style={{ fontSize: '0.82rem' }}>{formatDate(t.createdAt)}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn-approve" onClick={() => { setReplyModal(t); setReplyText(''); }} disabled={t.status === 'RESOLVED'}>Reply</button>
                    {t.status !== 'RESOLVED' && <button className="btn-view" onClick={() => resolveTicket(t.id)}>Resolve</button>}
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

      <ExportCSVModal
        isOpen={showExportModal}
        onClose={() => { setShowExportModal(false); setExportStatus(null); setExportError(null); }}
        columns={TICKET_COLUMNS}
        onExport={handleExportCSV}
        exporting={exporting}
        exportStatus={exportStatus}
        exportError={exportError}
        filename={`tickets-export-${new Date().toISOString().slice(0, 10)}.csv`}
      />

      {replyModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setReplyModal(null)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header"><h3>Reply to Inquiry</h3><button className="modal-close" onClick={() => setReplyModal(null)}>✕</button></div>
            <div className="modal-body">
              <div style={{ marginBottom: '1rem', padding: '1rem', background: 'var(--off-white)', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                <strong>{replyModal.subject}</strong>
                <p style={{ marginTop: '0.5rem', color: 'var(--muted)' }}>{replyModal.message}</p>
              </div>
              <div className="form-group form-full"><label>Your Reply</label><textarea rows={5} value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your response..." /></div>
            </div>
            <div className="modal-footer"><button className="btn-ghost btn-sm" onClick={() => setReplyModal(null)}>Cancel</button><button className="btn-dark btn-sm" onClick={handleReply}>Send Reply</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

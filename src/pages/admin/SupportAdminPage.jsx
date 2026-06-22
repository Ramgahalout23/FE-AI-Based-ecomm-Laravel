import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { formatDate } from '../../utils/formatters';
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
  const limit = 10;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      };
      const r = await adminAPI.getSupportTickets(params);
      const data = r.data?.data || r.data;
      const list = data?.tickets || data?.items || data || [];
      setTickets(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || (data?.total !== undefined ? { page: data.page, pages: data.total_pages, total: data.total, per_page: data.limit } : {});
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / limit) || 1);
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
  }, [debouncedSearch, statusFilter]);

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

        {totalPages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} tickets)</span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button className="btn-ghost btn-sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>◀ Prev</button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                <button key={p} className={p === currentPage ? 'btn-dark btn-sm' : 'btn-ghost btn-sm'} onClick={() => setCurrentPage(p)} style={{ minWidth: '32px' }}>{p}</button>
              ))}
              <button className="btn-ghost btn-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>Next ▶</button>
            </div>
          </div>
        )}
      </div>

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

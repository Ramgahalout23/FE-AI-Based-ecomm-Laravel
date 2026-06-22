import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import toast from '../../utils/toast';

export default function AbandonedCartsAdminPage() {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
      const r = await adminAPI.getAbandonedCarts({ page, limit, search: debouncedSearch || undefined });
      const data = r.data?.data || r.data;
      const list = data?.carts || data?.items || data || [];
      setCarts(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || (data?.total !== undefined ? { page: data.page, pages: data.total_pages, total: data.total, per_page: data.limit } : {});
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / limit) || 1);
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
  }, [debouncedSearch]);

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
        <button className="btn-dark btn-sm" onClick={() => toast.success('Bulk reminders sent')}>Send Bulk Reminders</button>
      </div>

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">⚠️</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search by customer or email..." value={search} onChange={e => setSearch(e.target.value)} />
          <span className="table-count">{totalItems} carts</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Customer</th><th>Items</th><th>Total</th><th>Last Active</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : carts.length === 0 ? (
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

        {totalPages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} carts)</span>
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
    </div>
  );
}

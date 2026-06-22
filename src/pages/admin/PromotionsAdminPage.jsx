import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { formatCurrency, formatDate, getImageUrl, getPromotionImage } from '../../utils/formatters';
import toast from '../../utils/toast';

export default function PromotionsAdminPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'PERCENTAGE', value: '', startDate: '', endDate: '', active: true });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      };
      const r = await adminAPI.getPromotions(params);
      const data = r.data?.data || r.data;
      const list = data?.items || data?.promotions || data || [];
      setPromotions(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || (data?.total !== undefined ? { page: data.page, pages: data.total_pages, total: data.total, per_page: data.limit } : {});
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / limit) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) { setError('Failed to load promotions'); console.warn('Failed to load promotions:', e); } finally { setLoading(false); }
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

  const openCreate = () => { setEditing(null); setForm({ name: '', type: 'PERCENTAGE', value: '', imageUrl: '', startDate: '', endDate: '', active: true }); setShowModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.title || '', type: 'PERCENTAGE', value: p.discount || '', imageUrl: getPromotionImage(p) || '', startDate: p.startDate?.split('T')[0] || '', endDate: p.endDate?.split('T')[0] || '', active: p.status === 'ACTIVE' || p.isActive }); setShowModal(true); };

  const handleSave = async () => {
    try {
      const payload = {
        title: form.name,
        type: 'FLASH_SALE',
        discount: Number(form.value),
        imageUrl: form.imageUrl || undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        isActive: form.active,
        status: form.active ? 'ACTIVE' : 'PAUSED',
      };
      if (editing) {
        await adminAPI.updatePromotion(editing.id, payload);
        toast.success('Promotion updated');
      } else {
        await adminAPI.createPromotion(payload);
        toast.success('Promotion created');
      }
      await load(currentPage);
      setShowModal(false);
    } catch { toast.error('Failed to save promotion'); }
  };

  const handleToggle = async (p) => {
    try { 
      const nextStatus = p.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
      await adminAPI.togglePromotion(p.id, { status: nextStatus }); 
      toast.success(`Campaign ${nextStatus === 'ACTIVE' ? 'Activated' : 'Paused'}`); 
      await load(currentPage);
    } catch { 
      toast.error('Failed to toggle campaign status'); 
    }
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div><h2>Flash Sales & Auto-Promotions</h2><p>Manage discounts applied automatically at checkout</p></div>
        <button className="btn-dark btn-sm" onClick={openCreate}>+ Create Promotion</button>
      </div>

      <div className="admin-alert info" style={{ marginBottom: '2rem' }}>
        <span className="admin-alert-icon">ℹ️</span>
        <div className="admin-alert-body">
          <div className="admin-alert-title">Automatic Application</div>
          <div>Unlike Coupons, active promotions here apply automatically to eligible carts during the specified date range.</div>
        </div>
      </div>

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">⚠️</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search promotions..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="table-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </select>
          <span className="table-count">{totalItems} promotions</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Image</th><th>Campaign Name</th><th>Discount</th><th>Starts</th><th>Ends</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : promotions.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">⚡</div><h3>No active promotions</h3></div></td></tr>
            ) : promotions.map(p => (
              <tr key={p.id}>
                <td>{getPromotionImage(p) ? <img loading="lazy" src={getImageUrl(getPromotionImage(p))} alt={p.title} style={{ width: 60, height: 30, objectFit: 'cover', borderRadius: 4 }} /> : <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>—</span>}</td>
                <td><strong>{p.title}</strong></td>
                <td><strong>{p.discount ? `${Number(p.discount)}% OFF` : '—'}</strong></td>
                <td style={{ fontSize: '0.82rem' }}>{p.startDate ? formatDate(p.startDate) : 'Immediately'}</td>
                <td style={{ fontSize: '0.82rem' }}>{p.endDate ? formatDate(p.endDate) : 'Never'}</td>
                <td><span className={`status-badge ${p.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}`}>{p.status === 'ACTIVE' ? 'Active' : 'Paused'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn-edit" onClick={() => openEdit(p)}>Edit</button>
                    <button className={p.status === 'ACTIVE' ? 'btn-del' : 'btn-approve'} onClick={() => handleToggle(p)}>{p.status === 'ACTIVE' ? 'Pause' : 'Activate'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} promotions)</span>
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

      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 500 }}>
            <div className="modal-header"><h3>{editing ? '✏️ Edit Promotion' : '⚡ New Promotion'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group form-full"><label>Campaign Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Winter Flash Sale" /></div>
              <div className="form-group form-full"><label>Banner Image URL</label><input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://example.com/banner.jpg" /></div>
              {form.imageUrl && (
                <div className="form-group form-full" style={{ marginTop: '-0.5rem' }}>
                  <img loading="lazy" src={getImageUrl(form.imageUrl)} alt="Preview" style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 8 }} />
                </div>
              )}
              <div className="form-grid">
                <div className="form-group"><label>Discount Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="PERCENTAGE">Percentage (%)</option></select></div>
                <div className="form-group"><label>Value (%)</label><input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="20" /></div>
                <div className="form-group"><label>Start Date</label><input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} /></div>
                <div className="form-group"><label>End Date</label><input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button><button className="btn-dark btn-sm" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

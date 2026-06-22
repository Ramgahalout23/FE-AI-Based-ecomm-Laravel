import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import toast from '../../utils/toast';

export default function BrandsAdminPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', logoUrl: '' });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

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
      const params = { page, limit, search: debouncedSearch || undefined };
      if (statusFilter !== 'all') {
        params.isActive = statusFilter === 'active';
      }
      const r = await adminAPI.getBrands(params);
      const data = r.data?.data || r.data;
      const list = data?.brands || data?.items || data || [];
      setBrands(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || {};
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / limit) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) { setError('Failed to load brands'); console.warn('Failed to load brands:', e); } finally { setLoading(false); }
  };

  // Reset page when search or status filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      load(1);
    }
  }, [debouncedSearch, statusFilter]);

  // Load when currentPage changes
  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', logoUrl: '' }); setShowModal(true); };
  const openEdit = (b) => { setEditing(b); setForm({ name: b.name || '', description: b.description || '', logoUrl: b.logoUrl || '' }); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await adminAPI.updateBrand(editing.id, form);
        toast.success('Brand updated');
      } else {
        await adminAPI.createBrand(form);
        toast.success('Brand created');
      }
      await load(currentPage);
      setShowModal(false);
    } catch { toast.error('Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this brand?')) return;
    try { 
      await adminAPI.deleteBrand(id); 
      setBrands(brands.filter(b => b.id !== id)); 
      toast.success('Deleted'); 
      await load(currentPage);
    } catch { 
      toast.error('Failed'); 
    }
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div><h2>Brands & Designers</h2><p>Manage product manufacturers and brands</p></div>
        <button className="btn-dark btn-sm" onClick={openCreate}>+ Add Brand</button>
      </div>

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">⚠️</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search brands..." value={search} onChange={e => setSearch(e.target.value)} />
          <select 
            className="table-filter" 
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            style={{ marginLeft: '0.5rem', padding: '0.4rem 0.6rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--charcoal)', cursor: 'pointer' }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <span className="table-count">{totalItems} brands</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Logo</th><th>Brand</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : brands.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">🏷️</div><h3>No brands yet</h3></div></td></tr>
            ) : brands.map(b => (
              <tr key={b.id}>
                <td>{b.logoUrl ? <img loading="lazy" src={b.logoUrl} alt={b.name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }} /> : <span style={{ color: '#999' }}>—</span>}</td>
                <td><strong>{b.name}</strong></td>
                <td style={{ color: 'var(--muted)', fontSize: '0.82rem', maxWidth: 250 }}>{b.description || '—'}</td>
                <td><span className={`status-badge ${b.active !== false ? 'status-active' : 'status-inactive'}`}>{b.active !== false ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn-edit" onClick={() => openEdit(b)}>Edit</button>
                    <button className="btn-del" onClick={() => handleDelete(b.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} brands total)
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button 
                className="btn-ghost btn-sm" 
                disabled={currentPage <= 1} 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{ opacity: currentPage <= 1 ? 0.5 : 1, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
              >
                ◀ Prev
              </button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                let pageNum;
                if (totalPages <= 10) pageNum = i + 1;
                else if (currentPage <= 5) pageNum = i + 1;
                else if (currentPage >= totalPages - 4) pageNum = totalPages - 9 + i;
                else pageNum = currentPage - 5 + i;
                return (
                  <button 
                    key={pageNum} 
                    className={pageNum === currentPage ? "btn-dark btn-sm" : "btn-ghost btn-sm"}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{ minWidth: '32px' }}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button 
                className="btn-ghost btn-sm" 
                disabled={currentPage >= totalPages} 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{ opacity: currentPage >= totalPages ? 0.5 : 1, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3>{editing ? '✏️ Edit Brand' : '➕ New Brand'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Brand Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gucci" /></div>
                <div className="form-group"><label>Logo URL</label><input value={form.logoUrl} onChange={e => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." /></div>
                <div className="form-group form-full"><label>Description</label><textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button><button className="btn-dark btn-sm" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

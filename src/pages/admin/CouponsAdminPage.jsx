import { useState, useEffect } from 'react';
import { couponsAPI } from '../../api/coupons';
import { adminAPI } from '../../api/admin';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COUPON_TYPES } from '../../utils/constants';
import toast from '../../utils/toast';

const EMPTY = { code: '', discountType: 'PERCENTAGE', discountValue: '', minPurchase: '', maxUses: '', expiresAt: '' };

export default function CouponsAdminPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkForm, setBulkForm] = useState({ count: 10, prefix: 'SALE', discountValue: 10 });
  const [analytics, setAnalytics] = useState(null);

  // Search / Filter
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');

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
        search: debouncedSearch || undefined
      };
      if (activeFilter === 'ACTIVE') params.isActive = true;
      else if (activeFilter === 'INACTIVE') params.isActive = false;

      const r = await couponsAPI.getAll(params);
      const data = r.data?.data || r.data;
      const list = data?.coupons || data?.items || data || [];
      setCoupons(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || {};
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / limit) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) { setError('Failed to load coupons'); console.warn('Failed to load coupons:', e); } finally { setLoading(false); }
  };

  // Reset page when search or filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      load(1);
    }
  }, [debouncedSearch, activeFilter]);

  // Load when currentPage changes
  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (c) => { 
    setEditing(c); 
    setForm({ 
      code: c.code || '', 
      discountType: c.discountType || c.type || 'PERCENTAGE', 
      discountValue: c.discountValue || c.value || '', 
      minPurchase: c.minPurchase !== undefined ? c.minPurchase : (c.minOrderValue !== null && c.minOrderValue !== undefined ? c.minOrderValue : ''), 
      maxUses: c.maxUses !== undefined ? c.maxUses : (c.usageLimit !== null && c.usageLimit !== undefined ? c.usageLimit : ''), 
      expiresAt: (c.expiresAt || c.expiryDate)?.split('T')[0] || '' 
    }); 
    setShowModal(true); 
  };

  const handleSave = async () => {
    const payload = { ...form, discountValue: Number(form.discountValue), minPurchase: form.minPurchase !== '' ? Number(form.minPurchase) : undefined, maxUses: form.maxUses !== '' ? Number(form.maxUses) : undefined };
    try {
      if (editing) {
        await couponsAPI.update(editing.id, payload);
        toast.success('Coupon updated');
      } else {
        await couponsAPI.create(payload);
        toast.success('Coupon created');
      }
      await load(currentPage);
      setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this coupon?')) return;
    try { 
      await couponsAPI.delete(id); 
      setCoupons(coupons.filter(c => c.id !== id)); 
      toast.success('Deleted'); 
      await load(currentPage);
    } catch { 
      toast.error('Failed'); 
    }
  };

  const handleBulkGenerate = async () => {
    try { 
      await couponsAPI.bulkGenerate(bulkForm); 
      setBulkModal(false); 
      toast.success(`${bulkForm.count} coupons generated!`); 
      await load(currentPage);
    } catch { 
      toast.error('Bulk generation failed'); 
    }
  };

  const viewAnalytics = async (coupon) => {
    try {
      const r = await couponsAPI.getAnalytics(coupon.id);
      // Unwrap r.data.data — the backend wraps analytics in { success, data: {...} }
      setAnalytics({ ...coupon, ...(r.data?.data || r.data || {}) });
    }
    catch { setAnalytics(coupon); }
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div><h2>Coupons</h2><p>Manage discount codes and promotions</p></div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost btn-sm" onClick={() => setBulkModal(true)}>🎲 Bulk Generate</button>
          <button className="btn-dark btn-sm" onClick={openCreate}>+ Create Coupon</button>
        </div>
      </div>

      {/* Analytics Panel */}
      {analytics && (
        <div className="detail-panel">
          <div className="detail-header">
            <h3>📊 Analytics: {analytics.code}</h3>
            <button className="btn-ghost btn-sm" onClick={() => setAnalytics(null)}>✕ Close</button>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span className="label">Total Uses</span><span className="value">{analytics.usedCount || analytics.totalUses || analytics.usageCount || 0}</span></div>
            <div className="detail-item"><span className="label">Revenue Generated</span><span className="value">{formatCurrency(analytics.revenueGenerated || 0)}</span></div>
            <div className="detail-item"><span className="label">Discount Given</span><span className="value">{formatCurrency(analytics.totalDiscount || 0)}</span></div>
            <div className="detail-item"><span className="label">Avg Order Value</span><span className="value">{formatCurrency(analytics.avgOrderValue || 0)}</span></div>
          </div>
        </div>
      )}

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">⚠️</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search by code..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
          <select className="table-filter" value={activeFilter} onChange={e => setActiveFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <span className="table-count">{totalItems} coupons</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Min Purchase</th><th>Uses</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">🎟️</div><h3>No coupons yet</h3></div></td></tr>
            ) : coupons.map(c => (
              <tr key={c.id}>
                <td><strong style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{c.code}</strong></td>
                <td>{c.discountType || c.type || '—'}</td>
                <td><strong>{(c.discountType || c.type) === 'PERCENTAGE' ? `${c.discountValue || c.value}%` : formatCurrency(c.discountValue || c.value)}</strong></td>
                <td>{c.minPurchase !== undefined ? (c.minPurchase ? formatCurrency(c.minPurchase) : '—') : (c.minOrderValue ? formatCurrency(c.minOrderValue) : '—')}</td>
                <td>{c.usedCount !== undefined ? c.usedCount : (c.usageCount || 0)} / {c.maxUses !== undefined ? (c.maxUses || '∞') : (c.usageLimit || '∞')}</td>
                <td style={{ fontSize: '0.82rem' }}>{(c.expiresAt || c.expiryDate) ? formatDate(c.expiresAt || c.expiryDate) : 'Never'}</td>
                <td><span className={`status-badge ${(c.isActive ?? c.active) !== false ? 'status-active' : 'status-inactive'}`}>{(c.isActive ?? c.active) !== false ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn-view" onClick={() => viewAnalytics(c)}>📊</button>
                    <button className="btn-edit" onClick={() => openEdit(c)}>Edit</button>
                    <button className="btn-del" onClick={() => handleDelete(c.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} coupons)</span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button className="btn-ghost btn-sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} style={{ opacity: currentPage <= 1 ? 0.5 : 1 }}>◀ Prev</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={p === currentPage ? 'btn-dark btn-sm' : 'btn-ghost btn-sm'} onClick={() => setCurrentPage(p)} style={{ minWidth: '32px' }}>{p}</button>
              ))}
              <button className="btn-ghost btn-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} style={{ opacity: currentPage >= totalPages ? 0.5 : 1 }}>Next ▶</button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3>{editing ? '✏️ Edit Coupon' : '➕ New Coupon'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Coupon Code</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE20" /></div>
                <div className="form-group"><label>Discount Type</label><select value={form.discountType} onChange={e => setForm({ ...form, discountType: e.target.value })}>{COUPON_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div className="form-group"><label>Discount Value</label><input type="number" value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} placeholder="10" /></div>
                <div className="form-group"><label>Min Purchase ($)</label><input type="number" value={form.minPurchase} onChange={e => setForm({ ...form, minPurchase: e.target.value })} placeholder="0" /></div>
                <div className="form-group"><label>Max Uses</label><input type="number" value={form.maxUses} onChange={e => setForm({ ...form, maxUses: e.target.value })} placeholder="Unlimited" /></div>
                <div className="form-group"><label>Expires At</label><input type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button><button className="btn-dark btn-sm" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}

      {/* Bulk Generate Modal */}
      {bulkModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setBulkModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header"><h3>🎲 Bulk Generate Coupons</h3><button className="modal-close" onClick={() => setBulkModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Count</label><input type="number" value={bulkForm.count} onChange={e => setBulkForm({ ...bulkForm, count: e.target.value })} /></div>
                <div className="form-group"><label>Prefix</label><input value={bulkForm.prefix} onChange={e => setBulkForm({ ...bulkForm, prefix: e.target.value.toUpperCase() })} /></div>
                <div className="form-group form-full"><label>Discount Value</label><input type="number" value={bulkForm.discountValue} onChange={e => setBulkForm({ ...bulkForm, discountValue: e.target.value })} /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn-ghost btn-sm" onClick={() => setBulkModal(false)}>Cancel</button><button className="btn-dark btn-sm" onClick={handleBulkGenerate}>Generate {bulkForm.count} Coupons</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

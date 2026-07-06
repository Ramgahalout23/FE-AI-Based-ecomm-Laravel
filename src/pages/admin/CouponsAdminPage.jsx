import { useState, useEffect } from 'react';
import { couponsAPI } from '../../api/coupons';
import { adminAPI } from '../../api/admin';
import AdminPageShell from '../../components/admin/AdminPageShell';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { COUPON_TYPES } from '../../utils/constants';
import Pagination from '../../components/admin/Pagination';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import { downloadBlob } from '../../utils/download';
import toast from '../../utils/toast';
import { BarChart3, Ticket, Edit, Plus, X, Download, Dices } from 'lucide-react';

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

  // CSV Export state (async job-based)
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  const COUPON_COLUMNS = [
    { key: 'code', label: 'Code' },
    { key: 'discountType', label: 'Discount Type' },
    { key: 'discountValue', label: 'Discount Value' },
    { key: 'minOrderValue', label: 'Min Order Value' },
    { key: 'maxDiscount', label: 'Max Discount' },
    { key: 'usageLimit', label: 'Usage Limit' },
    { key: 'usageCount', label: 'Usage Count' },
    { key: 'isActive', label: 'Active' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'expiryDate', label: 'Expiry Date' },
    { key: 'isAutoApply', label: 'Auto Apply' },
    { key: 'isStackable', label: 'Stackable' },
    { key: 'isNewUserOnly', label: 'New User Only' },
    { key: 'description', label: 'Description' },
    { key: 'createdAt', label: 'Created Date' },
  ];

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
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
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
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / pageSize) || 1);
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
  }, [debouncedSearch, activeFilter, pageSize]);

  // Load when currentPage changes
  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  const handleExportCSV = async (selectedColumns) => {
    setExporting(true);
    setExportStatus('dispatching');
    setExportError(null);
    try {
      const filters = {
        search: debouncedSearch || undefined,
        isActive: activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE',
      };
      Object.keys(filters).forEach(k => { if (filters[k] === undefined) delete filters[k]; });

      const dispatchRes = await adminAPI.dispatchExport({
        type: 'coupons',
        filters,
        columns: selectedColumns,
      });

      const jobId = dispatchRes.data?.data?.id;
      if (!jobId) throw new Error('No job ID returned');

      setExportStatus('processing');

      const poll = async () => {
        try {
          const statusRes = await adminAPI.checkExportStatus(jobId);
          const status = statusRes.data?.data?.status;

          if (status === 'completed') {
            const downloadRes = await adminAPI.downloadExport(jobId);
            const filename = statusRes.data?.data?.file_name || `coupons-export-${new Date().toISOString().slice(0, 10)}.csv`;
            downloadBlob(downloadRes, filename);
            setExportStatus('completed');
            toast.success('Coupons exported successfully');
            setTimeout(() => {
              setShowExportModal(false);
              setExportStatus(null);
            }, 1500);
          } else if (status === 'failed') {
            throw new Error(statusRes.data?.data?.error_message || 'Export failed');
          } else {
            setTimeout(poll, 1500);
          }
        } catch (pollErr) {
          console.error('Export poll error:', pollErr);
          if (!exportStatus || exportStatus === 'processing') {
            setExportStatus('failed');
            setExportError(pollErr.response?.data?.message || pollErr.message || 'Export failed');
            toast.error('Export failed');
          }
        }
      };

      poll().catch(() => {});
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('failed');
      setExportError(err.response?.data?.message || err.message || 'Failed to export coupons');
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

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
      <AdminPageShell
        title="Coupons"
        subtitle="Manage discount codes and promotions"
        loading={loading}
        error={error}
        page="coupons"
        actions={
          <>
            <button className="btn-ghost btn-sm" onClick={() => setShowExportModal(true)}><Download size={14} /> Export CSV</button>
            <button className="btn-ghost btn-sm" onClick={() => setBulkModal(true)}><Dices size={14} /> Bulk Generate</button>
            <button className="btn-dark btn-sm" onClick={openCreate}>+ Create Coupon</button>
          </>
        }
      >
      {/* Analytics Panel */}
      {analytics && (
        <div className="detail-panel">
          <div className="detail-header">
            <h3><BarChart3 size={16} /> Analytics: {analytics.code}</h3>
            <button className="btn-ghost btn-sm" onClick={() => setAnalytics(null)}><X size={14} /> Close</button>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span className="label">Total Uses</span><span className="value">{analytics.usedCount || analytics.totalUses || analytics.usageCount || 0}</span></div>
            <div className="detail-item"><span className="label">Revenue Generated</span><span className="value">{formatCurrency(analytics.revenueGenerated || 0)}</span></div>
            <div className="detail-item"><span className="label">Discount Given</span><span className="value">{formatCurrency(analytics.totalDiscount || 0)}</span></div>
            <div className="detail-item"><span className="label">Avg Order Value</span><span className="value">{formatCurrency(analytics.avgOrderValue || 0)}</span></div>
          </div>
        </div>
      )}
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
            {coupons.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon"><Ticket size={40} /></div><h3>No coupons yet</h3></div></td></tr>
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
                    <button className="btn-view" onClick={() => viewAnalytics(c)}><BarChart3 size={14} /></button>
                    <button className="btn-edit" onClick={() => openEdit(c)}>Edit</button>
                    <button className="btn-del" onClick={() => handleDelete(c.id)}>Delete</button>
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
      </AdminPageShell>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3>{editing ? <><Edit size={18} /> Edit Coupon</> : <><Plus size={18} /> New Coupon</>}</h3><button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button></div>
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
            <div className="modal-header"><h3><Dices size={18} /> Bulk Generate Coupons</h3><button className="modal-close" onClick={() => setBulkModal(false)}><X size={16} /></button></div>
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

      {/* CSV Export Modal */}
      <ExportCSVModal
        isOpen={showExportModal}
        onClose={() => { setShowExportModal(false); setExportStatus(null); setExportError(null); }}
        columns={COUPON_COLUMNS}
        onExport={handleExportCSV}
        exporting={exporting}
        exportStatus={exportStatus}
        exportError={exportError}
        filename={`coupons-export-${new Date().toISOString().slice(0, 10)}.csv`}
      />
    </div>
  );
}

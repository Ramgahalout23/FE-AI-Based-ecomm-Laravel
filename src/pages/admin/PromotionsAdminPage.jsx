import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import { formatDate, getImageUrl, getPromotionImage } from '../../utils/formatters';
import Pagination from '../../components/admin/Pagination';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import { downloadBlob } from '../../utils/download';
import toast from '../../utils/toast';
import { Sparkles, Package } from 'lucide-react';
import { useSettings } from '../../store/useSettings';
import { parseBundleTiers, isBundleOfferEnabled } from '../../utils/constants';

export default function PromotionsAdminPage() {
  const { getSetting } = useSettings();
  const bundleOfferActive = isBundleOfferEnabled(getSetting);
  const bundleTiers = parseBundleTiers(getSetting('bundleTiers'));
  const discountTiers = bundleTiers.filter(t => t.discount > 0);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'PERCENTAGE', value: '', imageUrl: '', startDate: '', endDate: '', active: true, productIds: [], categoryIds: [], offerBadge: '', offerHighlight: '', offerTagline: '', offerTheme: '', autoApply: false });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize, search: debouncedSearch || undefined, status: statusFilter !== 'ALL' ? statusFilter : undefined };
      const r = await adminAPI.getPromotions(params);
      const data = r.data?.data || r.data;
      const list = data?.items || data?.promotions || data || [];
      setPromotions(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || (data?.total !== undefined ? { page: data.page, pages: data.total_pages, total: data.total, per_page: data.limit } : {});
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / pageSize) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) { setError('Failed to load promotions'); console.warn('Failed to load promotions:', e); } finally { setLoading(false); }
  };

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

  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  const PROMOTION_COLUMNS = [
    { key: 'title', label: 'Title' },
    { key: 'description', label: 'Description' },
    { key: 'type', label: 'Type' },
    { key: 'discount', label: 'Discount' },
    { key: 'status', label: 'Status' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'isActive', label: 'Active' },
    { key: 'createdAt', label: 'Created Date' },
  ];

  const handleExportCSV = async (selectedColumns) => {
    setExporting(true); setExportStatus('dispatching'); setExportError(null);
    try {
      const filters = { search: debouncedSearch || undefined, status: statusFilter !== 'ALL' ? statusFilter : undefined };
      Object.keys(filters).forEach(k => { if (filters[k] === undefined) delete filters[k]; });
      const dispatchRes = await adminAPI.dispatchExport({ type: 'promotions', filters, columns: selectedColumns });
      const jobId = dispatchRes.data?.data?.id;
      if (!jobId) throw new Error('No job ID returned');
      setExportStatus('processing');
      const poll = async () => {
        try {
          const statusRes = await adminAPI.checkExportStatus(jobId);
          const status = statusRes.data?.data?.status;
          if (status === 'completed') {
            const downloadRes = await adminAPI.downloadExport(jobId);
            const filename = statusRes.data?.data?.file_name || `promotions-export-${new Date().toISOString().slice(0, 10)}.csv`;
            downloadBlob(downloadRes, filename);
            setExportStatus('completed');
            toast.success('Promotions exported successfully');
            setTimeout(() => { setShowExportModal(false); setExportStatus(null); }, 1500);
          } else if (status === 'failed') {
            throw new Error(statusRes.data?.data?.error_message || 'Export failed');
          } else {
            setTimeout(poll, 1500);
          }
        } catch (pollErr) {
          console.error('Export poll error:', pollErr);
          setExportStatus('failed'); setExportError(pollErr.response?.data?.message || pollErr.message || 'Export failed');
          toast.error('Export failed');
        }
      };
      poll().catch(() => {});
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('failed'); setExportError(err.response?.data?.message || err.message || 'Failed to export promotions');
      toast.error('Export failed');
    } finally { setExporting(false); }
  };

  const openCreate = () => { setEditing(null); setForm({ name: '', type: 'PERCENTAGE', value: '', imageUrl: '', startDate: '', endDate: '', active: true, productIds: [], categoryIds: [], offerBadge: '', offerHighlight: '', offerTagline: '', offerTheme: '', autoApply: false }); setShowModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ name: p.title || '', type: 'PERCENTAGE', value: p.discount || '', imageUrl: getPromotionImage(p) || '', startDate: p.startDate?.split('T')[0] || '', endDate: p.endDate?.split('T')[0] || '', active: p.status === 'ACTIVE' || p.isActive, productIds: p.productIds || p.products?.map(pr => pr.id) || [], categoryIds: p.categoryIds || p.categories?.map(c => c.id) || [], offerBadge: p.offerBadge || '', offerHighlight: p.offerHighlight || '', offerTagline: p.offerTagline || '', offerTheme: p.offerTheme || '', autoApply: p.autoApply ?? false }); setShowModal(true); };

  const handleSave = async () => {
    // An active promotion must carry a real discount — mirrored on the backend
    // (PromotionController validation) so admins get instant feedback here.
    const discountValue = Number(form.value) || 0;
    if (form.active && discountValue <= 0) {
      toast.error('Set a discount greater than 0, or turn off Active to save without a discount');
      return;
    }
    try {
      const payload = {
        title: form.name,
        type: form.offerBadge || form.offerHighlight ? 'SEASONAL' : 'FLASH_SALE',
        discount: Number(form.value) || undefined,
        imageUrl: form.imageUrl || undefined,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        isActive: form.active,
        status: form.active ? 'ACTIVE' : 'PAUSED',
        productIds: form.productIds.length > 0 ? form.productIds : [],
        categoryIds: form.categoryIds.length > 0 ? form.categoryIds : [],
        offerBadge: form.offerBadge || undefined,
        offerHighlight: form.offerHighlight || undefined,
        offerTagline: form.offerTagline || undefined,
        offerTheme: form.offerTheme || undefined,
        autoApply: form.autoApply,
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
    } catch (err) {
      const msg = err?.response?.data?.errors?.discount?.[0]
        || err?.response?.data?.message
        || 'Failed to save promotion';
      toast.error(msg);
    }
  };

  const handleToggle = async (p) => {
    const nextStatus = p.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    // Can't activate a promotion that has no real discount to apply.
    if (nextStatus === 'ACTIVE' && !(Number(p.discount) > 0)) {
      toast.error('Set a discount greater than 0 before activating this promotion');
      return;
    }
    try {
      await adminAPI.togglePromotion(p.id, { status: nextStatus });
      toast.success(`Campaign ${nextStatus === 'ACTIVE' ? 'Activated' : 'Paused'}`);
      await load(currentPage);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to toggle campaign status';
      toast.error(msg);
    }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete promotion "${p.title || p.name || ''}"? This cannot be undone.`)) return;
    try {
      await adminAPI.deletePromotion(p.id);
      toast.success('Promotion deleted');
      await load(currentPage);
    } catch {
      toast.error('Failed to delete promotion');
    }
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div><h2>Flash Sales & Auto-Promotions</h2><p>Manage discounts applied automatically at checkout</p></div>
        <button className="btn-ghost btn-sm" onClick={() => setShowExportModal(true)}>Export CSV</button>
        <button className="btn-dark btn-sm" onClick={openCreate}>+ Create Promotion</button>
      </div>

      <div className="admin-alert info" style={{ marginBottom: '2rem' }}>
        <span className="admin-alert-icon">i</span>
        <div className="admin-alert-body">
          <div className="admin-alert-title">Automatic Application</div>
          <div>Unlike Coupons, active promotions here apply automatically to eligible carts during the specified date range.</div>
        </div>
      </div>

      {/* Bundle Offer (Buy More, Save More) Status Card */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        padding: '1rem 1.25rem',
        marginBottom: '1.5rem',
        background: bundleOfferActive ? 'linear-gradient(135deg, #f0fdf4, #ecfdf5)' : 'var(--off-white)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid ' + (bundleOfferActive ? '#86efac' : 'var(--border)'),
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>📦</span>
            <div>
              <strong style={{ fontSize: '0.92rem' }}>Bundle Offer — Buy More, Save More</strong>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.15rem 0 0' }}>
                Per-line volume discount applied automatically at checkout
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
            <span className={`status-badge ${bundleOfferActive ? 'status-active' : 'status-pending'}`}>
              {bundleOfferActive ? 'Active' : 'Inactive'}
            </span>
            <Link
              to="/admin/settings"
              className="btn-ghost btn-sm"
              style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
            >
              <Package size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              Configure
            </Link>
          </div>
        </div>

        {/* Date window */}
        {(getSetting('bundleOfferStartDate') || getSetting('bundleOfferEndDate')) && (
          <div style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>
            📅{' '}
            {getSetting('bundleOfferStartDate')
              ? `Starts ${formatDate(getSetting('bundleOfferStartDate'))}`
              : 'Starts immediately'}
            {getSetting('bundleOfferEndDate')
              ? ` • Ends ${formatDate(getSetting('bundleOfferEndDate'))}`
              : ' • No end date'}
          </div>
        )}

        {/* Configured tiers */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {discountTiers.map((tier) => (
            <span
              key={tier.minQty}
              style={{
                fontSize: '0.74rem',
                fontWeight: 600,
                padding: '0.28rem 0.7rem',
                borderRadius: 999,
                background: bundleOfferActive ? '#d1fae5' : '#e5e7eb',
                color: bundleOfferActive ? '#065f46' : '#4b5563',
                border: '1px solid ' + (bundleOfferActive ? '#a7f3d0' : '#d1d5db'),
              }}
            >
              {tier.maxQty ? `${tier.minQty}–${tier.maxQty} items` : `${tier.minQty}+ items`} → {tier.discount}% off
            </span>
          ))}
          {discountTiers.length === 0 && (
            <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>No active discount tiers configured</span>
          )}
        </div>
      </div>

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">!</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}
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
              <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon"></div><h3>No active promotions</h3></div></td></tr>
            ) : promotions.map(p => (
              <tr key={p.id}>
                <td>{getPromotionImage(p) ? <img loading="lazy" src={getImageUrl(getPromotionImage(p))} alt={p.title} style={{ width: 60, height: 30, objectFit: 'cover', borderRadius: 4 }} /> : <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>--</span>}</td>
                <td><strong>{p.title}</strong></td>
                <td><strong>{p.discount ? `${Number(p.discount)}% OFF` : '--'}</strong></td>
                <td style={{ fontSize: '0.82rem' }}>{p.startDate ? formatDate(p.startDate) : 'Immediately'}</td>
                <td style={{ fontSize: '0.82rem' }}>{p.endDate ? formatDate(p.endDate) : 'Never'}</td>
                <td><span className={`status-badge ${p.status === 'ACTIVE' ? 'status-active' : 'status-inactive'}`}>{p.status === 'ACTIVE' ? 'Active' : 'Paused'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn-edit" onClick={() => openEdit(p)}>Edit</button>
                    <button className={p.status === 'ACTIVE' ? 'btn-del' : 'btn-approve'} onClick={() => handleToggle(p)}>{p.status === 'ACTIVE' ? 'Pause' : 'Activate'}</button>
                    <button className="btn-del" onClick={() => handleDelete(p)} style={{ opacity: 0.7, fontSize: '0.72rem' }}>Delete</button>
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
        columns={PROMOTION_COLUMNS}
        onExport={handleExportCSV}
        exporting={exporting}
        exportStatus={exportStatus}
        exportError={exportError}
        filename={`promotions-export-${new Date().toISOString().slice(0, 10)}.csv`}
      />

      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header"><h3>{editing ? 'Edit Promotion' : 'New Promotion'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>X</button></div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
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
              <div className="form-group form-full" style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={e => setForm({ ...form, active: e.target.checked })}
                    style={{ accentColor: 'var(--primary)', width: 16, height: 16, cursor: 'pointer' }}
                  />
                  <strong style={{ fontSize: '0.85rem' }}>Active</strong>
                </label>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                  {form.active
                    ? 'Live for customers — an active promotion needs a discount greater than 0'
                    : 'Saved but hidden — no discount required while inactive'}
                </span>
              </div>
              {/* ── Offer Card Section ── */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Sparkles size={14} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-main)' }}>Offer Card</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--muted)', background: '#f3f4f6', padding: '2px 8px', borderRadius: 999 }}>Appears on product pages</span>
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 10 }}>Configure how this promotion appears as an offer card below variant selection on product detail pages.</p>

                {/* ── Auto-Apply Toggle ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '10px 14px', borderRadius: 10, border: '1px solid ' + (form.autoApply ? '#f59e0b' : 'var(--border)'), background: form.autoApply ? '#fffbeb' : '#fafafa' }}>
                  <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.autoApply}
                      onChange={e => setForm({ ...form, autoApply: e.target.checked })}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span style={{
                      position: 'absolute', inset: 0, borderRadius: 24,
                      background: form.autoApply ? '#f59e0b' : '#d1d5db',
                      transition: 'background 0.2s',
                    }}>
                      <span style={{
                        position: 'absolute', top: 2, left: form.autoApply ? 22 : 2,
                        width: 20, height: 20, borderRadius: '50%', background: '#fff',
                        transition: 'left 0.2s',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      }} />
                    </span>
                  </label>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: form.autoApply ? '#92400e' : 'var(--text-main)' }}>
                      Auto-Apply at Checkout
                    </div>
                    <div style={{ fontSize: '0.7rem', color: form.autoApply ? '#b45309' : 'var(--muted)', marginTop: 1 }}>
                      {form.autoApply
                        ? 'This offer will be automatically applied to all items in the cart'
                        : 'Toggle on to auto-apply this offer as a store-wide discount'}
                    </div>
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group"><label>Badge</label><input value={form.offerBadge} onChange={e => setForm({ ...form, offerBadge: e.target.value })} placeholder="e.g. BUY 2" /></div>
                  <div className="form-group"><label>Highlight</label><input value={form.offerHighlight} onChange={e => setForm({ ...form, offerHighlight: e.target.value })} placeholder="e.g. GET 10% OFF" /></div>
                  <div className="form-group"><label>Tagline</label><input value={form.offerTagline} onChange={e => setForm({ ...form, offerTagline: e.target.value })} placeholder="e.g. Auto-applied at checkout" /></div>
                  <div className="form-group"><label>Color Theme</label>
                    <select value={form.offerTheme} onChange={e => setForm({ ...form, offerTheme: e.target.value })}>
                      <option value="">Auto (cycle)</option>
                      <option value="smart-deal">Amber (Smart Deal)</option>
                      <option value="prepaid-offer">Violet (Prepaid)</option>
                      <option value="summer-bonus">Pink (Bonus)</option>
                      <option value="emerald">Emerald</option>
                      <option value="blue">Blue</option>
                      <option value="cyan">Cyan</option>
                      <option value="red">Red</option>
                      <option value="black">Black</option>
                    </select>
                  </div>
                </div>

                {/* Live Offer Card Preview */}
                {(form.offerBadge || form.offerHighlight || form.offerTagline) && (
                  <div style={{ marginTop: 12, borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden', background: '#fafafa' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 12px', background: '#f3f4f6', color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>Live Preview</div>
                    <div style={{ padding: 12 }}>
                      <OfferCardPreview
                        title={form.name || 'Offer'}
                        badge={form.offerBadge}
                        highlight={form.offerHighlight}
                        tagline={form.offerTagline}
                        themeName={form.offerTheme}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── Linked Products / Categories ── */}
              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <div className="form-group form-full">
                  <label>Linked Products</label>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6 }}>Select products for this promotion. Leave empty for all products.</p>
                  <ProductMultiSelect selected={form.productIds} onChange={ids => setForm({ ...form, productIds: ids })} />
                </div>
                <div className="form-group form-full">
                  <label>Linked Categories</label>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6 }}>Select categories for this promotion.</p>
                  <CategoryMultiSelect selected={form.categoryIds} onChange={ids => setForm({ ...form, categoryIds: ids })} />
                </div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button><button className="btn-dark btn-sm" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* -- Product Multi-Select -- */
function ProductMultiSelect({ selected, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await adminAPI.getProducts({ search: query, limit: 10 });
        const list = res.data?.data?.products || res.data?.products || res.data?.data || [];
        setResults(Array.isArray(list) ? list : []);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const toggle = (pid) => {
    onChange(selected.includes(pid) ? selected.filter(id => id !== pid) : [...selected, pid]);
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', minHeight: 38, cursor: 'text' }} onClick={() => setOpen(true)}>
        {selected.map(pid => {
          const p = results.find(r => r.id === pid);
          return (
            <span key={pid} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', padding: '2px 6px', borderRadius: 4, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
              {p?.name || pid.slice(0, 8)}
              <button onClick={(e) => { e.stopPropagation(); toggle(pid); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280', fontSize: '0.72rem', lineHeight: 1 }}>x</button>
            </span>
          );
        })}
        <input
          placeholder={selected.length === 0 ? 'Search products...' : ''}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={{ border: 'none', outline: 'none', flex: 1, fontSize: '0.78rem', minWidth: 80, background: 'transparent' }}
          autoComplete="off"
        />
      </div>
      {open && (query || results.length > 0) && (
        <>
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: '#fff', borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: 220, overflow: 'auto', padding: '4px 0' }}>
            {loading ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.78rem' }}>Searching...</div>
            ) : results.length === 0 && query ? (
              <div style={{ padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '0.78rem' }}>No products found</div>
            ) : results.map(p => {
              const isSelected = selected.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => toggle(p.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '6px 10px', border: 'none', background: isSelected ? '#f3f4f6' : '#fff', cursor: 'pointer', fontSize: '0.82rem' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#f3f4f6' : '#fff'; }}
                >
                  <input type="checkbox" checked={isSelected} readOnly style={{ accentColor: 'var(--primary)' }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                  </div>
                  {p.sku && <span style={{ fontSize: '0.65rem', color: '#6b7280', fontFamily: 'monospace' }}>{p.sku}</span>}
                </button>
              );
            })}
          </div>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
        </>
      )}
    </div>
  );
}

/* -- Category Multi-Select -- */
/* ── Offer Card Live Preview ── */
const THEME_COLORS = {
  'smart-deal': { from: '#f59e0b', to: '#ea580c', iconColor: '#d97706', iconBg: '#fef3c7', badgeBg: '#fef3c7', badgeText: '#92400e', tagBg: '#fffbeb', cardBg: '#ffffff', titleColor: '#111827', highlightColor: '#111827' },
  'prepaid-offer': { from: '#8b5cf6', to: '#7c3aed', iconColor: '#7c3aed', iconBg: '#ede9fe', badgeBg: '#ede9fe', badgeText: '#5b21b6', tagBg: '#f5f3ff', cardBg: '#ffffff', titleColor: '#111827', highlightColor: '#111827' },
  'summer-bonus': { from: '#ec4899', to: '#f43f5e', iconColor: '#db2777', iconBg: '#fce7f3', badgeBg: '#fce7f3', badgeText: '#9d174d', tagBg: '#fff1f2', cardBg: '#ffffff', titleColor: '#111827', highlightColor: '#111827' },
  'emerald': { from: '#10b981', to: '#0d9488', iconColor: '#059669', iconBg: '#d1fae5', badgeBg: '#d1fae5', badgeText: '#065f46', tagBg: '#ecfdf5', cardBg: '#ffffff', titleColor: '#111827', highlightColor: '#111827' },
  'blue': { from: '#3b82f6', to: '#4f46e5', iconColor: '#2563eb', iconBg: '#dbeafe', badgeBg: '#dbeafe', badgeText: '#1e40af', tagBg: '#eff6ff', cardBg: '#ffffff', titleColor: '#111827', highlightColor: '#111827' },
  'cyan': { from: '#06b6d4', to: '#0e7490', iconColor: '#06b6d4', iconBg: '#cffafe', badgeBg: '#cffafe', badgeText: '#155e75', tagBg: '#ecfeff', cardBg: '#ffffff', titleColor: '#111827', highlightColor: '#111827' },
  'red': { from: '#f59e0b', to: '#eab308', iconColor: '#ffffff', iconBg: 'rgba(255,255,255,0.2)', badgeBg: '#ffffff', badgeText: '#8B0000', tagBg: 'rgba(255,255,255,0.15)', cardBg: '#8B0000', titleColor: '#ffffff', highlightColor: '#ffffff' },
  'black': { from: 'rgba(255,255,255,0.3)', to: 'transparent', iconColor: '#e5e7eb', iconBg: 'rgba(255,255,255,0.1)', badgeBg: 'rgba(255,255,255,0.9)', badgeText: '#111827', tagBg: '#2a2a2a', cardBg: '#1a1a1a', titleColor: '#ffffff', highlightColor: '#ffffff' },
};

function OfferCardPreview({ title, badge, highlight, tagline, themeName }) {
  const colors = THEME_COLORS[themeName] || { from: '#9ca3af', to: '#6b7280', iconColor: '#6b7280', iconBg: '#f3f4f6', badgeBg: '#f3f4f6', badgeText: '#374151', tagBg: '#f9fafb', cardBg: '#ffffff', titleColor: '#111827', highlightColor: '#111827' };

  return (
    <div style={{
      position: 'relative',
      borderRadius: 10,
      border: '1px solid ' + (themeName === 'black' ? '#374151' : '#e5e7eb'),
      overflow: 'hidden',
      background: colors.cardBg,
      minWidth: 180,
      maxHeight: 120,
      display: 'flex',
      flexDirection: 'column',
      padding: '12px 14px',
      gap: 4,
    }}>
      {/* Accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(to right, ${colors.from}, ${colors.to})`, opacity: 0.8 }} />

      {/* Glass shine overlay */}
      <div style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'linear-gradient(to bottom, rgba(255,255,255,0.4), transparent)', pointerEvents: 'none' }} />

      {/* offer-label */}
      <span style={{
        fontSize: 10,
        fontWeight: 600,
        color: colors.titleColor,
        opacity: 0.8,
        lineHeight: 1.25,
        position: 'relative',
        zIndex: 1,
      }}>
        {title}
      </span>

      {/* offer-headline — wraps to 2 lines */}
      <div style={{
        fontSize: 15,
        fontWeight: 900,
        color: colors.highlightColor,
        lineHeight: 1.2,
        flex: 1,
        whiteSpace: 'pre-line',
        position: 'relative',
        zIndex: 1,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {badge ? `${badge} ` : ''}{highlight}
      </div>

      {/* offer-sub */}
      <span style={{
        fontSize: 8,
        fontWeight: 500,
        color: colors.highlightColor,
        opacity: 0.6,
        lineHeight: 1.25,
        position: 'relative',
        zIndex: 1,
      }}>
        {tagline}
      </span>
    </div>
  );
}

// Module-level cache for category reference data
let _cachedCategories = null;

function CategoryMultiSelect({ selected, onChange }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (_cachedCategories) {
      setCategories(_cachedCategories);
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await adminAPI.getCategories({ limit: 100 });
        const list = res.data?.data?.categories || res.data?.categories || res.data?.data || [];
        const normalized = Array.isArray(list) ? list : [];
        _cachedCategories = normalized;
        setCategories(normalized);
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const toggle = (cid) => {
    onChange(selected.includes(cid) ? selected.filter(id => id !== cid) : [...selected, cid]);
  };

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '6px 8px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', minHeight: 38 }}>
        {selected.length === 0 && !loading && (
          <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>No categories selected</span>
        )}
        {selected.map(cid => {
          const c = categories.find(cat => cat.id === cid);
          return (
            <span key={cid} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', padding: '2px 6px', borderRadius: 4, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
              {c?.name || cid.slice(0, 8)}
              <button onClick={() => toggle(cid)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280', fontSize: '0.72rem', lineHeight: 1 }}>x</button>
            </span>
          );
        })}
      </div>
      {loading ? (
        <div style={{ padding: '8px', textAlign: 'center', color: '#6b7280', fontSize: '0.78rem' }}>Loading categories...</div>
      ) : categories.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          {categories.map(c => {
            const isSelected = selected.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                style={{
                  fontSize: '0.68rem',
                  padding: '3px 10px',
                  borderRadius: 999,
                  border: '1px solid ' + (isSelected ? 'var(--primary)' : 'var(--border)'),
                  background: isSelected ? 'var(--primary)' : '#fff',
                  color: isSelected ? '#fff' : 'var(--text-main)',
                  cursor: 'pointer',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'all 0.15s',
                }}
              >
                {c.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

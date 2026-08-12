import { useState, useEffect, useCallback, useRef } from 'react';
import { curatedLooksAPI } from '../../api/curatedLooks';
import { settingsAPI } from '../../api/settings';
import { adminAPI } from '../../api/admin';
import { PageSkeleton } from '../../components/admin/pageSkeletonConfig';
import toast from '../../utils/toast';
import ImageUploadZone from '../../components/common/ImageUploadZone';
import { getImageUrl } from '../../utils/formatters';
import Pagination from '../../components/admin/Pagination';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import { downloadBlob } from '../../utils/download';
import AdminFormField from '../../components/admin/AdminFormField';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField } from '../../hooks/validationRules';
import { Eye, Ban, Download, Save, Palette, Image as ImageIcon, Edit, Plus, X, AlertTriangle, Lightbulb, Package } from 'lucide-react';

const EMPTY_FORM = {
  name: '',
  imageUrl: '',
  description: '',
  isActive: true,
};

const CURATED_LOOK_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'description', label: 'Description' },
  { key: 'displayOrder', label: 'Display Order' },
  { key: 'isActive', label: 'Active' },
  { key: 'createdAt', label: 'Created Date' },
];

// Module-level cache for product reference data
let _cachedProducts = null;

export default function CuratedLooksAdminPage() {
  const [looks, setLooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [looksEnabled, setLooksEnabled] = useState(true);
  const [togglingSection, setTogglingSection] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const pageSizeOptions = [10, 20, 50, 100];

  // ── Product Picker ──
  const [availableProducts, setAvailableProducts] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const productPickerRef = useRef(null);

  // ── Drag Reorder ──
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [orderChanged, setOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize, search: debouncedSearch || undefined };
      if (statusFilter !== 'all') {
        params.is_active = statusFilter === 'active';
      }
      const r = await curatedLooksAPI.getAll(params);
      const data = r.data?.data || r.data;
      const list = data?.items || data?.data || (Array.isArray(data) ? data : []);
      setLooks(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || {};
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / pageSize) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) {
      setError('Failed to load curated looks');
      console.warn('Failed to load curated looks:', e);
    } finally {
      setLoading(false);
    }
  };

  // Reset page when search or filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      load(1);
    }
  }, [debouncedSearch, statusFilter, pageSize]);

  // ── CSV Export State ──
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  // ── Load looksEnabled setting ──
  useEffect(() => {
    (async () => {
      try {
        const r = await settingsAPI.getSetting('curatedLooksEnabled');
        const val = r?.data?.data?.value;
        setLooksEnabled(val !== 'false' && val !== '0');
      } catch {
        // default to enabled
      }
    })();
  }, []);

  // ── Master toggle for entire curated looks section ──
  const handleToggleSection = async () => {
    setTogglingSection(true);
    const newState = !looksEnabled;
    try {
      await settingsAPI.updateSetting('curatedLooksEnabled', newState ? 'true' : 'false');
      setLooksEnabled(newState);
      toast.success(newState ? 'Curated looks section enabled on homepage' : 'Curated looks section disabled on homepage');
    } catch {
      toast.error('Failed to toggle curated looks section');
    }
    setTogglingSection(false);
  };

  // ── Reorder handlers ──
  const handleDragStart = useCallback((index) => {
    setDragIdx(index);
    setDragOverIdx(null);
  }, []);

  const handleDragEnter = useCallback((index) => {
    setDragOverIdx(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    const fromIdx = dragIdx;
    const toIdx = dragOverIdx;
    if (fromIdx === null || toIdx === null || fromIdx === toIdx) {
      setDragIdx(null);
      setDragOverIdx(null);
      return;
    }

    setLooks((prevLooks) => {
      const reordered = [...prevLooks];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      return reordered.map((look, i) => ({ ...look, display_order: i }));
    });

    setOrderChanged(true);
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, dragOverIdx]);

  const handleSaveOrder = useCallback(async () => {
    setSavingOrder(true);
    try {
      // Read latest looks from state via a fresh re-render
      const payload = looks.map((look) => ({ id: look.id, displayOrder: look.display_order }));
      await curatedLooksAPI.reorder(payload);
      toast.success('Order saved');
      setOrderChanged(false);
    } catch {
      toast.error('Failed to save order');
      await load(currentPage);
    } finally {
      setSavingOrder(false);
    }
  }, [looks, currentPage]);

  const handleResetOrder = useCallback(async () => {
    await load(currentPage);
    setOrderChanged(false);
  }, [currentPage]);

  const loadProducts = useCallback(async () => {
    if (_cachedProducts) {
      setAvailableProducts(_cachedProducts);
      return;
    }
    setProductsLoading(true);
    try {
      const r = await adminAPI.getProducts({ limit: 200 });
      const data = r.data?.data || r.data;
      const list = data?.items || data?.products || data?.data || (Array.isArray(data) ? data : []);
      const normalized = Array.isArray(list) ? list : [];
      _cachedProducts = normalized;
      setAvailableProducts(normalized);
    } catch {
      // silent — product loading is non-critical
    } finally {
      setProductsLoading(false);
    }
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setSelectedProductIds([]);
    setProductSearch('');
    loadProducts();
    setShowModal(true);
  };

  const openEdit = (look) => {
    setEditing(look);
    setForm({
      name: look.name || '',
      imageUrl: look.image_url || '',
      description: look.description || '',
      isActive: look.is_active !== undefined ? look.is_active : true,
    });
    setSelectedProductIds((look.products || []).map((p) => p.id));
    setProductSearch('');
    loadProducts();
    setShowModal(true);
  };

  const handleToggleProduct = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const validation = useAdminFormValidation({
    name: requiredField('Name'),
  });

  const handleSave = async () => {
    if (!validation.validateForm(form)) {
      return;
    }
    try {
      const payload = {
        name: form.name,
        imageUrl: form.imageUrl,
        description: form.description,
        isActive: form.isActive,
      };

      let savedId;
      if (editing) {
        await curatedLooksAPI.update(editing.id, payload);
        savedId = editing.id;
      } else {
        const res = await curatedLooksAPI.create(payload);
        savedId = res.data?.data?.id || res.data?.id;
      }

      // Sync selected products
      if (savedId && selectedProductIds.length > 0) {
        await curatedLooksAPI.syncProducts(savedId, selectedProductIds);
      }

      toast.success(editing ? 'Curated look updated' : 'Curated look created');
      await load(currentPage);
      setShowModal(false);
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleToggle = async (id) => {
    try {
      const look = looks.find((l) => l.id === id);
      if (!look) return;
      await curatedLooksAPI.update(id, {
        name: look.name,
        imageUrl: look.image_url,
        description: look.description,
        isActive: !look.is_active,
      });
      toast.success(look.is_active ? 'Disabled' : 'Enabled');
      await load(currentPage);
    } catch {
      toast.error('Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this curated look?')) return;
    try {
      await curatedLooksAPI.delete(id);
      setLooks(looks.filter((l) => l.id !== id));
      toast.success('Deleted');
      await load(currentPage);
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div>
          <h2>Curated Looks</h2>
          <p>Manage curated collections shown on the homepage</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className={`btn-sm ${looksEnabled ? 'btn-ghost' : 'btn-dark'}`}
            onClick={handleToggleSection}
            disabled={togglingSection}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '0.5rem',
              border: looksEnabled ? '1px solid var(--border)' : 'none',
              background: looksEnabled ? 'transparent' : '#ef4444',
              color: looksEnabled ? 'var(--text-muted)' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { if (looksEnabled) e.currentTarget.style.background = '#fee2e2'; }}
            onMouseLeave={(e) => { if (looksEnabled) e.currentTarget.style.background = 'transparent'; }}
          >
            {togglingSection ? (
              <span className="spinner" style={{ width: 12, height: 12, borderColor: looksEnabled ? '#ef4444' : '#fff', borderTopColor: 'transparent' }} />
            ) : looksEnabled ? (
              <Eye size={16} />
            ) : (
              <Ban size={16} />
            )}
            {looksEnabled ? 'Disable Section' : 'Enable Section'}
          </button>
          <button className="btn-dark btn-sm" onClick={openCreate}>
            + Add Look
          </button>
          <button className="btn-dark btn-sm" onClick={() => setShowExportModal(true)}><Download size={14} /> Export CSV</button>
        </div>
      </div>

      {!looksEnabled && (
        <div className="admin-alert warning mb-4">
          <span className="admin-alert-icon"><Lightbulb size={16} /></span>
          <div className="admin-alert-body">
            <div>The curated looks section is currently <strong>hidden</strong> from the homepage. Click <strong>"Enable Section"</strong> above to show it.</div>
          </div>
        </div>
      )}

      {error && (
        <div className="admin-alert danger mb-4">
          <span className="admin-alert-icon"><AlertTriangle size={16} /></span>
          <div className="admin-alert-body">
            <div className="admin-alert-title">Error Loading Data</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      {loading ? <PageSkeleton page="curated-looks" /> : (
      <div className="table-card">
        <div className="table-toolbar">
          <input
            className="table-search"
            placeholder="Search looks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="table-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              marginLeft: '0.5rem',
              padding: '0.4rem 0.6rem',
              fontSize: '0.8rem',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--white)',
              color: 'var(--charcoal)',
              cursor: 'pointer',
            }}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <span className="table-count">{totalItems} looks</span>

        {orderChanged && (
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600, whiteSpace: 'nowrap' }}>
              ⚠ Order changed
            </span>
            <button
              className="btn-ghost btn-sm"
              onClick={handleResetOrder}
              disabled={savingOrder}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }}
            >
              Reset
            </button>
            <button
              className="btn-dark btn-sm"
              onClick={handleSaveOrder}
              disabled={savingOrder}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            >
              {savingOrder ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Save size={14} />}
              {savingOrder ? 'Saving...' : 'Save Order'}
            </button>
          </div>
        )}
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Image</th>
              <th>Name</th>
              <th>Description</th>
              <th>Order</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {looks.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state-icon"><Palette size={40} /></div>
                    <h3>No curated looks yet</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                      Add your first curated look to showcase collections on the homepage.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              looks.map((look, idx) => (
                <tr
                  key={look.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragEnter={() => handleDragEnter(idx)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  style={{
                    cursor: 'default',
                    opacity: dragIdx === idx ? 0.4 : dragOverIdx === idx ? 0.8 : 1,
                    background:
                      dragIdx === idx
                        ? 'var(--bg-muted, #f0f0f0)'
                        : dragOverIdx === idx
                        ? '#fafafa'
                        : undefined,
                    borderTop: dragOverIdx === idx ? '2px solid var(--primary)' : undefined,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <td style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem', padding: '0.4rem 0.25rem' }}>
                    <span
                      title="Drag to reorder"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'grab',
                        color: dragIdx === idx ? 'var(--primary)' : '#bbb',
                        transition: 'color 0.15s',
                        lineHeight: 1,
                        userSelect: 'none',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--primary)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = dragIdx === idx ? 'var(--primary)' : '#bbb'; }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="5" cy="3" r="1.5" />
                        <circle cx="11" cy="3" r="1.5" />
                        <circle cx="5" cy="8" r="1.5" />
                        <circle cx="11" cy="8" r="1.5" />
                        <circle cx="5" cy="13" r="1.5" />
                        <circle cx="11" cy="13" r="1.5" />
                      </svg>
                    </span>
                  </td>
                  <td>
                    {look.image_url ? (
                      <img
                        loading="lazy"
                        src={getImageUrl(look.image_url)}
                        alt={look.name}
                        style={{
                          width: 60,
                          height: 60,
                          objectFit: 'cover',
                          borderRadius: 8,
                          background: '#f5f5f5',
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 60,
                          height: 60,
                          borderRadius: 8,
                          background: '#f5f5f5',
                        }}
                      >
                        <ImageIcon size={24} />
                      </span>
                    )}
                  </td>
                  <td>
                    <strong>{look.name}</strong>
                    {look.slug && (
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{look.slug}</div>
                    )}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.82rem', maxWidth: 280 }}>
                    {look.description || <span style={{ fontStyle: 'italic' }}>No description</span>}
                  </td>
                  <td>
                    <span className="status-badge status-info" style={{ fontSize: '0.72rem' }}>
                      #{look.display_order ?? idx}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        look.is_active !== false ? 'status-active' : 'status-inactive'
                      }`}
                    >
                      {look.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-edit" onClick={() => openEdit(look)}>
                        Edit
                      </button>
                      <button
                        className={look.is_active !== false ? 'btn-del' : 'btn-approve'}
                        onClick={() => handleToggle(look.id)}
                      >
                        {look.is_active !== false ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn-del" onClick={() => handleDelete(look.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
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

      {showModal && (
        <div
          className="modal-overlay open"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="modal" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h3>{editing ? <><Edit size={18} /> Edit Curated Look</> : <><Plus size={18} /> New Curated Look</>}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group form-full">
                  <ImageUploadZone
                    label="Look Image"
                    value={form.imageUrl}
                    onChange={(url) => setForm({ ...form, imageUrl: url })}
                    multiple={false}
                  />
                </div>

                <div className="form-group form-full">
                  <label>Or paste an image URL</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      value={form.imageUrl}
                      onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/photo-..."
                      style={{ flex: 1 }}
                    />
                    {form.imageUrl && (
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => setForm({ ...form, imageUrl: '' })}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', flexShrink: 0 }}
                      >
                        <X size={14} /> Clear
                      </button>
                    )}
                  </div>
                  {form.imageUrl && !form.imageUrl.startsWith('blob:') && !form.imageUrl.startsWith('data:') && (
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                      URL pasted — preview shown below
                    </div>
                  )}
                </div>

                <AdminFormField label="Name" required error={validation.errors.name} valid={validation.validFields.name}>
                  <input
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      validation.handleChange('name', e.target.value);
                    }}
                    placeholder="e.g. Summer Essentials"
                  />
                </AdminFormField>

                <div className="form-group">
                  <label>Active</label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontWeight: 400,
                      fontSize: '0.85rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
                    />
                    {form.isActive ? 'Visible on homepage' : 'Hidden from homepage'}
                  </label>
                </div>

                <div className="form-group form-full">
                  <label>Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="A brief description of this curated look..."
                  />
                </div>

                {form.imageUrl && (
                  <div className="form-group form-full">
                    <label>Preview</label>
                    <div
                      style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        maxWidth: '100%',
                        background: '#f9f9f9',
                      }}
                    >
                      <img
                        src={getImageUrl(form.imageUrl)}
                        alt="Preview"
                        style={{
                          width: '100%',
                          maxHeight: 240,
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Product Picker Section */}
                <div className="form-group form-full" ref={productPickerRef}>
                  <label>
                    Products in this look{' '}
                    <span style={{ fontWeight: 400, fontSize: '0.7rem', color: 'var(--muted)' }}>
                      ({selectedProductIds.length} selected)
                    </span>
                  </label>
                  <input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search products to add..."
                    style={{ marginBottom: '0.5rem', fontSize: '0.8rem' }}
                  />
                  <div
                    style={{
                      maxHeight: '220px',
                      overflowY: 'auto',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      background: 'var(--white)',
                    }}
                  >
                    {productsLoading ? (
                      <div style={{ padding: '1rem', textAlign: 'center' }}>
                        <div className="spinner" style={{ width: 20, height: 20, margin: '0 auto' }} />
                      </div>
                    ) : availableProducts.length === 0 ? (
                      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>
                        No products found
                      </div>
                    ) : (
                      availableProducts
                        .filter(
                          (p) =>
                            !productSearch ||
                            p.name?.toLowerCase().includes(productSearch.toLowerCase())
                        )
                        .slice(0, 50)
                        .map((p) => {
                          const selected = selectedProductIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.45rem 0.75rem',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                background: selected ? 'rgba(255,107,0,0.06)' : 'transparent',
                                borderBottom: '1px solid var(--border)',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={(e) =>
                                !selected && (e.currentTarget.style.background = '#f8f8f8')
                              }
                              onMouseLeave={(e) =>
                                !selected && (e.currentTarget.style.background = 'transparent')
                              }
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => handleToggleProduct(p.id)}
                                style={{
                                  width: '16px',
                                  height: '16px',
                                  accentColor: 'var(--primary)',
                                  flexShrink: 0,
                                }}
                              />
                              {p.images?.[0]?.url || p.image_url ? (
                                <img
                                  src={getImageUrl(p.images?.[0]?.url || p.image_url)}
                                  alt=""
                                  style={{
                                    width: 32,
                                    height: 32,
                                    objectFit: 'cover',
                                    borderRadius: 4,
                                    flexShrink: 0,
                                  }}
                                />
                              ) : (
                                <span
                                  style={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 4,
                                    background: '#f0f0f0',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Package size={16} />
                                </span>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: selected ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {p.name}
                                </div>
                                <div style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
                                  ₹{p.price} · {p.slug}
                                </div>
                              </div>
                              {selected && (
                                <span style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 600, flexShrink: 0 }}>
                                  Selected
                                </span>
                              )}
                            </label>
                          );
                        })
                    )}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                    Showing up to 50 products matching search. Scroll for more.
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-dark btn-sm" onClick={handleSave}>
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSV Export Modal */}
      <ExportCSVModal
        isOpen={showExportModal}
        onClose={() => { setShowExportModal(false); setExportStatus(null); setExportError(null); }}
        columns={CURATED_LOOK_COLUMNS}
        onExport={async (selectedColumns) => {
          setExporting(true);
          setExportStatus('dispatching');
          setExportError(null);
          try {
            const res = await adminAPI.dispatchExport({
              type: 'curated-looks',
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
                  downloadBlob(dlRes, `curated-looks-export-${new Date().toISOString().split('T')[0]}.csv`);
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

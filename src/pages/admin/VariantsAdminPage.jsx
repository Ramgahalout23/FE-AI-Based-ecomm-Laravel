import { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../../api/admin';
import { productsAPI } from '../../api/products';
import { aiAPI } from '../../api/ai';
import { formatCurrency, getImageUrl } from '../../utils/formatters';
import toast from '../../utils/toast';
import ImageUploadZone from '../../components/common/ImageUploadZone';

const EMPTY = { sku: '', price: '', stock: '', color: '', size: '', images: '', description: '', productId: '' };

/* ── Inline Product Selector for create modal ── */
function ProductSelector({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await adminAPI.getProducts({ search: query, limit: 8 });
        const list = res.data?.data?.products || res.data?.products || res.data?.data || [];
        setResults(Array.isArray(list) ? list : []);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const selected = results.find(p => p.id === value);

  return (
    <div style={{ position: 'relative' }}>
      <input
        placeholder="Search for a product..."
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)', fontSize: '0.85rem', outline: 'none' }}
        autoComplete="off"
      />
      {value && !query && (
        <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>
          ✓ {selected?.name || 'Product selected'}
        </div>
      )}
      {open && query && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 8, border: '1px solid var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, maxHeight: 240, overflow: 'auto', marginTop: 4 }}>
          {loading ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>Searching...</div>
          ) : results.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>No products found</div>
          ) : results.map(p => (
            <button
              key={p.id}
              onClick={() => { onChange(p.id); setQuery(''); setOpen(false); }}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.6rem 0.75rem', border: 'none', background: value === p.id ? '#f3f4f6' : '#fff', cursor: 'pointer', fontSize: '0.85rem', borderBottom: '1px solid #f3f4f6' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
              onMouseLeave={e => e.currentTarget.style.background = value === p.id ? '#f3f4f6' : '#fff'}
            >
              <strong>{p.name}</strong>
              <span style={{ color: 'var(--muted)', fontSize: '0.72rem', marginLeft: 8 }}>{p.sku || ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function VariantsAdminPage() {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
      const r = await adminAPI.getAllVariants(params);
      const body = r.data || {};
      const data = body.data || body;  // Laravel pagination envelope or raw response
      const list = data?.data || data?.variants || data?.items || [];
      setVariants(Array.isArray(list) ? list : []);
      const pag = data || {};
      setCurrentPage(pag.current_page || page);
      setTotalPages(pag.last_page || Math.ceil((pag.total || 0) / limit) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) { setError('Failed to load variants'); console.warn('Failed to load variants:', e); } finally { setLoading(false); }
  };

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  const openEdit = (v) => {
    const imgs = Array.isArray(v.images) ? v.images.join(', ') : '';
    setEditing(v);
    setForm({
      sku: v.sku || '',
      price: v.price || '',
      stock: v.quantity || v.stock || '',
      color: v.color || (v.attributes?.color) || '',
      size: v.size || (v.attributes?.size) || '',
      images: imgs,
      description: v.attributes?.description || '',
      productId: v.productId || '',
    });
    setShowModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowModal(true);
  };

  // ── AI Generation ──
  const [aiLoadingAuto, setAiLoadingAuto] = useState(false);
  const [viewProgress, setViewProgress] = useState(null); // { front: 'idle'|'generating'|'done'|'error', ... }
  const [referenceImageUrl, setReferenceImageUrl] = useState(''); // optional reference image for style matching
  const imageUrlMapRef = useRef({}); // collects image URLs from SSE events
  const progressTimeoutRef = useRef(null); // timeout for clearing progress after completion

  const viewLabels = { reference: '📷 Analyzing Reference', front: '📸 Front View', back: '📸 Back View', side: '📸 Side View', detail: '🔍 Detail Close-up' };
  const viewIcons = { reference: '🎯', front: '📸', back: '📸', side: '📸', detail: '🔍' };

  const handleAIAutoGenerate = async () => {
    if (!form.color && !form.size) { toast.error('Enter at least a color for context'); return; }
    if (!form.productId && !editing?.productId) { toast.error('First select a product'); return; }
    // Clear any previous progress-clearing timeout (prevents race conditions)
    if (progressTimeoutRef.current) clearTimeout(progressTimeoutRef.current);

    setAiLoadingAuto(true);
    const initialViews = { front: 'idle', back: 'idle', side: 'idle', detail: 'idle' };
    if (referenceImageUrl) initialViews.reference = 'idle';
    setViewProgress(initialViews);
    imageUrlMapRef.current = {};
    try {
      const productId = form.productId || editing?.productId;
      const productName = editing?.productName || 'Product';

      // 1. Generate description (non-streaming)
      const descPromise = aiAPI.generateVariantDescription({
        productId, productName, color: form.color, size: form.size, sku: form.sku,
      });

      // 2. Generate images with per-view progress streaming
      const imgPromise = aiAPI.generateVariantImagesStream(
        { productName, color: form.color, size: form.size, referenceImageUrl: referenceImageUrl || undefined },
        (event) => {
          // Track per-view progress state
          setViewProgress(prev => ({
            ...prev,
            [event.view]: event.status === 'generating' ? 'generating' : event.status === 'done' ? 'done' : 'error',
          }));
          // Collect image URLs as they complete
          if (event.status === 'done' && event.url) {
            imageUrlMapRef.current[event.view] = event.url;
          }
        }
      );

      const settled = await Promise.allSettled([descPromise, imgPromise]);

      let updates = { ...form };
      const parts = [];

      // Handle description result
      if (settled[0].status === 'fulfilled') {
        const descData = settled[0].value.data?.data || {};
        if (descData.description) {
          updates.description = descData.description;
          parts.push('✓ Description');
        }
      }

      // Handle images result — collect URLs from the ref
      if (settled[1].status === 'fulfilled') {
        const imageUrls = Object.values(imageUrlMapRef.current).filter(Boolean);
        if (imageUrls.length > 0) {
          const existing = form.images ? form.images.split(',').map(u => u.trim()).filter(Boolean) : [];
          updates.images = [...existing, ...imageUrls].join(', ');
          parts.push(`✓ ${imageUrls.length} images (front/back/side/detail)`);
        }
      }

      setForm(updates);

      if (parts.length > 0) {
        toast.success(`Auto-generated! ${parts.join(' ')}`, { duration: 5000 });
      } else {
        toast.error('Auto-generation completed but no content was returned');
      }
    } catch (err) {
      toast.error(err.message || 'AI auto-generation failed');
    } finally {
      setAiLoadingAuto(false);
      // Keep progress visible for 2s so the user can see the final checkmarks
      progressTimeoutRef.current = setTimeout(() => {
        setViewProgress(null);
        imageUrlMapRef.current = {};
        progressTimeoutRef.current = null;
      }, 2000);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        sku: form.sku,
        price: form.price ? Number(form.price) : undefined,
        stock: form.stock ? Number(form.stock) : 0,
        color: form.color,
        size: form.size,
        description: form.description || '',
        images: form.images ? form.images.split(',').map(u => u.trim()).filter(Boolean) : [],
      };
      if (editing) {
        await adminAPI.updateVariant(editing.id, payload);
        toast.success('Variant updated');
      } else {
        if (!form.productId) {
          toast.error('Please select a product');
          return;
        }
        await adminAPI.createVariant(form.productId, { ...payload, name: form.color || form.size || 'Variant' });
        toast.success('Variant created');
      }
      await load(currentPage);
      setShowModal(false);
    } catch { toast.error('Failed'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this variant?')) return;
    try { 
      await adminAPI.deleteVariant(id); 
      setVariants(variants.filter(v => v.id !== id)); 
      toast.success('Deleted'); 
      await load(currentPage);
    } catch { 
      toast.error('Failed'); 
    }
  };

  const handleBulkUpdate = async () => {
    const count = variants.filter(v => (v.quantity || 0) < 5).length;
    if (count === 0) { toast('No low-stock variants to restock'); return; }
    if (!confirm(`Restock all ${count} low-stock variants to 50 units each?`)) return;
    try {
      await adminAPI.bulkUpdateQty({ updates: variants.filter(v => (v.quantity || 0) < 5).map(v => ({ variantId: v.id, quantity: 50 })) });
      toast.success('Bulk quantity updated');
      await load(currentPage);
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div><h2>Product Variants</h2><p>Manage sizes, colors, stock, and color-specific images for variants</p></div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-dark btn-sm" onClick={openCreate}>+ New Variant</button>
          <button className="btn-dark btn-sm" onClick={handleBulkUpdate}>🔄 Bulk Restock</button>
        </div>
      </div>

      {variants.filter(v => (v.quantity || 0) < 5).length > 0 && (
        <div className="admin-alert warning">
          <span className="admin-alert-icon">⚠️</span>
          <div className="admin-alert-body">
            <div className="admin-alert-title">Low Stock Variants</div>
            <div>{variants.filter(v => (v.quantity || 0) < 5).length} variants have low stock levels.</div>
          </div>
        </div>
      )}

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">⚠️</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search variants..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
          <span className="table-count">{totalItems} variants</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Image</th><th>Product</th><th>Variant</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr> :
            variants.length === 0 ? <tr><td colSpan={8}><div className="empty-state"><div className="empty-state-icon">🎨</div><h3>No variants found</h3></div></td></tr> :
            variants.map(v => {
              const firstImg = Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : null;
              return (
              <tr key={v.id}>
                <td>
                  <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {firstImg ? (
                      <img loading="lazy" src={getImageUrl(firstImg)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: '1.2rem', opacity: 0.3 }}>🎨</span>
                    )}
                  </div>
                </td>
                <td><strong>{v.productName || '—'}</strong></td>
                <td>{v.name || `${v.color || ''} ${v.size || ''}`.trim() || '—'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{v.sku || '—'}</td>
                <td><strong>{formatCurrency(v.price)}</strong></td>
                <td><strong style={{ color: (v.quantity || 0) < 5 ? 'var(--danger)' : 'var(--charcoal)' }}>{v.quantity || v.stock || 0}</strong></td>
                <td><span className={`status-badge ${(v.quantity || 0) < 5 ? 'status-pending' : 'status-active'}`}>{(v.quantity || 0) < 5 ? 'Low Stock' : 'In Stock'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn-edit" onClick={() => openEdit(v)}>Edit</button>
                    <button className="btn-del" onClick={() => handleDelete(v.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} variants)</span>
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
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>{editing ? '✏️ Edit Variant' : '➕ New Variant'}</h3>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  onClick={handleAIAutoGenerate}
                  disabled={aiLoadingAuto}
                  className="btn-ghost btn-sm"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', color: '#7c3aed', border: '1px solid #7c3aed', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.3rem', background: aiLoadingAuto ? '#f5f3ff' : '#fff', cursor: 'pointer' }}
                  title="Auto-generate description + front/back/side/detail images with AI"
                >
                  {aiLoadingAuto ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✨'} {aiLoadingAuto ? 'AI Generating...' : 'Auto Generate'}
                </button>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                {/* Product selector — only in create mode */}
                {!editing && (
                  <div className="form-group form-full">
                    <label>Product *</label>
                    <ProductSelector
                      value={form.productId}
                      onChange={pid => setForm({ ...form, productId: pid })}
                    />
                  </div>
                )}
                <div className="form-group"><label>SKU</label><input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="e.g. TEE-BLK-M" /></div>
                <div className="form-group"><label>Price</label><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="599" /></div>
                <div className="form-group"><label>Stock</label><input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="50" /></div>
                <div className="form-group"><label>Color</label><input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} placeholder="e.g. Black, Navy" /></div>
                <div className="form-group"><label>Size</label><input value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} placeholder="e.g. M, L, XL" /></div>
                <div className="form-group form-full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Variant Description</label>
                    <span style={{ fontSize: '0.65rem', color: '#7c3aed', opacity: 0.7 }}>✨ Auto-generates with button above</span>
                  </div>
                  <textarea rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Variant description (AI-generated or custom)..." style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit' }} />
                </div>
                {/* Per-view AI progress indicator */}
                {viewProgress && (
                  <div className="form-group form-full" style={{ background: '#faf5ff', borderRadius: 8, padding: '0.75rem', border: '1px solid #e9d5ff' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#7c3aed', marginBottom: '0.5rem', display: 'block' }}>🎯 AI Image Generation Progress</label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {Object.keys(viewProgress).map(key => {
                        const label = viewLabels[key] || key;
                        const status = viewProgress[key];
                        const icon = viewIcons[key] || '📸';
                        let statusIcon, statusColor;
                        if (status === 'generating') {
                          statusIcon = <span className="spinner" style={{ width: 10, height: 10, display: 'inline-block' }} />;
                          statusColor = '#7c3aed';
                        } else if (status === 'done') {
                          statusIcon = '✅';
                          statusColor = '#16a34a';
                        } else if (status === 'error') {
                          statusIcon = '❌';
                          statusColor = '#ef4444';
                        } else {
                          statusIcon = '⬜';
                          statusColor = '#9ca3af';
                        }
                        return (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
                            <span>{icon}</span>
                            <span style={{ flex: 1 }}>{label}</span>
                            <span style={{ color: statusColor, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              {statusIcon}
                              {status === 'generating' ? 'Generating...' : status === 'done' ? 'Done' : status === 'error' ? 'Failed' : 'Waiting'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Reference Image Upload (optional) */}
                <div className="form-group form-full" style={{ background: '#f0f9ff', borderRadius: 8, padding: '0.75rem', border: '1px solid #bae6fd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369a1', margin: 0 }}>🎯 Reference Image (Optional)</label>
                    <span style={{ fontSize: '0.65rem', color: '#0369a1', opacity: 0.7 }}>
                      AI will match this style/pose/lighting
                    </span>
                  </div>
                  <p style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                    Upload a product photo showing the style you want — AI will analyze its pose, lighting, composition, and background, then generate all variant images in the same style.
                  </p>
                  <ImageUploadZone
                    label=""
                    value={referenceImageUrl}
                    onChange={setReferenceImageUrl}
                    multiple={false}
                  />
                  {referenceImageUrl && (
                    <div style={{ fontSize: '0.7rem', color: '#0369a1', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span>📎 Reference set</span>
                      <button
                        onClick={() => setReferenceImageUrl('')}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', padding: 0 }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
                <div className="form-group form-full">
                  <ImageUploadZone
                    label="Variant Images (Front, Back, Side, Detail)"
                    value={form.images}
                    onChange={urls => setForm({ ...form, images: urls })}
                    multiple={true}
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-dark btn-sm" onClick={handleSave}>{editing ? 'Update Variant' : 'Create Variant'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

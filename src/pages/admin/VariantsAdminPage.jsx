import { Search, X, Download } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
;
import Pagination from '../../components/admin/Pagination';
import { adminAPI } from '../../api/admin';
import { aiAPI } from '../../api/ai';
import { inventoryAPI } from '../../api/inventory';
import { formatCurrency, getImageUrl } from '../../utils/formatters';
import { getColorHex } from '../../utils/constants';
import { downloadBlob } from '../../utils/download';
import toast from '../../utils/toast';
import ImageUploadZone from '../../components/common/ImageUploadZone';
import AdminPageShell from '../../components/admin/AdminPageShell';
import AdminFormField from '../../components/admin/AdminFormField';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField } from '../../hooks/validationRules';

const EMPTY = { sku: '', price: '', stock: '', color: '', size: '', images: '', description: '', productId: '' };

/* ── Premium Searchable Product Filter for Table Toolbar ── */
function ProductFilter({ value, onChange, products }) {
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

  const selectedProduct = value ? products.find(p => p.id === value) : null;

  return (
    <div style={{ position: 'relative', minWidth: 220, maxWidth: 300 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.45rem 0.65rem',
        borderRadius: 'var(--radius-md)',
        border: `1.5px solid ${value ? 'var(--gold)' : 'var(--border)'}`,
        background: 'var(--surface)',
        transition: 'all 0.2s ease',
        boxShadow: value ? '0 0 0 3px rgba(201,169,110,0.08)' : 'none',
      }}>
        <Search size={14} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <input
          placeholder={selectedProduct ? selectedProduct.name : 'Filter by product...'}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={{
            border: 'none',
            outline: 'none',
            flex: 1,
            fontSize: '0.78rem',
            background: 'transparent',
            color: 'var(--charcoal)',
            minWidth: 0,
            fontWeight: selectedProduct ? 500 : 400,
          }}
          autoComplete="off"
        />
        {value && (
          <button
            onClick={e => { e.stopPropagation(); onChange(''); setQuery(''); }}
            title="Clear product filter"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--muted)', padding: '0.15rem', display: 'flex',
              flexShrink: 0, borderRadius: '50%',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(192,57,43,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (query || results.length > 0) && (
        <>
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            marginTop: 4, background: '#fff',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 100, maxHeight: 280, overflow: 'auto',
            padding: '0.25rem 0',
          }}>
            {loading ? (
              <div style={{ padding: '1rem', textAlign: 'center' }}>
                <div className="spinner" style={{ width: 16, height: 16, margin: '0 auto' }} />
              </div>
            ) : results.length === 0 ? (
              <div style={{ padding: '0.75rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.75rem' }}>
                No products found
              </div>
            ) : results.map(p => (
              <button
                key={p.id}
                onClick={() => { onChange(p.id); setQuery(''); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  width: '100%', textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  border: 'none',
                  borderLeft: `3px solid ${value === p.id ? 'var(--gold)' : 'transparent'}`,
                  background: value === p.id ? 'rgba(201,169,110,0.08)' : '#fff',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  transition: 'all 0.1s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f0'; }}
                onMouseLeave={e => { e.currentTarget.style.background = value === p.id ? 'rgba(201,169,110,0.08)' : '#fff'; }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontWeight: 600, fontSize: '0.8rem', color: 'var(--charcoal)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {p.name}
                  </div>
                  {p.sku && (
                    <div style={{ fontSize: '0.62rem', color: 'var(--muted)', fontFamily: 'monospace', marginTop: 1 }}>
                      {p.sku}
                    </div>
                  )}
                </div>
                {p.category?.name && (
                  <span style={{
                    fontSize: '0.6rem', color: 'var(--muted)',
                    background: '#f3f4f6', padding: '0.1rem 0.45rem',
                    borderRadius: 4, flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}>
                    {p.category.name}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
        </>
      )}
    </div>
  );
}

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

// Module-level cache — survives StrictMode double-mount and re-navigation within the session
let _cachedProducts = null;

export default function VariantsAdminPage() {
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [products, setProducts] = useState([]);

  // Prevent duplicate fetch on StrictMode double-mount
  const fetchedRef = useRef(false);

  // Load product list for filter dropdown (cached to avoid redundant fetches)
  useEffect(() => {
    if (_cachedProducts) {
      setProducts(_cachedProducts);
      return;
    }
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      try {
        const res = await adminAPI.getProducts({ limit: 200, page: 1 });
        const list = res.data?.data?.products || res.data?.products || res.data?.data || [];
        const normalized = Array.isArray(list) ? list : [];
        _cachedProducts = normalized;
        setProducts(normalized);
      } catch { /* non-critical */ }
    })();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Batch barcode selection
  const [selectedVariantIds, setSelectedVariantIds] = useState(new Set());
  const [batchBarcoding, setBatchBarcoding] = useState(false);
  const [barcodeProgress, setBarcodeProgress] = useState({ attempts: 0, maxAttempts: 30 });

  const toggleVariantSelection = (variantId) => {
    setSelectedVariantIds(prev => {
      const next = new Set(prev);
      if (next.has(variantId)) next.delete(variantId);
      else next.add(variantId);
      return next;
    });
  };

  const toggleAllVariants = () => {
    const allIds = new Set(variants.map(v => v.id));
    setSelectedVariantIds(prev => prev.size === allIds.size ? new Set() : allIds);
  };

  const handleBatchBarcodeDownload = async () => {
    if (selectedVariantIds.size === 0) {
      toast.error('Select at least one variant');
      return;
    }
    setBatchBarcoding(true);
    try {
      // 1. Dispatch background job
      const dispatchRes = await inventoryAPI.dispatchBatchBarcodeLabels([...selectedVariantIds]);
      const { batch_id, variant_count } = dispatchRes.data?.data || {};
      if (!batch_id) {
        toast.error('Failed to start barcode generation');
        setBatchBarcoding(false);
        return;
      }

      toast('⏳ Generating barcodes in background...');

      // 2. Poll for completion (max 60 seconds)
      let attempts = 0;
      const maxAttempts = 30;
      let ready = false;
      setBarcodeProgress({ attempts: 0, maxAttempts });

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000));
        attempts++;
        setBarcodeProgress({ attempts, maxAttempts });

        try {
          const statusRes = await inventoryAPI.getBarcodeBatchStatus(batch_id);
          const status = statusRes.data?.data?.status;

          if (status === 'ready') {
            ready = true;
            break;
          }
          if (status === 'failed') {
            toast.error('Barcode generation failed');
            setBatchBarcoding(false);
            setBarcodeProgress({ attempts: 0, maxAttempts });
            return;
          }
        } catch {
          // Continue polling on transient errors
        }
      }

      if (!ready) {
        toast.error('Barcode generation timed out. Check the queue worker is running.');
        setBatchBarcoding(false);
        setBarcodeProgress({ attempts: 0, maxAttempts: 30 });
        return;
      }

      // 3. Download the completed PDF
      const downloadRes = await inventoryAPI.downloadBarcodeBatch(batch_id);
      downloadBlob(downloadRes, `barcode-variants-${variant_count}-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(`Downloaded barcodes for ${variant_count} variant(s)`);
      setSelectedVariantIds(new Set());
    } catch {
      toast.error('Failed to download batch barcodes');
    } finally {
      setBatchBarcoding(false);
      setBarcodeProgress({ attempts: 0, maxAttempts: 30 });
    }
  };

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
        search: debouncedSearch || undefined,
        product_id: productFilter || undefined
      };
      const r = await adminAPI.getAllVariants(params);
      const body = r.data || {};
      const data = body.data || body;  // Laravel pagination envelope or raw response
      const list = data?.data || data?.variants || data?.items || [];
      setVariants(Array.isArray(list) ? list : []);
      const pag = data || {};
      setCurrentPage(pag.current_page || page);
      setTotalPages(pag.last_page || Math.ceil((pag.total || 0) / pageSize) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) { setError('Failed to load variants'); console.warn('Failed to load variants:', e); } finally { setLoading(false); }
  };

  // Reset to page 1 when search, product filter, or page size changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, productFilter, pageSize]);

  useEffect(() => {
    load(currentPage);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    validation.reset();
    setShowModal(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    validation.reset();
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
      const productName = editing?.product?.name || editing?.productName || 'Product';

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

  // ── Inline form validation ──
  const validation = useAdminFormValidation({
    sku: requiredField('SKU'),
    price: requiredField('Price'),
    stock: requiredField('Stock'),
  });

  const handleSave = async () => {
    if (!validation.validateForm(form)) return;
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
      <AdminPageShell
        title="Product Variants"
        subtitle="Manage sizes, colors, stock, and color-specific images for variants"
        loading={loading}
        error={error}
        page="variants"
        actions={
          <>
            <button className="btn-dark btn-sm" onClick={openCreate}>+ New Variant</button>
            <button className="btn-dark btn-sm" onClick={handleBulkUpdate}>🔄 Bulk Restock</button>
          </>
        }
      >
      {variants.filter(v => (v.quantity || 0) < 5).length > 0 && (
        <div className="admin-alert warning">
          <span className="admin-alert-icon">⚠️</span>
          <div className="admin-alert-body">
            <div className="admin-alert-title">Low Stock Variants</div>
            <div>{variants.filter(v => (v.quantity || 0) < 5).length} variants have low stock levels.</div>
          </div>
        </div>
      )}
      <div className="table-card">
        <div className="table-toolbar" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ color: 'var(--muted)', flexShrink: 0, marginLeft: '0.15rem' }} />
            <input
              className="table-search"
              placeholder="Search by SKU, name, color..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Active filter indicator pill */}
          {productFilter && (
            <span style={{
              fontSize: '0.6rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--gold)',
              background: 'rgba(201,169,110,0.1)',
              padding: '0.15rem 0.5rem',
              borderRadius: 10,
              border: '1px solid rgba(201,169,110,0.2)',
              whiteSpace: 'nowrap',
            }}>
              Product
            </span>
          )}

          <ProductFilter
            value={productFilter}
            onChange={setProductFilter}
            products={products}
          />

          {productFilter && (
            <button
              onClick={() => setProductFilter('')}
              title="Clear all filters"
              style={{
                display: 'flex', alignItems: 'center', gap: '0.3rem',
                padding: '0.35rem 0.65rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                cursor: 'pointer',
                fontSize: '0.72rem',
                color: 'var(--muted)',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'rgba(192,57,43,0.3)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <X size={12} /> Clear
            </button>
          )}

          <div style={{
            width: 1, height: 24, background: 'var(--border)',
            margin: '0 0.15rem', flexShrink: 0,
          }} />

          <span className="table-count" style={{ fontWeight: 500 }}>
            {totalItems} variant{totalItems !== 1 ? 's' : ''}
          </span>

          {/* Export button */}
          <button
            onClick={() => toast('Export coming soon')}
            title="Export variants as CSV"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(39,174,96,0.3)',
              background: '#f0fdf4',
              color: '#16a34a',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              whiteSpace: 'nowrap',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#dcfce7'; e.currentTarget.style.borderColor = '#16a34a'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.borderColor = 'rgba(39,174,96,0.3)'; }}
          >
            <Download size={13} /> Export
          </button>
        </div>
        <table className="admin-table">
          <thead><tr>
            <th style={{ textAlign: 'center', width: 32 }}>
              <input
                type="checkbox"
                checked={selectedVariantIds.size > 0 && variants.length > 0 && variants.every(v => selectedVariantIds.has(v.id))}
                onChange={toggleAllVariants}
                title="Select all variants on this page"
                style={{ cursor: 'pointer' }}
              />
            </th>
            <th>Image</th><th>Product</th><th>Variant</th><th>SKU</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {variants.length === 0 ? <tr><td colSpan={9}><div className="empty-state"><div className="empty-state-icon">🎨</div><h3>No variants found</h3></div></td></tr> :
            variants.map(v => {
              const variantImages = Array.isArray(v.images) ? v.images.filter(Boolean) : [];
              const firstImg = variantImages.length > 0 ? variantImages[0] : null;
              const variantColor = v.color || v.attributes?.color || '';
              return (
              <tr key={v.id} style={{ background: selectedVariantIds.has(v.id) ? '#eef2ff' : 'transparent' }}>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedVariantIds.has(v.id)}
                    onChange={() => toggleVariantSelection(v.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div
                      style={{ position: 'relative', width: 52, height: 52, borderRadius: 10, overflow: 'hidden', background: '#f3f4f6', border: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      {firstImg ? (
                        <img loading="lazy" src={getImageUrl(firstImg)} alt={variantColor || 'variant'} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.2s ease' }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }} />
                      ) : (
                        <span style={{ fontSize: '1.2rem', opacity: 0.3 }}>🎨</span>
                      )}
                      {variantImages.length > 1 && (
                        <span style={{ position: 'absolute', right: 3, bottom: 3, background: 'rgba(0,0,0,0.65)', color: '#fff', fontSize: '0.55rem', fontWeight: 700, borderRadius: 6, padding: '1px 5px', pointerEvents: 'none' }}>
                          {variantImages.length}
                        </span>
                      )}
                    </div>
                    {variantColor && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 0 }}>
                        <span
                          style={{ width: 16, height: 16, borderRadius: '50%', background: getColorHex(variantColor), border: '1px solid rgba(0,0,0,0.15)', boxShadow: '0 1px 3px rgba(0,0,0,0.12)', flexShrink: 0 }}
                          title={variantColor}
                        />
                        <span style={{ fontSize: '0.6rem', color: 'var(--muted)', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.1 }}>
                          {variantColor}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td><strong>{v.product?.name || '—'}</strong></td>
                <td>{v.name || `${v.color || ''} ${v.size || ''}`.trim() || '—'}</td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{v.sku || '—'}</td>
                <td><strong>{formatCurrency(v.price)}</strong></td>
                <td><strong style={{ color: (v.quantity || 0) < 5 ? 'var(--danger)' : 'var(--charcoal)' }}>{v.quantity || v.stock || 0}</strong></td>
                <td><span className={`status-badge ${(v.quantity || 0) < 5 ? 'status-pending' : 'status-active'}`}>{(v.quantity || 0) < 5 ? 'Low Stock' : 'In Stock'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn-edit" onClick={() => openEdit(v)}>Edit</button>
                    <button
                      onClick={async () => {
                        try {
                          const res = await inventoryAPI.getVariantBarcodeLabel(v.id);
                          downloadBlob(res, `barcode-${v.sku || v.id}.pdf`);
                          toast.success('Barcode label downloaded');
                        } catch {
                          toast.error('Failed to download barcode');
                        }
                      }}
                      style={{
                        fontSize: '0.76rem',
                        padding: '0.4rem 0.65rem',
                        color: '#1a1a2e',
                        border: '1px solid rgba(26,26,46,0.3)',
                        borderRadius: 6,
                        background: '#f8f9fc',
                        cursor: 'pointer',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#1a1a2e'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#f8f9fc'; e.currentTarget.style.color = '#1a1a2e'; }}
                      title="Download Barcode Label"
                    >
                      🏷️
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await inventoryAPI.printVariantBarcodeLabel(v.id);
                        } catch { toast.error('Failed to open for printing'); }
                      }}
                      style={{
                        fontSize: '0.76rem',
                        padding: '0.4rem 0.65rem',
                        color: '#2563eb',
                        border: '1px solid rgba(37,99,235,0.3)',
                        borderRadius: 6,
                        background: '#eff6ff',
                        cursor: 'pointer',
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#2563eb'; e.currentTarget.style.color = '#fff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#2563eb'; }}
                      title="Open Barcode in New Tab for Printing"
                    >
                      🖨️
                    </button>
                    <button className="btn-del" onClick={() => handleDelete(v.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          itemLabel="variant"
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={pageSizeOptions}
        />
      </div>
      </AdminPageShell>

      {/* Batch Barcode Download Bar */}
      {selectedVariantIds.size > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#1a1a2e',
          color: '#fff',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          zIndex: 1000,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.3)',
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: '0.85rem' }}>
            <strong>{selectedVariantIds.size}</strong> variant{selectedVariantIds.size !== 1 ? 's' : ''} selected
          </span>

          {/* Progress bar during generation */}
          {batchBarcoding && (
            <div style={{
              flex: '1 1 100%',
              maxWidth: 400,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <div style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                background: '#374151',
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min((barcodeProgress.attempts / barcodeProgress.maxAttempts) * 100, 100)}%`,
                  borderRadius: 3,
                  background: 'linear-gradient(90deg, #22c55e, #16a34a)',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', whiteSpace: 'nowrap', minWidth: 140, textAlign: 'right' }}>
                {(() => {
                  const remaining = Math.round((barcodeProgress.maxAttempts - barcodeProgress.attempts) * 2);
                  return `${barcodeProgress.attempts}/${barcodeProgress.maxAttempts} — ~${remaining}s left`;
                })()}
              </span>
            </div>
          )}

          <button
            onClick={handleBatchBarcodeDownload}
            disabled={batchBarcoding}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              background: '#22c55e',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: batchBarcoding ? 'not-allowed' : 'pointer',
              opacity: batchBarcoding ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {batchBarcoding ? (
              <><span className="spinner" style={{ width: 12, height: 12 }} /> Waiting...</>
            ) : (
              <><span>🏷️</span> Download</>
            )}
          </button>
          <button
            onClick={async () => {
              if (selectedVariantIds.size === 0) return;
              setBatchBarcoding(true);
              try {
                const dispatchRes = await inventoryAPI.dispatchBatchBarcodeLabels([...selectedVariantIds]);
                const { batch_id } = dispatchRes.data?.data || {};
                if (!batch_id) { toast.error('Failed to start'); setBatchBarcoding(false); setBarcodeProgress({ attempts: 0, maxAttempts: 30 }); return; }
                toast('⏳ Opening for printing...');
                let attempts = 0;
                const maxAttempts = 30;
                setBarcodeProgress({ attempts: 0, maxAttempts });
                while (attempts < maxAttempts) {
                  await new Promise(r => setTimeout(r, 2000));
                  attempts++;
                  setBarcodeProgress({ attempts, maxAttempts });
                  try {
                    const statusRes = await inventoryAPI.getBarcodeBatchStatus(batch_id);
                    const status = statusRes.data?.data?.status;
                    if (status === 'ready') {
                      const downloadRes = await inventoryAPI.downloadBarcodeBatch(batch_id);
                      const blobUrl = URL.createObjectURL(downloadRes.data);
                      window.open(blobUrl, '_blank');
                      setSelectedVariantIds(new Set());
                      break;
                    }
                    if (status === 'failed') { toast.error('Generation failed'); break; }
                  } catch { /* noop */ }
                }
              } catch { toast.error('Failed'); }
              setBarcodeProgress({ attempts: 0, maxAttempts: 30 });
              setBatchBarcoding(false);
            }}
            disabled={batchBarcoding}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: 8,
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.82rem',
              cursor: batchBarcoding ? 'not-allowed' : 'pointer',
              opacity: batchBarcoding ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
            }}
          >
            {batchBarcoding ? (
              <><span className="spinner" style={{ width: 12, height: 12 }} /> Waiting...</>
            ) : (
              <><span>🖨️</span> Print</>
            )}
          </button>
          <button
            onClick={() => setSelectedVariantIds(new Set())}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: 8,
              background: 'transparent',
              color: '#9ca3af',
              border: '1px solid #4b5563',
              fontWeight: 500,
              fontSize: '0.78rem',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#6b7280'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = '#4b5563'; }}
          >
            Clear
          </button>
        </div>
      )}

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
                <AdminFormField label="SKU" required error={validation.errors.sku} valid={validation.validFields.sku}>
                  <input value={form.sku} onChange={e => { setForm({ ...form, sku: e.target.value }); validation.handleChange('sku', e.target.value); }} placeholder="e.g. TEE-BLK-M" />
                </AdminFormField>
                <AdminFormField label="Price" required error={validation.errors.price} valid={validation.validFields.price}>
                  <input type="number" value={form.price} onChange={e => { setForm({ ...form, price: e.target.value }); validation.handleChange('price', e.target.value); }} placeholder="599" />
                </AdminFormField>
                <AdminFormField label="Stock" required error={validation.errors.stock} valid={validation.validFields.stock}>
                  <input type="number" value={form.stock} onChange={e => { setForm({ ...form, stock: e.target.value }); validation.handleChange('stock', e.target.value); }} placeholder="50" />
                </AdminFormField>
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
                  <Image UploadZone label="" value={referenceImageUrl} onChange={setReferenceImageUrl} multiple={false} />
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

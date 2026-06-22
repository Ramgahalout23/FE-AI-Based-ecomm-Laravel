import { useState, useEffect, useRef } from 'react';
import { adminAPI } from '../../api/admin';
import { categoriesAPI } from '../../api/categories';
import { formatCurrency, getImageUrl, getProductImage, getProductImages } from '../../utils/formatters';
import toast from '../../utils/toast';
import ImageUploadZone from '../../components/common/ImageUploadZone';
import { aiAPI } from '../../api/ai';

const EMPTY = { name: '', price: '', oldPrice: '', cost: '', description: '', shortDescription: '', categoryId: '', sku: '', quantity: '', images: '', status: 'DRAFT', badge: '' };
const EMPTY_VARIANT = { sku: '', price: '', stock: '', color: '', size: '', images: '', description: '' };

export default function ProductsAdminPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [detail, setDetail] = useState(null);

  // Variants inline management
  const [productVariants, setProductVariants] = useState([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [showVariants, setShowVariants] = useState(false);
  const [newVariant, setNewVariant] = useState(EMPTY_VARIANT);
  const [addingVariant, setAddingVariant] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(10);

  // Search debouncing
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const load = async (page = 1) => {
    setLoading(true);
    try {
      // Load categories once if they are not already loaded
      let cats = categories;
      if (categories.length === 0) {
        const categoriesRes = await categoriesAPI.getAll();
        cats = categoriesRes.data?.data?.categories || categoriesRes.data?.categories || categoriesRes.data?.data || [];
        setCategories(Array.isArray(cats) ? cats : []);
      }

      const params = {
        page,
        per_page: limit,
        search: debouncedSearch || undefined
      };

      if (filter !== 'ALL') {
        if (['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(filter)) {
          params.status = filter;
        } else {
          // If filter matches a category name or ID
          const matchedCat = cats.find(c => c.name.toLowerCase() === filter.toLowerCase() || c.id === filter);
          if (matchedCat) {
            params.categoryId = matchedCat.id;
          }
        }
      }

      const productsRes = await adminAPI.getProducts(params);
      // Handle both formats:
      //   Backend format: { success, data: { products: [...], pagination: {...} } }
      //   Fallback: raw paginator { current_page, data: [...], total, last_page }
      const responseData = productsRes.data?.data || productsRes.data || {};
      // Expected: { products: [...], pagination: { page, pages, total } }
      // Fallback: Laravel paginator { current_page, data: [...], last_page, total }
      const prod = responseData.products || responseData.data || [];
      if (!Array.isArray(prod)) throw new Error('Unexpected products response format');
      setProducts(prod);

      const pag = responseData.pagination;
      if (pag) {
        setCurrentPage(pag.page || pag.current_page || page);
        setTotalPages(pag.pages || pag.last_page || Math.ceil((pag.total || prod.length) / limit) || 1);
        setTotalItems(pag.total || prod.length);
      } else {
        // Fallback if no pagination key — extract from raw response fields
        setCurrentPage(responseData.current_page || page);
        setTotalPages(responseData.last_page || Math.ceil((responseData.total || prod.length) / limit) || 1);
        setTotalItems(responseData.total || prod.length);
      }
    } catch (err) {
      console.error('Failed to load products:', err);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Reset page to 1 when search or filter change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      load(1);
    }
  }, [debouncedSearch, filter]);

  // Load when current page changes
  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = async (p) => {
    setEditing(p);
    const imgsStr = getProductImages(p).join(', ') || p.image || '';
    setForm({
      name: p.name || '',
      price: p.price || '',
      oldPrice: p.oldPrice || '',
      cost: p.cost || '',
      description: p.description || '',
      shortDescription: p.shortDescription || '',
      categoryId: p.categoryId || '',
      sku: p.sku || '',
      quantity: p.quantity || p.stock || '',
      images: imgsStr,
      status: p.status || 'DRAFT',
      badge: p.badge || ''
    });
    // Show modal immediately, load variants async
    setShowVariants(false);
    setNewVariant(EMPTY_VARIANT);
    setShowModal(true);
    setVariantsLoading(true);
    try {
      const res = await adminAPI.getVariants(p.id);
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : data.variants || [];
      setProductVariants(list);
    } catch {
      setProductVariants([]);
    } finally {
      setVariantsLoading(false);
    }
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      price: Number(form.price),
      oldPrice: form.oldPrice ? Number(form.oldPrice) : null,
      cost: form.cost ? Number(form.cost) : undefined,
      quantity: form.quantity ? Number(form.quantity) : 0,
      images: form.images ? form.images.split(',').map(url => url.trim()).filter(Boolean) : [],
      badge: form.badge || null
    };
    try {
      if (editing) {
        const r = await adminAPI.updateProduct(editing.id, payload);
        const updatedProd = r.data?.data || r.data;
        setProducts(products.map(p => p.id === editing.id ? { ...p, ...payload, ...updatedProd } : p));
        toast.success('Product updated!');
      } else {
        const r = await adminAPI.createProduct(payload);
        const newProd = r.data?.data || r.data;
        setProducts([newProd, ...products]);
        toast.success('Product created!');
      }
      await load(currentPage);
      setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product permanently?')) return;
    try { 
      await adminAPI.deleteProduct(id); 
      setProducts(products.filter(p => p.id !== id)); 
      toast.success('Product deleted'); 
      await load(currentPage);
    } catch { 
      toast.error('Failed to delete'); 
    }
  };

  // ── AI Generation State ──
  const [aiLoading, setAiLoading] = useState({});

  const handleAIGenerateDescription = async () => {
    if (!form.name) { toast.error('Enter a product name first'); return; }
    setAiLoading(prev => ({ ...prev, description: true }));
    try {
      const res = await aiAPI.generateProductDescription({ name: form.name, category: categories.find(c => c.id === form.categoryId)?.name, price: form.price });
      const data = res.data?.data || {};
      if (data.description) setForm(prev => ({ ...prev, description: data.description }));
      toast.success('Description generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI generation failed');
    } finally {
      setAiLoading(prev => ({ ...prev, description: false }));
    }
  };

  const handleAIGenerateShortDescription = async () => {
    if (!form.name) { toast.error('Enter a product name first'); return; }
    setAiLoading(prev => ({ ...prev, shortDesc: true }));
    try {
      const res = await aiAPI.generateShortDescription({ name: form.name, category: categories.find(c => c.id === form.categoryId)?.name });
      const data = res.data?.data || {};
      if (data.description) setForm(prev => ({ ...prev, shortDescription: data.description }));
      toast.success('Short description generated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI generation failed');
    } finally {
      setAiLoading(prev => ({ ...prev, shortDesc: false }));
    }
  };

  const handleAIGenerateSeo = async () => {
    if (!form.name) { toast.error('Enter a product name first'); return; }
    setAiLoading(prev => ({ ...prev, seo: true }));
    try {
      const res = await aiAPI.generateSeoMeta({ entityType: 'product', name: form.name, category: categories.find(c => c.id === form.categoryId)?.name, description: form.description });
      const data = res.data?.data || {};
      const seoLines = [];
      if (data.metaTitle) seoLines.push(`📌 Title: ${data.metaTitle}`);
      if (data.metaDescription) seoLines.push(`📝 Desc: ${data.metaDescription}`);
      if (data.metaKeywords) seoLines.push(`🏷️ Keywords: ${data.metaKeywords}`);
      if (seoLines.length > 0) {
        toast.success(seoLines.join(' | '), { duration: 6000 });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI SEO generation failed');
    } finally {
      setAiLoading(prev => ({ ...prev, seo: false }));
    }
  };

  const handleAIGenerateImage = async () => {
    if (!form.name) { toast.error('Enter a product name first'); return; }
    setAiLoading(prev => ({ ...prev, image: true }));
    try {
      const res = await aiAPI.generateImage({ prompt: `Product photography of ${form.name}`, productName: form.name, style: 'product-photo' });
      const data = res.data?.data || {};
      if (data.url) {
        const currentImages = form.images ? form.images.split(',').map(u => u.trim()).filter(Boolean) : [];
        setForm(prev => ({ ...prev, images: [...currentImages, data.url].join(', ') }));
        toast.success('Image generated! It will appear in the image list above.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI image generation failed');
    } finally {
      setAiLoading(prev => ({ ...prev, image: false }));
    }
  };

  // ── Variant AI State & Handlers ──
  const [variantAiLoadingAuto, setVariantAiLoadingAuto] = useState(false);
  const [variantViewProgress, setVariantViewProgress] = useState(null);
  const [variantReferenceImageUrl, setVariantReferenceImageUrl] = useState('');
  const variantImageUrlRef = useRef({});
  const variantProgressTimeoutRef = useRef(null);

  const variantViewLabels = { reference: '📷 Analyzing Reference', front: '📸 Front View', back: '📸 Back View', side: '📸 Side View', detail: '🔍 Detail Close-up' };
  const variantViewIcons = { reference: '🎯', front: '📸', back: '📸', side: '📸', detail: '🔍' };

  const handleAIVariantAutoGenerate = async () => {
    if (!newVariant.color && !newVariant.size) { toast.error('Enter at least a color for context'); return; }
    if (!editing?.id) { toast.error('Save the product first'); return; }
    // Clear any previous progress-clearing timeout (prevents race conditions)
    if (variantProgressTimeoutRef.current) clearTimeout(variantProgressTimeoutRef.current);

    setVariantAiLoadingAuto(true);
    const initialViews = { front: 'idle', back: 'idle', side: 'idle', detail: 'idle' };
    if (variantReferenceImageUrl) initialViews.reference = 'idle';
    setVariantViewProgress(initialViews);
    variantImageUrlRef.current = {};
    try {
      // 1. Generate description (non-streaming)
      const descPromise = aiAPI.generateVariantDescription({ productId: editing.id, productName: form.name, color: newVariant.color, size: newVariant.size, sku: newVariant.sku });

      // 2. Generate images with per-view progress streaming
      const imgPromise = aiAPI.generateVariantImagesStream(
        { productName: form.name, color: newVariant.color, size: newVariant.size, referenceImageUrl: variantReferenceImageUrl || undefined },
        (event) => {
          setVariantViewProgress(prev => ({
            ...prev,
            [event.view]: event.status === 'generating' ? 'generating' : event.status === 'done' ? 'done' : 'error',
          }));
          if (event.status === 'done' && event.url) {
            variantImageUrlRef.current[event.view] = event.url;
          }
        }
      );

      const settled = await Promise.allSettled([descPromise, imgPromise]);

      let updates = { ...newVariant };
      const parts = [];

      if (settled[0].status === 'fulfilled') {
        const descData = settled[0].value.data?.data || {};
        if (descData.description) {
          updates.description = descData.description;
          parts.push('✓ Description');
        }
      }

      if (settled[1].status === 'fulfilled') {
        const imageUrls = Object.values(variantImageUrlRef.current).filter(Boolean);
        if (imageUrls.length > 0) {
          const existing = newVariant.images ? newVariant.images.split(',').map(u => u.trim()).filter(Boolean) : [];
          updates.images = [...existing, ...imageUrls].join(', ');
          parts.push(`✓ ${imageUrls.length} images (front/back/side/detail)`);
        }
      }

      setNewVariant(updates);

      if (parts.length > 0) {
        toast.success(`Auto-generated! ${parts.join(' ')}`, { duration: 5000 });
      } else {
        toast.error('Auto-generation completed but no content was returned');
      }
    } catch (err) {
      toast.error(err.message || 'AI auto-generation failed');
    } finally {
      setVariantAiLoadingAuto(false);
      // Keep progress visible for 2s so the user can see the final checkmarks
      variantProgressTimeoutRef.current = setTimeout(() => {
        setVariantViewProgress(null);
        variantImageUrlRef.current = {};
        variantProgressTimeoutRef.current = null;
      }, 2000);
    }
  };

  // ── Variant management handlers ──
  const handleAddVariant = async () => {
    if (!newVariant.sku && !newVariant.color && !newVariant.size) {
      toast.error('Enter at least a color or size');
      return;
    }
    if (!newVariant.sku) {
      toast.error('SKU is required');
      return;
    }
    setAddingVariant(true);
    try {
      const payload = {
        name: [newVariant.color, newVariant.size].filter(Boolean).join(' / ') || 'Variant',
        sku: newVariant.sku,
        price: newVariant.price ? Number(newVariant.price) : undefined,
        stock: newVariant.stock ? Number(newVariant.stock) : 0,
        color: newVariant.color,
        size: newVariant.size,
        description: newVariant.description || '',
        images: newVariant.images ? newVariant.images.split(',').map(u => u.trim()).filter(Boolean) : [],
      };
      await adminAPI.createVariant(editing.id, payload);
      toast.success('Variant added');
      setNewVariant(EMPTY_VARIANT);
      // Reload variants
      const res = await adminAPI.getVariants(editing.id);
      const data = res.data?.data || res.data || [];
      setProductVariants(Array.isArray(data) ? data : data.variants || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add variant');
    } finally {
      setAddingVariant(false);
    }
  };

  const handleDeleteVariant = async (variantId) => {
    if (!confirm('Delete this variant?')) return;
    try {
      await adminAPI.deleteVariant(variantId);
      setProductVariants(productVariants.filter(v => v.id !== variantId));
      toast.success('Variant deleted');
    } catch {
      toast.error('Failed to delete variant');
    }
  };

  const handlePublish = async (id) => {
    try {
      await adminAPI.updateProduct(id, { status: 'PUBLISHED' });
      setProducts(products.map(p => p.id === id ? { ...p, status: 'PUBLISHED' } : p));
      toast.success('Product published');
      await load(currentPage);
    } catch { toast.error('Failed'); }
  };

  const handleArchive = async (id) => {
    try {
      await adminAPI.updateProduct(id, { status: 'ARCHIVED' });
      setProducts(products.map(p => p.id === id ? { ...p, status: 'ARCHIVED' } : p));
      toast.success('Product archived');
      await load(currentPage);
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div><h2>Products</h2><p>Manage your product catalog ({totalItems} items)</p></div>
        <button className="btn-dark btn-sm" onClick={openCreate}>+ Add Product</button>
      </div>

      {/* Detail Panel */}
      {detail && (
        <div className="detail-panel">
          <div className="detail-header">
            <h3>{detail.name}</h3>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="detail-id">ID: {detail.id}</span>
              <button className="btn-ghost btn-sm" onClick={() => setDetail(null)}>✕ Close</button>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span className="label">Price</span><span className="value">{formatCurrency(detail.price)}</span></div>
            <div className="detail-item"><span className="label">Old Price</span><span className="value">{detail.oldPrice ? formatCurrency(detail.oldPrice) : '—'}</span></div>
            <div className="detail-item"><span className="label">Category</span><span className="value">{detail.category?.name || detail.categoryName || '—'}</span></div>
            <div className="detail-item"><span className="label">Rating</span><span className="value" style={{ color: 'var(--gold)' }}>{'★'.repeat(Math.floor(detail.rating || 0))} ({detail.reviewCount || 0} reviews)</span></div>
            <div className="detail-item"><span className="label">Status</span><span className="value"><span className={`status-badge ${detail.status === 'ARCHIVED' ? 'status-archived' : 'status-active'}`}>{detail.status || 'Active'}</span></span></div>
            <div className="detail-item"><span className="label">SKU</span><span className="value" style={{ fontFamily: 'monospace' }}>{detail.sku || '—'}</span></div>
            <div className="detail-item" style={{ gridColumn: '1/-1' }}><span className="label">Description</span><span className="value">{detail.description || 'No description available'}</span></div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="table-filter" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="ALL">All Products</option>
            <optgroup label="Status">
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </optgroup>
            <optgroup label="Categories">
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </optgroup>
          </select>
          <span className="table-count">{totalItems} results</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📦</div><h3>No products found</h3><p>Try adjusting your search or filters.</p></div></td></tr>
            ) : products.map(p => {
              const imgUrl = getProductImage(p) || p.image;
              return (
                <tr key={p.id}>
                  <td><div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>{imgUrl ? <img loading="lazy" src={getImageUrl(imgUrl)} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : <span style={{ fontSize: '1.5rem' }}>📦</span>}<div><strong>{p.name}</strong><div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'monospace' }}>{p.sku || `SKU-${p.id}`}</div></div></div></td>
                  <td>{p.category?.name || p.categoryName || '—'}</td>
                <td>{p.oldPrice && p.oldPrice > p.price ? (
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>{formatCurrency(p.price)}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textDecoration: 'line-through', lineHeight: 1.4 }}>{formatCurrency(p.oldPrice)}</div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16a34a', lineHeight: 1.4 }}>{Math.round(((p.oldPrice - p.price) / p.oldPrice) * 100)}% off</div>
                    </div>
                  ) : (
                    <strong>{formatCurrency(p.price)}</strong>
                  )}</td>
                <td><span style={{ color: 'var(--gold)', fontSize: '0.8rem' }}>{'★'.repeat(Math.floor(p.rating || 0))}</span><span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 4 }}>{p.rating || '—'}</span></td>
                <td><span className={`status-badge ${(p.status || 'ACTIVE') === 'ARCHIVED' ? 'status-archived' : (p.status || 'ACTIVE') === 'PUBLISHED' ? 'status-active' : 'status-active'}`}>{p.status || 'Active'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn-view" onClick={() => setDetail(p)}>View</button>
                    <button className="btn-edit" onClick={() => openEdit(p)}>Edit</button>
                    {(p.status || 'ACTIVE') !== 'PUBLISHED' && <button className="btn-approve" onClick={() => handlePublish(p.id)}>Publish</button>}
                    {(p.status || 'ACTIVE') !== 'ARCHIVED' && <button onClick={() => handleArchive(p.id)}>Archive</button>}
                    <button className="btn-del" onClick={() => handleDelete(p.id)}>Delete</button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} products total)
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button 
                  key={p} 
                  className={p === currentPage ? "btn-dark btn-sm" : "btn-ghost btn-sm"}
                  onClick={() => setCurrentPage(p)}
                  style={{ minWidth: '32px' }}
                >
                  {p}
                </button>
              ))}
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

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? '✏️ Edit Product' : '➕ New Product'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Product Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Silk Evening Gown" /></div>
                <div className="form-group"><label>Category</label>
                  <select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}>
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group"><label>Price ($) *</label><input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="99.99" /></div>
                <div className="form-group"><label>Old Price ($)</label><input type="number" value={form.oldPrice} onChange={e => setForm({ ...form, oldPrice: e.target.value })} placeholder="129.99 — marks as Sale" /></div>
                <div className="form-group"><label>Badge</label>
                  <select value={form.badge} onChange={e => setForm({ ...form, badge: e.target.value })}>
                    <option value="">None</option>
                    <option value="New">✨ New</option>
                    <option value="Sale">🏷️ Sale</option>
                    <option value="Bestseller">⭐ Bestseller</option>
                    <option value="Trending">🔥 Trending</option>
                    <option value="Limited">💎 Limited</option>
                    <option value="Hot">🔥 Hot</option>
                    <option value="Value">💯 Value</option>
                    <option value="Eco">🌿 Eco</option>
                    <option value="Best Value">🏆 Best Value</option>
                  </select>
                </div>
                <div className="form-group"><label>Cost ($)</label><input type="number" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} placeholder="50.00" /></div>
                <div className="form-group"><label>SKU</label><input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} placeholder="SKU-001" /></div>
                <div className="form-group"><label>Stock Quantity</label><input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="50" /></div>
                <div className="form-group form-full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <ImageUploadZone
                      label="Product Images"
                      value={form.images}
                      onChange={urls => setForm({ ...form, images: urls })}
                      multiple={true}
                    />
                    <button
                      onClick={handleAIGenerateImage}
                      disabled={aiLoading.image}
                      className="btn-ghost btn-sm"
                      style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap', marginLeft: '0.5rem', flexShrink: 0 }}
                      title="Generate product image with DALL-E AI"
                    >
                      {aiLoading.image ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '🖼️'} {aiLoading.image ? 'Generating...' : 'AI Generate Image'}
                    </button>
                  </div>
                </div>
                <div className="form-group"><label>Status</label>
                  <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
                <div className="form-group form-full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Short Description</label>
                    <button
                      onClick={handleAIGenerateShortDescription}
                      disabled={aiLoading.shortDesc}
                      className="btn-ghost btn-sm"
                      style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                      title="Generate with AI"
                    >
                      {aiLoading.shortDesc ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✨'} {aiLoading.shortDesc ? 'Generating...' : 'AI Generate'}
                    </button>
                  </div>
                  <input value={form.shortDescription} onChange={e => setForm({ ...form, shortDescription: e.target.value })} placeholder="Brief product summary..." />
                  {form.shortDescription && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{form.shortDescription.length} chars</span>
                  )}
                </div>
                <div className="form-group form-full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Description</label>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        onClick={handleAIGenerateSeo}
                        disabled={aiLoading.seo}
                        className="btn-ghost btn-sm"
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        title="Generate SEO meta (check console for output)"
                      >
                        {aiLoading.seo ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '🎯'} {aiLoading.seo ? 'Generating...' : 'AI SEO'}
                      </button>
                      <button
                        onClick={handleAIGenerateDescription}
                        disabled={aiLoading.description}
                        className="btn-ghost btn-sm"
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                        title="Generate product description with AI"
                      >
                        {aiLoading.description ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✨'} {aiLoading.description ? 'Generating...' : 'AI Generate'}
                      </button>
                    </div>
                  </div>
                  <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Product description..." />
                </div>

                {/* ── Variants Section (edit only) ── */}
                {editing && (
                  <div className="form-group form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                    <div
                      onClick={() => setShowVariants(!showVariants)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>🎨 Variants (Color / Size)</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)', background: '#f3f4f6', padding: '0.15rem 0.5rem', borderRadius: 999 }}>
                          {productVariants.length}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--muted)', transition: 'transform 0.2s', transform: showVariants ? 'rotate(180deg)' : 'none' }}>▼</span>
                    </div>

                    {showVariants && (
                      <div style={{ marginTop: '0.75rem' }}>
                        {variantsLoading ? (
                          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>Loading variants...</div>
                        ) : productVariants.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                            {productVariants.map(v => {
                              const firstImg = Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : null;
                              return (
                                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.5rem 0.625rem', background: '#f9fafb', borderRadius: 8, border: '1px solid #f3f4f6', fontSize: '0.82rem' }}>
                                  {/* Thumbnail */}
                                  <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', background: '#f3f4f6', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {firstImg ? (
                                      <img loading="lazy" src={getImageUrl(firstImg)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <span style={{ fontSize: '1rem', opacity: 0.3 }}>🎨</span>
                                    )}
                                  </div>
                                  {/* Variant details */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 500 }}>{v.color || ''}{v.size ? ` / ${v.size}` : ''}</div>
                                    <div style={{ color: 'var(--muted)', fontSize: '0.72rem', fontFamily: 'monospace' }}>{v.sku || '—'}</div>
                                  </div>
                                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                    <div style={{ fontWeight: 600 }}>{formatCurrency(v.price)}</div>
                                    <div style={{ fontSize: '0.72rem', color: (v.quantity || 0) < 5 ? 'var(--danger)' : 'var(--muted)' }}>Stock: {v.quantity || 0}</div>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteVariant(v.id)}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.25rem', fontSize: '0.9rem', lineHeight: 1, flexShrink: 0 }}
                                    title="Delete variant"
                                  >✕</button>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ padding: '0.75rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem', background: '#f9fafb', borderRadius: 8, marginBottom: '1rem' }}>
                            No variants yet. Add color/size options below.
                          </div>
                        )}

                        {/* ── Add Variant Form ── */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <input
                            placeholder="Color"
                            value={newVariant.color}
                            onChange={e => setNewVariant({ ...newVariant, color: e.target.value })}
                            style={{ padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.82rem', outline: 'none' }}
                          />
                          <input
                            placeholder="Size"
                            value={newVariant.size}
                            onChange={e => setNewVariant({ ...newVariant, size: e.target.value })}
                            style={{ padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.82rem', outline: 'none' }}
                          />
                          <input
                            placeholder="SKU *"
                            value={newVariant.sku}
                            onChange={e => setNewVariant({ ...newVariant, sku: e.target.value })}
                            style={{ padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.82rem', outline: 'none' }}
                          />
                          <input
                            type="number"
                            placeholder="Price"
                            value={newVariant.price}
                            onChange={e => setNewVariant({ ...newVariant, price: e.target.value })}
                            style={{ padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.82rem', outline: 'none' }}
                          />
                          <input
                            type="number"
                            placeholder="Stock"
                            value={newVariant.stock}
                            onChange={e => setNewVariant({ ...newVariant, stock: e.target.value })}
                            style={{ padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.82rem', outline: 'none' }}
                          />
                          <button
                            onClick={handleAddVariant}
                            disabled={addingVariant}
                            style={{ padding: '0.45rem', borderRadius: 6, border: '1px solid var(--primary)', background: addingVariant ? '#999' : 'var(--primary)', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: addingVariant ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}
                          >
                            {addingVariant ? 'Adding...' : '+ Add'}
                          </button>
                        </div>

                        {/* ── Variant Auto-Generate Button ── */}
                        <div style={{ marginBottom: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--charcoal)' }}>🎯 AI Auto-Generate</label>
                            <button
                              onClick={handleAIVariantAutoGenerate}
                              disabled={variantAiLoadingAuto}
                              className="btn-ghost btn-sm"
                              style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', color: '#7c3aed', border: '1px solid #7c3aed', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.3rem', background: variantAiLoadingAuto ? '#f5f3ff' : '#fff', cursor: 'pointer' }}
                              title="Auto-generate description + front/back/side/detail images"
                            >
                              {variantAiLoadingAuto ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✨'} {variantAiLoadingAuto ? 'AI Generating...' : 'Auto Generate'}
                            </button>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                            One click generates: ✓ Description ✓ Front View ✓ Back View ✓ Side View ✓ Detail Close-up
                          </div>

                          {/* Per-view AI progress indicator */}
                          {variantViewProgress && (
                            <div style={{ background: '#faf5ff', borderRadius: 8, padding: '0.625rem', border: '1px solid #e9d5ff', marginBottom: '0.5rem' }}>
                              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#7c3aed', marginBottom: '0.35rem' }}>📸 Image Generation Progress</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                {Object.keys(variantViewProgress).map(key => {
                                  const label = variantViewLabels[key] || key;
                                  const status = variantViewProgress[key];
                                  const icon = variantViewIcons[key] || '📸';
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
                                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem' }}>
                                      <span>{icon}</span>
                                      <span style={{ flex: 1 }}>{label}</span>
                                      <span style={{ color: statusColor, fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                        {statusIcon}
                                        {status === 'generating' ? 'Generating...' : status === 'done' ? 'Done' : status === 'error' ? 'Failed' : 'Waiting'}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* ── Reference Image Upload (optional) ── */}
                          <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '0.5rem 0.625rem', border: '1px solid #bae6fd', marginBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                              <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#0369a1', margin: 0 }}>🎯 Reference Image (Optional)</label>
                              <span style={{ fontSize: '0.62rem', color: '#0369a1', opacity: 0.7 }}>AI matches this style</span>
                            </div>
                            <p style={{ fontSize: '0.65rem', color: '#64748b', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                              Upload a photo to match its pose, lighting, and composition.
                            </p>
                            <ImageUploadZone
                              label=""
                              value={variantReferenceImageUrl}
                              onChange={setVariantReferenceImageUrl}
                              multiple={false}
                            />
                            {variantReferenceImageUrl && (
                              <div style={{ fontSize: '0.65rem', color: '#0369a1', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <span>📎 Reference set</span>
                                <button
                                  onClick={() => setVariantReferenceImageUrl('')}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.68rem', textDecoration: 'underline', padding: 0 }}
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ── Variant Description ── */}
                        <div style={{ marginBottom: '0.75rem' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--muted)' }}>Variant Description</label>
                          <textarea
                            rows={2}
                            value={newVariant.description || ''}
                            onChange={e => setNewVariant({ ...newVariant, description: e.target.value })}
                            placeholder="Variant description (AI-generated or custom)..."
                            style={{ width: '100%', padding: '0.45rem 0.6rem', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.82rem', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', marginTop: '0.25rem' }}
                          />
                        </div>
                        <ImageUploadZone
                          label="Variant Images (color-specific photos)"
                          value={newVariant.images}
                          onChange={urls => setNewVariant({ ...newVariant, images: urls })}
                          multiple={true}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-dark btn-sm" onClick={handleSave}>{editing ? 'Update Product' : 'Create Product'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

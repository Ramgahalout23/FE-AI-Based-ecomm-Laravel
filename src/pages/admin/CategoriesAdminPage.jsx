import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { aiAPI } from '../../api/ai';
import toast from '../../utils/toast';
import ImageUploadZone from '../../components/common/ImageUploadZone';
import { getImageUrl, getCategoryImage } from '../../utils/formatters';

const EMPTY = { name: '', description: '', parentId: '', image: '' };

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(10);

  // Search/Filters states
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filter, setFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const loadAllForDropdown = async () => {
    try {
      const r = await adminAPI.getCategories({ limit: 1000 });
      const list = r.data?.data?.categories || r.data?.categories || r.data?.data || [];
      setAllCategories(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load category dropdown options:', err);
    }
  };

  // Map Prisma _count to flat productCount property
  const normalizeCategory = (cat) => ({
    ...cat,
    productCount: cat.productCount ?? cat._count?.product ?? 0,
  });

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: debouncedSearch || undefined
      };
      if (filter === 'ACTIVE') params.isActive = true;
      if (filter === 'INACTIVE') params.isActive = false;

      const r = await adminAPI.getCategories(params);
      const list = r.data?.data?.categories || r.data?.categories || r.data?.data || [];
      setCategories(Array.isArray(list) ? list.map(normalizeCategory) : []);

      const pag = r.data?.pagination || r.data?.data?.pagination || {};
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || Math.ceil((pag.total || list.length) / limit) || 1);
      setTotalItems(pag.total || list.length);
    } catch (err) {
      console.error('Failed to load categories:', err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllForDropdown();
  }, []);

  // Reset page when search or filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      load(1);
    }
  }, [debouncedSearch, filter]);

  // Load when currentPage changes
  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (c) => { setEditing(c); setForm({ name: c.name || '', description: c.description || '', parentId: c.parentId || '', image: getCategoryImage(c) || '' }); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        const r = await adminAPI.updateCategory(editing.id, form);
        const updatedCat = r.data?.data || r.data;
        setCategories(categories.map(c => c.id === editing.id ? { ...c, ...form, ...updatedCat } : c));
        toast.success('Category updated');
      } else {
        const r = await adminAPI.createCategory(form);
        const newCat = r.data?.data || r.data;
        setCategories([...categories, newCat]);
        toast.success('Category created');
      }
      await load(currentPage);
      await loadAllForDropdown();
      setShowModal(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  // ── AI Generation ──
  const [aiLoadingAuto, setAiLoadingAuto] = useState(false);

  const handleAIAutoGenerate = async () => {
    if (!form.name) { toast.error('Enter a category name first'); return; }
    setAiLoadingAuto(true);
    try {
      // Run both in parallel, handle partial success
      const settled = await Promise.allSettled([
        aiAPI.generateCategoryDescription({ name: form.name, parentName: allCategories.find(c => c.id === form.parentId)?.name }),
        aiAPI.generateImage({ prompt: `Professional category banner image for ${form.name}`, productName: form.name, style: 'lifestyle' }),
      ]);

      let updates = {};
      const parts = [];

      if (settled[0].status === 'fulfilled') {
        const descData = settled[0].value.data?.data || {};
        if (descData.description) {
          updates.description = descData.description;
          parts.push('✓ Description');
        }
      }

      if (settled[1].status === 'fulfilled') {
        const imgData = settled[1].value.data?.data || {};
        if (imgData.url) {
          updates.image = imgData.url;
          parts.push('✓ Image');
        }
      }

      if (Object.keys(updates).length > 0) {
        setForm(prev => ({ ...prev, ...updates }));
        toast.success(`Auto-generated! ${parts.join(' ')}`);
      } else {
        toast.error('Auto-generation completed but no content was returned');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI auto-generation failed');
    } finally {
      setAiLoadingAuto(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this category? Products in this category will be unassigned.')) return;
    try { 
      await adminAPI.deleteCategory(id); 
      setCategories(categories.filter(c => c.id !== id)); 
      toast.success('Deleted'); 
      await load(currentPage);
      await loadAllForDropdown();
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed'); 
    }
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div><h2>Categories</h2><p>Manage product categories and hierarchy ({totalItems} total)</p></div>
        <button className="btn-dark btn-sm" onClick={openCreate}>+ Add Category</button>
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
          <select className="table-filter" value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <span className="table-count">{totalItems} results</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Image</th><th>Category</th><th>Description</th><th>Products</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : categories.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">📂</div><h3>No categories yet</h3><p>Create your first category to organize products.</p></div></td></tr>
            ) : categories.map(c => (
              <tr key={c.id}>
                <td>{getCategoryImage(c) ? <img loading="lazy" src={getImageUrl(getCategoryImage(c))} alt={c.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} /> : <span style={{ color: '#999' }}>—</span>}</td>
                <td><strong>{c.name}</strong></td>
                <td style={{ color: 'var(--muted)', fontSize: '0.82rem', maxWidth: 250 }}>{c.description || '—'}</td>
                <td><strong>{c.productCount || 0}</strong></td>
                <td><span className={`status-badge ${c.isActive !== false ? 'status-active' : 'status-archived'}`}>{c.isActive !== false ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn-edit" onClick={() => openEdit(c)}>Edit</button>
                    <button className="btn-del" onClick={() => handleDelete(c.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} categories total)
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

      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? '✏️ Edit Category' : '➕ New Category'}</h3>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <button
                  onClick={handleAIAutoGenerate}
                  disabled={aiLoadingAuto}
                  className="btn-ghost btn-sm"
                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', color: '#7c3aed', border: '1px solid #7c3aed', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.3rem', background: aiLoadingAuto ? '#f5f3ff' : '#fff', cursor: 'pointer' }}
                  title="Auto-generate description + image with AI"
                >
                  {aiLoadingAuto ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✨'} {aiLoadingAuto ? 'Generating...' : 'Auto Generate'}
                </button>
                <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
              </div>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group"><label>Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Fashion" autoComplete="off" /></div>
                <div className="form-group"><label>Parent Category</label>
                  <select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}>
                    <option value="">None (Top Level)</option>
                    {allCategories.filter(c => c.id !== editing?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group form-full">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <ImageUploadZone
                        label="Category Image"
                        value={form.image}
                        onChange={url => setForm({ ...form, image: url })}
                        multiple={false}
                      />
                    </div>
                  </div>
                </div>
                <div className="form-group form-full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label>Description</label>
                  </div>
                  <textarea rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Category description..." />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-dark btn-sm" onClick={handleSave}>{editing ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

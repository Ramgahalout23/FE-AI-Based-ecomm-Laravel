import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { aiAPI } from '../../api/ai';
import toast from '../../utils/toast';
import { downloadBlob } from '../../utils/download';
import ImageUploadZone from '../../components/common/ImageUploadZone';
import { getImageUrl, getCategoryImage } from '../../utils/formatters';
import Pagination from '../../components/admin/Pagination';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import AdminPageShell from '../../components/admin/AdminPageShell';
import AdminFormField from '../../components/admin/AdminFormField';
import ModalSection from '../../components/admin/ModalSection';
import AdminModal from '../../components/admin/AdminModal';
import SaveButton from '../../components/admin/SaveButton';
import ActionButton from '../../components/admin/ActionButton';
import AdminSelect from '../../components/admin/AdminSelect';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField } from '../../hooks/validationRules';
import { Tag, Image as ImageIcon, Pencil, Plus } from 'lucide-react';

const EMPTY = { name: '', description: '', parentId: '', image: '' };

// Module-level cache for parent category dropdown reference data
let _cachedAllCategories = null;

export default function CategoriesAdminPage() {
  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  // ── Inline form validation ──
  const validation = useAdminFormValidation({
    name: requiredField('Category name'),
    description: requiredField('Description'),
  });

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];

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

  const loadAllForDropdown = async (force = false) => {
    if (!force && _cachedAllCategories) {
      setAllCategories(_cachedAllCategories);
      return;
    }
    _cachedAllCategories = null;
    try {
      const r = await adminAPI.getCategories({ limit: 1000 });
      const list = r.data?.data?.categories || r.data?.categories || r.data?.data || [];
      const normalized = Array.isArray(list) ? list : [];
      _cachedAllCategories = normalized;
      setAllCategories(normalized);
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
        limit: pageSize,
        search: debouncedSearch || undefined
      };
      if (filter === 'ACTIVE') params.isActive = true;
      if (filter === 'INACTIVE') params.isActive = false;

      const r = await adminAPI.getCategories(params);
      const list = r.data?.data?.categories || r.data?.categories || r.data?.data || [];
      setCategories(Array.isArray(list) ? list.map(normalizeCategory) : []);

      const pag = r.data?.pagination || r.data?.data?.pagination || {};
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || Math.ceil((pag.total || list.length) / pageSize) || 1);
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
  }, [debouncedSearch, filter, pageSize]);

  // Load when currentPage changes
  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  // CSV Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  const CATEGORY_COLUMNS = [
    { key: 'name', label: 'Category Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'description', label: 'Description' },
    { key: 'parent', label: 'Parent Category' },
    { key: 'isActive', label: 'Active' },
    { key: 'createdAt', label: 'Created Date' },
  ];

  const handleExportCSV = async (selectedColumns) => {
    setExporting(true); setExportStatus('dispatching'); setExportError(null);
    try {
      const filters = { search: debouncedSearch || undefined };
      if (filter === 'ACTIVE') filters.isActive = true;
      else if (filter === 'INACTIVE') filters.isActive = false;
      Object.keys(filters).forEach(k => { if (filters[k] === undefined) delete filters[k]; });
      const dispatchRes = await adminAPI.dispatchExport({ type: 'categories', filters, columns: selectedColumns });
      const jobId = dispatchRes.data?.data?.id;
      if (!jobId) throw new Error('No job ID returned');
      setExportStatus('processing');
      const poll = async () => {
        try {
          const statusRes = await adminAPI.checkExportStatus(jobId);
          const status = statusRes.data?.data?.status;
          if (status === 'completed') {
            const downloadRes = await adminAPI.downloadExport(jobId);
            const filename = statusRes.data?.data?.file_name || `categories-export-${new Date().toISOString().slice(0, 10)}.csv`;
            downloadBlob(downloadRes, filename);
            setExportStatus('completed');
            toast.success('Categories exported successfully');
            setTimeout(() => { setShowExportModal(false); setExportStatus(null); }, 1500);
          } else if (status === 'failed') {
            throw new Error(statusRes.data?.data?.error_message || 'Export failed');
          } else {
            setTimeout(poll, 1500);
          }
        } catch (pollErr) {
          console.error('Export poll error:', pollErr);
          if (!exportStatus || exportStatus === 'processing') {
            setExportStatus('failed'); setExportError(pollErr.response?.data?.message || pollErr.message || 'Export failed');
            toast.error('Export failed');
          }
        }
      };
      poll().catch(() => {});
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('failed'); setExportError(err.response?.data?.message || err.message || 'Failed to export categories');
      toast.error('Export failed');
    } finally { setExporting(false); }
  };

  const openCreate = () => { validation.reset(); setEditing(null); setForm(EMPTY); setShowModal(true); };
  const openEdit = (c) => { validation.reset(); setEditing(c); setForm({ name: c.name || '', description: c.description || '', parentId: c.parentId || '', image: getCategoryImage(c) || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!validation.validateForm(form)) return false;
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
      await loadAllForDropdown(true);
      return true; // SaveButton plays the success state, then closes via onSuccess
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); return false; }
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
    try { 
      await adminAPI.deleteCategory(id); 
      setCategories(categories.filter(c => c.id !== id)); 
      toast.success('Deleted'); 
      await load(currentPage);
      await loadAllForDropdown(true);
      return true;
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed'); 
      return false;
    }
  };

  return (
    <div>
      <AdminPageShell
        title="Categories"
        subtitle={`Manage product categories and hierarchy (${totalItems} total)`}
        loading={loading}
        page="categories"
        actions={
          <>
            <button className="btn-ghost btn-sm" onClick={() => setShowExportModal(true)}>📥 Export CSV</button>
            <button className="btn-dark btn-sm" onClick={openCreate}>+ Add Category</button>
          </>
        }
      >
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search categories..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
          <AdminSelect
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'ALL', label: 'All Status' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
            ]}
            dotClass={(v) => (v === 'ALL' ? null : v === 'ACTIVE' ? 'status-active' : 'status-inactive')}
            ariaLabel="Filter categories by status"
          />
          <span className="table-count">{totalItems} results</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Image</th><th>Category</th><th>Description</th><th>Products</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {categories.length === 0 ? (
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
                    <ActionButton className="btn-del" confirm="Delete this category? Products in this category will be unassigned." onClick={() => handleDelete(c.id)} idle="Delete" />
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
        columns={CATEGORY_COLUMNS}
        onExport={handleExportCSV}
        exporting={exporting}
        exportStatus={exportStatus}
        exportError={exportError}
        filename={`categories-export-${new Date().toISOString().slice(0, 10)}.csv`}
      />
      </AdminPageShell>

      <AdminModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Category' : 'New Category'}
        icon={editing ? <Pencil size={18} /> : <Plus size={18} />}
        actions={
          <button
            onClick={handleAIAutoGenerate}
            disabled={aiLoadingAuto}
            className="btn-ghost btn-sm"
            style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', color: '#7c3aed', border: '1px solid #7c3aed', borderRadius: 6, display: 'flex', alignItems: 'center', gap: '0.3rem', background: aiLoadingAuto ? '#f5f3ff' : '#fff', cursor: 'pointer' }}
            title="Auto-generate description + image with AI"
          >
            {aiLoadingAuto ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✨'} {aiLoadingAuto ? 'Generating...' : 'Auto Generate'}
          </button>
        }
        footer={<>
          <button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
          <SaveButton onClick={handleSave} onSuccess={() => setShowModal(false)} idleLabel={editing ? 'Update' : 'Create'} />
        </>}
      >
              <ModalSection title="Basics" hint="Core identity of the category" icon={<Tag size={16} />}>
                <AdminFormField label="Name" required error={validation.errors.name} valid={validation.validFields.name}>
                  <input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); validation.handleChange('name', e.target.value); }} placeholder="e.g. Fashion" autoComplete="off" />
                </AdminFormField>
                <AdminFormField label="Parent Category" hint="Optional — nest under an existing category">
                  <select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })}>
                    <option value="">None (Top Level)</option>
                    {allCategories.filter(c => c.id !== editing?.id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </AdminFormField>
              </ModalSection>
              <ModalSection title="Details" hint="An image and description shown to customers on the category page" icon={<ImageIcon size={16} />}>
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
                <AdminFormField className="form-full" label="Description" required error={validation.errors.description} valid={validation.validFields.description}>
                  <textarea rows={3} value={form.description} onChange={e => { setForm({ ...form, description: e.target.value }); validation.handleChange('description', e.target.value); }} placeholder="Category description..." />
                </AdminFormField>
              </ModalSection>
      </AdminModal>
    </div>
  );
}

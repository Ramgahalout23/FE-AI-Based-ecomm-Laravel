import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import Pagination from '../../components/admin/Pagination';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import { downloadBlob } from '../../utils/download';
import toast from '../../utils/toast';
import AdminPageShell from '../../components/admin/AdminPageShell';
import AdminFormField from '../../components/admin/AdminFormField';
import AdminModal from '../../components/admin/AdminModal';
import SaveButton from '../../components/admin/SaveButton';
import ActionButton from '../../components/admin/ActionButton';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField, imageUrl } from '../../hooks/validationRules';
import { motion } from 'framer-motion';
import { modalBodyVariants } from '../../utils/motionPresets';
import { Edit, Plus, Download, Tag } from 'lucide-react';

export default function BrandsAdminPage() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', logoUrl: '' });

  // ── Inline form validation ──
  const validation = useAdminFormValidation({
    name: requiredField('Brand name'),
    logoUrl: imageUrl(),
    description: requiredField('Description'),
  });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];

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
        params.isActive = statusFilter === 'active';
      }
      const r = await adminAPI.getBrands(params);
      const data = r.data?.data || r.data;
      const list = data?.brands || data?.items || data || [];
      setBrands(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || {};
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / pageSize) || 1);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentPage/load intentionally excluded: load is recreated each render
  }, [debouncedSearch, statusFilter, pageSize]);

  // Load when currentPage changes
  useEffect(() => {
    load(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is recreated each render; page changes are the only intended trigger
  }, [currentPage]);

  // CSV Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  const BRAND_COLUMNS = [
    { key: 'name', label: 'Brand Name' },
    { key: 'slug', label: 'Slug' },
    { key: 'description', label: 'Description' },
    { key: 'createdAt', label: 'Created Date' },
  ];

  const handleExportCSV = async (selectedColumns) => {
    setExporting(true); setExportStatus('dispatching'); setExportError(null);
    try {
      const filters = { search: debouncedSearch || undefined };
      Object.keys(filters).forEach(k => { if (filters[k] === undefined) delete filters[k]; });
      const dispatchRes = await adminAPI.dispatchExport({ type: 'brands', filters, columns: selectedColumns });
      const jobId = dispatchRes.data?.data?.id;
      if (!jobId) throw new Error('No job ID returned');
      setExportStatus('processing');
      const poll = async () => {
        try {
          const statusRes = await adminAPI.checkExportStatus(jobId);
          const status = statusRes.data?.data?.status;
          if (status === 'completed') {
            const downloadRes = await adminAPI.downloadExport(jobId);
            const filename = statusRes.data?.data?.file_name || `brands-export-${new Date().toISOString().slice(0, 10)}.csv`;
            downloadBlob(downloadRes, filename);
            setExportStatus('completed');
            toast.success('Brands exported successfully');
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
      setExportStatus('failed'); setExportError(err.response?.data?.message || err.message || 'Failed to export brands');
      toast.error('Export failed');
    } finally { setExporting(false); }
  };

  const openCreate = () => { validation.reset(); setEditing(null); setForm({ name: '', description: '', logoUrl: '' }); setShowModal(true); };
  const openEdit = (b) => { validation.reset(); setEditing(b); setForm({ name: b.name || '', description: b.description || '', logoUrl: b.logoUrl || '' }); setShowModal(true); };

  const handleSave = async () => {
    if (!validation.validateForm(form)) return false;
    try {
      if (editing) {
        await adminAPI.updateBrand(editing.id, form);
        toast.success('Brand updated');
      } else {
        await adminAPI.createBrand(form);
        toast.success('Brand created');
      }
      await load(currentPage);
      return true; // SaveButton plays the success state, then closes via onSuccess
    } catch { toast.error('Failed to save'); return false; }
  };

  const handleDelete = async (id) => {
    try { 
      await adminAPI.deleteBrand(id); 
      setBrands(brands.filter(b => b.id !== id)); 
      toast.success('Deleted'); 
      await load(currentPage);
      return true;
    } catch { 
      toast.error('Failed'); 
      return false;
    }
  };

  return (
    <>
      <AdminPageShell
        title="Brands & Designers"
        subtitle="Manage product manufacturers and brands"
        loading={loading}
        error={error}
        page="brands"
        actions={
          <>
            <button className="btn-ghost btn-sm" onClick={() => setShowExportModal(true)}><Download size={14} /> Export CSV</button>
            <button className="btn-dark btn-sm" onClick={openCreate}>+ Add Brand</button>
          </>
        }
      >
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
            {brands.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon"><Tag size={40} /></div><h3>No brands yet</h3></div></td></tr>
            ) : brands.map(b => (
              <tr key={b.id}>
                <td>{b.logoUrl ? <img loading="lazy" src={b.logoUrl} alt={b.name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 4 }} /> : <span style={{ color: '#999' }}>—</span>}</td>
                <td><strong>{b.name}</strong></td>
                <td style={{ color: 'var(--muted)', fontSize: '0.82rem', maxWidth: 250 }}>{b.description || '—'}</td>
                <td><span className={`status-badge ${b.active !== false ? 'status-active' : 'status-inactive'}`}>{b.active !== false ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn-edit" onClick={() => openEdit(b)}>Edit</button>
                    <ActionButton className="btn-del" confirm="Delete this brand?" onClick={() => handleDelete(b.id)} idle="Delete" />
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
        columns={BRAND_COLUMNS}
        onExport={handleExportCSV}
        exporting={exporting}
        exportStatus={exportStatus}
        exportError={exportError}
        filename={`brands-export-${new Date().toISOString().slice(0, 10)}.csv`}
      />
      </AdminPageShell>

      <AdminModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Brand' : 'New Brand'}
        icon={editing ? <Edit size={18} /> : <Plus size={18} />}
        footer={<>
          <button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
          <SaveButton onClick={handleSave} onSuccess={() => setShowModal(false)} idleLabel={editing ? 'Update' : 'Create'} />
        </>}
      >
        <motion.div className="form-grid" variants={modalBodyVariants}>
          <AdminFormField label="Brand Name" required error={validation.errors.name} valid={validation.validFields.name}>
            <input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); validation.handleChange('name', e.target.value); }} placeholder="e.g. Gucci" />
          </AdminFormField>
          <AdminFormField label="Logo URL" error={validation.errors.logoUrl} valid={validation.validFields.logoUrl} hint="Optional — shown in the storefront">
            <input value={form.logoUrl} onChange={e => { setForm({ ...form, logoUrl: e.target.value }); validation.handleChange('logoUrl', e.target.value); }} placeholder="https://..." />
          </AdminFormField>
          <AdminFormField className="form-full" label="Description" required error={validation.errors.description} valid={validation.validFields.description}>
            <textarea rows={3} value={form.description} onChange={e => { setForm({ ...form, description: e.target.value }); validation.handleChange('description', e.target.value); }} />
          </AdminFormField>
        </motion.div>
      </AdminModal>
    </>
  );
}

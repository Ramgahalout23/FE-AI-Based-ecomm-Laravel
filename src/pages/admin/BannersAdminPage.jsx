import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import AdminPageShell from '../../components/admin/AdminPageShell';
import { settingsAPI } from '../../api/settings';
import { aiAPI } from '../../api/ai';
import { BANNER_TYPES } from '../../utils/constants';
import toast from '../../utils/toast';
import { downloadBlob } from '../../utils/download';
import ImageUploadZone from '../../components/common/ImageUploadZone';
import { getImageUrl, getBannerImage } from '../../utils/formatters';
import Pagination from '../../components/admin/Pagination';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import { Image, FileText, Video, Save, Plus, X, Sparkles, Download, Home, Info, Edit, Upload, Crosshair } from 'lucide-react';

const DISPLAY_MODES = [
  { value: 'DEFAULT', label: 'Default (Image + Text)', icon: <><Image size={14} /><FileText size={14} /></> },
  { value: 'IMAGE_ONLY', label: 'Image Only', icon: <Image size={14} /> },
  { value: 'VIDEO', label: 'Video Background', icon: <Video size={14} /> },
  { value: 'TITLE_ONLY', label: 'Title Only', icon: <FileText size={14} /> },
];

const EMPTY = { title: '', imageUrl: '', videoUrl: '', type: 'HERO', link: '', description: '', displayMode: 'DEFAULT' };

export default function BannersAdminPage() {
  // ── AI Generation ──
  const [aiLoading, setAiLoading] = useState(false);
  const [bannerRefImageUrl, setBannerRefImageUrl] = useState('');

  const handleAIGenerateBannerImage = async () => {
    if (!form.title && !form.description) { toast.error('Enter at least a title or description for context'); return; }
    setAiLoading(true);
    try {
      const promptText = `E-commerce promotional banner for ${form.title || 'our store'}${form.description ? ': ' + form.description : ''}. Modern retail design, elegant composition, premium storefront style.`;

      const payload = {
        prompt: promptText,
        productName: form.title || 'banner',
        style: 'banner',
        size: '1792x1024', // Wide banner format
        referenceImageUrl: bannerRefImageUrl || undefined,
      };

      const res = await aiAPI.generateImage(payload);
      const data = res.data?.data || {};
      if (data.url) {
        setForm(prev => ({ ...prev, imageUrl: data.url }));
        toast.success('Banner image generated!');
      } else {
        toast.error('AI returned no image URL');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'AI image generation failed');
    } finally {
      setAiLoading(false);
    }
  };
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  // CSV Export state (async job-based)
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  const BANNER_COLUMNS = [
    { key: 'title', label: 'Title' },
    { key: 'subtitle', label: 'Subtitle' },
    { key: 'description', label: 'Description' },
    { key: 'type', label: 'Type' },
    { key: 'position', label: 'Position' },
    { key: 'isActive', label: 'Active' },
    { key: 'displayMode', label: 'Display Mode' },
    { key: 'linkUrl', label: 'Link URL' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'showOnMobile', label: 'Show on Mobile' },
    { key: 'showOnDesktop', label: 'Show on Desktop' },
    { key: 'backgroundColor', label: 'Background Color' },
    { key: 'textColor', label: 'Text Color' },
    { key: 'createdAt', label: 'Created Date' },
  ];

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Global display filter: 'DEFAULT' (title/text banners) or 'IMAGE_ONLY'
  const [displayFilter, setDisplayFilter] = useState('DEFAULT');
  const [filterLoading, setFilterLoading] = useState(false);

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
        type: typeFilter !== 'ALL' ? typeFilter : undefined
      };
      const r = await adminAPI.getBanners(params);
      const data = r.data?.data || r.data;
      const list = data?.banners || data?.items || data || [];
      setBanners(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || (data?.total !== undefined ? { page: data.page, pages: data.total_pages, total: data.total, per_page: data.limit } : {});
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / pageSize) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) { setError('Failed to load banners'); console.warn('Failed to load banners:', e); } finally { setLoading(false); }
  };

  // Load the global display filter setting on mount
  useEffect(() => {
    const loadFilter = async () => {
      try {
        const res = await settingsAPI.getSetting('bannerDisplayFilter');
        const val = res?.data?.data?.value;
        if (val === 'IMAGE_ONLY') {
          setDisplayFilter('IMAGE_ONLY');
        }
      } catch { /* setting doesn't exist yet — defaults to DEFAULT */ }
    };
    loadFilter();
  }, []);

  // Toggle the global display filter
  const toggleDisplayFilter = async (mode) => {
    setFilterLoading(true);
    try {
      await settingsAPI.updateSetting('bannerDisplayFilter', mode);
      setDisplayFilter(mode);
      toast.success(mode === 'IMAGE_ONLY' ? 'Showing only Image Only banners' : 'Showing only Title/Text banners');
    } catch {
      toast.error('Failed to update display filter');
    } finally {
      setFilterLoading(false);
    }
  };

  // Reset page when search or filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      load(1);
    }
  }, [debouncedSearch, typeFilter, pageSize]);

  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title: b.title || '',
      imageUrl: getBannerImage(b) || '',
      videoUrl: b.videoUrl || '',
      type: b.type || 'HERO',
      link: b.linkUrl || b.link || '',
      description: b.description || '',
      displayMode: b.displayMode || 'DEFAULT',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        title: form.title,
        imageUrl: form.imageUrl,
        videoUrl: form.videoUrl,
        type: form.type,
        linkUrl: form.link,
        description: form.description,
        displayMode: form.displayMode,
      };
      if (editing) {
        await adminAPI.updateBanner(editing.id, payload);
        toast.success('Banner updated');
      } else {
        await adminAPI.createBanner(payload);
        toast.success('Banner created');
      }
      await load(currentPage);
      setShowModal(false);
    } catch { toast.error('Failed'); }
  };

  const handleToggle = async (id) => {
    try { 
      await adminAPI.toggleBanner(id); 
      toast.success('Status toggled'); 
      await load(currentPage);
    } catch { 
      toast.error('Failed'); 
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this banner?')) return;
    try { 
      await adminAPI.deleteBanner(id); 
      setBanners(banners.filter(b => b.id !== id)); 
      toast.success('Deleted'); 
      await load(currentPage);
    } catch { 
      toast.error('Failed'); 
    }
  };

  const handleReorder = async () => {
    try { 
      await adminAPI.reorderBanners({ order: banners.map(b => b.id) }); 
      toast.success('Order saved'); 
      await load(currentPage);
    } catch { 
      toast.error('Failed'); 
    }
  };

  const handleExportCSV = async (selectedColumns) => {
    setExporting(true);
    setExportStatus('dispatching');
    setExportError(null);
    try {
      const filters = {
        search: debouncedSearch || undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
      };
      Object.keys(filters).forEach(k => { if (filters[k] === undefined) delete filters[k]; });

      const dispatchRes = await adminAPI.dispatchExport({
        type: 'banners',
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
            const filename = statusRes.data?.data?.file_name || `banners-export-${new Date().toISOString().slice(0, 10)}.csv`;
            downloadBlob(downloadRes, filename);
            setExportStatus('completed');
            toast.success('Banners exported successfully');
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
      setExportError(err.response?.data?.message || err.message || 'Failed to export banners');
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <AdminPageShell
        title="Banners"
        subtitle="Manage homepage and promotional banners"
        loading={loading}
        error={error}
        page="banners"
        actions={
          <>
            <button className="btn-ghost btn-sm" onClick={() => setShowExportModal(true)}><Download size={14} /> Export CSV</button>
            <button className="btn-ghost btn-sm" onClick={handleReorder}><Save size={14} /> Save Order</button>
            <button className="btn-dark btn-sm" onClick={openCreate}>+ Add Banner</button>
          </>
        }
      >

      {/* Global Display Filter Toggle */}
      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }} className="flex items-center gap-1"><Home size={16} /> Homepage Banner Display:</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              Controls which banner type shows on the homepage hero section
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-muted, #f5f5f5)', borderRadius: '8px', padding: '2px' }}>              <button
              onClick={() => toggleDisplayFilter('DEFAULT')}
              disabled={filterLoading}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: displayFilter === 'DEFAULT' ? 700 : 500,
                background: displayFilter === 'DEFAULT' ? 'var(--primary, #ff6b00)' : 'transparent',
                color: displayFilter === 'DEFAULT' ? '#fff' : 'var(--text, #333)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <Image size={14} /><FileText size={14} /> Title Banners
            </button>
            <button
              onClick={() => toggleDisplayFilter('IMAGE_ONLY')}
              disabled={filterLoading}
              style={{
                padding: '0.4rem 0.9rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: displayFilter === 'IMAGE_ONLY' ? 700 : 500,
                background: displayFilter === 'IMAGE_ONLY' ? 'var(--primary, #ff6b00)' : 'transparent',
                color: displayFilter === 'IMAGE_ONLY' ? '#fff' : 'var(--text, #333)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 0.15s ease',
              }}
            >
              <Image size={14} /> Image Only
            </button>
          </div>
        </div>
        {displayFilter === 'IMAGE_ONLY' && (
          <div style={{ padding: '0.5rem 1rem 0.75rem', fontSize: '0.75rem', color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
            <Info size={14} /> Only banners with <strong>Image Only</strong> display mode will appear on the homepage. Title/Text banners are hidden.
          </div>
        )}
        {displayFilter === 'DEFAULT' && (
          <div style={{ padding: '0.5rem 1rem 0.75rem', fontSize: '0.75rem', color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
            <Info size={14} /> Only banners with <strong>Default (Image + Text)</strong> or <strong>Title Only</strong> display mode will appear on the homepage. Image Only banners are hidden.
          </div>
        )}
      </div>

      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search banners..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="table-filter" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="ALL">All Types</option>
            {BANNER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="table-count">{totalItems} banners</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Title</th><th>Type</th><th>Display Mode</th><th>Image</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {banners.length === 0 ? <tr><td colSpan={6}><div className="empty-state">            <div className="empty-state-icon"><Image size={40} /></div><h3>No banners yet</h3></div></td></tr> :
            banners.map(b => (
              <tr key={b.id}>
                <td>              {b.title ? <strong>{b.title}</strong> : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}><Image size={14} /> Image Only</span>}{b.description && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{b.description}</div>}</td>
                <td><span className="status-badge status-info">{b.type}</span></td>
                <td>
                  <span className={`status-badge ${
                    b.displayMode === 'IMAGE_ONLY' ? 'status-warning' :
                    b.displayMode === 'VIDEO' ? 'status-processing' :
                    b.displayMode === 'TITLE_ONLY' ? 'status-info' :
                    'status-success'
                  }`} style={{ fontSize: '0.68rem' }}>
                    {                    b.displayMode === 'IMAGE_ONLY' ? 'Image Only' :
                     b.displayMode === 'TITLE_ONLY' ? 'Title Only' :
                     'Default'}
                  </span>
                </td>
                <td>{getBannerImage(b) ? <img loading="lazy" src={getImageUrl(getBannerImage(b))} alt={b.title} style={{ width: 60, height: 30, objectFit: 'cover', borderRadius: 4 }} /> : <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>None</span>}</td>
                <td><span className={`status-badge ${b.isActive ? 'status-active' : 'status-inactive'}`}>{b.isActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div className="row-actions">
                    <button className="btn-edit" onClick={() => openEdit(b)}>Edit</button>
                    <button className={b.isActive ? 'btn-del' : 'btn-approve'} onClick={() => handleToggle(b.id)}>{b.isActive ? 'Disable' : 'Enable'}</button>
                    <button className="btn-del" onClick={() => handleDelete(b.id)}>Delete</button>
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

      {/* CSV Export Modal */}
      <ExportCSVModal
        isOpen={showExportModal}
        onClose={() => { setShowExportModal(false); setExportStatus(null); setExportError(null); }}
        columns={BANNER_COLUMNS}
        onExport={handleExportCSV}
        exporting={exporting}
        exportStatus={exportStatus}
        exportError={exportError}
        filename={`banners-export-${new Date().toISOString().slice(0, 10)}.csv`}
      />

      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header"><h3 className="flex items-center gap-2">{editing ? <><Edit size={18} /> Edit Banner</> : <><Plus size={18} /> New Banner</>}</h3><button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group form-full">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <ImageUploadZone
                        label="Banner Image"
                        value={form.imageUrl}
                        onChange={url => setForm({ ...form, imageUrl: url })}
                        multiple={false}
                      />
                    </div>
                    <button
                      onClick={handleAIGenerateBannerImage}
                      disabled={aiLoading}
                      className="btn-ghost btn-sm"
                      style={{
                        fontSize: '0.7rem', padding: '0.3rem 0.6rem', marginLeft: '0.5rem', flexShrink: 0,
                        color: '#2563eb', border: '1px solid #2563eb', borderRadius: 6,
                        display: 'flex', alignItems: 'center', gap: '0.25rem',
                        background: aiLoading ? '#eff6ff' : '#fff', cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                      title="Generate banner image with AI"
                    >
                      {aiLoading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : <Sparkles size={14} />}
                      {aiLoading ? 'Generating...' : 'AI Generate'}
                    </button>
                  </div>
                </div>

                {/* Reference Image for style matching */}
                <div className="form-group form-full" style={{ background: '#f0f9ff', borderRadius: 8, padding: '0.75rem', border: '1px solid #bae6fd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369a1', margin: 0 }} className="flex items-center gap-1"><Crosshair size={14} /> Style Reference (Optional)</label>
                    <span style={{ fontSize: '0.62rem', color: '#0369a1', opacity: 0.7 }}>AI matches this style</span>
                  </div>
                  <p style={{ fontSize: '0.68rem', color: '#64748b', marginBottom: '0.35rem', lineHeight: 1.3 }}>
                    Upload a reference banner or product photo — AI will analyze its colors, composition, and lighting, then generate a new banner matching that look.
                  </p>
                  <ImageUploadZone
                    label=""
                    value={bannerRefImageUrl}
                    onChange={setBannerRefImageUrl}
                    multiple={false}
                  />
                  {bannerRefImageUrl && (
                    <div style={{ fontSize: '0.65rem', color: '#0369a1', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span><Upload size={14} /> Reference set</span>
                      <button
                        onClick={() => setBannerRefImageUrl('')}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.68rem', textDecoration: 'underline', padding: 0 }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group"><label>Type</label><select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{BANNER_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
                <div className="form-group"><label>Link (e.g. /products)</label><input value={form.link} onChange={e => setForm({ ...form, link: e.target.value })} placeholder="/products" /></div>

                <div className="form-group"><label>Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Summer Sale" /></div>
                <div className="form-group"><label>Description</label><textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>

                {/* Video URL — shown only when VIDEO display mode is selected */}
                {form.displayMode === 'VIDEO' && (
                  <div className="form-group form-full">
                    <label className="flex items-center gap-1"><Video size={14} /> Banner Video URL</label>
                    <input
                      value={form.videoUrl}
                      onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                      placeholder="https://example.com/banner-video.mp4"
                      style={{ width: '100%' }}
                    />
                    <div style={{ marginTop: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--muted)' }}>
                      <span>Supported: MP4, WebM. Videos autoplay muted on the homepage hero.</span>
                    </div>
                    {form.videoUrl && (
                      <div style={{ marginTop: '0.5rem', borderRadius: 8, overflow: 'hidden', background: '#000' }}>
                        <video
                          src={form.videoUrl}
                          muted
                          loop
                          playsInline
                          autoPlay
                          style={{ width: '100%', maxHeight: 200, objectFit: 'cover' }}
                          onError={() => toast.error('Video failed to load — check the URL')}
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group form-full">
                  <label>Display Mode</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {DISPLAY_MODES.map(m => (
                      <label
                        key={m.value}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          cursor: 'pointer',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: `2px solid ${form.displayMode === m.value ? 'var(--primary)' : 'var(--border)'}`,
                          background: form.displayMode === m.value ? 'rgba(255,107,0,0.08)' : 'transparent',
                          fontWeight: form.displayMode === m.value ? 600 : 400,
                          fontSize: '0.85rem',
                          transition: 'all 0.15s ease',
                          flex: 1,
                          minWidth: '120px',
                        }}
                      >
                        <input
                          type="radio"
                          name="displayMode"
                          value={m.value}
                          checked={form.displayMode === m.value}
                          onChange={e => setForm({ ...form, displayMode: e.target.value })}
                          style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                        />
                        {m.icon} {m.label}
                      </label>
                    ))}
                  </div>
                  {form.displayMode === 'IMAGE_ONLY' && (
                    <div style={{ marginTop: '0.5rem', background: 'var(--bg-info, #f0f7ff)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-muted, #666)' }}>
                      ℹ️ Image-only banners display the full image with no text overlay. Title and description will be hidden on the frontend.
                    </div>
                  )}
                  {form.displayMode === 'TITLE_ONLY' && (
                    <div style={{ marginTop: '0.5rem', background: 'var(--bg-warning, #fff8e6)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-muted, #666)' }}>
                      ℹ️ Title-only banners show the text content without an image background. Text will appear over a dark gradient background.
                    </div>
                  )}
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

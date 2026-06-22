import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { settingsAPI } from '../../api/settings';
import { aiAPI } from '../../api/ai';
import { BANNER_TYPES } from '../../utils/constants';
import toast from '../../utils/toast';
import ImageUploadZone from '../../components/common/ImageUploadZone';
import { getImageUrl, getBannerImage } from '../../utils/formatters';

const DISPLAY_MODES = [
  { value: 'DEFAULT', label: 'Default (Image + Text)', icon: '🖼️📝' },
  { value: 'IMAGE_ONLY', label: 'Image Only', icon: '🖼️' },
  { value: 'TITLE_ONLY', label: 'Title Only', icon: '📝' },
];

const EMPTY = { title: '', imageUrl: '', type: 'HERO', link: '', description: '', displayMode: 'DEFAULT' };

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
  const limit = 10;

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: debouncedSearch || undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined
      };
      const r = await adminAPI.getBanners(params);
      const data = r.data?.data || r.data;
      const list = data?.banners || data?.items || data || [];
      setBanners(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || (data?.total !== undefined ? { page: data.page, pages: data.total_pages, total: data.total, per_page: data.limit } : {});
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / limit) || 1);
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
  }, [debouncedSearch, typeFilter]);

  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true); };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title: b.title || '',
      imageUrl: getBannerImage(b) || '',
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

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div><h2>Banners</h2><p>Manage homepage and promotional banners</p></div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn-ghost btn-sm" onClick={handleReorder}>💾 Save Order</button>
          <button className="btn-dark btn-sm" onClick={openCreate}>+ Add Banner</button>
        </div>
      </div>

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">⚠️</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}

      {/* Global Display Filter Toggle */}
      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>🏠 Homepage Banner Display:</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              Controls which banner type shows on the homepage hero section
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-muted, #f5f5f5)', borderRadius: '8px', padding: '2px' }}>
            <button
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
                transition: 'all 0.15s ease',
              }}
            >
              🖼️📝 Title Banners
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
                transition: 'all 0.15s ease',
              }}
            >
              🖼️ Image Only
            </button>
          </div>
        </div>
        {displayFilter === 'IMAGE_ONLY' && (
          <div style={{ padding: '0.5rem 1rem 0.75rem', fontSize: '0.75rem', color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
            ℹ️ Only banners with <strong>Image Only</strong> display mode will appear on the homepage. Title/Text banners are hidden.
          </div>
        )}
        {displayFilter === 'DEFAULT' && (
          <div style={{ padding: '0.5rem 1rem 0.75rem', fontSize: '0.75rem', color: 'var(--muted)', borderTop: '1px solid var(--border)' }}>
            ℹ️ Only banners with <strong>Default (Image + Text)</strong> or <strong>Title Only</strong> display mode will appear on the homepage. Image Only banners are hidden.
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
            {loading ? <tr><td colSpan={6}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr> :
            banners.length === 0 ? <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">🖼️</div><h3>No banners yet</h3></div></td></tr> :
            banners.map(b => (
              <tr key={b.id}>
                <td>{b.title ? <strong>{b.title}</strong> : <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>🖼️ Image Only</span>}{b.description && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{b.description}</div>}</td>
                <td><span className="status-badge status-info">{b.type}</span></td>
                <td>
                  <span className={`status-badge ${
                    b.displayMode === 'IMAGE_ONLY' ? 'status-warning' :
                    b.displayMode === 'TITLE_ONLY' ? 'status-info' :
                    'status-success'
                  }`} style={{ fontSize: '0.68rem' }}>
                    {b.displayMode === 'IMAGE_ONLY' ? '🖼️ Image Only' :
                     b.displayMode === 'TITLE_ONLY' ? '📝 Title Only' :
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

        {totalPages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} banners)</span>
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
          <div className="modal">
            <div className="modal-header"><h3>{editing ? '✏️ Edit Banner' : '➕ New Banner'}</h3><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
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
                      {aiLoading ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✨'}
                      {aiLoading ? 'Generating...' : 'AI Generate'}
                    </button>
                  </div>
                </div>

                {/* Reference Image for style matching */}
                <div className="form-group form-full" style={{ background: '#f0f9ff', borderRadius: 8, padding: '0.75rem', border: '1px solid #bae6fd' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0369a1', margin: 0 }}>🎯 Style Reference (Optional)</label>
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
                      <span>📎 Reference set</span>
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

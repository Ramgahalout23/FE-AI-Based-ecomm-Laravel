import { useState, useEffect, useCallback } from 'react';
import { reelsAPI } from '../../api/reels';
import { adminAPI } from '../../api/admin';
import { settingsAPI } from '../../api/settings';
import toast from '../../utils/toast';
import ImageUploadZone from '../../components/common/ImageUploadZone';
import { getImageUrl } from '../../utils/formatters';
import Pagination from '../../components/admin/Pagination';
import AdminFormField from '../../components/admin/AdminFormField';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField } from '../../hooks/validationRules';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import { downloadBlob } from '../../utils/download';

/* ── Video URL Helpers ── */
function isYouTubeUrl(url) {
  if (!url) return false;
  return /youtube\.com\/shorts\//i.test(url) || /youtube\.com\/watch\?v=/i.test(url) || /youtu\.be\//i.test(url);
}
function isVimeoUrl(url) {
  if (!url) return false;
  return /vimeo\.com\//i.test(url);
}
function isEmbedPlatform(url) {
  return isYouTubeUrl(url) || isVimeoUrl(url);
}
function getYouTubeEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:shorts\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/);
  return m?.[1] ? `https://www.youtube.com/embed/${m[1]}` : null;
}
function getVimeoEmbedUrl(url) {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m?.[1] ? `https://player.vimeo.com/video/${m[1]}` : null;
}

const EMPTY_FORM = {
  title: '',
  badge: '',
  description: '',
  videoUrl: '',
  imageUrl: '',
  linkUrl: '',
  isActive: true,
  productIds: [],
};

const REEL_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'videoUrl', label: 'Video URL' },
  { key: 'imageUrl', label: 'Image URL' },
  { key: 'linkUrl', label: 'Link URL' },
  { key: 'displayOrder', label: 'Display Order' },
  { key: 'isActive', label: 'Active' },
  { key: 'createdAt', label: 'Created Date' },
];

export default function ReelsAdminPage() {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reelsEnabled, setReelsEnabled] = useState(true);
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

  // ── Drag Reorder ──
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const [orderChanged, setOrderChanged] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likesReel, setLikesReel] = useState(null);
  const [reelLikes, setReelLikes] = useState([]);
  const [loadingLikes, setLoadingLikes] = useState(false);
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
      const r = await reelsAPI.getAll(params);
      const data = r.data?.data || r.data;
      const list = data?.items || data?.data || (Array.isArray(data) ? data : []);
      setReels(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || {};
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / pageSize) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) {
      setError('Failed to load reels');
      console.warn('Failed to load reels:', e);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentPage/load intentionally excluded: load is recreated each render
  }, [debouncedSearch, statusFilter, pageSize]);

  // ── CSV Export State ──
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  useEffect(() => {
    load(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is recreated each render; page changes are the only intended trigger
  }, [currentPage]);

  // ── Load reelsEnabled setting ──
  useEffect(() => {
    (async () => {
      try {
        const r = await settingsAPI.getSetting('reelsEnabled');
        const val = r?.data?.data?.value;
        setReelsEnabled(val !== 'false' && val !== '0');
      } catch {
        // default to enabled
      }
    })();
  }, []);

  // ── Master toggle for entire reels section ──
  const handleToggleSection = async () => {
    setTogglingSection(true);
    const newState = !reelsEnabled;
    try {
      await settingsAPI.updateSetting('reelsEnabled', newState ? 'true' : 'false');
      setReelsEnabled(newState);
      toast.success(newState ? 'Reels section enabled on homepage' : 'Reels section disabled on homepage');
    } catch {
      toast.error('Failed to toggle reels section');
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

    setReels((prevReels) => {
      const reordered = [...prevReels];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);
      return reordered.map((r, i) => ({ ...r, display_order: i }));
    });

    setOrderChanged(true);
    setDragIdx(null);
    setDragOverIdx(null);
  }, [dragIdx, dragOverIdx]);

  const handleSaveOrder = useCallback(async () => {
    setSavingOrder(true);
    try {
      const payload = reels.map((r) => ({ id: r.id, displayOrder: r.display_order }));
      await reelsAPI.reorder(payload);
      toast.success('Order saved');
      setOrderChanged(false);
    } catch {
      toast.error('Failed to save order');
      await load(currentPage);
    } finally {
      setSavingOrder(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is recreated each render
  }, [reels, currentPage]);

  const handleResetOrder = useCallback(async () => {
    await load(currentPage);
    setOrderChanged(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load is recreated each render
  }, [currentPage]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = async (reel) => {
    setEditing(reel);
    // Load reel with products
    try {
      const res = await reelsAPI.getById(reel.id);
      const data = res.data?.data || reel;
      setForm({
        title: data.title || '',
        badge: data.badge || '',
        description: data.description || '',
        videoUrl: data.video_url || '',
        imageUrl: data.image_url || '',
        linkUrl: data.link_url || '',
        isActive: data.is_active !== undefined ? data.is_active : true,
        productIds: (data.products || []).map(p => p.id),
      });
    } catch {
      setForm({
        title: reel.title || '',
        badge: reel.badge || '',
        description: reel.description || '',
        videoUrl: reel.video_url || '',
        imageUrl: reel.image_url || '',
        linkUrl: reel.link_url || '',
        isActive: reel.is_active !== undefined ? reel.is_active : true,
        productIds: [],
      });
    }
    setShowModal(true);
  };

  const validation = useAdminFormValidation({
    title: requiredField('Title'),
  });

  const handleSave = async () => {
    if (!validation.validateForm(form)) {
      return;
    }
    try {
      const payload = {
        title: form.title,
        badge: form.badge,
        description: form.description,
        videoUrl: form.videoUrl,
        imageUrl: form.imageUrl,
        linkUrl: form.linkUrl,
        isActive: form.isActive,
        productIds: form.productIds,
      };

      if (editing) {
        await reelsAPI.update(editing.id, payload);
      } else {
        await reelsAPI.create(payload);
      }

      toast.success(editing ? 'Reel updated' : 'Reel created');
      await load(currentPage);
      setShowModal(false);
    } catch {
      toast.error('Failed to save');
    }
  };

  const handleToggle = async (id) => {
    try {
      await reelsAPI.toggleStatus(id);
      toast.success('Status toggled');
      await load(currentPage);
    } catch {
      toast.error('Failed to toggle status');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this reel?')) return;
    try {
      await reelsAPI.delete(id);
      setReels(reels.filter((r) => r.id !== id));
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
          <h2>🎬 Reels</h2>
          <p>Manage video reels shown on the homepage slider</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            className={`btn-sm ${reelsEnabled ? 'btn-ghost' : 'btn-dark'}`}
            onClick={handleToggleSection}
            disabled={togglingSection}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.78rem',
              padding: '0.4rem 0.75rem',
              borderRadius: '0.5rem',
              border: reelsEnabled ? '1px solid var(--border)' : 'none',
              background: reelsEnabled ? 'transparent' : '#ef4444',
              color: reelsEnabled ? 'var(--text-muted)' : 'white',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { if (reelsEnabled) e.currentTarget.style.background = '#fee2e2'; }}
            onMouseLeave={(e) => { if (reelsEnabled) e.currentTarget.style.background = 'transparent'; }}
          >
            {togglingSection ? (
              <span className="spinner" style={{ width: 12, height: 12, borderColor: reelsEnabled ? '#ef4444' : '#fff', borderTopColor: 'transparent' }} />
            ) : reelsEnabled ? (
              <span style={{ fontSize: '1rem' }}>👁️</span>
            ) : (
              <span style={{ fontSize: '1rem' }}>🚫</span>
            )}
            {reelsEnabled ? 'Disable Section' : 'Enable Section'}
          </button>
          <button className="btn-dark btn-sm" onClick={openCreate}>
            + Add Reel
          </button>
          <button className="btn-dark btn-sm" onClick={() => setShowExportModal(true)}>📥 Export CSV</button>
        </div>
      </div>

      {!reelsEnabled && (
        <div className="admin-alert warning mb-4">
          <span className="admin-alert-icon">💡</span>
          <div className="admin-alert-body">
            <div>The reels section is currently <strong>hidden</strong> from the homepage. Click <strong>"Enable Section"</strong> above to show it.</div>
          </div>
        </div>
      )}

      {error && (
        <div className="admin-alert danger mb-4">
          <span className="admin-alert-icon">⚠️</span>
          <div className="admin-alert-body">
            <div className="admin-alert-title">Error Loading Data</div>
            <div>{error}</div>
          </div>
        </div>
      )}

      <div className="table-card">
        <div className="table-toolbar">
          <input
            className="table-search"
            placeholder="Search reels..."
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
          <span className="table-count">{totalItems} reels</span>

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
                {savingOrder ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '💾'}
                {savingOrder ? 'Saving...' : 'Save Order'}
              </button>
            </div>
          )}
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Preview</th>
              <th>Title</th>
              <th>Badge / Tag</th>
              <th>Description</th>
              <th>Type</th>
              <th>Likes</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8}>
                  <div className="loading-page" style={{ padding: '2rem' }}>
                    <div className="spinner" />
                  </div>
                </td>
              </tr>
            ) : reels.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🎬</div>
                    <h3>No reels yet</h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                      Add your first reel to showcase on the homepage slider.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              reels.map((reel, idx) => (
                <tr
                  key={reel.id}
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
                    {reel.video_url ? (
                      <div style={{
                        width: 60,
                        height: 80,
                        borderRadius: 8,
                        overflow: 'hidden',
                        background: '#111',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}>
                        <video
                          src={reel.video_url}
                          muted
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onMouseEnter={(e) => e.currentTarget.play()}
                          onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                        />
                        <span style={{
                          position: 'absolute',
                          fontSize: '1.2rem',
                          color: 'white',
                          opacity: 0.7,
                          pointerEvents: 'none',
                        }}>▶</span>
                      </div>
                    ) : reel.image_url ? (
                      <img
                        loading="lazy"
                        src={getImageUrl(reel.image_url)}
                        alt={reel.title}
                        style={{
                          width: 60,
                          height: 80,
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
                          height: 80,
                          borderRadius: 8,
                          background: '#f5f5f5',
                        }}
                      >
                        🎬
                      </span>
                    )}
                  </td>
                  <td>
                    <strong>{reel.title}</strong>
                  </td>
                  <td>
                    {reel.badge ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          background: 'linear-gradient(90deg, #92400e, #b45309)',
                          color: '#fef3c7',
                        }}
                      >
                        {reel.badge}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>
                        —
                      </span>
                    )}
                  </td>
                  <td style={{ color: 'var(--muted)', fontSize: '0.82rem', maxWidth: 280 }}>
                    {reel.description || <span style={{ fontStyle: 'italic' }}>No description</span>}
                  </td>
                  <td>
                    <span className="status-badge status-info" style={{ fontSize: '0.72rem' }}>
                      {reel.video_url ? '🎬 Video' : '🖼️ Image'}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge status-info" style={{ fontSize: '0.72rem', cursor: 'pointer' }}
                      onClick={() => {
                        setLikesReel(reel);
                        setShowLikesModal(true);
                        setLoadingLikes(true);
                        reelsAPI.getLikes(reel.id).then(r => {
                          const data = r?.data?.data || [];
                          setReelLikes(Array.isArray(data) ? data : []);
                        }).catch(() => setReelLikes([]))
                          .finally(() => setLoadingLikes(false));
                      }}
                    >
                      ❤️ {reel.likes_count ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${reel.is_active !== false ? 'status-active' : 'status-inactive'}`}>
                      {reel.is_active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-edit" onClick={() => openEdit(reel)}>
                        Edit
                      </button>
                      <button
                        className={reel.is_active !== false ? 'btn-del' : 'btn-approve'}
                        onClick={() => handleToggle(reel.id)}
                      >
                        {reel.is_active !== false ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn-del" onClick={() => handleDelete(reel.id)}>
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

      {showModal && (
        <div
          className="modal-overlay open"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="modal" style={{ maxWidth: '580px' }}>
            <div className="modal-header">
              <h3>{editing ? '✏️ Edit Reel' : '➕ New Reel'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                {/* Video URL — YouTube + MP4 + Vimeo all supported */}
                <div className="form-group form-full">
                  <label>Video URL <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(YouTube / MP4 / Vimeo)</span></label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      value={form.videoUrl}
                      onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
                      placeholder="https://youtube.com/shorts/... or https://example.com/reel.mp4"
                      style={{ flex: 1 }}
                    />
                    {form.videoUrl && (
                      <button
                        type="button"
                        className="btn-ghost btn-sm"
                        onClick={() => setForm({ ...form, videoUrl: '' })}
                        style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', flexShrink: 0 }}
                      >
                        ✕ Clear
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span>✅ YouTube Shorts — <code>youtube.com/shorts/...</code></span>
                    <span>✅ YouTube — <code>youtube.com/watch?v=...</code></span>
                    <span>✅ Vimeo — <code>vimeo.com/...</code></span>
                    <span>✅ MP4 — <code>*.mp4</code> direct URL</span>
                  </div>
                </div>

                {/* OR Upload a video file directly — MP4 / WebM / MOV */}
                <div className="form-group form-full">
                  <ImageUploadZone
                    label="Upload Video File (MP4 / WebM / MOV)"
                    value={form.videoUrl}
                    onChange={(url) => setForm({ ...form, videoUrl: url })}
                    multiple={false}
                    isVideo
                    accept="video/mp4,video/webm,video/quicktime,video/ogg"
                    maxSizeMB={40}
                  />
                </div>

                {/* OR Upload via ImageUploadZone */}
                <div className="form-group form-full">
                  <ImageUploadZone
                    label="Upload Video Thumbnail / Cover Image"
                    value={form.imageUrl}
                    onChange={(url) => setForm({ ...form, imageUrl: url })}
                    multiple={false}
                  />
                </div>

                <div className="form-group form-full">
                  <label>Or paste cover image URL</label>
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
                        ✕ Clear
                      </button>
                    )}
                  </div>
                </div>

                <AdminFormField label="Title" required error={validation.errors.title} valid={validation.validFields.title}>
                  <input
                    value={form.title}
                    onChange={(e) => {
                      setForm({ ...form, title: e.target.value });
                      validation.handleChange('title', e.target.value);
                    }}
                    placeholder="e.g. Summer Collection 2024"
                  />
                </AdminFormField>

                <div className="form-group">
                  <label>Badge / Tag (optional)</label>
                  <input
                    value={form.badge}
                    onChange={(e) => setForm({ ...form, badge: e.target.value })}
                    placeholder="e.g. Bestseller, Trending, New Drop"
                  />
                  <small style={{ color: '#888', fontSize: '0.7rem' }}>
                    Shown as the small tag on the reel card. Leave blank to use the linked product's badge.
                  </small>
                </div>

                <div className="form-group">
                  <label>Link URL (optional)</label>
                  <input
                    value={form.linkUrl}
                    onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
                    placeholder="/products/summer-collection"
                  />
                </div>

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
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="A brief description of this reel..."
                  />
                </div>

                {/* Product Attachment */}
                <div className="form-group form-full">
                  <label>Attach Products</label>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 6 }}>Select products to show in this reel. Only published products will be visible to customers.</p>
                  <ProductMultiSelect selected={form.productIds} onChange={ids => setForm({ ...form, productIds: ids })} />
                </div>

                {/* Preview — works with YouTube embed + MP4 + Vimeo */}
                {(form.videoUrl || form.imageUrl) && (
                  <div className="form-group form-full">
                    <label>Preview</label>
                    <div
                      style={{
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '1px solid var(--border)',
                        maxWidth: '320px',
                        background: '#111',
                        position: 'relative',
                      }}
                    >
                      {form.videoUrl && isEmbedPlatform(form.videoUrl) ? (
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9' }}>
                          <iframe
                            src={getYouTubeEmbedUrl(form.videoUrl) || getVimeoEmbedUrl(form.videoUrl)}
                            title="Video preview"
                            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '12px' }}
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      ) : form.videoUrl ? (
                        <video
                          src={form.videoUrl}
                          controls
                          muted
                          style={{ width: '100%', maxHeight: 320, display: 'block' }}
                        />
                      ) : (
                        <img
                          src={getImageUrl(form.imageUrl)}
                          alt="Preview"
                          style={{
                            width: '100%',
                            maxHeight: 320,
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                      )}
                      {/* Badge showing platform type */}
                      <div style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        background: form.videoUrl && isYouTubeUrl(form.videoUrl) ? '#ff0000' :
                                     form.videoUrl && isVimeoUrl(form.videoUrl) ? '#1ab7ea' :
                                     form.videoUrl ? '#22c55e' : '#666',
                        color: '#fff',
                        pointerEvents: 'none',
                      }}>
                        {form.videoUrl && isYouTubeUrl(form.videoUrl) ? 'YouTube' :
                         form.videoUrl && isVimeoUrl(form.videoUrl) ? 'Vimeo' :
                         form.videoUrl ? 'MP4' : 'Image'}
                      </div>
                    </div>
                  </div>
                )}
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

      {/* ── Likes Modal ── */}
      {showLikesModal && (
        <div
          className="modal-overlay open"
          onClick={(e) => e.target === e.currentTarget && setShowLikesModal(false)}
        >
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>❤️ Likes — {likesReel?.title || 'Reel'}</h3>
              <button className="modal-close" onClick={() => setShowLikesModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {loadingLikes ? (
                <div className="loading-page" style={{ padding: '2rem' }}>
                  <div className="spinner" />
                </div>
              ) : reelLikes.length === 0 ? (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <div className="empty-state-icon" style={{ fontSize: '2rem' }}>💔</div>
                  <h3>No likes yet</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                    This reel hasn't been liked by any users yet.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {reelLikes.map((like) => (
                    <div key={like.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      background: '#f9f9f9',
                      border: '1px solid #eee',
                    }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        flexShrink: 0,
                        overflow: 'hidden',
                      }}>
                        {like.user_avatar ? (
                          <img src={like.user_avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          like.user_name?.charAt(0)?.toUpperCase() || '?'
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#222' }}>
                          {like.user_name || 'Unknown User'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>
                          {like.user_email}
                        </div>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#aaa', whiteSpace: 'nowrap' }}>
                        {like.liked_at ? new Date(like.liked_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSV Export Modal */}
      <ExportCSVModal
        isOpen={showExportModal}
        onClose={() => { setShowExportModal(false); setExportStatus(null); setExportError(null); }}
        columns={REEL_COLUMNS}
        onExport={async (selectedColumns) => {
          setExporting(true);
          setExportStatus('dispatching');
          setExportError(null);
          try {
            const res = await adminAPI.dispatchExport({
              type: 'reels',
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
                  downloadBlob(dlRes, `reels-export-${new Date().toISOString().split('T')[0]}.csv`);
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

/* ── Product Multi-Select ── */
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
        {selected.filter(Boolean).map(pid => (
          <span key={pid} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', padding: '2px 6px', borderRadius: 4, background: '#f3f4f6', border: '1px solid #e5e7eb' }}>
            {pid.slice(0, 8)}...
            <button onClick={(e) => { e.stopPropagation(); toggle(pid); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#6b7280', fontSize: '0.72rem', lineHeight: 1 }}>x</button>
          </span>
        ))}
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
                    {p.sku && <span style={{ fontSize: '0.65rem', color: '#6b7280', fontFamily: 'monospace' }}>{p.sku}</span>}
                  </div>
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

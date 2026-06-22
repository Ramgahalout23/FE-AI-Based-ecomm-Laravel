import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { aiAPI } from '../../api/ai';
import { formatDate } from '../../utils/formatters';
import toast from '../../utils/toast';
import AdvancedPageEditor from '../../components/common/AdvancedPageEditor';

export default function PagesAdminPage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', slug: '', content: '', status: 'PUBLISHED' });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 10;

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const r = await adminAPI.getPages({ page, limit });
      const data = r.data?.data || r.data;
      const list = data?.pages || data?.items || data || [];
      setPages(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || {};
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / limit) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) { setError('Failed to load pages'); console.warn('Failed to load pages:', e); } finally { setLoading(false); }
  };

  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          setShowModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen, showModal]);

  const openCreate = () => { setEditing(null); setForm({ title: '', slug: '', content: '', status: 'PUBLISHED' }); setShowModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ title: p.title || '', slug: p.slug || '', content: p.content || '', status: p.status || 'PUBLISHED' }); setShowModal(true); };

  const handleSave = async () => {
    try {
      if (editing) {
        await adminAPI.updatePage(editing.id, form);
        toast.success('Page updated');
      } else {
        await adminAPI.createPage(form);
        toast.success('Page created');
      }
      await load(currentPage);
      setShowModal(false);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save page';
      toast.error(msg);
    }
  };

  // ── AI Generation ──
  const [aiLoadingContent, setAiLoadingContent] = useState(false);

  const handleAIGenerateContent = async () => {
    if (!form.title) { toast.error('Enter a page title first'); return; }
    setAiLoadingContent(true);
    try {
      const res = await aiAPI.generatePageContent({ title: form.title });
      const data = res.data?.data || {};
      if (data.content) {
        setForm(prev => ({ ...prev, content: data.content }));
        toast.success('Page content generated!');
      }
      if (data.seoTitle) console.log('✨ Suggested SEO Title:', data.seoTitle);
      if (data.seoDescription) console.log('✨ Suggested SEO Desc:', data.seoDescription);
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI generation failed');
    } finally {
      setAiLoadingContent(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this custom page?')) return;
    try { 
      await adminAPI.deletePage(id); 
      setPages(pages.filter(p => p.id !== id)); 
      toast.success('Deleted'); 
      await load(currentPage);
    } catch { 
      toast.error('Failed'); 
    }
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div><h2>Custom Pages (CMS)</h2><p>Manage static content, policies, and lookbooks</p></div>
        <button className="btn-dark btn-sm" onClick={openCreate}>+ Create Page</button>
      </div>

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">⚠️</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}
      <div className="table-card">
        <div className="table-head"><h3>All Pages ({totalItems} total)</h3></div>
        <table className="admin-table">
          <thead><tr><th>Title</th><th>Slug (URL)</th><th>Status</th><th>Last Modified</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : pages.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">📄</div><h3>No custom pages</h3></div></td></tr>
            ) : pages.map(p => (
              <tr key={p.id}>
                <td><strong>{p.title}</strong></td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--muted)' }}>/{p.slug}</td>
                <td>
                  <span className={`status-badge ${(p.status === 'PUBLISHED' || p.isPublished === true) ? 'status-active' : 'status-pending'}`}>
                    {(p.status === 'PUBLISHED' || p.isPublished === true) ? 'PUBLISHED' : 'DRAFT'}
                  </span>
                </td>
                <td style={{ fontSize: '0.82rem' }}>{formatDate(p.updatedAt || p.createdAt)}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn-edit" onClick={() => openEdit(p)}>Edit</button>
                    <button className="btn-del" onClick={() => handleDelete(p.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} pages total)
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
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                let pageNum;
                if (totalPages <= 10) pageNum = i + 1;
                else if (currentPage <= 5) pageNum = i + 1;
                else if (currentPage >= totalPages - 4) pageNum = totalPages - 9 + i;
                else pageNum = currentPage - 5 + i;
                return (
                  <button 
                    key={pageNum} 
                    className={pageNum === currentPage ? "btn-dark btn-sm" : "btn-ghost btn-sm"}
                    onClick={() => setCurrentPage(pageNum)}
                    style={{ minWidth: '32px' }}
                  >
                    {pageNum}
                  </button>
                );
              })}
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
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)} style={isFullscreen ? { padding: 0 } : {}}>
          <div className="modal" style={isFullscreen ? { maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%', borderRadius: 0, margin: 0 } : { maxWidth: 1200, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '8px' }}>
              <h3>{editing ? '✏️ Edit Page' : '➕ New Page'}</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button 
                  className="modal-close" 
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  style={{ fontSize: '18px', padding: '6px 12px', cursor: 'pointer', border: '1px solid #e5e5ea', background: '#fafafa', borderRadius: '6px', color: '#1a1a2e', fontWeight: '600' }}
                >
                  {isFullscreen ? '⛶' : '⛶'}
                </button>
                <button className="modal-close" onClick={() => { setShowModal(false); setIsFullscreen(false); }}>✕</button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-grid">
                <div className="form-group"><label>Page Title</label><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value, slug: editing ? form.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') })} placeholder="e.g. Terms and Conditions" /></div>
                <div className="form-group"><label>URL Slug</label><input value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="terms-and-conditions" /></div>
                <div className="form-group"><label>Visibility Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option></select></div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: isFullscreen ? 'calc(100vh - 200px)' : '600px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', display: 'block' }}>Page Content (Advanced Builder)</label>
                  <button
                    onClick={handleAIGenerateContent}
                    disabled={aiLoadingContent}
                    className="btn-ghost btn-sm"
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    title="Generate page content with AI"
                  >
                    {aiLoadingContent ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '✨'} {aiLoadingContent ? 'Generating...' : 'AI Generate Content'}
                  </button>
                </div>
                <AdvancedPageEditor key={editing?.id || 'new'} value={form.content} onChange={(content) => setForm({ ...form, content })} />
              </div>
            </div>
            <div className="modal-footer"><button className="btn-ghost btn-sm" onClick={() => { setShowModal(false); setIsFullscreen(false); }}>Cancel</button><button className="btn-dark btn-sm" onClick={handleSave}>{editing ? 'Update Page' : 'Publish Page'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

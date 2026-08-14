import { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { adminAPI } from '../../api/admin';
import { aiAPI } from '../../api/ai';
import { formatDate } from '../../utils/formatters';
import Pagination from '../../components/admin/Pagination';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import AdminFormField from '../../components/admin/AdminFormField';
import SaveButton from '../../components/admin/SaveButton';
import ActionButton from '../../components/admin/ActionButton';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField } from '../../hooks/validationRules';
import { downloadBlob } from '../../utils/download';
import toast from '../../utils/toast';
import ContentBlocks from '../../components/storefront/ContentBlocks';
import ContentProse from '../../components/storefront/ContentProse';
const AdvancedPageEditor = lazy(() => import('../../components/common/AdvancedPageEditor'));

/**
 * Extract AdvancedPageEditor section blocks from stored HTML.
 * The editor embeds its sections as base64 JSON inside:
 *   <div class="page-sections">BASE64</div>
 * Returns the parsed block array, or [] when content is plain HTML.
 */
function parseBlocks(content) {
  if (!content || typeof content !== 'string') return [];
  try {
    const match = content.match(/<div class="page-sections">([\s\S]*?)<\/div>/);
    if (!match) return [];
    const blocks = JSON.parse(decodeURIComponent(escape(atob(match[1]))));
    return Array.isArray(blocks) ? blocks : [];
  } catch {
    return [];
  }
}

const isPublished = (p) => p.status === 'PUBLISHED' || p.isPublished === true;

export default function PagesAdminPage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', slug: '', content: '', status: 'PUBLISHED' });
  const [search, setSearch] = useState('');

  // ── Row-level page preview modal (see how the page looks on the storefront) ──
  const [previewPage, setPreviewPage] = useState(null);

  // ── Inline form validation ──
  const validation = useAdminFormValidation({
    title: requiredField('Page title'),
    slug: requiredField('URL slug'),
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];

  // CSV Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  const PAGE_COLUMNS = [
    { key: 'title', label: 'Title' },
    { key: 'slug', label: 'Slug' },
    { key: 'metaTitle', label: 'Meta Title' },
    { key: 'metaDescription', label: 'Meta Description' },
    { key: 'isPublished', label: 'Published' },
    { key: 'createdAt', label: 'Created Date' },
    { key: 'updatedAt', label: 'Updated Date' },
  ];

  const handleExportCSV = async (selectedColumns) => {
    setExporting(true); setExportStatus('dispatching'); setExportError(null);
    try {
      const dispatchRes = await adminAPI.dispatchExport({ type: 'pages', filters: {}, columns: selectedColumns });
      const jobId = dispatchRes.data?.data?.id;
      if (!jobId) throw new Error('No job ID returned');
      setExportStatus('processing');
      const poll = async () => {
        try {
          const statusRes = await adminAPI.checkExportStatus(jobId);
          const status = statusRes.data?.data?.status;
          if (status === 'completed') {
            const downloadRes = await adminAPI.downloadExport(jobId);
            const filename = statusRes.data?.data?.file_name || `pages-export-${new Date().toISOString().slice(0, 10)}.csv`;
            downloadBlob(downloadRes, filename);
            setExportStatus('completed');
            toast.success('Pages exported successfully');
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
      setExportStatus('failed'); setExportError(err.response?.data?.message || err.message || 'Failed to export pages');
      toast.error('Export failed');
    } finally { setExporting(false); }
  };

  const load = async (page = 1, size = pageSize) => {
    setLoading(true);
    try {
      const r = await adminAPI.getPages({ page, limit: size });
      const data = r.data?.data || r.data;
      const list = data?.pages || data?.items || data || [];
      setPages(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || {};
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / size) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) { setError('Failed to load pages'); console.warn('Failed to load pages:', e); } finally { setLoading(false); }
  };

  useEffect(() => {
    load(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        if (previewPage) {
          setPreviewPage(null);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          setShowModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen, showModal, previewPage]);

  const openCreate = () => { setEditing(null); setForm({ title: '', slug: '', content: '', status: 'PUBLISHED' }); validation.reset(); setShowModal(true); };
  const openEdit = (p) => { setEditing(p); setForm({ title: p.title || '', slug: p.slug || '', content: p.content || '', status: p.status || 'PUBLISHED' }); validation.reset(); setShowModal(true); };

  const handleSave = async () => {
    if (!validation.validateForm(form)) return;
    try {
      if (editing) {
        await adminAPI.updatePage(editing.id, form);
        toast.success('Page updated');
      } else {
        await adminAPI.createPage(form);
        toast.success('Page created');
      }
      await load(currentPage);
      return true;
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to save page';
      toast.error(msg);
      return false;
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

  const filtered = useMemo(() => pages.filter(p =>
    !search.trim() ||
    (p.title || '').toLowerCase().includes(search.trim().toLowerCase()) ||
    (p.slug || '').toLowerCase().includes(search.trim().toLowerCase())
  ), [pages, search]);

  const stats = useMemo(() => {
    const published = pages.filter(isPublished).length;
    const drafts = pages.length - published;
    const sectionPages = pages.filter((p) => parseBlocks(p.content).length > 0).length;
    return { total: pages.length, published, drafts, sectionPages };
  }, [pages]);

  const handleDelete = async (id) => {
    try {
      await adminAPI.deletePage(id);
      setPages(pages.filter(p => p.id !== id));
      toast.success('Deleted');
      await load(currentPage);
      return true;
    } catch {
      toast.error('Failed');
      return false;
    }
  };

  const handleSeedDefaults = async () => {
    if (!confirm('Load sample page templates? This will add predefined pages (About, Privacy, FAQ, etc.) if they don\'t already exist.')) return;
    try {
      const res = await adminAPI.seedPageDefaults();
      toast.success(res.data?.message || 'Sample templates loaded!');
      await load(currentPage);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to load templates';
      toast.error(msg);
    }
  };

  const [seeding, setSeeding] = useState(false);

  const storeName = 'THREVOLT';

  return (
    <div>
      {/* ── Header ── */}
      <div className="admin-header admin-header-row" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h2>Custom Pages (CMS)</h2>
          <p>Create and manage storefront pages — policies, info pages, lookbooks, and more</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-ghost btn-sm" onClick={() => setShowExportModal(true)}>📥 Export CSV</button>
          <button className="btn-ghost btn-sm" onClick={() => { setSeeding(true); handleSeedDefaults().finally(() => setSeeding(false)); }} disabled={seeding}>
            {seeding ? '⏳ Loading...' : '📄 Load Sample Templates'}
          </button>
          <button className="btn-dark btn-sm" onClick={openCreate}>+ Create Page</button>
        </div>
      </div>

      {/* ── Summary stats ── */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginBottom: '1.5rem' }}>
        <div className="stat-card"><div className="stat-icon orders">📄</div><div className="stat-label">Total Pages</div><div className="stat-val">{stats.total}</div></div>
        <div className="stat-card"><div className="stat-icon revenue">✅</div><div className="stat-label">Published</div><div className="stat-val" style={{ color: 'var(--success)' }}>{stats.published}</div></div>
        <div className="stat-card"><div className="stat-icon alerts">✏️</div><div className="stat-label">Drafts</div><div className="stat-val" style={{ color: 'var(--warning)' }}>{stats.drafts}</div></div>
        <div className="stat-card"><div className="stat-icon users">🧱</div><div className="stat-label">Builder Pages</div><div className="stat-val">{stats.sectionPages}</div></div>
      </div>

      {error && <div className="admin-alert danger mb-4"><span className="admin-alert-icon">⚠️</span><div className="admin-alert-body"><div className="admin-alert-title">Error Loading Data</div><div>{error}</div></div></div>}
      <div className="table-card">
        <div className="table-head">
          <h3>All Pages ({filtered.length} shown / {totalItems} total)</h3>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Search pages…"
            style={{
              padding: '8px 14px',
              border: '1px solid #e5e5ea',
              borderRadius: 8,
              fontSize: 13,
              width: 240,
              maxWidth: '45%',
              outline: 'none',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={e => { e.target.style.borderColor = '#1a1a1a'; }}
            onBlur={e => { e.target.style.borderColor = '#e5e5ea'; }}
          />
        </div>
        <table className="admin-table">
          <thead><tr><th>Title</th><th>Slug (URL)</th><th>Status</th><th>Last Modified</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">📄</div><h3>{search ? `No pages match "${search}"` : 'No custom pages'}</h3><p style={{ marginTop: 8 }}>{search ? 'Try a different search.' : 'Create your first page to get started.'}</p></div></td></tr>
            ) : filtered.map(p => {
              const sectionCount = parseBlocks(p.content).length;
              return (
                <tr key={p.id}>
                  <td>
                    <strong>{p.title}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: '0.65rem',
                          padding: '2px 8px',
                          borderRadius: 999,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          background: sectionCount > 0 ? 'rgba(124,58,237,0.1)' : 'rgba(26,26,26,0.06)',
                          color: sectionCount > 0 ? '#7c3aed' : 'var(--muted)',
                        }}
                      >
                        {sectionCount > 0 ? `${sectionCount} section${sectionCount === 1 ? '' : 's'}` : 'Plain text'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <a
                      href={`/pages/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#2563eb', textDecoration: 'none', borderBottom: '1px dashed #c7d4f0' }}
                      title="Open on storefront"
                    >
                      /{p.slug}
                    </a>
                  </td>
                  <td>
                    <span className={`status-badge ${isPublished(p) ? 'status-active' : 'status-pending'}`}>
                      {isPublished(p) ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{formatDate(p.updatedAt || p.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-view" onClick={() => setPreviewPage(p)} title="Preview how this page looks">👁 Preview</button>
                      <button className="btn-edit" onClick={() => openEdit(p)}>Edit</button>
                      <ActionButton className="btn-del" confirm="Delete this custom page?" onClick={() => handleDelete(p.id)} idle="Delete" />
                    </div>
                  </td>
                </tr>
              );
            })}
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

      {/* ── Preview page modal (exact storefront rendering) ── */}
      {previewPage && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setPreviewPage(null)}>
          <div className="modal" style={{ maxWidth: 980, maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '8px', flexShrink: 0 }}>
              <h3>👁 Preview — {previewPage.title}</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a
                  className="btn-ghost btn-sm"
                  href={`/pages/${previewPage.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  title="Open on the live storefront"
                >
                  ↗ Open on Storefront
                </a>
                <button className="btn-ghost btn-sm" onClick={() => openEdit(previewPage)}>✏️ Edit Page</button>
                <button className="modal-close" onClick={() => setPreviewPage(null)}>✕</button>
              </div>
            </div>
            <div className="modal-body" style={{ flex: 1, overflow: 'auto', background: '#ffffff', padding: 0 }}>
              {parseBlocks(previewPage.content).length > 0 ? (
                <ContentBlocks blocks={parseBlocks(previewPage.content)} storeName={storeName} />
              ) : (
                <section style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>
                  <ContentProse html={previewPage.content || ''} />
                </section>
              )}
            </div>
            <div className="modal-footer" style={{ flexShrink: 0 }}>
              <button className="btn-ghost btn-sm" onClick={() => setPreviewPage(null)}>Close</button>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', marginLeft: 8 }}>
                {parseBlocks(previewPage.content).length > 0 ? 'Built with the Advanced Page Builder' : 'Plain HTML content'}
              </span>
            </div>
          </div>
        </div>
      )}

      <ExportCSVModal
        isOpen={showExportModal}
        onClose={() => { setShowExportModal(false); setExportStatus(null); setExportError(null); }}
        columns={PAGE_COLUMNS}
        onExport={handleExportCSV}
        exporting={exporting}
        exportStatus={exportStatus}
        exportError={exportError}
        filename={`pages-export-${new Date().toISOString().slice(0, 10)}.csv`}
      />

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
                <AdminFormField label="Page Title" required error={validation.errors.title} valid={validation.validFields.title}>
                  <input value={form.title} onChange={e => { setForm({ ...form, title: e.target.value, slug: editing ? form.slug : e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') }); validation.handleChange('title', e.target.value); }} placeholder="e.g. Terms and Conditions" />
                </AdminFormField>
                <AdminFormField label="URL Slug" required error={validation.errors.slug} valid={validation.validFields.slug}>
                  <input value={form.slug} onChange={e => { setForm({ ...form, slug: e.target.value }); validation.handleChange('slug', e.target.value); }} placeholder="terms-and-conditions" />
                </AdminFormField>
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
                <Suspense fallback={null}>
                  <AdvancedPageEditor
                    key={editing?.id || 'new'}
                    value={form.content}
                    onChange={(content) => setForm({ ...form, content })}
                    previewUrl={form.slug ? `${window.location.origin}/pages/${form.slug}` : null}
                  />
                </Suspense>
              </div>
            </div>
            <div className="modal-footer"><button className="btn-ghost btn-sm" onClick={() => { setShowModal(false); setIsFullscreen(false); }}>Cancel</button><SaveButton onClick={handleSave} onSuccess={() => { setShowModal(false); setIsFullscreen(false); }} idleLabel={editing ? 'Update Page' : 'Publish Page'} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

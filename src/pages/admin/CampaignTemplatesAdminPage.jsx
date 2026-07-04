import { Plus, RefreshCw, X, Search, Code2, Play, Pencil, Trash2, Eye, Layout, FileText } from 'lucide-react';
import { useState, useEffect } from 'react';
import { campaignTemplatesAPI } from '../../api/campaignTemplates';
import toast from '../../utils/toast';

;

const CATEGORIES = ['PROMOTIONAL', 'NEWSLETTER', 'WELCOME', 'SEASONAL', 'ABANDONED_CART', 'ORDER_CONFIRMATION', 'FOLLOW_UP', 'CUSTOM'];
const STATUSES = ['ACTIVE', 'INACTIVE', 'DRAFT'];

const EMPTY_FORM = { name: '', description: '', category: 'CUSTOM', content_html: '', variables: '', status: 'DRAFT' };

const CATEGORY_COLORS = {
  WELCOME: 'bg-blue-100 text-blue-600',
  PROMOTIONAL: 'bg-orange-100 text-orange-600',
  NEWSLETTER: 'bg-purple-100 text-purple-600',
  SEASONAL: 'bg-green-100 text-green-600',
  ABANDONED_CART: 'bg-red-100 text-red-600',
  ORDER_CONFIRMATION: 'bg-teal-100 text-teal-600',
  FOLLOW_UP: 'bg-indigo-100 text-indigo-600',
  CUSTOM: 'bg-gray-100 text-gray-600',
};

export default function CampaignTemplatesAdminPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await campaignTemplatesAPI.getTemplates({ limit: 100 });
      const data = r.data?.data?.data || r.data?.data || r.data || [];
      setTemplates(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load templates');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSeedDefaults = async () => {
    if (!window.confirm('This will create default templates if none exist. Continue?')) return;
    try {
      await campaignTemplatesAPI.seedDefaults();
      toast.success('Default templates seeded');
      load();
    } catch {
      toast.error('Failed to seed defaults');
    }
  };

  const resetForm = () => { setForm(EMPTY_FORM); setEditing(null); setPreviewHtml(null); };

  const openCreate = () => { resetForm(); setShowModal(true); };

  const openEdit = (tpl) => {
    setEditing(tpl);
    setForm({
      name: tpl.name || '',
      description: tpl.description || '',
      category: tpl.category || 'CUSTOM',
      content_html: tpl.content_html || '',
      variables: typeof tpl.variables === 'object' ? JSON.stringify(tpl.variables, null, 2) : (tpl.variables || ''),
      status: tpl.status || 'DRAFT',
    });
    setPreviewHtml(null);
    setShowModal(true);
  };

  const handlePreview = async () => {
    if (!editing && !form.name) {
      toast.error('Save the template first to preview');
      return;
    }
    setPreviewLoading(true);
    try {
      const r = await campaignTemplatesAPI.renderTemplate({ template_id: editing.id, variables: {} });
      const data = r.data?.data || r.data;
      setPreviewHtml(data?.html || form.content_html || '<p>No content</p>');
    } catch {
      setPreviewHtml(form.content_html || '<p>No content</p>');
    }
    setPreviewLoading(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Template name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        variables: form.variables ? (() => { try { return JSON.stringify(JSON.parse(form.variables)); } catch { return form.variables; } })() : null,
      };
      if (editing) {
        await campaignTemplatesAPI.updateTemplate(editing.id, payload);
        toast.success('Template updated');
      } else {
        await campaignTemplatesAPI.createTemplate(payload);
        toast.success('Template created');
      }
      setShowModal(false);
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save template');
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template? This cannot be undone.')) return;
    try {
      await campaignTemplatesAPI.deleteTemplate(id);
      toast.success('Template deleted');
      load();
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const filtered = templates.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !(t.description || '').toLowerCase().includes(search.toLowerCase())) return false;
    if (categoryFilter && t.category !== categoryFilter) return false;
    if (statusFilter && t.status !== statusFilter) return false;
    return true;
  });

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 12;
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div>
      {/* Header */}
      <div className="admin-header admin-header-row">
        <div>
          <h2>Campaign Templates</h2>
          <p>Manage email templates for campaigns — create, edit, preview, and seed defaults</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost btn-sm flex items-center gap-1.5" onClick={handleSeedDefaults}>
            <RefreshCw size={14} />
            Seed Defaults
          </button>
          <button className="btn-dark btn-sm flex items-center gap-1.5" onClick={openCreate}>
            <Plus size={14} />
            New Template
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="table-toolbar" style={{ marginBottom: '1rem' }}>
        <div className="flex items-center gap-3 flex-1">
          <div className="search-wrapper" style={{ position: 'relative', flex: '0 0 260px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              style={{ paddingLeft: '30px', width: '100%' }}
              placeholder="Search templates..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <span className="table-count">{filtered.length} template{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="loading-page"><div className="spinner" /></div>
      ) : paginated.length === 0 ? (
        <div className="empty-state" style={{ padding: '3rem' }}>
          <FileText size={48} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
          <h3>No templates found</h3>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', maxWidth: 400, margin: '0.5rem auto' }}>
            {search || categoryFilter || statusFilter
              ? 'Try adjusting your filters'
              : 'Create your first campaign template or seed default templates to get started.'}
          </p>
          {!search && !categoryFilter && !statusFilter && (
            <div className="flex items-center gap-2" style={{ marginTop: '0.75rem', justifyContent: 'center' }}>
              <button className="btn-dark btn-sm" onClick={openCreate}>Create Template</button>
              <button className="btn-ghost btn-sm" onClick={handleSeedDefaults}>Seed Defaults</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginated.map((tpl) => {
              const catColor = CATEGORY_COLORS[tpl.category] || 'bg-gray-100 text-gray-600';
              return (
                <div key={tpl.id} className="table-card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Preview area */}
                  <div
                    style={{
                      height: '140px',
                      background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    onClick={() => openEdit(tpl)}
                  >
                    {tpl.thumbnail ? (
                      <img src={tpl.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ textAlign: 'center', opacity: 0.4 }}>
                        <Layout size={36} />
                      </div>
                    )}
                    {tpl.is_default && (
                      <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(201,169,110,0.9)', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                        DEFAULT
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '0.85rem' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tpl.name}</h4>
                      </div>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: '0.25rem 0 0.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '1.5em' }}>
                      {tpl.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`status-badge ${catColor}`} style={{ fontSize: '0.65rem', fontWeight: 600 }}>
                        {tpl.category?.replace('_', ' ')}
                      </span>
                      <span className={`status-badge ${tpl.status === 'ACTIVE' ? 'status-active' : tpl.status === 'INACTIVE' ? 'status-pending' : ''}`} style={{ fontSize: '0.65rem' }}>
                        {tpl.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="row-actions" style={{ marginTop: '0.6rem', justifyContent: 'flex-end' }}>
                      <button className="btn-edit" onClick={() => openEdit(tpl)}>
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button className="btn-edit" onClick={async () => {
                        try {
                          const r = await campaignTemplatesAPI.renderTemplate({ template_id: tpl.id });
                          const data = r.data?.data || r.data;
                          setPreviewHtml(data?.html || tpl.content_html);
                        } catch {
                          setPreviewHtml(tpl.content_html);
                        }
                      }}>
                        <Eye size={14} />
                        Preview
                      </button>
                      <button className="btn-del" onClick={() => handleDelete(tpl.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.35rem', marginTop: '1.5rem' }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`btn-sm ${p === page ? 'btn-dark' : 'btn-ghost'}`} onClick={() => setPage(p)} style={{ minWidth: 32 }}>{p}</button>
              ))}
            </div>
          )}
        </>
      )}

      {/* Preview Overlay */}
      {previewHtml && (
        <div className="modal-overlay open" onClick={() => setPreviewHtml(null)}>
          <div className="modal" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 Template Preview</h3>
              <button className="modal-close" onClick={() => setPreviewHtml(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: 0 }}>
              <iframe
                title="Template preview"
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;margin:0;padding:20px;color:#1a1a1a}img{max-width:100%;height:auto}</style></head><body>${previewHtml}</body></html>`}
                sandbox="allow-same-origin"
                style={{ width: '100%', height: '500px', border: 'none', borderRadius: '0 0 12px 12px' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); resetForm(); } }}>
          <div className="modal" style={{ maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏️ Edit Template' : '➕ New Template'}</h3>
              <div className="flex items-center gap-2">
                {editing && (
                  <button className="btn-ghost btn-sm flex items-center gap-1" onClick={handlePreview} disabled={previewLoading}>
                    <Play size={12} />
                    {previewLoading ? '...' : 'Render'}
                  </button>
                )}
                <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
              </div>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Template Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Welcome Email" />
                </div>
                <div className="form-group form-full">
                  <label>Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this template..." rows={2} />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group form-full">
                  <label>
                    <div className="flex items-center gap-2">
                      <Code2 size={14} />
                      HTML Content
                    </div>
                  </label>
                  <textarea
                    value={form.content_html}
                    onChange={(e) => setForm({ ...form, content_html: e.target.value })}
                    placeholder="<h1>Welcome!</h1><p>{{userName}}, thank you for joining.</p>"
                    rows={10}
                    style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
                  />
                </div>
                <div className="form-group form-full">
                  <label>Variables (JSON)</label>
                  <textarea
                    value={form.variables}
                    onChange={(e) => setForm({ ...form, variables: e.target.value })}
                    placeholder='{"userName": "Customer", "storeName": "My Store"}'
                    rows={3}
                    style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem', display: 'block' }}>
                    Define variables that can be replaced in the template content.
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
              <button className="btn-dark btn-sm" onClick={handleSave} disabled={saving || !form.name.trim()}>
                {saving ? 'Saving...' : editing ? 'Update Template' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

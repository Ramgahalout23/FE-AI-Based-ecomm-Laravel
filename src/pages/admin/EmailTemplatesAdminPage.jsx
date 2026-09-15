import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Sparkles,
  RefreshCw,
  PenLine,
  Mail,
  CheckCircle,
  Eye,
  Code,
  Smartphone,
  Monitor,
  ExternalLink,
  Send,
  Search,
  Copy,
  Layers,
  FileCode,
  ShieldCheck,
} from 'lucide-react';
import { adminAPI } from '../../api/admin';
import toast from '../../utils/toast';
import './EmailTemplates.css';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField, emailAddress } from '../../hooks/validationRules';

const TEMPLATE_ICONS = {
  orderConfirmation: '📦',
  orderStatusUpdate: '🚚',
  passwordReset: '🔑',
  emailVerification: '✅',
  accountVerification: '🛡️',
  welcomeEmail: '👋',
  abandonedCart: '🛒',
};

const TEMPLATE_NAMES = {
  orderConfirmation: 'Order Confirmation',
  orderStatusUpdate: 'Order Status Update',
  passwordReset: 'Password Reset',
  emailVerification: 'Email Verification',
  accountVerification: 'Account Verification (OTP)',
  welcomeEmail: 'Welcome Email',
  abandonedCart: 'Abandoned Cart',
};

export default function EmailTemplatesAdminPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Template settings
  const [mode, setMode] = useState('default');
  const [customHtml, setCustomHtml] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Active view tab in right pane: 'preview' | 'editor' | 'ai'
  const [activeTab, setActiveTab] = useState('preview');
  const [previewDevice, setPreviewDevice] = useState('desktop'); // 'desktop' | 'mobile'

  // Sidebar search & filter
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'default' | 'custom'

  // Test email
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);

  // AI Draft
  const [aiDraft, setAiDraft] = useState(null);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiTone, setAiTone] = useState('friendly');

  const textareaRef = useRef(null);

  // Form validations
  const htmlValidation = useAdminFormValidation({
    customHtml: requiredField('Custom HTML content'),
  });
  const testEmailValidation = useAdminFormValidation({
    testEmail: emailAddress(),
  });

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedId) || null;
  }, [templates, selectedId]);

  // Load all templates
  const loadTemplates = useCallback(async () => {
    try {
      const res = await adminAPI.getEmailTemplates();
      const data = res.data?.data || [];
      setTemplates(Array.isArray(data) ? data : []);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
      }
    } catch (e) {
      console.warn('Failed to load email templates:', e);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  // Load selected template details
  const loadTemplateDetail = useCallback(async (id) => {
    try {
      const res = await adminAPI.getEmailTemplate(id);
      const data = res.data?.data || {};
      const tMode = String(data.mode || 'default').toLowerCase();
      setMode(tMode);
      setCustomHtml(data.customHtml || data.html || '');
      // Automatically load preview
      loadPreview(id, data.customHtml || data.html || '');
    } catch {
      toast.error('Failed to load template details');
    }
  }, []);

  const loadPreview = async (id, overrideHtml) => {
    if (!id) return;
    setPreviewLoading(true);
    try {
      const res = await adminAPI.previewEmailTemplate(id);
      const html = res.data?.data?.html || '';
      setPreviewHtml(html);
    } catch {
      // Ignore preview errors silently or show fallback
      setPreviewHtml('');
    } finally {
      setPreviewLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (selectedId) {
      loadTemplateDetail(selectedId);
    }
  }, [selectedId, loadTemplateDetail]);

  const handleSelectTemplate = (id) => {
    setSelectedId(id);
    htmlValidation.reset();
    testEmailValidation.reset();
  };

  // Filtered sidebar list
  const filteredTemplates = useMemo(() => {
    return templates.filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        t.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q) ||
        t.variables?.some((v) => v.toLowerCase().includes(q));

      const matchesMode =
        filterMode === 'all' ||
        (filterMode === 'custom' && (t.mode === 'custom' || t.hasCustom)) ||
        (filterMode === 'default' && t.mode !== 'custom');

      return matchesSearch && matchesMode;
    });
  }, [templates, search, filterMode]);

  // Derived Stats
  const activeCount = useMemo(() => {
    return templates.filter((t) => t.active !== false).length;
  }, [templates]);

  const customCount = useMemo(() => {
    return templates.filter((t) => t.mode === 'custom' || t.hasCustom).length;
  }, [templates]);

  // Save template handler
  const handleSave = async () => {
    if (!selectedId) return;
    if (mode === 'custom' && !htmlValidation.validateForm({ customHtml })) {
      return;
    }

    setSaving(true);
    try {
      await adminAPI.updateEmailTemplate(selectedId, {
        mode: mode.toLowerCase(),
        customHtml: mode === 'custom' ? customHtml : '',
        html: mode === 'custom' ? customHtml : '',
      });
      await loadTemplates();
      await loadPreview(selectedId, mode === 'custom' ? customHtml : '');
      toast.success(`Template "${selectedTemplate?.name || selectedId}" saved successfully`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Toggle active/inactive status
  const handleToggleActive = async (id) => {
    try {
      const res = await adminAPI.toggleEmailTemplate(id);
      const result = res.data?.data || {};
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, active: result.active } : t))
      );
      toast.success(`Template ${result.active ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to toggle template status');
    }
  };

  // Send test email
  const handleSendTest = async () => {
    if (!selectedId) return;
    if (!testEmailValidation.validateForm({ testEmail })) return;

    setTestLoading(true);
    try {
      await adminAPI.sendTestEmailTemplate(selectedId, {
        to: testEmail.trim(),
        email: testEmail.trim(),
      });
      toast.success(`Test email sent to ${testEmail}! Check inbox.`);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send test email');
    } finally {
      setTestLoading(false);
    }
  };

  // AI draft generator
  const handleAiDraft = async () => {
    if (!selectedId) return;
    setAiDraftLoading(true);
    setAiDraft(null);
    try {
      const r = await adminAPI.aiDraftEmailTemplate({
        type: selectedId,
        id: selectedId,
        name: selectedTemplate?.name || TEMPLATE_NAMES[selectedId] || selectedId,
        description: selectedTemplate?.description || '',
        tone: aiTone,
        variables: selectedTemplate?.variables || [],
      });
      const draftData = r.data?.data || null;
      setAiDraft(draftData);
      setActiveTab('ai');
      toast.success('AI draft generated! Review below.');
    } catch {
      toast.error('Failed to generate AI draft');
    } finally {
      setAiDraftLoading(false);
    }
  };

  const useAiDraft = () => {
    const htmlToUse = aiDraft?.html || aiDraft?.body;
    if (!htmlToUse) return;
    setMode('custom');
    setCustomHtml(htmlToUse);
    setActiveTab('editor');
    loadPreview(selectedId, htmlToUse);
    toast.success('AI draft applied to custom editor! Click Save when ready.');
  };

  // Insert variable tag into custom HTML editor
  const handleInsertVariable = (varName) => {
    const token = `{{${varName}}}`;
    navigator.clipboard?.writeText(token);
    toast.success(`Copied ${token} to clipboard!`);

    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const text = textarea.value;
      const updated = text.substring(0, start) + token + text.substring(end);
      setCustomHtml(updated);
      htmlValidation.handleChange('customHtml', updated);
    }
  };

  // Quick HTML snippets
  const handleInsertSnippet = (snippetType) => {
    let snippet = '';
    switch (snippetType) {
      case 'button':
        snippet = `\n<div style="text-align:center;margin:28px 0;">\n  <a href="https://example.com" style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">Click Here</a>\n</div>\n`;
        break;
      case 'card':
        snippet = `\n<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:20px 0;">\n  <h4 style="margin:0 0 6px;color:#0f172a;">Important Notice</h4>\n  <p style="margin:0;color:#64748b;font-size:13px;">Add your custom details here...</p>\n</div>\n`;
        break;
      case 'divider':
        snippet = `\n<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />\n`;
        break;
      default:
        break;
    }

    if (snippet && textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const text = textarea.value;
      const updated = text.substring(0, start) + snippet + text.substring(end);
      setCustomHtml(updated);
      htmlValidation.handleChange('customHtml', updated);
      toast.info('Snippet inserted into editor');
    }
  };

  if (loading) {
    return (
      <div className="admin-loading" style={{ padding: '4rem', textAlign: 'center' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem' }} />
        <p style={{ color: '#64748b', fontWeight: 600 }}>Loading email templates...</p>
      </div>
    );
  }

  return (
    <div className="email-templates-page">
      {/* Header */}
      <div className="admin-header admin-header-row" style={{ marginBottom: '1.25rem' }}>
        <div>
          <h2>✉️ Email Templates</h2>
          <p>Manage and customize transactional email templates, live previews, and automated notifications</p>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="email-stats-grid">
        <div className="email-stat-card">
          <div className="email-stat-icon" style={{ background: '#f1f5f9', color: '#0f172a' }}>
            <Mail size={20} />
          </div>
          <div>
            <div className="email-stat-title">Total Templates</div>
            <div className="email-stat-value">{templates.length}</div>
          </div>
        </div>

        <div className="email-stat-card">
          <div className="email-stat-icon" style={{ background: '#f0fdf4', color: '#16a34a' }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div className="email-stat-title">Active Templates</div>
            <div className="email-stat-value" style={{ color: '#16a34a' }}>
              {activeCount} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>/ {templates.length}</span>
            </div>
          </div>
        </div>

        <div className="email-stat-card">
          <div className="email-stat-icon" style={{ background: '#eff6ff', color: '#2563eb' }}>
            <FileCode size={20} />
          </div>
          <div>
            <div className="email-stat-title">Custom Overrides</div>
            <div className="email-stat-value" style={{ color: '#2563eb' }}>
              {customCount} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>active</span>
            </div>
          </div>
        </div>

        <div className="email-stat-card">
          <div className="email-stat-icon" style={{ background: '#faf5ff', color: '#7c3aed' }}>
            <ShieldCheck size={20} />
          </div>
          <div>
            <div className="email-stat-title">SMTP Status</div>
            <div className="email-stat-value" style={{ fontSize: '1.05rem', color: '#7c3aed' }}>
              Configured
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="templates-layout">
        {/* Left Sidebar: Template Directory */}
        <aside className="templates-sidebar">
          <div className="templates-sidebar-header">
            <div className="sidebar-header-top">
              <h3>Templates</h3>
              <span className="templates-count">{filteredTemplates.length}</span>
            </div>

            {/* Search Box */}
            <div className="sidebar-search-box">
              <Search
                size={13}
                style={{
                  position: 'absolute',
                  left: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                }}
              />
              <input
                className="sidebar-search-input"
                placeholder="Search templates or variables..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Filter Pills */}
            <div className="sidebar-filter-tabs">
              <button
                className={`sidebar-filter-btn ${filterMode === 'all' ? 'active' : ''}`}
                onClick={() => setFilterMode('all')}
              >
                All
              </button>
              <button
                className={`sidebar-filter-btn ${filterMode === 'default' ? 'active' : ''}`}
                onClick={() => setFilterMode('default')}
              >
                Default
              </button>
              <button
                className={`sidebar-filter-btn ${filterMode === 'custom' ? 'active' : ''}`}
                onClick={() => setFilterMode('custom')}
              >
                Custom
              </button>
            </div>
          </div>

          <div className="templates-list">
            {filteredTemplates.map((template) => {
              const isSelected = selectedId === template.id;
              const isCustom = template.mode === 'custom' || template.hasCustom;
              const isActive = template.active !== false;

              return (
                <button
                  key={template.id}
                  className={`template-list-item ${isSelected ? 'active' : ''}`}
                  onClick={() => handleSelectTemplate(template.id)}
                >
                  <div className="template-list-item-left">
                    <span className="template-list-icon">
                      {template.icon || TEMPLATE_ICONS[template.id] || '📧'}
                    </span>
                    <div className="template-list-info">
                      <span className="template-list-name">{template.name}</span>
                      <span className="template-list-desc">{template.description}</span>
                    </div>
                  </div>
                  <div className="template-list-item-right">
                    <span className={`template-badge ${isCustom ? 'badge-custom' : 'badge-default'}`}>
                      {isCustom ? 'Custom' : 'Default'}
                    </span>
                    {!isActive && <span className="badge-inactive">Inactive</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Editor & Preview Pane */}
        <main className="templates-editor">
          {!selectedId ? (
            <div className="templates-empty">
              <div className="templates-empty-icon">📧</div>
              <h3>Select a Template</h3>
              <p>Choose an email template from the directory on the left to customize or preview</p>
            </div>
          ) : (
            <div className="templates-editor-content">
              {/* Header Card */}
              <div className="editor-header-card">
                <div className="editor-header-left">
                  <span className="editor-header-icon">
                    {selectedTemplate?.icon || TEMPLATE_ICONS[selectedId] || '📧'}
                  </span>
                  <div>
                    <h3>{selectedTemplate?.name || TEMPLATE_NAMES[selectedId] || selectedId}</h3>
                    <p>{selectedTemplate?.description}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <button
                    className={`btn-ghost btn-sm ${selectedTemplate?.active !== false ? 'active' : ''}`}
                    onClick={() => handleToggleActive(selectedId)}
                    style={{
                      borderColor: selectedTemplate?.active !== false ? '#86efac' : '#fca5a5',
                      color: selectedTemplate?.active !== false ? '#15803d' : '#b91c1c',
                      background: selectedTemplate?.active !== false ? '#f0fdf4' : '#fef2f2',
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: selectedTemplate?.active !== false ? '#16a34a' : '#dc2626',
                        display: 'inline-block',
                        marginRight: 5,
                      }}
                    />
                    {selectedTemplate?.active !== false ? 'Active in Storefront' : 'Disabled'}
                  </button>
                </div>
              </div>

              {/* Variables Bar */}
              {selectedTemplate?.variables?.length > 0 && (
                <div className="editor-variables-card">
                  <div className="variables-header">
                    <span className="variables-title">Available Placeholders</span>
                    <span className="variables-hint">Click any chip to copy or insert into editor</span>
                  </div>
                  <div className="variables-list">
                    {selectedTemplate.variables.map((v) => (
                      <span
                        key={v}
                        className="variable-chip"
                        onClick={() => handleInsertVariable(v)}
                        title={`Click to copy {{${v}}}`}
                      >
                        <Copy size={10} style={{ display: 'inline', marginRight: 4, opacity: 0.7 }} />
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode Selector & Action Bar */}
              <div className="mode-switch-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>
                    Template Source:
                  </span>
                  <div className="mode-pills">
                    <button
                      className={`mode-pill ${mode === 'default' ? 'active' : ''}`}
                      onClick={() => {
                        setMode('default');
                        loadPreview(selectedId, '');
                      }}
                    >
                      🔄 System Default (Responsive)
                    </button>
                    <button
                      className={`mode-pill ${mode === 'custom' ? 'active' : ''}`}
                      onClick={() => {
                        setMode('custom');
                        setActiveTab('editor');
                        loadPreview(selectedId, customHtml);
                      }}
                    >
                      ✏️ Custom HTML Editor
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn-dark btn-sm" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner" style={{ width: 12, height: 12, marginRight: 5 }} /> Saving...
                      </>
                    ) : (
                      'Save Settings'
                    )}
                  </button>
                </div>
              </div>

              {/* Tab Navigation Header */}
              <div className="editor-tabs-nav">
                <div className="editor-tabs-left">
                  <button
                    className={`editor-tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTab('preview');
                      loadPreview(selectedId, mode === 'custom' ? customHtml : '');
                    }}
                  >
                    <Eye size={14} /> Live Preview
                  </button>
                  <button
                    className={`editor-tab-btn ${activeTab === 'editor' ? 'active' : ''}`}
                    onClick={() => setActiveTab('editor')}
                  >
                    <Code size={14} /> Custom HTML Code
                  </button>
                  <button
                    className={`editor-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ai')}
                  >
                    <Sparkles size={14} style={{ color: '#7c3aed' }} /> AI Assistant
                  </button>
                </div>

                {activeTab === 'preview' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div className="device-toggle-group">
                      <button
                        className={`device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                        onClick={() => setPreviewDevice('desktop')}
                        title="Desktop Preview (620px)"
                      >
                        <Monitor size={12} /> Desktop
                      </button>
                      <button
                        className={`device-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                        onClick={() => setPreviewDevice('mobile')}
                        title="Mobile Preview (375px)"
                      >
                        <Smartphone size={12} /> Mobile
                      </button>
                    </div>

                    <button
                      className="btn-ghost btn-sm"
                      onClick={() => loadPreview(selectedId, mode === 'custom' ? customHtml : '')}
                      disabled={previewLoading}
                      title="Refresh preview"
                    >
                      <RefreshCw size={12} className={previewLoading ? 'spin' : ''} />
                    </button>

                    {previewHtml && (
                      <button
                        className="btn-ghost btn-sm"
                        onClick={() => {
                          const win = window.open('', '_blank');
                          if (win) {
                            win.document.write(previewHtml);
                            win.document.close();
                          }
                        }}
                        title="Open preview in full window"
                      >
                        <ExternalLink size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Tab 1: Live Preview */}
              {activeTab === 'preview' && (
                <div className="preview-stage">
                  <div
                    className={`preview-frame-wrapper ${
                      previewDevice === 'mobile' ? 'preview-frame-mobile' : 'preview-frame-desktop'
                    }`}
                  >
                    {previewLoading ? (
                      <div style={{ padding: '3rem', textAlign: 'center' }}>
                        <div className="spinner" style={{ margin: '0 auto 0.75rem' }} />
                        <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Rendering template preview...</p>
                      </div>
                    ) : previewHtml ? (
                      <iframe
                        title="Email Template Preview"
                        className="preview-iframe"
                        srcDoc={previewHtml}
                        sandbox="allow-same-origin"
                      />
                    ) : (
                      <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                        <p>No preview generated yet. Click refresh to view.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Custom HTML Editor */}
              {activeTab === 'editor' && (
                <div>
                  <div className="snippet-toolbar">
                    <span className="snippet-label">Insert Snippet:</span>
                    <button
                      className="snippet-btn"
                      type="button"
                      onClick={() => handleInsertSnippet('button')}
                    >
                      + Action Button
                    </button>
                    <button
                      className="snippet-btn"
                      type="button"
                      onClick={() => handleInsertSnippet('card')}
                    >
                      + Callout Card
                    </button>
                    <button
                      className="snippet-btn"
                      type="button"
                      onClick={() => handleInsertSnippet('divider')}
                    >
                      + Divider Line
                    </button>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginLeft: 'auto' }}>
                      {customHtml.length} chars
                    </span>
                  </div>

                  <div className="editor-code-container">
                    <textarea
                      ref={textareaRef}
                      className="editor-code-textarea"
                      value={customHtml}
                      onChange={(e) => {
                        setCustomHtml(e.target.value);
                        htmlValidation.handleChange('customHtml', e.target.value);
                      }}
                      placeholder={`<!DOCTYPE html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n  <h1>Your custom {{customerName}} template</h1>\n</body>\n</html>`}
                      spellCheck={false}
                    />
                  </div>

                  {htmlValidation.errors.customHtml && (
                    <div className="form-error" role="alert" style={{ marginTop: '0.4rem' }}>
                      {htmlValidation.errors.customHtml}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      Ensure inline CSS styles are used for maximum email client compatibility (Gmail, Outlook, Apple Mail).
                    </span>
                    <button className="btn-dark btn-sm" onClick={handleSave} disabled={saving}>
                      {saving ? 'Saving...' : 'Save & Compile'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 3: AI Assistant */}
              {activeTab === 'ai' && (
                <div
                  style={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1.25rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <h4 style={{ margin: '0 0 2px', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                        ✨ AI Email Template Generator
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                        Generate a customized, responsive email template using your available variables.
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <select
                        value={aiTone}
                        onChange={(e) => setAiTone(e.target.value)}
                        style={{
                          padding: '0.35rem 0.6rem',
                          fontSize: '0.8rem',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: 'white',
                          fontWeight: 600,
                        }}
                      >
                        <option value="friendly">Friendly Tone</option>
                        <option value="professional">Professional Tone</option>
                        <option value="casual">Casual Tone</option>
                        <option value="urgent">Urgent Tone</option>
                        <option value="luxury">Luxury / Bespoke</option>
                      </select>

                      <button
                        className="btn-dark btn-sm"
                        onClick={handleAiDraft}
                        disabled={aiDraftLoading}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                      >
                        <Sparkles size={13} className={aiDraftLoading ? 'spin' : ''} />
                        {aiDraftLoading ? 'Drafting...' : 'Generate New Draft'}
                      </button>
                    </div>
                  </div>

                  {aiDraft ? (
                    <div
                      style={{
                        background: '#f8fafc',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        padding: '1rem 1.25rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div>
                          <strong style={{ fontSize: '0.88rem', color: '#0f172a' }}>
                            Subject: {aiDraft.subject}
                          </strong>
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: 2 }}>
                            Tone: <strong>{aiDraft.tone}</strong> | Status: Complete HTML ready
                          </div>
                        </div>

                        <button
                          className="btn-dark btn-sm"
                          onClick={useAiDraft}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <PenLine size={12} /> Apply to Editor
                        </button>
                      </div>

                      <div
                        style={{
                          maxHeight: '260px',
                          overflow: 'auto',
                          background: '#090d16',
                          color: '#a1a1aa',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          padding: '0.85rem',
                          borderRadius: '8px',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {aiDraft.html || aiDraft.body}
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                      <Sparkles size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '0.85rem' }}>
                        Select a tone and click <strong>Generate New Draft</strong> to create an email draft with AI.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Test Email Dispatch Card */}
              <div className="test-email-card">
                <div className="test-email-left">
                  <Send size={16} style={{ color: '#0f172a' }} />
                  <div>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a' }}>
                      Send Live Test Email
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Dispatches this template with sample data to verify mailbox rendering
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => {
                      setTestEmail(e.target.value);
                      testEmailValidation.handleChange('testEmail', e.target.value);
                    }}
                    placeholder="recipient@example.com"
                    className={`test-email-input ${
                      testEmailValidation.errors.testEmail ? 'field-invalid' : ''
                    }`}
                  />
                  <button
                    className="btn-dark btn-sm"
                    onClick={handleSendTest}
                    disabled={testLoading}
                  >
                    {testLoading ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, PenLine } from 'lucide-react';
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
  welcomeEmail: '👋',
  abandonedCart: '🛒',
};

const TEMPLATE_NAMES = {
  orderConfirmation: 'Order Confirmation',
  orderStatusUpdate: 'Order Status Update',
  passwordReset: 'Password Reset',
  emailVerification: 'Email Verification',
  welcomeEmail: 'Welcome Email',
  abandonedCart: 'Abandoned Cart',
};

export default function EmailTemplatesAdminPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState('default');
  const [customHtml, setCustomHtml] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  // AI Draft
  const [aiDraft, setAiDraft] = useState(null);
  const [aiDraftLoading, setAiDraftLoading] = useState(false);
  const [aiTone, setAiTone] = useState('friendly');

  // Animated inline validation — custom HTML (when in CUSTOM mode) and the
  // test-email recipient field.
  const htmlValidation = useAdminFormValidation({
    customHtml: requiredField('Custom HTML content'),
  });
  const testEmailValidation = useAdminFormValidation({
    testEmail: emailAddress(),
  });

  const selectedTemplate = templates.find(t => t.id === selectedId);

  const loadTemplates = useCallback(async () => {
    try {
      const res = await adminAPI.getEmailTemplates();
      const data = res.data?.data || [];
      setTemplates(data);
    } catch (e) {
      console.warn('Failed to load email templates:', e);
      toast.error('Failed to load email templates');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTemplateDetail = useCallback(async (id) => {
    try {
      const res = await adminAPI.getEmailTemplate(id);
      const data = res.data?.data || {};
      setMode(data.mode === 'CUSTOM' ? 'CUSTOM' : 'DEFAULT');
      setCustomHtml(data.html || '');
      setPreviewHtml('');
    } catch {
      toast.error('Failed to load template details');
    }
  }, []);

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
    setPreviewHtml('');
    htmlValidation.reset();
    testEmailValidation.reset();
  };

  const handleSave = async () => {
    if (!selectedId) return;
    // In CUSTOM mode the editor must have actual content before saving.
    if (mode === 'CUSTOM' && !htmlValidation.validateForm({ customHtml })) return;
    setSaving(true);
    try {
      await adminAPI.updateEmailTemplate(selectedId, {
        mode,
        html: mode === 'CUSTOM' ? customHtml : '',
      });
      // Refresh templates list to update mode/hasCustom
      await loadTemplates();
      toast.success('Template saved successfully');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedId) return;
    setPreviewLoading(true);
    try {
      const res = await adminAPI.previewEmailTemplate(selectedId);
      const html = res.data?.data?.html || '';
      setPreviewHtml(html);
      if (!html) toast.error('No preview available');
    } catch {
      toast.error('Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleToggleActive = async (id) => {
    try {
      const res = await adminAPI.toggleEmailTemplate(id);
      const result = res.data?.data || {};
      setTemplates(prev => prev.map(t =>
        t.id === id ? { ...t, active: result.active } : t
      ));
      toast.success(`Template ${result.active ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to toggle template');
    }
  };

  const handleAiDraft = async () => {
    if (!selectedId) return;
    setAiDraftLoading(true);
    setAiDraft(null);
    try {
      const r = await adminAPI.aiDraftEmailTemplate({
        type: selectedId,
        name: selectedTemplate?.name || TEMPLATE_NAMES[selectedId] || selectedId,
        description: selectedTemplate?.description || '',
        tone: aiTone,
        variables: selectedTemplate?.variables || [],
      });
      setAiDraft(r.data?.data || null);
    } catch {
      toast.error('Failed to generate AI draft');
    } finally {
      setAiDraftLoading(false);
    }
  };

  const useAiDraft = () => {
    if (!aiDraft?.html) return;
    setMode('CUSTOM');
    setCustomHtml(aiDraft.html);
    setPreviewHtml('');
    toast.success('AI draft loaded into the editor — review and save');
  };

  const handleSendTest = async () => {
    if (!selectedId) return;
    if (!testEmailValidation.validateForm({ testEmail })) return;
    setTestLoading(true);
    try {
      await adminAPI.sendTestEmailTemplate(selectedId, { email: testEmail });
      toast.success('Test email sent! Check your inbox.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to send test email');
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner" />
        <p>Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="email-templates-page">
      <div className="admin-header-row">
        <div>
          <h2>Email Templates</h2>
          <p>Manage all transactional email templates</p>
        </div>
      </div>

      <div className="templates-layout">
        {/* Left Sidebar - Template List */}
        <aside className="templates-sidebar">
          <div className="templates-sidebar-header">
            <h3>All Templates</h3>
            <span className="templates-count">{templates.length}</span>
          </div>
          <div className="templates-list">
            {templates.map(template => (
              <button
                key={template.id}
                className={`template-list-item ${selectedId === template.id ? 'active' : ''}`}
                onClick={() => handleSelectTemplate(template.id)}
              >
                <div className="template-list-item-left">
                  <span className="template-list-icon">{template.icon || TEMPLATE_ICONS[template.id] || '📧'}</span>
                  <div className="template-list-info">
                    <span className="template-list-name">{template.name}</span>
                    <span className="template-list-desc">{template.description}</span>
                  </div>
                </div>
                <div className="template-list-item-right">
                  <span className={`template-badge ${template.mode === 'custom' ? 'badge-custom' : 'badge-default'}`}>
                    {template.mode === 'CUSTOM' ? 'Custom' : 'Default'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Right Panel - Editor */}
        <main className="templates-editor">
          {!selectedId ? (
            <div className="templates-empty">
              <div className="templates-empty-icon">📧</div>
              <h3>Select a Template</h3>
              <p>Choose a template from the left sidebar to start editing</p>
            </div>
          ) : (
            <div className="templates-editor-content">
              {/* Template Header */}
              <div className="editor-header">
                <div className="editor-header-left">
                  <span className="editor-header-icon">{selectedTemplate?.icon || TEMPLATE_ICONS[selectedId] || '📧'}</span>
                  <div>
                    <h3>{selectedTemplate?.name || TEMPLATE_NAMES[selectedId] || selectedId}</h3>
                    <p>{selectedTemplate?.description}</p>
                  </div>
                </div>
                <div className="editor-header-right">
                  <button
                    className={`btn-toggle ${selectedTemplate?.active !== false ? 'active' : ''}`}
                    onClick={() => handleToggleActive(selectedId)}
                    title={selectedTemplate?.active !== false ? 'Click to deactivate' : 'Click to activate'}
                  >
                    <span className="toggle-dot" />
                    {selectedTemplate?.active !== false ? 'Active' : 'Inactive'}
                  </button>
                </div>
              </div>

              {/* Template Variables Info */}
              {selectedTemplate?.variables?.length > 0 && (
                <div className="editor-variables">
                  <strong>Available Variables:</strong>
                  <div className="variables-list">
                    {selectedTemplate.variables.map(v => (
                      <code key={v} className="variable-tag">{`{{${v}}}`}</code>
                    ))}
                  </div>
                </div>
              )}

              {/* Mode Selection */}
              <div className="editor-mode-selector">
                <label>Template Mode</label>
                <div className="mode-buttons">
                  <button
                    className={`mode-btn ${mode === 'DEFAULT' ? 'active' : ''}`}
                    onClick={() => setMode('DEFAULT')}
                  >
                    <span className="mode-icon">🔄</span>
                    <span className="mode-label">Default (Built-in)</span>
                    <span className="mode-desc">Use the system's built-in template</span>
                  </button>
                  <button
                    className={`mode-btn ${mode === 'CUSTOM' ? 'active' : ''}`}
                    onClick={() => setMode('CUSTOM')}
                  >
                    <span className="mode-icon">✏️</span>
                    <span className="mode-label">Custom HTML</span>
                    <span className="mode-desc">Write your own HTML template</span>
                  </button>
                </div>
              </div>

              {/* Custom HTML Editor */}
              {mode === 'CUSTOM' && (
                <div className={`editor-html-area ${htmlValidation.errors.customHtml ? 'has-error' : ''}`}>
                  <label>Custom HTML Content</label>
                  <textarea
                    className={`editor-textarea ${htmlValidation.errors.customHtml ? 'field-invalid' : htmlValidation.validFields.customHtml ? 'field-valid' : ''}`}
                    value={customHtml}
                    onChange={e => { setCustomHtml(e.target.value); htmlValidation.handleChange('customHtml', e.target.value); }}
                    placeholder={`<html>\n<body>\n  <h1>Your custom {{templateName}} template...</h1>\n</body>\n</html>`}
                    rows={16}
                    spellCheck={false}
                  />
                  {htmlValidation.errors.customHtml && <div className="form-error" role="alert">{htmlValidation.errors.customHtml}</div>}
                </div>
              )}

              {/* Action Buttons */}
              <div className="editor-actions">
                <div className="editor-actions-left">
                  <button
                    className="btn-dark btn-sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Template'}
                  </button>
                  <button
                    className="btn-ghost btn-sm"
                    onClick={handlePreview}
                    disabled={previewLoading}
                  >
                    {previewLoading ? 'Loading...' : 'Refresh Preview'}
                  </button>
                </div>
                <div className="editor-actions-right" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <select
                    value={aiTone}
                    onChange={e => setAiTone(e.target.value)}
                    title="Tone for the AI draft"
                    style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'white' }}
                  >
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="casual">Casual</option>
                    <option value="urgent">Urgent</option>
                    <option value="luxury">Luxury</option>
                  </select>
                  <button
                    className="btn-dark btn-sm"
                    onClick={handleAiDraft}
                    disabled={aiDraftLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    {aiDraftLoading ? <RefreshCw size={13} className="spin" /> : <Sparkles size={13} />}
                    {aiDraftLoading ? 'Drafting...' : (aiDraft ? 'Regenerate Draft' : 'AI Draft' )}
                  </button>
                </div>
              </div>

              {/* AI Draft Panel */}
              {aiDraft && (
                <div className="editor-ai-draft" style={{
                  marginTop: '1rem', padding: '1rem 1.25rem', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #eef2ff, #f5f3ff)',
                  border: '1px solid #e0e7ff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.85rem' }}>
                      <Sparkles size={15} style={{ color: 'var(--primary, #6366f1)' }} /> AI Draft
                      {aiDraft._mock && (
                        <span style={{
                          fontSize: '0.68rem', fontWeight: 600, padding: '0.12rem 0.45rem',
                          borderRadius: '999px', background: '#f3e8ff', color: '#7c3aed', border: '1px solid #e9d5ff',
                        }}>🧪 Mock</span>
                      )}
                    </div>
                    <button className="btn-dark btn-sm" onClick={useAiDraft} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <PenLine size={13} /> Use Draft
                    </button>
                  </div>
                  {aiDraft.subject && (
                    <div style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: '#444' }}>
                      <strong>Subject:</strong> {aiDraft.subject}
                    </div>
                  )}
                  {aiDraft.tone && (
                    <div style={{ marginTop: '0.3rem', fontSize: '0.78rem', color: '#666' }}>
                      <strong>Tone:</strong> {aiDraft.tone}
                    </div>
                  )}
                  <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#666' }}>
                    The draft is a complete HTML template using your available variables. Click <strong>Use Draft</strong> to load it into the Custom HTML editor, then review and save.
                  </div>
                </div>
              )}

              {/* Preview Panel */}
              <div className="editor-preview-section">
                <div className="preview-header">
                  <span>Preview</span>
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
                    >
                      Open in New Window
                    </button>
                  )}
                </div>
                {previewHtml ? (
                  <div
                    className="preview-content"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : (
                  <div className="preview-empty">
                    <span>👁️</span>
                    <p>Click "Refresh Preview" to see the rendered template</p>
                  </div>
                )}
              </div>

              {/* Test Email */}
              <div className="editor-test-section">
                <h4>Send Test Email</h4>
                <div className={`test-email-row ${testEmailValidation.errors.testEmail ? 'has-error' : ''}`}>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={e => { setTestEmail(e.target.value); testEmailValidation.handleChange('testEmail', e.target.value); }}
                    placeholder="Enter recipient email..."
                    className={`test-email-input ${testEmailValidation.errors.testEmail ? 'field-invalid' : testEmailValidation.validFields.testEmail ? 'field-valid' : ''}`}
                  />
                  <button
                    className="btn-dark btn-sm"
                    onClick={handleSendTest}
                    disabled={testLoading}
                  >
                    {testLoading ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
                {testEmailValidation.errors.testEmail && <div className="form-error" role="alert">{testEmailValidation.errors.testEmail}</div>}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

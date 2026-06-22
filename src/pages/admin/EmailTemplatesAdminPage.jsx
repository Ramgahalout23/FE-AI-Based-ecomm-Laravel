import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/admin';
import toast from '../../utils/toast';
import { useSettings } from '../../store/useSettings';
import './EmailTemplates.css';

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
  const { updateSettings } = useSettings();
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
    } catch (e) {
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
  };

  const handleSave = async () => {
    if (!selectedId) return;
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
    } catch (e) {
      toast.error('Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      const res = await adminAPI.toggleEmailTemplate(id);
      const result = res.data?.data || {};
      setTemplates(prev => prev.map(t =>
        t.id === id ? { ...t, active: result.active } : t
      ));
      toast.success(`Template ${result.active ? 'activated' : 'deactivated'}`);
    } catch (e) {
      toast.error('Failed to toggle template');
    }
  };

  const handleSendTest = async () => {
    if (!selectedId || !testEmail.trim()) {
      toast.error('Please enter a recipient email');
      return;
    }
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
                    onClick={() => handleToggleActive(selectedId, selectedTemplate?.active)}
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
              {mode === 'custom' && (
                <div className="editor-html-area">
                  <label>Custom HTML Content</label>
                  <textarea
                    className="editor-textarea"
                    value={customHtml}
                    onChange={e => setCustomHtml(e.target.value)}
                    placeholder={`<html>\n<body>\n  <h1>Your custom {{templateName}} template...</h1>\n</body>\n</html>`}
                    rows={16}
                    spellCheck={false}
                  />
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
              </div>

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
                <div className="test-email-row">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={e => setTestEmail(e.target.value)}
                    placeholder="Enter recipient email..."
                    className="test-email-input"
                  />
                  <button
                    className="btn-dark btn-sm"
                    onClick={handleSendTest}
                    disabled={testLoading || !testEmail.trim()}
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

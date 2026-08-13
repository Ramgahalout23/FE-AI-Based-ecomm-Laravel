import { Check, X, MessageSquare, Bell, Eye, RotateCcw, Sparkles, RefreshCw, PenLine } from 'lucide-react';
import { useState, useEffect } from 'react';
import { smsAPI } from '../../api/sms';
import { adminAPI } from '../../api/admin';
import { showSuccess, showError } from '../../utils/toast';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField } from '../../hooks/validationRules';

;

export default function NotificationTemplatesAdminPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [editData, setEditData] = useState({});
  const [previewData, setPreviewData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [previewSample, setPreviewSample] = useState('');
  // AI SMS draft
  const [aiSms, setAiSms] = useState(null);
  const [aiSmsLoading, setAiSmsLoading] = useState(false);
  const [aiSmsTone, setAiSmsTone] = useState('friendly');

  // Animated inline validation for the custom content fields (channel-aware:
  // SMS templates use `template`, in-app use `title` + `message`).
  const editValidation = useAdminFormValidation({
    title: requiredField('Notification title'),
    message: requiredField('Notification message'),
    template: requiredField('SMS template body'),
  });

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getNotificationTemplates();
      setTemplates(res?.data?.data || []);
    } catch {
      showError('Failed to load notification templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const selectTemplate = async (id) => {
    try {
      const res = await adminAPI.getNotificationTemplate(id);
      const t = res?.data?.data;
      if (!t) return;
      setSelectedId(id);
      setPreviewData(null);
      editValidation.reset();
      const vars = {};
      t.variables.forEach((v) => {
        vars[v] = `{${v}}`;
      });
      setPreviewSample(JSON.stringify(vars, null, 2));

      if (t.channel === 'sms') {
        setEditData({
          mode: t.mode,
          active: t.active,
          template: t.custom_template || '',
        });
      } else {
        setEditData({
          mode: t.mode,
          active: t.active,
          title: t.custom_title || '',
          message: t.custom_message || '',
        });
      }
    } catch {
      showError('Failed to load template details');
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;
    // In CUSTOM mode the edited fields must be non-empty before saving.
    const selected = templates.find((t) => t.id === selectedId);
    const fields = selected?.channel === 'sms'
      ? { template: editData.template }
      : { title: editData.title, message: editData.message };
    if (!editValidation.validateForm(fields)) return;
    setSaving(true);
    try {
      await adminAPI.updateNotificationTemplate(selectedId, editData);
      showSuccess('Template updated successfully');
      selectTemplate(selectedId);
      loadTemplates();
    } catch {
      showError('Failed to update template');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await adminAPI.toggleNotificationTemplate(id);
      const isActive = res?.data?.data?.active;
      showSuccess(isActive ? 'Template enabled' : 'Template disabled');
      if (selectedId === id) {
        setEditData((prev) => ({ ...prev, active: isActive }));
      }
      loadTemplates();
    } catch {
      showError('Failed to toggle template');
    }
  };

  const handlePreview = async () => {
    if (!selectedId) return;
    try {
      let sampleData;
      try {
        sampleData = JSON.parse(previewSample);
      } catch {
        sampleData = {};
      }
      const res = await adminAPI.previewNotificationTemplate(selectedId, { data: sampleData });
      setPreviewData(res?.data?.data);
    } catch {
      showError('Failed to preview template');
    }
  };

  const resetToDefault = () => {
    if (!selectedId) return;
    const t = templates.find((tmpl) => tmpl.id === selectedId);
    if (!t) return;
    editValidation.reset();
    if (t.channel === 'sms') {
      setEditData((prev) => ({ ...prev, mode: 'DEFAULT', template: '' }));
    } else {
      setEditData((prev) => ({ ...prev, mode: 'DEFAULT', title: '', message: '' }));
    }
  };

  const handleAiSmsDraft = async () => {
    if (!selectedId || !selected || selected.channel !== 'sms') return;
    setAiSmsLoading(true);
    setAiSms(null);
    try {
      const r = await smsAPI.aiDraft({
        type: selected.id,
        name: selected.name,
        description: selected.description,
        tone: aiSmsTone,
        variables: selected.variables || [],
      });
      setAiSms(r.data?.data || null);
    } catch {
      showError('Failed to generate AI SMS draft');
    } finally {
      setAiSmsLoading(false);
    }
  };

  const useAiSmsDraft = () => {
    if (!aiSms?.body) return;
    setEditData((prev) => ({ ...prev, mode: 'CUSTOM', template: aiSms.body }));
    setAiSms(null);
    showSuccess('AI draft loaded into the editor — review and save');
  };

  const channels = ['sms', 'in_app'];
  const filteredTemplates = (channel) => templates.filter((t) => t.channel === channel);
  const selected = templates.find((t) => t.id === selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin w-8 h-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-display font-semibold">Notification Templates</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Customize the SMS and in-app notification text sent to customers.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="lg:col-span-1 space-y-4">
          {channels.map((channel) => {
            const items = filteredTemplates(channel);
            if (items.length === 0) return null;
            return (
              <div key={channel}>
                <h3 className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-2 px-1 flex items-center gap-2">
                  {channel === 'sms' ? <MessageSquare size={14} /> : <Bell size={14} />}
                  {channel === 'sms' ? 'SMS Templates' : 'In-App Notifications'}
                </h3>
                <div className="space-y-1">
                  {items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => selectTemplate(t.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg transition-all text-sm flex items-center gap-3 ${
                        selectedId === t.id
                          ? 'bg-gold/10 border border-gold/30'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <span className="text-lg">{t.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate flex items-center gap-2">
                          {t.name}
                          {!t.active && (
                            <span className="text-[0.55rem] uppercase tracking-wider text-red-500 font-semibold bg-red-50 px-1.5 py-0.5 rounded">
                              Off
                            </span>
                          )}
                        </div>
                        <div className="text-gray-400 text-xs truncate">{t.description}</div>
                      </div>
                      {t.mode === 'CUSTOM' && (
                        <span className="text-[0.55rem] uppercase tracking-wider text-gold font-semibold bg-gold/10 px-1.5 py-0.5 rounded shrink-0">
                          Custom
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Edit Panel */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <Bell size={32} />
              <p className="text-sm">Select a template from the left to customize its content.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Template Info */}
              <div className="bg-white rounded-xl border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selected.icon}</span>
                    <div>
                      <h2 className="font-semibold">{selected.name}</h2>
                      <p className="text-xs text-gray-400">{selected.description}</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editData.active !== false}
                      onChange={() => handleToggle(selected.id)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                  </label>
                </div>

                {/* Available Variables */}
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Available Variables
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.variables.map((v) => (
                      <code
                        key={v}
                        className="text-xs bg-white border px-2 py-0.5 rounded text-gold font-mono"
                      >
                        {'{'}{v}{'}'}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Edit Area */}
                <div className="space-y-3">
                  {/* Mode Selector */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={resetToDefault}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        editData.mode === 'DEFAULT'
                          ? 'bg-gold text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Default
                    </button>
                    <button
                      onClick={() => setEditData((prev) => ({ ...prev, mode: 'CUSTOM' }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        editData.mode === 'CUSTOM'
                          ? 'bg-gold text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Custom
                    </button>
                    {editData.mode === 'CUSTOM' && (
                      <button
                        onClick={resetToDefault}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 transition-all"
                      >
                        <RotateCcw size={12} />
                        Reset to default
                      </button>
                    )}
                  </div>

                  {/* Content Fields */}
                  {selected.channel === 'sms' ? (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        SMS Template Body
                      </label>
                      <textarea
                        value={editData.mode === 'CUSTOM' ? editData.template : selected.default_template}
                        onChange={(e) => { setEditData((prev) => ({ ...prev, template: e.target.value })); editValidation.handleChange('template', e.target.value); }}
                        disabled={editData.mode !== 'CUSTOM'}
                        rows={4}
                        className={`w-full border rounded-lg px-3 py-2 text-sm font-mono disabled:bg-gray-50 disabled:text-gray-400 resize-y ${editValidation.errors.template ? 'field-invalid' : editValidation.validFields.template ? 'field-valid' : ''}`}
                      />
                      {editValidation.errors.template && <div className="form-error" role="alert">{editValidation.errors.template}</div>}
                      {editData.mode === 'DEFAULT' && (
                        <div className="bg-gray-50 border rounded-lg p-3 mt-2">
                          <div className="text-xs font-semibold text-gray-500 mb-1">Default Template</div>
                          <div className="text-sm text-gray-700 font-mono whitespace-pre-wrap">{selected.default_template}</div>
                        </div>
                      )}

                      {/* AI SMS Draft */}
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <select
                          value={aiSmsTone}
                          onChange={(e) => setAiSmsTone(e.target.value)}
                          title="Tone for the AI draft"
                          className="border rounded-lg px-2 py-1.5 text-xs bg-white"
                        >
                          <option value="friendly">Friendly</option>
                          <option value="professional">Professional</option>
                          <option value="casual">Casual</option>
                          <option value="urgent">Urgent</option>
                          <option value="luxury">Luxury</option>
                        </select>
                        <button
                          onClick={handleAiSmsDraft}
                          disabled={aiSmsLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-gold text-white rounded-lg text-xs font-medium hover:bg-gold-dark transition-all disabled:opacity-50"
                        >
                          {aiSmsLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          {aiSmsLoading ? 'Drafting...' : (aiSms ? 'Regenerate' : 'AI Draft')}
                        </button>
                      </div>

                      {aiSms && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mt-2">
                          <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
                            <div className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                              <Sparkles size={12} /> AI Draft
                              {aiSms._mock && (
                                <span className="text-[0.6rem] font-semibold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200">🧪 Mock</span>
                              )}
                            </div>
                            <button
                              onClick={useAiSmsDraft}
                              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 text-white rounded-md text-xs font-medium hover:bg-indigo-700 transition-all"
                            >
                              <PenLine size={11} /> Use Draft
                            </button>
                          </div>
                          <div className="text-sm text-gray-700 font-mono whitespace-pre-wrap bg-white rounded-md border border-indigo-100 p-2">
                            {aiSms.body}
                          </div>
                          <div className="text-[0.68rem] text-gray-500 mt-1.5">
                            {aiSms.characterCount} characters · {aiSms.segments} SMS segment{aiSms.segments > 1 ? 's' : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Notification Title
                        </label>
                        <input
                          type="text"
                          value={editData.mode === 'CUSTOM' ? editData.title : selected.default_title}
                          onChange={(e) => { setEditData((prev) => ({ ...prev, title: e.target.value })); editValidation.handleChange('title', e.target.value); }}
                          disabled={editData.mode !== 'CUSTOM'}
                          className={`w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400 ${editValidation.errors.title ? 'field-invalid' : editValidation.validFields.title ? 'field-valid' : ''}`}
                        />
                        {editValidation.errors.title && <div className="form-error" role="alert">{editValidation.errors.title}</div>}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                          Notification Message
                        </label>
                        <textarea
                          value={editData.mode === 'CUSTOM' ? editData.message : selected.default_message}
                          onChange={(e) => { setEditData((prev) => ({ ...prev, message: e.target.value })); editValidation.handleChange('message', e.target.value); }}
                          disabled={editData.mode !== 'CUSTOM'}
                          rows={3}
                          className={`w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-400 resize-y ${editValidation.errors.message ? 'field-invalid' : editValidation.validFields.message ? 'field-valid' : ''}`}
                        />
                        {editValidation.errors.message && <div className="form-error" role="alert">{editValidation.errors.message}</div>}
                      </div>
                      {editData.mode === 'DEFAULT' && (
                        <div className="bg-gray-50 border rounded-lg p-3">
                          <div className="text-xs font-semibold text-gray-500 mb-1">Default Title</div>
                          <div className="text-sm text-gray-700 font-medium mb-2">{selected.default_title}</div>
                          <div className="text-xs font-semibold text-gray-500 mb-1">Default Message</div>
                          <div className="text-sm text-gray-700">{selected.default_message}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <button
                    onClick={handleSave}
                    disabled={saving || editData.mode !== 'CUSTOM'}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gold text-white rounded-lg text-sm font-medium hover:bg-gold-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <Check size={16} />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => selectTemplate(selected.id)}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-sm transition-all"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </div>

              {/* Preview Section */}
              <div className="bg-white rounded-xl border p-5">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Eye size={16} />
                  Preview
                </h3>

                {/* Sample Data Input */}
                <div className="mb-3">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Sample Variables (JSON)
                  </label>
                  <textarea
                    value={previewSample}
                    onChange={(e) => setPreviewSample(e.target.value)}
                    rows={3}
                    className="w-full border rounded-lg px-3 py-2 text-xs font-mono resize-y"
                    placeholder='{"customerName": "John", "orderNumber": "ORD-1234"}'
                  />
                </div>

                <button
                  onClick={handlePreview}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all mb-4"
                >
                  <Eye size={14} />
                  Render Preview
                </button>

                {previewData && (
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {previewData.rendered === false && previewData.active === false && (
                      <div className="text-sm text-yellow-600 flex items-center gap-2">
                        <X size={14} />
                        Template is disabled — no notification will be sent.
                      </div>
                    )}

                    {previewData.channel === 'sms' && previewData.body && (
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">SMS Body</div>
                        <div className="bg-white border rounded-lg p-3 text-sm whitespace-pre-wrap">{previewData.body}</div>
                      </div>
                    )}

                    {previewData.channel === 'in_app' && (
                      <>
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Title</div>
                          <div className="bg-white border rounded-lg p-3 text-sm font-medium">{previewData.title}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Message</div>
                          <div className="bg-white border rounded-lg p-3 text-sm">{previewData.message}</div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

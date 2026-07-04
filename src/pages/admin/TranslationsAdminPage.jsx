import { Search, Plus, Globe, Check, X, ChevronDown, ChevronRight, Save, Download, Upload, Sparkles, Trash2, Pencil, RotateCcw, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { adminAPI } from '../../api/admin';
import { aiAPI } from '../../api/ai';
import toast from '../../utils/toast';

;

const GROUPS = [
  { value: 'frontend', label: 'Frontend (Store)' },
  { value: 'admin', label: 'Admin Panel' },
  { value: 'email', label: 'Email Templates' },
];

const EMPTY_LANGUAGE = { code: '', name: '', native_name: '', is_default: false, is_active: true };

/** Parse a single CSV line respecting double-quoted values */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++; // Skip next quote
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

export default function TranslationsAdminPage() {
  const [activeTab, setActiveTab] = useState('languages');

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div>
          <h2>🌐 Translations & Languages</h2>
          <p>Manage supported languages and translate your store content</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.5rem', background: '#f1f5f9', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('languages')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'languages' ? 700 : 500,
            background: activeTab === 'languages' ? '#fff' : 'transparent',
            color: activeTab === 'languages' ? '#1a1a1a' : '#64748b',
            boxShadow: activeTab === 'languages' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Globe size={15} /> Languages
        </button>
        <button
          onClick={() => setActiveTab('translations')}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'translations' ? 700 : 500,
            background: activeTab === 'translations' ? '#fff' : 'transparent',
            color: activeTab === 'translations' ? '#1a1a1a' : '#64748b',
            boxShadow: activeTab === 'translations' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          <Pencil size={15} /> Translation Keys
        </button>
      </div>

      {activeTab === 'languages' ? <LanguagesTab /> : <TranslationsTab />}
    </div>
  );
}

/* ════════════════════════════════════════
   LANGUAGES TAB
   ════════════════════════════════════════ */
function LanguagesTab() {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_LANGUAGE);
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminAPI.getAdminLanguages();
      const data = r.data?.data || r.data || [];
      setLanguages(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load languages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_LANGUAGE);
    setShowModal(true);
  };

  const openEdit = (lang) => {
    setEditing(lang);
    setForm({
      code: lang.code || '',
      name: lang.name || '',
      native_name: lang.native_name || '',
      is_default: lang.is_default || false,
      is_active: lang.is_active !== false,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.name) {
      toast.error('Language code and name are required');
      return;
    }
    try {
      await adminAPI.createLanguage(form);
      toast.success(editing ? 'Language updated' : 'Language created');
      await load();
      setShowModal(false);
    } catch {
      toast.error('Failed to save language');
    }
  };

  const handleToggleActive = async (lang) => {
    setTogglingId(lang.id);
    try {
      await adminAPI.createLanguage({
        code: lang.code,
        name: lang.name,
        native_name: lang.native_name || '',
        is_default: lang.is_default || false,
        is_active: !(lang.is_active !== false),
      });
      toast.success(lang.is_active !== false ? `Language "${lang.code}" deactivated` : `Language "${lang.code}" activated`);
      await load();
    } catch {
      toast.error('Failed to toggle language status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id, code) => {
    if (!confirm(`Delete "${code}" language and all its translations? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteLanguage(id);
      toast.success(`Language "${code}" deleted`);
      await load();
    } catch {
      toast.error('Failed to delete language');
    }
  };

  if (error) {
    return (
      <div className="admin-alert danger mb-4">
        <span className="admin-alert-icon">⚠️</span>
        <div className="admin-alert-body">
          <div className="admin-alert-title">Error Loading Data</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="table-card">
        <div className="table-toolbar">
          <span className="table-count">{languages.length} languages</span>
          <button className="btn-dark btn-sm" onClick={openCreate}>
            <Plus size={14} style={{ marginRight: 4 }} /> Add Language
          </button>
        </div>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Native Name</th>
              <th>Status</th>
              <th>Default</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : languages.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">🌐</div><h3>No languages yet</h3><p>Add your first language to start translating your store.</p></div></td></tr>
            ) : (
              languages.map((lang) => (
                <tr key={lang.id} style={{ opacity: lang.is_active !== false ? 1 : 0.55 }}>
                  <td><code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.82rem' }}>{lang.code}</code></td>
                  <td><strong>{lang.name}</strong></td>
                  <td style={{ color: 'var(--muted)' }}>{lang.native_name || '—'}</td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(lang)}
                      disabled={togglingId === lang.id}
                      className={`status-badge ${lang.is_active !== false ? 'status-active' : 'status-inactive'}`}
                      style={{ border: 'none', cursor: 'pointer', opacity: togglingId === lang.id ? 0.6 : 1 }}
                    >
                      {togglingId === lang.id ? (
                        <><span className="spinner" style={{ width: 10, height: 10, display: 'inline-block', marginRight: 4 }} /> Toggling...</>
                      ) : (
                        lang.is_active !== false ? 'Active' : 'Inactive'
                      )}
                    </button>
                  </td>
                  <td>
                    {lang.is_default ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#16a34a', fontWeight: 600, fontSize: '0.78rem' }}>
                        <Check size={14} Circle /> Default
                      </span>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>—</span>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-edit" onClick={() => openEdit(lang)}>Edit</button>
                      {!lang.is_default && (
                        <button className="btn-del" onClick={() => handleDelete(lang.id, lang.code)} disabled={lang.is_default}>
                          <Trash2 size={13} style={{ marginRight: 2 }} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Language Modal */}
      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3>{editing ? '✏️ Edit Language' : '➕ Add Language'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Language Code *</label>
                  <input
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value.toLowerCase().slice(0, 5) })}
                    placeholder="e.g. en, fr, hi"
                    readOnly={!!editing}
                    style={editing ? { background: '#f1f5f9', cursor: 'not-allowed' } : {}}
                  />
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>ISO 639-1 code (2-5 characters)</span>
                </div>
                <div className="form-group">
                  <label>Language Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. English, French, Hindi" />
                </div>
                <div className="form-group">
                  <label>Native Name</label>
                  <input value={form.native_name} onChange={e => setForm({ ...form, native_name: e.target.value })} placeholder="e.g. English, Français, हिन्दी" />
                </div>
                <div className="form-group form-full" style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary, #ff6b00)' }}
                    />
                    Active
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={form.is_default}
                      onChange={e => setForm({ ...form, is_default: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary, #ff6b00)' }}
                    />
                    Set as Default Language
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-dark btn-sm" onClick={handleSave}>
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   TRANSLATIONS TAB
   ════════════════════════════════════════ */
function TranslationsTab() {
  const [languages, setLanguages] = useState([]);
  const [loadingLanguages, setLoadingLanguages] = useState(true);
  const [selectedLang, setSelectedLang] = useState('en');
  const [selectedGroup, setSelectedGroup] = useState('frontend');
  const [translations, setTranslations] = useState({});
  const [enTranslations, setEnTranslations] = useState({}); // English reference for AI translate
  const [translationsLoading, setTranslationsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [editedValues, setEditedValues] = useState({});
  const [expandedSections, setExpandedSections] = useState({});
  const [saveStatus, setSaveStatus] = useState(null); // null | 'saving' | 'success' | 'error'

  // ── AI Translate state ──
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiTranslating, setAiTranslating] = useState(false);
  const [aiResult, setAiResult] = useState(null); // {translations, translated_count}
  const [aiError, setAiError] = useState(null);
  const [aiMissingKeys, setAiMissingKeys] = useState([]); // keys missing in current language

  // ── Import state ──
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState(null); // parsed CSV rows [{key, value}]
  const [importFileName, setImportFileName] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState(null);
  const fileInputRef = useRef(null);

  // ── AI Translate ──
  const getLanguageName = useCallback((code) => {
    const lang = languages.find(l => l.code === code);
    return lang?.native_name || lang?.name || code;
  }, [languages]);

  const handleOpenAITranslate = useCallback(() => {
    if (!enTranslations || Object.keys(enTranslations).length === 0) {
      toast.error('Load English translations first (select "en" as the language)');
      return;
    }
    if (selectedLang === 'en') {
      toast.error('English is the source language. Select a different language to translate into.');
      return;
    }

    // Find keys that exist in English but not in the current language
    const missing = Object.keys(enTranslations).filter(key => !translations[key]);
    if (missing.length === 0) {
      toast.success('All English keys are already translated in this language!');
      return;
    }

    setAiMissingKeys(missing.slice(0, 50)); // Max 50 at a time
    setAiResult(null);
    setAiError(null);
    setShowAIModal(true);
  }, [enTranslations, translations, selectedLang]);

  const handleAITranslate = useCallback(async () => {
    if (aiMissingKeys.length === 0) return;

    setAiTranslating(true);
    setAiError(null);
    try {
      // Build translations payload
      const translationsToSend = {};
      aiMissingKeys.forEach(key => {
        translationsToSend[key] = enTranslations[key] || '';
      });

      const targetName = getLanguageName(selectedLang);

      const res = await aiAPI.translateWithAI({
        source_language: 'en',
        target_language: selectedLang,
        target_language_name: targetName,
        translations: translationsToSend,
      });

      const data = res.data?.data || {};
      const translated = data.translations || {};
      const count = data.translated_count || Object.keys(translated).length;

      if (count === 0) {
        throw new Error('AI returned no translations');
      }

      setAiResult({ translations: translated, translated_count: count });
      toast.success(`${count} translations generated by AI!`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'AI translation failed';
      setAiError(msg);
      toast.error(msg);
    } finally {
      setAiTranslating(false);
    }
  }, [aiMissingKeys, enTranslations, selectedLang, getLanguageName]);

  const handleAISave = useCallback(async () => {
    if (!aiResult) return;

    try {
      await adminAPI.bulkUpdateTranslations({
        language_code: selectedLang,
        group: selectedGroup,
        translations: aiResult.translations,
      });

      toast.success(`${aiResult.translated_count} AI translations saved!`);
      setShowAIModal(false);
      setAiResult(null);
      setAiMissingKeys([]);

      // Reload
      loadTranslations(selectedLang, selectedGroup);
    } catch {
      toast.error('Failed to save AI translations');
    }
  }, [aiResult, selectedLang, selectedGroup, loadTranslations]);

  // ── Export function ──
  const handleExportCSV = useCallback(() => {
    const keys = Object.keys(translations);
    if (keys.length === 0) {
      toast.error('No translations to export');
      return;
    }

    // Build CSV content
    const header = 'key,value';
    const rows = keys.map(key => {
      const value = (translations[key] || '').replace(/"/g, '""'); // Escape double quotes
      return `"${key}","${value}"`;
    });
    const csv = [header, ...rows].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `translations-${selectedLang}-${selectedGroup}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${keys.length} translations exported`);
  }, [translations, selectedLang, selectedGroup]);

  // ── Import functions ──
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== 'string') throw new Error('Failed to read file');

        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

        // Parse header
        const headerLine = lines[0];
        const headers = parseCSVLine(headerLine);
        const keyIdx = headers.findIndex(h => h.toLowerCase() === 'key');
        const valueIdx = headers.findIndex(h => h.toLowerCase() === 'value');

        if (keyIdx === -1) throw new Error('CSV must have a "key" column');
        if (valueIdx === -1) throw new Error('CSV must have a "value" column');

        // Parse data rows
        const parsed = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCSVLine(lines[i]);
          const key = cols[keyIdx]?.trim();
          const value = cols[valueIdx]?.trim();
          if (key) {
            parsed.push({ key, value: value || '' });
          }
        }

        if (parsed.length === 0) throw new Error('No valid translation rows found in the CSV');
        setImportData(parsed);
      } catch (err) {
        setImportError(err.message || 'Failed to parse CSV');
        setImportData(null);
      }
    };
    reader.onerror = () => {
      setImportError('Failed to read the file');
      setImportData(null);
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-selected
    e.target.value = '';
  }, []);

  const handleImportSave = useCallback(async () => {
    if (!importData || importData.length === 0) return;

    setImportLoading(true);
    setImportError(null);
    try {
      const translationsPayload = {};
      importData.forEach(({ key, value }) => {
        translationsPayload[key] = value;
      });

      await adminAPI.bulkUpdateTranslations({
        language_code: selectedLang,
        group: selectedGroup,
        translations: translationsPayload,
      });

      // Reload translations
      setShowImportModal(false);
      setImportData(null);
      setImportFileName('');
      toast.success(`${importData.length} translations imported successfully!`);

      // Reload the translation list
      loadTranslations(selectedLang, selectedGroup);
    } catch (err) {
      setImportError(err.response?.data?.message || err.message || 'Failed to import translations');
    } finally {
      setImportLoading(false);
    }
  }, [importData, selectedLang, selectedGroup, loadTranslations]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load languages
  useEffect(() => {
    let mounted = true;
    setLoadingLanguages(true);
    adminAPI.getAdminLanguages()
      .then(r => {
        if (!mounted) return;
        const data = r.data?.data || r.data || [];
        setLanguages(Array.isArray(data) ? data : []);
        // Set default to first language or 'en'
        if (Array.isArray(data) && data.length > 0) {
          const defaultLang = data.find(l => l.is_default) || data[0];
          setSelectedLang(defaultLang.code);
        }
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingLanguages(false); });
    return () => { mounted = false; };
  }, []);

  // Load English translations for AI reference (when viewing non-English)
  useEffect(() => {
    if (selectedLang !== 'en') {
      adminAPI.getAdminTranslations('en', selectedGroup)
        .then(r => {
          let data = r.data?.data || r.data || {};
          if (Array.isArray(data)) {
            const map = {};
            data.forEach(item => { if (item.key) map[item.key] = item.value; });
            data = map;
          }
          setEnTranslations(data);
        })
        .catch(() => setEnTranslations({}));
    } else {
      setEnTranslations({});
    }
  }, [selectedLang, selectedGroup]);

  // Load translations when selected language or group changes
  const loadTranslations = useCallback(async (lang, group) => {
    setTranslationsLoading(true);
    setSaveStatus(null);
    setEditedValues({});
    try {
      const r = await adminAPI.getAdminTranslations(lang, group);
      let data = r.data?.data || r.data || {};
      // If data is an array (key-value pairs), convert to object
      if (Array.isArray(data)) {
        const map = {};
        data.forEach(item => {
          if (item.key) map[item.key] = item.value;
        });
        data = map;
      }
      setTranslations(data);
    } catch {
      setTranslations({});
      toast.error('Failed to load translations');
    } finally {
      setTranslationsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedLang) {
      loadTranslations(selectedLang, selectedGroup);
    }
  }, [selectedLang, selectedGroup, loadTranslations]);

  // Organize translations into sections by prefix
  const sections = useMemo(() => {
    const allKeys = Object.keys(translations);
    const sectionMap = {};

    allKeys.forEach(key => {
      const section = key.includes('.') ? key.split('.')[0] : 'other';
      if (!sectionMap[section]) sectionMap[section] = {};
      sectionMap[section][key] = translations[key] || '';
    });

    return Object.entries(sectionMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([section, keys]) => ({
        section,
        keys: Object.entries(keys).sort(([a], [b]) => a.localeCompare(b)),
      }));
  }, [translations]);

  // Filtered sections based on search
  const filteredSections = useMemo(() => {
    if (!debouncedSearch) return sections;
    const q = debouncedSearch.toLowerCase();
    return sections
      .map(({ section, keys }) => ({
        section,
        keys: keys.filter(([key, value]) =>
          key.toLowerCase().includes(q) || value.toLowerCase().includes(q)
        ),
      }))
      .filter(({ keys }) => keys.length > 0);
  }, [sections, debouncedSearch]);

  const handleValueChange = (key, value) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    const changedEntries = Object.entries(editedValues);
    if (changedEntries.length === 0) {
      toast.error('No changes to save');
      return;
    }

    setSaving(true);
    setSaveStatus('saving');
    try {
      const payload = {
        language_code: selectedLang,
        group: selectedGroup,
        translations: changedEntries.reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {}),
      };

      await adminAPI.bulkUpdateTranslations(payload);

      // Update local translations with edited values
      setTranslations(prev => ({
        ...prev,
        ...changedEntries.reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {}),
      }));

      setEditedValues({});
      setSaveStatus('success');
      toast.success(`${changedEntries.length} translation${changedEntries.length > 1 ? 's' : ''} saved!`);
      setTimeout(() => setSaveStatus(null), 2000);
    } catch {
      setSaveStatus('error');
      toast.error('Failed to save translations');
    } finally {
      setSaving(false);
    }
  };

  const resetChanges = () => {
    if (Object.keys(editedValues).length === 0) return;
    if (!confirm('Discard all unsaved changes?')) return;
    setEditedValues({});
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Expand all sections initially
  useEffect(() => {
    if (sections.length > 0 && Object.keys(expandedSections).length === 0) {
      const initial = {};
      sections.forEach(({ section }) => { initial[section] = true; });
      setExpandedSections(initial);
    }
  }, [sections, expandedSections]);

  const editedCount = Object.keys(editedValues).length;
  const totalKeys = Object.keys(translations).length;

  if (loadingLanguages) {
    return <div className="loading-page"><div className="spinner" /></div>;
  }

  return (
    <div>
      {/* Translation Controls */}
      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <div style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', color: '#475569' }}>Language:</label>
            <select
              value={selectedLang}
              onChange={e => setSelectedLang(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '0.82rem',
                fontWeight: 500,
                background: '#fff',
                cursor: 'pointer',
                minWidth: '80px',
              }}
            >
              {languages.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.native_name || lang.name} ({lang.code})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, whiteSpace: 'nowrap', color: '#475569' }}>Group:</label>
            <select
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '0.82rem',
                fontWeight: 500,
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              {GROUPS.map(g => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              placeholder="Search keys or values..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.4rem 0.75rem 0.4rem 2rem',
                borderRadius: '6px',
                border: '1px solid #e2e8f0',
                fontSize: '0.82rem',
                background: '#fff',
              }}
            />
          </div>

          <span style={{ fontSize: '0.78rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
            {totalKeys} keys
          </span>

          {/* Export / Import buttons */}
          <button
            onClick={handleExportCSV}
            className="btn-ghost btn-sm"
            style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}
            title="Export translations as CSV"
          >
            <Download size={13} style={{ marginRight: 4 }} /> Export CSV
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="btn-ghost btn-sm"
            style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem', color: '#6366f1', borderColor: '#6366f1' }}
            title="Import translations from CSV"
          >
            <Upload size={13} style={{ marginRight: 4 }} /> Import CSV
          </button>

          <button
            onClick={handleOpenAITranslate}
            className="btn-ghost btn-sm"
            style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem', color: '#7c3aed', borderColor: '#7c3aed' }}
            title="Translate missing keys with AI"
          >
            <Sparkles size={13} style={{ marginRight: 4 }} /> Translate AI
          </button>

          {editedCount > 0 && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {editedCount} changed
              </span>
              <button
                onClick={resetChanges}
                className="btn-ghost btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', color: '#ef4444' }}
              >
                <RotateCcw size={12} style={{ marginRight: 2 }} /> Reset
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-dark btn-sm"
                style={{
                  background: saveStatus === 'success' ? '#16a34a' : saveStatus === 'error' ? '#dc2626' : undefined,
                  transition: 'all 0.2s ease',
                }}
              >
                {saving ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span className="spinner" style={{ width: 12, height: 12 }} /> Saving...
                  </span>
                ) : saveStatus === 'success' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Check size={14} Circle /> Saved!
                  </span>
                ) : saveStatus === 'error' ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertCircle size={14} /> Failed
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Save size={14} /> Save Changes
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Translation Keys Editor */}
      <div className="table-card">
        {translationsLoading ? (
          <div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div>
        ) : filteredSections.length === 0 ? (
          <div className="empty-state" style={{ padding: '3rem' }}>
            <div className="empty-state-icon" style={{ fontSize: '2rem' }}>🔤</div>
            <h3>
              {debouncedSearch
                ? 'No matching keys found'
                : 'No translations loaded'}
            </h3>
            <p>
              {debouncedSearch
                ? 'Try a different search term.'
                : 'Select a language above to load its translations. Run the TranslationSeeder to seed default translations.'}
            </p>
          </div>
        ) : (
          <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
            {filteredSections.map(({ section, keys }) => {
              const isExpanded = expandedSections[section] !== false;
              const sectionChangedCount = keys.filter(([key]) => editedValues[key] !== undefined && editedValues[key] !== translations[key]).length;

              return (
                <div key={section} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  {/* Section Header */}
                  <button
                    onClick={() => toggleSection(section)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 1rem',
                      background: '#f8fafc',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      color: '#334155',
                      textTransform: 'capitalize',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f8fafc'}
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    <span>{section.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 400 }}>({keys.length})</span>
                    {sectionChangedCount > 0 && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#f59e0b', fontWeight: 600 }}>
                        {sectionChangedCount} changed
                      </span>
                    )}
                  </button>

                  {/* Keys Table */}
                  {isExpanded && (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                        <thead>
                          <tr style={{ background: '#fff' }}>
                            <th style={{ padding: '0.4rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', width: '40%' }}>Translation Key</th>
                            <th style={{ padding: '0.4rem 1rem', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {keys.map(([key, value]) => {
                            const editedValue = editedValues[key] !== undefined ? editedValues[key] : value;
                            const hasChanged = editedValues[key] !== undefined && editedValues[key] !== value;

                            return (
                              <tr
                                key={key}
                                style={{
                                  background: hasChanged ? '#fffbeb' : 'transparent',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={e => {
                                  if (!hasChanged) e.currentTarget.style.background = '#fafafa';
                                }}
                                onMouseLeave={e => {
                                  if (!hasChanged) e.currentTarget.style.background = 'transparent';
                                }}
                              >
                                <td style={{ padding: '0.3rem 1rem', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                                  <code style={{
                                    fontSize: '0.72rem',
                                    color: '#6366f1',
                                    background: '#eef2ff',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    wordBreak: 'break-all',
                                  }}>
                                    {key}
                                  </code>
                                  {hasChanged && (
                                    <span style={{ display: 'block', fontSize: '0.65rem', color: '#f59e0b', marginTop: 2 }}>🟡 Modified</span>
                                  )}
                                </td>
                                <td style={{ padding: '0.3rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                                  <input
                                    value={editedValue}
                                    onChange={e => handleValueChange(key, e.target.value)}
                                    style={{
                                      width: '100%',
                                      padding: '0.4rem 0.6rem',
                                      borderRadius: '6px',
                                      border: `1.5px solid ${hasChanged ? '#f59e0b' : '#e2e8f0'}`,
                                      fontSize: '0.8rem',
                                      background: hasChanged ? '#fffbeb' : '#fff',
                                      outline: 'none',
                                      transition: 'border 0.15s',
                                    }}
                                    onFocus={e => { e.target.style.borderColor = '#6366f1'; }}
                                    onBlur={e => { e.target.style.borderColor = hasChanged ? '#f59e0b' : '#e2e8f0'; }}
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ════════════════════════════════ AI Translate Modal ════════════════════════════════ */}
      {showAIModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && !aiTranslating && !aiResult && setShowAIModal(false)}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>
                {aiResult ? '✨ AI Translation Results' : aiTranslating ? '⏳ Translating with AI...' : '🤖 Translate Missing Keys with AI'}
              </h3>
              <button className="modal-close" onClick={() => { setShowAIModal(false); setAiResult(null); setAiMissingKeys([]); setAiError(null); }} disabled={aiTranslating}>✕</button>
            </div>
            <div className="modal-body">
              {/* Step 1: Confirmation */}
              {!aiTranslating && !aiResult && (
                <div>
                  <div style={{
                    background: '#f5f3ff',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    border: '1px solid #ede9fe',
                    marginBottom: '1rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <Sparkles size={24} style={{ color: '#7c3aed' }} />
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4c1d95' }}>
                          Translate {aiMissingKeys.length} missing keys
                        </p>
                        <p style={{ fontSize: '0.78rem', color: '#6d28d9' }}>
                          From <strong>English</strong> to <strong>{getLanguageName(selectedLang)}</strong>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#fff7ed', borderRadius: '8px', padding: '0.6rem 1rem', border: '1px solid #fed7aa', fontSize: '0.78rem', color: '#9a3412', marginBottom: '0.75rem' }}>
                    ⚠️ This will send {aiMissingKeys.length} text values to the AI provider for translation. AI may not be 100% accurate — please review the results before saving.
                  </div>

                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.5rem 0.75rem', background: '#fafafa' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Keys to translate ({aiMissingKeys.length})
                    </p>
                    {aiMissingKeys.slice(0, 20).map((key, idx) => (
                      <div key={key} style={{
                        padding: '0.15rem 0',
                        fontSize: '0.75rem',
                        display: 'flex',
                        gap: '0.5rem',
                        borderBottom: idx < Math.min(aiMissingKeys.length, 20) - 1 ? '1px solid #f1f5f9' : 'none',
                      }}>
                        <code style={{ color: '#6366f1', background: '#eef2ff', padding: '0 4px', borderRadius: '3px', fontSize: '0.7rem', flexShrink: 0 }}>{key}</code>
                        <span style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {enTranslations[key]}
                        </span>
                      </div>
                    ))}
                    {aiMissingKeys.length > 20 && (
                      <p style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic', paddingTop: '0.25rem' }}>
                        ... and {aiMissingKeys.length - 20} more
                      </p>
                    )}
                  </div>

                  {aiError && (
                    <div style={{ marginTop: '0.75rem', background: '#fef2f2', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid #fecaca', fontSize: '0.82rem', color: '#991b1b' }}>
                      <strong>⚠️ AI Error:</strong> {aiError}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Translating */}
              {aiTranslating && (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" style={{ width: 36, height: 36, margin: '0 auto 1rem' }} />
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', color: '#4c1d95' }}>Translating {aiMissingKeys.length} keys...</p>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    This may take a few seconds
                  </p>
                </div>
              )}

              {/* Step 3: Results */}
              {aiResult && !aiTranslating && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    background: '#f0fdf4',
                    borderRadius: '8px',
                    border: '1px solid #bbf7d0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Check size={18} Circle style={{ color: '#16a34a' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#166534' }}>
                        AI Translation Complete
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
                      {aiResult.translated_count} translations
                    </span>
                  </div>

                  {aiError && (
                    <div style={{ marginBottom: '0.75rem', background: '#fef2f2', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid #fecaca', fontSize: '0.82rem', color: '#991b1b' }}>
                      <strong>⚠️ Warning:</strong> {aiError}
                    </div>
                  )}

                  <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Key</th>
                          <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>English</th>
                          <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Translated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(aiResult.translations).slice(0, 50).map(([key, value], idx) => (
                          <tr key={key} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '0.3rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                              <code style={{ fontSize: '0.68rem', color: '#6366f1', background: '#eef2ff', padding: '1px 4px', borderRadius: '3px' }}>{key}</code>
                            </td>
                            <td style={{ padding: '0.3rem 0.75rem', borderBottom: '1px solid #f1f5f9', color: '#94a3b8', fontSize: '0.72rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {enTranslations[key] || ''}
                            </td>
                            <td style={{ padding: '0.3rem 0.75rem', borderBottom: '1px solid #f1f5f9', color: '#166534', fontWeight: 500 }}>
                              {value || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>(empty)</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: '0.75rem', background: '#fffbeb', borderRadius: '8px', padding: '0.6rem 1rem', border: '1px solid #fde68a', fontSize: '0.78rem', color: '#92400e' }}>
                    ⚠️ Review the translations before saving. AI-generated content may need manual adjustments.
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {!aiTranslating && aiMissingKeys.length > 0 && (
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {aiMissingKeys.length} key{aiMissingKeys.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!aiResult && !aiTranslating && (
                  <>
                    <button className="btn-ghost btn-sm" onClick={() => { setShowAIModal(false); setAiMissingKeys([]); }}>
                      Cancel
                    </button>
                    <button
                      className="btn-dark btn-sm"
                      onClick={handleAITranslate}
                      style={{ background: '#7c3aed' }}
                    >
                      <Sparkles size={13} style={{ marginRight: 4 }} /> Translate with AI
                    </button>
                  </>
                )}
                {aiResult && !aiTranslating && (
                  <>
                    <button className="btn-ghost btn-sm" onClick={() => { setShowAIModal(false); setAiResult(null); setAiMissingKeys([]); }}>
                      Discard
                    </button>
                    <button
                      className="btn-dark btn-sm"
                      onClick={handleAISave}
                      style={{ background: '#059669' }}
                    >
                      <Check size={13} Circle style={{ marginRight: 4 }} /> Save {aiResult.translated_count} Translations
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════ Import CSV Modal ════════════════════════════════ */}
      {showImportModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && !importLoading && setShowImportModal(false)}>
          <div className="modal" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3>
                {importData ? '📋 Review Import' : '📥 Import Translations from CSV'}
              </h3>
              <button className="modal-close" onClick={() => { setShowImportModal(false); setImportData(null); setImportError(null); }} disabled={importLoading}>✕</button>
            </div>
            <div className="modal-body">
              {/* Step 1: File upload */}
              {!importData && (
                <div>
                  <div style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '12px',
                    padding: '2.5rem 1.5rem',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    marginBottom: '1rem',
                  }}
                    onClick={() => fileInputRef.current?.click()}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f8fafc'; }}
                  >
                    <Upload size={36} style={{ color: '#6366f1', marginBottom: '0.75rem' }} />
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', color: '#1e293b', marginBottom: '0.25rem' }}>
                      Click to upload a CSV file
                    </p>
                    <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      File must have <strong>key</strong> and <strong>value</strong> columns
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </div>

                  <div style={{ background: '#f0fdf4', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid #bbf7d0', fontSize: '0.78rem', color: '#166534' }}>
                    <strong style={{ display: 'block', marginBottom: '0.25rem' }}>📐 CSV Format:</strong>
                    <code style={{ fontSize: '0.7rem', background: '#dcfce7', padding: '1px 4px', borderRadius: '3px' }}>key,value</code>
                    <code style={{ fontSize: '0.7rem', display: 'block', marginTop: '0.2rem', background: '#dcfce7', padding: '2px 6px', borderRadius: '3px' }}>"nav.home","Home"</code>
                    <code style={{ fontSize: '0.7rem', display: 'block', marginTop: '0.15rem', background: '#dcfce7', padding: '2px 6px', borderRadius: '3px' }}>"product.add_to_cart","Add to Cart"</code>
                  </div>

                  {importError && (
                    <div style={{ marginTop: '0.75rem', background: '#fef2f2', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid #fecaca', fontSize: '0.82rem', color: '#991b1b' }}>
                      <strong>⚠️ Error:</strong> {importError}
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Preview */}
              {importData && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '0.75rem',
                    padding: '0.5rem 0.75rem',
                    background: '#f0fdf4',
                    borderRadius: '8px',
                    border: '1px solid #bbf7d0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} style={{ color: '#16a34a' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#166534' }}>
                        {importFileName || 'translations.csv'}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.78rem', color: '#166534', fontWeight: 600 }}>
                      {importData.length} translation{importData.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {importError && (
                    <div style={{ marginBottom: '0.75rem', background: '#fef2f2', borderRadius: '8px', padding: '0.75rem 1rem', border: '1px solid #fecaca', fontSize: '0.82rem', color: '#991b1b' }}>
                      <strong>⚠️ Error:</strong> {importError}
                    </div>
                  )}

                  {/* Preview table */}
                  <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                          <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', width: '45%' }}>Key</th>
                          <th style={{ padding: '0.4rem 0.75rem', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importData.slice(0, 100).map((row, idx) => {
                          const isNew = translations[row.key] === undefined;
                          const isChanged = translations[row.key] !== undefined && translations[row.key] !== row.value;
                          return (
                            <tr key={idx} style={{
                              background: isNew ? '#f0fdf4' : isChanged ? '#fffbeb' : 'transparent',
                            }}>
                              <td style={{ padding: '0.35rem 0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                                <code style={{
                                  fontSize: '0.7rem',
                                  color: '#6366f1',
                                  background: '#eef2ff',
                                  padding: '1px 5px',
                                  borderRadius: '3px',
                                }}>
                                  {row.key}
                                </code>
                              </td>
                              <td style={{ padding: '0.35rem 0.75rem', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                                {row.value || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>(empty)</span>}
                                <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem' }}>
                                  {isNew && <span style={{ color: '#16a34a' }}>🆕 New</span>}
                                  {isChanged && <span style={{ color: '#f59e0b' }}>🟡 Updated</span>}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                        {importData.length > 100 && (
                          <tr>
                            <td colSpan={2} style={{ padding: '0.5rem 0.75rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>
                              ... and {importData.length - 100} more
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b', flexWrap: 'wrap' }}>
                    <span>🆕 <span style={{ color: '#16a34a', fontWeight: 600 }}>
                      {importData.filter(r => translations[r.key] === undefined).length} new
                    </span></span>
                    <span>🟡 <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                      {importData.filter(r => translations[r.key] !== undefined && translations[r.key] !== r.value).length} updates
                    </span></span>
                    <span>✅ <span style={{ color: '#64748b', fontWeight: 600 }}>
                      {importData.filter(r => translations[r.key] !== undefined && translations[r.key] === r.value).length} unchanged
                    </span></span>
                  </div>

                  <div style={{ marginTop: '0.75rem', background: '#fff7ed', borderRadius: '8px', padding: '0.6rem 1rem', border: '1px solid #fed7aa', fontSize: '0.78rem', color: '#9a3412' }}>
                    ⚠️ This will overwrite existing translations for the selected language/group. Only the keys in your CSV will be affected.
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                {!importData && importFileName && (
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    <FileText size={12} style={{ marginRight: 4 }} /> {importFileName}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn-ghost btn-sm"
                  onClick={() => { setShowImportModal(false); setImportData(null); setImportError(null); }}
                  disabled={importLoading}
                >
                  {importData ? 'Cancel' : 'Close'}
                </button>
                {importData && (
                  <button
                    className="btn-dark btn-sm"
                    onClick={handleImportSave}
                    disabled={importLoading || !!importError}
                    style={{
                      background: importLoading ? undefined : '#6366f1',
                      opacity: importLoading ? 0.7 : 1,
                    }}
                  >
                    {importLoading ? (
                      <><span className="spinner" style={{ width: 12, height: 12, marginRight: 6 }} /> Importing...</>
                    ) : (
                      <><Upload size={13} style={{ marginRight: 4 }} /> Import {importData.length} Translation{importData.length !== 1 ? 's' : ''}</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

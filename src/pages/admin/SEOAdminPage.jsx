import { Search, RefreshCw, Globe, AlertTriangle, Share2, BarChart3, Settings, Trophy, Link, Zap, FileText, Pencil, Trash2, ExternalLink, CheckCircle, Code2, Facebook, Languages, FolderTree } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/admin';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField, imageUrl } from '../../hooks/validationRules';
import toast from '../../utils/toast';
import { useConfirm } from '../../contexts/ConfirmContext';
import { formatDate, formatDateTime } from '../../utils/formatters';

;

const truncate = (str, len) => (str || '').length > len ? str.slice(0, len) + '…' : str;

function SEOPreview({ title, description, url }) {
  const displayUrl = url || 'https://yourstore.com';
  return (
    <div style={{
      background: '#fff', border: '1px solid #e0e0e0', borderRadius: '12px',
      padding: '16px 20px', maxWidth: '600px', fontFamily: 'Arial, sans-serif',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: '12px', color: '#202124', fontStyle: 'normal', lineHeight: '1.3' }}>
        <span style={{ color: '#202124' }}>{displayUrl}</span>
        <span style={{ color: '#70757a' }}> › {truncate(title || 'Page Title', 40)}</span>
      </div>
      <div style={{
        fontSize: '20px', color: '#1a0dab', fontWeight: 400, lineHeight: '1.3',
        marginTop: '4px', textDecoration: 'none', cursor: 'pointer', wordBreak: 'break-word',
      }}>{title || 'Site Title — Meta Title'}</div>
      <div style={{
        fontSize: '14px', color: '#545454', lineHeight: '1.58',
        wordBreak: 'break-word', marginTop: '2px',
      }}>{description || 'Your meta description will appear here...'}</div>
    </div>
  );
}

function CharCounter({ current, max }) {
  const pct = current / max;
  const color = pct > 1 ? '#ef4444' : pct > 0.9 ? '#f59e0b' : '#22c55e';
  return <span style={{ fontSize: '0.7rem', color, fontWeight: 600, transition: 'color 0.2s' }}>{current}/{max}</span>;
}

function ScoreBadge({ score }) {
  const pct = score || 0;
  const color = pct >= 80 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: color + '20', color }}>
      <Trophy size={12} /> {pct}/100
    </span>
  );
}

function JSONCodeBlock({ data, label }) {
  const [collapsed, setCollapsed] = useState(true);
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
        <Code2 size={14} /><span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
        <button className="btn-ghost btn-sm" onClick={() => setCollapsed(!collapsed)} style={{ fontSize: '0.7rem' }}>{collapsed ? 'Show' : 'Hide'} JSON-LD</button>
      </div>
      {!collapsed && (
        <pre style={{ background: '#1e1e2e', color: '#cdd6f4', borderRadius: '8px', padding: '1rem', fontSize: '0.72rem', lineHeight: 1.5, overflowX: 'auto', maxHeight: '300px', fontFamily: "'Courier New', monospace" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

const readField = (obj, ...keys) => {
  if (!obj) return '';
  for (const k of keys) {
    const val = obj[k];
    if (val && String(val).trim()) return String(val).trim();
  }
  return '';
};

export default function SEOAdminPage() {
  const confirm = useConfirm();
  const [tab, setTab] = useState('global');
  const [loading, setLoading] = useState(false);
  const tabs = [
    { id: 'global', label: 'Global SEO', icon: Globe },
    { id: 'entity', label: 'Entity SEO', icon: Pencil },
    { id: 'structured', label: 'Structured Data', icon: Code2 },
    { id: 'audit', label: 'SEO Audit', icon: Trophy },
    { id: 'sitemap', label: 'Sitemap', icon: FolderTree },
    { id: 'robots', label: 'Robots.txt', icon: FileText },
    { id: 'advanced', label: 'Advanced', icon: Settings },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const [globalSeo, setGlobalSeo] = useState({ title: '', description: '', keywords: '' });
  const [entitySearch, setEntitySearch] = useState('');
  const [entityType, setEntityType] = useState('product');
  const [entityList, setEntityList] = useState([]);
  const [entityTotal, setEntityTotal] = useState(0);
  const [entityPage, setEntityPage] = useState(1);
  const [entityLoading, setEntityLoading] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [seoForm, setSeoForm] = useState({
    metaTitle: '', metaDescription: '', metaKeywords: '',
    ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '',
    robotsMeta: '', contentLanguage: '', sitemapPriority: '0.5', sitemapChangefreq: 'weekly',
  });
  const [seoFormLoading, setSeoFormLoading] = useState(false);
  const [sitemapData, setSitemapData] = useState({ entries: [], count: 0, lastGenerated: null });
  const [sitemapLoading, setSitemapLoading] = useState(false);
  const [robotsContent, setRobotsContent] = useState('');
  const [robotsOriginal, setRobotsOriginal] = useState('');
  const [robotsLoading, setRobotsLoading] = useState(false);
  const [robotsUpdatedAt, setRobotsUpdatedAt] = useState(null);
  const [orgSchema, setOrgSchema] = useState(null);
  const [websiteSchema, setWebsiteSchema] = useState(null);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [auditData, setAuditData] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [bulkAuditResults, setBulkAuditResults] = useState(null);
  const [bulkAuditLoading, setBulkAuditLoading] = useState(false);
  const [advSettings, setAdvSettings] = useState(null);
  const [advSettingsLoading, setAdvSettingsLoading] = useState(false);

  // Global SEO — site title is required.
  const globalValidation = useAdminFormValidation({
    title: requiredField('Site title'),
  });

  // Entity SEO — meta title required; image/canonical URLs validated when filled.
  const entityValidation = useAdminFormValidation({
    metaTitle: requiredField('Meta title'),
    ogImage: imageUrl('Enter a valid image URL (https://...)'),
    canonicalUrl: imageUrl('Enter a valid canonical URL (https://...)'),
  });

  const loadGlobalSEO = useCallback(async () => {
    try { const res = await adminAPI.getGlobalSEO(); const d = res.data?.data || {}; setGlobalSeo({ title: d.title || '', description: d.description || '', keywords: d.keywords || '' }); }
    catch (e) { console.warn('Failed to load global SEO:', e); }
  }, []);

  const loadSchemas = useCallback(async () => {
    setSchemaLoading(true);
    try {
      const [orgRes, webRes] = await Promise.all([adminAPI.getOrganizationSchema(), adminAPI.getWebsiteSchema()]);
      setOrgSchema(orgRes.data?.data || null);
      setWebsiteSchema(webRes.data?.data || null);
    } catch (e) { console.warn('Failed to load schemas:', e); }
    finally { setSchemaLoading(false); }
  }, []);

  const loadAdvancedSettings = useCallback(async () => {
    setAdvSettingsLoading(true);
    try { const res = await adminAPI.getAdvancedSEOSettings(); setAdvSettings(res.data?.data || null); }
    catch (e) { console.warn('Failed to load advanced settings:', e); }
    finally { setAdvSettingsLoading(false); }
  }, []);

  const loadEntityList = useCallback(async (search = '', page = 1) => {
    setEntityLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      let res;
      if (entityType === 'product') res = await adminAPI.getProducts(params);
      else if (entityType === 'category') res = await adminAPI.getCategories(params);
      else if (entityType === 'page') {
        res = await adminAPI.getPages();
        if (search) { const items = res.data?.data || []; items.data = (items.data || items).filter(p => (p.title || '').toLowerCase().includes(search.toLowerCase())); res = { data: { data: items.data || items, total: items.data?.length || items.length } }; }
      }
      const payload = res.data?.data || res.data || {};
      const items = payload.products || payload.categories || payload.pages || payload.data || payload || [];
      const total = payload.total || payload.count || (Array.isArray(items) ? items.length : 0);
      setEntityList(Array.isArray(items) ? items : []); setEntityTotal(total); setEntityPage(page);
    } catch (e) { console.warn('Failed to load entities:', e); setEntityList([]); }
    finally { setEntityLoading(false); }
  }, [entityType]);

  const loadSitemap = useCallback(async () => {
    setSitemapLoading(true);
    try { const res = await adminAPI.getSitemapFromDB(); const d = res.data?.data || {}; setSitemapData({ entries: d.entries || [], count: d.count || 0, lastGenerated: d.last_generated || d.lastGenerated || null }); }
    catch { try { const res = await adminAPI.getSitemap(); const d = res.data?.data || {}; setSitemapData({ entries: d.entries || [], count: d.count || 0, lastGenerated: d.last_generated || d.lastGenerated || null }); } catch (e2) { console.warn('Failed to load sitemap:', e2); } }
    finally { setSitemapLoading(false); }
  }, []);

  const loadRobots = useCallback(async () => {
    setRobotsLoading(true);
    try { const res = await adminAPI.getRobotsTxt(); const d = res.data?.data || {}; const c = d.content || 'User-agent: *\nAllow: /\n'; setRobotsContent(c); setRobotsOriginal(c); setRobotsUpdatedAt(d.updated_at || d.updatedAt || null); }
    catch { const fb = 'User-agent: *\nAllow: /\n'; setRobotsContent(fb); setRobotsOriginal(fb); }
    finally { setRobotsLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === 'global') loadGlobalSEO();
    if (tab === 'entity') { loadEntityList(entitySearch, 1); setSelectedEntity(null); }
    if (tab === 'sitemap') loadSitemap();
    if (tab === 'robots') loadRobots();
    if (tab === 'structured') loadSchemas();
    if (tab === 'advanced' || tab === 'analytics') loadAdvancedSettings();
  }, [tab, loadGlobalSEO, loadSchemas, loadAdvancedSettings, loadEntityList, loadSitemap, loadRobots]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveGlobal = async () => {
    if (!globalValidation.validateForm(globalSeo)) return;
    setLoading(true);
    try { await adminAPI.updateGlobalSEO(globalSeo); toast.success('Global SEO settings saved'); }
    catch { toast.error('Failed to save global SEO'); }
    finally { setLoading(false); }
  };

  const handleSelectEntity = async (entity) => {
    setSelectedEntity(entity); setSeoFormLoading(true);
    try {
      const res = await adminAPI.getEntitySEO(entityType, entity.id);
      const sd = res.data?.data;
      if (sd) {
        setSeoForm({
          metaTitle: readField(sd, 'metaTitle', 'meta_title', 'title'),
          metaDescription: readField(sd, 'metaDescription', 'meta_description', 'description'),
          metaKeywords: readField(sd, 'metaKeywords', 'meta_keywords', 'keywords'),
          ogTitle: readField(sd, 'ogTitle', 'og_title'),
          ogDescription: readField(sd, 'ogDescription', 'og_description'),
          ogImage: readField(sd, 'ogImage', 'og_image'),
          canonicalUrl: readField(sd, 'canonicalUrl', 'canonical_url'),
          robotsMeta: readField(sd, 'robotsMeta', 'robots_meta'),
          contentLanguage: readField(sd, 'contentLanguage', 'content_language'),
          sitemapPriority: sd.sitemap_priority?.toString() || '0.5',
          sitemapChangefreq: sd.sitemap_changefreq || 'weekly',
        });
      } else {
        setSeoForm({
          metaTitle: readField(entity, 'seoTitle', 'metaTitle', 'title'),
          metaDescription: readField(entity, 'seoDescription', 'metaDescription', 'description'),
          metaKeywords: readField(entity, 'seoKeywords', 'metaKeywords', 'keywords'),
          ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '',
          robotsMeta: '', contentLanguage: '', sitemapPriority: '0.5', sitemapChangefreq: 'weekly',
        });
      }
    }    catch {
      setSeoForm({ metaTitle: readField(entity, 'seoTitle', 'title'), metaDescription: readField(entity, 'seoDescription', 'description'), metaKeywords: readField(entity, 'seoKeywords', 'keywords'), ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '', robotsMeta: '', contentLanguage: '', sitemapPriority: '0.5', sitemapChangefreq: 'weekly' });
    } finally { setSeoFormLoading(false); }
  };

  const handleSaveEntitySEO = async () => {
    if (!selectedEntity) return;
    if (!entityValidation.validateForm({ metaTitle: seoForm.metaTitle, ogImage: seoForm.ogImage, canonicalUrl: seoForm.canonicalUrl })) return;
    setLoading(true);
    try {
      const payload = {};
      Object.entries(seoForm).forEach(([key, val]) => { if (val && val.trim()) payload[key] = val.trim(); });
      await adminAPI.updateEntitySEO(entityType, selectedEntity.id, payload);
      toast.success(`SEO saved for ${selectedEntity.name || selectedEntity.title || selectedEntity.id}`);
    }    catch { toast.error('Failed to save entity SEO'); }
    finally { setLoading(false); }
  };

  const handleDeleteEntitySEO = async () => {
    if (!selectedEntity) return;
    if (!(await confirm({ title: 'Delete SEO metadata?', message: `SEO for "${selectedEntity.name || selectedEntity.title || selectedEntity.id}" will be removed. This cannot be undone.`, confirmLabel: 'Delete' }))) return;
    setLoading(true);
    try {
      const res = await adminAPI.getEntitySEO(entityType, selectedEntity.id);
      const sd = res.data?.data;
      if (sd?.id) {
        await adminAPI.deleteSEO(sd.id);
        toast.success('SEO metadata deleted');
        setSeoForm({ metaTitle: '', metaDescription: '', metaKeywords: '', ogTitle: '', ogDescription: '', ogImage: '', canonicalUrl: '', robotsMeta: '', contentLanguage: '', sitemapPriority: '0.5', sitemapChangefreq: 'weekly' });
      } else toast.error('No SEO record found to delete');
    } catch { toast.error('Failed to delete SEO metadata'); }
    finally { setLoading(false); }
  };

  const handleRefreshSitemap = async () => {
    setSitemapLoading(true);
    try { const res = await adminAPI.refreshSitemap(); const d = res.data?.data || {}; setSitemapData({ entries: d.entries || [], count: d.count || 0, lastGenerated: d.last_generated || d.lastGenerated || null }); toast.success(`Sitemap refreshed — ${d.count || 0} entries`); }
    catch { toast.error('Failed to refresh sitemap'); }
    finally { setSitemapLoading(false); }
  };

  const handleSaveRobots = async () => {
    setLoading(true);
    try { await adminAPI.updateRobotsTxt(robotsContent); setRobotsOriginal(robotsContent); setRobotsUpdatedAt(new Date().toISOString()); toast.success('Robots.txt saved'); }
    catch { toast.error('Failed to save robots.txt'); }
    finally { setLoading(false); }
  };

  const handleResetRobots = () => { setRobotsContent('User-agent: *\nAllow: /\n\n# Disallow admin\nDisallow: /admin\nDisallow: /api\nDisallow: /cart\n\nSitemap: https://yourstore.com/sitemap.xml\n'); };

  const handleRegenerateSchemas = async () => {
    setSchemaLoading(true);
    try { const [orgRes, webRes] = await Promise.all([adminAPI.getOrganizationSchema(), adminAPI.getWebsiteSchema()]); setOrgSchema(orgRes.data?.data || null); setWebsiteSchema(webRes.data?.data || null); toast.success('Schemas regenerated'); }
    catch { toast.error('Failed to regenerate schemas'); }
    finally { setSchemaLoading(false); }
  };

  const handleAutoGenerateEntitySchemas = async () => {
    if (!selectedEntity) { toast.error('Select an entity first on the Entity SEO tab'); return; }
    setLoading(true);
    try { await adminAPI.autoGenerateSchemas(entityType, selectedEntity.id); toast.success('Schemas auto-generated for this entity'); }
    catch { toast.error('Failed to generate schemas'); }
    finally { setLoading(false); }
  };

  const handleRunAudit = async () => {
    setAuditLoading(true); setAuditData(null);
    try { const res = await adminAPI.auditEntitySEO(entityType, selectedEntity?.id); setAuditData(res.data?.data || null); toast.success('SEO audit complete'); }
    catch { toast.error('Failed to run audit'); }
    finally { setAuditLoading(false); }
  };

  const handleBulkAudit = async () => {
    setBulkAuditLoading(true); setBulkAuditResults(null);
    try { const res = await adminAPI.bulkAuditSEO(entityType); setBulkAuditResults(res.data?.data || null); toast.success('Bulk audit complete'); }
    catch { toast.error('Failed to run bulk audit'); }
    finally { setBulkAuditLoading(false); }
  };

  const handleSaveAdvancedSettings = async () => {
    if (!advSettings) return;
    setLoading(true);
    try { const res = await adminAPI.updateAdvancedSEOSettings(advSettings); setAdvSettings(res.data?.data || null); toast.success('Advanced SEO settings saved'); }
    catch { toast.error('Failed to save advanced settings'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>SEO Management</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
            Comprehensive SEO tools — meta tags, structured data, audits, sitemaps, and more to rank #1
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs" style={{ flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} className={`admin-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* 1. GLOBAL SEO TAB */}
      {tab === 'global' && (
        <div className="detail-panel">
          <div className="detail-header"><h3>Global SEO Settings</h3><span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 400 }}>These values apply site-wide as defaults</span></div>
          <div className="form-grid">
            <div className={`form-group form-full ${globalValidation.errors.title ? 'has-error' : ''} ${globalValidation.validFields.title ? 'is-valid' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><label>Site Title (Meta Title)</label><CharCounter current={globalSeo.title.length} max={60} /></div>
              <input value={globalSeo.title} onChange={e => { setGlobalSeo({ ...globalSeo, title: e.target.value }); globalValidation.handleChange('title', e.target.value); }} placeholder="Your Store Name — Tagline" maxLength={70} />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Recommended: 50–60 characters.</span>
              {globalValidation.errors.title && (
                <div className="form-error" role="alert">{globalValidation.errors.title}</div>
              )}
            </div>
            <div className="form-group form-full">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><label>Meta Description</label><CharCounter current={globalSeo.description.length} max={160} /></div>
              <textarea rows={3} value={globalSeo.description} onChange={e => setGlobalSeo({ ...globalSeo, description: e.target.value })} placeholder="Discover premium fashion..." maxLength={180} />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Recommended: 150–160 characters.</span>
            </div>
            <div className="form-group form-full">
              <label>Meta Keywords</label>
              <input value={globalSeo.keywords} onChange={e => setGlobalSeo({ ...globalSeo, keywords: e.target.value })} placeholder="fashion, premium, accessories" />
            </div>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ExternalLink size={14} /> Search Result Preview</h4>
            <SEOPreview title={globalSeo.title || 'Your Store Name — Tagline'} description={globalSeo.description || 'Your meta description...'} url="https://yourstore.com" />
          </div>
          <div className="form-actions" style={{ marginTop: '1.5rem' }}>
            <button className="btn-dark btn-sm" onClick={handleSaveGlobal} disabled={loading}>{loading ? 'Saving...' : 'Save Global SEO Settings'}</button>
          </div>
        </div>
      )}

      {/* 2. ENTITY SEO TAB - Simplified for brevity, matches the main copy's functionality */}
      {tab === 'entity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="detail-panel">
            <div className="detail-header"><h3>Entity SEO Editor</h3><span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 400 }}>Edit SEO metadata for products, categories, and pages</span></div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div className="form-group" style={{ minWidth: '160px', margin: 0 }}>
                <label>Entity Type</label>
                <select value={entityType} onChange={e => { setEntityType(e.target.value); setSelectedEntity(null); }}>
                  <option value="product">Products</option>
                  <option value="category">Categories</option>
                  <option value="page">Pages</option>
                </select>
              </div>
              <div className="form-group" style={{ flex: 1, minWidth: '200px', margin: 0 }}>
                <label>Search</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                  <input value={entitySearch} onChange={e => setEntitySearch(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') loadEntityList(entitySearch, 1); }} placeholder={`Search ${entityType}s...`} style={{ paddingLeft: '32px' }} />
                </div>
              </div>
              <button className="btn-dark btn-sm" onClick={() => loadEntityList(entitySearch, 1)} disabled={entityLoading}>
                {entityLoading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />} Search
              </button>
              <button className="btn-ghost btn-sm" onClick={handleBulkAudit} disabled={bulkAuditLoading}>
                {bulkAuditLoading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trophy size={14} />} Bulk Audit
              </button>
            </div>
            {/* Entity list, form, audit results - same as main copy */}
            {renderEntityList()}
          </div>
          {selectedEntity && renderEntityForm()}
          {bulkAuditResults && renderBulkAuditResults()}
        </div>
      )}

      {/* 3. STRUCTURED DATA TAB */}
      {tab === 'structured' && (
        <div className="detail-panel">
          <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Structured Data (JSON-LD)</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>JSON-LD structured data helps search engines understand your content and enables rich snippets.</p>
            </div>
            <button className="btn-dark btn-sm" onClick={handleRegenerateSchemas} disabled={schemaLoading}>
              <RefreshCw size={14} /> {schemaLoading ? 'Loading...' : 'Regenerate All'}
            </button>
          </div>
          {schemaLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}><RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} /><p>Loading schemas...</p></div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, minWidth: '140px', padding: '1rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <CheckCircle size={24} style={{ color: orgSchema ? '#22c55e' : '#d1d5db', margin: '0 auto 0.5rem' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Organization</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{orgSchema ? 'Active' : 'Not generated'}</div>
                </div>
                <div style={{ flex: 1, minWidth: '140px', padding: '1rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <CheckCircle size={24} style={{ color: websiteSchema ? '#22c55e' : '#d1d5db', margin: '0 auto 0.5rem' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Website</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{websiteSchema ? 'Active' : 'Not generated'}</div>
                </div>
              </div>
              {orgSchema && <JSONCodeBlock data={orgSchema} label="Organization Schema" />}
              {websiteSchema && <JSONCodeBlock data={websiteSchema} label="Website Schema" />}
              <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginTop: '1rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.5rem' }}><Zap size={14} /> Auto-Generate Entity Schemas</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Go to <strong>Entity SEO</strong> tab, select an entity, and click "Generate JSON-LD" to create Product, Breadcrumb, and FAQ schemas.</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* 4. SEO AUDIT TAB */}
      {tab === 'audit' && (
        <div className="detail-panel">
          <div className="detail-header"><h3>SEO Audit & Scoring</h3><span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 400 }}>Run comprehensive SEO audits on your entities</span></div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ minWidth: '160px', margin: 0 }}>
              <label>Entity Type</label>
              <select value={entityType} onChange={e => setEntityType(e.target.value)}>
                <option value="product">Products</option>
                <option value="category">Categories</option>
                <option value="page">Pages</option>
              </select>
            </div>
            <button className="btn-dark btn-sm" onClick={handleBulkAudit} disabled={bulkAuditLoading}>
              {bulkAuditLoading ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trophy size={14} />} Run Bulk Audit
            </button>
          </div>
          {bulkAuditResults ? (
            <>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, padding: '1rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: bulkAuditResults.average_percentage >= 80 ? '#22c55e' : '#f59e0b' }}>{bulkAuditResults.average_percentage}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Average Score</div>
                </div>
                <div style={{ flex: 1, padding: '1rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{bulkAuditResults.total_audited}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Entities Audited</div>
                </div>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}><th style={{ padding: '0.5rem', fontSize: '0.75rem' }}>#</th><th style={{ padding: '0.5rem', fontSize: '0.75rem' }}>Entity ID</th><th style={{ padding: '0.5rem', fontSize: '0.75rem' }}>Score</th><th style={{ padding: '0.5rem', fontSize: '0.75rem' }}>Percentage</th></tr></thead>
                  <tbody>{(bulkAuditResults.results || []).map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '0.5rem', fontSize: '0.78rem' }}>{i + 1}</td><td style={{ padding: '0.5rem', fontSize: '0.78rem', fontFamily: 'monospace' }}>{r.entity_id?.slice(0, 12)}…</td><td style={{ padding: '0.5rem' }}><ScoreBadge score={r.score} /></td><td style={{ padding: '0.5rem', fontSize: '0.78rem', fontWeight: 600, color: r.percentage >= 80 ? '#22c55e' : '#f59e0b' }}>{r.percentage}%</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
              <Trophy size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
              <p>Run a bulk audit to see SEO scores for all your {entityType}s.</p>
            </div>
          )}
        </div>
      )}

      {/* 5. SITEMAP TAB */}
      {tab === 'sitemap' && (
        <div className="detail-panel">
          <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><h3>Sitemap</h3><p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>XML sitemap at <code>/sitemap.xml</code></p></div>
            <button className="btn-dark btn-sm" onClick={handleRefreshSitemap} disabled={sitemapLoading} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <RefreshCw size={14} className={sitemapLoading ? 'spin' : ''} />{sitemapLoading ? 'Refreshing...' : 'Regenerate'}
            </button>
          </div>
          {renderSitemapContent()}
        </div>
      )}

      {/* 6. ROBOTS.TXT TAB */}
      {tab === 'robots' && (
        <div className="detail-panel">
          <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><h3>Robots.txt</h3><p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Instructions for search engine crawlers</p></div>
            {robotsUpdatedAt && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Last updated: {formatDateTime(robotsUpdatedAt)}</span>}
          </div>
          {renderRobotsContent()}
        </div>
      )}

      {/* 7. ADVANCED SETTINGS TAB */}
      {tab === 'advanced' && (
        <div className="detail-panel">
          <div className="detail-header"><h3>Advanced SEO Settings</h3><span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 400 }}>Organization info, analytics IDs, hreflang, IndexNow</span></div>
          {advSettingsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}><RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /><p>Loading...</p></div>
          ) : advSettings ? (
            <>
              <div className="form-grid">
                <div className="form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Globe size={14} /> Organization</h4>
                </div>
                <div className="form-group">
                  <label>Organization Name</label>
                  <input value={advSettings.organization_name || ''} onChange={e => setAdvSettings({ ...advSettings, organization_name: e.target.value })} placeholder="Your Store Name" />
                </div>
                <div className="form-group">
                  <label>Organization URL</label>
                  <input value={advSettings.organization_url || ''} onChange={e => setAdvSettings({ ...advSettings, organization_url: e.target.value })} placeholder="https://yourstore.com" />
                </div>
                <div className="form-group form-full">
                  <label>Organization Logo URL</label>
                  <input value={advSettings.organization_logo || ''} onChange={e => setAdvSettings({ ...advSettings, organization_logo: e.target.value })} placeholder="https://yourstore.com/logo.png" />
                </div>
                <div className="form-group form-full">
                  <label>Social Links (one per line)</label>
                  <textarea rows={4} value={advSettings.social_links || ''} onChange={e => setAdvSettings({ ...advSettings, social_links: e.target.value })}
                    placeholder="https://facebook.com/yourstore&#10;https://instagram.com/yourstore" style={{ fontFamily: "'Courier New', monospace", fontSize: '0.82rem' }} />
                </div>
                <div className="form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BarChart3 size={14} /> Analytics & Tracking</h4>
                </div>
                <div className="form-group"><label>Google Analytics ID</label><input value={advSettings.google_analytics_id || ''} onChange={e => setAdvSettings({ ...advSettings, google_analytics_id: e.target.value })} placeholder="G-XXXXXXXXXX" /></div>
                <div className="form-group"><label>Google Tag Manager ID</label><input value={advSettings.google_tag_manager_id || ''} onChange={e => setAdvSettings({ ...advSettings, google_tag_manager_id: e.target.value })} placeholder="GTM-XXXXXXX" /></div>
                <div className="form-group form-full"><label>Google Search Console Verification</label><input value={advSettings.google_site_verification || ''} onChange={e => setAdvSettings({ ...advSettings, google_site_verification: e.target.value })} placeholder="1234567890abcdef" /><span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Paste the <code>content</code> value from the meta tag Google gives you. <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Open Search Console →</a></span></div>
                <div className="form-group form-full"><label>Facebook Pixel ID</label><input value={advSettings.facebook_pixel_id || ''} onChange={e => setAdvSettings({ ...advSettings, facebook_pixel_id: e.target.value })} placeholder="1234567890" /></div>
                <div className="form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Languages size={14} /> International & Automation</h4>
                </div>
                <div className="form-group"><label>Hreflang Default</label><input value={advSettings.hreflang_default || 'en'} onChange={e => setAdvSettings({ ...advSettings, hreflang_default: e.target.value })} maxLength={5} /></div>
                <div className="form-group"><label>Auto Schema</label><select value={advSettings.enable_auto_schema || 'true'} onChange={e => setAdvSettings({ ...advSettings, enable_auto_schema: e.target.value })}><option value="true">Enabled</option><option value="false">Disabled</option></select></div>
                <div className="form-group"><label>IndexNow</label><select value={advSettings.enable_indexnow || 'false'} onChange={e => setAdvSettings({ ...advSettings, enable_indexnow: e.target.value })}><option value="true">Enabled</option><option value="false">Disabled</option></select></div>
                <div className="form-group form-full"><label>IndexNow API Key</label><input value={advSettings.indexnow_key || ''} onChange={e => setAdvSettings({ ...advSettings, indexnow_key: e.target.value })} placeholder="abc123... (8-128 chars, alphanumeric + dashes)" maxLength={128} /><span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Generate a key on <a href="https://www.indexnow.org" target="_blank" rel="noopener noreferrer">IndexNow.org</a> and paste it here. A <code>/{'{key}'}.txt</code> verification file will be served automatically.</span></div>
                <div className="form-group"><label>Audit Schedule</label><select value={advSettings.audit_schedule || 'weekly'} onChange={e => setAdvSettings({ ...advSettings, audit_schedule: e.target.value })}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
              </div>
              <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                <button className="btn-dark btn-sm" onClick={handleSaveAdvancedSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Advanced Settings'}</button>
              </div>
            </>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}><Settings size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} /><p>Unable to load settings.</p></div>
          )}
        </div>
      )}

      {/* 8. ANALYTICS TAB */}
      {tab === 'analytics' && (
        <div className="detail-panel">
          <div className="detail-header"><h3>SEO Performance & Analytics</h3><span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 400 }}>Configure tracking codes</span></div>
          {advSettingsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}><RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /><p>Loading...</p></div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
                <div style={{ flex: 1, minWidth: '160px', padding: '1rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <BarChart3 size={24} style={{ color: advSettings?.google_analytics_id ? '#22c55e' : '#d1d5db', margin: '0 auto 0.5rem' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Google Analytics</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{advSettings?.google_analytics_id || 'Not configured'}</div>
                </div>
                <div style={{ flex: 1, minWidth: '160px', padding: '1rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                  <Facebook size={24} style={{ color: advSettings?.facebook_pixel_id ? '#22c55e' : '#d1d5db', margin: '0 auto 0.5rem' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Facebook Pixel</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{advSettings?.facebook_pixel_id || 'Not configured'}</div>
                </div>
              </div>
              <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}><Link size={14} /> Tracking Codes</h4>
                <p style={{ fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6, marginTop: '0.5rem' }}>
                  Configure IDs in the <strong>Advanced</strong> tab. They'll be injected into your site's &lt;head&gt; via SEOHead component.
                </p>
                <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#fff', borderRadius: '8px', fontSize: '0.75rem' }}>
                  <strong>What gets tracked:</strong>
                  <ul style={{ margin: '0.25rem 0 0', paddingLeft: '1.2rem', lineHeight: 1.8 }}>
                    <li>Page views via Google Analytics (GA4) — <code>gtag.js</code></li>
                    <li>Conversions via Google Tag Manager</li>
                    <li>Facebook Pixel events (PageView, ViewContent, AddToCart, Purchase)</li>
                    <li>Structured data for rich results</li>
                    <li>IndexNow URL push for instant indexation</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin { animation: spin 1s linear infinite; }`}</style>
    </div>
  );

  // ── Helper render functions ──

  function renderEntityList() {
    if (entityLoading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}><RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} /><p>Loading...</p></div>;
    if (entityList.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}><p>No {entityType}s found.</p></div>;
    return (
      <>
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
              <th style={{ padding: '0.6rem', fontSize: '0.78rem' }}>Name</th>
              <th style={{ padding: '0.6rem', fontSize: '0.78rem' }}>SEO</th>
              <th style={{ padding: '0.6rem', fontSize: '0.78rem' }}>Score</th>
              <th style={{ padding: '0.6rem', fontSize: '0.78rem' }}>Actions</th>
            </tr></thead>
            <tbody>
              {entityList.map((entity) => (
                <tr key={entity.id} style={{ borderBottom: '1px solid var(--border)', background: selectedEntity?.id === entity.id ? 'rgba(201, 169, 110, 0.08)' : 'transparent', cursor: 'pointer' }}
                  onClick={() => handleSelectEntity(entity)}>
                  <td style={{ padding: '0.6rem', fontWeight: 600, fontSize: '0.85rem' }}>{entity.name || entity.title}</td>
                  <td style={{ padding: '0.6rem' }}>{entity.seoTitle || entity.metaTitle
                    ? <span className="status-badge status-active" style={{ fontSize: '0.7rem' }}>SEO Set</span>
                    : <span className="status-badge status-pending" style={{ fontSize: '0.7rem' }}>Default</span>}
                  </td>
                  <td style={{ padding: '0.6rem' }}>{entity.seo_score ? <ScoreBadge score={entity.seo_score} /> : '—'}</td>
                  <td style={{ padding: '0.6rem' }}><button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); handleSelectEntity(entity); }}>Edit SEO</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entityTotal > 20 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <button className="btn-ghost btn-sm" disabled={entityPage <= 1} onClick={() => loadEntityList(entitySearch, entityPage - 1)}>Previous</button>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', padding: '0.25rem 0.5rem' }}>Page {entityPage} of {Math.ceil(entityTotal / 20)}</span>
            <button className="btn-ghost btn-sm" disabled={entityPage >= Math.ceil(entityTotal / 20)} onClick={() => loadEntityList(entitySearch, entityPage + 1)}>Next</button>
          </div>
        )}
      </>
    );
  }

  function renderEntityForm() {
    return (
      <div className="detail-panel">
        <div className="detail-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Pencil size={16} /> SEO for: {selectedEntity.name || selectedEntity.title}</h3>
        </div>
        {seoFormLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}><RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /><p>Loading SEO data...</p></div>
        ) : (
          <>
            <div className="form-grid">
              <div className={`form-group form-full ${entityValidation.errors.metaTitle ? 'has-error' : ''} ${entityValidation.validFields.metaTitle ? 'is-valid' : ''}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><label>Meta Title</label><CharCounter current={seoForm.metaTitle.length} max={60} /></div>
                <input value={seoForm.metaTitle} onChange={e => { setSeoForm({ ...seoForm, metaTitle: e.target.value }); entityValidation.handleChange('metaTitle', e.target.value); }} placeholder="Product Name | Store" maxLength={70} />
                {entityValidation.errors.metaTitle && (
                  <div className="form-error" role="alert">{entityValidation.errors.metaTitle}</div>
                )}
              </div>
              <div className="form-group form-full">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><label>Meta Description</label><CharCounter current={seoForm.metaDescription.length} max={160} /></div>
                <textarea rows={2} value={seoForm.metaDescription} onChange={e => setSeoForm({ ...seoForm, metaDescription: e.target.value })} placeholder="Compelling description..." maxLength={180} />
              </div>
              <div className="form-group form-full"><label>Meta Keywords</label><input value={seoForm.metaKeywords} onChange={e => setSeoForm({ ...seoForm, metaKeywords: e.target.value })} placeholder="kw1, kw2, kw3" /></div>
              <div className="form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Share2 size={14} /> Open Graph</h4>
              </div>
              <div className="form-group"><label>OG Title</label><input value={seoForm.ogTitle} onChange={e => setSeoForm({ ...seoForm, ogTitle: e.target.value })} /></div>
              <div className="form-group"><label>OG Description</label><input value={seoForm.ogDescription} onChange={e => setSeoForm({ ...seoForm, ogDescription: e.target.value })} /></div>
              <div className={`form-group form-full ${entityValidation.errors.ogImage ? 'has-error' : ''} ${entityValidation.validFields.ogImage ? 'is-valid' : ''}`}><label>OG Image URL</label><input value={seoForm.ogImage} onChange={e => { setSeoForm({ ...seoForm, ogImage: e.target.value }); entityValidation.handleChange('ogImage', e.target.value); }} />{entityValidation.errors.ogImage && <div className="form-error" role="alert">{entityValidation.errors.ogImage}</div>}</div>
              <div className={`form-group form-full ${entityValidation.errors.canonicalUrl ? 'has-error' : ''} ${entityValidation.validFields.canonicalUrl ? 'is-valid' : ''}`}><label>Canonical URL</label><input value={seoForm.canonicalUrl} onChange={e => { setSeoForm({ ...seoForm, canonicalUrl: e.target.value }); entityValidation.handleChange('canonicalUrl', e.target.value); }} />{entityValidation.errors.canonicalUrl && <div className="form-error" role="alert">{entityValidation.errors.canonicalUrl}</div>}</div>
              <div className="form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Settings size={14} /> Advanced Meta</h4>
              </div>
              <div className="form-group"><label>Robots Meta</label><select value={seoForm.robotsMeta} onChange={e => setSeoForm({ ...seoForm, robotsMeta: e.target.value })}><option value="">Default</option><option value="index, follow">index, follow</option><option value="noindex, follow">noindex, follow</option></select></div>
              <div className="form-group"><label>Content Lang</label><select value={seoForm.contentLanguage} onChange={e => setSeoForm({ ...seoForm, contentLanguage: e.target.value })}><option value="">Auto</option><option value="en">English</option><option value="hi">Hindi</option></select></div>
              <div className="form-group"><label>Sitemap Priority</label><select value={seoForm.sitemapPriority} onChange={e => setSeoForm({ ...seoForm, sitemapPriority: e.target.value })}><option value="0.3">0.3</option><option value="0.5">0.5</option><option value="0.7">0.7</option><option value="1.0">1.0</option></select></div>
              <div className="form-group"><label>Change Freq</label><select value={seoForm.sitemapChangefreq} onChange={e => setSeoForm({ ...seoForm, sitemapChangefreq: e.target.value })}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
            </div>
            <div className="form-actions" style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button className="btn-dark btn-sm" onClick={handleSaveEntitySEO} disabled={loading || seoFormLoading}>{loading ? 'Saving...' : 'Save Entity SEO'}</button>
              <button className="btn-ghost btn-sm" onClick={handleAutoGenerateEntitySchemas} disabled={loading}><Zap size={14} /> Generate JSON-LD</button>
              <button className="btn-ghost btn-sm" onClick={handleRunAudit} disabled={auditLoading}><Trophy size={14} /> Run SEO Audit</button>
              <button className="btn-ghost btn-sm" onClick={handleDeleteEntitySEO} disabled={loading} style={{ color: '#ef4444' }}><Trash2 size={14} /> Delete</button>
            </div>
            {auditData && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)' }}>
                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  <Trophy size={16} /> SEO Audit: <ScoreBadge score={auditData.percentage} />
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
                  {auditData.breakdown && Object.entries(auditData.breakdown).map(([key, val]) => (
                    <div key={key} style={{ padding: '0.5rem', borderRadius: '8px', fontSize: '0.75rem', background: val.status === 'good' ? '#dcfce7' : val.status === 'missing' ? '#fee2e2' : '#fef3c7' }}>
                      <strong>{key.replace(/_/g, ' ')}</strong>: {val.score}/{val.max}
                      <div style={{ marginTop: '2px', opacity: 0.7 }}>{val.message}</div>
                    </div>
                  ))}
                </div>
                {auditData.suggestions?.length > 0 && (
                  <div style={{ marginTop: '0.75rem' }}><strong style={{ fontSize: '0.78rem' }}>Suggestions:</strong>
                    <ul style={{ fontSize: '0.75rem', margin: '0.25rem 0', paddingLeft: '1.2rem' }}>
                      {auditData.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  function renderBulkAuditResults() {
    return (
      <div className="detail-panel">
        <div className="detail-header"><h3>Bulk Audit Results</h3></div>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, padding: '1rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{bulkAuditResults.total_audited}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Audited</div>
          </div>
          <div style={{ flex: 1, padding: '1rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{bulkAuditResults.average_percentage}%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Avg Score</div>
          </div>
        </div>
      </div>
    );
  }

  function renderSitemapContent() {
    if (sitemapLoading && sitemapData.entries.length === 0)
      return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}><RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} /><p>Loading...</p></div>;
    return (
      <>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, minWidth: '140px', padding: '1rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{sitemapData.count}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Total Entries</div>
          </div>
          <div style={{ flex: 1, minWidth: '140px', padding: '1rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700 }}>{sitemapData.lastGenerated ? formatDate(sitemapData.lastGenerated) : '—'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Last Generated</div>
          </div>
        </div>
        {sitemapData.entries.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}><th style={{ padding: '0.6rem', fontSize: '0.78rem' }}>URL</th><th style={{ padding: '0.6rem', fontSize: '0.78rem' }}>Last Modified</th></tr></thead>
              <tbody>{sitemapData.entries.slice(0, 100).map((entry, idx) => (
                <tr key={entry.id || idx} style={{ borderBottom: '1px solid var(--border)' }}><td style={{ padding: '0.6rem', fontSize: '0.82rem', fontFamily: 'monospace' }}>{entry.url}</td><td style={{ padding: '0.6rem', fontSize: '0.82rem', color: 'var(--muted)' }}>{formatDate(entry.lastModified || entry.last_modified || entry.createdAt)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}><FolderTree size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} /><p>No sitemap entries yet.</p></div>
        )}
      </>
    );
  }

  function renderRobotsContent() {
    if (robotsLoading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}><RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} /><p>Loading...</p></div>;
    return (
      <>
        <div className="form-group form-full">
          <textarea rows={12} value={robotsContent} onChange={e => setRobotsContent(e.target.value)}
            style={{ fontFamily: "'Courier New', monospace", fontSize: '0.82rem', lineHeight: 1.6, width: '100%', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', outline: 'none', resize: 'vertical' }}
            spellCheck={false} />
        </div>
        <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', padding: '1rem', fontSize: '0.78rem', marginBottom: '1rem' }}>
          <strong><AlertTriangle size={14} /> Common Directives</strong>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.75rem', margin: '0.5rem 0 0' }}>
{`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /cart
Sitemap: https://yourstore.com/sitemap.xml`}
          </pre>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ flex: 1, padding: '0.75rem 1rem', background: robotsContent !== robotsOriginal ? '#fef3c7' : 'var(--off-white)', borderRadius: 'var(--radius-lg)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {robotsContent !== robotsOriginal ? <><AlertTriangle size={14} style={{ color: '#92400e' }} /> Unsaved</> : <><CheckCircle size={14} style={{ color: '#22c55e' }} /> Up to date</>}
          </div>
        </div>
        <div className="form-actions" style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-dark btn-sm" onClick={handleSaveRobots} disabled={loading}>{loading ? 'Saving...' : 'Save Robots.txt'}</button>
          <button className="btn-ghost btn-sm" onClick={handleResetRobots} disabled={loading}>Reset</button>
        </div>
      </>
    );
  }
}

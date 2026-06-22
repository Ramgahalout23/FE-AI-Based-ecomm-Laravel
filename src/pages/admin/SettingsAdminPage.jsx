import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { settingsAPI } from '../../api/settings';
import { useSettings } from '../../store/useSettings';
import toast from '../../utils/toast';
import { getImageUrl } from '../../utils/formatters';
import ImageUploadZone from '../../components/common/ImageUploadZone';
import { MessageCircle, X, Minus, Send } from 'lucide-react';
import { aiAPI } from '../../api/ai';
import TaxAdminTab from './TaxAdminTab';

const AVAILABLE_CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal' },
];

const AVAILABLE_TIMEZONES = [
  { value: 'IST', label: 'IST (Indian Standard Time)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'EST', label: 'EST (Eastern Standard Time)' },
  { value: 'PST', label: 'PST (Pacific Standard Time)' },
  { value: 'GMT', label: 'GMT (Greenwich Mean Time)' },
  { value: 'CET', label: 'CET (Central European Time)' },
  { value: 'AST', label: 'AST (Arabian Standard Time)' },
  { value: 'AEST', label: 'AEST (Australian Eastern Standard Time)' },
];

export default function SettingsAdminPage() {
  const { settings: contextSettings, loading: contextLoading, updateSettings: updateContextSettings } = useSettings();
  const [tab, setTab] = useState('general');
  const [seo, setSeo] = useState({ title: '', description: '', keywords: '' });
  const [branding, setBranding] = useState({ logoUrl: '', logoDarkUrl: '', faviconUrl: '', primaryColor: '#000000', secondaryColor: '#d4af37', facebook: '', instagram: '', twitter: '', youtube: '' });
  const [settings, setSettings] = useState(contextSettings);
  const [loading, setLoading] = useState(contextLoading);
  const [dynamicGateways, setDynamicGateways] = useState([]);
  const [testingAI, setTestingAI] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);
  const [editingGateway, setEditingGateway] = useState(null);
  const [gatewayForm, setGatewayForm] = useState({ id: '', name: '', description: '', enabled: true, paymentUrl: '', fields: [] });
  const [newField, setNewField] = useState({ key: '', label: '', value: '', type: 'text' });
  const [previewOpen, setPreviewOpen] = useState(false);

  // Maintenance schedule state
  const [schedules, setSchedules] = useState([]);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    message: '',
    startsAt: '',
    endsAt: '',
    isRecurring: false,
    recurringDays: '',
    timeStart: '02:00',
    timeEnd: '04:00',
  });

  // Dynamic system health metrics state
  const [systemHealth, setSystemHealth] = useState({
    databaseConnection: false,
    cacheConnection: false,
    diskSpace: 'Checking...',
    uptime: 0,
    environment: 'Development'
  });

  // Backup history state
  const [backups, setBackups] = useState([]);
  const [backupsLoading, setBackupsLoading] = useState(false);

  // Sync context settings with local state
  useEffect(() => {
    if (Object.keys(contextSettings).length > 0) {
      setSettings(contextSettings);
    }
  }, [contextSettings]);

  useEffect(() => {
    setLoading(contextLoading);
  }, [contextLoading]);

  // Fetch real-time system metrics
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await adminAPI.getSystemHealth();
        const data = res.data?.data || res.data;
        if (data) {
          setSystemHealth(prev => ({
            ...prev,
            ...data
          }));
        }
      } catch (err) {
        console.error('Failed to load system health metrics', err);
      }
    };

    if (tab === 'system') {
      fetchHealth();
    }
  }, [tab]);

  useEffect(() => {
    const load = async () => {
      const [seoRes, settingsRes] = await Promise.allSettled([
        adminAPI.getSEO(),
        adminAPI.getSettings(),
      ]);

      if (seoRes.status === 'fulfilled') {
        const r = seoRes.value;
        if (r.data) setSeo(r.data);
      } else {
        console.warn('Failed to load SEO settings:', seoRes.reason);
      }

      if (settingsRes.status === 'fulfilled') {
        const r = settingsRes.value;
        const data = r.data?.data || r.data;
        if (data) {
          setBranding(prev => ({
            ...prev,
            logoUrl: data.logoUrl || prev.logoUrl,
            logoDarkUrl: data.logoDarkUrl || prev.logoDarkUrl,
            faviconUrl: data.faviconUrl || prev.faviconUrl,
            primaryColor: data.primaryColor || prev.primaryColor,
            secondaryColor: data.secondaryColor || prev.secondaryColor,
            facebook: data.facebook || prev.facebook,
            instagram: data.instagram || prev.instagram,
            twitter: data.twitter || prev.twitter,
            youtube: data.youtube || prev.youtube,
          }));
          if (data.dynamic_payment_methods) {
            try {
              const parsed = JSON.parse(data.dynamic_payment_methods);
              if (Array.isArray(parsed)) {
                setDynamicGateways(parsed);
              }
            } catch (e) {
              console.error('Failed to parse dynamic payment methods', e);
            }
          }
        }
      } else {
        console.warn('Failed to load settings:', settingsRes.reason);
      }
    };
    load();
  }, []);

  const handleSaveSEO = async () => {
    setLoading(true);
    try { await adminAPI.updateSEO(seo); toast.success('SEO settings saved'); }
    catch { toast.error('Failed to save'); }
    finally { setLoading(false); }
  };

  const handleSaveBranding = async () => {
    setLoading(true);
    try {
      // updateContextSettings handles both API save (POST /settings) AND store update,
      // so Navbar/Footer/Sidebar reflect the new logo/colors immediately.
      await updateContextSettings(branding);
      // Update browser tab favicon immediately
      if (branding.faviconUrl) {
        const faviconHref = getImageUrl(branding.faviconUrl);
        let link = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = faviconHref;
      }
      toast.success('Branding settings saved');
    }
    catch { toast.error('Failed to save branding'); }
    finally { setLoading(false); }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Collect all changed settings
      const updates = {};
      const prevSettings = contextSettings;
      Object.keys(settings).forEach(key => {
        if (prevSettings[key] !== settings[key]) {
          updates[key] = settings[key];
        }
      });

      // Always include dynamic payment methods with settings
      if (dynamicGateways.length > 0) {
        updates.dynamic_payment_methods = JSON.stringify(dynamicGateways);
      }
      
      if (Object.keys(updates).length > 0) {
        // Single save through the proper context channel (uses settingsAPI -> POST /settings)
        await updateContextSettings(updates);
      } else {
        toast.info('No changes to save');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Dedicated quick-action handler that bypasses the async state timing issue
  const handleQuickToggleMaintenance = async (enabled) => {
    setLoading(true);
    try {
      const updates = { maintenanceMode: enabled ? 'true' : 'false' };
      await updateContextSettings(updates);
      setSettings(prev => ({ ...prev, ...updates }));
      toast.success(enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
    } catch (err) {
      toast.error('Failed to toggle maintenance mode');
    } finally {
      setLoading(false);
    }
  };

  // Load schedules when maintenance tab is active
  useEffect(() => {
    if (tab === 'maintenance') {
      loadSchedules();
    }
  }, [tab]);

  // Load backups when integrations tab is active
  useEffect(() => {
    if (tab === 'integrations') {
      loadBackups();
    }
  }, [tab]);

  const loadBackups = async () => {
    setBackupsLoading(true);
    try {
      const res = await adminAPI.listBackups();
      const data = res.data?.data || res.data || {};
      const backupsList = data.backups || [];
      
      // Transform backups to match UI expectations
      const transformed = backupsList.map((backup, idx) => ({
        id: idx.toString(),
        timestamp: backup.createdAt,
        size: backup.sizeFormatted,
        status: backup.status === 'completed' ? 'success' : 'pending',
        filename: backup.filename,
        error: backup.error,
      }));
      
      setBackups(transformed);
    } catch (err) {
      console.warn('Failed to load backups:', err);
      toast.error('Failed to load backup history');
    } finally {
      setBackupsLoading(false);
    }
  };

  const loadSchedules = async () => {
    setSchedulesLoading(true);
    try {
      const res = await settingsAPI.getSchedules();
      const data = res.data?.data || [];
      setSchedules(data);
    } catch (err) {
      console.warn('Failed to load schedules:', err);
    } finally {
      setSchedulesLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!scheduleForm.title.trim()) {
      toast.error('Schedule title is required');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        title: scheduleForm.title,
        message: scheduleForm.message,
        startsAt: scheduleForm.startsAt ? new Date(scheduleForm.startsAt).toISOString() : null,
        endsAt: scheduleForm.endsAt ? new Date(scheduleForm.endsAt).toISOString() : null,
        isRecurring: scheduleForm.isRecurring,
        ...(scheduleForm.isRecurring && {
          recurringDays: scheduleForm.recurringDays,
          timeStart: scheduleForm.timeStart,
          timeEnd: scheduleForm.timeEnd,
        }),
      };
      await settingsAPI.createSchedule(payload);
      toast.success('Schedule created successfully');
      setShowScheduleModal(false);
      resetScheduleForm();
      loadSchedules();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSchedule = async () => {
    if (!scheduleForm.title.trim() || !editingSchedule) return;
    setLoading(true);
    try {
      const payload = {
        title: scheduleForm.title,
        message: scheduleForm.message,
        startsAt: scheduleForm.startsAt ? new Date(scheduleForm.startsAt).toISOString() : null,
        endsAt: scheduleForm.endsAt ? new Date(scheduleForm.endsAt).toISOString() : null,
        isRecurring: scheduleForm.isRecurring,
        ...(scheduleForm.isRecurring && {
          recurringDays: scheduleForm.recurringDays,
          timeStart: scheduleForm.timeStart,
          timeEnd: scheduleForm.timeEnd,
        }),
      };
      await settingsAPI.updateSchedule(editingSchedule.id, payload);
      toast.success('Schedule updated');
      setShowScheduleModal(false);
      resetScheduleForm();
      loadSchedules();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    try {
      await settingsAPI.deleteSchedule(id);
      toast.success('Schedule deleted');
      loadSchedules();
    } catch (err) {
      toast.error('Failed to delete schedule');
    }
  };

  const handleToggleSchedule = async (schedule) => {
    try {
      await settingsAPI.updateSchedule(schedule.id, { isActive: !schedule.isActive });
      toast.success(schedule.isActive ? 'Schedule disabled' : 'Schedule enabled');
      loadSchedules();
    } catch (err) {
      toast.error('Failed to toggle schedule');
    }
  };

  const resetScheduleForm = () => {
    setEditingSchedule(null);
    setScheduleForm({
      title: '',
      message: '',
      startsAt: '',
      endsAt: '',
      isRecurring: false,
      recurringDays: '',
      timeStart: '02:00',
      timeEnd: '04:00',
    });
  };

  const openEditSchedule = (schedule) => {
    setEditingSchedule(schedule);
    setScheduleForm({
      title: schedule.title || '',
      message: schedule.message || '',
      startsAt: schedule.startsAt ? schedule.startsAt.slice(0, 16) : '',
      endsAt: schedule.endsAt ? schedule.endsAt.slice(0, 16) : '',
      isRecurring: schedule.isRecurring || false,
      recurringDays: schedule.recurringDays || '',
      timeStart: schedule.timeStart || '02:00',
      timeEnd: schedule.timeEnd || '04:00',
    });
    setShowScheduleModal(true);
  };

  const formatScheduleDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      await adminAPI.triggerBackup();
      toast.success('Backup created successfully');
      // Reload backups list after creation
      await loadBackups();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Backup creation failed';
      toast.error(errorMessage);
      console.error('Backup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      // 1. Clear Laravel backend cache (config, view, cache)
      await adminAPI.clearCache();

      // 2. Clear frontend localStorage caches
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('THREVOLT_') || key.startsWith('luxe-') || key.includes('Query') || key.includes('query'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // 3. Clear service worker caches (Cache Storage API)
      if ('caches' in window) {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => caches.delete(key)));
      }

      // 4. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      toast.success('All caches cleared! Reloading page...');

      // 5. Reload the page to fully refresh with fresh data
      setTimeout(() => window.location.reload(), 1200);
    }
    catch { toast.error('Failed to clear cache'); }
  };

  const handleTestAIConnection = async () => {
    setTestingAI(true);
    try {
      const apiKey = settings.aiProviderApiKey || settings.openaiApiKey;
      const baseUrl = settings.aiProviderUrl || 'https://api.openai.com/v1';
      const chatModel = settings.aiChatModel || 'gpt-4o';
      if (!apiKey) {
        toast.error('Please enter an API key first');
        setTestingAI(false);
        return;
      }
      try {
        const res = await aiAPI.testConnection({
          apiKey,
          baseUrl,
          chatModel,
        });
        const data = res.data?.data || res.data;
        if (data?.success || data?.ok) {
          toast.success(data.message || '✅ AI connection successful!');
        } else {
          toast.success('✅ AI connection successful!');
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Connection failed';
        toast.error(`Connection failed: ${msg}`);
      }
    } catch (err) {
      toast.error('Failed to test connection');
    } finally {
      setTestingAI(false);
    }
  };

  return (
    <div>
      <div className="admin-header"><h2>Settings</h2><p>Configure store settings and system preferences</p></div>

      <div className="admin-tabs-wrap">
        <button className={`admin-tab ${tab === 'general' ? 'active' : ''}`} onClick={() => setTab('general')}>General</button>
        <button className={`admin-tab ${tab === 'branding' ? 'active' : ''}`} onClick={() => setTab('branding')}>Branding</button>
        <button className={`admin-tab ${tab === 'shipping-labels' ? 'active' : ''}`} onClick={() => setTab('shipping-labels')}>Shipping Labels</button>
        <button className={`admin-tab ${tab === 'payments' ? 'active' : ''}`} onClick={() => setTab('payments')}>Payments</button>
        <button className={`admin-tab ${tab === 'tax' ? 'active' : ''}`} onClick={() => setTab('tax')}>Tax & Shipping</button>
        <button className={`admin-tab ${tab === 'email' ? 'active' : ''}`} onClick={() => setTab('email')}>Email</button>
        <button className={`admin-tab ${tab === 'sms' ? 'active' : ''}`} onClick={() => setTab('sms')}>SMS & Twilio</button>
        <button className={`admin-tab ${tab === 'integrations' ? 'active' : ''}`} onClick={() => setTab('integrations')}>Integrations</button>
        <button className={`admin-tab ${tab === 'websocket' ? 'active' : ''}`} onClick={() => setTab('websocket')}>WebSocket</button>
        <button className={`admin-tab ${tab === 'footer' ? 'active' : ''}`} onClick={() => setTab('footer')}>Footer</button>
        <button className={`admin-tab ${tab === 'seo' ? 'active' : ''}`} onClick={() => setTab('seo')}>SEO</button>
        <button className={`admin-tab ${tab === 'maintenance' ? 'active' : ''}`} onClick={() => setTab('maintenance')}>Maintenance</button>
        <button className={`admin-tab ${tab === 'system' ? 'active' : ''}`} onClick={() => setTab('system')}>System</button>
        <button className={`admin-tab ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>Chat / Support</button>
      </div>

      {tab === 'general' && (
        <div className="detail-panel">
          <div className="detail-header"><h3>Store Configuration</h3></div>
          <div className="form-grid">
            <div className="form-group"><label>Store Name</label><input value={settings.storeName} onChange={e => setSettings({...settings, storeName: e.target.value})} /></div>
            <div className="form-group"><label>Contact Email</label><input value={settings.contactEmail} onChange={e => setSettings({...settings, contactEmail: e.target.value})} /></div>
            <div className="form-group"><label>Currency</label><select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})}><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option></select></div>
            <div className="form-group"><label>Timezone</label><select value={settings.timezone} onChange={e => setSettings({...settings, timezone: e.target.value})}><option>UTC</option><option>EST</option><option>PST</option><option>IST</option></select></div>
            <div className="form-group form-full"><label>Store Address</label><input value={settings.storeAddress} onChange={e => setSettings({...settings, storeAddress: e.target.value})} /></div>
          </div>
          <div className="form-actions"><button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button></div>

          {/* Announcement Bar Settings */}
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3>Announcement Bar</h3>
                <span className={`status-badge ${settings.announcementEnabled !== 'false' ? 'status-active' : 'status-pending'}`}>
                  {settings.announcementEnabled !== 'false' ? 'Active' : 'Hidden'}
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.announcementEnabled !== 'false'} onChange={e => setSettings({ ...settings, announcementEnabled: e.target.checked ? 'true' : 'false' })} />
                <strong>Show Announcement Bar</strong>
              </label>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              A scrolling marquee strip displayed at the very top of the storefront. Perfect for promotions, shipping info, and brand messaging.
            </p>
            <div className="form-grid">
              <div className="form-group form-full">
                <label>Announcement Message</label>
                <textarea
                  rows={2}
                  value={settings.announcementText || 'THREVOLT  ✦  Premium Quality Guaranteed  ✦  Free Shipping on orders above ₹499'}
                  onChange={e => setSettings({ ...settings, announcementText: e.target.value })}
                  placeholder="Separate items with  ✦  (star symbol)"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Use <strong>✦</strong> to separate announcement items. The text scrolls continuously.
                </span>
              </div>
            </div>
            {/* Preview — matches the storefront dark/gold theme */}
            <div style={{
              marginTop: '1rem',
              background: '#1A1A1A',
              borderRadius: 'var(--radius-lg)',
              padding: '0.5rem 1rem',
              overflow: 'hidden',
              opacity: settings.announcementEnabled !== 'false' ? 1 : 0.4,
              transition: 'opacity 0.3s ease',
              border: '1px solid rgba(201, 169, 110, 0.15)',
            }}>
              <style>{`
                @keyframes announcement-preview {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
              `}</style>
              <div style={{
                display: 'flex',
                gap: 0,
                whiteSpace: 'nowrap',
                animation: settings.announcementEnabled !== 'false' ? 'announcement-preview 20s linear infinite' : 'none',
                fontFamily: 'Jost, sans-serif',
                fontSize: '0.65rem',
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.85)',
                padding: '0.35rem 0',
              }}>
                {(() => {
                  const previewItems = (settings.announcementText || 'THREVOLT  ✦  Premium Quality Guaranteed  ✦  Free Shipping on orders above ₹499').split('✦').filter(Boolean);
                  const renderRow = (key) => (
                    <span key={key}>
                      {previewItems.map((item, idx) => (
                        <span key={idx}>
                          {idx > 0 && <>&nbsp;<span style={{color: '#C9A96E', opacity: 0.6}}>✦</span>&nbsp;</>}
                          {item}
                        </span>
                      ))}
                      &nbsp;<span style={{color: '#C9A96E', opacity: 0.6}}>✦</span>&nbsp;
                    </span>
                  );
                  return [renderRow('a'), renderRow('b')];
                })()}
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Announcement Settings'}</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'shipping-labels' && (
        <div className="detail-panel">
          <div className="detail-header"><h3>Shipping Label Configuration</h3></div>
          <div className="form-grid">
            <div className="form-group form-full">
              <ImageUploadZone 
                label="Shipping Label Logo" 
                value={settings.shippingLabelLogo || ''} 
                onChange={url => setSettings({...settings, shippingLabelLogo: url})} 
              />
            </div>
            <div className="form-group form-full"><label>Pickup Address</label><textarea rows={2} value={settings.shippingPickupAddress} onChange={e => setSettings({...settings, shippingPickupAddress: e.target.value})} placeholder="Warehouse name & address..." /></div>
            <div className="form-group form-full"><label>Return Address</label><textarea rows={2} value={settings.shippingReturnAddress} onChange={e => setSettings({...settings, shippingReturnAddress: e.target.value})} placeholder="Return center address..." /></div>
            <div className="form-group"><label>Customer Support Phone</label><input value={settings.shippingQueryPhone || ''} onChange={e => setSettings({...settings, shippingQueryPhone: e.target.value})} placeholder="+1 (555) 019-2834" autoComplete="tel" /></div>
            <div className="form-group"><label>Customer Support Mobile</label><input value={settings.shippingQueryMobile || ''} onChange={e => setSettings({...settings, shippingQueryMobile: e.target.value})} placeholder="+1 (555) 019-2834" autoComplete="tel" /></div>
            <div className="form-group"><label>Customer Support Email</label><input value={settings.shippingQueryEmail || ''} onChange={e => setSettings({...settings, shippingQueryEmail: e.target.value})} placeholder="support@yourstore.com" autoComplete="email" /></div>
            <div className="form-group form-full"><label>Footnote / Label Note</label><textarea rows={2} value={settings.shippingLabelNote} onChange={e => setSettings({...settings, shippingLabelNote: e.target.value})} placeholder="Special shipping instructions or customer note at the bottom of the label..." /></div>
          </div>
          <div className="form-actions"><button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Shipping Settings'}</button></div>
        </div>
      )}

      {tab === 'branding' && (
        <div className="detail-panel">
          <div className="detail-header"><h3>Site Branding</h3></div>
          <div className="form-grid">
            <div className="form-group form-full">
              <ImageUploadZone 
                label="Store Logo - Light Background (Black Logo)" 
                value={branding.logoUrl} 
                onChange={url => setBranding({...branding, logoUrl: url})} 
              />
            </div>
            
            <div className="form-group form-full">
              <ImageUploadZone 
                label="Store Logo - Dark Background (White Logo)" 
                value={branding.logoDarkUrl} 
                onChange={url => setBranding({...branding, logoDarkUrl: url})} 
              />
            </div>

            <div className="form-group form-full">
              <ImageUploadZone 
                label="Site Favicon" 
                value={branding.faviconUrl} 
                onChange={url => setBranding({...branding, faviconUrl: url})} 
              />
            </div>
            
            <div className="form-group"><label>Primary Brand Color</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="color" value={branding.primaryColor} onChange={e => setBranding({...branding, primaryColor: e.target.value})} style={{ width: '40px', height: '38px', padding: 0 }} />
                <input value={branding.primaryColor} onChange={e => setBranding({...branding, primaryColor: e.target.value})} style={{ flex: 1, fontFamily: 'monospace' }} />
              </div>
            </div>
            
            <div className="form-group"><label>Secondary / Accent Color</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="color" value={branding.secondaryColor} onChange={e => setBranding({...branding, secondaryColor: e.target.value})} style={{ width: '40px', height: '38px', padding: 0 }} />
                <input value={branding.secondaryColor} onChange={e => setBranding({...branding, secondaryColor: e.target.value})} style={{ flex: 1, fontFamily: 'monospace' }} />
              </div>
            </div>

            <div className="form-group form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}><label style={{ fontSize: '1rem', color: 'var(--charcoal)', marginBottom: '1rem' }}>Social Links</label></div>
            <div className="form-group"><label>Instagram URL</label><input value={branding.instagram} onChange={e => setBranding({...branding, instagram: e.target.value})} placeholder="https://instagram.com/..." autoComplete="url" /></div>
            <div className="form-group"><label>Twitter URL</label><input value={branding.twitter} onChange={e => setBranding({...branding, twitter: e.target.value})} placeholder="https://twitter.com/..." autoComplete="url" /></div>
            <div className="form-group"><label>Facebook URL</label><input value={branding.facebook} onChange={e => setBranding({...branding, facebook: e.target.value})} placeholder="https://facebook.com/..." autoComplete="url" /></div>
            <div className="form-group"><label>YouTube URL</label><input value={branding.youtube} onChange={e => setBranding({...branding, youtube: e.target.value})} placeholder="https://youtube.com/..." autoComplete="url" /></div>
          </div>
          <div className="form-actions"><button className="btn-dark btn-sm" onClick={handleSaveBranding} disabled={loading}>{loading ? 'Saving...' : 'Save Branding'}</button></div>
        </div>
      )}

      {tab === 'payments' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Razorpay Configuration */}
          <div className="detail-panel">
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3>Razorpay Configuration</h3>
                <span className={`status-badge ${settings.razorpayEnabled === 'true' ? 'status-active' : 'status-pending'}`}>
                  {settings.razorpayEnabled === 'true' ? 'Active' : 'Disabled'}
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.razorpayEnabled === 'true'} onChange={e => setSettings({ ...settings, razorpayEnabled: e.target.checked ? 'true' : 'false' })} />
                <strong>Enable Razorpay</strong>
              </label>
            </div>
            {settings.razorpayEnabled === 'true' && (
              <div className="form-grid" style={{ marginTop: '1rem' }}>
                <div className="form-group">
                  <label>Key ID</label>
                  <input value={settings.razorpayKeyId || ''} onChange={e => setSettings({ ...settings, razorpayKeyId: e.target.value })} placeholder="rzp_test_..." type="password" autoComplete="off" />
                </div>
                <div className="form-group">
                  <label>Key Secret</label>
                  <input value={settings.razorpayKeySecret || ''} onChange={e => setSettings({ ...settings, razorpayKeySecret: e.target.value })} placeholder="Key Secret" type="password" autoComplete="off" />
                </div>
              </div>
            )}
            <div className="form-actions" style={{ marginTop: '1rem' }}><button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Razorpay Settings'}</button></div>
          </div>

          {/* Cash on Delivery (COD) Configuration - New! */}
          <div className="detail-panel">
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3>Cash on Delivery (COD)</h3>
                <span className={`status-badge ${settings.codEnabled === 'true' ? 'status-active' : 'status-pending'}`}>
                  {settings.codEnabled === 'true' ? 'Active' : 'Disabled'}
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.codEnabled === 'true'} onChange={e => setSettings({ ...settings, codEnabled: e.target.checked ? 'true' : 'false' })} />
                <strong>Enable COD</strong>
              </label>
            </div>
            {settings.codEnabled === 'true' && (
              <div className="form-grid" style={{ marginTop: '1rem' }}>
                <div className="form-group form-full">
                  <label>Instructions for Checkout</label>
                  <textarea rows={2} value={settings.codInstructions || ''} onChange={e => setSettings({ ...settings, codInstructions: e.target.value })} placeholder="Pay with cash upon package delivery..." />
                </div>
              </div>
            )}
            <div className="form-actions" style={{ marginTop: '1rem' }}><button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save COD Settings'}</button></div>
          </div>

          {/* Custom Dynamic Gateways Configuration */}
          <div className="detail-panel">
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Custom Dynamic Payment Methods</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  Register, configure, and toggle custom third-party payment gateways dynamically.
                </p>
              </div>
              <button 
                className="btn-dark btn-sm"
                onClick={() => {
                  setEditingGateway(null);
                  setGatewayForm({ id: '', name: '', description: '', enabled: true, fields: [] });
                  setShowGatewayModal(true);
                }}
              >
                + Add Custom Gateway
              </button>
            </div>

            {dynamicGateways.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                <p>No custom dynamic payment gateways registered yet.</p>
                <button 
                  className="btn-ghost btn-sm" 
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => {
                    setEditingGateway(null);
                    setGatewayForm({ id: '', name: '', description: '', enabled: true, fields: [] });
                    setShowGatewayModal(true);
                  }}
                >
                  Create your first gateway
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>Gateway ID</th>
                      <th style={{ padding: '0.75rem' }}>Name</th>
                      <th style={{ padding: '0.75rem' }}>Description</th>
                      <th style={{ padding: '0.75rem' }}>Custom Keys</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dynamicGateways.map((gw, idx) => (
                      <tr key={gw.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                          <code style={{ background: 'var(--off-white)', padding: '0.125rem 0.25rem', borderRadius: '4px' }}>
                            {gw.id}
                          </code>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{gw.name}</td>
                        <td style={{ padding: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {gw.description}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="status-badge status-pending" style={{ fontSize: '0.75rem' }}>
                            {gw.fields?.length || 0} fields
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <button
                            onClick={() => {
                              const updated = [...dynamicGateways];
                              updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
                              setDynamicGateways(updated);
                              toast.success(`${gw.name} status updated. Click Save to persist.`);
                            }}
                            className={`status-badge ${gw.enabled ? 'status-active' : 'status-pending'}`}
                            style={{ border: 'none', cursor: 'pointer' }}
                          >
                            {gw.enabled ? 'Enabled' : 'Disabled'}
                          </button>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              className="btn-ghost btn-sm"
                              onClick={() => {
                                setEditingGateway(idx);
                                setGatewayForm({ ...gw });
                                setShowGatewayModal(true);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-ghost btn-sm"
                              style={{ color: 'red' }}
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete ${gw.name}?`)) {
                                  const updated = dynamicGateways.filter((_, i) => i !== idx);
                                  setDynamicGateways(updated);
                                  toast.success(`${gw.name} deleted. Click Save to persist.`);
                                }
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
                {loading ? 'Saving...' : 'Save All Payment Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'tax' && (
        <TaxAdminTab
          settings={settings}
          setSettings={setSettings}
          loading={loading}
          setLoading={setLoading}
          handleSaveSettings={handleSaveSettings}
        />
      )}

      {tab === 'email' && (
        <div className="detail-panel">
          <div className="detail-header"><h3>SMTP & Email Settings</h3></div>
          <div className="form-grid">
            <div className="form-group"><label>SMTP Host</label><input value={settings.smtpHost || ''} onChange={e => setSettings({ ...settings, smtpHost: e.target.value })} /></div>
            <div className="form-group"><label>SMTP Port</label><input value={settings.smtpPort || ''} onChange={e => setSettings({ ...settings, smtpPort: e.target.value })} /></div>
            <div className="form-group"><label>SMTP Username</label><input value={settings.smtpUsername || ''} onChange={e => setSettings({ ...settings, smtpUsername: e.target.value })} /></div>
            <div className="form-group"><label>SMTP Password</label><input type="password" value={settings.smtpPassword || ''} onChange={e => setSettings({ ...settings, smtpPassword: e.target.value })} placeholder="••••••••" autoComplete="off" /></div>
            <div className="form-group form-full"><label>From Email Address</label><input value={settings.fromEmailAddress || ''} onChange={e => setSettings({ ...settings, fromEmailAddress: e.target.value })} autoComplete="email" /></div>
            <div className="form-group form-full"><label>Order Confirmation Template</label><select value={settings.emailTemplate || 'default'} onChange={e => setSettings({ ...settings, emailTemplate: e.target.value })}><option value="default">Default Template</option><option value="custom">Custom Template (Raw HTML)</option></select></div>
          </div>
          <div className="form-actions">
            <button className="btn-ghost btn-sm" onClick={() => toast.success('Test email sent')}>Send Test Email</button>
            <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Email Settings'}</button>
          </div>
        </div>
      )}

      {tab === 'websocket' && (
        <div className="detail-panel">
          <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3>WebSocket Configuration</h3>
              <span className={`status-badge ${settings.socketEnabled !== 'false' ? 'status-active' : 'status-pending'}`}>
                {settings.socketEnabled !== 'false' ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.socketEnabled !== 'false'} onChange={e => setSettings({ ...settings, socketEnabled: e.target.checked ? 'true' : 'false' })} />
              <strong>Enable WebSocket</strong>
            </label>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
            WebSockets power real-time features: order status updates, notifications, and review alerts.
            Changes take effect on the next server restart.
          </p>
          <div className="form-grid">
            <div className="form-group">
              <label>Ping Interval (ms)</label>
              <input 
                type="number" 
                value={settings.socketPingInterval || '25000'} 
                onChange={e => setSettings({ ...settings, socketPingInterval: e.target.value })} 
                placeholder="25000"
                disabled={settings.socketEnabled === 'false'}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>How often the server sends keep-alive pings. Default: 25000</span>
            </div>
            <div className="form-group">
              <label>Ping Timeout (ms)</label>
              <input 
                type="number" 
                value={settings.socketPingTimeout || '20000'} 
                onChange={e => setSettings({ ...settings, socketPingTimeout: e.target.value })} 
                placeholder="20000"
                disabled={settings.socketEnabled === 'false'}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Time to wait for a pong before disconnecting. Default: 20000</span>
            </div>
            <div className="form-group form-full">
              <label>Allowed CORS Origins</label>
              <textarea 
                rows={3}
                value={settings.socketAllowedOrigins || ''} 
                onChange={e => setSettings({ ...settings, socketAllowedOrigins: e.target.value })} 
                placeholder="http://localhost:3000,http://localhost:5173"
                disabled={settings.socketEnabled === 'false'}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Comma-separated list of origins allowed to connect via WebSocket.</span>
            </div>
          </div>
          <div className="form-actions">
            <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save WebSocket Settings'}</button>
          </div>
        </div>
      )}

      {tab === 'maintenance' && (
        <div>
          <div className="detail-panel">
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3>Maintenance Mode</h3>
                <span className={`status-badge ${settings.maintenanceMode === 'true' ? 'status-active' : 'status-pending'}`}>
                  {settings.maintenanceMode === 'true' ? 'Active' : 'Disabled'}
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.maintenanceMode === 'true'} onChange={e => setSettings({ ...settings, maintenanceMode: e.target.checked ? 'true' : 'false' })} />
                <strong>Enable Maintenance Mode</strong>
              </label>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
              When enabled, only admin users and allowed IPs can access the storefront.
              All other visitors will see a maintenance page.
            </p>

            <div className="form-grid">
              <div className="form-group form-full">
                <label>Maintenance Message</label>
                <textarea 
                  rows={3}
                  value={settings.maintenanceMessage || 'We are currently under maintenance. Please check back soon.'} 
                  onChange={e => setSettings({ ...settings, maintenanceMessage: e.target.value })} 
                  placeholder="We are currently under maintenance. Please check back soon."
                  disabled={settings.maintenanceMode !== 'true'}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>This message will be shown to visitors when maintenance mode is active.</span>
              </div>
              <div className="form-group form-full">
                <label>Allowed IP Addresses (Bypass Maintenance)</label>
                <textarea 
                  rows={2}
                  value={settings.maintenanceAllowedIPs || ''} 
                  onChange={e => setSettings({ ...settings, maintenanceAllowedIPs: e.target.value })} 
                  placeholder="127.0.0.1,203.0.113.1"
                  disabled={settings.maintenanceMode !== 'true'}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Comma-separated list of IP addresses that can bypass maintenance mode (e.g., office IP, VPN).</span>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <strong style={{ fontSize: '0.85rem' }}>Maintenance Page Preview</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Non-admin users will see this page</span>
              </div>
              <div style={{
                background: '#f8f6f3',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                padding: '2rem',
                textAlign: 'center',
                opacity: settings.maintenanceMode === 'true' ? 1 : 0.5,
                transition: 'opacity 0.3s ease',
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛠️</div>
                <div style={{ display: 'inline-block', background: 'rgba(234,179,8,0.1)', color: '#ca8a04', fontSize: '0.7rem', fontWeight: 'bold', padding: '0.25rem 1rem', borderRadius: '9999px', marginBottom: '1rem', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                  We'll Be Back Soon
                </div>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>Site Under Maintenance</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--muted)', maxWidth: '400px', margin: '0 auto' }}>
                  {settings.maintenanceMode === 'true' 
                    ? (settings.maintenanceMessage || 'We are currently under maintenance. Please check back soon.')
                    : 'Preview will appear once maintenance mode is enabled.'}
                </p>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: '1.5rem' }}>
              <button 
                className="btn-ghost btn-sm" 
                onClick={() => {
                  setSettings({
                    ...settings,
                    maintenanceMode: 'false',
                    maintenanceMessage: 'We are currently under maintenance. Please check back soon.',
                    maintenanceAllowedIPs: '',
                  });
                }}
                disabled={loading}
              >
                Reset to Defaults
              </button>
              <button 
                className="btn-dark btn-sm" 
                onClick={handleSaveSettings} 
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Maintenance Settings'}
              </button>
            </div>
          </div>

          {/* Quick Actions panel */}
          <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
            <div className="detail-header"><h3>Quick Actions</h3></div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200, padding: '1.25rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
                {settings.maintenanceMode === 'true' ? (
                  <>
                    <strong>Disable Maintenance</strong>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>Bring the site back online</p>
                    <button className="btn-ghost btn-sm" onClick={() => handleQuickToggleMaintenance(false)} disabled={loading}>Disable Now</button>
                  </>
                ) : (
                  <>
                    <strong>Enable Maintenance</strong>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>Take the site down for updates</p>
                    <button className="btn-dark btn-sm" onClick={() => handleQuickToggleMaintenance(true)} disabled={loading}>Enable Now</button>
                  </>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 200, padding: '1.25rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                <strong>Test Maintenance Mode</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>Open the storefront in incognito to verify</p>
                <button className="btn-ghost btn-sm" onClick={() => window.open('/', '_blank')}>Open Storefront</button>
              </div>
              <div style={{ flex: 1, minWidth: 200, padding: '1.25rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
                <strong>Check Status</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>View the current site status endpoint</p>
                <button className="btn-ghost btn-sm" onClick={async () => {
                  try {
                    const res = await settingsAPI.getMaintenanceStatus();
                    const data = res.data?.data || res.data;
                    toast.success(data?.underMaintenance !== undefined 
                      ? `Maintenance: ${data.underMaintenance ? 'ACTIVE' : 'INACTIVE'}`
                      : 'Status checked successfully');
                  } catch {
                    toast.error('Failed to check maintenance status');
                  }
                }}>Check Status</button>
              </div>
            </div>
          </div>

          {/* Scheduled Maintenance panel */}
          <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3>Scheduled Maintenance</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  Schedule automatic maintenance windows. The scheduler checks every 30 seconds and auto-activates/deactivates maintenance mode.
                </p>
              </div>
              <button
                className="btn-dark btn-sm"
                onClick={() => {
                  resetScheduleForm();
                  setShowScheduleModal(true);
                }}
              >
                + Create Schedule
              </button>
            </div>

            {schedulesLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 0.5rem' }} />
                <p>Loading schedules...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📅</div>
                <p>No scheduled maintenance windows yet.</p>
                <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                  Create a schedule to automatically enable/disable maintenance at specific times.
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.75rem' }}>Title</th>
                      <th style={{ padding: '0.75rem' }}>Type</th>
                      <th style={{ padding: '0.75rem' }}>Window</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                          {s.title}
                          {s.message && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 'normal', marginTop: '0.15rem' }}>
                              {s.message}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {s.isRecurring ? (
                            <span className="status-badge status-pending" style={{ fontSize: '0.7rem' }}>
                              Recurring
                            </span>
                          ) : (
                            <span className="status-badge" style={{ fontSize: '0.7rem', background: 'var(--off-white)' }}>
                              One-time
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                          {s.isRecurring ? (
                            <>
                              <div>{s.recurringDays || 'No days set'}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{s.timeStart} - {s.timeEnd}</div>
                            </>
                          ) : (
                            <>
                              <div>Start: {formatScheduleDate(s.startsAt)}</div>
                              {s.endsAt && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>End: {formatScheduleDate(s.endsAt)}</div>}
                            </>
                          )}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <button
                            onClick={() => handleToggleSchedule(s)}
                            className={`status-badge ${s.isActive && !s.isCompleted ? 'status-active' : 'status-pending'}`}
                            style={{ border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            {s.isCompleted ? 'Completed' : s.isActive ? 'Active' : 'Disabled'}
                          </button>
                        </td>
                        <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn-ghost btn-sm" onClick={() => openEditSchedule(s)}>Edit</button>
                            <button className="btn-ghost btn-sm" style={{ color: 'red' }} onClick={() => handleDeleteSchedule(s.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Schedule Modal */}
      {showScheduleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <div className="detail-panel" style={{
            width: '90%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            margin: 'auto',
          }}>
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{editingSchedule ? 'Edit Schedule' : 'Create Maintenance Schedule'}</h3>
              <button
                onClick={() => { setShowScheduleModal(false); resetScheduleForm(); }}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }}
              >
                &times;
              </button>
            </div>

            <div className="form-grid" style={{ marginTop: '1rem' }}>
              <div className="form-group form-full">
                <label>Title *</label>
                <input
                  value={scheduleForm.title}
                  onChange={e => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                  placeholder="e.g. Weekly Database Maintenance"
                />
              </div>

              <div className="form-group form-full">
                <label>Maintenance Message (optional)</label>
                <textarea
                  rows={2}
                  value={scheduleForm.message}
                  onChange={e => setScheduleForm({ ...scheduleForm, message: e.target.value })}
                  placeholder="We are performing scheduled maintenance..."
                />
              </div>

              <div className="form-group form-full">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={scheduleForm.isRecurring}
                    onChange={e => setScheduleForm({ ...scheduleForm, isRecurring: e.target.checked })}
                  />
                  <strong>Recurring Schedule</strong>
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Recurring schedules run automatically on the selected days/times without manual intervention.
                </span>
              </div>

              {scheduleForm.isRecurring ? (
                <>
                  <div className="form-group form-full">
                    <label>Recurring Days</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                      {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => {
                        const selected = scheduleForm.recurringDays.split(',').map(d => d.trim()).includes(day);
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              const days = scheduleForm.recurringDays.split(',').map(d => d.trim()).filter(Boolean);
                              const updated = selected
                                ? days.filter(d => d !== day)
                                : [...days, day];
                              setScheduleForm({ ...scheduleForm, recurringDays: updated.join(',') });
                            }}
                            style={{
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              border: selected ? '2px solid var(--charcoal)' : '1px solid var(--border)',
                              background: selected ? 'var(--charcoal)' : 'var(--off-white)',
                              color: selected ? 'white' : 'var(--charcoal)',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: selected ? 600 : 400,
                            }}
                          >
                            {day.slice(0, 3)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      value={scheduleForm.timeStart}
                      onChange={e => setScheduleForm({ ...scheduleForm, timeStart: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Time</label>
                    <input
                      type="time"
                      value={scheduleForm.timeEnd}
                      onChange={e => setScheduleForm({ ...scheduleForm, timeEnd: e.target.value })}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Start Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduleForm.startsAt}
                      onChange={e => setScheduleForm({ ...scheduleForm, startsAt: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={scheduleForm.endsAt}
                      onChange={e => setScheduleForm({ ...scheduleForm, endsAt: e.target.value })}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                      Leave empty for indefinite maintenance (turn off manually)
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="form-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button
                className="btn-ghost btn-sm"
                onClick={() => { setShowScheduleModal(false); resetScheduleForm(); }}
              >
                Cancel
              </button>
              <button
                className="btn-dark btn-sm"
                onClick={editingSchedule ? handleUpdateSchedule : handleCreateSchedule}
                disabled={loading || !scheduleForm.title.trim()}
              >
                {loading ? 'Saving...' : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'footer' && (
        <div className="detail-panel">
          <div className="detail-header"><h3>Footer Configuration</h3></div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
            Customize the footer content — brand tagline, newsletter signup, navigation links, and trust badges. Changes apply instantly.
          </p>

          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Brand Tagline</h4>
            <div className="form-grid">
              <div className="form-group form-full">
                <textarea
                  rows={3}
                  value={settings.footerBrandTagline || "India's favorite t-shirt brand. Premium quality, bold designs, and unbeatable comfort — all at prices that make you smile."}
                  onChange={e => setSettings({ ...settings, footerBrandTagline: e.target.value })}
                  placeholder="Your brand tagline shown in the footer..."
                />
              </div>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Newsletter Signup</h4>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={settings.footerNewsletterEnabled !== 'false'} onChange={e => setSettings({ ...settings, footerNewsletterEnabled: e.target.checked ? 'true' : 'false' })} />
                <strong style={{ fontSize: '0.85rem' }}>Show Newsletter</strong>
              </label>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Title</label>
                <input value={settings.footerNewsletterTitle || 'Get 10% Off'} onChange={e => setSettings({ ...settings, footerNewsletterTitle: e.target.value })} placeholder="Get 10% Off" />
              </div>
              <div className="form-group">
                <label>Button Text</label>
                <input value={settings.footerNewsletterBtnText || 'Join'} onChange={e => setSettings({ ...settings, footerNewsletterBtnText: e.target.value })} placeholder="Join" />
              </div>
              <div className="form-group form-full">
                <label>Subtitle</label>
                <input value={settings.footerNewsletterSubtitle || 'Subscribe for early access to new drops & exclusive deals!'} onChange={e => setSettings({ ...settings, footerNewsletterSubtitle: e.target.value })} placeholder="Subscribe for early access..." />
              </div>
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Shop Links</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              JSON array of link objects: <code>{`[{ "label": "Oversized Tees", "to": "/products?category=oversized" }]`}</code>
            </p>
            <div className="form-group form-full">
              <textarea
                rows={6}
                value={settings.footerShopLinks || ''}
                onChange={e => setSettings({ ...settings, footerShopLinks: e.target.value })}
                placeholder='[{ "label": "Oversized Tees", "to": "/products?category=oversized" }, ...]'
                style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Help Links</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              JSON array of link objects. Use <code>"to": ""</code> for non-link items (plain text).
            </p>
            <div className="form-group form-full">
              <textarea
                rows={7}
                value={settings.footerHelpLinks || ''}
                onChange={e => setSettings({ ...settings, footerHelpLinks: e.target.value })}
                placeholder='[{ "label": "Track Order", "to": "/orders" }, ...]'
                style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Bottom Bar Links</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              JSON array of link label objects: <code>{`[{ "label": "Privacy Policy" }]`}</code>
            </p>
            <div className="form-group form-full">
              <textarea
                rows={3}
                value={settings.footerBottomLinks || ''}
                onChange={e => setSettings({ ...settings, footerBottomLinks: e.target.value })}
                placeholder='[{ "label": "Privacy Policy" }, ...]'
                style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
            <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Trust Badges</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
              JSON array of badge objects: <code>{`[{ "title": "Free Shipping", "desc": "On orders over \u20b9499" }]`}</code>
            </p>
            <div className="form-group form-full">
              <textarea
                rows={5}
                value={settings.footerTrustBadges || ''}
                onChange={e => setSettings({ ...settings, footerTrustBadges: e.target.value })}
                placeholder='[{ "title": "Free Shipping", "desc": "On orders over ₹499" }, ...]'
                style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
              {loading ? 'Saving...' : 'Save Footer Settings'}
            </button>
          </div>
        </div>
      )}

      {tab === 'seo' && (
        <div className="detail-panel">
          <div className="detail-header"><h3>SEO Configuration</h3></div>
          <div className="form-grid">
            <div className="form-group form-full"><label>Site Title</label><input value={seo.title} onChange={e => setSeo({ ...seo, title: e.target.value })} placeholder="LUXE — Premium Fashion Store" autoComplete="off" /></div>
            <div className="form-group form-full"><label>Meta Description</label><textarea rows={3} value={seo.description} onChange={e => setSeo({ ...seo, description: e.target.value })} placeholder="Discover curated luxury fashion, accessories, and more..." /></div>
            <div className="form-group form-full"><label>Keywords</label><input value={seo.keywords} onChange={e => setSeo({ ...seo, keywords: e.target.value })} placeholder="luxury, fashion, accessories" autoComplete="off" /></div>
          </div>
          <div className="form-actions"><button className="btn-dark btn-sm" onClick={handleSaveSEO} disabled={loading}>{loading ? 'Saving...' : 'Save SEO Settings'}</button></div>
        </div>
      )}

      {tab === 'system' && (
        <div>
          <div className="detail-panel">
            <div className="detail-header"><h3>System Actions</h3></div>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200, padding: '1.25rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💾</div>
                <strong>Database Backup</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>Create a full backup of the database</p>
                <button className="btn-dark btn-sm" onClick={handleBackup}>Trigger Backup</button>
              </div>
              <div style={{ flex: 1, minWidth: 200, padding: '1.25rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🗑️</div>
                <strong>Clear Cache</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>Flush application cache for fresh data</p>
                <button className="btn-ghost btn-sm" onClick={handleClearCache}>Clear Cache</button>
              </div>
              <div style={{ flex: 1, minWidth: 200, padding: '1.25rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
                <strong>Activity Logs</strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: '0.5rem 0 1rem' }}>View system activity and audit trail</p>
                <button className="btn-ghost btn-sm" onClick={() => toast.success('Logs exported')}>Export Logs</button>
              </div>
            </div>
          </div>

          <div className="detail-panel">
            <div className="detail-header"><h3>System Information</h3></div>
            <div className="detail-grid">
              <div className="detail-item"><span className="label">App Version</span><span className="value">1.0.0</span></div>
              <div className="detail-item"><span className="label">API Endpoint</span><span className="value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'}</span></div>
              <div className="detail-item"><span className="label">Environment</span><span className="value"><span className="status-badge status-pending">Development</span></span></div>
              <div className="detail-item"><span className="label">Last Deploy</span><span className="value">—</span></div>
            </div>
          </div>

          <div className="admin-alert warning">
            <span className="admin-alert-icon">⚠️</span>
            <div className="admin-alert-body">
              <div className="admin-alert-title">Admin Bypass Active</div>
              <div>Authentication bypass is enabled for admin routes. Remember to disable this before deploying to production.</div>
            </div>
          </div>
        </div>
      )}


      {tab === 'chat' && (
        <div>
          {/* ── General Settings ── */}
          <div className="detail-panel">
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3>Chat / Support Configuration</h3>
                <span className={`status-badge ${settings.chatbotEnabled !== 'false' ? 'status-active' : 'status-pending'}`}>
                  {settings.chatbotEnabled !== 'false' ? 'Active' : 'Disabled'}
                </span>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.chatbotEnabled !== 'false'}
                  onChange={e => setSettings({ ...settings, chatbotEnabled: e.target.checked ? 'true' : 'false' })}
                />
                <strong>Enable live chat widget</strong>
              </label>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
              When enabled, a floating chat bubble appears at the bottom-right of the storefront.
              Customers can reach out for support without leaving the page.
            </p>
            <div className="form-grid">
              <div className="form-group">
                <label>Support Team Name</label>
                <input
                  value={settings.chatSupportName || 'Support Team'}
                  onChange={e => setSettings({ ...settings, chatSupportName: e.target.value })}
                  placeholder="Support Team"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Displayed as the sender name in the chat header
                </span>
              </div>
              <div className="form-group">
                <label>Response Time Text</label>
                <input
                  value={settings.chatResponseTime || 'We typically reply in minutes'}
                  onChange={e => setSettings({ ...settings, chatResponseTime: e.target.value })}
                  placeholder="We typically reply in minutes"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Shown below the chat header to set response expectations
                </span>
              </div>
            </div>
          </div>

          {/* ── Messages ── */}
          <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
            <div className="detail-header" style={{ marginBottom: '1rem' }}>
              <h3>Messages & Auto-Reply</h3>
            </div>
            <div className="form-grid">
              <div className="form-group form-full">
                <label>Welcome Message</label>
                <textarea
                  rows={3}
                  value={settings.chatWelcomeMessage || 'Hi there! How can we help you today?'}
                  onChange={e => setSettings({ ...settings, chatWelcomeMessage: e.target.value })}
                  placeholder="Hi there! How can we help you today?"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Shown as the first message when a customer opens the chat
                </span>
              </div>
              <div className="form-group form-full">
                <label>Offline Message</label>
                <textarea
                  rows={3}
                  value={settings.chatOfflineMessage || 'We are currently offline. Please leave a message and we will get back to you during business hours.'}
                  onChange={e => setSettings({ ...settings, chatOfflineMessage: e.target.value })}
                  placeholder="We are currently offline..."
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Shown when a customer opens the chat outside of working hours
                </span>
              </div>
              <div className="form-group form-full">
                <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ margin: 0 }}>Auto-Reply</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={settings.chatAutoReplyEnabled !== 'false'}
                      onChange={e => setSettings({ ...settings, chatAutoReplyEnabled: e.target.checked ? 'true' : 'false' })}
                    />
                    <strong>Enable auto-reply</strong>
                  </label>
                </div>
                {settings.chatAutoReplyEnabled !== 'false' && (
                  <textarea
                    rows={2}
                    value={settings.chatAutoReplyMessage || ''}
                    onChange={e => setSettings({ ...settings, chatAutoReplyMessage: e.target.value })}
                    placeholder="Thank you for your message! One of our team members will get back to you shortly."
                  />
                )}
              </div>
            </div>
          </div>

          {/* ── Working Hours ── */}
          <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3>Working Hours</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  Configure when your support team is available. Outside these hours, the offline message is shown.
                </p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={settings.chatWorkingHoursEnabled !== 'false'}
                  onChange={e => setSettings({ ...settings, chatWorkingHoursEnabled: e.target.checked ? 'true' : 'false' })}
                />
                <strong>Enable Working Hours</strong>
              </label>
            </div>
            {settings.chatWorkingHoursEnabled !== 'false' && (
              <div className="form-grid">
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    value={settings.chatWorkingHoursStart || '09:00'}
                    onChange={e => setSettings({ ...settings, chatWorkingHoursStart: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    value={settings.chatWorkingHoursEnd || '18:00'}
                    onChange={e => setSettings({ ...settings, chatWorkingHoursEnd: e.target.value })}
                  />
                </div>
                <div className="form-group form-full">
                  <label>Working Days</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => {
                      const selected = (settings.chatWorkingDays || 'Monday,Tuesday,Wednesday,Thursday,Friday').split(',').map(d => d.trim()).includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const days = (settings.chatWorkingDays || 'Monday,Tuesday,Wednesday,Thursday,Friday').split(',').map(d => d.trim()).filter(Boolean);
                            const updated = selected ? days.filter(d => d !== day) : [...days, day];
                            setSettings({ ...settings, chatWorkingDays: updated.join(',') });
                          }}
                          style={{
                            padding: '0.35rem 0.65rem',
                            borderRadius: '6px',
                            border: selected ? '2px solid var(--charcoal)' : '1px solid var(--border)',
                            background: selected ? 'var(--charcoal)' : 'var(--off-white)',
                            color: selected ? 'white' : 'var(--charcoal)',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: selected ? 600 : 400,
                          }}
                        >
                          {day.slice(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Chat Preview ── */}
          <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
            <div className="detail-header" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3>Chat Preview</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'italic' }}>
                Click the chat bubble to see a live preview with current settings
              </span>
            </div>
            {/* Simulated storefront viewport */}
            <div style={{
              background: '#f0f0f0',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border)',
              padding: '1.5rem',
              position: 'relative',
              minHeight: '380px',
              overflow: 'hidden',
            }}>
              {/* Faux storefront content */}
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', marginBottom: '0.5rem', opacity: 0.5 }}>Storefront</div>
                  <div style={{ fontSize: '14px', color: '#aaa', fontWeight: 500 }}>Storefront Preview</div>
                </div>
              </div>
              {/* Floating chat bubble */}
              <button
                onClick={() => setPreviewOpen(!previewOpen)}
                style={{
                  position: 'absolute',
                  bottom: '24px',
                  right: '24px',
                  zIndex: 10,
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1a1a1a, #333)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
                  transition: 'transform 0.2s ease, boxShadow 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.25)'; }}
                aria-label="Toggle chat preview"
              >
                {previewOpen ? <X size={20} color="white" /> : <MessageCircle size={20} color="white" />}
              </button>
              {/* Chat window */}
              {previewOpen && (
                <div style={{
                  position: 'absolute',
                  bottom: '80px',
                  right: '24px',
                  zIndex: 11,
                  width: '320px',
                  maxWidth: 'calc(100% - 48px)',
                  maxHeight: '360px',
                  background: '#ffffff',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}>
                  {/* Header */}
                  <div style={{
                    background: 'linear-gradient(135deg, #1a1a1a, #2d2d2d)',
                    color: 'white',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexShrink: 0,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: settings.chatWorkingHoursEnabled !== 'false' ? '#22c55e' : '#f59e0b',
                        boxShadow: settings.chatWorkingHoursEnabled !== 'false' ? '0 0 8px rgba(34,197,94,0.5)' : '0 0 8px rgba(245,158,11,0.5)',
                      }} />
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>
                          {settings.chatSupportName || 'Support Team'}
                        </div>
                        <div style={{ fontSize: '10px', opacity: 0.7 }}>
                          {settings.chatWorkingHoursEnabled !== 'false' ? 'Online' : 'Away'} &middot;{' '}
                          {settings.chatResponseTime || 'We reply in minutes'}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setPreviewOpen(false)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        padding: '2px',
                        display: 'flex',
                        borderRadius: '4px',
                      }}
                      aria-label="Close chat preview"
                    >
                      <Minus size={16} />
                    </button>
                  </div>
                  {/* Messages Area */}
                  <div style={{
                    flex: 1,
                    padding: '16px',
                    background: '#f8f9fa',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    minHeight: '160px',
                    overflowY: 'auto',
                  }}>
                    {/* Welcome message */}
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div style={{
                        maxWidth: '85%',
                        padding: '10px 14px',
                        borderRadius: '4px 16px 16px 16px',
                        background: '#e8e8e8',
                        color: '#1a1a1a',
                        fontSize: '13px',
                        lineHeight: 1.4,
                      }}>
                        <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '3px', color: '#555' }}>
                          {settings.chatSupportName || 'Support Team'}
                        </div>
                        <div>{settings.chatWelcomeMessage || 'Hi there! How can we help you today?'}</div>
                        <div style={{ fontSize: '9px', opacity: 0.5, marginTop: '4px', textAlign: 'right' }}>
                          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    {/* Auto-reply demo */}
                    {settings.chatAutoReplyEnabled !== 'false' && settings.chatAutoReplyMessage && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <div style={{
                            maxWidth: '80%',
                            padding: '8px 14px',
                            borderRadius: '16px 4px 16px 16px',
                            background: '#1a1a1a',
                            color: 'white',
                            fontSize: '13px',
                            lineHeight: 1.4,
                          }}>
                            <div>I need help with my order #1234</div>
                            <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>Just now</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                          <div style={{
                            maxWidth: '85%',
                            padding: '10px 14px',
                            borderRadius: '4px 16px 16px 16px',
                            background: '#e8e8e8',
                            color: '#1a1a1a',
                            fontSize: '13px',
                            lineHeight: 1.4,
                          }}>
                            <div style={{ fontWeight: 600, fontSize: '12px', marginBottom: '2px', color: '#888' }}>
                              Auto-Reply
                            </div>
                            <div>{settings.chatAutoReplyMessage}</div>
                            <div style={{ fontSize: '9px', opacity: 0.5, marginTop: '4px', textAlign: 'right' }}>Just now</div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  {/* Input Area */}
                  <div style={{
                    borderTop: '1px solid #e8e8e8',
                    padding: '10px 12px',
                    background: 'white',
                    display: 'flex',
                    gap: '8px',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{
                      flex: 1,
                      border: '1px solid #ddd',
                      borderRadius: '10px',
                      padding: '8px 12px',
                      fontSize: '13px',
                      color: '#999',
                      fontFamily: 'inherit',
                      lineHeight: 1.4,
                    }}>
                      Type your message...
                    </div>
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      background: '#e8e8e8',
                      color: '#999',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <Send size={14} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="form-actions" style={{ marginTop: '1rem' }}>
            <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
              {loading ? 'Saving...' : 'Save Chat Settings'}
            </button>
          </div>
        </div>
      )}
      {showGatewayModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <div className="detail-panel" style={{
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            margin: 'auto',
          }}>
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{editingGateway !== null ? 'Edit Custom Gateway' : 'Add Custom Gateway'}</h3>
              <button 
                onClick={() => setShowGatewayModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }}
              >
                &times;
              </button>
            </div>

            <div className="form-grid" style={{ marginTop: '1rem' }}>
              <div className="form-group">
                <label>Gateway ID / Code (Uppercase, no spaces) *</label>
                <input 
                  value={gatewayForm.id} 
                  onChange={e => setGatewayForm({ ...gatewayForm, id: e.target.value.toUpperCase().replace(/\s+/g, '') })} 
                  placeholder="e.g. PAYSTACK"
                  disabled={editingGateway !== null}
                />
              </div>

              <div className="form-group">
                <label>Display Name *</label>
                <input 
                  value={gatewayForm.name} 
                  onChange={e => setGatewayForm({ ...gatewayForm, name: e.target.value })} 
                  placeholder="e.g. Paystack Card Checkout"
                />
              </div>

              <div className="form-group form-full">
                <label>Description *</label>
                <textarea 
                  rows={2}
                  value={gatewayForm.description} 
                  onChange={e => setGatewayForm({ ...gatewayForm, description: e.target.value })} 
                  placeholder="e.g. Pay securely using Visa, Mastercard, or Bank Account."
                />
              </div>

              <div className="form-group form-full">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={gatewayForm.enabled} 
                    onChange={e => setGatewayForm({ ...gatewayForm, enabled: e.target.checked })}
                  />
                  <strong>Enable Gateway immediately</strong>
                </label>
              </div>

              <div className="form-group form-full">
                <label>Payment URL (optional)</label>
                <input 
                  value={gatewayForm.paymentUrl || ''} 
                  onChange={e => setGatewayForm({ ...gatewayForm, paymentUrl: e.target.value })} 
                  placeholder="https://pay.example.com/checkout?order_id={orderId}&amount={amount}&callback={callbackUrl}"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Template URL for redirecting users to this gateway. Use {'{orderId}'}, {'{amount}'}, {'{callbackUrl}'} as placeholders. Credential keys (e.g. {'{apiKey}'}) are also replaced automatically.
                </span>
              </div>

              {/* Dynamic Key-Value Custom Configuration Fields */}
              <div className="form-group form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <label style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Gateway Configuration Credentials</label>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '1rem' }}>
                  Add key credentials (API keys, secrets, merchant IDs) that this gateway requires.
                </p>

                {gatewayForm.fields?.map((f, fIdx) => (
                  <div key={fIdx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block' }}>Label / Key</span>
                      <strong style={{ fontSize: '0.85rem' }}>{f.label} ({f.key})</strong>
                    </div>
                    <div style={{ flex: 2 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block' }}>Value</span>
                      <input 
                        type={f.type || 'text'}
                        value={f.value}
                        onChange={e => {
                          const updatedFields = [...gatewayForm.fields];
                          updatedFields[fIdx].value = e.target.value;
                          setGatewayForm({ ...gatewayForm, fields: updatedFields });
                        }}
                        style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                      />
                    </div>
                    <button
                      className="btn-ghost btn-sm"
                      style={{ color: 'red', marginTop: '1.2rem' }}
                      onClick={() => {
                        const updatedFields = gatewayForm.fields.filter((_, i) => i !== fIdx);
                        setGatewayForm({ ...gatewayForm, fields: updatedFields });
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}

                {/* Add new field form helper */}
                <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--off-white)', padding: '0.75rem', borderRadius: '8px', marginTop: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '100px' }}>
                    <label style={{ fontSize: '0.75rem' }}>Key Code (e.g. publicKey)</label>
                    <input 
                      value={newField.key} 
                      onChange={e => setNewField({ ...newField, key: e.target.value.replace(/\s+/g, '') })} 
                      placeholder="apiKey"
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: '100px' }}>
                    <label style={{ fontSize: '0.75rem' }}>Field Label</label>
                    <input 
                      value={newField.label} 
                      onChange={e => setNewField({ ...newField, label: e.target.value })} 
                      placeholder="API Key"
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div style={{ width: '90px' }}>
                    <label style={{ fontSize: '0.75rem' }}>Type</label>
                    <select 
                      value={newField.type} 
                      onChange={e => setNewField({ ...newField, type: e.target.value })}
                      style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', width: '100%' }}
                    >
                      <option value="text">Text</option>
                      <option value="password">Secret</option>
                    </select>
                  </div>
                  <button
                    className="btn-dark btn-sm"
                    type="button"
                    onClick={() => {
                      if (!newField.key || !newField.label) {
                        toast.error('Field key and label are required');
                        return;
                      }
                      const fields = gatewayForm.fields || [];
                      if (fields.some(f => f.key === newField.key)) {
                        toast.error('Field key already exists');
                        return;
                      }
                      setGatewayForm({
                        ...gatewayForm,
                        fields: [...fields, { ...newField, value: '' }]
                      });
                      setNewField({ key: '', label: '', value: '', type: 'text' });
                    }}
                  >
                    + Add Field
                  </button>
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button 
                className="btn-ghost btn-sm"
                onClick={() => setShowGatewayModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-dark btn-sm"
                onClick={() => {
                  if (!gatewayForm.id || !gatewayForm.name || !gatewayForm.description) {
                    toast.error('Please fill all required gateway details');
                    return;
                  }
                  
                  const updated = [...dynamicGateways];
                  if (editingGateway !== null) {
                    updated[editingGateway] = gatewayForm;
                    toast.success('Gateway updated. Click Save on the main settings page to persist.');
                  } else {
                    if (dynamicGateways.some(gw => gw.id === gatewayForm.id)) {
                      toast.error('Gateway with this ID already exists');
                      return;
                    }
                    updated.push(gatewayForm);
                    toast.success('Gateway added. Click Save on the main settings page to persist.');
                  }
                  setDynamicGateways(updated);
                  setShowGatewayModal(false);
                }}
              >
                {editingGateway !== null ? 'Update Gateway' : 'Add Gateway'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'sms' && (
        <div className="detail-panel">
          <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <h3>SMS & Twilio Configuration</h3>
              <span className={`status-badge ${settings.smsEnabled === 'true' ? 'status-active' : 'status-pending'}`}>
                {settings.smsEnabled === 'true' ? 'Active' : 'Disabled'}
              </span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.smsEnabled === 'true'} onChange={e => setSettings({ ...settings, smsEnabled: e.target.checked ? 'true' : 'false' })} />
              <strong>Enable SMS</strong>
            </label>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1.5rem' }}>
            Configure Twilio credentials to enable SMS notifications for orders, shipments, and customer support.
          </p>
          <div className="form-grid">
            <div className="form-group form-full">
              <label>Twilio Account SID</label>
              <input 
                type="password"
                value={settings.twilioAccountSid || ''} 
                onChange={e => setSettings({ ...settings, twilioAccountSid: e.target.value })} 
                placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                autoComplete="off"
                disabled={settings.smsEnabled !== 'true'}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Found in your Twilio console</span>
            </div>
            <div className="form-group form-full">
              <label>Twilio Auth Token</label>
              <input 
                type="password"
                value={settings.twilioAuthToken || ''} 
                onChange={e => setSettings({ ...settings, twilioAuthToken: e.target.value })} 
                placeholder="••••••••••••••••••••••••••••••••"
                autoComplete="off"
                disabled={settings.smsEnabled !== 'true'}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Keep this secret and secure</span>
            </div>
            <div className="form-group form-full">
              <label>Twilio Phone Number</label>
              <input 
                value={settings.twilioPhoneNumber || ''} 
                onChange={e => setSettings({ ...settings, twilioPhoneNumber: e.target.value })} 
                placeholder="+1234567890"
                autoComplete="tel"
                disabled={settings.smsEnabled !== 'true'}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>The phone number assigned to your Twilio account</span>
            </div>
          </div>
          <div className="form-actions"><button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save SMS Settings'}</button></div>
        </div>
      )}

      {tab === 'integrations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Social Login */}
          <div className="detail-panel">
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <h3>Social Login</h3>
                <span className={`status-badge ${(settings.googleLoginEnabled === 'true' || settings.facebookLoginEnabled === 'true') ? 'status-active' : 'status-pending'}`}>
                  {(settings.googleLoginEnabled === 'true' || settings.facebookLoginEnabled === 'true') ? 'Configured' : 'Not Setup'}
                </span>
              </div>
            </div>

            {/* Google Login */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Google OAuth</h4>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={settings.googleLoginEnabled === 'true'} onChange={e => setSettings({ ...settings, googleLoginEnabled: e.target.checked ? 'true' : 'false' })} />
                  <strong style={{ fontSize: '0.85rem' }}>Enable Google</strong>
                </label>
              </div>
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Google Client ID</label>
                  <input 
                    value={settings.googleClientId || ''} 
                    onChange={e => setSettings({ ...settings, googleClientId: e.target.value })} 
                    placeholder="xxxxxxxx.apps.googleusercontent.com"
                    disabled={settings.googleLoginEnabled !== 'true'}
                  />
                </div>
                <div className="form-group form-full">
                  <label>Google Client Secret</label>
                  <input 
                    type="password"
                    value={settings.googleClientSecret || ''} 
                    onChange={e => setSettings({ ...settings, googleClientSecret: e.target.value })} 
                    placeholder="••••••••••••••••••••••••"
                    autoComplete="off"
                    disabled={settings.googleLoginEnabled !== 'true'}
                  />
                </div>
              </div>
            </div>

            {/* Facebook Login */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.95rem', margin: 0 }}>Facebook OAuth</h4>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={settings.facebookLoginEnabled === 'true'} onChange={e => setSettings({ ...settings, facebookLoginEnabled: e.target.checked ? 'true' : 'false' })} />
                  <strong style={{ fontSize: '0.85rem' }}>Enable Facebook</strong>
                </label>
              </div>
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Facebook App ID</label>
                  <input 
                    value={settings.facebookAppId || ''} 
                    onChange={e => setSettings({ ...settings, facebookAppId: e.target.value })} 
                    placeholder="1234567890"
                    disabled={settings.facebookLoginEnabled !== 'true'}
                  />
                </div>
                <div className="form-group form-full">
                  <label>Facebook App Secret</label>
                  <input 
                    type="password"
                    value={settings.facebookAppSecret || ''} 
                    onChange={e => setSettings({ ...settings, facebookAppSecret: e.target.value })} 
                    placeholder="••••••••••••••••••••••••"
                    autoComplete="off"
                    disabled={settings.facebookLoginEnabled !== 'true'}
                  />
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: '1rem' }}><button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Social Login'}</button></div>
          </div>

          {/* Ad Platforms */}
          <div className="detail-panel">
            <div className="detail-header" style={{ marginBottom: '1rem' }}>
              <h3>Ad Platform Credentials</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                Configure credentials for Meta (Facebook/Instagram), WhatsApp, and Google Ads
              </p>
            </div>

            {/* Meta (Facebook & Instagram) */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Meta (Facebook/Instagram Ads)</h4>
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Meta Access Token</label>
                  <input 
                    type="password"
                    value={settings.metaAccessToken || ''} 
                    onChange={e => setSettings({ ...settings, metaAccessToken: e.target.value })} 
                    placeholder="EAABsbCS1iHgBAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label>Meta Ad Account ID</label>
                  <input 
                    value={settings.metaAdAccountId || ''} 
                    onChange={e => setSettings({ ...settings, metaAdAccountId: e.target.value })} 
                    placeholder="act_1234567890"
                  />
                </div>
                <div className="form-group">
                  <label>Meta Page ID</label>
                  <input 
                    value={settings.metaPageId || ''} 
                    onChange={e => setSettings({ ...settings, metaPageId: e.target.value })} 
                    placeholder="1234567890"
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>WhatsApp Business</h4>
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>WhatsApp Access Token</label>
                  <input 
                    type="password"
                    value={settings.whatsappAccessToken || ''} 
                    onChange={e => setSettings({ ...settings, whatsappAccessToken: e.target.value })} 
                    placeholder="EAABsbCS1iHgBAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    autoComplete="off"
                  />
                </div>
                <div className="form-group">
                  <label>WhatsApp Phone Number ID</label>
                  <input 
                    value={settings.whatsappPhoneNumberId || ''} 
                    onChange={e => setSettings({ ...settings, whatsappPhoneNumberId: e.target.value })} 
                    placeholder="102123456789012"
                  />
                </div>
                <div className="form-group">
                  <label>WhatsApp Business Account ID</label>
                  <input 
                    value={settings.whatsappBusinessAccountId || ''} 
                    onChange={e => setSettings({ ...settings, whatsappBusinessAccountId: e.target.value })} 
                    placeholder="1234567890"
                  />
                </div>
              </div>
            </div>

            {/* Google Ads */}
            <div>
              <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>Google Ads</h4>
              <div className="form-grid">
                <div className="form-group form-full">
                  <label>Google Ads Client ID</label>
                  <input 
                    value={settings.googleAdsClientId || ''} 
                    onChange={e => setSettings({ ...settings, googleAdsClientId: e.target.value })} 
                    placeholder="1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com"
                  />
                </div>
                <div className="form-group form-full">
                  <label>Google Ads Client Secret</label>
                  <input 
                    type="password"
                    value={settings.googleAdsClientSecret || ''} 
                    onChange={e => setSettings({ ...settings, googleAdsClientSecret: e.target.value })} 
                    placeholder="••••••••••••••••••••••••"
                    autoComplete="off"
                  />
                </div>
                <div className="form-group form-full">
                  <label>Google Ads Developer Token</label>
                  <input 
                    value={settings.googleAdsDeveloperToken || ''} 
                    onChange={e => setSettings({ ...settings, googleAdsDeveloperToken: e.target.value })} 
                    placeholder="abcd1234efgh5678"
                  />
                </div>
                <div className="form-group form-full">
                  <label>Google Ads Refresh Token</label>
                  <input 
                    type="password"
                    value={settings.googleAdsRefreshToken || ''} 
                    onChange={e => setSettings({ ...settings, googleAdsRefreshToken: e.target.value })} 
                    placeholder="••••••••••••••••••••••••"
                    autoComplete="off"
                  />
                </div>
                <div className="form-group form-full">
                  <label>Google Ads Customer Account ID</label>
                  <input 
                    value={settings.googleAdsCustomerAccountId || ''} 
                    onChange={e => setSettings({ ...settings, googleAdsCustomerAccountId: e.target.value })} 
                    placeholder="1234567890"
                  />
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: '1rem' }}><button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Ad Platform Settings'}</button></div>
          </div>

          {/* AI Provider Configuration - Provider Agnostic */}
          <div className="detail-panel">
            <div className="detail-header" style={{ marginBottom: '1rem' }}>
              <h3>AI Provider Configuration</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                Configure any OpenAI-compatible AI provider. Simply enter the API key, base URL, and model names. Works with OpenAI, Groq, Together AI, DeepSeek, OpenRouter, and more.
              </p>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>AI Provider</label>
                <select 
                  value={settings.aiProvider || 'openai'} 
                  onChange={e => {
                    const provider = e.target.value;
                    const presets = {
                      openai: { url: 'https://api.openai.com/v1', chatModel: 'gpt-4o', imageModel: 'dall-e-3' },
                      groq: { url: 'https://api.groq.com/openai/v1', chatModel: 'llama-3.3-70b-versatile', imageModel: '' },
                      together: { url: 'https://api.together.xyz/v1', chatModel: 'mistralai/Mixtral-8x22B-Instruct-v0.1', imageModel: 'stabilityai/stable-diffusion-xl-base-1.0' },
                      deepseek: { url: 'https://api.deepseek.com/v1', chatModel: 'deepseek-chat', imageModel: '' },
                      openrouter: { url: 'https://openrouter.ai/api/v1', chatModel: 'openai/gpt-4o', imageModel: '' },
                      anthropic: { url: 'https://api.anthropic.com/v1', chatModel: 'claude-3-5-sonnet-20241022', imageModel: '' },
                    };
                    const preset = presets[provider];
                    if (preset) {
                      setSettings(prev => ({
                        ...prev,
                        aiProvider: provider,
                        aiProviderUrl: preset.url,
                        aiChatModel: preset.chatModel,
                        aiImageModel: preset.imageModel || prev.aiImageModel,
                        aiProviderApiKey: prev.aiProviderApiKey || prev.openaiApiKey || '',
                      }));
                    } else {
                      setSettings(prev => ({ ...prev, aiProvider: provider }));
                    }
                  }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="groq">Groq</option>
                  <option value="together">Together AI</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="custom">Custom Provider</option>
                </select>
              </div>
              <div className="form-group">
                <label>API Key</label>
                <input 
                  type="password"
                  value={settings.aiProviderApiKey || settings.openaiApiKey || ''} 
                  onChange={e => setSettings({ ...settings, aiProviderApiKey: e.target.value })} 
                  placeholder="sk-... or your provider's API key"
                  autoComplete="off"
                />
              </div>
              <div className="form-group form-full">
                <label>Base URL</label>
                <input 
                  value={settings.aiProviderUrl || 'https://api.openai.com/v1'} 
                  onChange={e => setSettings({ ...settings, aiProviderUrl: e.target.value })} 
                  placeholder="https://api.openai.com/v1"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  The API endpoint URL for your chosen provider. Must be an OpenAI-compatible endpoint.
                </span>
              </div>
              <div className="form-group">
                <label>Chat Model</label>
                <input 
                  value={settings.aiChatModel || 'gpt-4o'} 
                  onChange={e => setSettings({ ...settings, aiChatModel: e.target.value })} 
                  placeholder="gpt-4o"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Model used for text generation (descriptions, chat, ads)
                </span>
              </div>
              <div className="form-group">
                <label>Image Model</label>
                <input 
                  value={settings.aiImageModel || 'dall-e-3'} 
                  onChange={e => setSettings({ ...settings, aiImageModel: e.target.value })} 
                  placeholder="dall-e-3"
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Model used for image generation (leave empty if not supported)
                </span>
              </div>
            </div>
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: 'var(--off-white)', borderRadius: 'var(--radius-lg)', fontSize: '0.78rem', color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--charcoal)' }}>Supported Providers & Base URLs:</strong>
              <div style={{ marginTop: '0.35rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', fontFamily: 'monospace', fontSize: '0.72rem' }}>
                <span>• OpenAI: <code>https://api.openai.com/v1</code></span>
                <span>• Groq: <code>https://api.groq.com/openai/v1</code></span>
                <span>• Together AI: <code>https://api.together.xyz/v1</code></span>
                <span>• DeepSeek: <code>https://api.deepseek.com/v1</code></span>
                <span>• OpenRouter: <code>https://openrouter.ai/api/v1</code></span>
                <span>• Anthropic: <code>https://api.anthropic.com/v1</code></span>
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn-ghost btn-sm" 
                onClick={handleTestAIConnection} 
                disabled={testingAI}
              >
                {testingAI ? 'Testing...' : '🔌 Test Connection'}
              </button>
              <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
                {loading ? 'Saving...' : 'Save AI Provider Settings'}
              </button>
            </div>
          </div>

          {/* Backup Schedule */}
          <div className="detail-panel">
            <div className="detail-header" style={{ marginBottom: '1rem' }}>
              <h3>Backup Schedule</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                Configure automatic database backups
              </p>
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label>Backup Frequency</label>
                <select value={settings.backupFrequency || 'daily'} onChange={e => setSettings({ ...settings, backupFrequency: e.target.value })}>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="form-group">
                <label>Backup Time</label>
                <input 
                  type="time"
                  value={settings.backupTime || '02:00'} 
                  onChange={e => setSettings({ ...settings, backupTime: e.target.value })} 
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Time in UTC when backups should run</span>
              </div>
              <div className="form-group">
                <label>Backup Day of Week</label>
                <select value={settings.backupDayOfWeek || '0'} onChange={e => setSettings({ ...settings, backupDayOfWeek: e.target.value })}>
                  <option value="0">Sunday</option>
                  <option value="1">Monday</option>
                  <option value="2">Tuesday</option>
                  <option value="3">Wednesday</option>
                  <option value="4">Thursday</option>
                  <option value="5">Friday</option>
                  <option value="6">Saturday</option>
                </select>
              </div>
              <div className="form-group">
                <label>Last Backup Run</label>
                <input 
                  value={settings.backupLastRun || 'Never'} 
                  disabled
                  placeholder="Never"
                />
              </div>
            </div>
            <div className="form-actions"><button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Backup Settings'}</button></div>

            {/* Backup History */}
            <div style={{ marginTop: '2rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
              <div className="detail-header" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3>Backup History</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                    Previous backups and their status
                  </p>
                </div>
                <button className="btn-dark btn-sm" onClick={handleBackup} disabled={loading}>
                  + Create Backup Now
                </button>
              </div>

              {backupsLoading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                  <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 0.5rem' }} />
                  <p>Loading backup history...</p>
                </div>
              ) : backups.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💾</div>
                  <p>No backups yet.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                    Backups will appear here once they are created.
                  </p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: '0.75rem' }}>Filename</th>
                        <th style={{ padding: '0.75rem' }}>Created</th>
                        <th style={{ padding: '0.75rem' }}>Size</th>
                        <th style={{ padding: '0.75rem' }}>Status</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backups.map((backup) => (
                        <tr key={backup.id} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <code style={{ background: 'var(--off-white)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                              {backup.filename}
                            </code>
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                            {new Date(backup.timestamp).toLocaleString()}
                          </td>
                          <td style={{ padding: '0.75rem', fontSize: '0.85rem', fontWeight: 500 }}>
                            {backup.size}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <span className={`status-badge ${backup.status === 'success' ? 'status-active' : 'status-pending'}`} style={{ fontSize: '0.75rem' }}>
                              {backup.status === 'success' ? '✓ Success' : 'Pending'}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                              <button className="btn-ghost btn-sm" onClick={() => toast.success('Downloading backup: ' + backup.filename)}>
                                Download
                              </button>
                              <button className="btn-ghost btn-sm" style={{ color: 'red' }} onClick={() => {
                                if (window.confirm('Are you sure you want to delete this backup?')) {
                                  setBackups(backups.filter(b => b.id !== backup.id));
                                  toast.success('Backup deleted');
                                }
                              }}>
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


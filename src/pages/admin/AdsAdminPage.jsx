import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import {
  LayoutDashboard, BarChart3, Building2, Sparkles, PieChart, GitCompare, Activity,
  AlertCircle, Plus, RefreshCw, CheckSquare, Users, Images, GitBranch, FileSpreadsheet, Zap
} from 'lucide-react';
import { adsAPI } from '../../api/ads';
import { adminAPI } from '../../api/admin';
import toast from '../../utils/toast';

// Hooks
import useAdCampaigns from '../../hooks/useAdCampaigns';

// Tab Components
import CampaignListTab from './ads/CampaignListTab';
import BrandTab from './ads/BrandTab';
import AiToolsTab from './ads/AiToolsTab';
import AnalyticsTab from './ads/AnalyticsTab';
import CompareTab from './ads/CompareTab';
import TrackingTab from './ads/TrackingTab';
import AutomationTab from './ads/AutomationTab';
import AudienceTab from './ads/AudienceTab';
import CreativeLibraryTab from './ads/CreativeLibraryTab';
import ExperimentsTab from './ads/ExperimentsTab';
import ReportsTab from './ads/ReportsTab';
import CampaignDetailPanel from './ads/CampaignDetailPanel';
const CampaignModal = lazy(() => import('./ads/CampaignModal'));

// New Feature Components
import CampaignCalendar from '../../components/admin/ads/CampaignCalendar';
import AiWeeklySummaryCard from '../../components/admin/ads/AiWeeklySummaryCard';
import BudgetOptimizer from '../../components/admin/ads/BudgetOptimizer';
import AdTemplateGallery from '../../components/admin/ads/AdTemplateGallery';
import PerformanceAlerts from '../../components/admin/ads/PerformanceAlerts';
import BulkActions from '../../components/admin/ads/BulkActions';

const TABS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'all', label: 'All Campaigns', icon: BarChart3 },
  { id: 'brand', label: 'Brand', icon: Building2 },
  { id: 'ai-tools', label: 'AI Tools', icon: Sparkles },
  { id: 'analytics', label: 'Analytics', icon: PieChart },
  { id: 'compare', label: 'Compare', icon: GitCompare },
  { id: 'tracking', label: 'Tracking', icon: Activity },
  { id: 'automation', label: 'Automation', icon: Zap },
  { id: 'audiences', label: 'Audiences', icon: Users },
  { id: 'creatives', label: 'Creative Library', icon: Images },
  { id: 'experiments', label: 'Experiments', icon: GitBranch },
  { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
];

export default function AdsAdminPage() {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');

  // Campaign state from hook
  const {
    campaigns, loading, stats, platformFilter, setPlatformFilter,
    pagination, staleCampaigns, syncingAll, setSyncingAll,
    showModal, setShowModal, editing, form, setForm, modalLoading,
    loadCampaigns, loadStats, openNew, openEdit, handleSave, handleDelete,
    openDetail, handleBulkStatusChange, handleDuplicate,
    campaignDetail, detailLoading, closeDetail,
  } = useAdCampaigns(search);

  // Lazy modal — mount only after first open so its chunk loads on demand
  const [campaignEverOpened, setCampaignEverOpened] = useState(false);
  useEffect(() => { if (showModal) setCampaignEverOpened(true); }, [showModal]);

  // Brand & AI state
  const [brandSettings, setBrandSettings] = useState(null);
  const [brandCampaigns, setBrandCampaigns] = useState([]);
  const [, setAiTone] = useState('professional');
  const [, setAiPlatform] = useState('FACEBOOK');
  const [, setAiGeneratedCopy] = useState(null);
  const [, setAiResultTab] = useState('copy');

  const loadBrandSettings = useCallback(async () => {
    try {
      const r = await adminAPI.getSettings();
      setBrandSettings(r.data?.data || r.data || {});
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (tab === 'brand') {
      loadBrandSettings();
      adsAPI.getCampaigns({ page: 1, limit: 10, platform: '' }).then(r => {
        const data = r.data?.data || r.data || [];
        setBrandCampaigns(Array.isArray(data) ? data : []);
      }).catch(() => {});
    }
  }, [tab, loadBrandSettings]);

  // Drag-and-drop date update — lets child handle feedback via banner
  const handleUpdateCampaignDate = async (campaignId, newStartDate, newEndDate) => {
    try {
      await adsAPI.updateCampaign(campaignId, {
        startDate: newStartDate,
        endDate: newEndDate,
      });
    } finally {
      loadCampaigns(pagination.page, platformFilter);
      loadStats();
    }
  };

  // Bulk actions toggle
  const [showBulk, setShowBulk] = useState(false);

  // Apply template from gallery to form
  const applyTemplate = (template) => {
    setForm({
      name: template.name,
      platform: template.platform,
      objective: template.objective,
      budget: '5000', startDate: '', endDate: '',
      creativeUrl: '', creativeType: 'IMAGE', landingUrl: '',
      notes: template.notes || '',
    });
    setAiTone(template.tone || 'professional');
    setAiPlatform(template.platform || 'INSTAGRAM');
    setShowModal(true);
  };

  // Overview tab: combined dashboard
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-brand-black via-gray-900 to-gray-800 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <LayoutDashboard size={28} />
          <h3 className="text-xl font-bold font-display">Ad Dashboard</h3>
        </div>
        <p className="text-gray-400 text-sm">
          {campaigns.length} campaigns · {stats?.activeCampaigns || 0} active · ₹{((stats?.totalBudget || 0) / 1000).toFixed(0)}k budget
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white text-black rounded-xl text-sm font-bold hover:bg-gray-100 transition-all" onClick={openNew}>
            <Plus size={16} /> New Campaign
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold transition-all border border-white/20" onClick={() => setTab('ai-tools')}>
            <Sparkles size={14} /> AI Generate
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold transition-all border border-white/20" onClick={() => setTab('analytics')}>
            <PieChart size={14} /> Analytics
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: 'Campaigns', value: stats.totalCampaigns || 0, color: '' },
            { label: 'Active', value: stats.activeCampaigns || 0, color: 'text-green-600' },
            { label: 'Budget', value: '₹' + ((stats.totalBudget || 0) / 1000).toFixed(1) + 'k', color: '' },
            { label: 'Spent', value: '₹' + ((stats.totalSpent || 0) / 1000).toFixed(1) + 'k', color: 'text-orange-600' },
            { label: 'Impressions', value: (stats.totalImpressions || 0).toLocaleString(), color: 'text-blue-600' },
            { label: 'Clicks', value: (stats.totalClicks || 0).toLocaleString(), color: 'text-purple-600' },
            { label: 'CTR', value: (stats.ctr || 0) + '%', color: 'text-green-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white p-3 rounded-xl border border-border shadow-soft text-center">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{s.label}</div>
              <div className={'text-lg font-bold font-display ' + s.color}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* AI Weekly Performance Summary */}
      <AiWeeklySummaryCard adsAPI={adsAPI} />

      {/* Stale Sync Banner */}
      {staleCampaigns.length > 0 && (
        <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle size={18} className="text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-orange-800">
                {staleCampaigns.length} {staleCampaigns.length === 1 ? 'campaign' : 'campaigns'} haven't been synced in over 24h
              </p>
              <p className="text-xs text-orange-600 mt-0.5">Pull fresh performance stats from the ad platforms.</p>
            </div>
          </div>
          <button onClick={async () => {
            setSyncingAll(true);
            let synced = 0, failed = 0;
            for (const c of staleCampaigns) {
              try {
                if (c.platform === 'GOOGLE') await adsAPI.syncGoogleStats(c.id);
                else await adsAPI.syncMetaStats(c.id);
                synced++;
              } catch { failed++; }
            }
            toast.success('Synced ' + synced + (failed > 0 ? ', ' + failed + ' failed' : ''));
            loadCampaigns(pagination.page, platformFilter);
            loadStats();
            setSyncingAll(false);
          }} disabled={syncingAll}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors whitespace-nowrap disabled:opacity-50">
            {syncingAll ? <><div className="spinner w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> Syncing...</> : <><RefreshCw size={15} /> Sync All</>}
          </button>
        </div>
      )}

      {/* Calendar + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CampaignCalendar campaigns={campaigns} openNew={openNew} openEdit={openEdit} onUpdateDate={handleUpdateCampaignDate} />
        </div>
        <div>
          <div className="bg-white rounded-2xl border border-border shadow-soft p-4">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><AlertCircle size={14} className="text-red-500" /> Alerts</h4>
            <PerformanceAlerts campaigns={campaigns} stats={stats} onSync={loadStats} onEdit={openEdit} />
          </div>
        </div>
      </div>

      {/* Budget Optimizer */}
      <BudgetOptimizer campaigns={campaigns} stats={stats} />

      {/* Template Gallery */}
      <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold flex items-center gap-2"><LayoutDashboard size={16} /> Quick Start Templates</h4>
          <button className="text-xs font-semibold text-brand-black hover:underline" onClick={() => setTab('all')}>View All &rarr;</button>
        </div>
        <AdTemplateGallery onApplyTemplate={applyTemplate} />
      </div>
    </div>
  );

  // Main render
  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-text-primary">Ad Campaigns</h2>
          <p className="text-sm text-text-muted">AI-powered ads for Instagram, Facebook, Google, YouTube & WhatsApp</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          const activeColors = {
            overview: 'bg-brand-black text-white shadow-lg',
            all: 'bg-brand-black text-white shadow-lg',
            brand: 'bg-gradient-to-r from-amber-600 to-red-600 text-white shadow-lg',
            'ai-tools': 'bg-purple-600 text-white shadow-lg',
            analytics: 'bg-blue-600 text-white shadow-lg',
            compare: 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg',
            tracking: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg',
            automation: 'bg-amber-600 text-white shadow-lg',
            audiences: 'bg-indigo-600 text-white shadow-lg',
            creatives: 'bg-purple-600 text-white shadow-lg',
            experiments: 'bg-green-600 text-white shadow-lg',
            reports: 'bg-blue-600 text-white shadow-lg',
          };
          return (
            <button key={t.id}
              className={'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ' + (isActive ? (activeColors[t.id] || 'bg-brand-black text-white shadow-lg') : 'bg-white text-text-muted border border-border hover:border-brand-black/30')}
              onClick={() => setTab(t.id)}>
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && renderOverviewTab()}

      {tab === 'all' && (
        <div className="space-y-4">
          <div className="flex items-center justify-end mb-4">
            <button className={'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ' + (showBulk ? 'bg-brand-black text-white shadow' : 'bg-white text-text-muted border border-border hover:border-brand-black/30')}
              onClick={() => setShowBulk(!showBulk)}>
              <CheckSquare size={14} /> Bulk
            </button>
          </div>
          {showBulk && (
            <BulkActions
              campaigns={campaigns}
              onBulkStatusChange={handleBulkStatusChange}
              onBulkDelete={async (id) => {
                try {
                  await adsAPI.deleteCampaign(id);
                  toast.success('Campaign deleted');
                  loadCampaigns(pagination.page, platformFilter);
                  loadStats();
                } catch { toast.error('Failed to delete'); }
              }}
              onDuplicate={handleDuplicate}
            />
          )}
          <CampaignListTab
            campaigns={campaigns} loading={loading} stats={stats}
            search={search} setSearch={setSearch}
            platformFilter={platformFilter} setPlatformFilter={setPlatformFilter}
            pagination={pagination} staleCampaigns={staleCampaigns}
            syncingAll={syncingAll} setSyncingAll={setSyncingAll}
            openNew={openNew} openEdit={openEdit} handleDelete={handleDelete}
            openDetail={openDetail} loadCampaigns={loadCampaigns}
            loadStats={loadStats} adsAPI={adsAPI}
          />
        </div>
      )}

      {tab === 'brand' && (
        <BrandTab
          stats={stats} brandSettings={brandSettings} brandCampaigns={brandCampaigns}
          setForm={setForm} setShowModal={setShowModal}
          setAiTone={setAiTone} setAiPlatform={setAiPlatform}
          setTab={setTab} openEdit={openEdit} adsAPI={adsAPI}
        />
      )}

      {tab === 'ai-tools' && (
        <AiToolsTab
          adsAPI={adsAPI} setForm={setForm} setShowModal={setShowModal}
          setAiGeneratedCopy={setAiGeneratedCopy} setAiResultTab={setAiResultTab}
        />
      )}

      {tab === 'analytics' && <AnalyticsTab stats={stats} adsAPI={adsAPI} />}

      {tab === 'compare' && <CompareTab campaigns={campaigns} adsAPI={adsAPI} />}
      {tab === 'tracking' && <TrackingTab campaigns={campaigns} adsAPI={adsAPI} />}

      {tab === 'automation' && <AutomationTab adsAPI={adsAPI} campaigns={campaigns} />}
      {tab === 'audiences' && <AudienceTab adsAPI={adsAPI} />}
      {tab === 'creatives' && <CreativeLibraryTab adsAPI={adsAPI} campaigns={campaigns} />}
      {tab === 'experiments' && <ExperimentsTab adsAPI={adsAPI} campaigns={campaigns} />}
      {tab === 'reports' && <ReportsTab adsAPI={adsAPI} />}

      {/* Campaign Detail Panel */}
      {campaignDetail && (
        <CampaignDetailPanel
          campaign={campaignDetail}
          loading={detailLoading}
          onClose={closeDetail}
          onEdit={openEdit}
          adsAPI={adsAPI}
        />
      )}

      {/* Campaign Modal */}
      {campaignEverOpened && (
        <Suspense fallback={null}>
          <CampaignModal
            show={showModal} onClose={() => setShowModal(false)}
            editing={editing} form={form} setForm={setForm}
            loading={modalLoading} handleSave={handleSave}
          />
        </Suspense>
      )}
    </div>
  );
}

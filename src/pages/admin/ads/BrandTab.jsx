import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Shield, Megaphone, TrendingUp, DollarSign, Eye,
  BarChart3, RefreshCw, Rocket, Zap, Sparkles, Crown, Tag,
  MessageCircle, Target, Play, ArrowRight, BookOpen,
  Settings2, Clock3, Award
} from 'lucide-react';
import toast from '../../../utils/toast';
import { adminAPI } from '../../../api/admin';

const PLATFORMS = [
  { id: 'INSTAGRAM', label: 'Instagram', icon: Target, color: 'bg-gradient-to-br from-pink-500 to-purple-600' },
  { id: 'FACEBOOK', label: 'Facebook', icon: Target, color: 'bg-blue-600' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500' },
  { id: 'GOOGLE', label: 'Google / YouTube', icon: Play, color: 'bg-gradient-to-br from-blue-500 to-green-500' },
];

const brandPresets = [
  { name: '🔥 Flash Sale', description: 'Urgent discount campaign for clearing inventory', platform: 'INSTAGRAM', objective: 'Sales & Conversions', tone: 'urgent', icon: Zap, color: 'from-red-500 to-orange-500' },
  { name: '✨ New Collection Launch', description: 'Showcase your newest products with style', platform: 'FACEBOOK', objective: 'Brand Awareness', tone: 'luxury', icon: Sparkles, color: 'from-purple-500 to-pink-500' },
  { name: '🏆 Best Sellers', description: 'Promote your top-rated products', platform: 'GOOGLE', objective: 'Traffic & Sales', tone: 'professional', icon: Crown, color: 'from-amber-500 to-yellow-500' },
  { name: '🎯 Seasonal Promotion', description: 'Festive/holiday themed campaign', platform: 'INSTAGRAM', objective: 'Engagement', tone: 'friendly', icon: Tag, color: 'from-green-500 to-teal-500' },
  { name: '📣 Brand Awareness', description: 'Build brand recognition across platforms', platform: 'FACEBOOK', objective: 'Reach & Awareness', tone: 'professional', icon: Megaphone, color: 'from-blue-500 to-indigo-500' },
  { name: '💬 WhatsApp Broadcast', description: 'Direct promotional broadcast to subscribers', platform: 'WHATSAPP', objective: 'Direct Messaging', tone: 'friendly', icon: MessageCircle, color: 'from-green-500 to-emerald-500' },
];

export default function BrandTab({
  stats, brandSettings, brandCampaigns, setOpenNew, setForm, setShowModal,
  setAiTone, setAiPlatform, setTab, openEdit, adsAPI
}) {
  const [presetPerformance, setPresetPerformance] = useState(null);
  const [presetPerformanceLoading, setPresetPerformanceLoading] = useState(false);

  const loadPresetPerformance = useCallback(async () => {
    setPresetPerformanceLoading(true);
    try {
      const r = await adsAPI.getBrandPresetPerformance();
      setPresetPerformance(r.data?.data || r.data);
    } catch { /* silent fail */ }
    setPresetPerformanceLoading(false);
  }, [adsAPI]);

  useEffect(() => {
    loadPresetPerformance();
  }, [loadPresetPerformance]);

  const applyBrandPreset = (preset) => {
    setForm({
      name: `${preset.name} — ${brandSettings?.storeName || 'THREVOLT'}`,
      platform: preset.platform,
      objective: preset.objective,
      budget: '5000',
      startDate: '',
      endDate: '',
      creativeUrl: brandSettings?.logoUrl || '',
      creativeType: 'IMAGE',
      landingUrl: '',
      notes: `Brand campaign: ${preset.description}\nTone: ${preset.tone}`,
    });
    setAiTone(preset.tone);
    setAiPlatform(preset.platform);
    setShowModal(true);
    toast.success(`"${preset.name}" template loaded!`);
  };

  return (
    <div className="space-y-6">
      {/* Brand Header */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm overflow-hidden">
              {brandSettings?.logoUrl ? (
                <img loading="lazy" src={brandSettings.logoUrl} alt="Brand" className="w-full h-full object-contain p-2" />
              ) : (
                <Building2 size={32} className="text-white" />
              )}
            </div>
            <div>
              <h3 className="text-2xl font-bold font-display">{brandSettings?.storeName || 'THREVOLT'}</h3>
              <p className="text-amber-100 text-sm">{brandSettings?.siteTagline || "India's Favorite T-Shirt Brand"}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm">
            <Shield size={16} className="text-amber-200" />
            <span className="text-sm font-semibold">{brandCampaigns.filter(c => c.status === 'ACTIVE').length} Active Ads</span>
          </div>
        </div>
      </div>

      {/* Quick Brand Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl border border-border shadow-soft">
            <div className="flex items-center gap-2 mb-1">
              <Megaphone size={14} className="text-amber-600" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Brand Campaigns</span>
            </div>
            <div className="text-2xl font-bold font-display">{stats.totalCampaigns || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-border shadow-soft">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp size={14} className="text-green-600" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Active</span>
            </div>
            <div className="text-2xl font-bold font-display text-green-600">{stats.activeCampaigns || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-border shadow-soft">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={14} className="text-blue-600" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Total Budget</span>
            </div>
            <div className="text-2xl font-bold font-display">₹{((stats.totalBudget || 0) / 1000).toFixed(1)}k</div>
          </div>
          <div className="bg-white p-4 rounded-xl border border-border shadow-soft">
            <div className="flex items-center gap-2 mb-1">
              <Eye size={14} className="text-purple-600" />
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Impressions</span>
            </div>
            <div className="text-2xl font-bold font-display">{(stats.totalImpressions || 0).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Preset Performance Dashboard */}
      <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-amber-50 to-orange-50">
          <h4 className="font-bold text-text-primary flex items-center gap-2">
            <BarChart3 size={18} className="text-amber-600" /> Preset Performance Dashboard
          </h4>
          <button onClick={loadPresetPerformance} disabled={presetPerformanceLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white border border-border rounded-xl hover:bg-surface transition-colors disabled:opacity-50">
            {presetPerformanceLoading ? <div className="spinner w-3 h-3 border-2 border-amber-400/30 border-t-amber-500 rounded-full" /> : <RefreshCw size={12} />}
            {presetPerformanceLoading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        {presetPerformance ? (
          <div className="p-5 space-y-5">
            {presetPerformance.crossPlatformInsights?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {presetPerformance.crossPlatformInsights.map((insight, i) => (
                  <span key={i} className="px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold rounded-xl">{insight}</span>
                ))}
              </div>
            )}
            {presetPerformance.presets?.length > 0 ? (
              <div className="space-y-3">
                {presetPerformance.presets.map((preset, i) => {
                  const isTop = i === 0;
                  const isWorst = i === presetPerformance.presets.length - 1;
                  const isOnly = presetPerformance.presets.length === 1;
                  const barWidth = Math.min(preset.performanceScore, 100);
                  return (
                    <div key={preset.presetKey} className={`p-4 rounded-xl border ${isTop && !isOnly ? 'border-amber-300 bg-amber-50/50' : isWorst && !isOnly ? 'border-red-200 bg-red-50/30' : 'border-border bg-gray-50/50'} hover:shadow-sm transition-shadow`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${isTop && !isOnly ? 'bg-amber-600 text-white' : isWorst && !isOnly ? 'bg-red-400 text-white' : 'bg-gray-200 text-gray-600'}`}>{i + 1}</div>
                          <div>
                            <div className="font-bold text-sm text-text-primary flex items-center gap-2">
                              {preset.presetName}
                              {isTop && !isOnly && <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full">Best</span>}
                              {isWorst && !isOnly && <span className="text-[9px] font-bold px-2 py-0.5 bg-red-100 text-red-500 rounded-full">Lowest</span>}
                            </div>
                            <div className="text-[10px] text-text-muted">{preset.campaignCount} campaigns · {preset.activeCount} active</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-text-primary font-display">{preset.performanceScore}</div>
                          <div className="text-[9px] text-text-muted uppercase tracking-wider">Score</div>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full mb-3 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${isTop && !isOnly ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'}`}
                          style={{ width: `${barWidth}%` }} />
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                        {[
                          { label: 'CTR', value: `${preset.avgCTR}%`, highlight: preset.avgCTR > 2 },
                          { label: 'CPC', value: `₹${preset.avgCPC}` },
                          { label: 'CPM', value: `₹${preset.avgCPM}` },
                          { label: 'Conv.', value: `${preset.conversionRate}%` },
                          { label: 'ROAS', value: `${preset.roas}x`, highlight: preset.roas > 1 },
                          { label: 'Spent', value: `₹${preset.totalSpent.toLocaleString()}` },
                        ].map((m, i) => (
                          <div key={i} className="text-center p-1.5 bg-white rounded-lg border border-border/50">
                            <div className="text-[10px] font-bold text-text-muted">{m.label}</div>
                            <div className={`text-xs font-bold ${m.highlight ? 'text-green-600' : 'text-text-primary'}`}>{m.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-text-muted">
                <BarChart3 size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm font-semibold">No preset campaigns found</p>
                <p className="text-xs mt-1">Campaigns created from 'Quick Brand Campaigns' will appear here automatically.</p>
              </div>
            )}
          </div>
        ) : (
          <button className="w-full p-6 text-center text-text-muted hover:bg-surface/50 transition-colors" onClick={loadPresetPerformance}>
            {presetPerformanceLoading ? (
              <div className="flex items-center justify-center gap-2"><div className="spinner w-4 h-4 border-2 border-amber-400/30 border-t-amber-500 rounded-full" /> Loading...</div>
            ) : (
              <div className="flex items-center justify-center gap-2"><RefreshCw size={16} /> Load Preset Performance Dashboard</div>
            )}
          </button>
        )}
      </div>

      {/* Quick Brand Campaigns */}
      <div>
        <h4 className="font-bold text-text-primary mb-3 flex items-center gap-2"><Rocket size={18} className="text-amber-600" /> Quick Brand Campaigns</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {brandPresets.map((preset, i) => {
            const Icon = preset.icon;
            const PlatformIcon = PLATFORMS.find(p => p.id === preset.platform)?.icon || Target;
            return (
              <button key={i} className="bg-white rounded-2xl border border-border shadow-soft p-4 text-left hover:shadow-md transition-all group relative overflow-hidden"
                onClick={() => applyBrandPreset(preset)}>
                <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${preset.color} opacity-5 rounded-bl-3xl group-hover:opacity-10 transition-opacity`} />
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${preset.color} flex items-center justify-center`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <PlatformIcon size={14} className="text-text-muted" />
                </div>
                <h5 className="font-bold text-sm text-text-primary mb-1">{preset.name}</h5>
                <p className="text-xs text-text-muted mb-3 line-clamp-2">{preset.description}</p>
                <div className="flex items-center gap-2 text-[10px] font-semibold text-amber-600 group-hover:gap-3 transition-all">
                  Create Campaign <ArrowRight size={12} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Brand Voice Quick Create */}
      <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-bold text-text-primary flex items-center gap-2">
            <BookOpen size={18} className="text-amber-600" /> Brand Voice Quick Create
          </h4>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
            {brandSettings?.storeName || 'THREVOLT'} Branded
          </span>
        </div>
        <p className="text-sm text-text-muted mb-4">Use your brand identity to instantly create platform-optimized ad campaigns.</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            return (
              <button key={p.id} className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-dashed border-border hover:border-amber-400 hover:bg-amber-50/50 transition-all"
                onClick={() => {
                  setAiPlatform(p.id);
                  setAiTone('luxury');
                  setTab('ai-tools');
                  toast.success(`Ready to create ${p.label} ad for ${brandSettings?.storeName || 'THREVOLT'}!`);
                }}>
                <Icon size={20} className={p.color.includes('bg-') ? p.color.replace('bg-', 'text-').split(' ')[0] : 'text-gray-500'} />
                <span className="text-xs font-semibold text-text-primary">{p.label.split('/')[0].trim()}</span>
                <span className="text-[9px] text-text-muted">Create →</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Brand Campaigns */}
      {brandCampaigns.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
          <h4 className="font-bold text-text-primary mb-3 flex items-center gap-2"><Clock3 size={16} className="text-text-muted" /> Recent Brand Campaigns</h4>
          <div className="space-y-2">
            {brandCampaigns.slice(0, 5).map((c) => {
              const PlatformIcon = PLATFORMS.find(p => p.id === c.platform)?.icon || Target;
              const platColor = PLATFORMS.find(p => p.id === c.platform)?.color || 'bg-gray-500';
              return (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-border hover:bg-gray-100/50 transition-colors cursor-pointer"
                  onClick={() => openEdit(c)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${platColor}`}><PlatformIcon size={14} /></span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{c.name}</div>
                      <div className="text-[10px] text-text-muted">₹{Number(c.budget || 0).toLocaleString()} · {c.impressions || 0} impressions</div>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : c.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-600' : c.status === 'COMPLETED' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Brand Settings Quick Link */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-border shadow-soft">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
            <Settings2 size={18} className="text-text-muted" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Brand Settings</p>
            <p className="text-xs text-text-muted">Manage your store name, logo, and brand identity</p>
          </div>
        </div>
        <button className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-surface transition-colors"
          onClick={() => window.location.href = '/admin/settings'}>
          <Settings2 size={14} className="inline mr-1.5" /> Settings
        </button>
      </div>
    </div>
  );
}

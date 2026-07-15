import { useState } from 'react';
import {
  Edit2, Trash2, Eye, Plus, RefreshCw, AlertTriangle, Search,
  BarChart3, Target, MessageCircle, Play, LayoutDashboard, Image as ImageIcon,
  LayoutGrid
} from 'lucide-react';
import AdPreviewMockup from '../../../components/admin/ads/AdPreviewMockup';
import AdPreviewCompare from '../../../components/admin/ads/AdPreviewCompare';
import toast from '../../../utils/toast';

const PLATFORMS = [
  { id: 'INSTAGRAM', label: 'Instagram', icon: Target, color: 'bg-gradient-to-br from-pink-500 to-purple-600' },
  { id: 'FACEBOOK', label: 'Facebook', icon: Target, color: 'bg-blue-600' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500' },
  { id: 'GOOGLE', label: 'Google / YouTube', icon: Play, color: 'bg-gradient-to-br from-blue-500 to-green-500' },
];

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-600',
  PAUSED: 'bg-yellow-100 text-yellow-600',
  COMPLETED: 'bg-blue-100 text-blue-600',
  FAILED: 'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

/** Parse creativeUrl — returns array of URLs (single or carousel) */
function getCreativeUrls(campaign) {
  if (!campaign?.creativeUrl) return [];
  try {
    const parsed = JSON.parse(campaign.creativeUrl);
    return Array.isArray(parsed) ? parsed : [campaign.creativeUrl];
  } catch {
    return [campaign.creativeUrl];
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return null;
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  if (diffMs < 0) return 'just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function CampaignListTab({
  campaigns, loading, stats, search, setSearch,
  platformFilter, setPlatformFilter, pagination,
  staleCampaigns, syncingAll, setSyncingAll,
  openNew, openEdit, handleDelete, openDetail,
  loadCampaigns, loadStats, adsAPI
}) {
  const [pushingCampaigns, setPushingCampaigns] = useState({});
  const [syncingCampaigns, setSyncingCampaigns] = useState({});
  const [previewCampaign, setPreviewCampaign] = useState(null);
  const [compareCampaign, setCompareCampaign] = useState(null);

  const handlePushToPlatform = async (campaign) => {
    setPushingCampaigns(prev => ({ ...prev, [campaign.id]: true }));
    try {
      if (campaign.platform === 'GOOGLE') {
        await adsAPI.pushToGoogleAds(campaign.id);
      } else {
        await adsAPI.pushToMeta(campaign.id);
      }
      toast.success(`Pushed ${campaign.name} to ${campaign.platform}`);
      loadCampaigns(pagination.page, platformFilter);
      loadStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || `Failed to push to ${campaign.platform}`);
    }
    setPushingCampaigns(prev => ({ ...prev, [campaign.id]: false }));
  };

  const handleSyncStats = async (campaign) => {
    setSyncingCampaigns(prev => ({ ...prev, [campaign.id]: true }));
    try {
      if (campaign.platform === 'GOOGLE') {
        await adsAPI.syncGoogleStats(campaign.id);
      } else {
        await adsAPI.syncMetaStats(campaign.id);
      }
      toast.success(`Synced stats for ${campaign.name}`);
      loadCampaigns(pagination.page, platformFilter);
      loadStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Sync failed');
    }
    setSyncingCampaigns(prev => ({ ...prev, [campaign.id]: false }));
  };

  return (
    <div>
      {/* Search & New Campaign */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-black"
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-dark flex items-center gap-2" onClick={openNew}>
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Platform Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${!platformFilter ? 'bg-brand-black text-white shadow' : 'bg-white text-text-muted border border-border hover:border-brand-black/30'}`}
          onClick={() => setPlatformFilter('')}
        >
          <BarChart3 size={14} /> All
        </button>
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${platformFilter === p.id ? (p.color.includes('bg-') ? p.color + ' text-white shadow' : 'bg-brand-black text-white shadow') : 'bg-white text-text-muted border border-border hover:border-brand-black/30'}`}
            onClick={() => setPlatformFilter(platformFilter === p.id ? '' : p.id)}
          >
            <p.icon size={14} /> {p.label.split('/')[0].trim()}
          </button>
        ))}
      </div>

      {/* Stale Sync Banner */}
      {staleCampaigns.length > 0 && (
        <div className="mb-4 p-4 rounded-xl border border-orange-200 bg-orange-50/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-orange-800">
                {staleCampaigns.length} {staleCampaigns.length === 1 ? 'campaign' : 'campaigns'} haven't been synced in over 24h
              </p>
              <p className="text-xs text-orange-600 mt-0.5">Pull fresh performance stats from the ad platforms.</p>
            </div>
          </div>
          <button
            onClick={async () => {
              setSyncingAll(true);
              let synced = 0, failed = 0;
              for (const c of staleCampaigns) {
                try {
                  if (c.platform === 'GOOGLE') await adsAPI.syncGoogleStats(c.id);
                  else await adsAPI.syncMetaStats(c.id);
                  synced++;
                } catch { failed++; }
              }
              toast.success(`Synced ${synced}${failed > 0 ? `, ${failed} failed` : ''}`);
              loadCampaigns(pagination.page, platformFilter);
              loadStats();
              setSyncingAll(false);
            }}
            disabled={syncingAll}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors whitespace-nowrap disabled:opacity-50"
          >
            {syncingAll ? <><div className="spinner w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full" /> Syncing...</> : <><RefreshCw size={15} /> Sync All</>}
          </button>
        </div>
      )}

      {/* Campaign Table */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">
          <div className="spinner w-8 h-8 border-2 border-gray-300 border-t-brand-black rounded-full mx-auto mb-3" />
          <p className="text-sm">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12 text-text-muted">
          <LayoutDashboard size={40} className="mx-auto mb-3 opacity-30" />
          <h3 className="text-lg font-semibold mb-1">No campaigns found</h3>
          <p className="text-sm mb-4">{search || platformFilter ? 'Try adjusting your search or filters' : 'Create your first ad campaign to get started'}</p>
          {!search && !platformFilter && (
            <button className="btn-dark flex items-center gap-2 mx-auto" onClick={openNew}>
              <Plus size={16} /> Create Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Campaign</th>
                  <th className="text-left p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Platform</th>
                  <th className="text-center p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Status</th>
                  <th className="text-right p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Budget</th>
                  <th className="text-right p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Impressions</th>
                  <th className="text-right p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Clicks</th>
                  <th className="text-right p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Synced</th>
                  <th className="text-center p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => {
                  const PlatformIcon = PLATFORMS.find(p => p.id === c.platform)?.icon || Target;
                  const platColor = PLATFORMS.find(p => p.id === c.platform)?.color || 'bg-gray-500';
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-surface/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {/* Creative Thumbnail */}
                          <div className="relative w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-border/60 bg-gray-50">
                            {(() => {
                              const urls = getCreativeUrls(c);
                              const firstUrl = urls[0];
                              if (!firstUrl) {
                                return <div className="w-full h-full flex items-center justify-center"><ImageIcon size={14} className="text-gray-300" /></div>;
                              }
                              if (c.creativeType === 'VIDEO' || firstUrl.includes('youtube.com') || firstUrl.includes('youtu.be')) {
                                return (
                                  <>
                                    <img
                                      src={firstUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                      onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling?.style.removeProperty('display'); }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30" style={{ display: 'none' }}>
                                      <Play size={10} className="text-white fill-white" />
                                    </div>
                                  </>
                                );
                              }
                              return (
                                <>
                                  <img
                                    src={firstUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling?.style.removeProperty('display'); }}
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100" style={{ display: 'none' }}>
                                    <ImageIcon size={14} className="text-gray-300" />
                                  </div>
                                  {urls.length > 1 && (
                                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-black text-[7px] font-bold text-white flex items-center justify-center shadow-sm">
                                      +{urls.length - 1}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                          <div className="min-w-0">
                            <button className="text-sm font-semibold text-left hover:text-brand-black transition-colors truncate max-w-[180px] block"
                              onClick={() => openDetail(c)}>
                              {c.name}
                            </button>
                            {c.objective && <div className="text-[10px] text-text-muted mt-0.5 truncate max-w-[180px]">{c.objective}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-white text-[9px] ${platColor}`}>
                            <PlatformIcon size={12} />
                          </span>
                          <span className="text-xs font-semibold">{c.platform}</span>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${STATUS_COLORS[c.status] || ''}`}>
                          {c.status || 'DRAFT'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold">₹{Number(c.budget || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-text-muted">{(c.impressions || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-text-muted">{(c.clicks || 0).toLocaleString()}</td>
                      <td className="p-3 text-right text-[10px] text-text-muted">{timeAgo(c.lastSyncedAt || c.syncedAt) || '—'}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => openEdit(c)} title="Edit">
                            <Edit2 size={14} className="text-text-muted" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => handleDelete(c.id)} title="Delete">
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => openDetail(c)} title="View Details">
                            <Eye size={14} className="text-text-muted" />
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
                            onClick={() => handlePushToPlatform(c)}
                            disabled={pushingCampaigns[c.id]}
                            title="Push to platform"
                          >
                            {pushingCampaigns[c.id]
                              ? <div className="spinner w-3 h-3 border-2 border-gray-300 border-t-brand-black rounded-full" />
                              : <RefreshCw size={14} className="text-text-muted" />}
                          </button>
                          <button
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-40"
                            onClick={() => handleSyncStats(c)}
                            disabled={syncingCampaigns[c.id]}
                            title="Sync stats"
                          >
                            {syncingCampaigns[c.id]
                              ? <div className="spinner w-3 h-3 border-2 border-gray-300 border-t-brand-black rounded-full" />
                              : <BarChart3 size={14} className="text-text-muted" />}
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setPreviewCampaign(c)} title="Preview Ad">
                            <ImageIcon size={14} className="text-purple-500" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" onClick={() => setCompareCampaign(c)} title="Compare Across All Platforms">
                            <LayoutGrid size={14} className="text-indigo-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <span className="text-xs text-text-muted">Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold hover:bg-surface disabled:opacity-30"
                  disabled={pagination.page <= 1} onClick={() => loadCampaigns(pagination.page - 1, platformFilter)}>
                  Previous
                </button>
                <button className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold hover:bg-surface disabled:opacity-30"
                  disabled={pagination.page >= pagination.totalPages} onClick={() => loadCampaigns(pagination.page + 1, platformFilter)}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ad Preview Modal - Single Platform */}
      {previewCampaign && (
        <AdPreviewMockup
          campaign={previewCampaign}
          onClose={() => setPreviewCampaign(null)}
        />
      )}

      {/* Ad Preview Modal - All Platforms Comparison */}
      {compareCampaign && (
        <AdPreviewCompare
          campaign={compareCampaign}
          onClose={() => setCompareCampaign(null)}
        />
      )}
    </div>
  );
}

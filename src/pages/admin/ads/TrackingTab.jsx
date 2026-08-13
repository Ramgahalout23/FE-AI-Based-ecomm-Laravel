import { useState, useEffect, useCallback } from 'react';
import {
  Activity, MousePointerClick, Eye, Target, TrendingUp, Globe,
  Smartphone, CalendarRange, Radio, RefreshCw, Filter, Award,
  ExternalLink, Copy, Check
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, PieChart, Pie, Cell
} from 'recharts';
import toast from '../../../utils/toast';

const EVENT_COLORS = {
  IMPRESSION: '#3b82f6',
  CLICK: '#8b5cf6',
  CONVERSION: '#22c55e',
};

const PIE_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981'];

const DAY_OPTIONS = [7, 14, 30, 90];

function formatNumber(n) {
  if (n == null) return '0';
  return Number(n).toLocaleString('en-IN');
}

function formatValue(n) {
  if (n == null) return '₹0';
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (diffMs < 0) return 'just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function Copyable({ text, label }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Copy failed');
    }
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-lg border border-border hover:border-brand-black/40 hover:bg-gray-50 transition-all"
      title="Copy to clipboard"
    >
      {copied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
      Copy
    </button>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-border shadow-soft">
      <div className="flex items-center gap-2 text-[10px] font-bold text-text-muted uppercase tracking-wider">
        <Icon size={13} className={color} /> {label}
      </div>
      <div className="text-2xl font-bold font-display mt-1.5">{value}</div>
      {sub && <div className="text-[11px] text-text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

export default function TrackingTab({ campaigns, adsAPI }) {
  const [days, setDays] = useState(30);
  const [campaignId, setCampaignId] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [events, setEvents] = useState([]);
  const [eventsPage, setEventsPage] = useState(1);
  const [eventsMeta, setEventsMeta] = useState({ last_page: 1, total: 0 });

  const [attribution, setAttribution] = useState(null);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [trackingUrls, setTrackingUrls] = useState(null);
  const [activeFilter, setActiveFilter] = useState('');

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const params = { days };
      if (campaignId) params.campaign_id = campaignId;
      const r = await adsAPI.getTrackingDashboard(params);
      setDashboard(r.data?.data || r.data);
    } catch {
      toast.error('Failed to load tracking dashboard');
    }
    setLoading(false);
  }, [days, campaignId, adsAPI]);

  const loadEvents = useCallback(async (page = 1, type = '') => {
    setEventsLoading(true);
    try {
      const params = { per_page: 20, page };
      if (campaignId) params.campaign_id = campaignId;
      if (type) params.type = type;
      const r = await adsAPI.getTrackingEvents(params);
      const data = r.data?.data || r.data || {};
      setEvents(data.data || data.items || []);
      setEventsMeta({ last_page: data.last_page || 1, total: data.total || 0 });
    } catch {
      toast.error('Failed to load tracking events');
    }
    setEventsLoading(false);
  }, [campaignId, adsAPI]);

  const loadAttribution = useCallback(async () => {
    try {
      const r = await adsAPI.getTrackingAttribution({ days: Math.max(days, 30) });
      setAttribution(r.data?.data || r.data);
    } catch {
      /* attribution is supplemental — don't nag */
    }
  }, [days, adsAPI]);

  useEffect(() => {
    loadDashboard();
    loadEvents(1, activeFilter);
    loadAttribution();
  }, [loadDashboard, loadEvents, loadAttribution, activeFilter]);

  const loadUrls = async () => {
    if (!campaignId) {
      toast.info('Select a campaign to see its tracking links');
      return;
    }
    try {
      const r = await adsAPI.getCampaignTrackingUrls(campaignId);
      setTrackingUrls(r.data?.data || r.data);
    } catch {
      toast.error('Failed to load tracking URLs');
    }
  };

  const handleRefresh = () => {
    loadDashboard();
    loadEvents(eventsPage, activeFilter);
    loadAttribution();
    toast.success('Tracking data refreshed');
  };

  const summary = dashboard?.summary || {};
  const daily = dashboard?.daily || [];
  const bySource = dashboard?.bySource || [];
  const byDevice = dashboard?.byDevice || [];
  const byCampaign = dashboard?.byCampaign || [];
  const conversions = dashboard?.conversions || [];


  const chartData = daily.map(d => ({
    ...d,
    dateLabel: d.date?.slice(5) || d.date,
    ctr: d.impressions > 0 ? Number(((d.clicks / d.impressions) * 100).toFixed(2)) : 0,
  }));

  const ctr = summary.ctr ?? (summary.impressions > 0 ? ((summary.clicks / summary.impressions) * 100).toFixed(2) : 0);
  const convRate = summary.conversionRate ?? (summary.clicks > 0 ? ((summary.conversions / summary.clicks) * 100).toFixed(2) : 0);

  const sourcePie = bySource.map((s, i) => ({ name: s.source, value: Number(s.events), color: PIE_COLORS[i % PIE_COLORS.length] }));
  const devicePie = byDevice.map((d, i) => ({ name: d.device, value: Number(d.events), color: PIE_COLORS[i % PIE_COLORS.length] }));

  const totalEvents = (summary.impressions || 0) + (summary.clicks || 0) + (summary.conversions || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold font-display flex items-center gap-3"><Radio size={24} /> Campaign Tracking & Attribution</h3>
            <p className="text-indigo-200 text-sm mt-1">Click, impression & conversion tracking with UTM attribution and live event feed</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-white/10 rounded-xl p-1 backdrop-blur-sm border border-white/15">
              {DAY_OPTIONS.map(d => (
                <button key={d}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${days === d ? 'bg-white text-indigo-700 shadow' : 'text-indigo-100 hover:bg-white/10'}`}
                  onClick={() => setDays(d)}>
                  {d}d
                </button>
              ))}
            </div>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold transition-all"
            >
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mt-5">
          <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/15 min-w-[240px]">
            <Filter size={13} className="text-indigo-200" />
            <select
              value={campaignId}
              onChange={(e) => { setCampaignId(e.target.value); setTrackingUrls(null); }}
              className="bg-transparent text-sm font-semibold focus:outline-none w-full [&>option]:text-gray-800"
            >
              <option value="">All campaigns</option>
              {(campaigns || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {campaignId && (
            <button
              onClick={loadUrls}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white text-indigo-700 text-xs font-bold hover:bg-indigo-50 transition-all"
            >
              <ExternalLink size={13} /> Get Tracking Links
            </button>
          )}
        </div>

        {/* Tracking URLs Panel */}
        {trackingUrls && (
          <div className="mt-4 bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">Tracking URLs</p>
            {[
              { label: 'Click URL', value: trackingUrls.click_url },
              { label: 'Impression Pixel', value: trackingUrls.impression_url },
              { label: 'Conversion Webhook', value: trackingUrls.conversion_url },
              { label: 'Landing URL (with UTM)', value: trackingUrls.landing_url },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-bold text-indigo-200 w-36">{row.label}</span>
                <code className="text-[11px] bg-black/25 rounded-lg px-2 py-1 flex-1 min-w-[200px] break-all">{row.value}</code>
                <Copyable text={row.value} label={row.label} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Summary */}
      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={Eye} label="Impressions" value={formatNumber(summary.impressions)} sub={`${totalEvents ? Math.round((summary.impressions || 0) / totalEvents * 100) : 0}% of events`} color="text-blue-600" />
          <KpiCard icon={MousePointerClick} label="Clicks" value={formatNumber(summary.clicks)} sub={`${formatNumber(summary.impressions || 0)} impressions`} color="text-purple-600" />
          <KpiCard icon={Target} label="Conversions" value={formatNumber(summary.conversions)} sub={`${formatValue(summary.conversionValue)} value`} color="text-green-600" />
          <KpiCard icon={TrendingUp} label="CTR" value={`${ctr}%`} sub="clicks / impressions" color="text-indigo-600" />
          <KpiCard icon={Activity} label="Conv. Rate" value={`${convRate}%`} sub="conversions / clicks" color="text-amber-600" />
          <KpiCard icon={Award} label="Conv. Value" value={formatValue(summary.conversionValue)} sub={`${formatNumber(summary.conversions)} conversions`} color="text-emerald-600" />
        </div>
      )}

      {/* Daily Trends Chart */}
      <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h4 className="font-bold flex items-center gap-2"><CalendarRange size={16} /> Daily Performance</h4>
          <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
            {Object.entries(EVENT_COLORS).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-50 border border-border">
                <span className="w-2 h-2 rounded-full" style={{ background: v }} /> {k}
              </span>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="py-16 flex flex-col items-center text-text-muted">
            <div className="spinner w-8 h-8 border-2 border-gray-300 border-t-brand-black rounded-full mb-3" />
            <p className="text-sm">Loading tracking data...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EVENT_COLORS.IMPRESSION} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={EVENT_COLORS.IMPRESSION} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gClk" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EVENT_COLORS.CLICK} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={EVENT_COLORS.CLICK} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gCnv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EVENT_COLORS.CONVERSION} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={EVENT_COLORS.CONVERSION} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} minTickGap={24} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                formatter={(value, name) => [formatNumber(value), name]}
              />
              <Area type="monotone" dataKey="impressions" name="Impressions" stroke={EVENT_COLORS.IMPRESSION} strokeWidth={2} fill="url(#gImp)" />
              <Area type="monotone" dataKey="clicks" name="Clicks" stroke={EVENT_COLORS.CLICK} strokeWidth={2} fill="url(#gClk)" />
              <Area type="monotone" dataKey="conversions" name="Conversions" stroke={EVENT_COLORS.CONVERSION} strokeWidth={2} fill="url(#gCnv)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Breakdowns + Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* UTM Source */}
        <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Globe size={15} /> By UTM Source</h4>
          {sourcePie.length === 0 ? (
            <p className="text-xs text-text-muted py-8 text-center">No events yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={sourcePie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {sourcePie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [formatNumber(v), n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {sourcePie.map(s => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold capitalize">
                      <span className="w-2 h-2 rounded-full" style={{ background: s.color }} /> {s.name || 'direct'}
                    </span>
                    <span className="text-text-muted">{formatNumber(s.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Devices */}
        <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Smartphone size={15} /> By Device</h4>
          {devicePie.length === 0 ? (
            <p className="text-xs text-text-muted py-8 text-center">No events yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={devicePie} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65} paddingAngle={3}>
                    {devicePie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [formatNumber(v), n]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {devicePie.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-semibold capitalize">
                      <span className="w-2 h-2 rounded-full" style={{ background: d.color }} /> {d.name}
                    </span>
                    <span className="text-text-muted">{formatNumber(d.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top Campaigns */}
        <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
          <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Award size={15} /> Top Campaigns</h4>
          {byCampaign.length === 0 ? (
            <p className="text-xs text-text-muted py-8 text-center">No events yet</p>
          ) : (
            <div className="space-y-2">
              {byCampaign.map((c, i) => (
                <div key={c.campaign_id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border border-border">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{c.name}</div>
                      <div className="text-[9px] text-text-muted">{c.platform || '—'}</div>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600">{formatNumber(c.events)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conversion Attribution */}
      {attribution && (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h4 className="font-bold flex items-center gap-2"><Target size={16} /> Conversion Attribution</h4>
            <div className="flex items-center gap-4 text-xs">
              <span className="font-semibold">{formatNumber(attribution.totals?.conversions || 0)} conversions</span>
              <span className="font-bold text-green-600">{formatValue(attribution.totals?.value)}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(attribution.byCampaign || []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">By Campaign</p>
                <div className="space-y-1.5">
                  {attribution.byCampaign.map(c => (
                    <div key={c.campaign_id} className="flex items-center justify-between text-xs">
                      <span className="font-semibold truncate mr-2">{c.campaign}</span>
                      <span className="text-text-muted whitespace-nowrap">
                        {c.conversions} · <span className="text-green-600 font-bold">{formatValue(c.value)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(attribution.bySource || []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">By UTM Source</p>
                <div className="space-y-1.5">
                  {attribution.bySource.map(s => (
                    <div key={s.source} className="flex items-center justify-between text-xs">
                      <span className="font-semibold capitalize">{s.source || 'direct'}</span>
                      <span className="text-text-muted whitespace-nowrap">
                        {s.conversions} · <span className="text-green-600 font-bold">{formatValue(s.value)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Conversions */}
      {conversions.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold flex items-center gap-2"><Target size={16} className="text-green-600" /> Recent Conversions</h4>
            <span className="text-[10px] font-bold text-text-muted">Latest {conversions.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {conversions.map(c => (
              <div key={c.id} className="p-3 rounded-xl bg-gray-50 border border-border flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{c.campaign}</div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    {c.type || 'ORDER'}{c.order_id ? ` · #${c.order_id}` : ''} · {timeAgo(c.occurred_at)}
                  </div>
                </div>
                <span className="text-sm font-bold text-green-600 whitespace-nowrap">{formatValue(c.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Events Feed */}
      <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-border">
          <h4 className="font-bold flex items-center gap-2"><Radio size={16} /> Live Event Feed</h4>
          <div className="flex items-center gap-2">
            {['', 'IMPRESSION', 'CLICK', 'CONVERSION'].map(t => (
              <button key={t || 'all'}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${activeFilter === t ? 'bg-brand-black text-white border-brand-black' : 'border-border text-text-muted hover:border-brand-black/40'}`}
                onClick={() => setActiveFilter(t)}>
                {t || 'All'}
              </button>
            ))}
          </div>
        </div>

        {eventsLoading ? (
          <div className="py-12 flex flex-col items-center text-text-muted">
            <div className="spinner w-7 h-7 border-2 border-gray-300 border-t-brand-black rounded-full mb-2" />
            <p className="text-xs">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-text-muted py-10 text-center">No tracking events yet. Use a campaign's Click URL / Impression Pixel / Conversion webhook to start collecting data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Event</th>
                  <th className="text-left p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Campaign</th>
                  <th className="text-left p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">UTM</th>
                  <th className="text-left p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Device</th>
                  <th className="text-right p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">Value</th>
                  <th className="text-right p-3 text-[10px] font-bold text-text-muted uppercase tracking-wider">When</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 hover:bg-surface/30 transition-colors">
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full text-white"
                        style={{ background: EVENT_COLORS[e.event_type] || '#64748b' }}>
                        {e.event_type === 'IMPRESSION' ? <Eye size={10} /> : e.event_type === 'CLICK' ? <MousePointerClick size={10} /> : <Target size={10} />}
                        {e.event_type}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="text-xs font-semibold max-w-[160px] truncate">{e.campaign}</div>
                      {e.conversion_type && <div className="text-[9px] text-text-muted">{e.conversion_type}</div>}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {[e.utm_source, e.utm_medium, e.utm_campaign].filter(Boolean).map((u, i) => (
                          <span key={i} className="text-[9px] font-semibold bg-gray-100 border border-border px-1.5 py-0.5 rounded">{u}</span>
                        ))}
                        {!e.utm_source && !e.utm_medium && !e.utm_campaign && <span className="text-[10px] text-text-muted">direct</span>}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] font-semibold capitalize bg-gray-100 px-2 py-0.5 rounded-full border border-border">{e.device || 'unknown'}</span>
                    </td>
                    <td className="p-3 text-right">
                      {e.event_type === 'CONVERSION'
                        ? <span className="text-xs font-bold text-green-600">{formatValue(e.conversion_value)}{e.order_id ? ` · #${e.order_id}` : ''}</span>
                        : <span className="text-xs text-text-muted">—</span>}
                    </td>
                    <td className="p-3 text-right text-[10px] text-text-muted">{timeAgo(e.occurred_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {eventsMeta.last_page > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <span className="text-xs text-text-muted">Page {eventsPage} of {eventsMeta.last_page} ({eventsMeta.total} events)</span>
            <div className="flex gap-2">
              <button className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold hover:bg-surface disabled:opacity-30"
                disabled={eventsPage <= 1} onClick={() => { setEventsPage(eventsPage - 1); loadEvents(eventsPage - 1, activeFilter); }}>
                Previous
              </button>
              <button className="px-3 py-1.5 border border-border rounded-lg text-xs font-semibold hover:bg-surface disabled:opacity-30"
                disabled={eventsPage >= eventsMeta.last_page} onClick={() => { setEventsPage(eventsPage + 1); loadEvents(eventsPage + 1, activeFilter); }}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

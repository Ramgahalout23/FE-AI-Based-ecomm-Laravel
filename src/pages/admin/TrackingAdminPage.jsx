import {
  Users, Activity, Globe, TrendingUp, AlertTriangle, RefreshCw, Eye,
  Clock, BarChart3, Table2, ExternalLink, Download, Calendar, Search,
  Filter, ChevronLeft, ChevronRight, CheckCircle, Code, Layers, FileText
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { trackingAPI } from '../../api/tracking';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { getSourceLabel, getSourceColor, getSourceIcon } from '../../utils/trafficSource';

// ── Stable recharts config constants ──
const TRACKING_TICK_11 = { fontSize: 11 };
const TRACKING_TICK_10_W80 = { fontSize: 10, width: 80 };
const TRACKING_TICK_10_W100 = { fontSize: 10, width: 100 };
const TRACKING_TOOLTIP_STYLE = { borderRadius: 8, fontSize: '0.8rem' };
const TRACKING_BAR_RADIUS = [0, 4, 4, 0];
const TRACKING_MARGIN_L80 = { left: 80, right: 20 };
const TRACKING_MARGIN_L100 = { left: 100, right: 20 };

const TABS = [
  { id: 'overview', label: 'Overview', icon: Eye },
  { id: 'traffic-sources', label: 'Traffic Sources', icon: Globe },
  { id: 'events', label: 'Event Log', icon: Activity },
];

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'custom', label: 'Custom' },
];

const SOURCE_COLORS_PALETTE = [
  '#1877F2', '#E4405F', '#4285F4', '#25D366', '#1DA1F2', '#0A66C2',
  '#BD081C', '#26A5E4', '#FF0000', '#008373', '#6001D2', '#DE5833',
  '#EA4335', '#34A853', '#9AA0A6', '#80868B',
];

function formatElapsed(startTime) {
  if (!startTime) return 'Live';
  const start = new Date(startTime).getTime();
  const diffSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ${diffMin % 60}m ago`;
}

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-xl border border-border shadow-lg text-xs">
      <p className="font-bold text-text-primary">
        {getSourceIcon(d.source)} {getSourceLabel(d.source)}
      </p>
      <p className="text-text-muted mt-1">{d.count?.toLocaleString()} sessions</p>
      <p className="text-text-muted font-medium">({d.percentage}%)</p>
    </div>
  );
}

// ── Reusable Date Range Picker ──
function DateRangePicker({ dateRange, setDateRange, customStart, setCustomStart, customEnd, setCustomEnd, onRefresh, isRefreshing }) {
  const handleDateRangeClick = (value) => {
    if (value === 'custom' && !customStart) {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setCustomStart(start.toISOString().split('T')[0]);
      setCustomEnd(end.toISOString().split('T')[0]);
    }
    setDateRange(value);
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-border shadow-soft mb-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mr-1">Date Range:</span>
        <div className="flex flex-wrap gap-1 bg-surface p-1 rounded-xl border border-border">
          {DATE_RANGES.map(dr => (
            <button
              key={dr.value}
              type="button"
              onClick={() => handleDateRangeClick(dr.value)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                dateRange === dr.value
                  ? 'bg-brand-black text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/60'
              }`}
            >
              {dr.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {dateRange === 'custom' && (
          <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-xl border border-border">
            <Calendar size={13} className="text-text-muted shrink-0" />
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none"
            />
            <span className="text-xs text-text-muted">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none"
            />
            {(customStart || customEnd) && (
              <button
                type="button"
                onClick={() => {
                  setCustomStart('');
                  setCustomEnd('');
                  setDateRange('all');
                }}
                className="text-[10px] text-text-muted hover:text-red-500 font-bold ml-1"
                title="Reset custom range"
              >
                Reset
              </button>
            )}
          </div>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface hover:bg-surface-hover border border-border rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary transition-all disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Overview Tab ──
function OverviewTab({
  loading,
  chartsReady,
  dashboard,
  pageViews,
  events,
  activeSessions,
  dateRange,
  setDateRange,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  onRefresh,
  isRefreshing
}) {
  const stats = dashboard?.pageViewStats || { totalViews: 0, uniqueVisitors: 0 };
  const sessionStats = dashboard?.sessionStats || { totalSessions: 0, avgDuration: 0, bounceRate: 0 };
  const eventStats = dashboard?.eventStats || { totalEvents: 0 };

  const [sourceFilter, setSourceFilter] = useState('all');
  const [sessionSearch, setSessionSearch] = useState('');

  const uniqueSources = useMemo(() => {
    if (!Array.isArray(activeSessions)) return [];
    const sourceCounts = {};
    activeSessions.forEach(s => {
      const src = s.source || 'direct';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;
    });
    const items = Object.keys(sourceCounts).sort().map(src => ({
      source: src,
      count: sourceCounts[src]
    }));
    return [{ source: 'all', count: activeSessions.length }, ...items];
  }, [activeSessions]);

  const filteredSessions = useMemo(() => {
    if (!Array.isArray(activeSessions)) return [];
    let list = activeSessions;
    if (sourceFilter !== 'all') {
      list = list.filter(s => (s.source || 'direct') === sourceFilter);
    }
    if (sessionSearch.trim()) {
      const q = sessionSearch.toLowerCase().trim();
      list = list.filter(s =>
        (s.sessionId && s.sessionId.toLowerCase().includes(q)) ||
        (s.userId && s.userId.toLowerCase().includes(q)) ||
        (s.device && s.device.toLowerCase().includes(q)) ||
        (s.referrer && s.referrer.toLowerCase().includes(q)) ||
        (s.source && s.source.toLowerCase().includes(q))
      );
    }
    return list;
  }, [activeSessions, sourceFilter, sessionSearch]);

  const eventChartData = useMemo(() =>
    Array.isArray(events) ? events.slice(0, 10).map((e) => ({
      name: e.eventName || e.eventType,
      count: e._count?.id || e.count || 0,
    })) : [],
    [events]
  );

  const pageViewChartData = useMemo(() =>
    Array.isArray(pageViews) ? pageViews.slice(0, 8).map((p) => ({
      name: p.url ? (p.url.length > 30 ? p.url.substring(0, 30) + '...' : p.url) : 'Unknown',
      views: p._count?.url || p.count || 0,
    })) : [],
    [pageViews]
  );

  return (
    <>
      {/* Date Filter */}
      <DateRangePicker
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      {loading ? (
        <div className="flex items-center justify-center h-64 text-text-muted">
          <div className="text-center">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
            <p>Loading tracking data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><Eye size={18} /></div>
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Page Views</div>
              </div>
              <div className="text-2xl font-bold text-text-primary font-display">{(stats.totalViews || 0).toLocaleString()}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-green-100 text-green-600 flex items-center justify-center"><Users size={18} /></div>
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Unique Visitors</div>
              </div>
              <div className="text-2xl font-bold text-text-primary font-display">{(stats.uniqueVisitors || 0).toLocaleString()}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><Activity size={18} /></div>
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Events</div>
              </div>
              <div className="text-2xl font-bold text-text-primary font-display">{(eventStats.totalEvents || 0).toLocaleString()}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center"><Clock size={18} /></div>
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Avg Duration</div>
              </div>
              <div className="text-2xl font-bold text-text-primary font-display">{sessionStats.avgDuration || 0}s</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-red-100 text-red-600 flex items-center justify-center"><AlertTriangle size={18} /></div>
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Bounce Rate</div>
              </div>
              <div className="text-2xl font-bold text-text-primary font-display">{sessionStats.bounceRate || 0}%</div>
            </div>
          </div>

          {/* Session Overview Bar */}
          <div className="flex gap-4 mb-6 text-xs flex-wrap bg-white p-3.5 rounded-2xl border border-border shadow-soft items-center">
            <span className="font-semibold text-text-muted">Filtered Sessions: <strong className="text-text-primary">{sessionStats.totalSessions || 0}</strong></span>
            <span className="text-border">|</span>
            <span className="font-semibold text-text-muted flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Active Now (Last 15m): <strong className="text-green-600">{dashboard?.activeSessions || activeSessions?.length || 0}</strong>
            </span>
            <span className="text-border">|</span>
            <span className="font-semibold text-text-muted">Avg Duration: <strong className="text-text-primary">{sessionStats.avgDuration || 0}s</strong></span>
            <span className="text-border">|</span>
            <span className="font-semibold text-text-muted">Bounced: <strong className="text-red-600">{sessionStats.bounceRate || 0}%</strong></span>
          </div>

          {/* Top Pages & Events Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Top Pages */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <h3 className="font-display font-bold text-sm text-text-primary mb-4">Top Pages Visited</h3>
              {chartsReady ? (
                <div className="h-[280px]">
                  {pageViewChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pageViewChartData} layout="vertical" margin={TRACKING_MARGIN_L80} isAnimationActive={false}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={TRACKING_TICK_11} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" tick={TRACKING_TICK_10_W80} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={TRACKING_TOOLTIP_STYLE} />
                        <Bar dataKey="views" fill="#1a1a1a" radius={TRACKING_BAR_RADIUS} maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-text-muted text-sm">
                      <div className="text-center"><Eye size={32} className="mx-auto mb-2 opacity-50" /><p>No page view data in selected range</p></div>
                    </div>
                  )}
                </div>
              ) : <div style={{ height: 280 }} />}
            </div>

            {/* Events Breakdown */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <h3 className="font-display font-bold text-sm text-text-primary mb-4">Top Events Triggered</h3>
              {chartsReady ? (
                <div className="h-[280px]">
                  {eventChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eventChartData} layout="vertical" margin={TRACKING_MARGIN_L100} isAnimationActive={false}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                        <XAxis type="number" tick={TRACKING_TICK_11} axisLine={false} tickLine={false} />
                        <YAxis dataKey="name" type="category" tick={TRACKING_TICK_10_W100} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={TRACKING_TOOLTIP_STYLE} />
                        <Bar dataKey="count" fill="#8b5cf6" radius={TRACKING_BAR_RADIUS} maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-text-muted text-sm">
                      <div className="text-center"><Activity size={32} className="mx-auto mb-2 opacity-50" /><p>No event data in selected range</p></div>
                    </div>
                  )}
                </div>
              ) : <div style={{ height: 280 }} />}
            </div>
          </div>

          {/* Active Sessions Panel */}
          <div className="bg-white p-5 rounded-2xl border border-border shadow-soft mb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                <h3 className="font-display font-bold text-sm text-text-primary">Active Sessions</h3>
                <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-xs font-semibold">
                  {filteredSessions.length}
                  {sourceFilter !== 'all' || sessionSearch ? ` of ${activeSessions.length}` : ''} online
                </span>
              </div>

              {/* Search within active sessions */}
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  placeholder="Filter by ID, device, source..."
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-xl text-xs focus:outline-none focus:border-brand-black"
                />
              </div>
            </div>

            {/* Source Filter Chips */}
            {uniqueSources.length > 1 && (
              <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mr-1 shrink-0">Filter by Source:</span>
                {uniqueSources.map(item => (
                  <button
                    key={item.source}
                    type="button"
                    onClick={() => setSourceFilter(item.source)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${
                      sourceFilter === item.source
                        ? 'bg-brand-black text-white shadow-sm'
                        : 'bg-surface text-text-muted border border-border hover:border-brand-black/30 hover:text-text-primary'
                    }`}
                  >
                    {item.source === 'all' ? (
                      <>
                        <span>All</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">{item.count}</span>
                      </>
                    ) : (
                      <>
                        <span>{getSourceIcon(item.source)}</span>
                        <span>{getSourceLabel(item.source)}</span>
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${sourceFilter === item.source ? 'bg-white/20' : 'bg-border/60 text-text-primary'}`}>
                          {item.count}
                        </span>
                      </>
                    )}
                  </button>
                ))}
              </div>
            )}

            {Array.isArray(filteredSessions) && filteredSessions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Session ID</th>
                      <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">User</th>
                      <th className="text-center p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Page Views</th>
                      <th className="text-center p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Started</th>
                      <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Device / OS</th>
                      <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Traffic Source</th>
                      <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Referrer URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.slice(0, 20).map((s) => (
                      <tr key={s.id || s.sessionId} className="border-b border-border/50 hover:bg-surface/50 text-sm">
                        <td className="p-3 text-xs font-mono text-text-muted" title={s.sessionId}>
                          {s.sessionId?.substring(0, 16)}...
                        </td>
                        <td className="p-3 text-text-primary">
                          {s.userId ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                              User: {s.userId.substring(0, 8)}
                            </span>
                          ) : (
                            <span className="text-text-muted text-xs">Guest Visitor</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 bg-surface border border-border rounded-full text-xs font-bold text-text-primary">
                            {s.pageViews || 1}
                          </span>
                        </td>
                        <td className="p-3 text-center text-xs text-text-muted">
                          {formatElapsed(s.startTime || s.createdAt)}
                        </td>
                        <td className="p-3 text-xs text-text-muted">
                          {s.device || s.browser || s.os || 'Desktop'}
                        </td>
                        <td className="p-3">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border"
                            style={{
                              borderColor: `${getSourceColor(s.source)}40`,
                              backgroundColor: `${getSourceColor(s.source)}10`,
                              color: getSourceColor(s.source)
                            }}
                          >
                            <span>{getSourceIcon(s.source)}</span>
                            <span className="font-semibold">{getSourceLabel(s.source)}</span>
                          </span>
                        </td>
                        <td className="p-3 text-xs text-text-muted max-w-[150px] truncate" title={s.referrer || 'Direct'}>
                          {s.referrer || 'Direct Visit'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-text-muted text-sm">
                <Users size={28} className="mx-auto mb-2 opacity-50" />
                <p>No active sessions match the current filter.</p>
              </div>
            )}
          </div>

          {/* Quick Integration Guide */}
          <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <Code size={16} className="text-text-muted" />
              <h3 className="font-display font-bold text-sm text-text-primary">Tracking Integration</h3>
            </div>
            <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
              <p className="text-xs text-text-muted font-mono mb-3">
                Events and pageviews are automatically captured by the storefront tracking client. Manual hooks:
              </p>
              <div className="bg-gray-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
{`// 1. Automatic pageview with UTM parameters & referrer
trackingAPI.recordPageView({ url: window.location.href, title: document.title, referrer: document.referrer });

// 2. High-performance event batching
trackingAPI.recordEvents([{ eventType: 'click', eventName: 'add_to_cart', label: 'product_id_123' }]);

// 3. User session initialization with source attribution
trackingAPI.createSession({ sessionId: 'unique_session_id', landingPage: window.location.href });`}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// ── Traffic Sources Tab ──
function TrafficSourcesTab({ chartsReady }) {
  const [trafficData, setTrafficData] = useState({ sources: [], utmCampaigns: [] });
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const getParams = useCallback((range, start, end) => {
    const params = { dateRange: range || 'all' };
    if (range === 'custom') {
      if (start) params.startDate = start;
      if (end) params.endDate = end;
    }
    return params;
  }, []);

  const loadTrafficSources = useCallback((range, start, end) => {
    let mounted = true;
    setLoading(true);
    const params = getParams(range, start, end);
    trackingAPI.getTrafficSources?.(params)
      .then(r => {
        if (!mounted) return;
        const raw = r.data?.data || r.data;
        const sources = Array.isArray(raw) ? raw : (raw?.sources || []);
        const utmCampaigns = Array.isArray(raw) ? [] : (raw?.utmCampaigns || raw?.utm_campaigns || []);
        setTrafficData({
          sources,
          utmCampaigns,
        });
      })
      .catch(() => {
        if (mounted) setTrafficData({ sources: [], utmCampaigns: [] });
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [getParams]);

  useEffect(() => {
    return loadTrafficSources(dateRange, customStart, customEnd);
  }, [dateRange, customStart, customEnd, loadTrafficSources]);

  const totalSessions = useMemo(() =>
    trafficData.sources.reduce((sum, s) => sum + (s.count || 0), 0),
    [trafficData.sources]
  );

  const pieData = useMemo(() =>
    trafficData.sources.map((s, i) => ({
      source: s.source,
      count: s.count,
      percentage: totalSessions > 0 ? ((s.count / totalSessions) * 100).toFixed(1) : 0,
      fill: getSourceColor(s.source) || SOURCE_COLORS_PALETTE[i % SOURCE_COLORS_PALETTE.length],
    })),
    [trafficData.sources, totalSessions]
  );

  const getDateRangeLabel = useCallback(() => {
    if (dateRange !== 'custom') {
      return DATE_RANGES.find(dr => dr.value === dateRange)?.label || dateRange;
    }
    return customStart && customEnd ? `${customStart} to ${customEnd}` : 'Custom';
  }, [dateRange, customStart, customEnd]);

  const handleDownloadCSV = useCallback(() => {
    const rows = [['Source', 'Sessions', 'Percentage']];

    pieData.forEach(p => {
      rows.push([getSourceLabel(p.source), String(p.count), p.percentage + '%']);
    });

    rows.push(['TOTAL', String(totalSessions), '100%']);

    if (trafficData.utmCampaigns.length > 0) {
      rows.push([]);
      rows.push(['--- UTM Campaigns ---', '', '']);
      rows.push(['UTM Source', 'UTM Medium', 'UTM Campaign', 'Sessions']);
      trafficData.utmCampaigns.forEach(utm => {
        rows.push([utm.utm_source || '', utm.utm_medium || '', utm.utm_campaign || '', String(utm.count || 0)]);
      });
    }

    const csvContent = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const rangeLabel = getDateRangeLabel().replace(/[^a-zA-Z0-9]/g, '-');
    link.download = `traffic-sources-${rangeLabel}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [pieData, trafficData, totalSessions, getDateRangeLabel]);

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <DateRangePicker
        dateRange={dateRange}
        setDateRange={setDateRange}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
        onRefresh={() => loadTrafficSources(dateRange, customStart, customEnd)}
        isRefreshing={loading}
      />

      {loading ? (
        <div className="flex items-center justify-center h-64 text-text-muted">
          <div className="text-center">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
            <p>Loading traffic source data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center"><Globe size={18} /></div>
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Total Sessions</div>
              </div>
              <div className="text-2xl font-bold text-text-primary font-display">{totalSessions.toLocaleString()}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-green-100 text-green-600 flex items-center justify-center"><BarChart3 size={18} /></div>
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Traffic Sources</div>
              </div>
              <div className="text-2xl font-bold text-text-primary font-display">{trafficData.sources.length}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center"><TrendingUp size={18} /></div>
                <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">UTM Campaigns</div>
              </div>
              <div className="text-2xl font-bold text-text-primary font-display">{trafficData.utmCampaigns.length}</div>
            </div>
          </div>

          {/* Pie Chart + Source Breakdown Table */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold text-sm text-text-primary">Traffic Distribution</h3>
                {pieData.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDownloadCSV}
                    className="flex items-center gap-1.5 px-3 py-1 bg-surface border border-border rounded-lg text-xs font-semibold text-text-muted hover:text-text-primary transition-all"
                  >
                    <Download size={13} />
                    Export CSV
                  </button>
                )}
              </div>
              {chartsReady && pieData.length > 0 ? (
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="45%"
                        innerRadius={65}
                        outerRadius={110}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="source"
                        isAnimationActive={false}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={`cell-${i}`} fill={entry.fill} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {pieData.slice(0, 8).map((entry, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] text-text-muted">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span>{getSourceLabel(entry.source)}</span>
                        <span className="font-semibold text-text-primary">{entry.percentage}%</span>
                      </div>
                    ))}
                    {pieData.length > 8 && (
                      <span className="text-[10px] text-text-muted">+{pieData.length - 8} more</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[320px] text-text-muted text-sm">
                  <div className="text-center"><Globe size={32} className="mx-auto mb-2 opacity-50" /><p>No traffic source data in this period</p></div>
                </div>
              )}
            </div>

            {/* Source Breakdown Table */}
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <h3 className="font-display font-bold text-sm text-text-primary mb-4">Traffic Channel Details</h3>
              {pieData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Source</th>
                        <th className="text-right p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Sessions</th>
                        <th className="text-right p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Share</th>
                        <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pieData.map((entry, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-surface/50 text-sm">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{getSourceIcon(entry.source)}</span>
                              <span className="text-xs font-semibold text-text-primary">{getSourceLabel(entry.source)}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right text-xs font-semibold text-text-primary">{entry.count.toLocaleString()}</td>
                          <td className="p-3 text-right text-xs text-text-muted">{entry.percentage}%</td>
                          <td className="p-3">
                            <div className="w-full bg-gray-100 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{ width: `${entry.percentage}%`, backgroundColor: entry.fill }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-[320px] text-text-muted text-sm">
                  <div className="text-center"><Table2 size={32} className="mx-auto mb-2 opacity-50" /><p>No traffic sources found</p></div>
                </div>
              )}
            </div>
          </div>

          {/* UTM Campaign Stats */}
          {trafficData.utmCampaigns.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <ExternalLink size={16} className="text-text-muted" />
                <h3 className="font-display font-bold text-sm text-text-primary">UTM Campaign Performance</h3>
                <span className="text-[10px] text-text-muted ml-auto font-semibold">{trafficData.utmCampaigns.length} campaigns</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Source</th>
                      <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Medium</th>
                      <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Campaign</th>
                      <th className="text-right p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trafficData.utmCampaigns.map((utm, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-surface/50 text-sm">
                        <td className="p-3 text-xs text-text-primary font-medium">{utm.utm_source || '—'}</td>
                        <td className="p-3 text-xs text-text-muted">{utm.utm_medium || '—'}</td>
                        <td className="p-3 text-xs text-text-muted">
                          <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md text-[10px] font-mono">
                            {utm.utm_campaign || '—'}
                          </span>
                        </td>
                        <td className="p-3 text-right text-xs font-semibold text-text-primary">{utm.count?.toLocaleString() || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Event Log Tab ──
const EVENT_TYPES = [
  { value: 'all', label: 'All Events' },
  { value: 'page_view', label: 'Page Views' },
  { value: 'click', label: 'Clicks' },
  { value: 'add_to_cart', label: 'Add to Cart' },
  { value: 'checkout_start', label: 'Checkout' },
  { value: 'search', label: 'Search' },
  { value: 'custom', label: 'Custom' },
];

function getEventTypeBadge(type) {
  const t = String(type || '').toLowerCase();
  if (t === 'add_to_cart') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (t === 'checkout_start' || t === 'checkout_complete') return 'bg-purple-50 text-purple-700 border-purple-200';
  if (t === 'click') return 'bg-blue-50 text-blue-700 border-blue-200';
  if (t === 'page_view') return 'bg-gray-100 text-gray-700 border-gray-200';
  if (t === 'search') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-indigo-50 text-indigo-700 border-indigo-200';
}

function EventLogTab() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 25;
  const [eventType, setEventType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedMetadata, setSelectedMetadata] = useState(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        dateRange: dateRange || 'all',
      };
      if (eventType !== 'all') params.eventType = eventType;
      if (dateRange === 'custom') {
        if (customStart) params.startDate = customStart;
        if (customEnd) params.endDate = customEnd;
      }
      const res = await trackingAPI.getEvents(params);
      const data = res.data?.data || res.data || [];
      const items = Array.isArray(data) ? data : (data.items || []);
      const totalCount = res.data?.meta?.total || data.total || items.length;
      setEvents(items);
      setTotal(totalCount);
    } catch (err) {
      console.warn('Failed to load events:', err);
      setEvents([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, eventType, dateRange, customStart, customEnd]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase().trim();
    return events.filter(e =>
      (e.eventName && e.eventName.toLowerCase().includes(q)) ||
      (e.eventType && e.eventType.toLowerCase().includes(q)) ||
      (e.url && e.url.toLowerCase().includes(q)) ||
      (e.sessionId && e.sessionId.toLowerCase().includes(q)) ||
      (e.userId && e.userId.toLowerCase().includes(q))
    );
  }, [events, searchQuery]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6">
      {/* Date Range Picker */}
      <DateRangePicker
        dateRange={dateRange}
        setDateRange={(val) => { setDateRange(val); setPage(1); }}
        customStart={customStart}
        setCustomStart={setCustomStart}
        customEnd={customEnd}
        setCustomEnd={setCustomEnd}
        onRefresh={loadEvents}
        isRefreshing={loading}
      />

      {/* Filter Bar: Event Types & Search */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-soft flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider mr-1">Event Type:</span>
          <div className="flex flex-wrap gap-1 bg-surface p-1 rounded-xl border border-border">
            {EVENT_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setEventType(t.value); setPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  eventType === t.value
                    ? 'bg-brand-black text-white shadow-sm'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search events, URLs, sessions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-xl text-xs focus:outline-none focus:border-brand-black"
          />
        </div>
      </div>

      {/* Event Log Table */}
      <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-text-muted" />
            <h3 className="font-display font-bold text-sm text-text-primary">Live Event Stream</h3>
          </div>
          <span className="text-xs text-text-muted">
            Showing <strong className="text-text-primary">{filteredEvents.length}</strong> of {total.toLocaleString()} events
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 text-text-muted">
            <div className="text-center">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
              <p>Fetching events...</p>
            </div>
          </div>
        ) : filteredEvents.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Time</th>
                    <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Type</th>
                    <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Event Name</th>
                    <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">URL / Target</th>
                    <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">User / Session</th>
                    <th className="text-right p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((evt) => {
                    const timeStr = evt.createdAt ? new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—';
                    const dateStr = evt.createdAt ? new Date(evt.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : '';
                    return (
                      <tr key={evt.id} className="border-b border-border/50 hover:bg-surface/50 text-sm">
                        <td className="p-3 text-xs text-text-muted whitespace-nowrap">
                          <span className="font-medium text-text-primary">{timeStr}</span>
                          <span className="block text-[10px] text-text-muted">{dateStr}</span>
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${getEventTypeBadge(evt.eventType)}`}>
                            {evt.eventType}
                          </span>
                        </td>
                        <td className="p-3 text-xs font-mono font-medium text-text-primary">
                          {evt.eventName}
                        </td>
                        <td className="p-3 text-xs text-text-muted max-w-[200px] truncate" title={evt.url}>
                          {evt.url || '—'}
                        </td>
                        <td className="p-3 text-xs font-mono text-text-muted" title={evt.sessionId}>
                          {evt.userId ? (
                            <span className="text-blue-600 font-medium">User: {evt.userId.substring(0, 8)}</span>
                          ) : (
                            <span>{evt.sessionId ? evt.sessionId.substring(0, 12) + '...' : 'Guest'}</span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          {evt.metadata ? (
                            <button
                              type="button"
                              onClick={() => setSelectedMetadata(evt)}
                              className="px-2 py-1 bg-surface hover:bg-surface-hover border border-border rounded-md text-[10px] font-semibold text-text-muted hover:text-text-primary transition-all"
                            >
                              View Payload
                            </button>
                          ) : (
                            <span className="text-[10px] text-text-muted">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
              <span className="text-xs text-text-muted">
                Page {page} of {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 bg-surface border border-border rounded-lg text-text-muted hover:text-text-primary disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-text-muted text-sm">
            <Activity size={28} className="mx-auto mb-2 opacity-50" />
            <p>No events found for the selected criteria.</p>
          </div>
        )}
      </div>

      {/* Metadata Modal */}
      {selectedMetadata && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto border border-border shadow-2xl">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-border">
              <h4 className="font-display font-bold text-sm text-text-primary">
                Event Payload: {selectedMetadata.eventName}
              </h4>
              <button
                type="button"
                onClick={() => setSelectedMetadata(null)}
                className="text-text-muted hover:text-text-primary text-xs font-bold"
              >
                Close
              </button>
            </div>
            <pre className="bg-gray-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {typeof selectedMetadata.metadata === 'string'
                ? selectedMetadata.metadata
                : JSON.stringify(selectedMetadata.metadata, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ──
export default function TrackingAdminPage() {
  const [tab, setTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartsReady, setChartsReady] = useState(false);
  const [events, setEvents] = useState([]);
  const [pageViews, setPageViews] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);

  // Overview date range state
  const [dateRange, setDateRange] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const loadOverviewData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const params = { dateRange: dateRange || 'all' };
      if (dateRange === 'custom') {
        if (customStart) params.startDate = customStart;
        if (customEnd) params.endDate = customEnd;
      }

      const [dashRes, eventsRes, viewsRes, sessionsRes] = await Promise.all([
        trackingAPI.getTrackingDashboard(params).catch(() => ({ data: null })),
        trackingAPI.getEventStats(params).catch(() => ({ data: null })),
        trackingAPI.getPageViewStats(params).catch(() => ({ data: null })),
        trackingAPI.getActiveSessions().catch(() => ({ data: null })),
      ]);

      setDashboard(dashRes.data?.data || dashRes.data);
      setEvents(eventsRes.data?.data?.eventTypeBreakdown || []);
      setPageViews(viewsRes.data?.data?.topPages || []);
      setActiveSessions(sessionsRes.data?.data || []);
    } catch (e) {
      console.warn('Tracking data load failed:', e);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [dateRange, customStart, customEnd]);

  // Delay chart rendering until after layout is computed
  useEffect(() => {
    if (loading) return;
    const raf = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(raf);
  }, [loading]);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-text-primary">User Tracking & Analytics</h2>
          <p className="text-sm text-text-muted">Visitor behavior tracking, sessions, traffic sources attribution, and live telemetry</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-surface p-1 rounded-xl w-fit border border-border">
        {TABS.map(t => {
          const Icon = t.icon;
          const isActive = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                isActive
                  ? 'bg-brand-black text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/50'
              }`}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <OverviewTab
          loading={loading}
          chartsReady={chartsReady}
          dashboard={dashboard}
          pageViews={pageViews}
          events={events}
          activeSessions={activeSessions}
          dateRange={dateRange}
          setDateRange={setDateRange}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
          onRefresh={() => loadOverviewData(true)}
          isRefreshing={isRefreshing}
        />
      )}
      {tab === 'traffic-sources' && (
        <TrafficSourcesTab chartsReady={chartsReady} />
      )}
      {tab === 'events' && (
        <EventLogTab />
      )}
    </div>
  );
}

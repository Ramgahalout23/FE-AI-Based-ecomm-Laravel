import { Users, Activity, Globe, TrendingUp, AlertTriangle, RefreshCw, Eye, Clock, BarChart3, Table2, ExternalLink, Download, Calendar } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { trackingAPI } from '../../api/tracking';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { getSourceLabel, getSourceColor, getSourceIcon } from '../../utils/trafficSource';

// ── Stable recharts config constants (stable references prevent re-render loops) ──
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
];

const SOURCE_COLORS_PALETTE = [
  '#1877F2', '#E4405F', '#4285F4', '#25D366', '#1DA1F2', '#0A66C2',
  '#BD081C', '#26A5E4', '#FF0000', '#008373', '#6001D2', '#DE5833',
  '#EA4335', '#34A853', '#9AA0A6', '#80868B',
];

function CustomPieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-xl border border-border shadow-lg text-xs">
      <p className="font-bold text-text-primary">
        {getSourceIcon(d.source)} {getSourceLabel(d.source)}
      </p>
      <p className="text-text-muted mt-1">{d.count?.toLocaleString()} sessions</p>
      <p className="text-text-muted">({d.percentage}%)</p>
    </div>
  );
}

// ── Overview Tab ──
function OverviewTab({ loading, chartsReady, dashboard, pageViews, events, activeSessions }) {
  const stats = dashboard?.pageViewStats || { totalViews: 0, uniqueVisitors: 0 };
  const sessionStats = dashboard?.sessionStats || { totalSessions: 0, avgDuration: 0, bounceRate: 0 };
  const eventStats = dashboard?.eventStats || { totalEvents: 0 };
  const [sourceFilter, setSourceFilter] = useState('all');

  const uniqueSources = useMemo(() => {
    if (!Array.isArray(activeSessions)) return [];
    const sources = new Set();
    activeSessions.forEach(s => {
      if (s.source) sources.add(s.source);
    });
    return ['all', ...Array.from(sources).sort()];
  }, [activeSessions]);

  const filteredSessions = useMemo(() => {
    if (!Array.isArray(activeSessions)) return [];
    if (sourceFilter === 'all') return activeSessions;
    return activeSessions.filter(s => s.source === sourceFilter);
  }, [activeSessions, sourceFilter]);

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

    if (loading) return <div className="flex items-center justify-center h-64 text-text-muted"><div className="text-center"><RefreshCw size={24} className="animate-spin mx-auto mb-2" /><p>Loading tracking data...</p></div></div>;

  return (
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
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Avg Session</div>
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

      {/* Session Stats */}
      {dashboard?.sessionStats && (
        <div className="flex gap-4 mb-6 text-xs flex-wrap">
          <span className="font-semibold text-text-muted">Total Sessions: <strong className="text-text-primary">{sessionStats.totalSessions || 0}</strong></span>
          <span className="font-semibold text-text-muted">Active Now: <strong className="text-green-600">{dashboard.activeSessions || 0}</strong></span>
          <span className="font-semibold text-text-muted">Avg Duration: <strong className="text-text-primary">{sessionStats.avgDuration || 0}s</strong></span>
          <span className="font-semibold text-text-muted">Bounced: <strong className="text-red-600">{sessionStats.bounceRate || 0}%</strong></span>
        </div>
      )}

      {/* Top Pages & Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Top Pages */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
          <h3 className="font-display font-bold text-sm text-text-primary mb-4">Top Pages</h3>
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
                <div className="text-center"><Eye size={32} /><p>No page view data yet</p></div>
              </div>
            )}
          </div>
          ) : <div style={{ height: 280 }} />}
        </div>

        {/* Events Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
          <h3 className="font-display font-bold text-sm text-text-primary mb-4">Events Breakdown</h3>
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
                <div className="text-center"><Activity size={32} /><p>No event data recorded yet</p></div>
              </div>
            )}
          </div>
          ) : <div style={{ height: 280 }} />}
        </div>
      </div>

      {/* Active Sessions with Source Filter */}
      <div className="bg-white p-5 rounded-2xl border border-border shadow-soft mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-display font-bold text-sm text-text-primary">Active Sessions</h3>
          <span className="text-xs text-text-muted ml-auto">
            {filteredSessions.length}
            {sourceFilter !== 'all' ? ` of ${activeSessions.length}` : ''} active
          </span>
        </div>

        {/* Source Filter Chips */}
        {uniqueSources.length > 1 && (
          <div className="flex items-center gap-1.5 mb-4 overflow-x-auto pb-1">
            <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mr-1 shrink-0">Source:</span>
            {uniqueSources.map(source => (
              <button
                key={source}
                onClick={() => setSourceFilter(source)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 ${
                  sourceFilter === source
                    ? 'bg-brand-black text-white shadow-sm'
                    : 'bg-surface text-text-muted border border-border hover:border-brand-black/30 hover:text-text-primary'
                }`}
              >
                {source === 'all' ? (
                  'All'
                ) : (
                  <><span>{getSourceIcon(source)}</span><span>{getSourceLabel(source)}</span></>
                )}
              </button>
            ))}
          </div>
        )}

        {Array.isArray(activeSessions) && activeSessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Session ID</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">User</th>
                  <th className="text-center p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Page Views</th>
                  <th className="text-center p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Duration</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Device</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Source</th>
                  <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Referrer</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.slice(0, 10).map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-surface/50 text-sm">
                    <td className="p-3 text-xs font-mono text-text-muted">{s.sessionId?.substring(0, 12)}...</td>
                    <td className="p-3 text-text-primary">{s.userId ? s.userId.substring(0, 8) : 'Guest'}</td>
                    <td className="p-3 text-center">{s.pageViews || 0}</td>
                    <td className="p-3 text-center text-xs text-text-muted">{s.duration ? s.duration + 's' : 'Live'}</td>
                    <td className="p-3 text-xs text-text-muted">{s.device || s.browser || '—'}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium" title={s.source || 'Direct'}>
                        <span>{getSourceIcon(s.source)}</span>
                        <span className="text-text-primary">{getSourceLabel(s.source)}</span>
                      </span>
                    </td>
                    <td className="p-3 text-xs text-text-muted max-w-[120px] truncate">{s.referrer || 'Direct'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-text-muted text-sm"><Users size={24} /><p>No active sessions. When users visit the store, their sessions will appear here.</p></div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
        <h3 className="font-display font-bold text-sm text-text-primary mb-3">Tracking Integration</h3>
        <div className="bg-surface/50 rounded-xl p-4 border border-border/50">
          <p className="text-xs text-text-muted font-mono mb-3">To start tracking user behavior, integrate the tracking script on your storefront:</p>
          <div className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto">
{`// Track page views
trackingAPI.recordPageView({ url: window.location.href, title: document.title, referrer: document.referrer });

// Track custom events
trackingAPI.recordEvent({ eventType: 'click', eventName: 'add_to_cart', label: 'product_123' });

// Start session
trackingAPI.createSession({ sessionId: 'unique_session_id', landingPage: window.location.href });`}
          </div>
        </div>
      </div>
    </>
  );
}

const DATE_RANGES = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'custom', label: 'Custom' },
];

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
        const data = r.data?.data || r.data || {};
        setTrafficData({
          sources: data.sources || [],
          utmCampaigns: data.utm_campaigns || [],
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

  const handleDateRangeClick = (value) => {
    if (value === 'custom' && !customStart) {
      // Set defaults: last 30 days
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 30);
      setCustomStart(start.toISOString().split('T')[0]);
      setCustomEnd(end.toISOString().split('T')[0]);
    }
    setDateRange(value);
  };

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
    return customStart && customEnd
      ? `${customStart} to ${customEnd}`
      : 'Custom';
  }, [dateRange, customStart, customEnd]);

  const handleDownloadCSV = useCallback(() => {
    const rows = [['Source', 'Sessions', 'Percentage']];

    pieData.forEach(p => {
      rows.push([getSourceLabel(p.source), String(p.count), p.percentage + '%']);
    });

    // Add total row
    rows.push(['TOTAL', String(totalSessions), '100%']);

    // Add UTM data section if available
    if (trafficData.utmCampaigns.length > 0) {
      rows.push([]);
      rows.push(['--- UTM Campaigns ---', '', '']);
      rows.push(['UTM Source', 'UTM Medium', 'UTM Campaign', 'Sessions']);
      trafficData.utmCampaigns.forEach(utm => {
        rows.push([utm.utm_source || '', utm.utm_medium || '', utm.utm_campaign || '', String(utm.count || 0)]);
      });
    }

    const csvContent = rows.map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\\n');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        <div className="text-center"><RefreshCw size={24} className="animate-spin mx-auto mb-2" /><p>Loading traffic source data...</p></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Date Range Filter & Export */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Date Range:</span>
            <div className="flex gap-1 bg-surface p-0.5 rounded-lg border border-border">
              {DATE_RANGES.map(dr => (
                <button
                  key={dr.value}
                  onClick={() => handleDateRangeClick(dr.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    dateRange === dr.value
                      ? 'bg-brand-black text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary hover:bg-white/50'
                  }`}
                >
                  {dr.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {trafficData.sources.length > 0 && (
              <span className="text-xs text-text-muted">
                <strong className="text-text-primary">{totalSessions.toLocaleString()}</strong> sessions
              </span>
            )}
            {pieData.length > 0 && (
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-border rounded-lg text-xs font-semibold text-text-muted hover:text-text-primary hover:border-brand-black/30 hover:bg-surface transition-all"
              >
                <Download size={13} />
                Download CSV
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Picker */}
        {dateRange === 'custom' && (
          <div className="flex items-center gap-3">
            <Calendar size={14} className="text-text-muted shrink-0" />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium bg-white focus:outline-none focus:border-brand-black transition-colors"
              />
              <span className="text-xs text-text-muted">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 border border-border rounded-lg text-xs font-medium bg-white focus:outline-none focus:border-brand-black transition-colors"
              />
              {(customStart || customEnd) && (
                <button
                  onClick={() => {
                    setCustomStart('');
                    setCustomEnd('');
                    setDateRange('all');
                  }}
                  className="px-2 py-1 text-xs text-text-muted hover:text-red-500 transition-colors"
                  title="Clear custom range"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>

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
            <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Source Types</div>
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

      {/* Pie Chart + Source Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
          <h3 className="font-display font-bold text-sm text-text-primary mb-4">Traffic Source Distribution</h3>
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
              <div className="text-center"><Globe size={32} /><p>No traffic source data yet</p></div>
            </div>
          )}
        </div>

        {/* Source Breakdown Table */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
          <h3 className="font-display font-bold text-sm text-text-primary mb-4">Source Breakdown</h3>
          {pieData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Source</th>
                    <th className="text-right p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Sessions</th>
                    <th className="text-right p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Percentage</th>
                    <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Bar</th>
                  </tr>
                </thead>
                <tbody>
                  {pieData.map((entry, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-surface/50 text-sm">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{getSourceIcon(entry.source)}</span>
                          <span className="text-xs font-medium text-text-primary">{getSourceLabel(entry.source)}</span>
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
              <div className="text-center"><Table2 size={32} /><p>No traffic source data recorded yet</p></div>
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
            <span className="text-[10px] text-text-muted ml-auto">{trafficData.utmCampaigns.length} campaigns</span>
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

      {/* Empty State */}
      {pieData.length === 0 && trafficData.utmCampaigns.length === 0 && (
        <div className="bg-white p-12 rounded-2xl border border-border shadow-soft text-center">
          <Globe size={48} className="mx-auto mb-4 text-text-muted/40" />
          <h3 className="font-display font-bold text-base text-text-primary mb-2">No Traffic Source Data Yet</h3>
          <p className="text-sm text-text-muted max-w-md mx-auto">
            Traffic source data will appear here once users start visiting your store. 
            The system automatically detects sources from referrer URLs and UTM parameters.
          </p>
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-surface rounded-xl text-xs text-text-muted">
            <span>🔗</span>
            <span>Sources detected: Facebook, Instagram, Google, WhatsApp, Twitter, LinkedIn, Pinterest, Email, Direct & more</span>
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
  const [chartsReady, setChartsReady] = useState(false);
  const [events, setEvents] = useState([]);
  const [pageViews, setPageViews] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, eventsRes, viewsRes, sessionsRes] = await Promise.all([
        trackingAPI.getTrackingDashboard().catch(() => ({ data: null })),
        trackingAPI.getEventStats().catch(() => ({ data: null })),
        trackingAPI.getPageViewStats().catch(() => ({ data: null })),
        trackingAPI.getActiveSessions().catch(() => ({ data: null })),
      ]);
      setDashboard(dashRes.data?.data || dashRes.data);
      setEvents(eventsRes.data?.data?.eventTypeBreakdown || []);
      setPageViews(viewsRes.data?.data?.topPages || []);
      setActiveSessions(sessionsRes.data?.data || []);
    } catch (e) { console.warn('Tracking data load failed:', e); }
    setLoading(false);
  }, []);

  // Delay chart rendering until after layout is computed — prevents recharts -1 width/height
  useEffect(() => {
    if (loading) return;
    const raf = requestAnimationFrame(() => setChartsReady(true));
    return () => cancelAnimationFrame(raf);
  }, [loading]);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-text-primary">User Tracking & Analytics</h2>
          <p className="text-sm text-text-muted">Advanced user behavior tracking, sessions, events, and traffic source analytics</p>
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
        />
      )}
      {tab === 'traffic-sources' && (
        <TrafficSourcesTab chartsReady={chartsReady} />
      )}
    </div>
  );
}

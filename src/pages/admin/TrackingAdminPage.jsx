import { Users, Activity, MousePointerClick, Globe, Search, TrendingUp, AlertTriangle, RefreshCw, Eye, Clock } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { trackingAPI } from '../../api/tracking';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend, LineChart, Line } from 'recharts';

;

const COLORS = ['#1a1a1a', '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ── Stable recharts config constants (stable references prevent re-render loops) ──
const TRACKING_TICK_11 = { fontSize: 11 };
const TRACKING_TICK_10_W80 = { fontSize: 10, width: 80 };
const TRACKING_TICK_10_W100 = { fontSize: 10, width: 100 };
const TRACKING_TOOLTIP_STYLE = { borderRadius: 8, fontSize: '0.8rem' };
const TRACKING_BAR_RADIUS = [0, 4, 4, 0];
const TRACKING_MARGIN_L80 = { left: 80, right: 20 };
const TRACKING_MARGIN_L100 = { left: 100, right: 20 };

export default function TrackingAdminPage() {
  const [tab, setTab] = useState('overview');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [pageViews, setPageViews] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [dateRange, setDateRange] = useState('7d');

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

  useEffect(() => { loadData(); }, [loadData]);

  const stats = dashboard?.pageViewStats || { totalViews: 0, uniqueVisitors: 0 };
  const sessionStats = dashboard?.sessionStats || { totalSessions: 0, avgDuration: 0, bounceRate: 0 };
  const eventStats = dashboard?.eventStats || { totalEvents: 0 };

  // Prepare event chart data
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
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-display text-2xl font-bold text-text-primary">User Tracking & Analytics</h2>
          <p className="text-sm text-text-muted">Advanced user behavior tracking, sessions, events, and journey mapping</p>
        </div>
      </div>

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
            <div className="w-9 h-9 rounded-lg bg-green-100 text-green-600 flex items-center justify-center"><User size={18} s /></div>
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
          <div className="h-[280px]">
            {pageViewChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pageViewChartData} layout="vertical" margin={TRACKING_MARGIN_L80} isAnimationActive={false}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <X Axis type="number" tick={TRACKING_TICK_11} axisLine={false} tickLine={false} />
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
        </div>

        {/* Events Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-soft">
          <h3 className="font-display font-bold text-sm text-text-primary mb-4">Events Breakdown</h3>
          <div className="h-[280px]">
            {eventChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventChartData} layout="vertical" margin={TRACKING_MARGIN_L100} isAnimationActive={false}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <X Axis type="number" tick={TRACKING_TICK_11} axisLine={false} tickLine={false} />
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
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white p-5 rounded-2xl border border-border shadow-soft mb-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <h3 className="font-display font-bold text-sm text-text-primary">Active Sessions</h3>
          <span className="text-xs text-text-muted ml-auto">{Array.isArray(activeSessions) ? activeSessions.length : 0} active</span>
        </div>
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
                  <th className="text-left p-3 text-[10px] font-semibold text-text-muted uppercase tracking-wider">Referrer</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.slice(0, 10).map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-surface/50 text-sm">
                    <td className="p-3 text-xs font-mono text-text-muted">{s.sessionId?.substring(0, 12)}...</td>
                    <td className="p-3 text-text-primary">{s.userId ? s.userId.substring(0, 8) : 'Guest'}</td>
                    <td className="p-3 text-center">{s.pageViews || 0}</td>
                    <td className="p-3 text-center text-xs text-text-muted">{s.duration ? s.duration + 's' : 'Live'}</td>
                    <td className="p-3 text-xs text-text-muted">{s.device || s.browser || '—'}</td>
                    <td className="p-3 text-xs text-text-muted max-w-[120px] truncate">{s.referrer || 'Direct'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-text-muted text-sm"><User size={24} s /><p>No active sessions. When users visit the store, their sessions will appear here.</p></div>
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
    </div>
  );
}

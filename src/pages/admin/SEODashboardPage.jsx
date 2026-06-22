import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import toast from '../../utils/toast';
import { Award, BarChart3, Globe, FileText, GitBranch, Edit3, RefreshCw,
  TrendingUp, TrendingDown, Minus, CheckCircle, AlertTriangle, XCircle,
  Search, ArrowRight, Zap, ExternalLink, Loader, Settings,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';

function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        flex: 1, minWidth: '160px', padding: '1.25rem', background: '#fff',
        borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
        cursor: onClick ? 'pointer' : 'default', transition: 'all 0.2s',
      }}
      className="hover-shadow"
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={20} color={color} />
        </div>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, lineHeight: 1.2 }}>{value}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{label}</div>
        </div>
      </div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>{sub}</div>}
    </div>
  );
}

function ScoreBar({ label, pct, color }) {
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'var(--muted)' }}>{pct}%</span>
      </div>
      <div style={{ height: '8px', background: 'var(--off-white)', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: pct + '%', background: color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  );
}

function ScoreDistChart({ distribution }) {
  if (!distribution) return null;
  const total = (distribution.excellent || 0) + (distribution.good || 0) + (distribution.needs_work || 0) + (distribution.poor || 0);
  if (total === 0) return <div style={{ fontSize: '0.78rem', color: 'var(--muted)', textAlign: 'center', padding: '1rem' }}>No audited entities yet</div>;

  const items = [
    { label: 'Excellent (80-100)', value: distribution.excellent || 0, color: '#22c55e', pct: Math.round(((distribution.excellent || 0) / total) * 100) },
    { label: 'Good (60-79)', value: distribution.good || 0, color: '#3b82f6', pct: Math.round(((distribution.good || 0) / total) * 100) },
    { label: 'Needs Work (40-59)', value: distribution.needs_work || 0, color: '#f59e0b', pct: Math.round(((distribution.needs_work || 0) / total) * 100) },
    { label: 'Poor (0-39)', value: distribution.poor || 0, color: '#ef4444', pct: Math.round(((distribution.poor || 0) / total) * 100) },
  ];
  return (
    <div>
      {/* Stacked bar */}
      <div style={{ display: 'flex', height: '24px', borderRadius: '12px', overflow: 'hidden', marginBottom: '0.75rem' }}>
        {items.filter(i => i.value > 0).map(i => (
          <div key={i.label} style={{ width: i.pct + '%', background: i.color, minWidth: '4px', position: 'relative', transition: 'width 0.6s ease' }} title={`${i.label}: ${i.value}`} />
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
        {items.map(i => (
          <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: i.color, flexShrink: 0 }} />
            <span style={{ color: 'var(--muted)' }}>{i.label}: <strong>{i.value}</strong></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(date) {
  if (!date) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function SEODashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(60);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [tick, setTick] = useState(0);
  const loadDashboardRef = useRef();

  const loadDashboard = async () => {
    try {
      const res = await adminAPI.getSEODashboard();
      setData(res.data?.data || null);
      setCountdown(60);
      setLastRefreshed(new Date());
    } catch (e) {
      console.warn('Failed to load SEO dashboard:', e);
      toast.error('Failed to load SEO dashboard');
    } finally {
      setLoading(false);
    }
  };

  loadDashboardRef.current = loadDashboard;

  // Initial load
  useEffect(() => {
    loadDashboard();
  }, []);

  // Auto-refresh every 60 seconds (only when enabled)
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadDashboardRef.current();
    }, 60000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Reset countdown when re-enabling auto-refresh
  useEffect(() => {
    if (autoRefresh) setCountdown(60);
  }, [autoRefresh]);

  // Countdown tick (always runs to show paused state)
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Re-render every 30s so relative time stays current
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
          <Loader size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.75rem' }} />
          <p>Loading SEO Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
          <BarChart3 size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p>Unable to load SEO dashboard data.</p>
          <button className="btn-dark btn-sm" onClick={loadDashboard} style={{ marginTop: '0.75rem' }}>Retry</button>
        </div>
      </div>
    );
  }

  const { overview, seo_coverage, scores, score_trend, global_seo, robots, sitemap, advanced, recent_updates } = data;
  const coverageColor = overview.seo_coverage_pct >= 80 ? '#22c55e' : overview.seo_coverage_pct >= 50 ? '#f59e0b' : '#ef4444';
  const avgScoreColor = scores.average_score >= 80 ? '#22c55e' : scores.average_score >= 60 ? '#3b82f6' : scores.average_score >= 40 ? '#f59e0b' : '#ef4444';
  const trendDirection = score_trend?.direction;
  const trendChange = score_trend?.week_over_week_change || 0;
  const trendDaily = score_trend?.daily || [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BarChart3 size={24} color="var(--gold)" /> SEO Dashboard
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
            Overview of your store's SEO health, coverage, and performance
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setAutoRefresh(prev => !prev)}
            title={autoRefresh ? 'Click to pause auto-refresh' : 'Click to enable auto-refresh'}
            style={{
              fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '4px 10px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              background: autoRefresh ? '#f0fdf4' : '#f5f5f5',
              transition: 'all 0.2s',
            }}
          >
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: autoRefresh ? '#22c55e' : '#9ca3af',
              animation: autoRefresh ? 'pulse-dot 2s ease-in-out infinite' : 'none',
              transition: 'all 0.3s',
            }} />
            {autoRefresh ? `${countdown}s` : 'Paused'}
          </button>
          <span style={{ fontSize: '0.68rem', color: 'var(--muted)', opacity: 0.7, whiteSpace: 'nowrap' }}>
            {lastRefreshed
              ? `${timeAgo(lastRefreshed)} · ${lastRefreshed.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`
              : '—'}
          </span>
          <button className="btn-dark btn-sm" onClick={() => navigate('/admin/seo?tab=global')}>
            <Globe size={14} /> Edit Global SEO
          </button>
          <button className="btn-ghost btn-sm" onClick={loadDashboard}>
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <StatCard icon={Award} label="Avg SEO Score" value={scores.average_score} sub={`${scores.scored_entities} entities scored`} color={avgScoreColor} />
        <StatCard icon={Globe} label="SEO Coverage" value={overview.seo_coverage_pct + '%'} sub={`${overview.seo_records_count}/${overview.total_entities} entities`} color={coverageColor} />
        <StatCard icon={GitBranch} label="Sitemap Entries" value={sitemap.entries_count} sub={`Last: ${formatDate(sitemap.last_generated)}`} color="#3b82f6" onClick={() => navigate('/admin/seo?tab=sitemap')} />
        <StatCard icon={CheckCircle} label="Global SEO" value={global_seo.title ? 'Set' : 'Not Set'} sub={global_seo.title ? global_seo.title.slice(0, 30) + '…' : 'Add meta title'} color={global_seo.title ? '#22c55e' : '#ef4444'} onClick={() => navigate('/admin/seo?tab=global')} />
      </div>

      {/* Score Trend Chart */}
      <div className="detail-panel" style={{ margin: '0 0 1.5rem 0' }}>
        <div className="detail-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} color="var(--gold)" /> Score Trend (Last 30 Days)
            {trendDirection && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                fontSize: '0.72rem', fontWeight: 600, padding: '2px 10px', borderRadius: '10px',
                background: trendDirection === 'up' ? '#dcfce7' : trendDirection === 'down' ? '#fee2e2' : '#f3f4f6',
                color: trendDirection === 'up' ? '#16a34a' : trendDirection === 'down' ? '#dc2626' : '#6b7280',
              }}>
                {trendDirection === 'up' ? <TrendingUp size={12} /> : trendDirection === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />}
                {trendChange > 0 ? '+' : ''}{trendChange} pts this week
              </span>
            )}
          </h3>
        </div>
        {trendDaily.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendDaily} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9a96e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c9a96e" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#8a8a9a' }}
                tickFormatter={(val) => { const d = new Date(val + 'T00:00:00'); return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }}
                tickLine={false}
                axisLine={{ stroke: '#e5e5e5' }}
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#8a8a9a' }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                contentStyle={{
                  background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)', fontSize: '0.78rem',
                }}
                labelFormatter={(val) => { const d = new Date(val + 'T00:00:00'); return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }); }}
                formatter={(value, name) => [value + ' pts', 'Avg SEO Score']}
              />
              <Area
                type="monotone"
                dataKey="avg_score"
                stroke="#c9a96e"
                strokeWidth={2.5}
                fill="url(#scoreGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#c9a96e', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.78rem' }}>
            <TrendingUp size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
            <p>No score history yet. Run an SEO audit to start tracking your score trend.</p>
          </div>
        )}
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Left: SEO Coverage */}
        <div className="detail-panel" style={{ margin: 0 }}>
          <div className="detail-header"><h3>SEO Coverage by Entity</h3></div>
          <ScoreBar label="Products" pct={seo_coverage.products.coverage_pct} color="#22c55e" />
          <ScoreBar label="Categories" pct={seo_coverage.categories.coverage_pct} color="#3b82f6" />
          <ScoreBar label="Pages" pct={seo_coverage.pages.coverage_pct} color="#8b5cf6" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginTop: '0.75rem', textAlign: 'center', fontSize: '0.72rem', color: 'var(--muted)' }}>
            <div><strong style={{ fontSize: '0.85rem', color: 'var(--charcoal)' }}>{seo_coverage.products.with_seo}/{seo_coverage.products.total}</strong><br />Products</div>
            <div><strong style={{ fontSize: '0.85rem', color: 'var(--charcoal)' }}>{seo_coverage.categories.with_seo}/{seo_coverage.categories.total}</strong><br />Categories</div>
            <div><strong style={{ fontSize: '0.85rem', color: 'var(--charcoal)' }}>{seo_coverage.pages.with_seo}/{seo_coverage.pages.total}</strong><br />Pages</div>
          </div>
          <div style={{ marginTop: '0.75rem' }}>
            <button className="btn-ghost btn-sm" onClick={() => navigate('/admin/seo?tab=entity')} style={{ fontSize: '0.75rem' }}>
              <Edit3 size={12} /> Manage Entity SEO <ArrowRight size={12} />
            </button>
          </div>
        </div>

        {/* Right: Score Distribution */}
        <div className="detail-panel" style={{ margin: 0 }}>
          <div className="detail-header"><h3>Score Distribution</h3></div>
          <ScoreDistChart distribution={scores.distribution} />
          <div style={{ marginTop: '0.75rem' }}>
            <button className="btn-ghost btn-sm" onClick={() => navigate('/admin/seo?tab=audit')} style={{ fontSize: '0.75rem' }}>
              <Award size={12} /> Run Full Audit <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Global SEO + Quick Actions */}
        <div className="detail-panel" style={{ margin: 0 }}>
          <div className="detail-header"><h3>Global SEO & Settings</h3></div>
          <div style={{ fontSize: '0.82rem', lineHeight: 1.8 }}>
            <div><strong>Site Title:</strong> {global_seo.title || <span style={{ color: '#ef4444' }}>Not set</span>}</div>
            <div><strong>Description:</strong> {global_seo.description ? global_seo.description.slice(0, 60) + '…' : <span style={{ color: '#ef4444' }}>Not set</span>}</div>
            <div><strong>Robots.txt:</strong> {robots.has_custom_robots ? <span style={{ color: '#22c55e' }}>Customized</span> : <span style={{ color: '#f59e0b' }}>Default</span>}</div>
            <div><strong>Sitemap:</strong> {sitemap.entries_count > 0 ? `${sitemap.entries_count} URLs` : <span style={{ color: '#f59e0b' }}>Not generated</span>}</div>
            <div><strong>Auto Schema:</strong> {advanced?.enable_auto_schema === 'true' ? <span style={{ color: '#22c55e' }}>Enabled</span> : <span style={{ color: '#f59e0b' }}>Disabled</span>}</div>
            <div><strong>IndexNow:</strong> {advanced?.enable_indexnow === 'true' ? <span style={{ color: '#22c55e' }}>Enabled</span> : <span style={{ color: '#f59e0b' }}>Disabled</span>}</div>
            {advanced?.google_analytics_id && <div><strong>Google Analytics:</strong> {advanced.google_analytics_id}</div>}
            {advanced?.facebook_pixel_id && <div><strong>Facebook Pixel:</strong> {advanced.facebook_pixel_id}</div>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            <button className="btn-ghost btn-sm" onClick={() => navigate('/admin/seo?tab=advanced')}><Settings size={12} /> Advanced Settings</button>
            <button className="btn-ghost btn-sm" onClick={() => navigate('/admin/seo?tab=robots')}><FileText size={12} /> Edit Robots.txt</button>
            <button className="btn-ghost btn-sm" onClick={() => navigate('/admin/seo?tab=structured')}><Zap size={12} /> Structured Data</button>
          </div>
        </div>

        {/* Recent Updates */}
        <div className="detail-panel" style={{ margin: 0 }}>
          <div className="detail-header"><h3>Recent SEO Updates</h3></div>
          {recent_updates?.length > 0 ? (
            <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
              {recent_updates.map((u, i) => (
                <div key={u.id || i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.78rem',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.meta_title || u.entity_type + ' #' + (u.entity_id?.slice(0, 8) || '')}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>
                      {u.entity_type} · {formatDate(u.updated_at)}
                    </div>
                  </div>
                  {u.seo_score !== null && (
                    <span style={{
                      padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 700,
                      background: u.seo_score >= 80 ? '#dcfce7' : u.seo_score >= 60 ? '#dbeafe' : u.seo_score >= 40 ? '#fef3c7' : '#fee2e2',
                      color: u.seo_score >= 80 ? '#16a34a' : u.seo_score >= 60 ? '#2563eb' : u.seo_score >= 40 ? '#d97706' : '#dc2626',
                    }}>
                      {u.seo_score}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.78rem' }}>
              <Edit3 size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.3 }} />
              <p>No SEO updates yet. Start by editing entity SEO metadata.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .hover-shadow:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
      `}</style>
    </div>
  );
}

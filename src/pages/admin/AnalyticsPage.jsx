import { useState, useEffect } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { analyticsAPI } from '../../api/analytics';
import { formatCurrency } from '../../utils/formatters';

export default function AnalyticsPage() {
  const [data, setData] = useState({ revenue: [], topProducts: [] });
  useEffect(() => { const f = async () => { try { const r = await analyticsAPI.getRevenueTrends(); setData(r.data || {}); } catch (e) { console.warn('Failed to load revenue trends:', e); } }; f(); }, []);

  const mockRevenue = [
    { month: 'Jan', revenue: 32000 }, { month: 'Feb', revenue: 38000 }, { month: 'Mar', revenue: 42000 },
    { month: 'Apr', revenue: 39000 }, { month: 'May', revenue: 48000 }, { month: 'Jun', revenue: 55000 },
  ];

  return (
    <div>
      <div className="admin-header"><h2>Analytics</h2><p>Business intelligence and insights</p></div>
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-label">Total Revenue</div><div className="stat-val">{formatCurrency(254000)}</div><div className="stat-change stat-up">↑ 24.3% YoY</div></div>
        <div className="stat-card"><div className="stat-label">Avg Order Value</div><div className="stat-val">{formatCurrency(127)}</div><div className="stat-change stat-up">↑ 8.1%</div></div>
        <div className="stat-card"><div className="stat-label">Conversion Rate</div><div className="stat-val">3.8%</div><div className="stat-change stat-up">↑ 0.4%</div></div>
        <div className="stat-card"><div className="stat-label">Customer LTV</div><div className="stat-val">{formatCurrency(489)}</div><div className="stat-change stat-up">↑ 12.7%</div></div>
      </div>
      <div className="chart-grid">
        <div className="chart-card">
          <div className="chart-title">Revenue Trend</div>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.revenue?.length ? data.revenue : mockRevenue}><XAxis dataKey="month" /><YAxis /><Tooltip formatter={(v) => formatCurrency(v)} /><Line type="monotone" dataKey="revenue" stroke="var(--gold)" strokeWidth={2} dot={{ fill: 'var(--gold)' }} /></LineChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-card">
          <div className="chart-title">Top Categories</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={[{ name: 'Fashion', value: 48 }, { name: 'Accessories', value: 32 }, { name: 'Jewellery', value: 24 }, { name: 'Beauty', value: 19 }]}><XAxis dataKey="name" /><YAxis /><Bar dataKey="value" fill="var(--gold)" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

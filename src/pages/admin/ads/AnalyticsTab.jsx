import { useState } from 'react';
import {
  PieChart, BarChart3, Activity, ChevronDown, Globe,
  Award, Lightbulb, Target, MessageCircle, Play
} from 'lucide-react';
import toast from '../../../utils/toast';
import AiWeeklySummaryCard from '../../../components/admin/ads/AiWeeklySummaryCard';

const PLATFORMS = [
  { id: 'INSTAGRAM', label: 'Instagram', icon: Target, color: 'bg-gradient-to-br from-pink-500 to-purple-600' },
  { id: 'FACEBOOK', label: 'Facebook', icon: Target, color: 'bg-blue-600' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500' },
  { id: 'GOOGLE', label: 'Google / YouTube', icon: Play, color: 'bg-gradient-to-br from-blue-500 to-green-500' },
];

export default function AnalyticsTab({ stats, adsAPI }) {
  const [performanceReport, setPerformanceReport] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <h3 className="text-xl font-bold font-display flex items-center gap-3"><PieChart size={24} /> Ad Performance Analytics</h3>
        <p className="text-blue-200 text-sm mt-1">Cross-platform comparison, trend analysis, and ROI tracking</p>
      </div>

      {/* AI Weekly Summary */}
      <AiWeeklySummaryCard adsAPI={adsAPI} />

      {/* Summary Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {[
            { label: 'Campaigns', value: stats.totalCampaigns || 0, color: 'text-text-primary' },
            { label: 'Active', value: stats.activeCampaigns || 0, color: 'text-green-600' },
            { label: 'Budget', value: `₹${((stats.totalBudget || 0) / 1000).toFixed(1)}k`, color: 'text-text-primary' },
            { label: 'Spent', value: `₹${((stats.totalSpent || 0) / 1000).toFixed(1)}k`, color: 'text-orange-600' },
            { label: 'Impressions', value: (stats.totalImpressions || 0).toLocaleString(), color: 'text-blue-600' },
            { label: 'Clicks', value: (stats.totalClicks || 0).toLocaleString(), color: 'text-purple-600' },
            { label: 'CTR', value: `${stats.ctr || 0}%`, color: 'text-green-600' },
            { label: 'Spent %', value: `${stats.spentPercent || 0}%`, color: 'text-amber-600' },
          ].map((s, i) => (
            <div key={i} className="bg-white p-3 rounded-xl border border-border shadow-soft text-center">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{s.label}</div>
              <div className={`text-lg font-bold font-display ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Performance Report */}
      <button className="w-full px-6 py-4 bg-white rounded-2xl border border-border shadow-soft hover:shadow-md transition-all flex items-center justify-between"
        onClick={async () => {
          setAnalyticsLoading(true);
          try {
            const r = await adsAPI.getPerformanceReport({ days: 30 });
            setPerformanceReport(r.data?.data || r.data);
          } catch { toast.error('Failed to load analytics'); }
          setAnalyticsLoading(false);
        }}>
        <span className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center"><BarChart3 size={20} className="text-blue-600" /></div>
          <span className="font-semibold text-text-primary">{performanceReport ? 'Refresh Performance Report' : 'Load Advanced Performance Report'}</span>
        </span>
        {analyticsLoading ? <div className="spinner w-5 h-5 border-2 border-blue-400/30 border-t-blue-500 rounded-full" /> : <ChevronDown size={18} className="text-text-muted" />}
      </button>

      {performanceReport && (
        <div className="space-y-4 animate-fadeIn">
          {/* Summary */}
          <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
            <h4 className="font-bold text-text-primary mb-4 flex items-center gap-2"><Activity size={16} /> Performance Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Avg CTR', value: `${performanceReport.summary.average_ctr ?? performanceReport.summary.averageCTR ?? 0}%`, trend: (performanceReport.summary.average_ctr ?? performanceReport.summary.averageCTR ?? 0) > 2 },
                { label: 'Avg CPC', value: `₹${performanceReport.summary.average_cpc ?? performanceReport.summary.averageCPC ?? 0}`, trend: (performanceReport.summary.average_cpc ?? performanceReport.summary.averageCPC ?? 999) < 10 },
                { label: 'ROAS', value: `${performanceReport.summary.overall_roas ?? performanceReport.summary.overallROAS ?? 0}x`, trend: (performanceReport.summary.overall_roas ?? performanceReport.summary.overallROAS ?? 0) > 1 },
                { label: 'Conv. Rate', value: `${performanceReport.summary.conversion_rate ?? performanceReport.summary.conversionRate ?? 0}%`, trend: (performanceReport.summary.conversion_rate ?? performanceReport.summary.conversionRate ?? 0) > 2 },
              ].map((m, i) => (
                <div key={i} className="p-3 rounded-xl bg-gray-50 border border-border">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{m.label}</div>
                  <div className={`text-xl font-bold font-display ${m.trend ? 'text-green-600' : 'text-red-500'}`}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Breakdown */}
          {performanceReport.byPlatform?.length > 0 && (
            <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
              <h4 className="font-bold text-text-primary mb-4 flex items-center gap-2"><Globe size={16} /> Platform Comparison</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="p-2 text-[10px] font-bold text-text-muted uppercase">Platform</th>
                      <th className="p-2 text-[10px] font-bold text-text-muted uppercase text-right">Spent</th>
                      <th className="p-2 text-[10px] font-bold text-text-muted uppercase text-right">Impr.</th>
                      <th className="p-2 text-[10px] font-bold text-text-muted uppercase text-right">Clicks</th>
                      <th className="p-2 text-[10px] font-bold text-text-muted uppercase text-right">CTR</th>
                      <th className="p-2 text-[10px] font-bold text-text-muted uppercase text-right">CPC</th>
                      <th className="p-2 text-[10px] font-bold text-text-muted uppercase text-right">Conv.</th>
                      <th className="p-2 text-[10px] font-bold text-text-muted uppercase text-right">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {performanceReport.byPlatform.map((p) => {
                      const plat = PLATFORMS.find(pp => pp.id === p.platform);
                      const Icon = plat?.icon || BarChart3;
                      return (
                        <tr key={p.platform} className="border-b border-border/50 hover:bg-surface/50">
                          <td className="p-2 font-semibold flex items-center gap-2"><Icon size={14} className={plat?.color?.replace('bg-', 'text-').split(' ')[0] || 'text-gray-500'} /> {p.platform}</td>
                          <td className="p-2 text-right">₹{(p.total_spent ?? p.totalSpent)?.toLocaleString() || '0'}</td>
                          <td className="p-2 text-right">{(p.total_impressions ?? p.totalImpressions ?? 0).toLocaleString()}</td>
                          <td className="p-2 text-right">{(p.total_clicks ?? p.totalClicks ?? 0).toLocaleString()}</td>
                          <td className="p-2 text-right font-semibold">{p.avg_ctr ?? p.avgCTR ?? 0}%</td>
                          <td className="p-2 text-right">₹{p.avg_cpc ?? p.avgCPC ?? 0}</td>
                          <td className="p-2 text-right">{p.total_conversions ?? p.totalConversions ?? 0}</td>
                          <td className={`p-2 text-right font-bold ${(p.roas || 0) > 1 ? 'text-green-600' : 'text-red-500'}`}>{p.roas}x</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Campaigns */}
          {performanceReport.topCampaigns?.length > 0 && (
            <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
              <h4 className="font-bold text-text-primary mb-4 flex items-center gap-2"><Award size={16} /> Top Performing Campaigns</h4>
              <div className="space-y-2">
                {performanceReport.topCampaigns.map((c, i) => (
                  <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-border">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-brand-black text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{c.name}</div>
                        <div className="text-[10px] text-text-muted">{c.platform} · {c.status}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold">
                      <span className="text-green-600">{c.roas ?? 0}x ROAS</span>
                      <span className="text-blue-600">{c.ctr ?? 0}% CTR</span>
                      <span>₹{(c.spent ?? 0)?.toLocaleString() || '0'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {performanceReport.recommendations?.length > 0 && (
            <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
              <h4 className="font-bold text-text-primary mb-4 flex items-center gap-2"><Lightbulb size={16} className="text-amber-500" /> AI Recommendations</h4>
              <div className="space-y-2">
                {performanceReport.recommendations.map((rec, i) => (
                  <div key={i} className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">{rec}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

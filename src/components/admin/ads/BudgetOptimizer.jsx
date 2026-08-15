import { TrendingUp, AlertTriangle, Lightbulb, Zap, Clock, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import { adsAPI } from '../../../api/ads';

// CPC can be sub-rupee (e.g. ₹0.35 per click), so keep paise below ₹1 but display
// whole rupees at ₹1+ — matching the panel's whole-rupee style for Budget/Spent.
const formatCPC = (v) => {
  const val = Number(v) || 0;
  return val >= 1 ? `₹${Math.round(val).toLocaleString('en-IN')}` : `₹${val.toFixed(2)}`;
};

export default function BudgetOptimizer({ campaigns }) {
  const [apiData, setApiData] = useState(null);

  // Try to load from backend API, fall back to client-side calculation
  useEffect(() => {
    let mounted = true;
    adsAPI.getBudgetOptimization()
      .then(r => { if (mounted) setApiData(r.data?.data || r.data); })
      .catch(() => { /* fall back to client-side */ });
    return () => { mounted = false; };
  }, []);

  // Calculate budget efficiency for each campaign
  const campaignEfficiency = (campaigns || []).map(c => {
    const budget = parseFloat(c.budget) || 0;
    const spent = parseFloat(c.spent) || 0;
    const clicks = c.clicks || 0;
    const impressions = c.impressions || 0;
    const conversions = c.conversions || 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const cpc = clicks > 0 ? spent / clicks : 0;
    const cpa = conversions > 0 ? spent / conversions : 0;
    const budgetUtilization = budget > 0 ? (spent / budget) * 100 : 0;
    const efficiency = spent > 0 && conversions > 0 ? (conversions / spent) * 1000 : 0; // conversions per ₹1000

    return { ...c, ctr, cpc, cpa, budgetUtilization, efficiency };
  });

  // Recommendations
  const recommendations = [];

  // Underutilized budget
  const underutilized = campaignEfficiency.filter(c => c.budgetUtilization < 30 && c.status === 'ACTIVE');
  underutilized.forEach(c => {
    recommendations.push({
      type: 'underutilized',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
      title: `${c.name} — Budget Underutilized`,
      detail: `Only ${c.budgetUtilization.toFixed(0)}% of ₹${(c.budget || 0).toLocaleString()} budget used.`,
      action: 'Consider lowering budget or expanding audience targeting.',
    });
  });

  // High spend, low ROI
  const lowROI = campaignEfficiency.filter(c => c.efficiency < 1 && c.spent > 1000);
  lowROI.forEach(c => {
    recommendations.push({
      type: 'low-roi',
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
      title: `${c.name} — Low ROI`,
      detail: `₹${c.spent.toLocaleString()} spent, only ${c.conversions || 0} conversions (CPA: ₹${c.cpa.toFixed(0)}).`,
      action: 'Pause campaign, refresh creatives, or narrow audience targeting.',
    });
  });

  // High performer - recommend increase
  const highPerformer = campaignEfficiency.filter(c => c.efficiency > 5 && c.ctr > 2 && c.status === 'ACTIVE');
  highPerformer.slice(0, 3).forEach(c => {
    recommendations.push({
      type: 'high-performer',
      icon: Award,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200',
      title: `${c.name} — High Performer!`,
      detail: `${c.ctr.toFixed(1)}% CTR · ${formatCPC(c.cpc)} CPC · ${c.efficiency.toFixed(1)} conversions/₹1K`,
      action: 'Consider increasing budget by 20-30% to maximize ROI.',
    });
  });

  // Budget distribution suggestion
  const totalBudget = apiData?.summary?.total_budget ?? campaignEfficiency.reduce((s, c) => s + (parseFloat(c.budget) || 0), 0);
  const totalSpent = apiData?.summary?.total_spent ?? campaignEfficiency.reduce((s, c) => s + (parseFloat(c.spent) || 0), 0);
  const activeCount = apiData?.summary?.active_campaigns ?? campaignEfficiency.filter(c => c.status === 'ACTIVE').length;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-border shadow-soft">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Total Budget</div>
          <div className="text-xl font-bold font-display">₹{totalBudget.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-border shadow-soft">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Total Spent</div>
          <div className="text-xl font-bold font-display">₹{totalSpent.toLocaleString()}</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-border shadow-soft">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Utilization</div>
          <div className="text-xl font-bold font-display">{totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : 0}%</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-border shadow-soft">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Active Campaigns</div>
          <div className="text-xl font-bold font-display">{activeCount}</div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-blue-50 to-indigo-50">
          <h4 className="font-bold flex items-center gap-2">
            <Lightbulb size={16} /> Budget Recommendations
          </h4>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-600">
            {(apiData?.recommendations || recommendations).length} insights
          </span>
        </div>
        <div className="p-4 space-y-3">
          {(apiData?.recommendations || recommendations).length === 0 ? (
            <div className="text-center py-6 text-text-muted">
              <TrendingUp size={32} />
              <p className="text-sm font-semibold">All campaigns look healthy!</p>
              <p className="text-xs mt-1">Add more active campaigns to get optimization insights.</p>
            </div>
          ) : (
            (apiData?.recommendations || recommendations).map((rec, i) => {
              const Icon = rec.icon || (rec.type === 'underutilized' ? Clock : rec.type === 'high-performer' ? Award : AlertTriangle);
              const severityColors = {
                critical: { color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
                warning: { color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                success: { color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
              };
              const sc = severityColors[rec.severity] || { color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' };
              return (
                <div key={i} className={`p-4 rounded-xl border ${rec.bg || sc.bg}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${rec.bg || sc.bg}`}>
                      <Icon size={16} className={rec.color || sc.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-text-primary">{rec.title}</h5>
                      <p className="text-xs text-text-muted mt-0.5">{rec.detail}</p>
                      <p className="text-xs font-semibold mt-1.5 text-text-primary">
                        <span className="text-amber-600">→</span> {rec.action}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Campaign Efficiency Table */}
      {campaignEfficiency.filter(c => c.status === 'ACTIVE').length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="p-4 border-b border-border">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Zap size={14} /> Active Campaign Efficiency
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-gray-50/50">
                  <th className="text-left p-2.5 text-[10px] font-bold text-text-muted uppercase">Campaign</th>
                  <th className="text-right p-2.5 text-[10px] font-bold text-text-muted uppercase">Budget</th>
                  <th className="text-right p-2.5 text-[10px] font-bold text-text-muted uppercase">Spent</th>
                  <th className="text-right p-2.5 text-[10px] font-bold text-text-muted uppercase">Util.</th>
                  <th className="text-right p-2.5 text-[10px] font-bold text-text-muted uppercase">CTR</th>
                  <th className="text-right p-2.5 text-[10px] font-bold text-text-muted uppercase">CPC</th>
                  <th className="text-right p-2.5 text-[10px] font-bold text-text-muted uppercase">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {campaignEfficiency.filter(c => c.status === 'ACTIVE').map((c) => (
                  <tr key={c.id} className="border-b border-border/50 hover:bg-surface/30">
                    <td className="p-2.5 font-semibold text-xs">{c.name}</td>
                    <td className="p-2.5 text-right text-xs">₹{Number(c.budget || 0).toLocaleString()}</td>
                    <td className="p-2.5 text-right text-xs">₹{Number(c.spent || 0).toLocaleString()}</td>
                    <td className="p-2.5 text-right">
                      <span className={`text-xs font-bold ${c.budgetUtilization > 80 ? 'text-green-600' : c.budgetUtilization < 30 ? 'text-amber-600' : 'text-text-primary'}`}>
                        {c.budgetUtilization.toFixed(0)}%
                      </span>
                    </td>
                    <td className={`p-2.5 text-right text-xs font-bold ${c.ctr > 2 ? 'text-green-600' : 'text-text-muted'}`}>
                      {c.ctr.toFixed(2)}%
                    </td>
                    <td className="p-2.5 text-right text-xs">{formatCPC(c.cpc)}</td>
                    <td className={`p-2.5 text-right text-xs font-bold ${c.efficiency > 3 ? 'text-green-600' : 'text-red-500'}`}>
                      {c.efficiency.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

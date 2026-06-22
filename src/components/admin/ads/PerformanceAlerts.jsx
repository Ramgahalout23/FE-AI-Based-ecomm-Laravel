import { AlertTriangle, TrendingUp, RefreshCw, Lightbulb, Eye, DollarSign, BarChart3 } from 'lucide-react';

const STATUS_DOT = {
  ACTIVE: 'bg-green-500',
  DRAFT: 'bg-gray-400',
  PAUSED: 'bg-yellow-500',
  COMPLETED: 'bg-blue-500',
  FAILED: 'bg-red-500',
};

export default function PerformanceAlerts({ campaigns, stats, onSync, onEdit }) {
  const alerts = [];

  // Alert 1: Campaigns about to end
  const endingSoon = (campaigns || []).filter(c => {
    if (!c.endDate || c.status === 'COMPLETED') return false;
    const daysLeft = (new Date(c.endDate) - new Date()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 3;
  });
  if (endingSoon.length > 0) {
    alerts.push({
      severity: 'info',
      icon: TrendingUp,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-200',
      title: `${endingSoon.length} campaign${endingSoon.length > 1 ? 's' : ''} ending soon`,
      detail: endingSoon.map(c => `${c.name} (ends ${new Date(c.endDate).toLocaleDateString()})`).join(', '),
      action: 'Extend dates or create a follow-up campaign.',
      campaigns: endingSoon,
    });
  }

  // Alert 2: Campaigns with 0 impressions
  const noImpressions = (campaigns || []).filter(c => c.status === 'ACTIVE' && (!c.impressions || c.impressions === 0));
  if (noImpressions.length > 0) {
    alerts.push({
      severity: 'warning',
      icon: Eye,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
      title: `${noImpressions.length} active campaign${noImpressions.length > 1 ? 's' : ''} with 0 impressions`,
      detail: noImpressions.map(c => c.name).join(', '),
      action: 'Check creative URLs, landing pages, and campaign status. Try pushing to platform again.',
      campaigns: noImpressions,
    });
  }

  // Alert 3: High spend, low CTR
  const highSpendLowCTR = (campaigns || []).filter(c => {
    const spent = parseFloat(c.spent) || 0;
    const clicks = c.clicks || 0;
    const impressions = c.impressions || 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    return spent > 500 && ctr < 0.5 && c.status === 'ACTIVE';
  });
  if (highSpendLowCTR.length > 0) {
    alerts.push({
      severity: 'critical',
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-200',
      title: `${highSpendLowCTR.length} campaign${highSpendLowCTR.length > 1 ? 's' : ''} with high spend & low CTR`,
      detail: highSpendLowCTR.map(c => `${c.name} (₹${(c.spent || 0).toLocaleString()} spent, ${((c.clicks || 0) / (c.impressions || 1) * 100).toFixed(1)}% CTR)`).join(', '),
      action: 'Pause campaigns and refresh creatives, headlines, or audience targeting.',
      campaigns: highSpendLowCTR,
    });
  }

  // Alert 4: Top performers
  const topPerforming = (campaigns || []).filter(c => {
    const impressions = c.impressions || 0;
    const clicks = c.clicks || 0;
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    return ctr > 3 && c.status === 'ACTIVE';
  });
  if (topPerforming.length > 0) {
    alerts.push({
      severity: 'success',
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200',
      title: `${topPerforming.length} high-performing campaign${topPerforming.length > 1 ? 's' : ''}!`,
      detail: topPerforming.map(c => `${c.name} (${((c.clicks || 0) / (c.impressions || 1) * 100).toFixed(1)}% CTR)`).join(', '),
      action: 'Consider increasing budget for these campaigns to maximize results.',
      campaigns: topPerforming,
    });
  }

  // Alert 5: Budget running out
  const budgetRunningOut = (campaigns || []).filter(c => {
    const budget = parseFloat(c.budget) || 0;
    const spent = parseFloat(c.spent) || 0;
    return budget > 0 && spent > 0 && (spent / budget) > 0.85 && c.status === 'ACTIVE';
  });
  if (budgetRunningOut.length > 0) {
    alerts.push({
      severity: 'warning',
      icon: DollarSign,
      color: 'text-orange-600',
      bg: 'bg-orange-50 border-orange-200',
      title: `${budgetRunningOut.length} campaign${budgetRunningOut.length > 1 ? 's' : ''} running out of budget`,
      detail: budgetRunningOut.map(c => `${c.name} (${((c.spent / c.budget) * 100).toFixed(0)}% used)`).join(', '),
      action: 'Increase budget or adjust end dates to prevent premature stopping.',
      campaigns: budgetRunningOut,
    });
  }

  // Alert 6: Stale data
  const stale = (campaigns || []).filter(c => {
    const ts = c.lastSyncedAt || c.syncedAt;
    if (!ts || !c.platformCampaignId) return false;
    return (Date.now() - new Date(ts).getTime()) / (1000 * 60 * 60) >= 24;
  });
  if (stale.length > 0) {
    alerts.push({
      severity: 'info',
      icon: RefreshCw,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-200',
      title: `${stale.length} campaign${stale.length > 1 ? 's' : ''} with stale data`,
      detail: `Last synced over 24 hours ago. Fresh stats needed for accurate reporting.`,
      action: 'Sync stats to get latest performance data.',
      campaigns: stale,
    });
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
        <h4 className="font-semibold text-sm">No alerts</h4>
        <p className="text-xs mt-1">All campaigns are running smoothly!</p>
      </div>
    );
  }

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
  const sorted = [...alerts].sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h4 className="font-bold text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          {alerts.length} Alert{alerts.length > 1 ? 's' : ''}
        </h4>
        <div className="flex gap-1">
          <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[9px] font-bold">{alerts.filter(a => a.severity === 'critical').length} Critical</span>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-600 rounded text-[9px] font-bold">{alerts.filter(a => a.severity === 'warning').length} Warning</span>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[9px] font-bold">{alerts.filter(a => a.severity === 'info').length} Info</span>
        </div>
      </div>

      {sorted.map((alert, i) => {
        const Icon = alert.icon;
        return (
          <div key={i} className={`p-4 rounded-xl border ${alert.bg} transition-all hover:shadow-sm`}>
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${alert.bg}`}>
                <Icon size={16} className={alert.color} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-sm font-bold text-text-primary">{alert.title}</h5>
                    <p className="text-xs text-text-muted mt-0.5">{alert.detail}</p>
                  </div>
                  {alert.campaigns?.length === 1 && (
                    <button className="text-[10px] font-semibold text-brand-black hover:underline whitespace-nowrap flex-shrink-0"
                      onClick={() => onEdit?.(alert.campaigns[0])}>
                      Edit →
                    </button>
                  )}
                </div>
                <p className="text-xs font-semibold mt-1.5 text-text-primary">
                  <Lightbulb size={11} className="inline mr-1 text-amber-500" />
                  {alert.action}
                </p>
                {alert.campaigns && alert.campaigns.length > 1 && (
                  <button className="mt-1.5 text-[10px] font-semibold text-brand-black hover:underline"
                    onClick={() => onEdit?.(alert.campaigns[0])}>
                    View all →
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

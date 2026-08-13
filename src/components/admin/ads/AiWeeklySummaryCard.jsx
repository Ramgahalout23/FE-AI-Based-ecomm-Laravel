import { useState } from 'react';
import {
  Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Wallet, RefreshCw, Columns2, X
} from 'lucide-react';
import toast from '../../../utils/toast';

const ANOMALY_STYLES = {
  positive: { icon: CheckCircle2, cls: 'bg-green-50 border-green-200 text-green-800', iconCls: 'text-green-600' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-50 border-amber-200 text-amber-800', iconCls: 'text-amber-600' },
  critical: { icon: AlertTriangle, cls: 'bg-red-50 border-red-200 text-red-800', iconCls: 'text-red-600' },
};

/**
 * AI Performance Summary — narrative recap, anomaly detection & budget
 * advice for the selected period (7/30 days), with a side-by-side compare
 * mode that fetches both periods at once. Shared by the Overview and
 * Analytics tabs so the two can't drift apart. Uses the same mock fallback
 * as the rest of the ads AI tools when no API key is configured.
 */
const PERIODS = [
  { days: 7, label: '7 days', full: 'Weekly' },
  { days: 30, label: '30 days', full: 'Monthly' },
];

/** Renders one summary result (narrative + anomalies + advice). */
function SummaryBody({ data }) {
  if (!data) return null;
  return (
    <div className="space-y-4">
      {data._mock && (
        <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          ✨ Sample output — no AI API key configured. Add one in Settings → AI Provider for real insights.
        </div>
      )}

      {data.period?.from && (
        <div className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">
          {new Date(data.period.from).toLocaleDateString()} — {new Date(data.period.to).toLocaleDateString()}
        </div>
      )}

      {/* Narrative */}
      {data.summary && (
        <p className="text-sm leading-relaxed text-text-primary">{data.summary}</p>
      )}

      {/* Anomalies */}
      {data.anomalies?.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5"><TrendingUp size={13} /> Anomalies &amp; Signals</h5>
          <div className="space-y-2">
            {data.anomalies.map((a, i) => {
              const s = ANOMALY_STYLES[a.severity] || ANOMALY_STYLES.warning;
              const Icon = s.icon;
              return (
                <div key={i} className={`p-3 rounded-xl border text-sm ${s.cls}`}>
                  <div className="flex items-center gap-2 font-semibold"><Icon size={14} className={s.iconCls} /> {a.title}</div>
                  {a.detail && <div className="text-xs opacity-90 mt-1">{a.detail}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Budget advice */}
      {data.budgetAdvice?.length > 0 && (
        <div>
          <h5 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5"><Wallet size={13} /> Budget Advice</h5>
          <div className="space-y-2">
            {data.budgetAdvice.map((adv, i) => (
              <div key={i} className="p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-sm text-indigo-900">💡 {adv}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** One column in compare mode. */
function CompareColumn({ label, data }) {
  return (
    <div className="rounded-2xl border border-border p-5 bg-white">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 border border-indigo-100 rounded-full px-2.5 py-1">{label}</span>
        {data && <span className="text-[10px] text-text-muted font-semibold uppercase">{data._mock ? '🧪 Mock' : 'AI'}</span>}
      </div>
      {data ? <SummaryBody data={data} /> : (
        <div className="py-8 text-center text-sm text-text-muted">No data for this period yet.</div>
      )}
    </div>
  );
}

export default function AiWeeklySummaryCard({ adsAPI }) {
  const [days, setDays] = useState(7);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [compare, setCompare] = useState(false);
  const [compareData, setCompareData] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const generate = async (targetDays = days) => {
    setAiLoading(true);
    try {
      const r = await adsAPI.aiWeeklySummary({ days: targetDays });
      setAiSummary(r.data?.data || r.data);
    } catch { toast.error('Failed to generate performance summary'); }
    setAiLoading(false);
  };

  const switchPeriod = (d) => {
    if (d === days) return;
    setDays(d);
    setAiSummary(null);
    generate(d);
  };

  const runCompare = async () => {
    setCompareLoading(true);
    try {
      const [w, m] = await Promise.all([
        adsAPI.aiWeeklySummary({ days: 7 }),
        adsAPI.aiWeeklySummary({ days: 30 }),
      ]);
      setCompareData({
        7: w.data?.data || w.data,
        30: m.data?.data || m.data,
      });
    } catch { toast.error('Failed to generate comparison'); }
    setCompareLoading(false);
  };

  const toggleCompare = () => {
    if (compare) {
      setCompare(false);
      return;
    }
    setCompare(true);
    if (!compareData) runCompare();
  };

  const periodLabel = PERIODS.find(p => p.days === days)?.full || 'Weekly';

  return (
    <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
      <div className="p-5 border-b border-border flex items-center justify-between gap-3 flex-wrap bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center"><Sparkles size={18} className="text-white" /></div>
          <div>
            <h4 className="font-bold text-text-primary flex items-center gap-2">
              {compare ? 'AI Performance Comparison' : `AI ${periodLabel} Performance Summary`}
            </h4>
            <p className="text-xs text-text-muted">
              {compare ? 'Weekly vs monthly side by side — spot trends the single view hides' : `Spend, CTR &amp; ROAS explained in plain language for the last ${days} days`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period toggle (hidden in compare mode — compare covers both) */}
          {!compare && (
            <div className="flex items-center rounded-xl bg-white/70 border border-border p-1">
              {PERIODS.map(p => (
                <button key={p.days} onClick={() => switchPeriod(p.days)} disabled={aiLoading}
                  className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ' + (days === p.days ? 'bg-indigo-600 text-white shadow' : 'text-text-muted hover:text-text-primary')}>
                  {p.label}
                </button>
              ))}
            </div>
          )}
          {/* Compare toggle */}
          <button onClick={toggleCompare} disabled={compareLoading}
            className={'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors border ' + (compare ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white/70 border-border text-text-muted hover:text-text-primary')}>
            {compare ? <X size={14} /> : <Columns2 size={14} />} {compare ? 'Exit compare' : 'Compare'}
          </button>
          {!compare && (
            <button onClick={() => generate()} disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {aiLoading ? <><RefreshCw size={14} className="animate-spin" /> Analyzing…</> : <><Sparkles size={14} /> {aiSummary ? 'Regenerate' : 'Generate summary'}</>}
            </button>
          )}
        </div>
      </div>

      {compare ? (
        <div className="p-5">
          {compareLoading ? (
            <div className="p-10 text-center text-text-muted text-sm">Crunching 7-day and 30-day performance data…</div>
          ) : compareData ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CompareColumn label="Last 7 days · Weekly" data={compareData[7]} />
              <CompareColumn label="Last 30 days · Monthly" data={compareData[30]} />
            </div>
          ) : (
            <div className="p-10 text-center">
              <div className="text-4xl mb-2">⚖️</div>
              <p className="text-sm text-text-muted">Compare this week against the trailing month to see whether momentum is building or fading.</p>
            </div>
          )}
        </div>
      ) : aiLoading ? (
        <div className="p-10 text-center text-text-muted text-sm">Crunching {days} days of performance data…</div>
      ) : aiSummary ? (
        <div className="p-5">
          <SummaryBody data={aiSummary} />
        </div>
      ) : (
        <div className="p-10 text-center">
          <div className="text-4xl mb-2">🧠</div>
          <p className="text-sm text-text-muted">Get a plain-language read on this period's performance — what changed, what to watch, and where to move budget.</p>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import {
  GitCompare, RefreshCw, X, Search, LayoutDashboard, Activity,
  CheckCircle2, BarChart3, Target, MessageCircle, Play
} from 'lucide-react';
import toast from '../../../utils/toast';

const PLATFORMS = [
  { id: 'INSTAGRAM', label: 'Instagram', icon: Target, color: 'bg-gradient-to-br from-pink-500 to-purple-600' },
  { id: 'FACEBOOK', label: 'Facebook', icon: Target, color: 'bg-blue-600' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500' },
  { id: 'GOOGLE', label: 'Google / YouTube', icon: Play, color: 'bg-gradient-to-br from-blue-500 to-green-500' },
];

const STATUS_COLORS = {
  DRAFT: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-green-100 text-green-600',
  PAUSED: 'bg-yellow-100 text-yellow-600',
  COMPLETED: 'bg-blue-100 text-blue-600',
  FAILED: 'bg-red-100 text-red-600',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function CompareTab({ campaigns, adsAPI }) {
  const [compareCampaign1, setCompareCampaign1] = useState(null);
  const [compareCampaign2, setCompareCampaign2] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);

  const selectCampaignForCompare = (c, slot) => {
    if (slot === 1) {
      setCompareCampaign1(compareCampaign2?.id === c.id ? null : c);
    } else {
      setCompareCampaign2(compareCampaign1?.id === c.id ? null : c);
    }
    setCompareResult(null);
  };

  const runComparison = async () => {
    if (!compareCampaign1 || !compareCampaign2) {
      toast.error('Select two campaigns to compare');
      return;
    }
    setCompareLoading(true);
    try {
      const r = await adsAPI.compareCampaigns(compareCampaign1.id, compareCampaign2.id);
      setCompareResult(r.data?.data || r.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Comparison failed');
    }
    setCompareLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <GitCompare size={28} />
          <h3 className="text-xl font-bold font-display">Campaign Comparison</h3>
        </div>
        <p className="text-indigo-200 text-sm">Select two campaigns to compare their performance side-by-side — CTR, CPC, ROAS, and more.</p>
      </div>

      {/* Campaign Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">A</span>
              Campaign A
            </label>
            {compareCampaign1 && (
              <button className="text-[10px] text-red-500 hover:text-red-600 font-semibold flex items-center gap-1" onClick={() => { setCompareCampaign1(null); setCompareResult(null); }}>
                <X size={12} /> Clear
              </button>
            )}
          </div>
          {compareCampaign1 ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-indigo-50 border border-indigo-200">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] ${PLATFORMS.find(p => p.id === compareCampaign1.platform)?.color || 'bg-gray-600'}`}>
                <span className="text-white text-[10px]">{PLATFORMS.find(p => p.id === compareCampaign1.platform)?.label?.charAt(0) || 'A'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-text-primary truncate">{compareCampaign1.name}</div>
                <div className="text-[10px] text-text-muted">{compareCampaign1.platform} · {compareCampaign1.status} · ₹{Number(compareCampaign1.budget || 0).toLocaleString()}</div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                placeholder="Search campaigns..." onChange={(e) => {
                  const q = e.target.value.toLowerCase();
                  const match = campaigns.find(c => c.name.toLowerCase().includes(q) && c.id !== compareCampaign2?.id);
                  if (q.length > 0 && match) selectCampaignForCompare(match, 1);
                }} />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-bold text-text-primary flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center">B</span>
              Campaign B
            </label>
            {compareCampaign2 && (
              <button className="text-[10px] text-red-500 hover:text-red-600 font-semibold flex items-center gap-1" onClick={() => { setCompareCampaign2(null); setCompareResult(null); }}>
                <X size={12} /> Clear
              </button>
            )}
          </div>
          {compareCampaign2 ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-violet-50 border border-violet-200">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] ${PLATFORMS.find(p => p.id === compareCampaign2.platform)?.color || 'bg-gray-600'}`}>
                <span className="text-white text-[10px]">{PLATFORMS.find(p => p.id === compareCampaign2.platform)?.label?.charAt(0) || 'B'}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-text-primary truncate">{compareCampaign2.name}</div>
                <div className="text-[10px] text-text-muted">{compareCampaign2.platform} · {compareCampaign2.status} · ₹{Number(compareCampaign2.budget || 0).toLocaleString()}</div>
              </div>
            </div>
          ) : (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-violet-500"
                placeholder="Search campaigns..." onChange={(e) => {
                  const q = e.target.value.toLowerCase();
                  const match = campaigns.find(c => c.name.toLowerCase().includes(q) && c.id !== compareCampaign1?.id);
                  if (q.length > 0 && match) selectCampaignForCompare(match, 2);
                }} />
            </div>
          )}
        </div>
      </div>

      {/* Campaign Picker */}
      {campaigns.length > 0 && (
        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="p-4 border-b border-border bg-gray-50/50">
            <h4 className="text-sm font-bold text-text-primary flex items-center gap-2"><LayoutDashboard size={15} /> Pick from Campaigns</h4>
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-border/50">
            {campaigns.map(c => {
              const isSelected1 = compareCampaign1?.id === c.id;
              const isSelected2 = compareCampaign2?.id === c.id;
              const PlatformIcon = PLATFORMS.find(p => p.id === c.platform)?.icon || BarChart3;
              const platColor = PLATFORMS.find(p => p.id === c.platform)?.color || 'bg-gray-600';
              return (
                <div key={c.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-surface/50 ${isSelected1 ? 'bg-indigo-50/50' : isSelected2 ? 'bg-violet-50/50' : ''}`}
                  onClick={() => {
                    if (isSelected1) { setCompareCampaign1(null); setCompareResult(null); }
                    else if (isSelected2) { setCompareCampaign2(null); setCompareResult(null); }
                    else if (!compareCampaign1) { setCompareCampaign1(c); setCompareResult(null); }
                    else if (!compareCampaign2) { setCompareCampaign2(c); setCompareResult(null); }
                    else toast.error('Already selected 2 campaigns. Clear one first.');
                  }}>
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-[8px] ${platColor}`}><PlatformIcon size={10} /></div>
                  <div className="flex-1 min-w-0 text-sm font-semibold truncate">{c.name}</div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[c.status] || ''}`}>{c.status}</span>
                  <div className="flex gap-1">
                    <span className={`w-4 h-4 rounded text-[8px] font-bold flex items-center justify-center ${isSelected1 ? 'bg-indigo-600 text-white' : isSelected2 ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
                      {isSelected1 ? 'A' : isSelected2 ? 'B' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Compare Button */}
      <button className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${compareCampaign1 && compareCampaign2 ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-lg hover:scale-[1.01]' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
        onClick={runComparison} disabled={!compareCampaign1 || !compareCampaign2 || compareLoading}>
        {compareLoading ? <><div className="spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Comparing...</> : <><GitCompare size={16} /> {compareCampaign1 && compareCampaign2 ? 'Compare Campaigns' : 'Select Campaign A & B to Compare'}</>}
      </button>

      {/* Comparison Result */}
      {compareResult && (
        <div className="space-y-4 animate-fadeIn">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white text-center">
            <div className="text-2xl mb-1">🏆</div>
            <h4 className="text-lg font-bold font-display">{compareResult.winner?.campaignName || 'Campaign'} Wins!</h4>
            {compareResult.winner?.reasons?.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {compareResult.winner.reasons.map((r, i) => <span key={i} className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold">{r}</span>)}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
            <div className="grid grid-cols-3 gap-0 divide-x divide-border">
              <div className="p-4 bg-gray-50">
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-4">Metric</div>
                {['Platform', 'Status', 'Budget', 'Spent', 'Impressions', 'Clicks', 'CTR', 'CPC', 'CPM', 'Conv. Rate', 'ROAS'].map(m => <div key={m} className="py-2.5 text-xs font-semibold text-text-muted border-b border-border/30 last:border-b-0">{m}</div>)}
              </div>
              <div className="p-4 bg-indigo-50/30">
                <div className="flex items-center gap-2 mb-4"><span className="w-6 h-6 rounded-lg bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">A</span><span className="text-sm font-bold text-text-primary truncate">{compareResult.campaign1?.name || compareCampaign1?.name}</span></div>
                {[
                  compareResult.campaign1?.platform || '-',
                  compareResult.campaign1?.status || '-',
                  `₹${(compareResult.campaign1?.budget || 0).toLocaleString()}`,
                  `₹${(compareResult.campaign1?.spent || 0).toLocaleString()}`,
                  (compareResult.campaign1?.impressions || 0).toLocaleString(),
                  (compareResult.campaign1?.clicks || 0).toLocaleString(),
                  <span key="ctr" className={`font-bold ${(compareResult.campaign1?.ctr || 0) > (compareResult.campaign2?.ctr || 0) ? 'text-green-600' : ''}`}>{compareResult.campaign1?.ctr}%</span>,
                  <span key="cpc" className={`font-bold {(compareResult.campaign1?.cpc || 999) < (compareResult.campaign2?.cpc || 999) ? 'text-green-600' : ''}`}>₹{compareResult.campaign1?.cpc}</span>,
                  <span key="cpm" className="font-bold">₹{compareResult.campaign1?.cpm}</span>,
                  <span key="conv" className={`font-bold ${(compareResult.campaign1?.conversionRate || 0) > (compareResult.campaign2?.conversionRate || 0) ? 'text-green-600' : ''}`}>{compareResult.campaign1?.conversionRate}%</span>,
                  <span key="roas" className={`font-bold ${(compareResult.campaign1?.roas || 0) > (compareResult.campaign2?.roas || 0) ? 'text-green-600' : 'text-red-500'}`}>{compareResult.campaign1?.roas}x</span>,
                ].map((val, i) => <div key={i} className="py-2.5 text-sm text-text-primary border-b border-border/30 last:border-b-0">{val}</div>)}
              </div>
              <div className="p-4 bg-violet-50/30">
                <div className="flex items-center gap-2 mb-4"><span className="w-6 h-6 rounded-lg bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">B</span><span className="text-sm font-bold text-text-primary truncate">{compareResult.campaign2?.name || compareCampaign2?.name}</span></div>
                {[
                  compareResult.campaign2?.platform || '-',
                  compareResult.campaign2?.status || '-',
                  `₹${(compareResult.campaign2?.budget || 0).toLocaleString()}`,
                  `₹${(compareResult.campaign2?.spent || 0).toLocaleString()}`,
                  (compareResult.campaign2?.impressions || 0).toLocaleString(),
                  (compareResult.campaign2?.clicks || 0).toLocaleString(),
                  <span key="ctr" className={`font-bold ${(compareResult.campaign2?.ctr || 0) > (compareResult.campaign1?.ctr || 0) ? 'text-green-600' : ''}`}>{compareResult.campaign2?.ctr}%</span>,
                  <span key="cpc" className={`font-bold {(compareResult.campaign2?.cpc || 999) < (compareResult.campaign1?.cpc || 999) ? 'text-green-600' : ''}`}>₹{compareResult.campaign2?.cpc}</span>,
                  <span key="cpm" className="font-bold">₹{compareResult.campaign2?.cpm}</span>,
                  <span key="conv" className={`font-bold ${(compareResult.campaign2?.conversionRate || 0) > (compareResult.campaign1?.conversionRate || 0) ? 'text-green-600' : ''}`}>{compareResult.campaign2?.conversionRate}%</span>,
                  <span key="roas" className={`font-bold ${(compareResult.campaign2?.roas || 0) > (compareResult.campaign1?.roas || 0) ? 'text-green-600' : 'text-red-500'}`}>{compareResult.campaign2?.roas}x</span>,
                ].map((val, i) => <div key={i} className="py-2.5 text-sm text-text-primary border-b border-border/30 last:border-b-0">{val}</div>)}
              </div>
            </div>
          </div>

          {/* Visual Comparison Bars */}
          <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
            <h4 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2"><Activity size={16} /> Performance at a Glance</h4>
            {[
              { label: 'CTR', key1: 'ctr', key2: 'ctr', suffix: '%', higherBetter: true },
              { label: 'CPC', key1: 'cpc', key2: 'cpc', prefix: '₹', higherBetter: false },
              { label: 'Conversion Rate', key1: 'conversionRate', key2: 'conversionRate', suffix: '%', higherBetter: true },
              { label: 'ROAS', key1: 'roas', key2: 'roas', suffix: 'x', higherBetter: true },
            ].map(m => {
              const v1 = parseFloat(compareResult.campaign1?.[m.key1]) || 0;
              const v2 = parseFloat(compareResult.campaign2?.[m.key2]) || 0;
              const total = v1 + v2 || 1;
              const pct1 = (v1 / total) * 100;
              const pct2 = (v2 / total) * 100;
              const c1Wins = m.higherBetter ? v1 > v2 : v1 < v2;
              const c2Wins = m.higherBetter ? v2 > v1 : v2 < v1;
              return (
                <div key={m.label} className="mb-4 last:mb-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-text-muted">{m.label}</span>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className={c1Wins ? 'text-indigo-600' : 'text-gray-400'}>{m.prefix || ''}{v1}{m.suffix || ''}</span>
                      <span className="text-gray-300">vs</span>
                      <span className={c2Wins ? 'text-violet-600' : 'text-gray-400'}>{m.prefix || ''}{v2}{m.suffix || ''}</span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                    <div className="h-full rounded-l-full transition-all duration-500" style={{ width: `${Math.max(pct1, 5)}%`, background: c1Wins ? 'linear-gradient(90deg, #6366f1, #818cf8)' : '#c7d2fe' }} />
                    <div className="h-full rounded-r-full transition-all duration-500" style={{ width: `${Math.max(pct2, 5)}%`, background: c2Wins ? 'linear-gradient(90deg, #8b5cf6, #a78bfa)' : '#ddd6fe' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Winner Details */}
          {compareResult.winner?.reasons?.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
              <h4 className="text-sm font-bold text-green-800 mb-3 flex items-center gap-2">🏆 Why {compareResult.winner.campaignName} Won</h4>
              <ul className="space-y-2">{compareResult.winner.reasons.map((reason, i) => <li key={i} className="flex items-start gap-2.5 text-sm text-green-700"><CheckCircle2 size={16} className="text-green-500 mt-0.5 flex-shrink-0" />{reason}</li>)}</ul>
            </div>
          )}

          <button className="w-full py-3 bg-white border-2 border-dashed border-border rounded-2xl text-sm font-semibold text-text-muted hover:border-indigo-400 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
            onClick={() => { setCompareResult(null); setCompareCampaign1(null); setCompareCampaign2(null); }}>
            <RefreshCw size={15} /> Compare Different Campaigns
          </button>
        </div>
      )}
    </div>
  );
}

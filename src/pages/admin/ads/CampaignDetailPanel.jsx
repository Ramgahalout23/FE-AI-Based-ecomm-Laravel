import { useState } from 'react';
import toast from "../../../utils/toast";
import {
  X, Target, Calendar, Coins, Zap, Users, Image as ImageIcon,
  Activity, ExternalLink, BadgeCheck, GitBranch, Sparkles
} from 'lucide-react';

const PLATFORM_COLORS = {
  INSTAGRAM: 'bg-gradient-to-br from-pink-500 to-purple-600',
  FACEBOOK: 'bg-blue-600',
  WHATSAPP: 'bg-green-500',
  GOOGLE: 'bg-gradient-to-br from-blue-500 to-green-500',
  CUSTOM: 'bg-gray-600',
};

const STATUS_BADGE = {
  ACTIVE: 'bg-green-100 text-green-700',
  PAUSED: 'bg-amber-100 text-amber-700',
  DRAFT: 'bg-gray-100 text-gray-600',
  COMPLETED: 'bg-blue-100 text-blue-700',
};

const EVENT_COLORS = {
  CLICK: 'bg-purple-100 text-purple-700',
  IMPRESSION: 'bg-blue-100 text-blue-700',
  CONVERSION: 'bg-green-100 text-green-700',
};

function fmtMoney(v) {
  const n = Number(v || 0);
  return '₹' + n.toLocaleString('en-IN');
}

function fmtNum(v) {
  return Number(v || 0).toLocaleString('en-IN');
}

function StatCard({ label, value, sub, color = '' }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{label}</div>
      <div className={'text-lg font-bold font-display ' + color}>{value}</div>
      {sub && <div className="text-[11px] text-text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
      <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
        <Icon size={15} className="text-brand-black" /> {title}
      </h4>
      {children}
    </div>
  );
}

export default function CampaignDetailPanel({ campaign, loading, onClose, onEdit, adsAPI }) {
  const [busy, setBusy] = useState(false);
  if (!campaign) return null;

  const c = campaign;
  const ctr = c.clicks && c.impressions ? ((c.clicks / c.impressions) * 100).toFixed(2) : '0.00';
  const dailyStats = Array.isArray(c.dailyStats) ? c.dailyStats.slice().reverse() : [];
  const maxImp = Math.max(...dailyStats.map(d => Number(d.impressions || 0)), 1);

  const copy = (text, label) => {
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => toast?.success?.(`${label} copied`));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:items-center overflow-y-auto bg-black/50 backdrop-blur-sm p-3 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-gray-50 w-full max-w-3xl rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-4 flex items-start justify-between gap-3 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className={'w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0 ' + (PLATFORM_COLORS[c.platform] || 'bg-gray-600')}>
              <Target size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-display font-bold text-lg truncate">{c.name}</h3>
              <div className="flex items-center gap-2 flex-wrap mt-0.5">
                <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (STATUS_BADGE[c.status] || 'bg-gray-100 text-gray-600')}>
                  {c.status || 'DRAFT'}
                </span>
                <span className="text-[11px] text-text-muted">{c.platform || '—'}</span>
                {c.objective && <span className="text-[11px] text-text-muted">· {c.objective}</span>}
                {c.platformCampaignId && <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1"><BadgeCheck size={12} /> Pushed live</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onEdit && (
              <button onClick={() => { onClose(); onEdit(c); }}
                className="px-3 py-1.5 bg-brand-black text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity">
                Edit
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="spinner w-8 h-8 border-2 border-gray-200 border-t-brand-black rounded-full" />
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {/* KPI row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Budget" value={fmtMoney(c.budget)} sub={c.dailyBudget ? `₹${c.dailyBudget}/day` : 'Total'} />
              <StatCard label="Spent" value={fmtMoney(c.spent)} color="text-orange-600" />
              <StatCard label="Impressions" value={fmtNum(c.impressions)} color="text-blue-600" />
              <StatCard label="Clicks" value={fmtNum(c.clicks)} color="text-purple-600" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="CTR" value={ctr + '%'} color="text-green-600" />
              <StatCard label="Conversions" value={fmtNum(c.conversions)} color="text-emerald-600" />
              <StatCard label="ROAS" value={Number(c.roas || 0).toFixed(2) + 'x'} color="text-indigo-600" />
              <StatCard label="Frequency" value={fmtNum(c.frequency)} sub={c.frequencyCap ? `cap ${c.frequencyCap}/${c.frequencyCapPeriod || 'DAY'}` : ''} />
            </div>

            {/* Schedule + budget pacing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Section icon={Calendar} title="Schedule">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-text-muted">Start</span><span className="font-medium">{c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">End</span><span className="font-medium">{c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Days</span><span className="font-medium">{c.scheduleDays?.length ? c.scheduleDays.join(', ') : 'Every day'}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Pacing</span><span className="font-medium capitalize">{c.budgetPacing || 'Standard'}</span></div>
                </div>
              </Section>
              <Section icon={Coins} title="Budget & Bidding">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-text-muted">Type</span><span className="font-medium">{c.budgetType || 'TOTAL'}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Strategy</span><span className="font-medium">{c.bidStrategy || 'LOWEST_COST'}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Bid amount</span><span className="font-medium">{c.bidAmount ? '₹' + c.bidAmount : 'Auto'}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Frequency cap</span><span className="font-medium">{c.frequencyCap ? c.frequencyCap + ' / ' + (c.frequencyCapPeriod || 'DAY') : 'Off'}</span></div>
                </div>
              </Section>
            </div>

            {/* Audience targeting */}
            <Section icon={Users} title="Audience Targeting">
              {c.audience ? (
                <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-3">
                  <div>
                    <div className="text-sm font-semibold text-indigo-800">{c.audience.name}</div>
                    <div className="text-xs text-indigo-600">{c.audience.type === 'RETARGETING' ? 'Retargeting audience' : 'Saved audience'} · {c.audience.member_count || 0} members</div>
                  </div>
                  <BadgeCheck size={18} className="text-indigo-500" />
                </div>
              ) : null}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-[10px] font-semibold text-text-muted uppercase">Age</div>
                  <div className="font-medium">{c.ageMin || 18} – {c.ageMax || 65}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-text-muted uppercase">Gender</div>
                  <div className="font-medium capitalize">{c.gender || 'ALL'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-text-muted uppercase">Devices</div>
                  <div className="font-medium">{c.devices?.length ? c.devices.join(', ') : 'All'}</div>
                </div>
              </div>
              {c.locations?.length > 0 && (
                <div className="mt-3 text-sm">
                  <div className="text-[10px] font-semibold text-text-muted uppercase mb-1">Locations</div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.locations.map((l, i) => <span key={i} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{l}</span>)}
                  </div>
                </div>
              )}
              {c.interests?.length > 0 && (
                <div className="mt-3 text-sm">
                  <div className="text-[10px] font-semibold text-text-muted uppercase mb-1">Interests</div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.interests.map((l, i) => <span key={i} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">{l}</span>)}
                  </div>
                </div>
              )}
              {c.keywords?.length > 0 && (
                <div className="mt-3 text-sm">
                  <div className="text-[10px] font-semibold text-text-muted uppercase mb-1">Keywords</div>
                  <div className="flex flex-wrap gap-1.5">
                    {c.keywords.map((l, i) => <span key={i} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs">#{l}</span>)}
                  </div>
                </div>
              )}
            </Section>

            {/* Creative */}
            <Section icon={ImageIcon} title="Creative">
              {c.creative ? (
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 mb-3 border border-gray-100">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white flex-shrink-0">
                    <ImageIcon size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{c.creative.name}</div>
                    <div className="text-xs text-text-muted">{c.creative.media_type} · {c.creative.call_to_action || c.creative.callToAction || '—'}</div>
                  </div>
                </div>
              ) : null}
              {c.headline && (
                <div className="mb-3">
                  <div className="text-[10px] font-semibold text-text-muted uppercase mb-1">Headline</div>
                  <div className="text-lg font-bold font-display">{c.headline}</div>
                </div>
              )}
              {c.primaryText && (
                <div className="mb-3">
                  <div className="text-[10px] font-semibold text-text-muted uppercase mb-1">Primary text</div>
                  <p className="text-sm text-gray-700">{c.primaryText}</p>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap text-sm">
                {c.callToAction && <span className="px-2.5 py-1 bg-brand-black text-white rounded-lg text-xs font-semibold">{c.callToAction}</span>}
                {c.landingUrl && (
                  <a href={c.landingUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold text-brand-black hover:underline">
                    <ExternalLink size={12} /> {c.landingUrl}
                  </a>
                )}
              </div>
            </Section>

            {/* Tracking */}
            <Section icon={Activity} title="Tracking">
              <div className="flex items-center gap-2 mb-4">
                <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (c.isTrackingEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                  {c.isTrackingEnabled ? 'Tracking enabled' : 'Tracking disabled'}
                </span>
                {c.utmSource && <span className="text-[11px] text-text-muted">utm: {c.utmSource}/{c.utmMedium}/{c.utmCampaign}</span>}
              </div>

              {/* Daily bar chart */}
              {dailyStats.length > 0 && (
                <div className="mb-4">
                  <div className="text-[10px] font-semibold text-text-muted uppercase mb-2">Impressions · last {dailyStats.length} days</div>
                  <div className="flex items-end gap-1 h-20">
                    {dailyStats.map((d, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${d.stat_date}: ${d.impressions || 0} impr, ${d.clicks || 0} clicks`}>
                        <div className="w-full rounded-t bg-gradient-to-t from-indigo-600 to-purple-500 transition-all hover:from-indigo-500"
                          style={{ height: Math.max(4, ((Number(d.impressions || 0)) / maxImp) * 72) + 'px' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent events */}
              {c.recentEvents?.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-text-muted uppercase mb-2">Recent events</div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {c.recentEvents.map((e, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                        <span className={'font-bold px-2 py-0.5 rounded-full ' + (EVENT_COLORS[e.event_type] || 'bg-gray-100')}>{e.event_type}</span>
                        <span className="text-text-muted">{e.device || '—'}{e.utm_source ? ' · ' + e.utm_source : ''}</span>
                        <span className="text-text-muted">{new Date(e.occurred_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {c.isTrackingEnabled && (
                <button
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await adsAPI.getCampaignTrackingUrls(c.id);
                      const d = r.data?.data || r.data || {};
                      const url = d.clickUrl || d.landingUrl || '';
                      if (url) copy(url, 'Tracking URL');
                    } catch { /* ignore */ }
                    setBusy(false);
                  }}
                  disabled={busy}
                  className="mt-4 flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50">
                  <Zap size={13} /> Copy tracking link
                </button>
              )}
            </Section>

            {/* Automation rules */}
            <Section icon={Sparkles} title="Automation Rules">
              {c.automationRules?.length ? (
                <div className="space-y-2">
                  {c.automationRules.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                      <div>
                        <span className="font-semibold">{r.name}</span>
                        <span className="text-text-muted text-xs ml-2">
                          {r.metric} {r.operator} {r.threshold} → {r.action}{r.action === 'SCALE' ? ' ' + r.scale_percent + '%' : ''}
                        </span>
                      </div>
                      <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (r.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {r.is_enabled ? 'ON' : 'OFF'} · fired {r.times_triggered || 0}x
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No automation rules attached to this campaign yet.</p>
              )}
            </Section>

            {/* Experiments */}
            <Section icon={GitBranch} title="A/B Experiments">
              {c.experiments?.length ? (
                <div className="space-y-2">
                  {c.experiments.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2.5 border border-gray-100">
                      <div>
                        <span className="font-semibold">{e.name}</span>
                        <span className="text-text-muted text-xs ml-2">{e.objective} · {e.variants?.length || 0} variants</span>
                      </div>
                      <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (e.status === 'RUNNING' ? 'bg-blue-100 text-blue-700' : e.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                        {e.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-text-muted">No experiments running for this campaign.</p>
              )}
            </Section>

            {/* Notes */}
            {c.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
                <div className="text-[10px] font-bold uppercase mb-1 text-amber-600">Notes</div>
                {c.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

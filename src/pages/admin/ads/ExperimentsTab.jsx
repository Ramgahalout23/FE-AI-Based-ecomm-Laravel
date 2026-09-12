import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch, Plus, Trash2, Play, Trophy, CheckCircle2,
  FlaskConical, Target, MousePointerClick, TrendingUp,
  Sparkles, Activity, Award, RefreshCw, BarChart2
} from 'lucide-react';
import toast from '../../../utils/toast';
import { useConfirm } from '../../../contexts/ConfirmContext';

const STATUS_BADGE = {
  DRAFT: 'bg-gray-100 text-gray-600',
  RUNNING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
};

const OBJ_META = {
  CONVERSION: { label: 'Conversion rate', icon: Target },
  CLICKS: { label: 'CTR', icon: MousePointerClick },
  AWARENESS: { label: 'Impressions', icon: TrendingUp },
};

export default function ExperimentsTab({ adsAPI, campaigns }) {
  const [experiments, setExperiments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', campaign_id: '', objective: 'CONVERSION', variant_campaign_ids: [] });
  const [saving, setSaving] = useState(false);
  const [declaring, setDeclaring] = useState(null);
  const [significanceData, setSignificanceData] = useState({});
  const [loadingSignificance, setLoadingSignificance] = useState({});
  const confirm = useConfirm();

  const fetchSignificance = async (expId) => {
    setLoadingSignificance(prev => ({ ...prev, [expId]: true }));
    try {
      const res = await adsAPI.getExperimentSignificance(expId);
      const data = res.data?.data || res.data || {};
      setSignificanceData(prev => ({ ...prev, [expId]: data }));
    } catch {
      toast.error('Failed to calculate statistical significance');
    }
    setLoadingSignificance(prev => ({ ...prev, [expId]: false }));
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adsAPI.getExperiments();
      const d = r.data?.data || r.data || [];
      setExperiments(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load experiments'); }
    setLoading(false);
  }, [adsAPI]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name) { toast.error('Experiment name is required'); return; }
    if (!form.campaign_id) { toast.error('Pick the control campaign'); return; }
    if (form.variant_campaign_ids.length === 0) { toast.error('Add at least one variant campaign'); return; }
    setSaving(true);
    try {
      await adsAPI.createExperiment({
        name: form.name,
        campaign_id: form.campaign_id,
        objective: form.objective,
        variant_campaign_ids: form.variant_campaign_ids,
      });
      toast.success('Experiment created');
      setShowForm(false);
      setForm({ name: '', campaign_id: '', objective: 'CONVERSION', variant_campaign_ids: [] });
      load();
    } catch { toast.error('Failed to create experiment'); }
    setSaving(false);
  };

  const start = async (exp) => {
    try {
      await adsAPI.startExperiment(exp.id);
      toast.success('Experiment started');
      load();
    } catch { toast.error('Failed to start'); }
  };

  const declareWinner = async (exp) => {
    if (!(await confirm({ title: 'Declare winner?', message: 'The experiment will be completed based on current metrics.', confirmLabel: 'Declare' }))) return;
    setDeclaring(exp.id);
    try {
      const r = await adsAPI.declareExperimentWinner(exp.id);
      const d = r.data?.data || {};
      toast.success(`Winner: ${d.label || 'Variant'}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to declare winner');
    }
    setDeclaring(null);
  };

  const remove = async (exp) => {
    if (!(await confirm({ title: 'Delete experiment?', message: `"${exp.name}" will be removed.`, confirmLabel: 'Delete' }))) return;
    try {
      await adsAPI.deleteExperiment(exp.id);
      toast.success('Experiment deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const campaignName = (id) => {
    const c = campaigns.find(c => c.id === id);
    return c ? c.name : 'Campaign';
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <GitBranch size={18} className="text-green-600" /> A/B Experiments
          </h3>
          <p className="text-sm text-text-muted">Run structured holdout tests across campaigns and let data pick the winner.</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={14} /> New experiment
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-5 space-y-4">
          <h4 className="font-bold text-sm flex items-center gap-2"><FlaskConical size={15} /> New A/B experiment</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Hero vs Minimal landing"
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Objective</label>
              <select value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm bg-white">
                {Object.keys(OBJ_META).map(o => <option key={o} value={o}>{OBJ_META[o].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Control campaign *</label>
              <select value={form.campaign_id} onChange={e => setForm({ ...form, campaign_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm bg-white">
                <option value="">Select control…</option>
                {campaigns.filter(c => !form.variant_campaign_ids.includes(c.id)).map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Variant campaigns *</label>
              <div className="border border-border rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                {campaigns.filter(c => c.id !== form.campaign_id).map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 rounded px-1.5 py-1">
                    <input type="checkbox" checked={form.variant_campaign_ids.includes(c.id)}
                      onChange={e => setForm({
                        ...form,
                        variant_campaign_ids: e.target.checked
                          ? [...form.variant_campaign_ids, c.id]
                          : form.variant_campaign_ids.filter(x => x !== c.id),
                      })} />
                    <span className="truncate">{c.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Creating…' : 'Create experiment'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner w-8 h-8 border-2 border-gray-200 border-t-brand-black rounded-full" /></div>
      ) : experiments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-12 text-center">
          <GitBranch size={36} className="mx-auto text-gray-300 mb-3" />
          <h4 className="font-bold text-text-primary">No experiments yet</h4>
          <p className="text-sm text-text-muted mt-1">Test creative directions head-to-head and let data decide.</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            + New experiment
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {experiments.map((exp) => {
            const ObjIcon = OBJ_META[exp.objective]?.icon || Target;
            const variants = exp.variants || [];
            const metrics = exp.variant_metrics || exp.variantMetrics || [];
            const campaignId = exp.campaign_id || exp.campaignId;
            const startedAt = exp.started_at || exp.startedAt;
            const winnerVariantId = exp.winner_variant_id || exp.winnerVariantId;
            const winnerReason = exp.winner_reason || exp.winnerReason;

            return (
              <div key={exp.id} className="bg-white rounded-2xl border border-border shadow-soft p-5">
                <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{exp.name}</span>
                      <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (STATUS_BADGE[exp.status] || 'bg-gray-100 text-gray-600')}>{exp.status}</span>
                      {exp.status === 'COMPLETED' && <Trophy size={14} className="text-amber-500" />}
                    </div>
                    <div className="text-xs text-text-muted mt-1 flex items-center gap-1.5 flex-wrap">
                      <ObjIcon size={11} /> Objective: {OBJ_META[exp.objective]?.label}
                      {campaignId && <><span>·</span><span>Control: {campaignName(campaignId)}</span></>}
                      {startedAt && <><span>·</span><span>Started {new Date(startedAt).toLocaleDateString()}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {exp.status === 'DRAFT' && (
                      <button onClick={() => start(exp)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors">
                        <Play size={12} /> Start
                      </button>
                    )}
                    {exp.status === 'RUNNING' && (
                      <button onClick={() => declareWinner(exp)} disabled={declaring === exp.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">
                        <Trophy size={12} /> {declaring === exp.id ? 'Declaring…' : 'Declare winner'}
                      </button>
                    )}
                    <button onClick={() => remove(exp)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={15} className="text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Variant comparison */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {variants.map((v) => {
                    const m = metrics.find(x => (x.variant_id || x.variantId) === v.id);
                    const isWinner = winnerVariantId === v.id;
                    const isControl = v.is_control ?? v.isControl;
                    const vCampaignId = v.campaign_id ?? v.campaignId;

                    return (
                      <div key={v.id} className={'rounded-xl border p-3 relative ' + (isWinner ? 'border-green-400 bg-green-50' : 'border-gray-100 bg-gray-50')}>
                        {isWinner && (
                          <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[9px] font-bold text-green-700 bg-green-100 rounded-full px-1.5 py-0.5">
                            <CheckCircle2 size={9} /> WINNER
                          </span>
                        )}
                        <div className="text-[10px] font-bold uppercase tracking-wide text-text-muted flex items-center gap-1">
                          {isControl ? <CheckCircle2 size={10} /> : <FlaskConical size={10} />} {v.label}
                        </div>
                        <div className="text-[11px] text-text-muted truncate mt-0.5">{v.campaign?.name || campaignName(vCampaignId)}</div>
                        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                          <div>CTR <span className="font-bold">{m?.metrics?.ctr ?? '—'}%</span></div>
                          <div>Conv <span className="font-bold">{m?.metrics?.conversionRate ?? '—'}%</span></div>
                          <div>ROAS <span className="font-bold">{m?.metrics?.roas ?? '—'}x</span></div>
                          <div>CPC <span className="font-bold">{m?.metrics?.cpc ?? '—'}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Statistical Significance Section */}
                {significanceData[exp.id] ? (
                  <div className="mt-3 bg-gray-900 text-white rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Activity size={15} className="text-indigo-400" />
                        <span className="text-xs font-bold text-gray-100">A/B Testing Statistical Significance</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          significanceData[exp.id].isSignificant
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {significanceData[exp.id].isSignificant ? 'Statistically Significant (p < 0.05)' : 'Inconclusive / More Data Needed'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">Confidence:</span>
                        <span className={`text-sm font-bold ${significanceData[exp.id].confidenceLevel >= 95 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {significanceData[exp.id].confidenceLevel}%
                        </span>
                        <button
                          onClick={() => fetchSignificance(exp.id)}
                          className="p-1 hover:text-white text-gray-400 transition-colors ml-1"
                          title="Recalculate"
                        >
                          <RefreshCw size={12} className={loadingSignificance[exp.id] ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </div>

                    {/* Uplift and power bar */}
                    <div className="bg-gray-800/80 rounded-lg p-3 text-xs space-y-2">
                      <div className="text-gray-300 font-medium leading-relaxed">
                        {significanceData[exp.id].recommendation}
                      </div>

                      {significanceData[exp.id].comparisons?.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {significanceData[exp.id].comparisons.map((c) => (
                            <div key={c.variantId} className="bg-gray-900/60 rounded-lg p-2 flex items-center justify-between text-[11px]">
                              <div>
                                <span className="font-semibold text-gray-200">{c.variantName}</span>
                                <span className="text-gray-400 ml-1.5">(z={c.zScore}, p={c.pValue})</span>
                              </div>
                              <span className={`font-bold ${c.uplift >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {c.uplift >= 0 ? `+${c.uplift}%` : `${c.uplift}%`}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl px-3.5 py-2.5">
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <Sparkles size={14} className="text-indigo-600" />
                      <span>Compute 2-sample z-test, p-value, and confidence interval for this experiment.</span>
                    </div>
                    <button
                      onClick={() => fetchSignificance(exp.id)}
                      disabled={loadingSignificance[exp.id]}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors disabled:opacity-50"
                    >
                      <Activity size={12} className={loadingSignificance[exp.id] ? 'animate-spin' : ''} />
                      {loadingSignificance[exp.id] ? 'Calculating…' : 'Analyze Significance'}
                    </button>
                  </div>
                )}

                {winnerReason && (
                  <div className="mt-3 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                    {winnerReason}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

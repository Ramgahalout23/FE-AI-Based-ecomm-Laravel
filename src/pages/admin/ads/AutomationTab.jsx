import { useState, useEffect, useCallback } from 'react';
import {
  Zap, Plus, Trash2, Play, ToggleLeft, ToggleRight,
  AlertTriangle, TrendingUp, TrendingDown, Scale, Rocket
} from 'lucide-react';
import toast from '../../../utils/toast';
import { useConfirm } from '../../../contexts/ConfirmContext';

const METRICS = ['CTR', 'CPC', 'ROAS', 'CONVERSION_RATE', 'SPEND', 'IMPRESSIONS', 'CLICKS'];
const OPERATORS = {
  GT: 'rises above',
  GTE: 'is at least',
  LT: 'drops below',
  LTE: 'is at most',
  EQ: 'equals',
};
const ACTIONS = ['PAUSE', 'ACTIVATE', 'COMPLETE', 'SCALE_BUDGET_UP', 'SCALE_BUDGET_DOWN'];

const EMPTY = {
  name: '', campaign_id: '', metric: 'CTR', operator: 'LT',
  threshold: '', window_days: 7, action: 'PAUSE', scale_percent: 20,
  is_enabled: true, status: 'ACTIVE',
};

export default function AutomationTab({ adsAPI, campaigns }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adsAPI.getAutomationRules();
      const d = r.data?.data || r.data || [];
      setRules(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load automation rules'); }
    setLoading(false);
  }, [adsAPI]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name) { toast.error('Rule name is required'); return; }
    if (form.threshold === '' || form.threshold === null) { toast.error('Threshold is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        threshold: Number(form.threshold),
        window_days: Number(form.window_days),
        scale_percent: Number(form.scale_percent),
        is_enabled: !!form.is_enabled,
      };
      if (editing) {
        await adsAPI.updateAutomationRule(editing.id, payload);
        toast.success('Rule updated');
      } else {
        await adsAPI.createAutomationRule(payload);
        toast.success('Rule created');
      }
      setShowForm(false);
      setForm(EMPTY);
      setEditing(null);
      load();
    } catch { toast.error('Failed to save rule'); }
    setSaving(false);
  };

  const remove = async (rule) => {
    if (!(await confirm({ title: 'Delete automation rule?', message: `"${rule.name}" will be removed.`, confirmLabel: 'Delete' }))) return;
    try {
      await adsAPI.deleteAutomationRule(rule.id);
      toast.success('Rule deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const toggle = async (rule) => {
    try {
      await adsAPI.updateAutomationRule(rule.id, { is_enabled: !rule.is_enabled });
      toast.success(rule.is_enabled ? 'Rule disabled' : 'Rule enabled');
      load();
    } catch { toast.error('Failed to update'); }
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const r = await adsAPI.runAutomationRules();
      const d = r.data?.data || {};
      setLastRun(d);
      toast.success(`Evaluated ${d.evaluated || 0} · triggered ${d.triggered || 0}`);
      load();
    } catch { toast.error('Failed to run rules'); }
    setRunning(false);
  };

  const campaignName = (id) => {
    if (!id) return 'All campaigns';
    const c = campaigns.find(c => c.id === id);
    return c ? c.name : 'All campaigns';
  };

  const ActionIcon = ({ action }) => {
    if (action === 'SCALE_BUDGET_UP' || action === 'SCALE_BUDGET_DOWN') return <Scale size={13} />;
    if (action === 'PAUSE') return <AlertTriangle size={13} />;
    if (action === 'COMPLETE') return <TrendingUp size={13} />;
    return <Rocket size={13} />;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <Zap size={18} className="text-amber-500" /> Automation Rules
          </h3>
          <p className="text-sm text-text-muted">Auto-pause, activate, complete or scale campaigns when KPIs cross your thresholds.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={runNow} disabled={running}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50">
            <Play size={14} /> {running ? 'Running…' : 'Run now'}
          </button>
          <button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus size={14} /> New rule
          </button>
        </div>
      </div>

      {lastRun && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-800 flex items-center gap-2">
          <Zap size={14} />
          Last run: {lastRun.evaluated || 0} rules evaluated, {lastRun.triggered || 0} triggered, {lastRun.skipped || 0} skipped
        </div>
      )}

      {/* Rule form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-5 space-y-4">
          <h4 className="font-bold text-sm">{editing ? 'Edit rule' : 'New automation rule'}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-text-muted block mb-1">Rule name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Pause when CTR tanks"
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Campaign</label>
              <select value={form.campaign_id} onChange={e => setForm({ ...form, campaign_id: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm bg-white">
                <option value="">All campaigns</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Metric</label>
              <select value={form.metric} onChange={e => setForm({ ...form, metric: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm bg-white">
                {METRICS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Condition</label>
              <select value={form.operator} onChange={e => setForm({ ...form, operator: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm bg-white">
                {Object.entries(OPERATORS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Threshold</label>
              <input type="number" step="0.01" value={form.threshold} onChange={e => setForm({ ...form, threshold: e.target.value })}
                placeholder="e.g. 2.5"
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Window (days)</label>
              <input type="number" min="1" value={form.window_days} onChange={e => setForm({ ...form, window_days: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Action</label>
              <select value={form.action} onChange={e => setForm({ ...form, action: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm bg-white">
                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            {(form.action === 'SCALE_BUDGET_UP' || form.action === 'SCALE_BUDGET_DOWN') && (
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Scale %</label>
                <input type="number" min="5" max="500" value={form.scale_percent} onChange={e => setForm({ ...form, scale_percent: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black outline-none text-sm" />
              </div>
            )}
            <div className="flex items-end">
              <button onClick={() => setForm({ ...form, is_enabled: !form.is_enabled })}
                className="flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-brand-black transition-colors">
                {form.is_enabled ? <ToggleRight size={20} className="text-green-600" /> : <ToggleLeft size={20} />}
                {form.is_enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Saving…' : (editing ? 'Update rule' : 'Create rule')}
            </button>
          </div>
        </div>
      )}

      {/* Rules list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner w-8 h-8 border-2 border-gray-200 border-t-brand-black rounded-full" /></div>
      ) : rules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-12 text-center">
          <Zap size={36} className="mx-auto text-gray-300 mb-3" />
          <h4 className="font-bold text-text-primary">No automation rules yet</h4>
          <p className="text-sm text-text-muted mt-1">Create your first rule to auto-manage campaign performance.</p>
          <button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }}
            className="mt-4 px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            + Create rule
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="bg-white rounded-2xl border border-border shadow-soft p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm truncate">{rule.name}</span>
                  <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (rule.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {rule.is_enabled ? 'ON' : 'OFF'}
                  </span>
                  <span className="text-[10px] text-text-muted">fired {rule.times_triggered || 0}×</span>
                </div>
                <div className="text-xs text-text-muted mt-1 flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-text-primary">{campaignName(rule.campaign_id)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <ActionIcon action={rule.action} />
                    When {rule.metric} {OPERATORS[rule.operator]} {rule.threshold}{(rule.action === 'SCALE_BUDGET_UP' || rule.action === 'SCALE_BUDGET_DOWN') ? ` → scale budget ${rule.scale_percent}% ${rule.action.includes('UP') ? 'up' : 'down'}` : ` → ${rule.action.replace(/_/g, ' ')}`}
                  </span>
                  <span>· last {rule.window_days}d window</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => toggle(rule)} title="Toggle"
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                  {rule.is_enabled ? <ToggleRight size={17} className="text-green-600" /> : <ToggleLeft size={17} className="text-gray-400" />}
                </button>
                <button onClick={() => { setEditing(rule); setForm({ ...EMPTY, ...rule, operator: OPERATORS[rule.operator] ? rule.operator : 'LT', threshold: rule.threshold, window_days: rule.window_days, scale_percent: rule.scale_percent }); setShowForm(true); }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-sm font-semibold">Edit</button>
                <button onClick={() => remove(rule)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={16} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Explainers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: TrendingDown, title: 'Protect spend', text: 'Pause campaigns when CTR or ROAS drops below target.' },
          { icon: Scale, title: 'Scale winners', text: 'Automatically increase budget of campaigns beating KPIs.' },
          { icon: Rocket, title: 'Reactivate', text: 'Re-enable campaigns when conditions recover.' },
        ].map((f, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-4">
            <f.icon size={16} className="text-brand-black mb-2" />
            <div className="text-sm font-semibold">{f.title}</div>
            <p className="text-xs text-text-muted mt-1">{f.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

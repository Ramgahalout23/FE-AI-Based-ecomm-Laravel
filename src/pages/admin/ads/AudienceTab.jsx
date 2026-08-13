import { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, Trash2, RefreshCw, Eye, Repeat,
  UserRound
} from 'lucide-react';
import toast from '../../../utils/toast';
import { useConfirm } from '../../../contexts/ConfirmContext';

const SOURCE_EVENT_OPTIONS = ['CLICK', 'IMPRESSION', 'CONVERSION', 'PURCHASE'];

const EMPTY = {
  name: '', description: '', type: 'SAVED', platform: 'ALL',
  source_events: ['CLICK'], lookback_days: 30,
  age_min: 18, age_max: 65, gender: 'ALL', locations: [], interests: [],
  devices: [], is_enabled: true,
};

export default function AudienceTab({ adsAPI }) {
  const [audiences, setAudiences] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([
        adsAPI.getAudiences(),
        adsAPI.getAudienceDashboard(),
      ]);
      const list = r.data?.data?.data || r.data?.data || r.data || [];
      setAudiences(Array.isArray(list) ? list : []);
      setDashboard(d.data?.data || d.data || null);
    } catch { toast.error('Failed to load audiences'); }
    setLoading(false);
  }, [adsAPI]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name) { toast.error('Audience name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        type: form.type,
        platform: form.platform,
        source_events: form.type === 'RETARGETING' ? form.source_events : null,
        lookback_days: form.type === 'RETARGETING' ? Number(form.lookback_days) : 30,
        criteria: form.type === 'SAVED' ? {
          age_min: Number(form.age_min || 18),
          age_max: Number(form.age_max || 65),
          gender: form.gender,
          locations: form.locations,
          interests: form.interests,
          devices: form.devices,
        } : null,
        is_enabled: !!form.is_enabled,
      };
      if (editing) {
        await adsAPI.updateAudience(editing.id, payload);
        toast.success('Audience updated');
      } else {
        await adsAPI.createAudience(payload);
        toast.success('Audience created');
      }
      setShowForm(false);
      setForm(EMPTY);
      setEditing(null);
      load();
    } catch { toast.error('Failed to save audience'); }
    setSaving(false);
  };

  const remove = async (a) => {
    if (!(await confirm({ title: 'Delete audience?', message: `"${a.name}" will be removed.`, confirmLabel: 'Delete' }))) return;
    try {
      await adsAPI.deleteAudience(a.id);
      toast.success('Audience deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      const r = await adsAPI.refreshAllAudienceCounts();
      const d = r.data?.data || {};
      toast.success(`Refreshed ${d.updated || 0} audiences`);
      load();
    } catch { toast.error('Failed to refresh'); }
    setRefreshing(false);
  };

  const splitTags = (value, setter) => {
    const tags = value.split(',').map(t => t.trim()).filter(Boolean);
    setter(tags);
  };

  const totals = dashboard?.totals || {};
  const byType = dashboard?.byType || {};

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <Users size={18} className="text-indigo-500" /> Audience Manager
          </h3>
          <p className="text-sm text-text-muted">Saved audiences & retargeting lists built from your tracking data.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshAll} disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-white border border-border hover:border-brand-black/30 transition-colors disabled:opacity-50">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Refresh counts
          </button>
          <button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            <Plus size={14} /> New audience
          </button>
        </div>
      </div>

      {/* Dashboard stats */}
      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total audiences', value: totals.total || 0 },
            { label: 'Members', value: (totals.totalMembers || 0).toLocaleString() },
            { label: 'Saved', value: byType.SAVED || 0 },
            { label: 'Retargeting', value: byType.RETARGETING || 0 },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-border shadow-soft p-4 text-center">
              <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{s.label}</div>
              <div className="text-xl font-bold font-display mt-1">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm">{editing ? 'Edit audience' : 'New audience'}</h4>
            <div className="flex gap-2">
              <button onClick={() => setForm({ ...form, type: 'SAVED' })}
                className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ' + (form.type === 'SAVED' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-text-muted')}>
                Saved
              </button>
              <button onClick={() => setForm({ ...form, type: 'RETARGETING' })}
                className={'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ' + (form.type === 'RETARGETING' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-text-muted')}>
                Retargeting
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. High-intent shoppers"
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Platform</label>
              <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm bg-white">
                {['ALL', 'INSTAGRAM', 'FACEBOOK', 'GOOGLE'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-text-muted block mb-1">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black outline-none text-sm" />
            </div>

            {form.type === 'RETARGETING' ? (
              <>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Source events</label>
                  <div className="flex flex-wrap gap-1.5">
                    {SOURCE_EVENT_OPTIONS.map(ev => (
                      <button key={ev}
                        onClick={() => setForm({
                          ...form,
                          source_events: form.source_events.includes(ev)
                            ? form.source_events.filter(x => x !== ev)
                            : [...form.source_events, ev],
                        })}
                        className={'px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ' + (form.source_events.includes(ev) ? 'bg-purple-600 text-white' : 'bg-gray-100 text-text-muted')}>
                        {ev}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Lookback (days)</label>
                  <input type="number" min="1" max="180" value={form.lookback_days}
                    onChange={e => setForm({ ...form, lookback_days: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black outline-none text-sm" />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Min age</label>
                    <input type="number" value={form.age_min} onChange={e => setForm({ ...form, age_min: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-text-muted block mb-1">Max age</label>
                    <input type="number" value={form.age_max} onChange={e => setForm({ ...form, age_max: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-text-muted block mb-1">Gender</label>
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm bg-white">
                    {['ALL', 'MALE', 'FEMALE'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-text-muted block mb-1">Locations (comma separated)</label>
                  <input value={form.locations.join(', ')} onChange={e => splitTags(e.target.value, (t) => setForm({ ...form, locations: t }))}
                    placeholder="Mumbai, Delhi, Bengaluru"
                    className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-text-muted block mb-1">Interests (comma separated)</label>
                  <input value={form.interests.join(', ')} onChange={e => splitTags(e.target.value, (t) => setForm({ ...form, interests: t }))}
                    placeholder="fashion, sneakers, streetwear"
                    className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm" />
                </div>
              </>
            )}

            <div className="flex items-end">
              <button onClick={() => setForm({ ...form, is_enabled: !form.is_enabled })}
                className="flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-brand-black transition-colors">
                <span className={'w-9 h-5 rounded-full transition-colors relative ' + (form.is_enabled ? 'bg-green-500' : 'bg-gray-300')}>
                  <span className='absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all' style={{ left: form.is_enabled ? 18 : 2 }} />
                </span>
                {form.is_enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Saving…' : (editing ? 'Update audience' : 'Create audience')}
            </button>
          </div>
        </div>
      )}

      {/* Audience list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner w-8 h-8 border-2 border-gray-200 border-t-brand-black rounded-full" /></div>
      ) : audiences.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-12 text-center">
          <Users size={36} className="mx-auto text-gray-300 mb-3" />
          <h4 className="font-bold text-text-primary">No audiences yet</h4>
          <p className="text-sm text-text-muted mt-1">Build saved or retargeting audiences to power your campaigns.</p>
          <button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }}
            className="mt-4 px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            + Create audience
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {audiences.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-border shadow-soft p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {a.type === 'RETARGETING' ? <Repeat size={14} className="text-purple-600" /> : <UserRound size={14} className="text-indigo-600" />}
                  <span className="font-bold text-sm truncate">{a.name}</span>
                  <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (a.type === 'RETARGETING' ? 'bg-purple-100 text-purple-700' : 'bg-indigo-100 text-indigo-700')}>
                    {a.type}
                  </span>
                  <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (a.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {a.is_enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-1 flex items-center gap-2 flex-wrap">
                  <span className="flex items-center gap-1"><Eye size={11} /> {(a.member_count || 0).toLocaleString()} members</span>
                  <span>·</span>
                  <span>{a.platform || 'ALL'}</span>
                  {a.type === 'RETARGETING' ? (
                    <><span>·</span><span>{a.source_events?.join(', ') || '—'} · {a.lookback_days}d lookback</span></>
                  ) : (
                    <>
                      {a.criteria && <><span>·</span><span>age {a.criteria.age_min || 18}-{a.criteria.age_max || 65}</span></>}
                      {a.criteria?.locations?.length > 0 && <><span>·</span><span>{a.criteria.locations.join(', ')}</span></>}
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={async () => {
                  try {
                    await adsAPI.refreshAudienceCount(a.id);
                    toast.success('Count refreshed');
                    load();
                  } catch { toast.error('Refresh failed'); }
                }} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" title="Refresh count">
                  <RefreshCw size={15} className="text-text-muted" />
                </button>
                <button onClick={() => { setEditing(a); setForm({
                  ...EMPTY,
                  name: a.name, description: a.description, type: a.type, platform: a.platform,
                  source_events: a.source_events || ['CLICK'], lookback_days: a.lookback_days || 30,
                  age_min: a.criteria?.age_min || 18, age_max: a.criteria?.age_max || 65,
                  gender: a.criteria?.gender || 'ALL',
                  locations: a.criteria?.locations || [], interests: a.criteria?.interests || [],
                  devices: a.criteria?.devices || [], is_enabled: a.is_enabled,
                }); setShowForm(true); }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-sm font-semibold">Edit</button>
                <button onClick={() => remove(a)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={15} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

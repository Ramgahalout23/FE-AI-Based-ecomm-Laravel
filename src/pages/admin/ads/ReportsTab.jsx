import { useState, useEffect, useCallback } from 'react';
import {
  FileDown, Plus, Trash2, Send, CalendarClock, Mail,
  FileSpreadsheet, BarChart3, Users, Activity, Target
} from 'lucide-react';
import toast from '../../../utils/toast';
import { useConfirm } from '../../../contexts/ConfirmContext';

const SECTIONS = [
  { id: 'summary', label: 'Summary', icon: BarChart3 },
  { id: 'platforms', label: 'Platform breakdown', icon: Target },
  { id: 'top_campaigns', label: 'Top campaigns', icon: Activity },
  { id: 'tracking', label: 'Tracking events', icon: Users },
];

const EXPORTS = [
  { kind: 'campaigns', label: 'Campaigns CSV', desc: 'All campaigns with targeting, budget & performance' },
  { kind: 'daily', label: 'Daily stats CSV', desc: 'Per-day impressions, clicks, conversions & spend' },
  { kind: 'events', label: 'Tracking events CSV', desc: 'Raw click / impression / conversion events' },
];

const EMPTY = {
  name: '', frequency: 'WEEKLY', day_of_week: 1, day_of_month: 1,
  time_of_day: '09:00', recipients: [''], sections: ['summary', 'top_campaigns'],
  is_enabled: true,
};

export default function ReportsTab({ adsAPI }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(null);
  const [exporting, setExporting] = useState(null);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adsAPI.getScheduledReports();
      const d = r.data?.data || r.data || [];
      setReports(Array.isArray(d) ? d : []);
    } catch { toast.error('Failed to load scheduled reports'); }
    setLoading(false);
  }, [adsAPI]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name) { toast.error('Report name is required'); return; }
    const recipients = form.recipients.map(r => r.trim()).filter(Boolean);
    if (recipients.length === 0) { toast.error('Add at least one recipient email'); return; }
    if (recipients.some(r => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r))) { toast.error('One of the emails is invalid'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        frequency: form.frequency,
        day_of_week: form.frequency === 'WEEKLY' ? Number(form.day_of_week) : null,
        day_of_month: form.frequency === 'MONTHLY' ? Number(form.day_of_month) : null,
        time_of_day: form.time_of_day,
        recipients,
        sections: form.sections,
        is_enabled: !!form.is_enabled,
      };
      if (editing) {
        await adsAPI.updateScheduledReport(editing.id, payload);
        toast.success('Report updated');
      } else {
        await adsAPI.createScheduledReport(payload);
        toast.success('Report scheduled');
      }
      setShowForm(false);
      setForm(EMPTY);
      setEditing(null);
      load();
    } catch { toast.error('Failed to save report'); }
    setSaving(false);
  };

  const remove = async (r) => {
    if (!(await confirm({ title: 'Delete scheduled report?', message: `"${r.name}" will stop sending.`, confirmLabel: 'Delete' }))) return;
    try {
      await adsAPI.deleteScheduledReport(r.id);
      toast.success('Report deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const sendNow = async (r) => {
    setSending(r.id);
    try {
      await adsAPI.sendReportNow(r.id);
      toast.success('Report sent');
      load();
    } catch { toast.error('Failed to send — check email config'); }
    setSending(null);
  };

  const doExport = async (kind) => {
    setExporting(kind);
    try {
      const r = await adsAPI.exportCsv(kind, {});
      const blob = r.data;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ad_${kind}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV downloaded');
    } catch { toast.error('Export failed'); }
    setExporting(null);
  };

  const frequencyLabel = (r) => {
    if (r.frequency === 'DAILY') return 'Daily';
    if (r.frequency === 'WEEKLY') return 'Weekly · ' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][(r.day_of_week || 1) - 1];
    return 'Monthly · day ' + (r.day_of_month || 1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-blue-600" /> Reports & Exports
          </h3>
          <p className="text-sm text-text-muted">Scheduled email digests + one-click CSV exports of your ad performance.</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={14} /> Schedule report
        </button>
      </div>

      {/* CSV exports */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {EXPORTS.map((e) => (
          <button key={e.kind} onClick={() => doExport(e.kind)} disabled={exporting === e.kind}
            className="bg-white rounded-xl border border-border shadow-soft p-4 text-left hover:border-brand-black/30 hover:shadow-md transition-all disabled:opacity-50 group">
            <div className="flex items-center justify-between mb-2">
              <FileDown size={18} className="text-blue-600 group-hover:scale-110 transition-transform" />
              {exporting === e.kind && <div className="spinner w-4 h-4 border-2 border-gray-200 border-t-blue-600 rounded-full" />}
            </div>
            <div className="text-sm font-bold">{e.label}</div>
            <p className="text-xs text-text-muted mt-0.5">{e.desc}</p>
          </button>
        ))}
      </div>

      {/* Schedule form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-5 space-y-4">
          <h4 className="font-bold text-sm flex items-center gap-2"><CalendarClock size={15} /> {editing ? 'Edit scheduled report' : 'Schedule email report'}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Report name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Weekly ads digest"
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Frequency</label>
              <select value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm bg-white">
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            {form.frequency === 'WEEKLY' && (
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Day of week</label>
                <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm bg-white">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((d, i) => (
                    <option key={i} value={i + 1}>{d}</option>
                  ))}
                </select>
              </div>
            )}
            {form.frequency === 'MONTHLY' && (
              <div>
                <label className="text-xs font-semibold text-text-muted block mb-1">Day of month</label>
                <input type="number" min="1" max="28" value={form.day_of_month}
                  onChange={e => setForm({ ...form, day_of_month: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm" />
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Send at</label>
              <input type="time" value={form.time_of_day} onChange={e => setForm({ ...form, time_of_day: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Recipients (emails)</label>
              <div className="space-y-1.5">
                {form.recipients.map((r, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input value={r} onChange={e => {
                      const next = [...form.recipients];
                      next[i] = e.target.value;
                      setForm({ ...form, recipients: next });
                    }} placeholder="admin@store.com"
                      className="flex-1 px-3 py-2 rounded-lg border border-border outline-none text-sm" />
                    {form.recipients.length > 1 && (
                      <button onClick={() => setForm({ ...form, recipients: form.recipients.filter((_, x) => x !== i) })}
                        className="px-2 rounded-lg text-red-500 hover:bg-red-50 text-xs">✕</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setForm({ ...form, recipients: [...form.recipients, ''] })}
                  className="text-xs font-semibold text-brand-black hover:underline">+ Add recipient</button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-text-muted block mb-1">Sections</label>
              <div className="flex flex-wrap gap-2">
                {SECTIONS.map(s => {
                  const Icon = s.icon;
                  const active = form.sections.includes(s.id);
                  return (
                    <button key={s.id} onClick={() => setForm({
                      ...form,
                      sections: active ? form.sections.filter(x => x !== s.id) : [...form.sections, s.id],
                    })}
                      className={'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ' + (active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200')}>
                      <Icon size={12} /> {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Saving…' : (editing ? 'Update schedule' : 'Schedule report')}
            </button>
          </div>
        </div>
      )}

      {/* Scheduled reports list */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner w-8 h-8 border-2 border-gray-200 border-t-brand-black rounded-full" /></div>
      ) : reports.length === 0 && !showForm ? (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-12 text-center">
          <Mail size={36} className="mx-auto text-gray-300 mb-3" />
          <h4 className="font-bold text-text-primary">No scheduled reports</h4>
          <p className="text-sm text-text-muted mt-1">Get performance digests delivered to your inbox on autopilot.</p>
          <button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }}
            className="mt-4 px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            + Schedule report
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-border shadow-soft p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <CalendarClock size={15} className="text-blue-600" />
                  <span className="font-bold text-sm truncate">{r.name}</span>
                  <span className={'text-[10px] font-bold px-2 py-0.5 rounded-full ' + (r.is_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {r.is_enabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <div className="text-xs text-text-muted mt-1 flex items-center gap-2 flex-wrap">
                  <span>{frequencyLabel(r)} at {r.time_of_day}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Mail size={11} /> {(r.recipients || []).join(', ')}</span>
                  {r.last_sent_at && <><span>·</span><span>last sent {new Date(r.last_sent_at).toLocaleString()}</span></>}
                </div>
                {(r.sections || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.sections.map((s, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 text-text-muted px-2 py-0.5 rounded-full">{s.replace('_', ' ')}</span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => sendNow(r)} disabled={sending === r.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                  <Send size={11} /> {sending === r.id ? 'Sending…' : 'Send now'}
                </button>
                <button onClick={() => { setEditing(r); setForm({
                  name: r.name, frequency: r.frequency, day_of_week: r.day_of_week || 1,
                  day_of_month: r.day_of_month || 1, time_of_day: r.time_of_day || '09:00',
                  recipients: r.recipients || [''], sections: r.sections || ['summary'],
                  is_enabled: r.is_enabled,
                }); setShowForm(true); }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-xs font-semibold">Edit</button>
                <button onClick={() => remove(r)} className="p-2 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 size={14} className="text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

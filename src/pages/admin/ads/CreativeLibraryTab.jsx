import { useState, useEffect, useCallback } from 'react';
import {
  Images, Plus, Trash2, Image as ImageIcon, Video, FileText,
  Layers, Link2
} from 'lucide-react';
import toast from '../../../utils/toast';
import { useConfirm } from '../../../contexts/ConfirmContext';

const MEDIA_OPTIONS = ['IMAGE', 'VIDEO', 'CAROUSEL'];
const CTA_OPTIONS = ['SHOP_NOW', 'LEARN_MORE', 'SIGN_UP', 'BOOK_NOW', 'CONTACT_US', 'DOWNLOAD', 'INSTALL', 'SUBSCRIBE', 'BUY_NOW'];

const MEDIA_ICONS = {
  IMAGE: ImageIcon,
  VIDEO: Video,
  CAROUSEL: Layers,
};

const EMPTY = {
  name: '', headline: '', primary_text: '', description: '',
  media_type: 'IMAGE', media_url: '', call_to_action: 'SHOP_NOW',
  is_archived: false,
};

export default function CreativeLibraryTab({ adsAPI, campaigns }) {
  const [creatives, setCreatives] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [applyTo, setApplyTo] = useState(null);
  const [applying, setApplying] = useState(false);
  const confirm = useConfirm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, d] = await Promise.all([
        adsAPI.getCreatives(),
        adsAPI.getCreativeDashboard(),
      ]);
      const list = r.data?.data?.data || r.data?.data || r.data || [];
      setCreatives(Array.isArray(list) ? list : []);
      setDashboard(d.data?.data || d.data || null);
    } catch { toast.error('Failed to load creatives'); }
    setLoading(false);
  }, [adsAPI]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name) { toast.error('Creative name is required'); return; }
    if (!form.headline && !form.primary_text && !form.media_url) { toast.error('Add a headline, primary text or media URL'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name, headline: form.headline, primary_text: form.primary_text,
        description: form.description, media_type: form.media_type,
        media_url: form.media_url, call_to_action: form.call_to_action, is_archived: !!form.is_archived,
      };
      if (editing) {
        await adsAPI.updateCreative(editing.id, payload);
        toast.success('Creative updated');
      } else {
        await adsAPI.createCreative(payload);
        toast.success('Creative created');
      }
      setShowForm(false);
      setForm(EMPTY);
      setEditing(null);
      load();
    } catch { toast.error('Failed to save creative'); }
    setSaving(false);
  };

  const remove = async (c) => {
    if (!(await confirm({ title: 'Delete creative?', message: `"${c.name}" will be removed from the library.`, confirmLabel: 'Delete' }))) return;
    try {
      await adsAPI.deleteCreative(c.id);
      toast.success('Creative deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const applyCreative = async () => {
    if (!applyTo) return;
    setApplying(true);
    try {
      await adsAPI.applyCreativeToCampaign(applyTo.creativeId, applyTo.campaignId);
      toast.success('Creative applied to campaign');
      setApplyTo(null);
    } catch { toast.error('Failed to apply creative'); }
    setApplying(false);
  };

  const totals = dashboard?.totals || {};

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <Images size={18} className="text-purple-500" /> Creative Library
          </h3>
          <p className="text-sm text-text-muted">Reusable ad creatives — apply across any campaign in one click.</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={14} /> New creative
        </button>
      </div>

      {/* Stats */}
      {dashboard && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Creatives', value: totals.total || 0 },
            { label: 'Images', value: totals.byMedia?.IMAGE || 0 },
            { label: 'Videos', value: totals.byMedia?.VIDEO || 0 },
            { label: 'Carousels', value: totals.byMedia?.CAROUSEL || 0 },
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
          <h4 className="font-bold text-sm">{editing ? 'Edit creative' : 'New creative'}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Summer Sale hero"
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Media type</label>
              <div className="flex flex-wrap gap-1.5">
                {MEDIA_OPTIONS.map(m => {
                  const Icon = MEDIA_ICONS[m] || FileText;
                  return (
                    <button key={m} onClick={() => setForm({ ...form, media_type: m })}
                      className={'flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ' + (form.media_type === m ? 'bg-purple-600 text-white' : 'bg-gray-100 text-text-muted hover:bg-gray-200')}>
                      <Icon size={12} /> {m}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-text-muted block mb-1">Headline</label>
              <input value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })}
                placeholder="Grab attention in 40 chars"
                maxLength="90"
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black outline-none text-sm" />
              <div className="text-right text-[10px] text-text-muted mt-0.5">{form.headline.length}/90</div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-text-muted block mb-1">Primary text</label>
              <textarea value={form.primary_text} onChange={e => setForm({ ...form, primary_text: e.target.value })}
                rows="3" placeholder="The body copy of your ad…"
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black outline-none text-sm resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-text-muted block mb-1">Media URL</label>
              <input value={form.media_url} onChange={e => setForm({ ...form, media_url: e.target.value })}
                placeholder="https://… (image / video URL)"
                className="w-full px-3 py-2 rounded-lg border border-border focus:ring-2 focus:ring-brand-black/20 focus:border-brand-black outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted block mb-1">Call to action</label>
              <select value={form.call_to_action} onChange={e => setForm({ ...form, call_to_action: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm bg-white">
                {CTA_OPTIONS.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => setForm({ ...form, is_archived: !form.is_archived })}
                className="flex items-center gap-2 text-sm font-semibold text-text-muted hover:text-brand-black transition-colors">
                <span className={'w-9 h-5 rounded-full transition-colors relative ' + (form.is_archived ? 'bg-gray-400' : 'bg-green-500')}>
                  <span className='absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all' style={{ left: form.is_archived ? 18 : 2 }} />
                </span>
                {form.is_archived ? 'Archived' : 'Active'}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:bg-gray-100 transition-colors">Cancel</button>
            <button onClick={save} disabled={saving}
              className="px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              {saving ? 'Saving…' : (editing ? 'Update creative' : 'Create creative')}
            </button>
          </div>
        </div>
      )}

      {/* Apply modal */}
      {applyTo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setApplyTo(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h4 className="font-bold text-sm flex items-center gap-2 mb-1"><Link2 size={15} /> Apply creative</h4>
            <p className="text-sm text-text-muted mb-4">Copy headline, primary text, CTA & media onto a campaign.</p>
            <label className="text-xs font-semibold text-text-muted block mb-1">Target campaign</label>
            <select value={applyTo.campaignId} onChange={e => setApplyTo({ ...applyTo, campaignId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-border outline-none text-sm bg-white mb-4">
              {campaigns.filter(c => c.status === 'DRAFT' || c.status === 'ACTIVE' || c.status === 'PAUSED').map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button onClick={() => setApplyTo(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-text-muted hover:bg-gray-100 transition-colors">Cancel</button>
              <button onClick={applyCreative} disabled={applying || !applyTo.campaignId}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50">
                {applying ? 'Applying…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Creative grid */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner w-8 h-8 border-2 border-gray-200 border-t-brand-black rounded-full" /></div>
      ) : creatives.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-12 text-center">
          <Images size={36} className="mx-auto text-gray-300 mb-3" />
          <h4 className="font-bold text-text-primary">No creatives yet</h4>
          <p className="text-sm text-text-muted mt-1">Build once, reuse across every campaign.</p>
          <button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }}
            className="mt-4 px-4 py-2 bg-brand-black text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            + Create creative
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {creatives.map((c) => {
            const Icon = MEDIA_ICONS[c.media_type] || FileText;
            return (
              <div key={c.id} className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden flex flex-col">
                <div className="h-28 bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 flex items-center justify-center text-white relative">
                  {c.media_url ? (
                    c.media_type === 'VIDEO' ? (
                      <video src={c.media_url} className="w-full h-full object-cover" />
                    ) : (
                      <img src={c.media_url} alt={c.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                    )
                  ) : (
                    <Icon size={36} className="opacity-80" />
                  )}
                  <span className="absolute top-2 left-2 bg-black/50 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{c.media_type}</span>
                  {c.is_archived
                    ? <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ARCHIVED</span>
                    : <span className="absolute top-2 right-2 bg-gray-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">ACTIVE</span>}
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <div className="font-bold text-sm truncate">{c.name}</div>
                  {c.headline && <div className="text-xs font-semibold text-purple-700 mt-1 truncate">{c.headline}</div>}
                  {c.primary_text && <p className="text-xs text-text-muted mt-1 line-clamp-2">{c.primary_text}</p>}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <span className="text-[10px] font-bold text-brand-black bg-gray-100 px-2 py-0.5 rounded-full">{c.call_to_action || '—'}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setApplyTo({ creativeId: c.id, campaignId: campaigns[0]?.id || '' })}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 text-white rounded-lg text-[11px] font-semibold hover:bg-purple-700 transition-colors">
                        <Link2 size={11} /> Apply
                      </button>
                      <button onClick={() => { setEditing(c); setForm({
                        name: c.name, headline: c.headline || '', primary_text: c.primary_text || '',
                        description: c.description || '', media_type: c.media_type || 'IMAGE',
                        media_url: c.media_url || '', call_to_action: c.call_to_action || 'SHOP_NOW',
                        is_archived: !!c.is_archived,
                      }); setShowForm(true); }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-xs font-semibold">Edit</button>
                      <button onClick={() => remove(c)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 size={13} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

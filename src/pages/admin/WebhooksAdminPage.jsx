import { useState, useEffect } from 'react';
import { webhooksAPI } from '../../api/webhooks';
import AdminFormField from '../../components/admin/AdminFormField';
import SaveButton from '../../components/admin/SaveButton';
import ActionButton from '../../components/admin/ActionButton';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField, webhookUrl } from '../../hooks/validationRules';
import toast from '../../utils/toast';

const AVAILABLE_EVENTS = [
  'order.created',
  'order.status_updated',
  'order.cancelled',
  'order.return_requested',
  'payment.completed',
  'user.registered',
  'cart.abandoned',
];

const EMPTY_FORM = { name: '', url: '', events: [], is_active: true };

export default function WebhooksAdminPage() {
  const [webhooks, setWebhooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showLogs, setShowLogs] = useState(null); // webhook id
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [testing, setTesting] = useState(null);

  // ── Inline form validation ──
  const validation = useAdminFormValidation({
    name: requiredField('Webhook name'),
    url: webhookUrl(),
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await webhooksAPI.getAll();
      const data = res.data?.data || [];
      setWebhooks(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Failed to load webhooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(EMPTY_FORM); setEditing(null); };

  const openCreate = () => { validation.reset(); resetForm(); setShowModal(true); };

  const openEdit = (wh) => {
    setEditing(wh);
    setForm({
      name: wh.name || '',
      url: wh.url || '',
      events: wh.events || [],
      is_active: wh.is_active,
    });
    validation.reset();
    setShowModal(true);
  };

  const openLogs = async (wh) => {
    setShowLogs(wh);
    setLogsLoading(true);
    try {
      const res = await webhooksAPI.getLogs(wh.id);
      const data = res.data?.data?.data || [];
      setLogs(Array.isArray(data) ? data : []);
    } catch {
      setLogs([]);
      toast.error('Failed to load logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const toggleEvent = (ev) => {
    setForm(prev => ({
      ...prev,
      events: prev.events.includes(ev)
        ? prev.events.filter(e => e !== ev)
        : [...prev.events, ev],
    }));
  };

  const handleSave = async () => {
    if (!validation.validateForm(form)) return;
    try {
      if (editing) {
        await webhooksAPI.update(editing.id, form);
        toast.success('Webhook updated');
      } else {
        await webhooksAPI.create(form);
        toast.success('Webhook created');
      }
      load();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save webhook');
      return false;
    }
  };

  const handleDelete = async (id) => {
    try {
      await webhooksAPI.delete(id);
      toast.success('Webhook deleted');
      load();
      if (showLogs?.id === id) setShowLogs(null);
      return true;
    } catch {
      toast.error('Failed to delete webhook');
      return false;
    }
  };

  const handleTest = async (id) => {
    setTesting(id);
    try {
      await webhooksAPI.test(id);
      toast.success('Test event dispatched! Check logs for delivery status.');
    } catch {
      toast.error('Failed to send test event');
    } finally {
      setTesting(null);
    }
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div>
          <h2>Webhooks</h2>
          <p>Send real-time event notifications to external services</p>
        </div>
        <button className="btn-dark btn-sm" onClick={openCreate}>+ Add Webhook</button>
      </div>

      {/* Webhooks list */}
      <div className="table-card">
        <div className="table-toolbar">
          <span className="table-count">{webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            Events: order.created, order.status_updated, payment.completed, user.registered & more
          </span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>URL</th>
              <th>Events</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : webhooks.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <div className="empty-state-icon" style={{ fontSize: '2rem' }}>🔗</div>
                    <h3>No webhooks configured</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                      Create webhooks to receive real-time events from your store.
                    </p>
                    <button className="btn-dark btn-sm" style={{ marginTop: '0.75rem' }} onClick={openCreate}>
                      Create your first webhook
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              webhooks.map(wh => (
                <tr key={wh.id}>
                  <td><strong>{wh.name}</strong></td>
                  <td style={{ maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem', fontFamily: 'monospace' }}>{wh.url}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {(wh.events || []).slice(0, 2).map(ev => (
                        <span key={ev} className="status-badge" style={{ background: 'rgba(201,169,110,0.12)', color: '#C9A96E', fontSize: '0.68rem' }}>{ev}</span>
                      ))}
                      {(wh.events || []).length > 2 && (
                        <span className="status-badge" style={{ background: 'var(--off-white)', color: 'var(--muted)', fontSize: '0.68rem' }}>+{wh.events.length - 2}</span>
                      )}
                      {(wh.events || []).length === 0 && <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontStyle: 'italic' }}>All events</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${wh.is_active ? 'status-active' : 'status-pending'}`} style={{ fontSize: '0.72rem' }}>
                      {wh.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn-edit" onClick={() => openLogs(wh)}>Logs</button>
                      <button className="btn-edit" onClick={() => handleTest(wh.id)} disabled={testing === wh.id}>
                        {testing === wh.id ? 'Sending...' : 'Test'}
                      </button>
                      <button className="btn-edit" onClick={() => openEdit(wh)}>Edit</button>
                      <ActionButton className="btn-del" confirm="Delete this webhook? This cannot be undone." onClick={() => handleDelete(wh.id)} idle="Delete" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Logs Panel */}
      {showLogs && (
        <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
          <div className="detail-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3>📋 Delivery Logs — {showLogs.name}</h3>
            <button className="btn-ghost btn-sm" onClick={() => setShowLogs(null)}>Close</button>
          </div>
          {logsLoading ? (
            <div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <p style={{ color: 'var(--muted)' }}>No delivery logs yet. Try sending a test event.</p>
            </div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Status</th>
                    <th>Response</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td><code style={{ fontSize: '0.78rem' }}>{log.event}</code></td>
                      <td>
                        <span className={`status-badge ${log.success ? 'status-active' : 'status-cancelled'}`} style={{ fontSize: '0.72rem' }}>
                          {log.success ? 'Delivered' : 'Failed'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                        {log.response_status ? `${log.response_status}` : '—'}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                        {log.attempted_at ? new Date(log.attempted_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editing ? '✏️ Edit Webhook' : '➕ New Webhook'}</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <AdminFormField className="form-full" label="Webhook Name" required error={validation.errors.name} valid={validation.validFields.name}>
                  <input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); validation.handleChange('name', e.target.value); }} placeholder="e.g. Order Notifier" />
                </AdminFormField>
                <AdminFormField className="form-full" label="Endpoint URL" required error={validation.errors.url} valid={validation.validFields.url}>
                  <input value={form.url} onChange={e => { setForm({ ...form, url: e.target.value }); validation.handleChange('url', e.target.value); }} placeholder="https://hooks.example.com/webhook" type="url" />
                </AdminFormField>
                <div className="form-group form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <label>Subscribe to Events</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: '0.75rem' }}>
                    Select which events should trigger this webhook. Leave empty to receive all events.
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {AVAILABLE_EVENTS.map(ev => (
                      <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: '8px', background: form.events.includes(ev) ? 'rgba(201,169,110,0.08)' : 'var(--surface)', border: `1px solid ${form.events.includes(ev) ? 'rgba(201,169,110,0.3)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                        <input type="checkbox" checked={form.events.includes(ev)} onChange={() => toggleEvent(ev)} style={{ width: '15px', height: '15px' }} />
                        <code style={{ fontSize: '0.75rem' }}>{ev}</code>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} style={{ width: '16px', height: '16px' }} />
                    <strong>Active</strong>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    Inactive webhooks won't receive events
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
              <SaveButton onClick={handleSave} onSuccess={() => { setShowModal(false); resetForm(); }} idleLabel={editing ? 'Update Webhook' : 'Create Webhook'} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

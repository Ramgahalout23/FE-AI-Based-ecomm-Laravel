import { Search, Plus, RefreshCw, Trash2, CheckCircle, ExternalLink, Clock } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/admin';
import { PageSkeleton } from '../../components/admin/pageSkeletonConfig';
import AdminFormField from '../../components/admin/AdminFormField';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField, currencyCode } from '../../hooks/validationRules';
import toast from '../../utils/toast';

;

/** Format a timestamp as a relative time string (e.g. "2 hours ago", "Yesterday") */
function formatTimeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const DEFAULT_FORM = {
  code: '',
  name: '',
  symbol: '',
  exchange_rate: '1.00',
  is_default: false,
  is_active: true,
};

export default function CurrencyAdminPage() {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminAPI.getCurrencies();
      const data = r.data?.data || r.data || [];
      setCurrencies(Array.isArray(data) ? data : []);
    } catch {
      setError('Failed to load currencies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter by search
  const filtered = debouncedSearch
    ? currencies.filter(c =>
        c.code?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        c.symbol?.toLowerCase().includes(debouncedSearch.toLowerCase())
      )
    : currencies;

  const openCreate = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowModal(true);
  };

  const openEdit = (currency) => {
    setEditing(currency);
    setForm({
      code: currency.code || '',
      name: currency.name || '',
      symbol: currency.symbol || '',
      exchange_rate: String(currency.exchange_rate || '1.00'),
      is_default: currency.is_default || false,
      is_active: currency.is_active !== false,
    });
    setShowModal(true);
  };

  const validation = useAdminFormValidation({
    code: currencyCode(),
    name: requiredField('Currency name'),
    symbol: requiredField('Currency symbol'),
  });

  const handleSave = async () => {
    if (!validation.validateForm(form)) {
      return;
    }
    setSaving(true);
    try {
      await adminAPI.createCurrency({
        code: form.code.toUpperCase(),
        name: form.name,
        symbol: form.symbol,
        exchange_rate: parseFloat(form.exchange_rate) || 1,
        is_default: form.is_default,
        is_active: form.is_active,
      });
      toast.success(editing ? 'Currency updated' : 'Currency created');
      await load();
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save currency');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, code) => {
    if (!confirm(`Delete "${code}" currency? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteCurrency(id);
      toast.success(`Currency "${code}" deleted`);
      await load();
    } catch {
      toast.error('Failed to delete currency');
    }
  };

  const handleToggleDefault = async (currency) => {
    try {
      await adminAPI.createCurrency({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        exchange_rate: currency.exchange_rate || 1,
        is_default: true,
        is_active: currency.is_active !== false,
      });
      toast.success(`"${currency.code}" set as default`);
      await load();
    } catch {
      toast.error('Failed to set default currency');
    }
  };

  const handleFetchLiveRates = async () => {
    setSyncing(true);
    setSyncResult(null);
    setShowSyncModal(true);
    try {
      const r = await adminAPI.syncCurrencies();
      const result = r.data?.data || { updated: 0, skipped: 0, errors: [] };
      setSyncResult(result);
      if (r.data?.success !== false && (!result.errors || result.errors.length === 0)) {
        toast.success(r.data?.message || 'Exchange rates synced successfully');
      } else {
        toast.warning('Sync completed with some issues');
      }
      await load();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to sync exchange rates';
      setSyncResult({ updated: 0, skipped: 0, errors: [msg] });
      toast.error(msg);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleActive = async (currency) => {
    try {
      await adminAPI.createCurrency({
        code: currency.code,
        name: currency.name,
        symbol: currency.symbol,
        exchange_rate: currency.exchange_rate || 1,
        is_default: currency.is_default || false,
        is_active: !(currency.is_active !== false),
      });
      toast.success(currency.is_active !== false ? 'Currency deactivated' : 'Currency activated');
      await load();
    } catch {
      toast.error('Failed to toggle currency status');
    }
  };

  if (error) {
    return (
      <div>
        <div className="admin-header"><h2>💰 Currencies</h2><p>Manage currency exchange rates and display settings</p></div>
        <div className="admin-alert danger mb-4">
          <span className="admin-alert-icon">⚠️</span>
          <div className="admin-alert-body">
            <div className="admin-alert-title">Error Loading Data</div>
            <div>{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div>
          <h2>💰 Currencies</h2>
          <p>Manage currency exchange rates and display settings</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost btn-sm" onClick={handleFetchLiveRates} disabled={syncing} style={{ color: '#0891b2', borderColor: '#0891b2' }}>
            {syncing ? (
              <><span className="spinner" style={{ width: 12, height: 12, marginRight: 4 }} /> Syncing...</>
            ) : (
              <><RefreshCw size={14} style={{ marginRight: 4 }} /> Fetch Live Rates</>
            )}
          </button>
          <button className="btn-dark btn-sm" onClick={openCreate}>
            <Plus size={14} style={{ marginRight: 4 }} /> Add Currency
          </button>
        </div>
      </div>

      {loading ? <PageSkeleton page="currency" /> : (
      <div className="table-card">
        <div className="table-toolbar">
          <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              className="table-search"
              placeholder="Search currencies by code, name, or symbol..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem' }}
            />
          </div>
          <span className="table-count">{filtered.length} currency{filtered.length !== 1 ? 'ies' : 'y'}</span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Symbol</th>
              <th>Exchange Rate</th>
              <th>Last Synced</th>
              <th>Status</th>
              <th>Default</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <div className="empty-state-icon" style={{ fontSize: '2rem' }}>💰</div>
                  <h3>{search ? 'No matching currencies' : 'No currencies yet'}</h3>
                  <p>{search ? 'Try a different search term.' : 'Add your first currency to enable the storefront currency switcher.'}</p>
                </div>
              </td></tr>
            ) : (
              filtered.map((currency) => (
                <tr key={currency.id} style={{ opacity: currency.is_active !== false ? 1 : 0.55 }}>
                  <td>
                    <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.82rem' }}>
                      {currency.code}
                    </code>
                  </td>
                  <td><strong>{currency.name}</strong></td>
                  <td style={{ fontSize: '1.1rem', fontWeight: 600 }}>{currency.symbol}</td>
                  <td>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {parseFloat(currency.exchange_rate || 1).toFixed(6)}
                    </span>
                  </td>
                  <td>
                    {currency.last_synced_at ? (
                      <span style={{ fontSize: '0.72rem', color: '#64748b', whiteSpace: 'nowrap' }} title={new Date(currency.last_synced_at).toLocaleString()}>
                        {formatTimeAgo(currency.last_synced_at)}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>Never</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleActive(currency)}
                      className={`status-badge ${currency.is_active !== false ? 'status-active' : 'status-inactive'}`}
                      style={{ border: 'none', cursor: 'pointer' }}
                    >
                      {currency.is_active !== false ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    {currency.is_default ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: '#16a34a', fontWeight: 600, fontSize: '0.78rem' }}>
                        <CheckCircle size={14} /> Default
                      </span>
                    ) : (
                      <button
                        onClick={() => handleToggleDefault(currency)}
                        className="btn-ghost btn-sm"
                        style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                      >
                        Set as Default
                      </button>
                    )}
                  </td>
                  <td>
                    <div className="row-actions" style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn-edit" onClick={() => openEdit(currency)}>Edit</button>
                      {!currency.is_default && (
                        <button className="btn-del" onClick={() => handleDelete(currency.id, currency.code)}>
                          <Trash2 size={13} style={{ marginRight: 2 }} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      )}

      {/* ── Sync Results Modal ── */}
      {showSyncModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && !syncing && setShowSyncModal(false)}>
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>
                {syncing ? (
                  <><span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} /> Fetching Live Rates...</>
                ) : syncResult ? (
                  syncResult.errors?.length > 0 ? '⚠️ Sync Completed with Issues' : '✅ Live Rates Synced'
                ) : (
                  '🌐 Fetch Live Exchange Rates'
                )}
              </h3>
              <button className="modal-close" onClick={() => { if (!syncing) setShowSyncModal(false); }} disabled={syncing}>✕</button>
            </div>
            <div className="modal-body">
              {syncing ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
                  <p style={{ fontWeight: 600, color: '#0891b2' }}>Fetching live exchange rates...</p>                    <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    Frankfurter (ECB data) with ExchangeRate-API fallback
                  </p>
                </div>
              ) : syncResult ? (
                <div>
                  {/* Summary Stats */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ flex: 1, background: '#f0fdf4', borderRadius: '10px', padding: '0.75rem', textAlign: 'center', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>{syncResult.updated}</div>
                      <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 500 }}>Updated</div>
                    </div>
                    <div style={{ flex: 1, background: '#f8fafc', borderRadius: '10px', padding: '0.75rem', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#64748b' }}>{syncResult.skipped}</div>
                      <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500 }}>Unchanged</div>
                    </div>
                    <div style={{ flex: 1, background: syncResult.errors?.length > 0 ? '#fef2f2' : '#f8fafc', borderRadius: '10px', padding: '0.75rem', textAlign: 'center', border: '1px solid ' + (syncResult.errors?.length > 0 ? '#fecaca' : '#e2e8f0') }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: syncResult.errors?.length > 0 ? '#dc2626' : '#64748b' }}>{syncResult.errors?.length || 0}</div>
                      <div style={{ fontSize: '0.72rem', color: syncResult.errors?.length > 0 ? '#991b1b' : '#475569', fontWeight: 500 }}>Errors</div>
                    </div>
                  </div>

                  {/* Success message */}
                  {syncResult.updated > 0 && (
                    <div style={{
                      background: '#f0fdf4',
                      borderRadius: '8px',
                      padding: '0.6rem 1rem',
                      border: '1px solid #bbf7d0',
                      fontSize: '0.8rem',
                      color: '#166534',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}>
                      <RefreshCw size={16} style={{ flexShrink: 0 }} />
                      <span>{syncResult.updated} currency rate{ syncResult.updated !== 1 ? 's were' : ' was' } updated to the latest live rates.</span>
                    </div>
                  )}

                  {/* Last synced timestamp */}
                  <div style={{
                    marginBottom: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    color: '#64748b',
                  }}>
                    <Clock size={13} style={{ flexShrink: 0 }} />
                    <span>Last synced: <strong>{new Date().toLocaleString()}</strong></span>
                  </div>

                  {/* Errors list */}
                  {syncResult.errors?.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: '#991b1b', marginBottom: '0.3rem' }}>
                        ⚠️ Issues encountered:
                      </p>
                      <ul style={{ fontSize: '0.75rem', color: '#7f1d1d', background: '#fef2f2', borderRadius: '8px', padding: '0.5rem 1rem', border: '1px solid #fecaca', margin: 0, listStyle: 'none' }}>
                        {syncResult.errors.map((err, idx) => (
                          <li key={idx} style={{ padding: '0.15rem 0' }}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* What this means */}
                  {syncResult.updated === 0 && syncResult.errors?.length === 0 && (
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      padding: '0.75rem 1rem',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.8rem',
                      color: '#64748b',
                    }}>
                      All currency rates are already up to date with the latest live rates. No changes were needed.
                    </div>
                  )}

                  <div style={{
                    marginTop: '0.75rem',
                    background: '#f0f9ff',
                    borderRadius: '8px',
                    padding: '0.6rem 1rem',
                    border: '1px solid #bae6fd',
                    fontSize: '0.72rem',
                    color: '#0369a1',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}>
                    <ExternalLink size={12} style={{ flexShrink: 0 }} />
                    <span>Rates sourced from <a href="https://frankfurter.dev" target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'underline' }}>Frankfurter API</a> (ECB) with <a href="https://open.er-api.com" target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'underline' }}>ExchangeRate-API</a> fallback — both free, no API key required.</span>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={() => setShowSyncModal(false)} disabled={syncing}>
                {syncing ? 'Syncing...' : syncResult ? 'Close' : 'Cancel'}
              </button>
              {!syncing && syncResult && (
                <button className="btn-dark btn-sm" onClick={handleFetchLiveRates}>
                  <RefreshCw size={13} style={{ marginRight: 4 }} /> Sync Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editing ? '✏️ Edit Currency' : '➕ Add Currency'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <AdminFormField label="Currency Code" required error={validation.errors.code} valid={validation.validFields.code} hint="ISO 4217 currency code (3 letters)">
                  <input
                    value={form.code}
                    onChange={e => { const v = e.target.value.toUpperCase().slice(0, 3); setForm({ ...form, code: v }); validation.handleChange('code', v); }}
                    placeholder="e.g. USD, EUR, INR"
                    readOnly={!!editing}
                    style={editing ? { background: '#f1f5f9', cursor: 'not-allowed', textTransform: 'uppercase' } : { textTransform: 'uppercase' }}
                    maxLength={3}
                  />
                </AdminFormField>
                <AdminFormField label="Currency Name" required error={validation.errors.name} valid={validation.validFields.name}>
                  <input value={form.name} onChange={e => { setForm({ ...form, name: e.target.value }); validation.handleChange('name', e.target.value); }} placeholder="e.g. US Dollar, Euro, Indian Rupee" />
                </AdminFormField>
                <AdminFormField label="Symbol" required error={validation.errors.symbol} valid={validation.validFields.symbol} hint="Display symbol shown in prices">
                  <input value={form.symbol} onChange={e => { setForm({ ...form, symbol: e.target.value }); validation.handleChange('symbol', e.target.value); }} placeholder="e.g. $, €, ₹" maxLength={10} />
                </AdminFormField>
                <div className="form-group">
                  <label>Exchange Rate (vs Default)</label>
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    value={form.exchange_rate}
                    onChange={e => setForm({ ...form, exchange_rate: e.target.value })}
                    placeholder="1.00"
                  />
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: 2 }}>1 unit of this currency = X units of default currency</span>
                </div>
                <div className="form-group form-full" style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.5rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={e => setForm({ ...form, is_active: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary, #ff6b00)' }}
                    />
                    Active
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                    <input
                      type="checkbox"
                      checked={form.is_default}
                      onChange={e => {
                        setForm({ ...form, is_default: e.target.checked });
                        if (e.target.checked) toast.info('This will replace the current default currency on save');
                      }}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary, #ff6b00)' }}
                    />
                    Set as Default Currency
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-dark btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><span className="spinner" style={{ width: 12, height: 12, marginRight: 6 }} /> Saving...</>
                ) : (
                  editing ? 'Update' : 'Create'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

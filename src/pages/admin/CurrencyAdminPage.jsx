import {
  Search,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle,
  ExternalLink,
  Clock,
  DollarSign,
  TrendingUp,
  Globe,
  RotateCcw,
  Calculator,
  AlertTriangle,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminAPI } from '../../api/admin';
import { PageSkeleton } from '../../components/admin/pageSkeletonConfig';
import AdminFormField from '../../components/admin/AdminFormField';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField, currencyCode, rateValue } from '../../hooks/validationRules';
import toast from '../../utils/toast';

/** Format a timestamp as a relative time string (e.g. "2 hours ago", "Yesterday") */
function formatTimeAgo(dateStr) {
  if (!dateStr) return 'Never';
  const now = new Date();
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Never';
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

// Normalized property accessors for robust dual-casing support
const getRate = (c) => parseFloat(c?.exchange_rate ?? c?.exchangeRate ?? 1.0);
const isDef = (c) => Boolean(c?.is_default ?? c?.isDefault);
const isAct = (c) => (c?.is_active !== undefined ? Boolean(c.is_active) : (c?.isActive !== undefined ? Boolean(c.isActive) : true));
const getSynced = (c) => c?.last_synced_at ?? c?.lastSyncedAt;

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
  const [resetting, setResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Conversion test calculator state
  const [testAmount, setTestAmount] = useState('100');
  const [showCalculator, setShowCalculator] = useState(false);

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
      setError(null);
    } catch {
      setError('Failed to load currencies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Derived statistics
  const defaultCurrency = useMemo(() => {
    return currencies.find(isDef) || currencies[0] || null;
  }, [currencies]);

  const activeCount = useMemo(() => {
    return currencies.filter(isAct).length;
  }, [currencies]);

  const latestSyncTime = useMemo(() => {
    const times = currencies
      .map((c) => getSynced(c))
      .filter(Boolean)
      .map((d) => new Date(d).getTime())
      .filter((t) => !isNaN(t));
    return times.length > 0 ? new Date(Math.max(...times)) : null;
  }, [currencies]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!debouncedSearch) return currencies;
    const q = debouncedSearch.toLowerCase();
    return currencies.filter(
      (c) =>
        c.code?.toLowerCase().includes(q) ||
        c.name?.toLowerCase().includes(q) ||
        c.symbol?.toLowerCase().includes(q)
    );
  }, [currencies, debouncedSearch]);

  const openCreate = () => {
    setEditing(null);
    setForm(DEFAULT_FORM);
    validation.resetValidation();
    setShowModal(true);
  };

  const openEdit = (currency) => {
    setEditing(currency);
    setForm({
      code: currency.code || '',
      name: currency.name || '',
      symbol: currency.symbol || '',
      exchange_rate: String(getRate(currency)),
      is_default: isDef(currency),
      is_active: isAct(currency),
    });
    validation.resetValidation();
    setShowModal(true);
  };

  const validation = useAdminFormValidation({
    code: currencyCode(),
    name: requiredField('Currency name'),
    symbol: requiredField('Currency symbol'),
    exchange_rate: rateValue('Exchange rate'),
  });

  const handleSave = async () => {
    if (!validation.validateForm(form)) {
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.toUpperCase(),
        name: form.name.trim(),
        symbol: form.symbol.trim(),
        exchange_rate: parseFloat(form.exchange_rate) || 1.0,
        exchangeRate: parseFloat(form.exchange_rate) || 1.0,
        is_default: form.is_default,
        isDefault: form.is_default,
        is_active: form.is_active,
        isActive: form.is_active,
      };

      if (editing && editing.id) {
        if (adminAPI.updateCurrency) {
          await adminAPI.updateCurrency(editing.id, payload);
        } else {
          await adminAPI.createCurrency(payload);
        }
        toast.success(`Currency "${payload.code}" updated`);
      } else {
        await adminAPI.createCurrency(payload);
        toast.success(`Currency "${payload.code}" created`);
      }

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
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete currency');
    }
  };

  const handleToggleDefault = async (currency) => {
    if (isDef(currency)) return;
    try {
      if (adminAPI.setDefaultCurrency) {
        await adminAPI.setDefaultCurrency(currency.id);
      } else {
        await adminAPI.createCurrency({
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          exchange_rate: 1.0,
          is_default: true,
          is_active: true,
        });
      }
      toast.success(`"${currency.code}" set as default base currency`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set default currency');
    }
  };

  const handleToggleActive = async (currency) => {
    if (isDef(currency)) {
      toast.warning('Default base currency cannot be deactivated');
      return;
    }
    const nextActive = !isAct(currency);
    try {
      if (adminAPI.toggleCurrencyActive) {
        await adminAPI.toggleCurrencyActive(currency.id, nextActive);
      } else {
        await adminAPI.createCurrency({
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol,
          exchange_rate: getRate(currency),
          is_default: false,
          is_active: nextActive,
        });
      }
      toast.success(`Currency "${currency.code}" ${nextActive ? 'activated' : 'deactivated'}`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle currency status');
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
        toast.warning('Sync completed with some warnings');
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

  const handleResetDefaults = async () => {
    setResetting(true);
    try {
      if (adminAPI.resetCurrencies) {
        await adminAPI.resetCurrencies();
      }
      toast.success('Default currency catalog restored (INR, USD, EUR, GBP, AED, etc.)');
      setShowResetConfirm(false);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore default catalog');
    } finally {
      setResetting(false);
    }
  };

  if (error) {
    return (
      <div>
        <div className="admin-header">
          <h2>💰 Currencies</h2>
          <p>Manage currency exchange rates and display settings</p>
        </div>
        <div className="admin-alert danger mb-4">
          <span className="admin-alert-icon">⚠️</span>
          <div className="admin-alert-body">
            <div className="admin-alert-title">Error Loading Data</div>
            <div>{error}</div>
          </div>
          <button className="btn-dark btn-sm" onClick={load} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="admin-header admin-header-row">
        <div>
          <h2>💰 Currencies</h2>
          <p>Manage currency exchange rates, live syncing, and storefront display settings</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn-ghost btn-sm"
            onClick={() => setShowCalculator(!showCalculator)}
            style={{ color: '#6366f1', borderColor: '#c7d2fe' }}
          >
            <Calculator size={14} style={{ marginRight: 4 }} />
            {showCalculator ? 'Hide Tester' : 'Live Tester'}
          </button>
          <button
            className="btn-ghost btn-sm"
            onClick={handleFetchLiveRates}
            disabled={syncing}
            style={{ color: '#0891b2', borderColor: '#0891b2' }}
          >
            {syncing ? (
              <>
                <span className="spinner" style={{ width: 12, height: 12, marginRight: 4 }} /> Syncing...
              </>
            ) : (
              <>
                <RefreshCw size={14} style={{ marginRight: 4 }} /> Fetch Live Rates
              </>
            )}
          </button>
          <button
            className="btn-ghost btn-sm"
            onClick={() => setShowResetConfirm(true)}
            style={{ color: '#64748b' }}
            title="Restore curated catalog of world currencies"
          >
            <RotateCcw size={14} style={{ marginRight: 4 }} /> Restore Defaults
          </button>
          <button className="btn-dark btn-sm" onClick={openCreate}>
            <Plus size={14} style={{ marginRight: 4 }} /> Add Currency
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div className="table-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#334155',
            }}
          >
            <Globe size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Currencies
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
              {currencies.length}
            </div>
          </div>
        </div>

        <div className="table-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: '#f0fdf4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#16a34a',
            }}
          >
            <CheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Active Currencies
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#16a34a' }}>
              {activeCount} <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#64748b' }}>/ {currencies.length}</span>
            </div>
          </div>
        </div>

        <div className="table-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: '#fef3c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
            }}
          >
            <DollarSign size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Default Base Currency
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#b45309' }}>
              {defaultCurrency ? `${defaultCurrency.code} (${defaultCurrency.symbol})` : 'None'}
            </div>
          </div>
        </div>

        <div className="table-card" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: '#ecfeff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0891b2',
            }}
          >
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Live Sync Status
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0e7490' }}>
              {latestSyncTime ? formatTimeAgo(latestSyncTime) : 'Never synced'}
            </div>
          </div>
        </div>
      </div>

      {/* Optional: Live Rate Conversion Tester Bar */}
      {showCalculator && (
        <div
          className="table-card"
          style={{
            padding: '1.25rem',
            marginBottom: '1.25rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calculator size={18} style={{ color: '#4f46e5' }} />
              <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>Interactive Conversion Tester</strong>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                (Preview how products priced in {defaultCurrency?.code || 'Base'} convert to other currencies)
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#475569' }}>Base Amount ({defaultCurrency?.symbol || ''}):</span>
              <input
                type="number"
                min="0"
                step="10"
                value={testAmount}
                onChange={(e) => setTestAmount(e.target.value)}
                style={{ width: '100px', padding: '0.35rem 0.6rem', fontSize: '0.85rem', fontWeight: 600 }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '0.75rem',
            }}
          >
            {currencies
              .filter(isAct)
              .map((c) => {
                const numeric = parseFloat(testAmount) || 0;
                const converted = (numeric * getRate(c)).toFixed(c.code === 'JPY' ? 0 : 2);
                const isDefault = isDef(c);
                return (
                  <div
                    key={c.code}
                    style={{
                      background: isDefault ? '#f0fdf4' : '#ffffff',
                      borderRadius: '8px',
                      padding: '0.65rem 0.85rem',
                      border: isDefault ? '1px solid #86efac' : '1px solid #e2e8f0',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#334155' }}>
                        {c.code}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.symbol}</span>
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: isDefault ? '#15803d' : '#0f172a' }}>
                      {c.symbol} {converted}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 2 }}>
                      Rate: {getRate(c).toFixed(4)}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Main Table */}
      {loading ? (
        <PageSkeleton page="currency" />
      ) : (
        <div className="table-card">
          <div className="table-toolbar">
            <div style={{ position: 'relative', flex: 1, maxWidth: '360px' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                  pointerEvents: 'none',
                }}
              />
              <input
                className="table-search"
                placeholder="Search currencies by code, name, or symbol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2rem', width: '100%' }}
              />
            </div>
            <span className="table-count">
              {filtered.length} currenc{filtered.length !== 1 ? 'ies' : 'y'}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Symbol</th>
                  <th>Exchange Rate</th>
                  <th>Last Synced</th>
                  <th>Status</th>
                  <th>Default Base</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-state-icon" style={{ fontSize: '2.2rem' }}>💰</div>
                        <h3>{search ? 'No matching currencies' : 'No currencies available'}</h3>
                        <p>
                          {search
                            ? 'Try a different search term.'
                            : 'Add currencies or restore defaults to enable the storefront currency switcher.'}
                        </p>
                        {!search && (
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
                            <button className="btn-dark btn-sm" onClick={openCreate}>
                              <Plus size={13} style={{ marginRight: 4 }} /> Add Currency
                            </button>
                            <button className="btn-ghost btn-sm" onClick={handleResetDefaults}>
                              <RotateCcw size={13} style={{ marginRight: 4 }} /> Restore Defaults
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((currency) => {
                    const active = isAct(currency);
                    const defaultCurr = isDef(currency);
                    const rate = getRate(currency);
                    const syncedAt = getSynced(currency);

                    return (
                      <tr key={currency.id || currency.code} style={{ opacity: active ? 1 : 0.55 }}>
                        <td>
                          <code
                            style={{
                              background: '#f1f5f9',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              fontSize: '0.84rem',
                              letterSpacing: '0.5px',
                            }}
                          >
                            {currency.code}
                          </code>
                        </td>
                        <td>
                          <strong>{currency.name}</strong>
                        </td>
                        <td>
                          <span style={{ fontSize: '1.15rem', fontWeight: 600 }}>{currency.symbol}</span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.88rem', fontWeight: 600 }}>
                            {rate.toFixed(6)}
                          </span>
                        </td>
                        <td>
                          {syncedAt ? (
                            <span
                              style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}
                              title={new Date(syncedAt).toLocaleString()}
                            >
                              {formatTimeAgo(syncedAt)}
                            </span>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic' }}>
                              Never
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleToggleActive(currency)}
                            className={`status-badge ${active ? 'status-active' : 'status-inactive'}`}
                            style={{ border: 'none', cursor: defaultCurr ? 'default' : 'pointer' }}
                            title={defaultCurr ? 'Default currency cannot be deactivated' : 'Click to toggle status'}
                          >
                            {active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td>
                          {defaultCurr ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                color: '#16a34a',
                                fontWeight: 700,
                                fontSize: '0.8rem',
                                background: '#f0fdf4',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid #bbf7d0',
                              }}
                            >
                              <CheckCircle size={14} /> Default Base
                            </span>
                          ) : (
                            <button
                              onClick={() => handleToggleDefault(currency)}
                              className="btn-ghost btn-sm"
                              style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }}
                            >
                              Set as Default
                            </button>
                          )}
                        </td>
                        <td>
                          <div className="row-actions" style={{ display: 'flex', gap: '0.35rem' }}>
                            <button className="btn-edit" onClick={() => openEdit(currency)}>
                              Edit
                            </button>
                            {!defaultCurr && (
                              <button
                                className="btn-del"
                                onClick={() => handleDelete(currency.id, currency.code)}
                                title="Delete currency"
                              >
                                <Trash2 size={13} style={{ marginRight: 2 }} /> Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Restore Defaults Confirmation Modal ── */}
      {showResetConfirm && (
        <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && setShowResetConfirm(false)}>
          <div className="modal" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3><RotateCcw size={16} style={{ marginRight: 6, color: '#f59e0b' }} /> Restore Default Currencies?</h3>
              <button className="modal-close" onClick={() => setShowResetConfirm(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.88rem', color: '#475569', marginBottom: '0.75rem' }}>
                This will reset your currency catalog to the standard global currencies:
              </p>
              <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: 8, fontSize: '0.8rem', color: '#334155', border: '1px solid #e2e8f0', marginBottom: '0.75rem' }}>
                <strong>INR</strong> (Base ₹), <strong>USD</strong> ($), <strong>EUR</strong> (€), <strong>GBP</strong> (£), <strong>AED</strong> (AED), <strong>SAR</strong> (SAR), <strong>CAD</strong> (C$), <strong>AUD</strong> (A$), <strong>SGD</strong> (S$), <strong>JPY</strong> (¥)
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                Existing custom currencies may be replaced. You can click &quot;Fetch Live Rates&quot; afterwards to update them to ECB rates.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={() => setShowResetConfirm(false)} disabled={resetting}>
                Cancel
              </button>
              <button className="btn-dark btn-sm" onClick={handleResetDefaults} disabled={resetting}>
                {resetting ? (
                  <><span className="spinner" style={{ width: 12, height: 12, marginRight: 6 }} /> Restoring...</>
                ) : (
                  'Yes, Restore Defaults'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sync Results Modal ── */}
      {showSyncModal && (
        <div
          className="modal-overlay open"
          onClick={(e) => e.target === e.currentTarget && !syncing && setShowSyncModal(false)}
        >
          <div className="modal" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>
                {syncing ? (
                  <>
                    <span className="spinner" style={{ width: 16, height: 16, marginRight: 8 }} />
                    Fetching Live Rates...
                  </>
                ) : syncResult ? (
                  syncResult.errors?.length > 0 ? (
                    '⚠️ Sync Completed with Warnings'
                  ) : (
                    '✅ Live Rates Synced'
                  )
                ) : (
                  '🌐 Fetch Live Exchange Rates'
                )}
              </h3>
              <button
                className="modal-close"
                onClick={() => {
                  if (!syncing) setShowSyncModal(false);
                }}
                disabled={syncing}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {syncing ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 1rem' }} />
                  <p style={{ fontWeight: 600, color: '#0891b2' }}>Fetching live exchange rates...</p>
                  <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    Frankfurter (ECB data) with ExchangeRate-API fallback
                  </p>
                </div>
              ) : syncResult ? (
                <div>
                  {/* Summary Stats */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div
                      style={{
                        flex: 1,
                        background: '#f0fdf4',
                        borderRadius: '10px',
                        padding: '0.75rem',
                        textAlign: 'center',
                        border: '1px solid #bbf7d0',
                      }}
                    >
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                        {syncResult.updated}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 500 }}>
                        Updated
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        background: '#f8fafc',
                        borderRadius: '10px',
                        padding: '0.75rem',
                        textAlign: 'center',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#64748b' }}>
                        {syncResult.skipped}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 500 }}>
                        Unchanged
                      </div>
                    </div>
                    <div
                      style={{
                        flex: 1,
                        background: syncResult.errors?.length > 0 ? '#fef2f2' : '#f8fafc',
                        borderRadius: '10px',
                        padding: '0.75rem',
                        textAlign: 'center',
                        border:
                          '1px solid ' +
                          (syncResult.errors?.length > 0 ? '#fecaca' : '#e2e8f0'),
                      }}
                    >
                      <div
                        style={{
                          fontSize: '1.5rem',
                          fontWeight: 700,
                          color: syncResult.errors?.length > 0 ? '#dc2626' : '#64748b',
                        }}
                      >
                        {syncResult.errors?.length || 0}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: syncResult.errors?.length > 0 ? '#991b1b' : '#475569',
                          fontWeight: 500,
                        }}
                      >
                        Errors
                      </div>
                    </div>
                  </div>

                  {/* Success message */}
                  {syncResult.updated > 0 && (
                    <div
                      style={{
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
                      }}
                    >
                      <RefreshCw size={16} style={{ flexShrink: 0 }} />
                      <span>
                        {syncResult.updated} currency rate
                        {syncResult.updated !== 1 ? 's were' : ' was'} updated to the latest live rates.
                      </span>
                    </div>
                  )}

                  {/* Last synced timestamp */}
                  <div
                    style={{
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.75rem',
                      color: '#64748b',
                    }}
                  >
                    <Clock size={13} style={{ flexShrink: 0 }} />
                    <span>
                      Last synced: <strong>{new Date().toLocaleString()}</strong>
                    </span>
                  </div>

                  {/* Errors list */}
                  {syncResult.errors?.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <p
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: '#991b1b',
                          marginBottom: '0.3rem',
                        }}
                      >
                        ⚠️ Warnings / Issues encountered:
                      </p>
                      <ul
                        style={{
                          fontSize: '0.75rem',
                          color: '#7f1d1d',
                          background: '#fef2f2',
                          borderRadius: '8px',
                          padding: '0.5rem 1rem',
                          border: '1px solid #fecaca',
                          margin: 0,
                          listStyle: 'none',
                        }}
                      >
                        {syncResult.errors.map((err, idx) => (
                          <li key={idx} style={{ padding: '0.15rem 0' }}>
                            • {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* What this means */}
                  {syncResult.updated === 0 && syncResult.errors?.length === 0 && (
                    <div
                      style={{
                        background: '#f8fafc',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        border: '1px solid #e2e8f0',
                        fontSize: '0.8rem',
                        color: '#64748b',
                      }}
                    >
                      All currency rates are already up to date with the latest live rates. No changes were needed.
                    </div>
                  )}

                  <div
                    style={{
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
                    }}
                  >
                    <ExternalLink size={12} style={{ flexShrink: 0 }} />
                    <span>
                      Rates sourced from{' '}
                      <a
                        href="https://frankfurter.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        Frankfurter API
                      </a>{' '}
                      (ECB) with{' '}
                      <a
                        href="https://open.er-api.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0284c7', fontWeight: 600, textDecoration: 'underline' }}
                      >
                        ExchangeRate-API
                      </a>{' '}
                      fallback — zero rate limits and no API key required.
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="modal-footer">
              <button
                className="btn-ghost btn-sm"
                onClick={() => setShowSyncModal(false)}
                disabled={syncing}
              >
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

      {/* ── Add / Edit Currency Modal ── */}
      {showModal && (
        <div
          className="modal-overlay open"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="modal" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editing ? '✏️ Edit Currency' : '➕ Add Currency'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <AdminFormField
                  label="Currency Code"
                  required
                  error={validation.errors.code}
                  valid={validation.validFields.code}
                  hint="ISO 4217 standard currency code (3 letters, e.g. USD)"
                >
                  <input
                    value={form.code}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase().slice(0, 3);
                      setForm({ ...form, code: v });
                      validation.handleChange('code', v);
                    }}
                    placeholder="e.g. USD, EUR, INR"
                    readOnly={!!editing}
                    style={
                      editing
                        ? { background: '#f1f5f9', cursor: 'not-allowed', textTransform: 'uppercase' }
                        : { textTransform: 'uppercase' }
                    }
                    maxLength={3}
                  />
                </AdminFormField>

                <AdminFormField
                  label="Currency Name"
                  required
                  error={validation.errors.name}
                  valid={validation.validFields.name}
                >
                  <input
                    value={form.name}
                    onChange={(e) => {
                      setForm({ ...form, name: e.target.value });
                      validation.handleChange('name', e.target.value);
                    }}
                    placeholder="e.g. US Dollar, Euro, Indian Rupee"
                  />
                </AdminFormField>

                <AdminFormField
                  label="Symbol"
                  required
                  error={validation.errors.symbol}
                  valid={validation.validFields.symbol}
                  hint="Display symbol shown next to prices (e.g. $, €, ₹)"
                >
                  <input
                    value={form.symbol}
                    onChange={(e) => {
                      setForm({ ...form, symbol: e.target.value });
                      validation.handleChange('symbol', e.target.value);
                    }}
                    placeholder="e.g. $, €, ₹, AED"
                    maxLength={10}
                  />
                </AdminFormField>

                <AdminFormField
                  label="Exchange Rate (vs Default Base)"
                  required
                  error={validation.errors.exchange_rate}
                  valid={validation.validFields.exchange_rate}
                  hint={`1 unit of default base (${defaultCurrency?.code || 'BASE'}) = X units of this currency`}
                >
                  <input
                    type="number"
                    step="0.000001"
                    min="0"
                    value={form.exchange_rate}
                    onChange={(e) => {
                      setForm({ ...form, exchange_rate: e.target.value });
                      validation.handleChange('exchange_rate', e.target.value);
                    }}
                    placeholder="1.00"
                    disabled={form.is_default}
                  />
                </AdminFormField>

                <div
                  className="form-group form-full"
                  style={{ display: 'flex', gap: '1.5rem', paddingTop: '0.5rem' }}
                >
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary, #ff6b00)' }}
                      disabled={form.is_default}
                    />
                    Active (visible in storefront switcher)
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={form.is_default}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setForm({
                          ...form,
                          is_default: checked,
                          exchange_rate: checked ? '1.00' : form.exchange_rate,
                          is_active: checked ? true : form.is_active,
                        });
                        if (checked) {
                          toast.info('Setting this currency as default will reset its rate to 1.00');
                        }
                      }}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--primary, #ff6b00)' }}
                    />
                    Set as Default Base Currency
                  </label>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn-dark btn-sm" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner" style={{ width: 12, height: 12, marginRight: 6 }} /> Saving...
                  </>
                ) : editing ? (
                  'Update Currency'
                ) : (
                  'Create Currency'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

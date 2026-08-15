import { useState, useEffect } from 'react';
import { taxAPI } from '../../api/tax';
import { settingsAPI } from '../../api/settings';
import AdminFormField from '../../components/admin/AdminFormField';
import SaveButton from '../../components/admin/SaveButton';
import ActionButton from '../../components/admin/ActionButton';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField, rateValue } from '../../hooks/validationRules';
import toast from '../../utils/toast';

const COUNTRIES = [
  { code: 'IN', name: 'India' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AE', name: 'UAE' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const EMPTY_FORM = {
  name: '',
  rate: '',
  type: 'PERCENTAGE',
  country: '',
  state: '',
  description: '',
  priority: 0,
  isActive: true,
};

export default function TaxAdminPage() {
  const [taxRates, setTaxRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTaxRate, setEditingTaxRate] = useState(null);
  const [taxForm, setTaxForm] = useState(EMPTY_FORM);
  const [selectedCountry, setSelectedCountry] = useState('');

  // Global settings
  const [settings, setSettings] = useState({
    taxRate: '',
    taxCalculation: 'exclusive',
    freeShippingThreshold: '',
    shippingFlatRate: '',
  });
  const [globalSaving, setGlobalSaving] = useState(false);

  const loadTaxRates = async () => {
    setLoading(true);
    try {
      const res = await taxAPI.getAll();
      // Backend returns a Laravel paginator ({ data: [...] }) — unwrap both layers.
      const body = res.data?.data || {};
      const data = body?.data || (Array.isArray(body) ? body : []);
      setTaxRates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load tax rates:', err);
      toast.error('Failed to load tax rates');
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const keys = ['taxRate', 'taxCalculation', 'freeShippingThreshold', 'shippingFlatRate'];
      const results = await Promise.allSettled(
        keys.map(key => settingsAPI.getSetting(key).catch(() => ({ data: { data: { value: null } } })))
      );
      const updates = {};
      keys.forEach((key, i) => {
        const val = results[i].status === 'fulfilled' ? results[i].value?.data?.data?.value : null;
        if (val !== null && val !== undefined) updates[key] = val;
      });
      setSettings(prev => ({ ...prev, ...updates }));
    } catch {
      // silent — defaults are fine
    }
  };

  useEffect(() => {
    loadTaxRates();
    loadSettings();
  }, []);

  const resetForm = () => {
    setEditingTaxRate(null);
    setSelectedCountry('');
    setTaxForm(EMPTY_FORM);
  };

  const openEdit = (rate) => {
    setEditingTaxRate(rate);
    setSelectedCountry(rate.country || '');
    setTaxForm({
      name: rate.name || '',
      rate: rate.rate?.toString() || '',
      type: rate.type || 'PERCENTAGE',
      country: rate.country || '',
      state: rate.state || '',
      description: rate.description || '',
      priority: rate.priority ?? 0,
      isActive: rate.isActive,
    });
    setShowModal(true);
  };

  const validation = useAdminFormValidation({
    name: requiredField('Tax rate name'),
    rate: rateValue('Tax rate', 'Valid tax rate is required'),
  });

  const handleCreate = async () => {
    if (!validation.validateForm(taxForm)) return;
    try {
      const payload = {
        name: taxForm.name,
        rate: parseFloat(taxForm.rate),
        type: taxForm.type,
        country: taxForm.country || null,
        state: taxForm.state || null,
        description: taxForm.description || null,
        priority: parseInt(taxForm.priority) || 0,
        isActive: taxForm.isActive,
      };
      await taxAPI.create(payload);
      toast.success('Tax rate created');
      loadTaxRates();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create tax rate');
      return false;
    }
  };

  const handleUpdate = async () => {
    if (!editingTaxRate || !validation.validateForm(taxForm)) return;
    try {
      const payload = {
        name: taxForm.name,
        rate: parseFloat(taxForm.rate),
        type: taxForm.type,
        country: taxForm.country || null,
        state: taxForm.state || null,
        description: taxForm.description || null,
        priority: parseInt(taxForm.priority) || 0,
        isActive: taxForm.isActive,
      };
      await taxAPI.update(editingTaxRate.id, payload);
      toast.success('Tax rate updated');
      loadTaxRates();
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tax rate');
      return false;
    }
  };

  const handleDelete = async (id) => {
    try {
      await taxAPI.delete(id);
      toast.success('Tax rate deleted');
      loadTaxRates();
      return true;
    } catch {
      toast.error('Failed to delete tax rate');
      return false;
    }
  };

  const handleToggle = async (rate) => {
    try {
      await taxAPI.update(rate.id, { isActive: !rate.isActive });
      toast.success(rate.isActive ? 'Tax rate disabled' : 'Tax rate enabled');
      loadTaxRates();
      return true;
    } catch {
      toast.error('Failed to toggle tax rate');
      return false;
    }
  };

  const handleGlobalSave = async () => {
    setGlobalSaving(true);
    try {
      await settingsAPI.updateSetting('taxRate', settings.taxRate);
      await settingsAPI.updateSetting('taxCalculation', settings.taxCalculation);
      await settingsAPI.updateSetting('freeShippingThreshold', settings.freeShippingThreshold);
      await settingsAPI.updateSetting('shippingFlatRate', settings.shippingFlatRate);
      toast.success('Tax & Shipping settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setGlobalSaving(false);
    }
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div>
          <h2>Tax Rates</h2>
          <p>Manage region-specific tax rates and global tax/shipping defaults</p>
        </div>
        <button className="btn-dark btn-sm" onClick={() => { resetForm(); setShowModal(true); }}>
          + Add Tax Rate
        </button>
      </div>

      {/* Global Tax & Shipping Settings */}
      <div className="detail-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="detail-header"><h3>Global Tax & Shipping Settings</h3></div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          Configure default tax rate and shipping rules. Specific tax rates below override these defaults where applicable.
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label>Global Tax Rate (%)</label>
            <input
              type="number" step="0.01" min="0" max="100"
              value={settings.taxRate || ''}
              onChange={e => setSettings({ ...settings, taxRate: e.target.value })}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Fallback rate used when no specific tax rate matches
            </span>
          </div>
          <div className="form-group">
            <label>Tax Calculation</label>
            <select
              value={settings.taxCalculation || 'exclusive'}
              onChange={e => setSettings({ ...settings, taxCalculation: e.target.value })}
            >
              <option value="inclusive">Prices include tax</option>
              <option value="exclusive">Add tax at checkout</option>
            </select>
          </div>
          <div className="form-group form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }} />
          <div className="form-group">
            <label>Free Shipping Threshold</label>
            <input
              type="number"
              value={settings.freeShippingThreshold || ''}
              onChange={e => setSettings({ ...settings, freeShippingThreshold: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Default Flat Shipping Rate</label>
            <input
              type="number"
              value={settings.shippingFlatRate || ''}
              onChange={e => setSettings({ ...settings, shippingFlatRate: e.target.value })}
            />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn-dark btn-sm" onClick={handleGlobalSave} disabled={globalSaving}>
            {globalSaving ? 'Saving...' : 'Save Tax & Shipping Settings'}
          </button>
        </div>
      </div>

      {/* Tax Rates List */}
      <div className="table-card">
        <div className="table-toolbar">
          <span className="table-count">{taxRates.length} tax rate{taxRates.length !== 1 ? 's' : ''}</span>
          <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
            Higher priority rates take precedence. Leave country blank for a global default.
          </div>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Rate</th>
              <th>Region</th>
              <th>Priority</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : taxRates.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon" style={{ fontSize: '2rem' }}>🏷️</div>
                    <h3>No tax rates configured</h3>
                    <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                      Add region-specific tax rates or use the global rate above.
                    </p>
                    <button
                      className="btn-dark btn-sm"
                      style={{ marginTop: '0.75rem' }}
                      onClick={() => { resetForm(); setShowModal(true); }}
                    >
                      Create your first tax rate
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              taxRates.map((rate) => (
                <tr key={rate.id}>
                  <td>
                    <strong>{rate.name}</strong>
                    {rate.description && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 'normal', marginTop: '0.15rem' }}>
                        {rate.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="status-badge" style={{
                      background: 'rgba(201, 169, 110, 0.12)',
                      color: '#C9A96E',
                      fontWeight: 700,
                    }}>
                      {rate.type === 'PERCENTAGE' ? `${rate.rate}%` : `$${rate.rate}`}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>
                    {rate.country ? (
                      <>
                        <div>{rate.country}</div>
                        {rate.state && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{rate.state}</div>}
                      </>
                    ) : (
                      <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Global</span>
                    )}
                  </td>
                  <td>
                    <span className="status-badge" style={{ background: 'var(--off-white)' }}>
                      {rate.priority}
                    </span>
                  </td>
                  <td>
                    <ActionButton
                      onClick={() => handleToggle(rate)}
                      className={`status-badge ${rate.isActive ? 'status-active' : 'status-pending'}`}
                      style={{ border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                      idle={rate.isActive ? 'Active' : 'Disabled'}
                    />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn-edit" onClick={() => openEdit(rate)}>Edit</button>
                      <ActionButton className="btn-del" confirm="Are you sure you want to delete this tax rate?" onClick={() => handleDelete(rate.id)} idle="Delete" />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div
          className="modal-overlay open"
          onClick={e => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="modal">
            <div className="modal-header">
              <h3>{editingTaxRate ? '✏️ Edit Tax Rate' : '➕ New Tax Rate'}</h3>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <AdminFormField label="Tax Rate Name" required error={validation.errors.name} valid={validation.validFields.name} className="form-full">
                  <input
                    value={taxForm.name}
                    onChange={e => { setTaxForm({ ...taxForm, name: e.target.value }); validation.handleChange('name', e.target.value); }}
                    placeholder="e.g. India GST 18%"
                  />
                </AdminFormField>

                <AdminFormField
                  label="Rate"
                  required
                  error={validation.errors.rate}
                  valid={validation.validFields.rate}
                  hint={taxForm.type === 'PERCENTAGE' ? 'Percentage value (e.g., 18 for 18%)' : 'Flat amount'}
                >
                  <input
                    type="number" step="0.01" min="0" max="100"
                    value={taxForm.rate}
                    onChange={e => { setTaxForm({ ...taxForm, rate: e.target.value }); validation.handleChange('rate', e.target.value); }}
                    placeholder={taxForm.type === 'PERCENTAGE' ? 'e.g. 18.0' : 'e.g. 5.00'}
                  />
                </AdminFormField>

                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={taxForm.type}
                    onChange={e => setTaxForm({ ...taxForm, type: e.target.value })}
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FLAT">Flat Amount</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Priority</label>
                  <input
                    type="number" min="0"
                    value={taxForm.priority}
                    onChange={e => setTaxForm({ ...taxForm, priority: e.target.value })}
                  />
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    Lower number = higher priority
                  </span>
                </div>

                <div className="form-group form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                  <label style={{ fontWeight: 600, color: 'var(--charcoal)' }}>Region (optional)</label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: '0.5rem' }}>
                    Leave blank for a global default rate
                  </span>
                </div>

                <div className="form-group">
                  <label>Country</label>
                  <select
                    value={taxForm.country}
                    onChange={e => {
                      setTaxForm({ ...taxForm, country: e.target.value, state: '' });
                      setSelectedCountry(e.target.value);
                    }}
                  >
                    <option value="">-- Global (all countries) --</option>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>

                {selectedCountry === 'IN' && (
                  <div className="form-group">
                    <label>State (India)</label>
                    <select
                      value={taxForm.state}
                      onChange={e => setTaxForm({ ...taxForm, state: e.target.value })}
                    >
                      <option value="">-- All States --</option>
                      {INDIAN_STATES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedCountry === 'US' && (
                  <div className="form-group">
                    <label>State (US)</label>
                    <select
                      value={taxForm.state}
                      onChange={e => setTaxForm({ ...taxForm, state: e.target.value })}
                    >
                      <option value="">-- All States --</option>
                      <option value="California">California</option>
                      <option value="Texas">Texas</option>
                      <option value="New York">New York</option>
                      <option value="Florida">Florida</option>
                      <option value="Illinois">Illinois</option>
                      <option value="Washington">Washington</option>
                      <option value="Nevada">Nevada</option>
                      <option value="Arizona">Arizona</option>
                      <option value="Massachusetts">Massachusetts</option>
                      <option value="Georgia">Georgia</option>
                    </select>
                  </div>
                )}

                <div className="form-group form-full">
                  <label>Description (optional)</label>
                  <textarea
                    rows={2}
                    value={taxForm.description}
                    onChange={e => setTaxForm({ ...taxForm, description: e.target.value })}
                    placeholder="e.g. Standard GST rate for all goods"
                  />
                </div>

                <div className="form-group form-full">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={taxForm.isActive}
                      onChange={e => setTaxForm({ ...taxForm, isActive: e.target.checked })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    <strong>Active</strong>
                  </label>
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                    Inactive tax rates are not applied during checkout
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost btn-sm" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</button>
              <SaveButton
                onClick={editingTaxRate ? handleUpdate : handleCreate}
                onSuccess={() => { setShowModal(false); resetForm(); }}
                idleLabel={editingTaxRate ? 'Update Tax Rate' : 'Create Tax Rate'}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

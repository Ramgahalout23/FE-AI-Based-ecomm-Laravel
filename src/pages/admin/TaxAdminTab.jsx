import { useState, useEffect } from 'react';
import { taxAPI } from '../../api/tax';
import { useSettings } from '../../store/useSettings';
import { useAdminFormValidation } from '../../hooks/useAdminFormValidation';
import { requiredField, rateValue } from '../../hooks/validationRules';
import { useConfirm } from '../../contexts/ConfirmContext';
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

export default function TaxAdminTab({ settings, setSettings, loading, setLoading }) {
  const { updateSettings: updateContextSettings } = useSettings();
  const [taxRates, setTaxRates] = useState([]);
  const [taxRatesLoading, setTaxRatesLoading] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [editingTaxRate, setEditingTaxRate] = useState(null);
  const [taxForm, setTaxForm] = useState({
    name: '',
    rate: '',
    type: 'PERCENTAGE',
    country: '',
    state: '',
    description: '',
    priority: 0,
    isActive: true,
  });
  const [selectedCountry, setSelectedCountry] = useState('');

  const taxValidation = useAdminFormValidation({
    name: requiredField('Tax rate name'),
    rate: rateValue('Tax rate', 'Valid tax rate is required'),
  });

  const loadTaxRates = async () => {
    setTaxRatesLoading(true);
    try {
      const res = await taxAPI.getAll();
      // Backend returns a Laravel paginator ({ data: [...] }) — unwrap both layers.
      const body = res.data?.data || {};
      const data = body?.data || (Array.isArray(body) ? body : []);
      setTaxRates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load tax rates:', err);
    } finally {
      setTaxRatesLoading(false);
    }
  };

  useEffect(() => {
    loadTaxRates();
  }, []);

  const resetTaxForm = () => {
    taxValidation.reset();
    setEditingTaxRate(null);
    setSelectedCountry('');
    setTaxForm({
      name: '',
      rate: '',
      type: 'PERCENTAGE',
      country: '',
      state: '',
      description: '',
      priority: 0,
      isActive: true,
    });
  };

  const openEditTaxRate = (rate) => {
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
    setShowTaxModal(true);
  };

  const handleCreateTaxRate = async () => {
    if (!taxValidation.validateForm(taxForm)) return;
    setLoading(true);
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
      toast.success('Tax rate created successfully');
      setShowTaxModal(false);
      resetTaxForm();
      loadTaxRates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create tax rate');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaxRate = async () => {
    if (!editingTaxRate || !taxValidation.validateForm(taxForm)) return;
    setLoading(true);
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
      setShowTaxModal(false);
      resetTaxForm();
      loadTaxRates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update tax rate');
    } finally {
      setLoading(false);
    }
  };

  const confirm = useConfirm();

  const handleDeleteTaxRate = async (id) => {
    if (!(await confirm({ title: 'Delete tax rate?', message: 'This tax rate will be permanently removed.', confirmLabel: 'Delete' }))) return;
    try {
      await taxAPI.delete(id);
      toast.success('Tax rate deleted');
      loadTaxRates();
    } catch {
      toast.error('Failed to delete tax rate');
    }
  };

  const handleToggleTaxRate = async (rate) => {
    try {
      await taxAPI.update(rate.id, { isActive: !rate.isActive });
      toast.success(rate.isActive ? 'Tax rate disabled' : 'Tax rate enabled');
      loadTaxRates();
    } catch {
      toast.error('Failed to toggle tax rate');
    }
  };

  const handleGlobalTaxSave = async () => {
    setLoading(true);
    try {
      const updates = {};
      if (settings.taxRate) updates.taxRate = settings.taxRate;
      if (settings.taxCalculation) updates.taxCalculation = settings.taxCalculation;
      if (settings.freeShippingThreshold) updates.freeShippingThreshold = settings.freeShippingThreshold;
      if (settings.shippingFlatRate) updates.shippingFlatRate = settings.shippingFlatRate;
      await updateContextSettings(updates);
      toast.success('Tax & Shipping settings saved');
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Global Tax Settings */}
      <div className="detail-panel">
        <div className="detail-header"><h3>Global Tax & Shipping Settings</h3></div>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>
          Configure default tax rate and shipping rules. Specific tax rates below override these defaults where applicable.
        </p>
        <div className="form-grid">
          <div className="form-group">
            <label>Global Tax Rate (%)</label>
            <input type="number" step="0.01" min="0" max="100"
              value={settings.taxRate || ''}
              onChange={e => setSettings({ ...settings, taxRate: e.target.value })}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
              Fallback rate used when no specific tax rate matches
            </span>
          </div>
          <div className="form-group">
            <label>Tax Calculation</label>
            <select value={settings.taxCalculation || 'exclusive'}
              onChange={e => setSettings({ ...settings, taxCalculation: e.target.value })}
            >
              <option value="inclusive">Prices include tax</option>
              <option value="exclusive">Add tax at checkout</option>
            </select>
          </div>
          <div className="form-group form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }} />
          <div className="form-group">
            <label>Free Shipping Threshold ({settings.currency === 'INR' ? '₹' : '$'})</label>
            <input type="number" value={settings.freeShippingThreshold || ''}
              onChange={e => setSettings({ ...settings, freeShippingThreshold: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Default Flat Rate ({settings.currency === 'INR' ? '₹' : '$'})</label>
            <input type="number" value={settings.shippingFlatRate || ''}
              onChange={e => setSettings({ ...settings, shippingFlatRate: e.target.value })} />
          </div>
        </div>
        <div className="form-actions">
          <button className="btn-dark btn-sm" onClick={handleGlobalTaxSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Tax & Shipping Settings'}
          </button>
        </div>
      </div>

      {/* Tax Rates Management */}
      <div className="detail-panel" style={{ marginTop: '1.5rem' }}>
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Tax Rates</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
              Manage region-specific tax rates. Higher priority rates take precedence. 
              Leave country blank for a global default rate.
            </p>
          </div>
          <button
            className="btn-dark btn-sm"
            onClick={() => {
              resetTaxForm();
              setShowTaxModal(true);
            }}
          >
            + Add Tax Rate
          </button>
        </div>

        {taxRatesLoading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
            <div className="spinner" style={{ width: 24, height: 24, margin: '0 auto 0.5rem' }} />
            <p>Loading tax rates...</p>
          </div>
        ) : taxRates.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏷️</div>
            <p>No tax rates configured yet.</p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
              Add region-specific tax rates or configure the global rate above.
            </p>
            <button className="btn-dark btn-sm" style={{ marginTop: '1rem' }}
              onClick={() => { resetTaxForm(); setShowTaxModal(true); }}>
              Create your first tax rate
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Name</th>
                  <th style={{ padding: '0.75rem' }}>Rate</th>
                  <th style={{ padding: '0.75rem' }}>Region</th>
                  <th style={{ padding: '0.75rem' }}>Priority</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {taxRates.map((rate) => (
                  <tr key={rate.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                      {rate.name}
                      {rate.description && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 'normal', marginTop: '0.15rem' }}>
                          {rate.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="status-badge" style={{
                        background: 'rgba(201, 169, 110, 0.12)',
                        color: '#C9A96E',
                        fontWeight: 700,
                      }}>
                        {rate.type === 'PERCENTAGE' ? `${rate.rate}%` : `$${rate.rate}`}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                      {rate.country ? (
                        <>
                          <div>{rate.country}</div>
                          {rate.state && <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{rate.state}</div>}
                        </>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Global</span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="status-badge" style={{ background: 'var(--off-white)' }}>
                        {rate.priority}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        onClick={() => handleToggleTaxRate(rate)}
                        className={`status-badge ${rate.isActive ? 'status-active' : 'status-pending'}`}
                        style={{ border: 'none', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        {rate.isActive ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn-ghost btn-sm" onClick={() => openEditTaxRate(rate)}>
                          Edit
                        </button>
                        <button
                          className="btn-ghost btn-sm"
                          style={{ color: 'red' }}
                          onClick={() => handleDeleteTaxRate(rate.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tax Rate Modal */}
      {showTaxModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
        }}>
          <div className="detail-panel" style={{
            width: '90%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            margin: 'auto',
          }}>
            <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>{editingTaxRate ? 'Edit Tax Rate' : 'Add Tax Rate'}</h3>
              <button
                onClick={() => { setShowTaxModal(false); resetTaxForm(); }}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }}
              >
                &times;
              </button>
            </div>

            <div className="form-grid" style={{ marginTop: '1rem' }}>
              <div className={`form-group form-full ${taxValidation.errors.name ? 'has-error' : ''} ${taxValidation.validFields.name ? 'is-valid' : ''}`}>
                <label>Tax Rate Name *</label>
                <input
                  value={taxForm.name}
                  onChange={e => { setTaxForm({ ...taxForm, name: e.target.value }); taxValidation.handleChange('name', e.target.value); }}
                  placeholder="e.g. India GST 18%"
                />
                {taxValidation.errors.name && <div className="form-error" role="alert">{taxValidation.errors.name}</div>}
              </div>

              <div className={`form-group ${taxValidation.errors.rate ? 'has-error' : ''} ${taxValidation.validFields.rate ? 'is-valid' : ''}`}>
                <label>Rate *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxForm.rate}
                  onChange={e => { setTaxForm({ ...taxForm, rate: e.target.value }); taxValidation.handleChange('rate', e.target.value); }}
                  placeholder={taxForm.type === 'PERCENTAGE' ? 'e.g. 18.0' : 'e.g. 5.00'}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {taxForm.type === 'PERCENTAGE' ? 'Percentage value (e.g., 18 for 18%)' : 'Flat amount in default currency'}
                </span>
                {taxValidation.errors.rate && <div className="form-error" role="alert">{taxValidation.errors.rate}</div>}
              </div>

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
                  type="number"
                  min="0"
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
                  />
                  <strong>Active</strong>
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Inactive tax rates are not applied during checkout
                </span>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button
                className="btn-ghost btn-sm"
                onClick={() => { setShowTaxModal(false); resetTaxForm(); }}
              >
                Cancel
              </button>
              <button
                className="btn-dark btn-sm"
                onClick={editingTaxRate ? handleUpdateTaxRate : handleCreateTaxRate}
                disabled={loading}
              >
                {loading ? 'Saving...' : editingTaxRate ? 'Update Tax Rate' : 'Create Tax Rate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

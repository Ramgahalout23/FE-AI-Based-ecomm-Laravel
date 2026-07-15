import toast from '../../../utils/toast';

function GatewayModal({ show, onClose, editingGateway, gatewayForm, setGatewayForm, dynamicGateways, setDynamicGateways, setShowGatewayModal }) {
  if (!show) return null;

  const addField = () => {
    if (gatewayForm.fields.some(f => !f.key)) return;
    setGatewayForm({ ...gatewayForm, fields: [...gatewayForm.fields, { key: '', label: '', value: '', type: 'text' }] });
  };

  const updateField = (idx, updates) => {
    const updated = [...gatewayForm.fields];
    updated[idx] = { ...updated[idx], ...updates };
    setGatewayForm({ ...gatewayForm, fields: updated });
  };

  const removeField = (idx) => {
    setGatewayForm({ ...gatewayForm, fields: gatewayForm.fields.filter((_, i) => i !== idx) });
  };

  const handleSave = () => {
    if (!gatewayForm.id || !gatewayForm.name) {
      toast.error('Gateway ID and Name are required');
      return;
    }
    const updated = [...dynamicGateways];
    if (editingGateway !== null) {
      updated[editingGateway] = { ...gatewayForm };
      toast.success('Gateway updated');
    } else {
      updated.push({ ...gatewayForm, enabled: true });
      toast.success('Gateway added');
    }
    setDynamicGateways(updated);
    setShowGatewayModal(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999,
    }}>
      <div className="detail-panel" style={{
        width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', margin: 'auto',
      }}>
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{editingGateway !== null ? 'Edit Custom Gateway' : 'Add Custom Gateway'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--muted)' }}>&times;</button>
        </div>
        <div className="form-grid" style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label>Gateway ID *</label>
            <input value={gatewayForm.id} onChange={e => setGatewayForm({ ...gatewayForm, id: e.target.value })} placeholder="stripe" style={{ fontFamily: 'monospace' }} disabled={editingGateway !== null} />
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Unique ID used to reference this gateway (cannot be changed later)</span>
          </div>
          <div className="form-group">
            <label>Display Name *</label>
            <input value={gatewayForm.name} onChange={e => setGatewayForm({ ...gatewayForm, name: e.target.value })} placeholder="Stripe" />
          </div>
          <div className="form-group form-full">
            <label>Description</label>
            <textarea rows={2} value={gatewayForm.description} onChange={e => setGatewayForm({ ...gatewayForm, description: e.target.value })} placeholder="Pay securely via credit/debit card, UPI, and more..." />
          </div>
          <div className="form-group form-full">
            <label>Enabled</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={gatewayForm.enabled} onChange={e => setGatewayForm({ ...gatewayForm, enabled: e.target.checked })} />
              <span>{gatewayForm.enabled ? 'Active' : 'Disabled'}</span>
            </label>
          </div>
          <div className="form-group form-full" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontWeight: 600 }}>Custom Fields (Key/Value Pairs)</label>
              <button className="btn-ghost btn-sm" onClick={addField}>+ Add Field</button>
            </div>
            {gatewayForm.fields.length === 0 && (
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>No custom fields defined. Add fields if this gateway requires specific configuration keys (e.g. API key, webhook secret).</p>
            )}
            {gatewayForm.fields.map((field, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <input placeholder="Key" value={field.key} onChange={e => updateField(idx, { key: e.target.value })} style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.8rem' }} />
                <input placeholder="Label" value={field.label} onChange={e => updateField(idx, { label: e.target.value })} style={{ flex: 1, fontSize: '0.8rem' }} />
                <input placeholder="Value" value={field.value} onChange={e => updateField(idx, { value: e.target.value })} style={{ flex: 1, fontSize: '0.8rem' }} />
                <button onClick={() => removeField(idx)} style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', padding: '0.25rem' }}>✕</button>
              </div>
            ))}
          </div>
        </div>
        <div className="form-actions" style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
          <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn-dark btn-sm" onClick={handleSave}>{editingGateway !== null ? 'Update Gateway' : 'Add Gateway'}</button>
        </div>
      </div>
    </div>
  );
}

export default function PaymentsTab({
  settings, setSettings, loading, handleSaveSettings,
  dynamicGateways, setDynamicGateways,
  showGatewayModal, setShowGatewayModal, editingGateway, setEditingGateway, gatewayForm, setGatewayForm
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Razorpay Configuration */}
      <div className="detail-panel">
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3>Razorpay Configuration</h3>
            <span className={`status-badge ${settings.razorpayEnabled === 'true' ? 'status-active' : 'status-pending'}`}>
              {settings.razorpayEnabled === 'true' ? 'Active' : 'Disabled'}
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.razorpayEnabled === 'true'} onChange={e => setSettings({ ...settings, razorpayEnabled: e.target.checked ? 'true' : 'false' })} />
            <strong>Enable Razorpay</strong>
          </label>
        </div>
        {settings.razorpayEnabled === 'true' && (
          <div className="form-grid" style={{ marginTop: '1rem' }}>
            <div className="form-group">
              <label>Key ID</label>
              <input value={settings.razorpayKeyId || ''} onChange={e => setSettings({ ...settings, razorpayKeyId: e.target.value })} placeholder="rzp_test_..." type="password" autoComplete="off" />
            </div>
            <div className="form-group">
              <label>Key Secret</label>
              <input value={settings.razorpayKeySecret || ''} onChange={e => setSettings({ ...settings, razorpayKeySecret: e.target.value })} placeholder="Key Secret" type="password" autoComplete="off" />
            </div>
          </div>
        )}
        <div className="form-actions" style={{ marginTop: '1rem' }}><button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save Razorpay Settings'}</button></div>
      </div>

      {/* Cash on Delivery (COD) Configuration */}
      <div className="detail-panel">
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3>Cash on Delivery (COD)</h3>
            <span className={`status-badge ${settings.codEnabled === 'true' ? 'status-active' : 'status-pending'}`}>
              {settings.codEnabled === 'true' ? 'Active' : 'Disabled'}
            </span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={settings.codEnabled === 'true'} onChange={e => setSettings({ ...settings, codEnabled: e.target.checked ? 'true' : 'false' })} />
            <strong>Enable COD</strong>
          </label>
        </div>
        {settings.codEnabled === 'true' && (
          <div className="form-grid" style={{ marginTop: '1rem' }}>
            <div className="form-group form-full">
              <label>Instructions for Checkout</label>
              <textarea rows={2} value={settings.codInstructions || ''} onChange={e => setSettings({ ...settings, codInstructions: e.target.value })} placeholder="Pay with cash upon package delivery..." />
            </div>
          </div>
        )}
        <div className="form-actions" style={{ marginTop: '1rem' }}><button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>{loading ? 'Saving...' : 'Save COD Settings'}</button></div>
      </div>

      {/* Custom Dynamic Gateways Configuration */}
      <div className="detail-panel">
        <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3>Custom Dynamic Payment Methods</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
              Register, configure, and toggle custom third-party payment gateways dynamically.
            </p>
          </div>
          <button
            className="btn-dark btn-sm"
            onClick={() => {
              setEditingGateway(null);
              setGatewayForm({ id: '', name: '', description: '', enabled: true, fields: [] });
              setShowGatewayModal(true);
            }}
          >
            + Add Custom Gateway
          </button>
        </div>

        {dynamicGateways.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
            <p>No custom dynamic payment gateways registered yet.</p>
            <button
              className="btn-ghost btn-sm"
              style={{ marginTop: '0.5rem' }}
              onClick={() => {
                setEditingGateway(null);
                setGatewayForm({ id: '', name: '', description: '', enabled: true, fields: [] });
                setShowGatewayModal(true);
              }}
            >
              Create your first gateway
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Gateway ID</th>
                  <th style={{ padding: '0.75rem' }}>Name</th>
                  <th style={{ padding: '0.75rem' }}>Description</th>
                  <th style={{ padding: '0.75rem' }}>Custom Keys</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {dynamicGateways.map((gw, idx) => (
                  <tr key={gw.id || idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>
                      <code style={{ background: 'var(--off-white)', padding: '0.125rem 0.25rem', borderRadius: '4px' }}>{gw.id}</code>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{gw.name}</td>
                    <td style={{ padding: '0.75rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {gw.description}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span className="status-badge status-pending" style={{ fontSize: '0.75rem' }}>
                        {gw.fields?.length || 0} fields
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        onClick={() => {
                          const updated = [...dynamicGateways];
                          updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled };
                          setDynamicGateways(updated);
                          toast.success(`${gw.name} status updated. Click Save to persist.`);
                        }}
                        className={`status-badge ${gw.enabled ? 'status-active' : 'status-pending'}`}
                        style={{ border: 'none', cursor: 'pointer' }}
                      >
                        {gw.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="btn-ghost btn-sm" onClick={() => {
                          setEditingGateway(idx);
                          setGatewayForm({ ...gw });
                          setShowGatewayModal(true);
                        }}>Edit</button>
                        <button className="btn-ghost btn-sm" style={{ color: 'red' }} onClick={() => {
                          if (window.confirm(`Are you sure you want to delete ${gw.name}?`)) {
                            setDynamicGateways(dynamicGateways.filter((_, i) => i !== idx));
                            toast.success(`${gw.name} deleted. Click Save to persist.`);
                          }
                        }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button className="btn-dark btn-sm" onClick={handleSaveSettings} disabled={loading}>
            {loading ? 'Saving...' : 'Save All Payment Settings'}
          </button>
        </div>
      </div>

      <GatewayModal
        show={showGatewayModal}
        onClose={() => setShowGatewayModal(false)}
        editingGateway={editingGateway}
        gatewayForm={gatewayForm}
        setGatewayForm={setGatewayForm}
        dynamicGateways={dynamicGateways}
        setDynamicGateways={setDynamicGateways}
        setShowGatewayModal={setShowGatewayModal}
      />
    </div>
  );
}

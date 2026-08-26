import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import toast from '../../utils/toast';
import { formatDateTime } from '../../utils/formatters';
import { Plus, Edit2, Trash2, Truck, Package, CheckCircle, XCircle, MapPin, Star, Phone, Mail, RefreshCw, Search, ChevronDown, ChevronUp, Zap } from 'lucide-react';

const EMPTY_FORM = {
  name: '', phone: '', email: '', company: '', vehicleType: 'bike',
  serviceablePincodes: '', serviceableAreas: '', notes: '',
};

export default function DeliveryPartnersAdminPage() {
  const [partners, setPartners] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, available: 0, totalOrders: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState(null);
  const [partnerOrders, setPartnerOrders] = useState({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignOrderId, setAssignOrderId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [partnersRes, statsRes] = await Promise.all([
        adminAPI.getDeliveryPartners({ search }),
        adminAPI.getDeliveryPartnerStats(),
      ]);
      setPartners(partnersRes.data?.data || []);
      setStats(statsRes.data?.data || {});
    } catch (err) {
      toast.error('Failed to load delivery partners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search]);

  const handleSave = async () => {
    if (!form.name) { toast.error('Partner name is required'); return; }
    try {
      if (editId) {
        await adminAPI.updateDeliveryPartner(editId, form);
        toast.success('Partner updated');
      } else {
        await adminAPI.createDeliveryPartner(form);
        toast.success('Partner created');
      }
      setShowForm(false);
      setEditId(null);
      setForm(EMPTY_FORM);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete partner "${name}"? This cannot be undone.`)) return;
    try {
      await adminAPI.deleteDeliveryPartner(id);
      toast.success('Partner deleted');
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    }
  };

  const handleToggle = async (id, field) => {
    try {
      const fn = field === 'isAvailable' ? adminAPI.togglePartnerAvailability : adminAPI.togglePartnerActive;
      await fn(id);
      fetchData();
    } catch (err) {
      toast.error('Failed to toggle');
    }
  };

  const handleBulkAutoAssign = async () => {
    try {
      const res = await adminAPI.bulkAutoAssignPartners();
      const count = res.data?.data?.length || 0;
      toast.success(`Auto-assigned ${count} orders`);
      fetchData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Auto-assign failed');
    }
  };

  const handleAssign = async () => {
    if (!assignOrderId) { toast.error('Enter an order ID'); return; }
    try {
      await adminAPI.autoAssignDeliveryPartner({ orderId: assignOrderId });
      toast.success('Partner auto-assigned');
      setShowAssignModal(false);
      setAssignOrderId('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to assign');
    }
  };

  const toggleExpand = async (id) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (!partnerOrders[id]) {
      try {
        const res = await adminAPI.getDeliveryPartnerOrders(id);
        setPartnerOrders(prev => ({ ...prev, [id]: res.data?.data?.orders || [] }));
      } catch { /* ignore */ }
    }
  };

  const startEdit = (partner) => {
    setEditId(partner.id);
    setForm({
      name: partner.name || '',
      phone: partner.phone || '',
      email: partner.email || '',
      company: partner.company || '',
      vehicleType: partner.vehicleType || 'bike',
      serviceablePincodes: partner.serviceablePincodes || '',
      serviceableAreas: partner.serviceableAreas || '',
      notes: partner.notes || '',
    });
    setShowForm(true);
  };

  const successRate = (p) => p.totalDeliveries > 0 ? Math.round((p.successfulDeliveries / p.totalDeliveries) * 100) : 0;

  return (
    <div style={{ padding: '0' }}>
      <div className="admin-header">
        <h2>Delivery Partners</h2>
        <p>Manage delivery partners, auto-assign orders, and track performance</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Partners', value: stats.total, icon: <Truck size={20} />, color: '#3b82f6' },
          { label: 'Active', value: stats.active, icon: <CheckCircle size={20} />, color: '#10b981' },
          { label: 'Available Now', value: stats.available, icon: <Zap size={20} />, color: '#f59e0b' },
          { label: 'Orders Assigned', value: stats.totalOrders, icon: <Package size={20} />, color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} className="detail-panel" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>{s.icon}</div>
            <div><div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{s.value ?? 0}</div><div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{s.label}</div></div>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="detail-panel" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ color: 'var(--muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partners..." style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.85rem' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost btn-sm" onClick={handleBulkAutoAssign} title="Auto-assign all unassigned orders"><Zap size={14} /> Bulk Auto-Assign</button>
          <button className="btn-ghost btn-sm" onClick={() => { setShowAssignModal(true); }}><Package size={14} /> Assign Order</button>
          <button className="btn-ghost btn-sm" onClick={fetchData}><RefreshCw size={14} /></button>
          <button className="btn-dark btn-sm" onClick={() => { setEditId(null); setForm(EMPTY_FORM); setShowForm(true); }}><Plus size={14} /> Add Partner</button>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="detail-panel" style={{ width: '90%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>{editId ? 'Edit Partner' : 'Add Delivery Partner'}</h3>
              <button onClick={() => { setShowForm(false); setEditId(null); }} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group"><label>Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Rahul Kumar" /></div>
              <div className="form-group"><label>Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
              <div className="form-group"><label>Email</label><input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="rahul@example.com" /></div>
              <div className="form-group"><label>Company</label><input value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} placeholder="Express Delivery Co." /></div>
              <div className="form-group">
                <label>Vehicle Type</label>
                <select value={form.vehicleType} onChange={e => setForm({ ...form, vehicleType: e.target.value })}>
                  <option value="bike">🏍️ Bike</option>
                  <option value="van">🚐 Van</option>
                  <option value="truck">🚛 Truck</option>
                  <option value="cycle">🚲 Cycle</option>
                  <option value="other">📦 Other</option>
                </select>
              </div>
              <div className="form-group form-full">
                <label>Serviceable Pincodes (comma-separated)</label>
                <textarea rows={2} value={form.serviceablePincodes} onChange={e => setForm({ ...form, serviceablePincodes: e.target.value })} placeholder="281001, 281002, 110001, 400001..." style={{ fontSize: '0.85rem' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Orders from these pincodes will be auto-assigned to this partner</span>
              </div>
              <div className="form-group form-full">
                <label>Serviceable Areas (comma-separated)</label>
                <input value={form.serviceableAreas} onChange={e => setForm({ ...form, serviceableAreas: e.target.value })} placeholder="Mathura, Agra, Delhi NCR..." />
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>City/state names for area-based matching (fallback if no pincode match)</span>
              </div>
              <div className="form-group form-full">
                <label>Notes</label>
                <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Preferred routes, availability notes..." />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn-ghost btn-sm" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</button>
              <button className="btn-dark btn-sm" onClick={handleSave}>{editId ? 'Update' : 'Create'} Partner</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="detail-panel" style={{ width: '90%', maxWidth: 400, padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Auto-Assign Order</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: '1rem' }}>Enter an order ID. The best matching partner will be auto-assigned based on pincode/area.</p>
            <input value={assignOrderId} onChange={e => setAssignOrderId(e.target.value)} placeholder="Order ID" style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.85rem', marginBottom: '1rem' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button className="btn-ghost btn-sm" onClick={() => setShowAssignModal(false)}>Cancel</button>
              <button className="btn-dark btn-sm" onClick={handleAssign}>Auto-Assign</button>
            </div>
          </div>
        </div>
      )}

      {/* Partners List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}><div className="spinner" style={{ width: 24, height: 24, margin: '0 auto' }} /><p style={{ marginTop: '0.5rem' }}>Loading...</p></div>
      ) : partners.length === 0 ? (
        <div className="detail-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
          <Truck size={40} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <p>No delivery partners yet. Add your first partner to start automating deliveries.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {partners.map(p => (
            <div key={p.id} className="detail-panel" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 200 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--off-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>
                    {p.vehicleType === 'bike' ? '🏍️' : p.vehicleType === 'van' ? '🚐' : p.vehicleType === 'truck' ? '🚛' : '📦'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{p.name}</strong>
                      <span className={`status-badge ${p.isActive ? 'status-active' : 'status-pending'}`} style={{ fontSize: '0.7rem' }}>{p.isActive ? 'Active' : 'Inactive'}</span>
                      <span className={`status-badge ${p.isAvailable ? 'status-active' : 'status-pending'}`} style={{ fontSize: '0.7rem', background: p.isAvailable ? '#f0fdf4' : '#fef2f2', color: p.isAvailable ? '#166534' : '#991b1b', border: `1px solid ${p.isAvailable ? '#bbf7d0' : '#fecaca'}` }}>
                        {p.isAvailable ? '🟢 Available' : '🔴 Busy'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                      {p.company && <span>{p.company}</span>}
                      {p.phone && <span>📞 {p.phone}</span>}
                      {p.rating > 0 && <span>⭐ {Number(p.rating).toFixed(1)}</span>}
                      <span>📦 {p.totalDeliveries} deliveries ({successRate(p)}% success)</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button className="btn-ghost btn-sm" onClick={() => toggleExpand(p.id)} style={{ fontSize: '0.75rem' }}>
                    {expandedId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Orders
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => handleToggle(p.id, 'isAvailable')} style={{ fontSize: '0.75rem' }}>{p.isAvailable ? 'Set Busy' : 'Set Available'}</button>
                  <button className="btn-ghost btn-sm" onClick={() => handleToggle(p.id, 'isActive')} style={{ fontSize: '0.75rem' }}>{p.isActive ? 'Deactivate' : 'Activate'}</button>
                  <button className="btn-ghost btn-sm" onClick={() => startEdit(p)}><Edit2 size={14} /></button>
                  <button className="btn-ghost btn-sm" onClick={() => handleDelete(p.id, p.name)} style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
                </div>
              </div>

              {/* Expanded Orders */}
              {expandedId === p.id && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                  <h4 style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Recent Orders</h4>
                  {partnerOrders[p.id]?.length > 0 ? (
                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Order #</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Customer</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Status</th>
                          <th style={{ padding: '0.5rem', textAlign: 'left' }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {partnerOrders[p.id].map(o => (
                          <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '0.5rem' }}>#{o.orderNumber?.slice(-8)}</td>
                            <td style={{ padding: '0.5rem' }}>{o.user?.firstName} {o.user?.lastName}</td>
                            <td style={{ padding: '0.5rem' }}><span className={`status-badge status-${o.status?.toLowerCase()}`}>{o.status}</span></td>
                            <td style={{ padding: '0.5rem', color: 'var(--muted)' }}>{formatDateTime(o.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>No orders assigned yet</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

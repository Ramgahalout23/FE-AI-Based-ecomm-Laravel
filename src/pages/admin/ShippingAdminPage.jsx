import { useState, useEffect } from 'react';
import { shippingAPI } from '../../api/shipping';
import AdminPageShell from '../../components/admin/AdminPageShell';
import { formatDate, formatDateTime } from '../../utils/formatters';
import { SHIPPING_STATUSES } from '../../utils/constants';
import Pagination from '../../components/admin/Pagination';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import { downloadBlob } from '../../utils/download';
import toast from '../../utils/toast';

const EMPTY_SHIP = { orderId: '', carrier: '', trackingNumber: '' };
const EMPTY_ZONE = { name: '', regions: '' };

export default function ShippingAdminPage() {
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('shipments');
  const [zones, setZones] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_SHIP);
  const [zoneModal, setZoneModal] = useState(false);
  const [zoneForm, setZoneForm] = useState(EMPTY_ZONE);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];

  // CSV Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  const SHIPMENT_COLUMNS = [
    { key: 'orderId', label: 'Order ID' },
    { key: 'carrier', label: 'Carrier' },
    { key: 'trackingNumber', label: 'Tracking Number' },
    { key: 'cost', label: 'Cost' },
    { key: 'status', label: 'Status' },
    { key: 'estimatedDelivery', label: 'Estimated Delivery' },
    { key: 'actualDelivery', label: 'Actual Delivery' },
    { key: 'notes', label: 'Notes' },
    { key: 'createdAt', label: 'Created Date' },
  ];

  const handleExportCSV = async (selectedColumns) => {
    setExporting(true); setExportStatus('dispatching'); setExportError(null);
    try {
      const filters = { search: debouncedSearch || undefined, status: statusFilter !== 'ALL' ? statusFilter : undefined };
      Object.keys(filters).forEach(k => { if (filters[k] === undefined) delete filters[k]; });
      const dispatchRes = await adminAPI.dispatchExport({ type: 'shipments', filters, columns: selectedColumns });
      const jobId = dispatchRes.data?.data?.id;
      if (!jobId) throw new Error('No job ID returned');
      setExportStatus('processing');
      const poll = async () => {
        try {
          const statusRes = await adminAPI.checkExportStatus(jobId);
          const status = statusRes.data?.data?.status;
          if (status === 'completed') {
            const downloadRes = await adminAPI.downloadExport(jobId);
            const filename = statusRes.data?.data?.file_name || `shipments-export-${new Date().toISOString().slice(0, 10)}.csv`;
            downloadBlob(downloadRes, filename);
            setExportStatus('completed');
            toast.success('Shipments exported successfully');
            setTimeout(() => { setShowExportModal(false); setExportStatus(null); }, 1500);
          } else if (status === 'failed') {
            throw new Error(statusRes.data?.data?.error_message || 'Export failed');
          } else {
            setTimeout(poll, 1500);
          }
        } catch (pollErr) {
          console.error('Export poll error:', pollErr);
          if (!exportStatus || exportStatus === 'processing') {
            setExportStatus('failed'); setExportError(pollErr.response?.data?.message || pollErr.message || 'Export failed');
            toast.error('Export failed');
          }
        }
      };
      poll().catch(() => {});
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('failed'); setExportError(err.response?.data?.message || err.message || 'Failed to export shipments');
      toast.error('Export failed');
    } finally { setExporting(false); }
  };

  const loadShipments = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined
      };
      const r = await shippingAPI.getAll(params);
      const data = r.data?.data || r.data;
      const list = data?.shipments || data?.items || data || [];
      setShipments(Array.isArray(list) ? list : []);
      const pag = r.data?.pagination || data?.pagination || {};
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || pag.totalPages || Math.ceil((pag.total || list.length) / pageSize) || 1);
      setTotalItems(pag.total || list.length);
    } catch (e) { setError('Failed to load shipments'); console.warn('Failed to load shipments:', e); }
    try {
      const r = await shippingAPI.getZones();
      const list = r.data?.data?.zones || r.data?.zones || r.data?.data || [];
      setZones(Array.isArray(list) ? list : []);
    } catch (e) { setError(prev => prev || 'Failed to load shipping zones'); console.warn('Failed to load zones:', e); }
    setLoading(false);
  };

  // Reset page when search or filter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadShipments(1);
    }
  }, [debouncedSearch, statusFilter, pageSize]);

  useEffect(() => {
    loadShipments(currentPage);
  }, [currentPage]);

  const handleCreateShipment = async () => {
    try { const r = await shippingAPI.create(form); setShipments([r.data || { ...form, id: Date.now().toString(), status: 'PENDING' }, ...shipments]); setShowModal(false); toast.success('Shipment created'); } catch { toast.error('Failed'); }
  };

  const handleUpdateStatus = async (id, status) => {
    try { await shippingAPI.update(id, { status }); setShipments(shipments.map(s => s.id === id ? { ...s, status } : s)); toast.success('Status updated'); } catch { toast.error('Failed'); }
  };

  const handleCreateZone = async () => {
    try { const r = await shippingAPI.createZone({ ...zoneForm, regions: zoneForm.regions.split(',').map(s => s.trim()) }); setZones([...zones, r.data || zoneForm]); setZoneModal(false); setZoneForm(EMPTY_ZONE); toast.success('Zone created'); } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <AdminPageShell
        title="Shipping"
        subtitle="Manage shipments, zones, and tracking"
        loading={loading}
        error={error}
        page="shipping"
        actions={
          <>
            <button className="btn-ghost btn-sm" onClick={() => setZoneModal(true)}>🌍 Add Zone</button>
            <button className="btn-ghost btn-sm" onClick={() => setShowExportModal(true)}>📥 Export CSV</button>
            <button className="btn-dark btn-sm" onClick={() => { setForm(EMPTY_SHIP); setShowModal(true); }}>📦 Create Shipment</button>
          </>
        }
      >
      <div className="admin-tabs-wrap">
        <button className={`admin-tab ${tab === 'shipments' ? 'active' : ''}`} onClick={() => setTab('shipments')}>Shipments</button>
        <button className={`admin-tab ${tab === 'zones' ? 'active' : ''}`} onClick={() => setTab('zones')}>Shipping Zones</button>
      </div>

      {detail && (
        <div className="detail-panel">
          <div className="detail-header"><h3>Shipment #{detail.id?.slice(0, 8)}</h3><button className="btn-ghost btn-sm" onClick={() => setDetail(null)}>✕ Close</button></div>
          <div className="detail-grid">
            <div className="detail-item"><span className="label">Order ID</span><span className="value" style={{ fontFamily: 'monospace' }}>{detail.orderId}</span></div>
            <div className="detail-item"><span className="label">Carrier</span><span className="value">{detail.carrier || detail.provider}</span></div>
            <div className="detail-item"><span className="label">Tracking #</span><span className="value" style={{ fontFamily: 'monospace' }}>{detail.trackingNumber || '—'}</span></div>
            <div className="detail-item"><span className="label">Status</span><span className="value"><span className={`status-badge ${detail.status === 'DELIVERED' ? 'status-delivered' : 'status-in-transit'}`}>{detail.status}</span></span></div>
            <div className="detail-item"><span className="label">Created</span><span className="value">{formatDateTime(detail.createdAt)}</span></div>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--muted)', alignSelf: 'center', marginRight: '0.5rem' }}>Update Status:</span>
            {SHIPPING_STATUSES.map(s => (
              <button key={s} className={`btn-sm ${detail.status === s ? 'btn-dark' : 'btn-ghost'}`} style={{ fontSize: '0.7rem' }} onClick={() => handleUpdateStatus(detail.id, s)}>{s.replace(/_/g, ' ')}</button>
            ))}
          </div>
        </div>
      )}

      {tab === 'shipments' ? (
        <div className="table-card">
          <div className="table-toolbar">
            <input className="table-search" placeholder="Search tracking # or order..." value={search} onChange={e => setSearch(e.target.value)} autoComplete="off" />
            <select className="table-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="ALL">All Statuses</option>
              {SHIPPING_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <table className="admin-table">
            <thead><tr><th>Shipment</th><th>Order</th><th>Carrier</th><th>Tracking</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {shipments.length === 0 ? <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">📦</div><h3>No shipments</h3></div></td></tr> :
              shipments.map(s => (
                <tr key={s.id}>
                  <td><strong style={{ fontFamily: 'monospace' }}>#{s.id?.slice(0, 8)}</strong></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>#{s.orderId?.slice(0, 8)}</td>
                  <td>{s.carrier || s.provider || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{s.trackingNumber || '—'}</td>
                  <td><span className={`status-badge ${s.status === 'DELIVERED' ? 'status-delivered' : s.status === 'IN_TRANSIT' ? 'status-in-transit' : 'status-pending'}`}>{s.status?.replace(/_/g, ' ')}</span></td>
                  <td style={{ fontSize: '0.82rem' }}>{formatDate(s.createdAt)}</td>
                  <td>
                    <div className="row-actions">
                      <button className="btn-view" onClick={() => setDetail(s)}>View</button>
                      <select className="table-filter" style={{ padding: '0.25rem', fontSize: '0.7rem' }} value={s.status} onChange={e => handleUpdateStatus(s.id, e.target.value)}>
                        {SHIPPING_STATUSES.map(st => <option key={st} value={st}>{st.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={pageSizeOptions}
          />
        </div>
      ) : (
        <div className="table-card">
          <div className="table-head"><h3>Shipping Zones ({zones.length})</h3></div>
          <table className="admin-table">
            <thead><tr><th>Zone Name</th><th>Regions</th><th>Status</th></tr></thead>
            <tbody>{zones.map((z, i) => (
              <tr key={i}><td><strong>{z.name}</strong></td><td>{(z.regions || []).join(', ')}</td><td><span className="status-badge status-active">Active</span></td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      </AdminPageShell>

      <ExportCSVModal
        isOpen={showExportModal}
        onClose={() => { setShowExportModal(false); setExportStatus(null); setExportError(null); }}
        columns={SHIPMENT_COLUMNS}
        onExport={handleExportCSV}
        exporting={exporting}
        exportStatus={exportStatus}
        exportError={exportError}
        filename={`shipments-export-${new Date().toISOString().slice(0, 10)}.csv`}
      />

      {showModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 450 }}>
            <div className="modal-header"><h3>📦 Create Shipment</h3><button className="modal-close" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: '1rem' }}><label>Order ID</label><input value={form.orderId} onChange={e => setForm({ ...form, orderId: e.target.value })} placeholder="Order ID" autoComplete="off" /></div>
              <div className="form-grid">
                <div className="form-group"><label>Carrier</label><select value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })}><option value="">Select...</option><option>FEDEX</option><option>DHL</option><option>UPS</option><option>USPS</option></select></div>
                <div className="form-group"><label>Tracking #</label><input value={form.trackingNumber} onChange={e => setForm({ ...form, trackingNumber: e.target.value })} placeholder="FEDEX123456" autoComplete="off" /></div>
              </div>
            </div>
            <div className="modal-footer"><button className="btn-ghost btn-sm" onClick={() => setShowModal(false)}>Cancel</button><button className="btn-dark btn-sm" onClick={handleCreateShipment}>Create</button></div>
          </div>
        </div>
      )}

      {zoneModal && (
        <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && setZoneModal(false)}>
          <div className="modal" style={{ maxWidth: 420 }}>
            <div className="modal-header"><h3>🌍 Add Shipping Zone</h3><button className="modal-close" onClick={() => setZoneModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: '1rem' }}><label>Zone Name</label><input value={zoneForm.name} onChange={e => setZoneForm({ ...zoneForm, name: e.target.value })} placeholder="US Zone" /></div>
              <div className="form-group"><label>Regions (comma-separated)</label><input value={zoneForm.regions} onChange={e => setZoneForm({ ...zoneForm, regions: e.target.value })} placeholder="US, CA, MX" /></div>
            </div>
            <div className="modal-footer"><button className="btn-ghost btn-sm" onClick={() => setZoneModal(false)}>Cancel</button><button className="btn-dark btn-sm" onClick={handleCreateZone}>Create Zone</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

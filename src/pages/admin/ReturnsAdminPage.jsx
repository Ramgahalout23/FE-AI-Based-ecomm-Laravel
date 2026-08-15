import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import { formatCurrency, formatDate, formatDateTime, getUserFullName } from '../../utils/formatters';
import toast from '../../utils/toast';
import Pagination from '../../components/admin/Pagination';

const RETURN_REQUEST_STATUSES = {
  PENDING: { label: 'Pending', class: 'status-pending' },
  APPROVED: { label: 'Approved', class: 'status-active' },
  REJECTED: { label: 'Rejected', class: 'status-cancelled' },
  COMPLETED: { label: 'Completed', class: 'status-success' },
};

const RETURN_TYPE_LABELS = {
  exchange: 'Exchange',
  replacement: 'Replacement',
  refund: 'Refund',
  other: 'Other',
};

const RESOLUTION_OPTIONS = [
  { value: '',          label: 'Select resolution...', disabled: true },
  { value: 'exchange',    label: 'Exchange (size swapped)' },
  { value: 'replacement', label: 'Replacement (new unit sent)' },
  { value: 'refund',      label: 'Refund (cash refunded)' },
];

function DetailSection({ title, icon, children, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div style={{ marginBottom: '0.6rem', background: '#fafafa', borderRadius: '10px', border: '1px solid #eee' }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          cursor: 'pointer', userSelect: 'none', padding: '0.75rem 1rem',
          borderBottom: expanded ? '1px solid #eee' : 'none',
        }}
      >
        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {icon} {title}
        </div>
        <span style={{ fontSize: '0.6rem', color: '#999', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </span>
      </div>
      <div style={{
        overflow: 'hidden', maxHeight: expanded ? '3000px' : '0',
        opacity: expanded ? 1 : 0, transition: 'all 0.25s ease',
        padding: expanded ? '0.75rem 1rem' : '0 1rem',
      }}>
        {children}
      </div>
    </div>
  );
}

function DetailGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
      {items.map((item, i) => (
        <div key={i}>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: '0.15rem' }}>{item.label}</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 500, color: '#1a1a1a' }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export default function ReturnsAdminPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];

  // Action modal state
  const [actionModal, setActionModal] = useState({ open: false, type: '', item: null });
  const [adminResponse, setAdminResponse] = useState('');
  const [selectedResolution, setSelectedResolution] = useState('');

  // Detail modal state
  const [detailModal, setDetailModal] = useState({ open: false, loading: false, data: null });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const loadRequests = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;

      const r = await adminAPI.getReturnRequests(params);
      const raw = r.data?.data || r.data || {};
      const list = Array.isArray(raw) ? raw : raw?.data || raw?.requests || [];
      setRequests(Array.isArray(list) ? list : []);
      setCurrentPage(raw.current_page || raw.page || page);
      setTotalPages(raw.last_page || raw.pages || raw.totalPages || Math.ceil((raw.total || list.length) / pageSize) || 1);
      setTotalItems(raw.total || list.length);
    } catch (err) {
      console.error('Failed to load return requests:', err);
      toast.error('Failed to load return requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      loadRequests(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- currentPage/loadRequests intentionally excluded: loadRequests is recreated each render
  }, [debouncedSearch, statusFilter, pageSize]);

  useEffect(() => {
    loadRequests(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadRequests is recreated each render; page changes are the only intended trigger
  }, [currentPage]);

  const openActionModal = (type, item) => {
    setActionModal({ open: true, type, item });
    setAdminResponse('');
    setSelectedResolution(item?.resolution || (item?.return_type !== 'refund' ? item?.return_type || '' : '') || '');
  };

  const closeActionModal = () => {
    setActionModal({ open: false, type: '', item: null });
    setAdminResponse('');
    setSelectedResolution('');
  };

  const handleApprove = async () => {
    const { item } = actionModal;
    try {
      const payload = { admin_response: adminResponse || null };
      if (selectedResolution) payload.resolution = selectedResolution;
      await adminAPI.approveReturnRequest(item.id, payload);
      toast.success('Return request approved');
      closeActionModal();
      loadRequests(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve return request');
    }
  };

  const handleReject = async () => {
    const { item } = actionModal;
    try {
      await adminAPI.rejectReturnRequest(item.id, { admin_response: adminResponse || null });
      toast.success('Return request rejected');
      closeActionModal();
      loadRequests(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject return request');
    }
  };

  const handleComplete = async () => {
    const { item } = actionModal;
    if (!item) return;
    try {
      await adminAPI.completeReturnRequest(item.id);
      toast.success('Return completed and refund processed');
      closeActionModal();
      loadRequests(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete return');
    }
  };

  const openCompleteModal = (item) => {
    setActionModal({ open: true, type: 'complete', item });
    setAdminResponse('');
  };

  const openDetailModal = async (item) => {
    setDetailModal({ open: true, loading: true, data: null });
    try {
      const r = await adminAPI.getReturnRequestDetail(item.id);
      const data = r.data?.data || r.data;
      setDetailModal({ open: true, loading: false, data });
    } catch {
      toast.error('Failed to load return request details');
      setDetailModal({ open: false, loading: false, data: null });
    }
  };

  const closeDetailModal = () => {
    setDetailModal({ open: false, loading: false, data: null });
  };

  const formatAddress = (addr) => {
    if (!addr) return '—';
    const parts = [
      `${addr.firstName || addr.first_name || ''} ${addr.lastName || addr.last_name || ''}`.trim(),
      addr.addressLine1 || addr.address_line1 || addr.address1 || '',
      addr.addressLine2 || addr.address_line2 || addr.address2 || '',
      `${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || addr.zip_code || addr.zip || ''}`.trim(),
      addr.country || ''
    ].filter(Boolean);
    return parts.join('\n');
  };

  const counts = {
    PENDING: Array.isArray(requests) ? requests.filter(r => r.status === 'PENDING').length : 0,
    APPROVED: Array.isArray(requests) ? requests.filter(r => r.status === 'APPROVED').length : 0,
    REJECTED: Array.isArray(requests) ? requests.filter(r => r.status === 'REJECTED').length : 0,
    COMPLETED: Array.isArray(requests) ? requests.filter(r => r.status === 'COMPLETED').length : 0,
  };

  return (
    <div>
      <div className="admin-header">
        <h2>Returns</h2>
        <p>Manage customer return requests and process refunds</p>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        {Object.entries(counts).map(([status, count]) => (
          <div
            key={status}
            className="stat-card"
            style={{ cursor: 'pointer' }}
            onClick={() => setStatusFilter(statusFilter === status ? 'ALL' : status)}
          >
            <div className="stat-label">{RETURN_REQUEST_STATUSES[status]?.label || status}</div>
            <div className="stat-val" style={{
              color: ({
                PENDING: 'var(--warning)',
                APPROVED: 'var(--info)',
                REJECTED: 'var(--danger)',
                COMPLETED: 'var(--success)',
              })[status] || 'var(--muted)',
            }}>{count}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search by user, order, reason..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="table-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            {Object.keys(RETURN_REQUEST_STATUSES).map(s => (
              <option key={s} value={s}>{RETURN_REQUEST_STATUSES[s].label}</option>
            ))}
          </select>
          <span className="table-count">{totalItems} requests</span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Order</th>
              <th>Type</th>
              <th>Reason</th>
              <th>Amount</th>
              <th>Resolution</th>
              <th>Status</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={10}><div className="empty-state"><div className="empty-state-icon">📦</div><h3>No return requests found</h3></div></td></tr>
            ) : requests.map(r => (
              <tr key={r.id}>
                <td><strong style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>#{r.id?.slice(0, 8)}</strong></td>
                <td>
                  {r.user ? (
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                        {getUserFullName(r.user) || r.user.email || '—'}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                        {r.user.email || ''}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>User #{r.user_id?.slice(0, 8)}</span>
                  )}
                </td>
                <td style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>
                  {r.order ? `#${r.order.order_number || r.order.id?.slice(0, 8)}` : `#${r.order_id?.slice(0, 8)}`}
                </td>
                <td>
                  {r.return_type ? (
                    <span className={`status-badge ${
                      r.return_type === 'refund' ? 'status-warning' :
                      r.return_type === 'exchange' ? 'status-info' :
                      r.return_type === 'replacement' ? 'status-active' :
                      'status-pending'
                    }`} style={{ fontSize: '0.7rem' }}>
                      {RETURN_TYPE_LABELS[r.return_type] || r.return_type}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>—</span>
                  )}
                </td>
                <td style={{ maxWidth: 160, fontSize: '0.82rem' }}>
                  <div>{r.reason || '—'}</div>
                  {r.description && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{r.description}</div>}
                </td>
                <td>
                  {r.refund_amount ? (
                    <strong>{formatCurrency(r.refund_amount)}</strong>
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>—</span>
                  )}

                </td>
                <td>
                  {r.resolution ? (
                    <span className="status-badge status-success" style={{ fontSize: '0.68rem' }}>
                      {RETURN_TYPE_LABELS[r.resolution] || r.resolution}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>—</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${RETURN_REQUEST_STATUSES[r.status]?.class || 'status-pending'}`}>
                    {RETURN_REQUEST_STATUSES[r.status]?.label || r.status}
                  </span>
                  {r.admin_response && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: 2 }}>
                      Admin: {r.admin_response}
                    </div>
                  )}
                </td>
                <td style={{ fontSize: '0.82rem' }}>{r.created_at ? formatDate(r.created_at) : '—'}</td>
                <td>
                  <div className="row-actions" style={{ flexWrap: 'wrap', gap: '0.25rem' }}>
                    <button className="btn-view" onClick={() => openDetailModal(r)}>View</button>
                    {r.status === 'PENDING' && (
                      <>
                        <button className="btn-approve" onClick={() => openActionModal('approve', r)}>Approve</button>
                        <button className="btn-del" onClick={() => openActionModal('reject', r)}>Reject</button>
                      </>
                    )}
                    {r.status === 'APPROVED' && (
                      <button className="btn-primary btn-sm" onClick={() => openCompleteModal(r)}>
                        Complete & Refund
                      </button>
                    )}
                    {r.status === 'COMPLETED' && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>✓ Done</span>
                    )}
                    {r.status === 'REJECTED' && (
                      <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>—</span>
                    )}
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
          itemLabel="request"
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={pageSizeOptions}
        />
      </div>

      {/* ── DETAIL MODAL ── */}
      {detailModal.open && (
        <div
          className="modal-overlay"
          onClick={closeDetailModal}
          style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, justifyContent: 'center', alignItems: 'flex-start', padding: '1.5rem', overflowY: 'auto' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '14px', maxWidth: 720, width: '100%', margin: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', overflow: 'hidden', animation: 'fadeSlideIn 0.25s ease' }}
          >
            {/* ── Header ── */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.25rem 1.5rem', borderBottom: '1px solid #eee', background: '#fafafa'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Return Request
                  {detailModal.data?.return_type && (
                    <span className={`status-badge ${
                      detailModal.data.return_type === 'refund' ? 'status-warning' :
                      detailModal.data.return_type === 'exchange' ? 'status-info' :
                      detailModal.data.return_type === 'replacement' ? 'status-active' : 'status-pending'
                    }`} style={{ fontSize: '0.65rem' }}>
                      {RETURN_TYPE_LABELS[detailModal.data.return_type] || detailModal.data.return_type}
                    </span>
                  )}
                </h3>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: '#999', fontFamily: 'monospace' }}>
                  ID: {detailModal.data?.id} · Created {detailModal.data?.created_at ? formatDateTime(detailModal.data.created_at) : '—'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {detailModal.data?.status && (
                  <span className={`status-badge ${RETURN_REQUEST_STATUSES[detailModal.data.status]?.class || 'status-pending'}`}>
                    {RETURN_REQUEST_STATUSES[detailModal.data.status]?.label || detailModal.data.status}
                  </span>
                )}
                <button
                  onClick={closeDetailModal}
                  style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#999', padding: '0.25rem', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* ── Body ── */}
            <div style={{ padding: '0.75rem 1.5rem 1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
              {detailModal.loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                  <div className="spinner" />
                </div>
              ) : detailModal.data ? (
                <>
                  {/* Request Info */}
                  <DetailSection title="Request Info" icon="📋" defaultExpanded={true}>
                    <DetailGrid items={[
                      { label: 'Request ID', value: <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{detailModal.data.id}</span> },
                      { label: 'Status', value: <span className={`status-badge ${RETURN_REQUEST_STATUSES[detailModal.data.status]?.class || 'status-pending'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{RETURN_REQUEST_STATUSES[detailModal.data.status]?.label || detailModal.data.status}</span> },
                      { label: 'Return Type', value: RETURN_TYPE_LABELS[detailModal.data.return_type] || detailModal.data.return_type || '—' },
                      { label: 'Reason', value: detailModal.data.reason || '—' },
                      { label: 'Created', value: detailModal.data.created_at ? formatDateTime(detailModal.data.created_at) : '—' },
                      { label: 'Processed', value: detailModal.data.processed_at ? formatDateTime(detailModal.data.processed_at) : '—' },
                      { label: 'Refund Amount', value: detailModal.data.refund_amount ? <strong>{formatCurrency(detailModal.data.refund_amount)}</strong> : '—' },
                      { label: 'Resolution', value: detailModal.data.resolution ? (RETURN_TYPE_LABELS[detailModal.data.resolution] || detailModal.data.resolution) : '—' },
                    ]} />
                    {detailModal.data.description && (
                      <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.75rem', background: '#f5f5f5', borderRadius: '8px', fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', color: '#999', marginBottom: '0.25rem' }}>📝 Customer Description</div>
                        {detailModal.data.description}
                      </div>
                    )}
                  </DetailSection>

                  {/* Customer Info */}
                  {detailModal.data.user && (
                    <DetailSection title="Customer" icon="👤" defaultExpanded={true}>
                      <DetailGrid items={[
                        { label: 'Name', value: `${detailModal.data.user.firstName || detailModal.data.user.first_name || ''} ${detailModal.data.user.lastName || detailModal.data.user.last_name || ''}`.trim() || detailModal.data.user.email || '—' },
                        { label: 'Email', value: detailModal.data.user.email || '—' },
                        { label: 'Phone', value: detailModal.data.user.phoneNumber || detailModal.data.user.phone_number || '—' },
                        { label: 'User ID', value: <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{detailModal.data.user.id}</span> },
                        { label: 'Joined', value: detailModal.data.user.created_at ? formatDate(detailModal.data.user.created_at) : '—' },
                      ]} />
                    </DetailSection>
                  )}

                  {/* Order Info */}
                  {detailModal.data.order && (
                    <DetailSection title="Order" icon="🛍️" defaultExpanded={true}>
                      <DetailGrid items={[
                        { label: 'Order #', value: <span style={{ fontFamily: 'monospace' }}>{detailModal.data.order.order_number || `#${detailModal.data.order.id?.slice(0, 8)}`}</span> },
                        { label: 'Order ID', value: <span style={{ fontFamily: 'monospace', fontSize: '0.78rem' }}>{detailModal.data.order.id}</span> },
                        { label: 'Status', value: <span className={`status-badge ${RETURN_REQUEST_STATUSES[detailModal.data.order.status]?.class || 'status-pending'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{detailModal.data.order.status}</span> },
                        { label: 'Total', value: <strong>{formatCurrency(detailModal.data.order.total || detailModal.data.order.totalAmount)}</strong> },
                        { label: 'Created', value: detailModal.data.order.created_at ? formatDateTime(detailModal.data.order.created_at) : '—' },
                        { label: 'Delivered', value: detailModal.data.order.delivered_at ? formatDateTime(detailModal.data.order.delivered_at) : '—' },
                        { label: 'Payment', value: detailModal.data.order.payment?.method || '—' },
                        { label: 'Subtotal', value: formatCurrency(detailModal.data.order.subtotal || 0) },
                        { label: 'Shipping', value: formatCurrency(detailModal.data.order.shipping_cost || detailModal.data.order.shippingCost || 0) },
                        { label: 'Discount', value: formatCurrency(detailModal.data.order.discount || 0) },
                      ]} />

                      {/* Order Items */}
                      {detailModal.data.order.items?.length > 0 && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#666', marginBottom: '0.4rem' }}>📦 Order Items ({detailModal.data.order.items.length})</div>
                          {detailModal.data.order.items.slice(0, 5).map((item, i) => (
                            <div key={item.id || i} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '0.4rem 0', borderBottom: i < detailModal.data.order.items.length - 1 ? '1px solid #f0f0f0' : 'none',
                              fontSize: '0.82rem'
                            }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <span style={{ fontWeight: 500 }}>{item.name || item.productName || item.product?.name || `Item #${item.product_id?.slice(0, 8) || ''}`}</span>
                                <span style={{ color: '#999', marginLeft: '0.5rem', fontSize: '0.75rem' }}>×{item.quantity || 1}</span>
                              </div>
                              <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{formatCurrency((Number(item.price) || 0) * (Number(item.quantity) || 1))}</span>
                            </div>
                          ))}
                          {detailModal.data.order.items.length > 5 && (
                            <div style={{ fontSize: '0.75rem', color: '#999', textAlign: 'center', padding: '0.3rem 0' }}>
                              +{detailModal.data.order.items.length - 5} more items
                            </div>
                          )}
                        </div>
                      )}
                    </DetailSection>
                  )}

                  {/* Shipping Address */}
                  {detailModal.data.order?.shippingAddress && (
                    <DetailSection title="Shipping Address" icon="📍" defaultExpanded={false}>
                      <div style={{ fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: '#333' }}>
                        {formatAddress(detailModal.data.order.shippingAddress)}
                      </div>
                      {detailModal.data.order.shippingAddress.phoneNumber && (
                        <div style={{ fontSize: '0.82rem', color: '#666', marginTop: '0.25rem' }}>
                          📞 {detailModal.data.order.shippingAddress.phoneNumber}
                        </div>
                      )}
                    </DetailSection>
                  )}

                  {/* Admin History */}
                  {(detailModal.data.admin_response || detailModal.data.resolution) && (
                    <DetailSection title="Admin History" icon="📝" defaultExpanded={true}>
                      {detailModal.data.admin_response && (
                        <div style={{ marginBottom: '0.5rem' }}>
                          <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', color: '#999', marginBottom: '0.25rem' }}>Admin Response</div>
                          <div style={{ padding: '0.5rem 0.75rem', background: '#f5f5f5', borderRadius: '8px', fontSize: '0.82rem', lineHeight: 1.6 }}>
                            {detailModal.data.admin_response}
                          </div>
                        </div>
                      )}
                      {detailModal.data.resolution && (
                        <div>
                          <div style={{ fontSize: '0.65rem', fontWeight: 600, textTransform: 'uppercase', color: '#999', marginBottom: '0.25rem' }}>Resolution Offered</div>
                          <span className="status-badge status-success" style={{ fontSize: '0.72rem' }}>
                            {RETURN_TYPE_LABELS[detailModal.data.resolution] || detailModal.data.resolution}
                          </span>
                        </div>
                      )}
                    </DetailSection>
                  )}

                  {/* Timeline */}
                  <DetailSection title="Timeline" icon="📅" defaultExpanded={false}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.25rem 0' }}>
                      {[
                        { label: 'Request Created', time: detailModal.data.created_at, icon: '📋' },
                        { label: detailModal.data.status === 'REJECTED' ? 'Rejected' : 'Approved', time: detailModal.data.status !== 'PENDING' ? (detailModal.data.processed_at || detailModal.data.updated_at) : null, icon: detailModal.data.status === 'REJECTED' ? '❌' : '✅' },
                        { label: 'Completed', time: detailModal.data.status === 'COMPLETED' ? detailModal.data.processed_at : null, icon: '✅' },
                      ].filter(s => s.time || s.label === 'Request Created' || (s.label === 'Approved' && detailModal.data.status !== 'PENDING')).map((step, i) => (
                        <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.65rem', flexShrink: 0,
                            background: step.time ? '#d4edda' : '#f0f0f0',
                            color: step.time ? '#155724' : '#999',
                          }}>
                            {step.time ? '✓' : '○'}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 500, color: step.time ? '#1a1a1a' : '#999' }}>
                              {step.icon} {step.label}
                            </div>
                            {step.time && (
                              <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.1rem' }}>
                                {formatDateTime(step.time)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </DetailSection>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                  Failed to load request details.
                </div>
              )}
            </div>

            {/* ── Footer ── */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: '0.5rem',
              padding: '0.75rem 1.5rem', borderTop: '1px solid #eee', background: '#fafafa'
            }}>
              <button className="btn-ghost btn-sm" onClick={closeDetailModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionModal.open && (
        <div className="modal-overlay" onClick={closeActionModal}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3>
                {actionModal.type === 'approve' ? 'Approve Return Request' :
                 actionModal.type === 'reject' ? 'Reject Return Request' :
                 'Complete Return & Process Refund'}
              </h3>
              <button className="btn-ghost btn-sm" onClick={closeActionModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid" style={{ gridTemplateColumns: '1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                <div className="detail-item">
                  <span className="label">Request ID</span>
                  <span className="value" style={{ fontFamily: 'monospace' }}>#{actionModal.item?.id?.slice(0, 12)}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Reason</span>
                  <span className="value">{actionModal.item?.reason || '—'}</span>
                </div>
                {actionModal.item?.refund_amount > 0 && (
                  <div className="detail-item">
                    <span className="label">Refund Amount</span>
                    <span className="value" style={{ fontWeight: 700 }}>{formatCurrency(actionModal.item.refund_amount)}</span>
                  </div>
                )}
                {actionModal.item?.return_type && (
                  <div className="detail-item">
                    <span className="label">Requested Type</span>
                    <span className="value">{RETURN_TYPE_LABELS[actionModal.item.return_type] || actionModal.item.return_type}</span>
                  </div>
                )}
                {actionModal.item?.description && (
                  <div className="detail-item">
                    <span className="label">Description</span>
                    <span className="value" style={{ fontSize: '0.82rem' }}>{actionModal.item.description}</span>
                  </div>
                )}
              </div>

              {actionModal.type === 'approve' && (
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label" style={{ marginBottom: '0.35rem' }}>
                    Resolution <span className="required-star" style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <select
                    className="form-input"
                    value={selectedResolution}
                    onChange={e => setSelectedResolution(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    {RESOLUTION_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  {actionModal.item?.return_type && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                      Customer requested: {RETURN_TYPE_LABELS[actionModal.item.return_type] || actionModal.item.return_type}
                    </div>
                  )}
                </div>
              )}

              {actionModal.type !== 'complete' && (
                <div className="form-group">
                  <label className="form-label" style={{ marginBottom: '0.35rem' }}>
                    Admin Response <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>(optional)</span>
                  </label>
                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder={actionModal.type === 'approve' ? 'Approval notes...' : 'Reason for rejection...'}
                    value={adminResponse}
                    onChange={e => setAdminResponse(e.target.value)}
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>
              )}

              {actionModal.type === 'complete' && (
                <div className="admin-alert warning" style={{ marginTop: '0.5rem' }}>
                  <span className="admin-alert-icon">⚠️</span>
                  <div className="admin-alert-body">
                    <div className="admin-alert-title">Confirm Refund</div>
                    <div>This will process the refund. This action cannot be undone.</div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={closeActionModal}>Cancel</button>
              {actionModal.type === 'complete' ? (
                <button className="btn-primary" onClick={handleComplete}>
                  ✓ Confirm & Process Refund
                </button>
              ) : (
                <button
                  className={actionModal.type === 'approve' ? 'btn-primary' : 'btn-danger'}
                  onClick={actionModal.type === 'approve' ? handleApprove : handleReject}
                  disabled={actionModal.type === 'approve' && !selectedResolution}
                >
                  {actionModal.type === 'approve' ? '✓ Approve' : '✕ Reject'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

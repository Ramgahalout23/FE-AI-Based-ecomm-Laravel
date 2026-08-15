import { useState, useEffect } from 'react';
import { paymentsAPI } from '../../api/payments';
import AdminPageShell from '../../components/admin/AdminPageShell';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/formatters';
import { PAYMENT_STATUSES } from '../../utils/constants';
import toast from '../../utils/toast';

export default function PaymentsAdminPage() {
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('payments');
  const [refunds, setRefunds] = useState([]);
  const [detail, setDetail] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [, setTotalPages] = useState(1);
  const [, setTotalItems] = useState(0);
  const [, setPaymentLoading] = useState(false);
  const limit = 10;

  useEffect(() => {
    const load = async (page = 1) => {
      setPaymentLoading(true);
      try {
        const r = await paymentsAPI.getAll({ page, limit });
        // Laravel returns raw paginator: { success: true, data: { data: [...items], current_page, ... } }
        const raw = r.data?.data || r.data || {};
        const list = raw?.data || raw?.payments || raw || [];
        setPayments(Array.isArray(list) ? list : []);
        setCurrentPage(raw.current_page || raw.page || page);
        setTotalPages(raw.last_page || raw.pages || raw.totalPages || Math.ceil((raw.total || list.length) / limit) || 1);
        setTotalItems(raw.total || list.length);
      } catch (e) { setError('Failed to load payments'); console.warn('Failed to load payments:', e); }
      try { const r = await paymentsAPI.getStats(); if (r.data) setStats(r.data?.data || r.data || {}); } catch (e2) { setError(prev => prev || 'Failed to load payment stats'); console.warn('Failed to load payment stats:', e2); }
      setLoading(false);
      setPaymentLoading(false);
    };
    load(currentPage);
  }, [currentPage]);

  const loadRefunds = async () => {
    try {
      // Use admin endpoint instead of user-level endpoint
      const r = await paymentsAPI.getAll();
      const raw = r.data?.data || r.data || [];
      const list = Array.isArray(raw) ? raw.filter(p => p.status === 'REFUNDED' || p.refundStatus) : [];
      setRefunds(list);
    } catch (e) { console.warn('Failed to load refunds:', e); }
  };

  const handleRefund = async (id, action) => {
    try {
      action === 'approve' ? await paymentsAPI.approveRefund(id) : await paymentsAPI.rejectRefund(id);
      setRefunds(refunds.map(r => r.id === id ? { ...r, status: action === 'approve' ? 'APPROVED' : 'REJECTED' } : r));
      toast.success(`Refund ${action}d`);
    } catch { toast.error('Failed'); }
  };

  return (
    <div>
      <AdminPageShell
        title="Payments"
        subtitle="Track transactions and manage refunds"
        loading={loading}
        error={error}
        page="payments"
      >
      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon revenue">💳</div><div className="stat-label">Total Processed</div><div className="stat-val" style={{ color: 'var(--success)' }}>{formatCurrency(stats.totalProcessed || 48900)}</div></div>
        <div className="stat-card"><div className="stat-icon orders">⏳</div><div className="stat-label">Pending</div><div className="stat-val" style={{ color: 'var(--warning)' }}>{formatCurrency(stats.totalPending || 2400)}</div></div>
        <div className="stat-card"><div className="stat-icon alerts">↩️</div><div className="stat-label">Refunded</div><div className="stat-val" style={{ color: 'var(--danger)' }}>{formatCurrency(stats.totalRefunded || 890)}</div></div>
        <div className="stat-card"><div className="stat-icon users">✅</div><div className="stat-label">Success Rate</div><div className="stat-val">{stats.successRate || '98.2'}%</div></div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs-wrap">
        <button className={`admin-tab ${tab === 'payments' ? 'active' : ''}`} onClick={() => setTab('payments')}>Payments</button>
        <button className={`admin-tab ${tab === 'refunds' ? 'active' : ''}`} onClick={() => { setTab('refunds'); loadRefunds(); }}>Refunds</button>
      </div>

      {/* Detail */}
      {detail && (
        <div className="detail-panel">
          <div className="detail-header">
            <h3>Payment #{detail.id?.slice(0, 8)}</h3>
            <button className="btn-ghost btn-sm" onClick={() => setDetail(null)}>✕ Close</button>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span className="label">Payment ID</span><span className="value" style={{ fontFamily: 'monospace' }}>{detail.id}</span></div>
            <div className="detail-item"><span className="label">Order ID</span><span className="value" style={{ fontFamily: 'monospace' }}>{detail.orderId}</span></div>
            <div className="detail-item"><span className="label">Amount</span><span className="value" style={{ fontWeight: 700 }}>{formatCurrency(detail.amount)}</span></div>
            <div className="detail-item"><span className="label">Method</span><span className="value">{detail.method || detail.paymentMethod}</span></div>
            <div className="detail-item"><span className="label">Status</span><span className="value"><span className={`status-badge ${PAYMENT_STATUSES[detail.status]?.class || 'status-pending'}`}>{PAYMENT_STATUSES[detail.status]?.label || detail.status}</span></span></div>
            <div className="detail-item"><span className="label">Transaction ID</span><span className="value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{detail.transactionId || '—'}</span></div>
            <div className="detail-item"><span className="label">Date</span><span className="value">{formatDateTime(detail.createdAt)}</span></div>
          </div>
        </div>
      )}

      {tab === 'payments' ? (
        <div className="table-card">
          <div className="table-head"><h3>All Payments</h3></div>
          <table className="admin-table">
            <thead><tr><th>Payment ID</th><th>Order</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {payments.length === 0 ? (
                <tr><td colSpan={7}><div className="empty-state"><div className="empty-state-icon">💳</div><h3>No payments yet</h3></div></td></tr>
              ) : payments.map(p => (
                <tr key={p.id}>
                  <td><strong style={{ fontFamily: 'monospace' }}>#{p.id?.slice(0, 8)}</strong></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>#{p.orderId?.slice(0, 8)}</td>
                  <td><strong>{formatCurrency(p.amount)}</strong></td>
                  <td>{p.method || p.paymentMethod || '—'}</td>
                  <td><span className={`status-badge ${PAYMENT_STATUSES[p.status]?.class || 'status-pending'}`}>{PAYMENT_STATUSES[p.status]?.label || p.status}</span></td>
                  <td style={{ fontSize: '0.82rem' }}>{formatDate(p.createdAt)}</td>
                  <td><div className="row-actions"><button className="btn-view" onClick={() => setDetail(p)}>View</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-head"><h3>Refund Requests</h3></div>
          <table className="admin-table">
            <thead><tr><th>Refund ID</th><th>Payment</th><th>Amount</th><th>Reason</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {refunds.length === 0 ? (
                <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">↩️</div><h3>No refund requests</h3></div></td></tr>
              ) : refunds.map(r => (
                <tr key={r.id}>
                  <td><strong style={{ fontFamily: 'monospace' }}>#{r.id?.slice(0, 8)}</strong></td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>#{r.paymentId?.slice(0, 8)}</td>
                  <td><strong>{formatCurrency(r.amount)}</strong></td>
                  <td style={{ maxWidth: 200, fontSize: '0.82rem' }}>{r.reason || '—'}</td>
                  <td><span className={`status-badge ${r.status === 'APPROVED' ? 'status-active' : r.status === 'REJECTED' ? 'status-cancelled' : 'status-pending'}`}>{r.status}</span></td>
                  <td>
                    {r.status === 'PENDING' && (
                      <div className="row-actions">
                        <button className="btn-approve" onClick={() => handleRefund(r.id, 'approve')}>Approve</button>
                        <button className="btn-del" onClick={() => handleRefund(r.id, 'reject')}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </AdminPageShell>
    </div>
  );
}

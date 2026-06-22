import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import toast from '../../utils/toast';
import { downloadBlob } from '../../utils/download';
import { useOrderStatusUpdates, useOrderCreated } from '../../hooks/useSocket';

export default function OrdersAdminPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(10);

  // Search debouncing
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: debouncedSearch || undefined,
      };
      const response = await adminAPI.exportOrders(params);
      downloadBlob(response, `orders-export-${new Date().toISOString().slice(0, 10)}.csv`);
      toast.success('Orders exported successfully');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export orders');
    } finally {
      setExporting(false);
    }
  };

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: debouncedSearch || undefined
      };

      const r = await adminAPI.getOrders(params);
      const list = r.data?.data?.orders || r.data?.orders || r.data?.data || [];
      setOrders(Array.isArray(list) ? list : []);

      const pag = r.data?.pagination || r.data?.data?.pagination || {};
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || Math.ceil((pag.total || list.length) / limit) || 1);
      setTotalItems(pag.total || list.length);
    } catch (err) {
      console.error('Failed to load orders:', err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Reset page when search or statusFilter changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      load(1);
    }
  }, [debouncedSearch, statusFilter]);

  // Load when currentPage changes
  useEffect(() => {
    load(currentPage);
  }, [currentPage]);

  // Real-time order updates via WebSocket
  const handleOrderUpdate = useCallback((data) => {
    console.debug('[Realtime] Order update:', data);
    load(currentPage);
    if (data.status) {
      toast(
        `Order ${data.orderNumber || data.orderId?.slice(0, 8)} → ${ORDER_STATUSES[data.status]?.label || data.status}`,
        { icon: '\u{1F504}', duration: 4000 }
      );
    }
  }, [currentPage]);

  useOrderStatusUpdates(handleOrderUpdate, [currentPage]);

  // Handle new order created events — auto-refresh list + show notification
  const handleOrderCreated = useCallback((data) => {
    console.debug('[Realtime] New order:', data);
    load(currentPage);
    toast.success(
      `\u{1F195} New order ${data.orderNumber ? `#${data.orderNumber}` : ''} \u2014 ${formatCurrency(data.summary?.total ?? data.total ?? 0)}`,
      { duration: 6000 }
    );
  }, [currentPage]);

  useOrderCreated(handleOrderCreated, [currentPage]);

  const handleStatus = async (id, status) => {
    try {
      await adminAPI.updateOrderStatus(id, { status });
      setOrders(orders.map(o => o.id === id ? { ...o, status } : o));
      toast.success(`Status updated to ${ORDER_STATUSES[status]?.label || status}`);
      await load(currentPage);
    } catch { toast.error('Failed to update status'); }
  };

  const counts = Object.fromEntries(
    Object.keys(ORDER_STATUSES).map(s => [s, orders.filter(o => o.status === s).length])
  );

  return (
    <div>
      <div className="admin-header"><h2>Orders</h2><p>Track and manage customer orders ({totalItems} total)</p></div>

      {/* Quick Stats */}
      <div className="stats-grid">
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setStatusFilter(statusFilter === status ? 'ALL' : status)}>
            <div className="stat-label">{ORDER_STATUSES[status]?.label || status}</div>
            <div className="stat-val" style={{ color: ({ PENDING: 'var(--warning)', CONFIRMED: 'var(--info)', PROCESSING: 'var(--primary)', SHIPPED: 'var(--info)', DELIVERED: 'var(--success)', CANCELLED: 'var(--danger)', RETURN_REQUESTED: 'var(--warning)', RETURNED: 'var(--danger)' })[status] || 'var(--muted)' }}>{count}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="table-card">
        <div className="table-toolbar">
          <input className="table-search" placeholder="Search by order ID or customer..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="table-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            {Object.keys(ORDER_STATUSES).map(s => <option key={s} value={s}>{ORDER_STATUSES[s].label}</option>)}
          </select>
          <button className="btn-ghost btn-sm" onClick={handleExportCSV} disabled={exporting}>
            {exporting ? 'Exporting...' : '📥 Export CSV'}
          </button>
          <span className="table-count">{totalItems} orders</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loading-page" style={{ padding: '2rem' }}><div className="spinner" /></div></td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">{'\uD83D\uDCCB'}</div><h3>No orders found</h3></div></td></tr>
            ) : orders.map(o => (
              <tr key={o.id}>
                <td><strong style={{ fontFamily: 'monospace' }}>#{o.id?.slice(0, 8)}</strong></td>
                <td>{o.customerName || o.userId || '\u2014'}</td>
                <td><strong>{formatCurrency(o.total || o.totalAmount)}</strong></td>
                <td><span className={`status-badge ${ORDER_STATUSES[o.status]?.class || 'status-pending'}`}>{ORDER_STATUSES[o.status]?.label || o.status}</span></td>
                <td>{formatDate(o.createdAt)}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn-view" onClick={() => navigate(`/admin/orders/${o.id}`)}>View</button>
                    <select className="table-filter" style={{ padding: '0.25rem 0.4rem', fontSize: '0.7rem' }} value={o.status} onChange={e => handleStatus(o.id, e.target.value)}>
                      {Object.keys(ORDER_STATUSES).map(s => <option key={s} value={s}>{ORDER_STATUSES[s].label}</option>)}
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="pagination-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
              Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong> ({totalItems} orders total)
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button 
                className="btn-ghost btn-sm" 
                disabled={currentPage <= 1} 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                style={{ opacity: currentPage <= 1 ? 0.5 : 1, cursor: currentPage <= 1 ? 'not-allowed' : 'pointer' }}
              >
                {'\u25C0'} Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button 
                  key={p} 
                  className={p === currentPage ? "btn-dark btn-sm" : "btn-ghost btn-sm"}
                  onClick={() => setCurrentPage(p)}
                  style={{ minWidth: '32px' }}
                >
                  {p}
                </button>
              ))}
              <button 
                className="btn-ghost btn-sm" 
                disabled={currentPage >= totalPages} 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                style={{ opacity: currentPage >= totalPages ? 0.5 : 1, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next {'\u25B6'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import toast from '../../utils/toast';
import { downloadBlob } from '../../utils/download';
import { useOrderStatusUpdates, useOrderCreated } from '../../hooks/useSocket';
import ExportCSVModal from '../../components/admin/ExportCSVModal';
import Pagination from '../../components/admin/Pagination';
import AdminPageShell from '../../components/admin/AdminPageShell';
import AdminSelect from '../../components/admin/AdminSelect';

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
  const [pageSize, setPageSize] = useState(10);
  const pageSizeOptions = [10, 25, 50, 100];

  // Search debouncing
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // CSV Export state (async job-based)
  const [showExportModal, setShowExportModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [exportError, setExportError] = useState(null);

  // Valid order status transitions (mirrors the backend guard in AdminService).
  // The row dropdown only offers the current status + valid next states, so a
  // pick can never be rejected by the API.
  const STATUS_TRANSITIONS = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: ['RETURNED', 'RETURN_REQUESTED'],
    CANCELLED: [],
    RETURNED: [],
    RETURN_REQUESTED: [],
  };

  const statusOptionsFor = (current) => [
    { value: current, label: ORDER_STATUSES[current]?.label || current },
    ...(STATUS_TRANSITIONS[current] || []).map(s => ({ value: s, label: ORDER_STATUSES[s]?.label || s })),
  ];

  const ORDER_COLUMNS = [
    { key: 'orderNumber', label: 'Order Number' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'email', label: 'Customer Email' },
    { key: 'total', label: 'Total' },
    { key: 'status', label: 'Status' },
    { key: 'paymentMethod', label: 'Payment Method' },
    { key: 'createdAt', label: 'Date' },
  ];

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const handleExportCSV = async (selectedColumns) => {
    setExporting(true);
    setExportStatus('dispatching');
    setExportError(null);
    try {
      const filters = {
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: debouncedSearch || undefined,
      };
      Object.keys(filters).forEach(k => { if (filters[k] === undefined) delete filters[k]; });

      const dispatchRes = await adminAPI.dispatchExport({
        type: 'orders',
        filters,
        columns: selectedColumns,
      });

      const jobId = dispatchRes.data?.data?.id;
      if (!jobId) throw new Error('No job ID returned');

      setExportStatus('processing');

      const poll = async () => {
        try {
          const statusRes = await adminAPI.checkExportStatus(jobId);
          const status = statusRes.data?.data?.status;

          if (status === 'completed') {
            const downloadRes = await adminAPI.downloadExport(jobId);
            const filename = statusRes.data?.data?.file_name || `orders-export-${new Date().toISOString().slice(0, 10)}.csv`;
            downloadBlob(downloadRes, filename);
            setExportStatus('completed');
            toast.success('Orders exported successfully');
            setTimeout(() => {
              setShowExportModal(false);
              setExportStatus(null);
            }, 1500);
          } else if (status === 'failed') {
            throw new Error(statusRes.data?.data?.error_message || 'Export failed');
          } else {
            setTimeout(poll, 1500);
          }
        } catch (pollErr) {
          console.error('Export poll error:', pollErr);
          if (!exportStatus || exportStatus === 'processing') {
            setExportStatus('failed');
            setExportError(pollErr.response?.data?.message || pollErr.message || 'Export failed');
            toast.error('Export failed');
          }
        }
      };

      poll().catch(() => {});
    } catch (err) {
      console.error('Export failed:', err);
      setExportStatus('failed');
      setExportError(err.response?.data?.message || err.message || 'Failed to export orders');
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const load = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        search: debouncedSearch || undefined
      };

      const r = await adminAPI.getOrders(params);
      const list = r.data?.data?.orders || r.data?.orders || r.data?.data || [];
      setOrders(Array.isArray(list) ? list : []);

      const pag = r.data?.pagination || r.data?.data?.pagination || {};
      setCurrentPage(pag.page || page);
      setTotalPages(pag.pages || Math.ceil((pag.total || list.length) / pageSize) || 1);
      setTotalItems(pag.total || list.length);
    } catch (err) {
      console.error('Failed to load orders:', err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  // Reset page when search, statusFilter, or page size changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    } else {
      load(1);
    }
  }, [debouncedSearch, statusFilter, pageSize]);

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
    <AdminPageShell
      title="Orders"
      subtitle={`Track and manage customer orders (${totalItems} total)`}
      loading={loading}
      page="orders"
    >
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
          <AdminSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              ...Object.keys(ORDER_STATUSES).map(s => ({ value: s, label: ORDER_STATUSES[s].label })),
            ]}
            dotClass={(v) => (v === 'ALL' ? null : ORDER_STATUSES[v]?.class)}
            ariaLabel="Filter orders by status"
          />
          <button className="btn-ghost btn-sm" onClick={() => setShowExportModal(true)}>
            📥 Export CSV
          </button>
          <span className="table-count">{totalItems} orders</span>
        </div>
        <table className="admin-table">
          <thead><tr><th>Order ID</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state"><div className="empty-state-icon">{'\uD83D\uDCCB'}</div><h3>No orders found</h3></div></td></tr>
            ) : orders.map(o => (
              <tr key={o.id}>
                <td><strong style={{ fontFamily: 'monospace' }}>#{o.order_number || o.orderNumber || o.id?.slice(0, 8)}</strong></td>
                <td>{o.customerName || o.userId || '\u2014'}</td>
                <td><strong>{formatCurrency(o.total || o.totalAmount)}</strong></td>
                <td><span className={`status-badge ${ORDER_STATUSES[o.status]?.class || 'status-pending'}`}>{ORDER_STATUSES[o.status]?.label || o.status}</span></td>
                <td>{formatDate(o.createdAt)}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn-view" onClick={() => navigate(`/admin/orders/${o.id}`)}>View</button>
                    <AdminSelect
                      size="sm"
                      value={o.status}
                      onChange={(v) => handleStatus(o.id, v)}
                      options={statusOptionsFor(o.status)}
                      dotClass={(v) => ORDER_STATUSES[v]?.class}
                      ariaLabel={`Change status for order ${o.order_number || o.id}`}
                    />
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
          itemLabel="order"
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
          pageSizeOptions={pageSizeOptions}
        />
      </div>

      {/* CSV Export Modal */}
      <ExportCSVModal
        isOpen={showExportModal}
        onClose={() => { setShowExportModal(false); setExportStatus(null); setExportError(null); }}
        columns={ORDER_COLUMNS}
        onExport={handleExportCSV}
        exporting={exporting}
        exportStatus={exportStatus}
        exportError={exportError}
        filename={`orders-export-${new Date().toISOString().slice(0, 10)}.csv`}
      />
    </AdminPageShell>
  );
}

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { ordersAPI } from '../../api/orders';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES, SHIPPING_STATUSES } from '../../utils/constants';
import toast from '../../utils/toast';
import OrderDetailSkeleton from '../../components/ui/OrderDetailSkeleton';

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try { const res = await ordersAPI.getById(id); setOrder(res.data?.data || null); } catch { toast.error('Order not found'); } finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  const handleCancel = async () => {
    try { await ordersAPI.cancel(id); setOrder((o) => ({ ...o, status: 'CANCELLED' })); toast.success('Order cancelled'); } catch { toast.error('Failed to cancel'); }
  };

  if (loading) return <OrderDetailSkeleton />;
  if (!order) return <div className="empty-state"><h3>Order not found</h3></div>;

  const steps = SHIPPING_STATUSES;
  const currentStep = steps.indexOf(order.shippingStatus || 'PENDING');

  return (
    <div className="section">
      <SEOHead
        title={`Order #${id?.slice(0, 8) || id} | Threvolt`}
        description={`View order details and track shipping status for order at Threvolt.`}
        noIndex={true}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'My Orders', href: '/orders' },
            { label: `Order #${order.id?.slice(0, 8) || id}` },
          ]}
          variant="light"
          className="mb-6"
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div><h2 className="section-title">Order #{order.id?.slice(0, 8) || id}</h2><p style={{ color: 'var(--muted)', marginTop: '0.3rem' }}>Placed {formatDate(order.createdAt)}</p></div>
        <span className={`status-badge ${ORDER_STATUSES[order.status]?.class || 'status-pending'}`}>{ORDER_STATUSES[order.status]?.label || order.status}</span>
      </div>

      {/* Timeline — responsive card layout for mobile */}
      <div className="bg-white border border-border rounded-xl p-4 md:p-6 mb-6">
        <h3 className="font-display font-bold text-base md:text-lg text-charcoal mb-4">Order Timeline</h3>
        <div className="space-y-3">
          {steps.map((step, i) => {
            const isCompleted = i <= currentStep;
            return (
              <div key={step} className="flex items-center gap-3 md:gap-4">
                {/* Step circle */}
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center shrink-0 text-xs md:text-sm font-bold transition-all ${
                  isCompleted
                    ? 'bg-charcoal text-white shadow-md'
                    : 'bg-gray-100 text-gray-400 border border-gray-200'
                }`}>
                  {isCompleted ? '✓' : i + 1}
                </div>
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className={`w-px h-8 md:h-10 shrink-0 mx-1 ${
                    i + 1 <= currentStep ? 'bg-charcoal' : 'bg-gray-200'
                  }`} />
                )}
                {/* Step label */}
                <span className={`text-xs md:text-sm font-medium ${
                  isCompleted ? 'text-charcoal' : 'text-gray-400'
                }`}>
                  {step.replace(/_/g, ' ')}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Items */}
      <div className="table-card" style={{ marginBottom: '1.5rem' }}>
        <div className="table-head"><h3>Items</h3></div>
        <table className="admin-table">
          <thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
          <tbody>
            {(order.items || []).map((item, i) => (
              <tr key={i}>
                <td>{item.name || item.productName || `Product ${item.productId}`}</td>
                <td>{item.quantity}</td>
                <td>{formatCurrency(item.price)}</td>
                <td><strong>{formatCurrency(item.price * item.quantity)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>Total: {formatCurrency(order.total || order.totalAmount)}</div>
        {order.status === 'PENDING' && <button className="btn-danger btn-sm" onClick={handleCancel}>Cancel Order</button>}
      </div>
    </div>
  );
}

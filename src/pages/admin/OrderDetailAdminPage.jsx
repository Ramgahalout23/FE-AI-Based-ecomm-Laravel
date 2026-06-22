import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminAPI } from '../../api/admin';
import { formatCurrency, formatDate, formatDateTime, getImageUrl, getProductImage } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import '../../styles/shipping-label.css';
import toast from '../../utils/toast';
import { useOrderStatusUpdates } from '../../hooks/useSocket';

function Code39Barcode({ value }) {
  const code39 = {
    '0': '101001101101', '1': '110100101011', '2': '101100101011', '3': '110110010101',
    '4': '101001101011', '5': '110100110101', '6': '101100110101', '7': '101001011011',
    '8': '110100101101', '9': '101100101101', 'A': '110101001011', 'B': '101101001011',
    'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
    'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
    'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
    'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
    'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
    'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100110110101',
    '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101',
    '$': '100100100101', '/': '100100101001', '+': '100101001001', '%': '101001001001'
  };

  const safeVal = (value || '').replace(/[^0-9A-Z\-\.\ \$\/\+\%]/gi, '').toUpperCase();
  const str = `*${safeVal}*`;
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const pattern = code39[char] || code39[' '];
    result += pattern + '0';
  }

  const barWidth = 2;
  const height = 55;
  const svgWidth = result.length * barWidth;

  const bars = [];
  for (let i = 0; i < result.length; i++) {
    if (result[i] === '1') {
      bars.push(
        <rect key={i} x={i * barWidth} y={0} width={barWidth} height={height} fill="black" />
      );
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      <svg width={svgWidth} height={height} viewBox={`0 0 ${svgWidth} ${height}`} style={{ maxWidth: '100%' }}>
        {bars}
      </svg>
      <span style={{ fontFamily: 'monospace', fontSize: '11px', marginTop: '3px', letterSpacing: '3px', fontWeight: 'bold' }}>
        *{safeVal}*
      </span>
    </div>
  );
}

export default function OrderDetailAdminPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLabel, setShowLabel] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ 'order-info': true, items: true, pricing: true });

  const [labelSettings, setLabelSettings] = useState({
    storeName: 'THREVOLT',
    shippingPickupAddress: 'THREVOLT Warehouse, 456 Industrial Way, Suite A, New York, NY 10002',
    shippingReturnAddress: 'THREVOLT Returns, 123 Fashion Ave, New York, NY 10001',
    shippingQueryMobile: '+1 (555) 019-2834',
    shippingQueryEmail: 'support@threvolt.com',
    shippingLabelNote: 'Thank you for shopping at THREVOLT! For returns, please contact our support email.',
  });

  const toggleSection = (key) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      try {
        const r = await adminAPI.getOrderDetails(id);
        setDetail(r.data?.data || r.data);
      } catch (err) {
        console.error('Failed to load order detail:', err);
        toast.error('Failed to load order details');
        navigate('/admin/orders');
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [id, navigate]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const r = await adminAPI.getSettings();
        const data = r.data?.data || r.data;
        if (data) {
          setLabelSettings(prev => ({ ...prev, ...data }));
        }
      } catch (e) { console.warn('Failed to load label settings:', e); }
    };
    loadSettings();
  }, []);

  // Real-time order updates via WebSocket
  const handleOrderUpdate = useCallback((data) => {
    if (data.orderId === id) {
      adminAPI.getOrderDetails(id).then(r => {
        setDetail(r.data?.data || r.data);
      }).catch(() => {});
      if (data.status) {
        toast(
          `Order ${data.orderNumber || data.orderId?.slice(0, 8)} → ${ORDER_STATUSES[data.status]?.label || data.status}`,
          { icon: '🔄', duration: 4000 }
        );
      }
    }
  }, [id]);

  useOrderStatusUpdates(handleOrderUpdate, [id]);

  const handleStatus = async (status) => {
    if (!detail) return;
    try {
      await adminAPI.updateOrderStatus(detail.id, { status });
      setDetail({ ...detail, status });
      toast.success(`Status updated to ${ORDER_STATUSES[status]?.label || status}`);
    } catch { toast.error('Failed to update status'); }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('shipping-label-printable').innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>Shipping Label - Order #${detail.id?.slice(0, 8)}</title>
          <link rel="stylesheet" href="/shipping-label.css" />
        </head>
        <body>
          <div>${printContent}</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          <\/script>
        </body>
      </html>
    `);
    win.document.close();
  };

  const downloadInvoice = async (orderId, orderNumber) => {
    try {
      const token = localStorage.getItem('authToken');
      const API_BASE = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
      const res = await fetch(`${API_BASE}/orders/${orderId}/invoice`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderNumber || orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Invoice downloaded');
    } catch (err) {
      toast.error('Failed to download invoice');
      console.error('Invoice download error:', err);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '\u2014';
    if (typeof addr === 'string') return addr;
    const parts = [
      `${addr.firstName || ''} ${addr.lastName || ''}`.trim(),
      addr.addressLine1,
      addr.addressLine2,
      `${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}`.trim(),
      addr.country
    ].filter(Boolean);
    return parts.join('\n');
  };

  if (loading) {
    return (
      <div>
        <div className="admin-header"><h2>Order Details</h2></div>
        <div className="loading-page" style={{ minHeight: '40vh' }}><div className="spinner" /></div>
      </div>
    );
  }

  if (!detail) return null;

  const CollapsibleSection = ({ id: sectionId, title, icon, defaultExpanded, children }) => {
    const isExpanded = expandedSections[sectionId] !== undefined ? expandedSections[sectionId] : defaultExpanded;
    return (
      <div className="detail-section" style={{ marginBottom: '0.6rem', background: 'white', borderRadius: '10px', padding: '0 1rem', border: '1px solid var(--border)' }}>
        <div
          onClick={() => toggleSection(sectionId)}
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            cursor: 'pointer', userSelect: 'none',
            padding: '0.75rem 0',
            borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
            transition: 'border-color 0.2s ease'
          }}
        >
          <div className="detail-section-title" style={{ margin: 0, fontSize: '0.85rem' }}>
            {icon} {title}
          </div>
          <span style={{
            fontSize: '0.65rem', color: 'var(--muted)',
            transition: 'transform 0.25s ease',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>
            ▼
          </span>
        </div>
        <div style={{
          overflow: 'hidden',
          maxHeight: isExpanded ? '2000px' : '0',
          opacity: isExpanded ? 1 : 0,
          transition: 'max-height 0.35s ease, opacity 0.25s ease, padding 0.25s ease',
          paddingTop: isExpanded ? '0.75rem' : '0',
          paddingBottom: isExpanded ? '0.75rem' : '0'
        }}>
          {children}
        </div>
      </div>
    );
  };

  const SECTIONS = [
    { id: 'order-info', title: 'Order Info', icon: '📋' },
    { id: 'customer', title: 'Customer', icon: '👤' },
    { id: 'payment', title: 'Payment', icon: '💳' },
    { id: 'pricing', title: 'Pricing', icon: '💰' },
    { id: 'addresses', title: 'Addresses', icon: '📍' },
    { id: 'items', title: 'Items', icon: '📦' },
    { id: 'notes', title: 'Notes', icon: '📝' },
    { id: 'timeline', title: 'Timeline', icon: '📅' },
    { id: 'status', title: 'Status', icon: '🔄' },
  ];

  return (
    <div>
      {/* ── BACK BUTTON + HEADER ── */}
      <div className="admin-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button
          onClick={() => navigate('/admin/orders')}
          style={{
            background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer',
            padding: '0.25rem 0.5rem', borderRadius: '8px', color: 'var(--muted)',
            transition: 'all 0.15s ease', flexShrink: 0
          }}
          onMouseEnter={e => e.target.style.background = '#f3f4f6'}
          onMouseLeave={e => e.target.style.background = 'none'}
          title="Back to Orders"
        >
          ←
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0 }}>
              Order {detail.orderNumber ? `#${detail.orderNumber}` : `#${detail.id?.slice(0, 8)}`}
            </h2>
            <span className={`status-badge ${ORDER_STATUSES[detail.status]?.class || 'status-pending'}`}>
              {ORDER_STATUSES[detail.status]?.label || detail.status}
            </span>
          </div>
          {detail.orderNumber && (
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'monospace' }}>
              ID: {detail.id} · Created {formatDateTime(detail.createdAt)}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button
            className={`btn-sm ${(detail.status === 'PROCESSING' || detail.status === 'SHIPPED') ? 'btn-dark' : 'btn-ghost'}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              opacity: (detail.status === 'PROCESSING' || detail.status === 'SHIPPED') ? 1 : 0.5,
              cursor: (detail.status === 'PROCESSING' || detail.status === 'SHIPPED') ? 'pointer' : 'not-allowed'
            }}
            onClick={() => {
              if (detail.status === 'PROCESSING' || detail.status === 'SHIPPED') setShowLabel(true);
              else toast.error('Labels can only be printed for orders in Processing or Shipped phase.');
            }}
          >
            🏷️ Print Label
          </button>
          <button
            className="btn-dark btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => downloadInvoice(detail.id, detail.orderNumber)}
            title="Download PDF Invoice"
          >
            📄 Invoice
          </button>
        </div>
      </div>

      {detail.orderNumber && (
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: '-0.5rem 0 1.25rem 2.5rem' }}>
          Last updated: {formatDateTime(detail.updatedAt)}
        </p>
      )}

      {/* ── SECTION NAV ── */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1rem',
        padding: '0.5rem 0'
      }}>
        {SECTIONS.filter(s => {
          if (s.id === 'notes') return !!(detail.notes || detail.adminNotes);
          if (s.id === 'items') return detail.items?.length > 0;
          return true;
        }).map(s => (
          <button
            key={s.id}
            onClick={() => {
              if (!expandedSections[s.id]) toggleSection(s.id);
              const el = document.getElementById(`order-section-${s.id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            style={{
              fontSize: '0.72rem', padding: '0.3rem 0.6rem', fontWeight: 500,
              borderRadius: '6px', border: '1px solid var(--border)',
              background: expandedSections[s.id] ? 'var(--primary)' : '#f9fafb',
              color: expandedSections[s.id] ? 'white' : 'var(--text)',
              cursor: 'pointer', transition: 'all 0.15s ease',
              fontFamily: 'inherit'
            }}
          >
            {s.icon} {s.title}
          </button>
        ))}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ maxWidth: '960px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {/* ── ORDER INFO ── */}
        <div id="order-section-order-info">
          <CollapsibleSection id="order-info" title="Order Info" icon="📋" defaultExpanded={true}>
            <div className="detail-grid two-col">
              <div className="detail-item"><span className="label">Order ID</span><span className="value" style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{detail.id}</span></div>
              <div className="detail-item"><span className="label">Order #</span><span className="value" style={{ fontFamily: 'monospace' }}>{detail.orderNumber || '\u2014'}</span></div>
              <div className="detail-item"><span className="label">Created</span><span className="value">{formatDateTime(detail.createdAt)}</span></div>
              <div className="detail-item"><span className="label">Updated</span><span className="value">{formatDateTime(detail.updatedAt)}</span></div>
              <div className="detail-item"><span className="label">Status</span><span className="value"><span className={`status-badge ${ORDER_STATUSES[detail.status]?.class || 'status-pending'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>{ORDER_STATUSES[detail.status]?.label || detail.status}</span></span></div>
            </div>
          </CollapsibleSection>
        </div>

        {/* ── CUSTOMER ── */}
        <div id="order-section-customer">
          <CollapsibleSection id="customer" title="Customer" icon="👤" defaultExpanded={false}>
            <div className="detail-grid two-col">
              <div className="detail-item"><span className="label">Name</span><span className="value">{detail.user ? `${detail.user.firstName || ''} ${detail.user.lastName || ''}`.trim() : detail.customerName || detail.userId || '\u2014'}</span></div>
              <div className="detail-item"><span className="label">Email</span><span className="value">{detail.user?.email || '\u2014'}</span></div>
              <div className="detail-item"><span className="label">Phone</span><span className="value">{detail.user?.phoneNumber || detail.shippingAddress?.phoneNumber || '\u2014'}</span></div>
              <div className="detail-item"><span className="label">User ID</span><span className="value" style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{detail.userId || '\u2014'}</span></div>
            </div>
          </CollapsibleSection>
        </div>

        {/* ── PAYMENT ── */}
        <div id="order-section-payment">
          <CollapsibleSection id="payment" title="Payment" icon="💳" defaultExpanded={false}>
            <div className="detail-grid two-col">
              <div className="detail-item">
                <span className="label">Method</span>
                <span className="value">
                  <span className={`payment-badge-sm ${detail.payment?.method === 'COD' ? 'payment-cod' : 'payment-prepaid'}`}>
                    {detail.payment?.method || detail.paymentMethod || '\u2014'}
                  </span>
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Status</span>
                <span className="value">
                  <span className={`status-badge ${detail.payment?.status === 'COMPLETED' ? 'status-completed' : detail.payment?.status === 'FAILED' ? 'status-failed' : detail.payment?.status === 'REFUNDED' ? 'status-warning' : 'status-pending'}`} style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                    {detail.payment?.status || '\u2014'}
                  </span>
                </span>
              </div>
              <div className="detail-item"><span className="label">Transaction ID</span><span className="value" style={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>{detail.payment?.transactionId || '\u2014'}</span></div>
              <div className="detail-item"><span className="label">Amount</span><span className="value" style={{ fontWeight: 600 }}>{detail.payment?.amount ? formatCurrency(detail.payment.amount) : '\u2014'}</span></div>
              <div className="detail-item"><span className="label">Currency</span><span className="value">{detail.payment?.currency || 'USD'}</span></div>
              <div className="detail-item"><span className="label">Gateway Response</span><span className="value" style={{ fontFamily: 'monospace', fontSize: '0.7rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{detail.payment?.gatewayResponse ? '\u2713 Received' : '\u2014'}</span></div>
            </div>
          </CollapsibleSection>
        </div>

        {/* ── PRICE BREAKDOWN ── */}
        <div id="order-section-pricing">
          <CollapsibleSection id="pricing" title="Pricing" icon="💰" defaultExpanded={true}>
            <div className="price-breakdown">
              <div className="pb-row"><span>Subtotal</span><span>{formatCurrency(detail.subtotal != null ? detail.subtotal : (detail.total ?? 0))}</span></div>
              <div className="pb-row"><span>Tax</span><span>{formatCurrency(detail.tax || 0)}</span></div>
              <div className="pb-row"><span>Shipping Cost</span><span>{formatCurrency(detail.shippingCost || 0)}</span></div>
              <div className="pb-row"><span>Discount</span><span style={{ color: 'var(--success)' }}>-{formatCurrency(detail.discount || 0)}</span></div>
              <div className="pb-row pb-total"><span>Total</span><span>{formatCurrency(detail.total ?? detail.totalAmount ?? 0)}</span></div>
            </div>
            {detail.couponId && <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--muted)' }}>🎟️ Coupon ID: <span style={{ fontFamily: 'monospace' }}>{detail.couponId}</span></div>}
          </CollapsibleSection>
        </div>

        {/* ── ADDRESSES ── */}
        <div id="order-section-addresses">
          <CollapsibleSection id="addresses" title="Addresses" icon="📍" defaultExpanded={false}>
            <div className="addresses-grid">
              <div className="address-card">
                <div className="address-card-title">🚚 Shipping Address</div>
                <div className="address-card-content">{formatAddress(detail.shippingAddress) || '\u2014'}</div>
              </div>
              <div className="address-card">
                <div className="address-card-title">💳 Billing Address</div>
                <div className="address-card-content">{formatAddress(detail.billingAddress || detail.shippingAddress) || '\u2014'}</div>
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* ── ORDER ITEMS ── */}
        {detail.items?.length > 0 && (
          <div id="order-section-items">
            <CollapsibleSection id="items" title={`Items (${detail.items.length})`} icon="📦" defaultExpanded={true}>
              <div className="items-table">
                <div className="items-table-header">
                  <span className="it-col-product">Product</span>
                  <span className="it-col-price">Unit Price</span>
                  <span className="it-col-qty">Qty</span>
                  <span className="it-col-discount">Discount</span>
                  <span className="it-col-total">Total</span>
                </div>
                {detail.items.map((item, i) => {
                  const productName = item.product?.name || item.name || item.productName || `Product #${item.productId?.slice(0, 8)}`;
                  const productSku = item.product?.sku || item.sku || '\u2014';
                  const productImage = getProductImage(item.product);
                  const unitPrice = Number(item.price) || 0;
                  const qty = Number(item.quantity ?? 1);
                  const discount = Number(item.discount) || 0;
                  const itemTotal = item.total != null ? Number(item.total) : (unitPrice * qty) - discount;
                  return (
                    <div key={i} className="items-table-row">
                      <div className="it-col-product">
                        {productImage ? (
                          <img loading="lazy" src={getImageUrl(productImage)} alt={productName} className="it-product-img" />
                        ) : (
                          <div className="it-product-img-placeholder">📦</div>
                        )}
                        <div className="it-product-info">
                          <div className="it-product-name">{productName}</div>
                          <div className="it-product-meta">
                            SKU: <span style={{ fontFamily: 'monospace' }}>{productSku}</span>
                            {item.variantId && <> · Variant: <span style={{ fontFamily: 'monospace' }}>{item.variantId?.slice(0, 8)}</span></>}
                          </div>
                          {item.size && <div className="it-product-meta">Size: {item.size}</div>}
                          {item.color && <div className="it-product-meta">Color: {item.color}</div>}
                        </div>
                      </div>
                      <div className="it-col-price">{formatCurrency(unitPrice)}</div>
                      <div className="it-col-qty">{qty}</div>
                      <div className="it-col-discount">{discount > 0 ? `-${formatCurrency(discount)}` : '\u2014'}</div>
                      <div className="it-col-total"><strong>{formatCurrency(itemTotal)}</strong></div>
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>
          </div>
        )}

        {/* ── NOTES ── */}
        {(detail.notes || detail.adminNotes) && (
          <div id="order-section-notes">
            <CollapsibleSection id="notes" title="Notes" icon="📝" defaultExpanded={false}>
              {detail.notes && (
                <div className="note-block">
                  <div className="note-label">Customer Notes</div>
                  <div className="note-text">{detail.notes}</div>
                </div>
              )}
              {detail.adminNotes && (
                <div className="note-block">
                  <div className="note-label">Admin Notes</div>
                  <div className="note-text">{detail.adminNotes}</div>
                </div>
              )}
            </CollapsibleSection>
          </div>
        )}

        {/* ── TIMELINE ── */}
        <div id="order-section-timeline">
          <CollapsibleSection id="timeline" title="Timeline" icon="📅" defaultExpanded={false}>
            <div className="order-timeline">
              {[
                { status: 'PENDING', label: 'Order Placed', time: detail.createdAt },
                { status: 'CONFIRMED', label: 'Confirmed', time: detail.confirmedAt },
                { status: 'PROCESSING', label: 'Processing', time: detail.processingAt },
                { status: 'SHIPPED', label: 'Shipped', time: detail.shippedAt },
                { status: 'DELIVERED', label: 'Delivered', time: detail.deliveredAt },
                { status: 'CANCELLED', label: 'Cancelled', time: detail.cancelledAt },
                { status: 'RETURN_REQUESTED', label: 'Return Requested', time: detail.returnRequestedAt },
                { status: 'RETURNED', label: 'Returned', time: detail.returnedAt },
              ].filter(s => s.time || s.status === detail.status).map((step, i) => {
                const isActive = step.time;
                const isCurrent = step.status === detail.status;
                const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'RETURN_REQUESTED', 'RETURNED', 'CANCELLED'];
                const stepIndex = statusOrder.indexOf(step.status);
                const currentIndex = statusOrder.indexOf(detail.status);
                const isPast = stepIndex <= currentIndex && isActive;
                return (
                  <div key={step.status} className={`tl-step ${isPast ? 'tl-done' : ''} ${isCurrent ? 'tl-current' : ''}`}>
                    <div className="tl-dot">
                      {isPast ? '\u2713' : isCurrent ? '\u25CF' : '\u25CB'}
                    </div>
                    <div className="tl-content">
                      <div className="tl-status">{step.label}</div>
                      <div className="tl-time">{isActive ? formatDateTime(step.time) : 'Pending'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        </div>

        {/* ── STATUS CHANGE ── */}
        <div id="order-section-status">
          <CollapsibleSection id="status" title="Change Status" icon="🔄" defaultExpanded={false}>
            <div className="status-buttons">
              {Object.keys(ORDER_STATUSES).map(s => (
                <button
                  key={s}
                  className={`btn-sm ${detail.status === s ? 'btn-dark' : 'btn-ghost'}`}
                  style={{ fontSize: '0.72rem' }}
                  onClick={() => handleStatus(s)}
                  disabled={detail.status === s}
                >
                  {ORDER_STATUSES[s].label}
                </button>
              ))}
            </div>
          </CollapsibleSection>
        </div>

        {/* ── BOTTOM BACK LINK ── */}
        <div style={{ marginTop: '1.5rem', padding: '1rem 0', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => navigate('/admin/orders')}
            className="btn-ghost"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            ← Back to All Orders
          </button>
        </div>
      </div>

      {/* ── SHIPPING LABEL MODAL ── */}
      {showLabel && detail && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center',
          alignItems: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '100%', maxWidth: '450px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', background: '#f9fafb'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Shipping Label Preview</h3>
              <button style={{
                background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--muted)'
              }} onClick={() => setShowLabel(false)}>✕</button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '70vh', background: '#f3f4f6', display: 'flex', justifyContent: 'center' }}>
              <div id="shipping-label-printable" className="label-page">
                <div className="label-header">
                  <div className="label-brand">
                    {labelSettings?.shippingLabelLogo ? (
                      <img loading="lazy" src={getImageUrl(labelSettings.shippingLabelLogo)} 
                        alt="Store Logo" 
                        className="label-logo" 
                      />
                    ) : (
                      <>
                        <div className="label-brand-name">{labelSettings?.storeName || 'THREVOLT'}</div>
                        <div className="label-brand-sub">PREMIUM DELIVERY SERVICE</div>
                      </>
                    )}
                  </div>
                  <div className="label-type-badge">SHIPPING LABEL</div>
                </div>
                <div className="address-section">
                  <div className="address-box">
                    <div className="address-label">📍 FROM</div>
                    <div className="address-name--from">{labelSettings?.storeName || 'THREVOLT'}</div>
                    <div className="address-detail--from">{labelSettings?.shippingPickupAddress || '456 Industrial Way, Suite A, New York, NY 10002'}</div>
                  </div>
                  <div className="address-divider" />
                  <div className="address-box">
                    <div className="address-label">🚚 SHIP TO</div>
                    <div className="address-name">{detail.customerName || detail.userId || 'Customer'}</div>
                    <div className="address-detail">{formatAddress(detail.shippingAddress)}</div>
                  </div>
                </div>
                {(detail.billingAddress || detail.shippingAddress) && (
                  <div className="billing-section">
                    <div className="billing-label">💳 BILL TO</div>
                    <div className="billing-name">
                      {detail.billingAddress
                        ? `${detail.billingAddress.firstName || ''} ${detail.billingAddress.lastName || ''}`.trim() || detail.customerName || '\u2014'
                        : detail.customerName || '\u2014'}
                    </div>
                    <div className="billing-detail">{formatAddress(detail.billingAddress || detail.shippingAddress)}</div>
                  </div>
                )}
                {(() => {
                  const isCOD = (detail.payment?.method === 'COD' || detail.paymentMethod === 'COD');
                  return (
                    <>
                      <div className="info-bar">
                        {[
                          { label: 'ORDER #', value: `#${detail.id?.slice(0, 8)}` },
                          { label: 'DATE', value: formatDate(detail.createdAt) },
                          { label: 'PAYMENT', value: detail.payment?.method || detail.paymentMethod || 'PREPAID' },
                          { label: 'TOTAL', value: formatCurrency(detail.total || detail.totalAmount) },
                        ].map((item, idx) => (
                          <div key={idx} className="info-item" style={{ borderRight: idx < 3 ? '1px solid #ddd' : 'none' }}>
                            <div className="info-label">{item.label}</div>
                            {item.label === 'PAYMENT' ? (
                              <div className={`info-value payment-badge ${isCOD ? 'payment-cod' : 'payment-prepaid'}`}>
                                {isCOD ? 'CASH ON DELIVERY' : 'PREPAID ✓'}
                              </div>
                            ) : (
                              <div className="info-value">{item.value}</div>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="payment-collection-badge">
                        {isCOD ? (
                          <div className="cod-collect-badge">
                            <span className="cod-icon">💵</span>
                            <span>COLLECT <strong>{formatCurrency(detail.total || detail.totalAmount)}</strong> ON DELIVERY</span>
                          </div>
                        ) : (
                          <div className="prepaid-badge"><span>✅</span><span>PAID</span></div>
                        )}
                      </div>
                    </>
                  );
                })()}
                {(detail.items?.length > 0) && (
                  <div className="items-section">
                    <div className="items-section-title">ITEMS</div>
                    {detail.items.slice(0, 3).map((item, i) => (
                      <div key={i} className="item-row">
                        <span>{item.name || item.productName || 'Product'} × {item.quantity}</span>
                        <span className="item-price">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    {detail.items.length > 3 && <div className="items-more">+{detail.items.length - 3} more items</div>}
                  </div>
                )}
                <div className="barcode-section">
                  <Code39Barcode value={detail.id || 'ORDER'} />
                  <div className="tracking-label">Tracking: {detail.id?.slice(0, 12).toUpperCase() || 'N/A'}</div>
                </div>
                <div className="footer-section">
                  <div className="footer-box">
                    <div className="footer-title">↩️ RETURN TO</div>
                    <div className="footer-text">{labelSettings?.shippingReturnAddress || 'THREVOLT Returns, 123 Fashion Ave, New York, NY 10001'}</div>
                  </div>
                  <div className="footer-divider" />
                  <div className="footer-box">
                    <div className="footer-title">🛡️ CUSTOMER CARE</div>
                    <div className="footer-text">
                      {labelSettings?.shippingQueryPhone || labelSettings?.shippingQueryMobile || '+1 (555) 019-2834'}<br />
                      {labelSettings?.shippingQueryEmail || 'support@threvolt.com'}
                    </div>
                  </div>
                </div>
                {labelSettings?.shippingLabelNote && (
                  <div className="label-note">{labelSettings.shippingLabelNote}</div>
                )}
              </div>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
              padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: '#f9fafb'
            }}>
              <button className="btn-ghost btn-sm" onClick={() => setShowLabel(false)}>Cancel</button>
              <button className="btn-dark btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={handlePrint}>
                🖨️ Print Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

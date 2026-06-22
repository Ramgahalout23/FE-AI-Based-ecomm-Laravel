import { useState } from 'react';
import { Search, Package, Truck, CheckCircle, Clock } from 'lucide-react';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { ordersAPI } from '../../api/orders';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';

const STATUS_ICONS = {
  PENDING: Clock,
  CONFIRMED: Clock,
  PROCESSING: Package,
  SHIPPED: Truck,
  DELIVERED: CheckCircle,
  CANCELLED: Clock,
  RETURNED: Package,
  RETURN_REQUESTED: Package,
};

const TIMELINE_STEPS = [
  { status: 'ORDER_PLACED', label: 'Order Placed', icon: '📋' },
  { status: 'PROCESSING', label: 'Processing', icon: '⚙️' },
  { status: 'SHIPPED', label: 'Shipped', icon: '🚚' },
  { status: 'DELIVERED', label: 'Delivered', icon: '✅' },
];

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!orderNumber.trim()) return;

    setLoading(true);
    setError('');
    setTracking(null);

    try {
      const res = await ordersAPI.trackByNumber(orderNumber.trim());
      setTracking(res.data?.data || null);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('Order not found. Please check your order number and try again.');
      } else {
        setError('Failed to look up order. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const lastTimelineStatus = tracking?.timeline?.[tracking.timeline.length - 1]?.status || '';

  return (
    <div className="section">
      <SEOHead
        title="Track Your Order | Threvolt"
        description="Track your Threvolt order in real-time. Enter your order number to see shipping status, delivery timeline, and package location."
        noIndex={true}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'Track Order' },
          ]}
          variant="light"
          className="mb-6"
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/20 mb-4">
            <Package size={28} className="text-gold" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-charcoal mb-2">Track Your Order</h1>
          <p className="text-muted text-sm max-w-md mx-auto">
            Enter your order number to see the latest status, shipping details, and estimated delivery.
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleTrack} className="mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Enter order number (e.g. ORD-12345678-ABCD)"
                className="w-full pl-11 pr-4 py-3.5 border border-border rounded-xl text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 transition-all bg-white"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !orderNumber.trim()}
              className="px-6 py-3.5 bg-charcoal text-white rounded-xl font-semibold text-sm hover:bg-charcoal/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-black/5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Searching...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search size={16} />
                  Track
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="p-4 mb-6 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600 flex items-start gap-3">
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {tracking && (
          <div className="space-y-6 animate-fadeIn">
            {/* Status Header */}
            <div className="bg-white border border-border rounded-xl p-6 md:p-8">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Order Number</p>
                  <h2 className="text-xl font-bold text-charcoal font-mono">{tracking.orderNumber}</h2>
                </div>
                <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                  ORDER_STATUSES[tracking.status]?.class || 'bg-gray-100 text-gray-600'
                }`}>
                  {ORDER_STATUSES[tracking.status]?.label || tracking.status}
                </span>
              </div>

              {/* Timeline */}
              <div className="mt-8">
                <div className="flex items-start justify-between">
                  {TIMELINE_STEPS.map((step, i) => {
                    const isReached = tracking.timeline?.some(t => t.status === step.status);
                    const isCurrent = tracking.status === 'DELIVERED'
                      ? step.status === 'DELIVERED'
                      : (tracking.timeline?.length || 0) > 0 && i === (tracking.timeline?.length || 1) - 1;

                    return (
                      <div key={step.status} className="flex flex-col items-center flex-1 relative">
                        {/* Connector line */}
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className={`absolute top-4 left-[calc(50%+14px)] right-[calc(50%-50%)] h-0.5 ${
                            isReached ? 'bg-gold' : 'bg-border'
                          }`} />
                        )}
                        {/* Circle */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm relative z-10 transition-all ${
                          isReached
                            ? 'bg-gold text-charcoal shadow-md shadow-gold/20'
                            : 'bg-off-white text-muted border border-border'
                        }`}>
                          {isReached ? '✓' : step.icon}
                        </div>
                        {/* Label */}
                        <span className={`text-xs mt-2 text-center font-medium ${
                          isReached ? 'text-charcoal' : 'text-muted'
                        }`}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Timeline Dates */}
              {tracking.timeline?.length > 0 && (
                <div className="mt-6 space-y-2 border-t border-border pt-4">
                  {tracking.timeline.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-6 h-6 rounded-full bg-gold/10 text-gold flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {i + 1}
                      </span>
                      <span className="text-muted">{t.description}</span>
                      <span className="text-xs text-muted ml-auto">{formatDate(t.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order Summary */}
            <div className="bg-white border border-border rounded-xl p-6 md:p-8">
              <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider mb-4">Order Summary</h3>

              {/* Items */}
              <div className="space-y-3 mb-4">
                {tracking.items?.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    {item.imageUrl ? (
                      <img loading="lazy" src={item.imageUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover bg-off-white flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-off-white flex items-center justify-center text-muted text-xs flex-shrink-0">
                        📦
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-charcoal truncate">{item.name}</p>
                      <p className="text-xs text-muted">Qty: {item.quantity} × {formatCurrency(item.price)}</p>
                    </div>
                    <span className="text-sm font-semibold text-charcoal">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <span className="text-sm font-semibold text-charcoal">Total</span>
                <span className="text-lg font-bold text-charcoal">{formatCurrency(tracking.total)}</span>
              </div>
            </div>

            {/* Shipping Info */}
            {(tracking.trackingNumber || tracking.estimatedDelivery) && (
              <div className="bg-white border border-border rounded-xl p-6 md:p-8">
                <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider mb-4">Shipping Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {tracking.carrier && tracking.trackingNumber && (
                    <div className="p-3 bg-off-white rounded-lg">
                      <p className="text-xs text-muted mb-1">Carrier</p>
                      <p className="text-sm font-semibold text-charcoal">{tracking.carrier}</p>
                      <p className="text-xs text-muted mt-1">Tracking: {tracking.trackingNumber}</p>
                    </div>
                  )}
                  {tracking.estimatedDelivery && (
                    <div className="p-3 bg-off-white rounded-lg">
                      <p className="text-xs text-muted mb-1">Estimated Delivery</p>
                      <p className="text-sm font-semibold text-charcoal">{tracking.estimatedDelivery}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Help */}
            <div className="text-center py-4">
              <p className="text-sm text-muted">
                Need help with your order?{' '}
                <a href="/contact" className="text-gold font-semibold hover:underline">Contact Support</a>
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!tracking && !error && !loading && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4 opacity-30">🔍</div>
            <p className="text-muted text-sm">
              Enter your order number above to track your package
            </p>
            <p className="text-xs text-muted mt-2">
              Your order number can be found in your order confirmation email
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import { Search } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import SEOHead from '../../components/seo/SEOHead';
import { withStoreName } from '../../utils/seo';
import ContentPageHero from '../../components/storefront/ContentPageHero';
import ContentMarquee from '../../components/storefront/ContentMarquee';
import { useSettings } from '../../store/useSettings';
import { ordersAPI } from '../../api/orders';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';

const TIMELINE_STEPS = [
  { status: 'ORDER_PLACED', label: 'Order Placed', icon: '📋' },
  { status: 'PROCESSING', label: 'Processing', icon: '⚙️' },
  { status: 'SHIPPED', label: 'Shipped', icon: '🚚' },
  { status: 'DELIVERED', label: 'Delivered', icon: '✅' },
];

export default function TrackOrderPage() {
  const { t } = useTranslation();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
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
        setError(t('track.order_not_found'));
      } else {
        setError(t('track.error_lookup'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content bg-white">
      <SEOHead
        title={withStoreName('Track Your Order', storeName)}
        description={`Track your ${storeName} order in real-time. Enter your order number to see shipping status, delivery timeline, and package location.`}
        noIndex={true}
      />

      {/* Premium editorial hero — same family as About/Contact/Size Guide */}
      <ContentPageHero
        watermark={t('track.watermark', { defaultValue: 'TRACK' })}
        eyebrow={t('track.eyebrow', { defaultValue: 'Order Status' })}
        title={t('track.title')}
        description={t('track.hero_desc')}
        breadcrumb={[
          { label: t('nav.home'), href: '/' },
          { label: t('track.title') },
        ]}
      />
      <ContentMarquee
        items={[
          t('track.marquee_1', { defaultValue: 'Real-Time Tracking' }),
          t('track.marquee_2', { defaultValue: 'No Login Required' }),
          t('track.marquee_3', { defaultValue: 'SMS & Email Updates' }),
        ]}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 pb-28 sm:pb-14">
        {/* Search Form */}
        <form onSubmit={handleTrack} className="mb-8">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder={t('track.search_placeholder', { defaultValue: 'Enter order number (e.g. ORD-123456)' })}
                className="w-full pl-11 pr-4 py-3.5 border border-border rounded-xl text-sm focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 transition-all bg-white"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !orderNumber.trim()}
              className="w-full sm:w-auto px-8 py-3.5 bg-charcoal text-white rounded-xl font-semibold text-sm hover:bg-charcoal/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-black/5"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {t('track.searching', { defaultValue: 'Tracking…' })}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search size={16} />
                  {t('track.track_btn', { defaultValue: 'Track Order' })}
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
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">{t('track.order_number')}</p>
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

                    return (
                      <div key={step.status} className="flex flex-col items-center flex-1 relative">
                        {/* Connector line */}
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className={`absolute top-4 left-[calc(50%+16px)] w-[calc(100%-32px)] h-0.5 ${
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
              <h3 className="text-sm font-bold text-charcoal uppercase tracking-wider mb-4">{t('checkout.order_summary')}</h3>

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
                <span className="text-sm font-semibold text-charcoal">{t('checkout.total')}</span>
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
                {t('track.need_help')}{' '}
                <a href="/contact" className="text-gold font-semibold hover:underline">{t('track.contact_support')}</a>
              </p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!tracking && !error && !loading && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4 opacity-30">🔍</div>
            <p className="text-muted text-sm">
              {t('track.enter_order_number')}
            </p>
            <p className="text-xs text-muted mt-2">
              {t('track.order_number_hint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

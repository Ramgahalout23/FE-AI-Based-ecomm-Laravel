import { Star, Bell, Mail, Phone, CheckCircle } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

;
import { motion, AnimatePresence } from 'framer-motion';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { ordersAPI } from '../../api/orders';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES, SHIPPING_STATUSES } from '../../utils/constants';
import { useSettings } from '../../store/useSettings';
import toast from '../../utils/toast';
import OrderDetailSkeleton from '../../components/ui/OrderDetailSkeleton';
import ReviewFormModal from '../../components/product/ReviewFormModal';

export default function OrderDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState({ open: false, productId: '', productName: '' });

  // ── Order Subscription State ──
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);
  const [subEmail, setSubEmail] = useState('');
  const [subPhone, setSubPhone] = useState('');
  const [subEmailUpdates, setSubEmailUpdates] = useState(true);
  const [subSmsUpdates, setSubSmsUpdates] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await ordersAPI.getById(id);
        setOrder(res.data?.data || null);
      } catch (err) {
        const status = err?.response?.status;
        const serverMsg = err?.response?.data?.error?.message || err?.response?.data?.message || '';

        if (status === 404) {
          toast.error(t('orders.detail.not_found'));
        } else if (status === 403) {
          toast.error(t('orders.detail.forbidden', { defaultValue: 'You do not have permission to view this order' }));
        } else if (status === 401) {
          toast.error(t('orders.detail.login_required', { defaultValue: 'Please log in to view this order' }));
        } else if (status >= 500) {
          toast.error(serverMsg || t('orders.detail.server_error', { defaultValue: 'Server error. Please try again later.' }));
        } else {
          toast.error(serverMsg || t('orders.detail.not_found'));
        }

        // Log the full error for debugging
        console.warn('[OrderDetailPage] Failed to fetch order:', { id, status, message: serverMsg || err.message });
      } finally { setLoading(false); }
    };
    fetch();
  }, [id]);

  const handleCancel = async () => {
    try { await ordersAPI.cancel(id); setOrder((o) => ({ ...o, status: 'CANCELLED' })); toast.success(t('orders.detail.order_cancelled')); } catch { toast.error(t('orders.detail.failed_cancel')); }
  };

  const handleReviewSubmitted = useCallback(() => {
    toast.success(t('orders.detail.review_submitted'));
  }, []);

  const isDelivered = order?.status === 'DELIVERED' || order?.status === 'COMPLETED';

  if (loading) return <OrderDetailSkeleton />;
  if (!order) return (
    <div className="section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="empty-state">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <h3 className="font-display text-lg font-bold text-gray-900 mb-2">{t('orders.detail.not_found')}</h3>
          <p className="text-sm text-gray-500 mb-6">{t('orders.detail.not_found_desc', { defaultValue: 'We couldn\'t find this order. It may have been removed or you may not have access.' })}</p>
          <button
            onClick={() => navigate('/orders')}
            className="px-5 py-2.5 rounded-xl bg-charcoal text-white text-sm font-bold hover:bg-charcoal/90 transition-all duration-200 inline-flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            {t('orders.back_to_orders', { defaultValue: 'Back to Orders' })}
          </button>
        </div>
      </div>
    </div>
  );

  const steps = SHIPPING_STATUSES;
  const currentStep = steps.indexOf(order.shippingStatus || 'PENDING');

  return (
    <div className="section">
      <SEOHead
        title={`Order #${id?.slice(0, 8) || id} | ${storeName}`}
        description={`View order details and track shipping status for order at ${storeName}.`}
        noIndex={true}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <Breadcrumb
          items={[
            { label: t('nav.home'), href: '/' },
            { label: t('profile.title'), href: '/profile' },
            { label: t('orders.title'), href: '/orders' },
            { label: `#${order.id?.slice(0, 8) || id}` },
          ]}
          variant="light"
          className="mb-6"
        />
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div><h2 className="section-title">#{order.id?.slice(0, 8) || id}</h2><p style={{ color: 'var(--muted)', marginTop: '0.3rem' }}>{t('orders.detail.placed', { date: formatDate(order.createdAt) })}</p></div>
          <span className={`status-badge ${ORDER_STATUSES[order.status]?.class || 'status-pending'}`}>{ORDER_STATUSES[order.status]?.label || order.status}</span>
        </div>

        {/* Timeline — responsive card layout for mobile */}
        <div className="bg-white border border-border rounded-xl p-4 md:p-6 mb-6">
          <h3 className="font-display font-bold text-base md:text-lg text-charcoal mb-4">{t('orders.detail.order_timeline')}</h3>
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
          <div className="table-head"><h3>{t('orders.detail.items')}</h3></div>
          <table className="admin-table">
            <thead><tr><th>{t('orders.detail.product')}</th><th>{t('orders.detail.qty')}</th><th>{t('orders.detail.price')}</th><th>{t('cart.total')}</th>{isDelivered && <th>{t('orders.review')}</th>}</tr></thead>
            <tbody>
              {(order.items || []).map((item, i) => (
                <tr key={i}>
                  <td>
                    <div className="flex items-center gap-2">
                      <span>{item.name || item.productName || `Product ${item.productId}`}</span>
                    </div>
                  </td>
                  <td>{item.quantity}</td>
                  <td>{formatCurrency(item.price)}</td>
                  <td><strong>{formatCurrency(item.price * item.quantity)}</strong></td>
                  {isDelivered && (
                    <td>
                      <button
                        onClick={() => setReviewModal({
                          open: true,
                          productId: item.productId,
                          productName: item.name || item.productName || 'Product',
                        })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-100 hover:border-amber-300 transition-all duration-200 active:scale-95"
                      >
                        <Star size={12} />
                        {t('orders.write_review')}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {order.notes && (
          <div className="bg-white border border-border rounded-xl p-4 md:p-6 mb-6" style={{ background: '#fffbeb', borderColor: '#fde68a' }}>
            <h3 className="font-display font-bold text-sm md:text-base text-amber-800 mb-2 flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#d97706' }}>
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Additional Comments
            </h3>
            <p className="text-sm text-amber-700 leading-relaxed whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 600 }}>{t('checkout.total')}: {formatCurrency(order.total || order.totalAmount)}</div>
          {order.status === 'PENDING' && <button className="btn-danger btn-sm" onClick={handleCancel}>{t('orders.detail.cancel_order')}</button>}
        </div>

        {/* ── Order Updates Subscription ── */}
        <div className="bg-white border border-border rounded-xl p-4 md:p-6 mt-6">
          <button
            onClick={() => setSubscriptionOpen(!subscriptionOpen)}
            className="flex items-center justify-between w-full text-left"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${subscribed ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                {subscribed ? <Check size={20} Circle /> : <Bell size={20} />}
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-charcoal">
                  {t('orders.detail.subscription_title')}
                </h3>
                <p className="text-xs md:text-sm text-muted mt-0.5">
                  {subscribed
                    ? t('orders.detail.subscription_active')
                    : t('orders.detail.subscription_desc')}
                </p>
              </div>
            </div>
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${subscriptionOpen ? 'rotate-180' : ''}`}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          <AnimatePresence initial={false}>
            {subscriptionOpen && !subscribed && (
              <motion.div
                key="subscription-form"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <div className="pt-4 border-t border-border mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Email */}
                    <div>
                      <label className="block text-xs font-bold text-charcoal mb-1.5 uppercase tracking-wider">
                        <Mail size={12} />
                        {t('checkout.email')}
                      </label>
                      <input
                        type="email"
                        value={subEmail}
                        onChange={(e) => setSubEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal transition-all"
                      />
                    </div>
                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold text-charcoal mb-1.5 uppercase tracking-wider">
                        <Phone size={12} />
                        {t('checkout.phone')}
                      </label>
                      <input
                        type="tel"
                        value={subPhone}
                        onChange={(e) => setSubPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-border text-sm focus:outline-none focus:ring-2 focus:ring-charcoal/20 focus:border-charcoal transition-all"
                      />
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={subEmailUpdates}
                        onChange={() => setSubEmailUpdates(!subEmailUpdates)}
                        className="w-4 h-4 rounded border-gray-300 text-charcoal focus:ring-charcoal/30"
                      />
                      <span className="text-sm font-medium text-charcoal group-hover:text-charcoal/80 transition-colors">
                        {t('orders.detail.email_updates')}
                      </span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={subSmsUpdates}
                        onChange={() => setSubSmsUpdates(!subSmsUpdates)}
                        className="w-4 h-4 rounded border-gray-300 text-charcoal focus:ring-charcoal/30"
                      />
                      <span className="text-sm font-medium text-charcoal group-hover:text-charcoal/80 transition-colors">
                        {t('orders.detail.sms_updates')}
                      </span>
                    </label>
                  </div>

                  <button
                    onClick={async () => {
                      if (!subEmail && !subPhone) { toast.error(t('orders.detail.subscription_required')); return; }
                      setSubscribing(true);
                      try {
                        await ordersAPI.subscribeUpdates(id, {
                          email: subEmail || null,
                          phone: subPhone || null,
                          email_updates: subEmailUpdates,
                          sms_updates: subSmsUpdates,
                        });
                        setSubscribed(true);
                        setSubscriptionOpen(false);
                        toast.success(t('orders.detail.subscribed_success'));
                      } catch {
                        toast.error(t('orders.detail.subscribed_failed'));
                      } finally {
                        setSubscribing(false);
                      }
                    }}
                    disabled={subscribing}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-charcoal text-white text-sm font-bold hover:bg-charcoal/90 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 inline-flex items-center justify-center gap-2"
                  >
                    {subscribing ? (
                      <><div className="spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Subscribing...</>
                    ) : (
                      <><Bell size={14} /> {t('orders.detail.subscribe_btn')}</>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {subscribed && (
            <div className="flex items-center gap-2.5 pt-4 border-t border-border mt-4">
              <span className="text-sm font-medium text-emerald-700">
                {subEmail && `${t('checkout.email')}: ${subEmail}`}
                {subEmail && subPhone && ' — '}
                {subPhone && `${t('checkout.phone')}: ${subPhone}`}
              </span>
              <button
                onClick={() => {
                  setSubscribed(false);
                  setSubscriptionOpen(true);
                }}
                className="text-xs font-bold text-charcoal underline-offset-2 hover:underline ml-auto"
              >
                {t('common.edit')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Review Form Modal */}
      <ReviewFormModal
        isOpen={reviewModal.open}
        onClose={() => setReviewModal({ open: false, productId: '', productName: '' })}
        productId={reviewModal.productId}
        productName={reviewModal.productName}
        orderId={id}
        onSuccess={handleReviewSubmitted}
      />
    </div>
  );
}

import { ChevronRight, Star, Package } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

;
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { ordersAPI } from '../../api/orders';
import { useSettings } from '../../store/useSettings';
import { formatCurrency, formatDate, getImageUrl } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import OrderListSkeleton from '../../components/ui/OrderListSkeleton';
import ReviewFormModal from '../../components/product/ReviewFormModal';
import toast from '../../utils/toast';

export default function OrdersPage() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');
  const [reviewModal, setReviewModal] = useState({ open: false, productId: '', productName: '', orderId: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await ordersAPI.getUserOrders();
        const raw = res.data?.data?.orders || res.data?.data || [];
        setOrders(Array.isArray(raw) ? raw : []);
      } catch (e) {
        console.warn('Failed to load orders:', e);
        setOrders([]);
      } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const handleReviewSubmitted = useCallback(() => {
    toast.success(t('orders.detail.review_submitted'));
  }, []);

  if (loading) return <OrderListSkeleton />;

  return (
    <div className="page-content bg-white flex-1">
      <SEOHead
        title={`My Orders | ${storeName}`}
        description={`Track and manage your orders at ${storeName}. View order history, check shipping status, and manage returns.`}
        noIndex={true}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <Breadcrumb
          items={[
            { label: t('nav.home'), href: '/' },
            { label: t('orders.title') },
          ]}
          variant="light"
          className="mb-4"
        />
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{t('orders.your')}</span>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">{t('orders.title')}</h1>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={32} />
            </div>
            <h3 className="font-display text-lg font-bold text-gray-900 mb-2">{t('orders.no_orders')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('orders.no_orders_desc')}</p>
            <button
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors"
              onClick={() => navigate('/products')}
            >
              {t('orders.shop_now')} <ChevronRight size={16} />
            </button>
          </div>
        ) : (
          <>
            {/* Mobile: Card Layout */}
            <div className="space-y-3 md:hidden">
              {orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => navigate(`/orders/${o.id}`)}
                  className="w-full text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-xs text-gray-400 font-medium">{t('orders.order_id')}</p>
                      <p className="font-bold text-gray-900 text-sm font-mono">#{o.id?.slice(0, 8) || o.orderId}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      ORDER_STATUSES[o.status]?.class || 'bg-gray-100 text-gray-600'
                    }`}>
                      {ORDER_STATUSES[o.status]?.label || o.status}
                    </span>
                  </div>

                  {/* Product thumbnails */}
                  {o.items?.length > 0 && (
                    <div className="flex items-center gap-1.5 mb-2.5">
                      {o.items.slice(0, 3).map((item, idx) => (
                        item.imageUrl ? (
                          <div key={idx} className="w-10 h-10 rounded-lg overflow-hidden border border-gray-100 shrink-0 group/thumb">
                            <img loading="lazy" src={getImageUrl(item.imageUrl)} alt={item.name || item.productName}
                              title={item.name || item.productName}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          </div>
                        ) : (
                          <div key={idx} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-sm shrink-0 border border-gray-100" title={item.name || item.productName}>
                            📦
                          </div>
                        )
                      ))}
                      {o.items.length > 3 && (
                        <span className="text-[10px] font-medium text-gray-400 ml-0.5">+{o.items.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-500 text-xs">{formatDate(o.createdAt)}</span>
                      <span className="text-gray-500 text-xs">{o.items?.length || o.itemCount || '—'} {t('orders.items')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{formatCurrency(o.total || o.totalAmount)}</span>
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('orders.order_id')}</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('orders.date')}</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('orders.items')}</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('orders.total')}</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('orders.status')}</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('orders.review')}</th>
                    <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t('orders.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const isDelivered = o.status === 'DELIVERED' || o.status === 'COMPLETED';
                    return (
                      <tr
                        key={o.id}
                        className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer last:border-b-0"
                      >
                        <td className="px-6 py-4" onClick={() => navigate(`/orders/${o.id}`)}>
                          <strong className="text-sm font-mono text-gray-900">#{o.id?.slice(0, 8) || o.orderId}</strong>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600" onClick={() => navigate(`/orders/${o.id}`)}>{formatDate(o.createdAt)}</td>
                        <td className="px-6 py-4" onClick={() => navigate(`/orders/${o.id}`)}>
                          <div className="flex items-center gap-2">
                            {/* Product thumbnails */}
                            {o.items?.length > 0 ? (
                              <div className="flex items-center -space-x-1.5">
                                {o.items.slice(0, 3).map((item, idx) => (
                                  <div
                                    key={idx}
                                    className="w-8 h-8 rounded-md overflow-hidden border-2 border-white shadow-sm shrink-0"
                                    style={{ zIndex: 3 - idx }}
                                  >
                                    {item.imageUrl ? (
                                      <img loading="lazy" src={getImageUrl(item.imageUrl)}
                                        alt={item.name || item.productName}
                                        title={item.name || item.productName}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.target.style.display = 'none'; }}
                                      />
                                    ) : (
                                      <div className="w-full h-full bg-gray-100 flex items-center justify-center text-xs" title={item.name || item.productName}>📦</div>
                                    )}
                                  </div>
                                ))}
                                {o.items.length > 3 && (
                                  <span className="text-[10px] font-medium text-gray-400 ml-1.5">+{o.items.length - 3}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-300">—</span>
                            )}
                            <span className="text-sm text-gray-600">{o.items?.length || '—'} item{o.items?.length !== 1 ? 's' : ''}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4" onClick={() => navigate(`/orders/${o.id}`)}>
                          <strong className="text-sm text-gray-900">{formatCurrency(o.total || o.totalAmount)}</strong>
                        </td>
                        <td className="px-6 py-4" onClick={() => navigate(`/orders/${o.id}`)}>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            ORDER_STATUSES[o.status]?.class || 'bg-gray-100 text-gray-600'
                          }`}>
                            {ORDER_STATUSES[o.status]?.label || o.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isDelivered ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const firstItem = o.items?.[0];
                                setReviewModal({
                                  open: true,
                                  productId: firstItem?.productId || firstItem?.id || o.id,
                                  productName: firstItem?.name || firstItem?.productName || 'Product',
                                  orderId: o.id,
                                });
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-semibold hover:bg-amber-100 hover:border-amber-300 transition-all duration-200 active:scale-95"
                            >
                              <Star size={10} />
                              Review
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-300 font-medium">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={() => navigate(`/orders/${o.id}`)}>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                            {t('orders.view')} <ChevronRight size={14} />
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Review Form Modal */}
      <ReviewFormModal
        isOpen={reviewModal.open}
        onClose={() => setReviewModal({ open: false, productId: '', productName: '', orderId: '' })}
        productId={reviewModal.productId}
        productName={reviewModal.productName}
        orderId={reviewModal.orderId}
        onSuccess={handleReviewSubmitted}
      />
    </div>
  );
}

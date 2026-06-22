import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Package } from 'lucide-react';
import SEOHead from '../../components/seo/SEOHead';
import Breadcrumb from '../../components/common/Breadcrumb';
import { ordersAPI } from '../../api/orders';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';
import OrderListSkeleton from '../../components/ui/OrderListSkeleton';

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
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

  if (loading) return <OrderListSkeleton />;

  return (
    <div className="page-content bg-white flex-1">
      <SEOHead
        title="My Orders | Threvolt"
        description="Track and manage your orders at Threvolt. View order history, check shipping status, and manage returns."
        noIndex={true}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <Breadcrumb
          items={[
            { label: 'Home', href: '/' },
            { label: 'My Orders' },
          ]}
          variant="light"
          className="mb-4"
        />
        <div className="flex items-center justify-between mb-6">
          <div>
            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Your</span>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight">Orders</h1>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={32} className="text-gray-400" />
            </div>
            <h3 className="font-display text-lg font-bold text-gray-900 mb-2">No orders yet</h3>
            <p className="text-sm text-gray-500 mb-6">Start shopping to see your orders here</p>
            <button
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 transition-colors"
              onClick={() => navigate('/products')}
            >
              Shop Now <ChevronRight size={16} />
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
                      <p className="text-xs text-gray-400 font-medium">Order ID</p>
                      <p className="font-bold text-gray-900 text-sm font-mono">#{o.id?.slice(0, 8) || o.orderId}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      ORDER_STATUSES[o.status]?.class || 'bg-gray-100 text-gray-600'
                    }`}>
                      {ORDER_STATUSES[o.status]?.label || o.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-gray-500 text-xs">{formatDate(o.createdAt)}</span>
                      <span className="text-gray-500 text-xs">{o.items?.length || o.itemCount || '—'} items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{formatCurrency(o.total || o.totalAmount)}</span>
                      <ChevronRight size={16} className="text-gray-300" />
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
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Items</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="text-left px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => navigate(`/orders/${o.id}`)}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer last:border-b-0"
                    >
                      <td className="px-6 py-4">
                        <strong className="text-sm font-mono text-gray-900">#{o.id?.slice(0, 8) || o.orderId}</strong>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{formatDate(o.createdAt)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{o.items?.length || o.itemCount || '—'} items</td>
                      <td className="px-6 py-4">
                        <strong className="text-sm text-gray-900">{formatCurrency(o.total || o.totalAmount)}</strong>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          ORDER_STATUSES[o.status]?.class || 'bg-gray-100 text-gray-600'
                        }`}>
                          {ORDER_STATUSES[o.status]?.label || o.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-gray-900 transition-colors">
                          View <ChevronRight size={14} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

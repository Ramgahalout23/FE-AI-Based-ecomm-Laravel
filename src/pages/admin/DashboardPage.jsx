import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend, CartesianGrid } from 'recharts';
import { adminAPI } from '../../api/admin';
import { analyticsAPI } from '../../api/analytics';
import { inventoryAPI } from '../../api/inventory';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import DateRangePicker, { getDateParams, getDefaultDateRange } from '../../components/common/DateRangePicker';
import RefreshControls from '../../components/common/RefreshControls';
import useDashboardCache from '../../hooks/useDashboardCache';
import useInterval from '../../hooks/useInterval';

const PIE_COLORS = ['#1a1a1a', '#22c55e', '#888888', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];
const CHART_COLORS = ['#C9A96E', '#27AE60', '#2980B9', '#E74C3C', '#8E44AD', '#F39C12', '#1ABC9C'];

// Initial state defaults
const DASHBOARD_INITIAL = {
  metrics: { totalRevenue: 0, ordersToday: 0, activeUsers: 0, pendingReviews: 0, lowStockCount: 0, totalOrders: 0, newUsers: 0, avgOrderValue: 0, revenueChangePercent: 0, ordersChangePercent: 0 },
  health: null,
  logs: [],
  liveOrders: [],
  alerts: [],
  orderStatus: [{ name: 'No Orders', value: 100 }],
  topProducts: [],
};

export default function DashboardPage() {
  const navigate = useNavigate();
  const cache = useDashboardCache(10);
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [metrics, setMetrics] = useState(DASHBOARD_INITIAL.metrics);
  const [health, setHealth] = useState(DASHBOARD_INITIAL.health);
  const [logs, setLogs] = useState(DASHBOARD_INITIAL.logs);
  const [liveOrders, setLiveOrders] = useState(DASHBOARD_INITIAL.liveOrders);
  const [alerts, setAlerts] = useState(DASHBOARD_INITIAL.alerts);
  const [orderStatus, setOrderStatus] = useState(DASHBOARD_INITIAL.orderStatus);
  const [topProducts, setTopProducts] = useState(DASHBOARD_INITIAL.topProducts);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  // New state for advanced charts
  const [revenueComparison, setRevenueComparison] = useState(null);
  const [customerGrowth, setCustomerGrowth] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [conversionMetrics, setConversionMetrics] = useState(null);
  const [dailySales, setDailySales] = useState([]);
  const [reviewAnalytics, setReviewAnalytics] = useState(null);
  const [apiErrors, setApiErrors] = useState([]);

  const restoreState = useCallback((snapshot) => {
    setMetrics(snapshot.metrics);
    setHealth(snapshot.health);
    setLogs(snapshot.logs);
    setLiveOrders(snapshot.liveOrders);
    setAlerts(snapshot.alerts);
    setOrderStatus(snapshot.orderStatus);
    setTopProducts(snapshot.topProducts);
    if (snapshot.revenueComparison) setRevenueComparison(snapshot.revenueComparison);
    if (snapshot.customerGrowth) setCustomerGrowth(snapshot.customerGrowth);
    if (snapshot.hourlyData) setHourlyData(snapshot.hourlyData);
    if (snapshot.paymentMethods) setPaymentMethods(snapshot.paymentMethods);
    if (snapshot.conversionMetrics) setConversionMetrics(snapshot.conversionMetrics);
    if (snapshot.dailySales) setDailySales(snapshot.dailySales);
    if (snapshot.reviewAnalytics) setReviewAnalytics(snapshot.reviewAnalytics);
  }, []);

  // --- Core data fetcher (PARALLEL — all API calls fire simultaneously) ---
  const fetchDashboardData = useCallback(async (range, { skipCache = false, isBackground = false } = {}) => {
    // Check cache first (unless forced refresh)
    if (!skipCache) {
      const cached = cache.get(range);
      if (cached) {
        restoreState(cached);
        return;
      }
    }

    if (!isBackground) setLoading(true);
    const dateParams = getDateParams(range);

    // Fire ALL API calls in parallel using Promise.allSettled
    const [
      metricsRes,
      healthRes,
      logsRes,
      ordersRes,
      orderStatusRes,
      topProductsRes,
      lowStockRes,
      revenueCompRes,
      customerGrowthRes,
      hourlyDistRes,
      paymentTrendsRes,
      conversionRes,
      dailySalesRes,
      reviewAnalyticsRes,
    ] = await Promise.allSettled([
      adminAPI.getDashboardMetrics(dateParams),
      adminAPI.getSystemHealth(),
      adminAPI.getActivityLogs().catch(() => ({ data: { data: [] } })),
      adminAPI.getOrders({ limit: 8, page: 1, ...dateParams }),
      analyticsAPI.getOrderStatus(dateParams),
      analyticsAPI.getProducts(dateParams),
      adminAPI.getLowStockVariants().catch(() => ({ data: { data: [] } })),
      analyticsAPI.getRevenueComparison(dateParams),
      analyticsAPI.getCustomerGrowth(dateParams),
      analyticsAPI.getHourlyDistribution(dateParams),
      analyticsAPI.getPaymentMethodTrends(dateParams),
      analyticsAPI.getConversionMetrics(dateParams),
      analyticsAPI.getDailySales(dateParams),
      analyticsAPI.getReviewAnalytics(dateParams),
    ]);

    const fetched = {
      metrics: DASHBOARD_INITIAL.metrics,
      health: null,
      logs: [],
      liveOrders: [],
      alerts: [],
      orderStatus: [{ name: 'No Orders', value: 100 }],
      topProducts: [],
      revenueComparison: null,
      customerGrowth: [],
      hourlyData: [],
      paymentMethods: [],
      conversionMetrics: null,
      dailySales: [],
    };

    // ── Process each result (no sequential waiting) ──

    if (metricsRes.status === 'fulfilled') {
      const data = metricsRes.value.data?.data || metricsRes.value.data;
      if (data) {
        const merged = { ...fetched.metrics, ...data };
        fetched.metrics = merged;
        setMetrics(merged);
      }
    }

    if (healthRes.status === 'fulfilled') {
      const d = healthRes.value.data?.data || healthRes.value.data || null;
      if (d) { fetched.health = d; setHealth(d); }
    }

    if (logsRes.status === 'fulfilled') {
      const logsData = logsRes.value.data?.data?.logs || logsRes.value.data?.logs || logsRes.value.data?.data || [];
      if (Array.isArray(logsData)) { fetched.logs = logsData.slice(0, 8); setLogs(logsData.slice(0, 8)); }
    }

    if (ordersRes.status === 'fulfilled') {
      const ordersData = ordersRes.value.data?.data || ordersRes.value.data || [];
      const mapped = Array.isArray(ordersData) ? ordersData.map(o => ({
        id: o.orderNumber || (o.id ? o.id.substring(0, 8).toUpperCase() : ''),
        customer: o.user ? (o.user.firstName || '') + ' ' + (o.user.lastName || '') : 'Guest',
        product: o.items?.[0]?.product?.name || 'Multiple Items',
        amount: o.total,
        status: o.status,
        time: formatDateTime(o.createdAt),
      })) : [];
      fetched.liveOrders = mapped;
      setLiveOrders(mapped);
    }

    if (orderStatusRes.status === 'fulfilled') {
      const stats = orderStatusRes.value.data?.data || orderStatusRes.value.data || [];
      if (Array.isArray(stats) && stats.length > 0) {
        const total = stats.reduce((a, b) => a + Number(b.value), 0);
        if (total > 0) {
          const mapped = stats.map(s => ({ name: s.name, value: Math.round((Number(s.value) / total) * 100) }));
          fetched.orderStatus = mapped;
          setOrderStatus(mapped);
        } else {
          fetched.orderStatus = [{ name: 'No Orders', value: 100 }];
          setOrderStatus([{ name: 'No Orders', value: 100 }]);
        }
      } else {
        fetched.orderStatus = [{ name: 'No Orders', value: 100 }];
        setOrderStatus([{ name: 'No Orders', value: 100 }]);
      }
    }

    if (topProductsRes.status === 'fulfilled') {
      const products = topProductsRes.value.data?.data || topProductsRes.value.data || [];
      const mapped = Array.isArray(products) ? products.slice(0, 5).map(p => ({
        name: p.productName,
        sales: p.unitsSold,
        revenue: p.revenue,
      })) : [];
      fetched.topProducts = mapped;
      setTopProducts(mapped);
    }

    if (lowStockRes.status === 'fulfilled') {
      const variants = lowStockRes.value.data?.data || lowStockRes.value.data || [];
      let alertsList = [];

      if (Array.isArray(variants) && variants.length > 0) {
        alertsList = variants.slice(0, 5).map((v, i) => {
          const isOutOfStock = (v.quantity || 0) <= 0;
          const displayName = v.product?.name ? v.product.name + ' (' + v.name + ')' : (v.name || 'Product');
          return {
            id: 'variant_' + (v.id || i),
            type: isOutOfStock ? 'error' : 'warning',
            title: isOutOfStock ? 'Out of Stock Alert' : 'Low Stock Alert',
            message: isOutOfStock
              ? displayName + ' is completely out of stock.'
              : displayName + ' is running low — only ' + v.quantity + ' left in stock.',
            show: true
          };
        });
      }

      // Fire inventory low-stock check in parallel too
      try {
        const invRes = await inventoryAPI.getLowStock();
        const lowStockProducts = invRes.data?.data || invRes.data || [];
        if (Array.isArray(lowStockProducts)) {
          const productAlerts = lowStockProducts
            .filter(p => !alertsList.some(a => a.message.includes(p.name)))
            .slice(0, 3)
            .map((p, i) => {
              const isOutOfStock = (p.quantity || 0) <= 0;
              return {
                id: 'product_' + (p.id || i),
                type: isOutOfStock ? 'error' : 'warning',
                title: isOutOfStock ? 'Out of Stock Alert' : 'Low Stock Alert',
                message: isOutOfStock ? p.name + ' is completely out of stock.' : p.name + ' is running low — only ' + p.quantity + ' left in stock.',
                show: true
              };
            });
          alertsList = [...alertsList, ...productAlerts].slice(0, 8);
        }
      } catch { /* low stock products not available */ }

      if (alertsList.length > 0) { fetched.alerts = alertsList; setAlerts(alertsList); }
    }

    if (revenueCompRes.status === 'fulfilled') {
      const data = revenueCompRes.value.data?.data || revenueCompRes.value.data;
      if (data) { fetched.revenueComparison = data; setRevenueComparison(data); }
    }

    if (customerGrowthRes.status === 'fulfilled') {
      const data = customerGrowthRes.value.data?.data || customerGrowthRes.value.data || [];
      if (Array.isArray(data)) { fetched.customerGrowth = data; setCustomerGrowth(data); }
    }

    if (hourlyDistRes.status === 'fulfilled') {
      const data = hourlyDistRes.value.data?.data || hourlyDistRes.value.data || [];
      if (Array.isArray(data)) {
        const mapped = data.map(h => ({ hour: h.hour + ':00', orders: h.orders, revenue: h.revenue }));
        fetched.hourlyData = mapped;
        setHourlyData(mapped);
      }
    }

    if (paymentTrendsRes.status === 'fulfilled') {
      const data = paymentTrendsRes.value.data?.data || paymentTrendsRes.value.data || [];
      if (Array.isArray(data)) { fetched.paymentMethods = data; setPaymentMethods(data); }
    }

    if (conversionRes.status === 'fulfilled') {
      const data = conversionRes.value.data?.data || conversionRes.value.data;
      if (data) { fetched.conversionMetrics = data; setConversionMetrics(data); }
    }

    if (dailySalesRes.status === 'fulfilled') {
      const data = dailySalesRes.value.data?.data || dailySalesRes.value.data || [];
      if (Array.isArray(data)) { fetched.dailySales = data.slice(-14); setDailySales(data.slice(-14)); }
    }

    if (reviewAnalyticsRes.status === 'fulfilled') {
      const data = reviewAnalyticsRes.value.data?.data || reviewAnalyticsRes.value.data;
      if (data) { fetched.reviewAnalytics = data; setReviewAnalytics(data); }
    }

    // Track failures for visual error display
    const apiNames = ['Dashboard Metrics', 'System Health', 'Activity Logs', 'Orders', 'Order Status', 'Top Products', 'Low Stock', 'Revenue Comparison', 'Customer Growth', 'Hourly Distribution', 'Payment Methods', 'Conversion Metrics', 'Daily Sales', 'Review Analytics'];
    const results = [metricsRes, healthRes, logsRes, ordersRes, orderStatusRes, topProductsRes, lowStockRes, revenueCompRes, customerGrowthRes, hourlyDistRes, paymentTrendsRes, conversionRes, dailySalesRes, reviewAnalyticsRes];
    const failures = results
      .map((r, i) => r.status === 'rejected' ? apiNames[i] : null)
      .filter(Boolean);
    if (failures.length > 0) {
      console.warn(`${failures.length} dashboard API(s) failed:`, failures);
      setApiErrors(prev => {
        const newErrors = failures.map(name => ({
          id: Date.now() + '_' + name.replace(/\s+/g, '_'),
          name,
          time: new Date(),
        }));
        // Keep last 3 errors, merge with existing
        const merged = [...prev, ...newErrors];
        return merged.slice(-3);
      });
    } else {
      setApiErrors([]);
    }

    // Cache the result
    cache.set(range, fetched);

    setLastRefreshed(new Date());
    if (!isBackground) setLoading(false);
  }, [cache, restoreState]);

  // --- Manual refresh (bypasses cache) ---
  const handleManualRefresh = useCallback(() => {
    fetchDashboardData(dateRange, { skipCache: true });
  }, [dateRange, fetchDashboardData]);

  // --- Clear cache and refresh ---
  const handleClearCache = useCallback(() => {
    cache.clear();
    fetchDashboardData(dateRange, { skipCache: true });
  }, [cache, dateRange, fetchDashboardData]);

  // --- Load on date range change (uses cache) ---
  useEffect(() => {
    fetchDashboardData(dateRange);
  }, [dateRange, fetchDashboardData]);

  // --- Auto-refresh interval ---
  useInterval(() => {
    fetchDashboardData(dateRange, { skipCache: true, isBackground: true });
  }, refreshInterval);

  const goToInventory = function() { navigate('/admin/inventory'); };
  const handleCardKeyDown = function(e) {
    if (e.key === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      goToInventory();
    }
  };
  const statusColor = function(status) {
    switch (status) {
      case 'New': return 'bg-brand-orange/10 text-brand-orange';
      case 'Processing': return 'bg-secondary/20 text-secondary-dark';
      case 'Shipped': return 'bg-info-bg text-info';
      case 'Delivered': return 'bg-success-bg text-success';
      default: return 'bg-surface text-text-muted';
    }
  };

  // Prepare comparison chart data
  const comparisonChartData = (() => {
    if (!revenueComparison) return [];
    const currentMap = {};
    (revenueComparison.current || []).forEach(d => { currentMap[d.date] = d.revenue; });
    const previousMap = {};
    (revenueComparison.previous || []).forEach(d => { previousMap[d.date] = d.revenue; });

    const allDates = [...new Set([
      ...Object.keys(currentMap),
      ...Object.keys(previousMap),
    ])].sort();

    // Map to relative day numbers for cleaner axis
    return allDates.map((date, i) => ({
      day: 'Day ' + (i + 1),
      'Current Period': currentMap[date] || 0,
      'Previous Period': previousMap[date] || 0,
    }));
  })();

  const growthDisplay = customerGrowth.length > 0 ? customerGrowth.slice(-14) : [];

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-3xl font-bold text-text-primary mb-1 tracking-tight">Dashboard</h2>
          <p className="text-sm text-text-muted">Welcome back — here's what's happening today.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RefreshControls
            interval={refreshInterval}
            onIntervalChange={setRefreshInterval}
            onManualRefresh={handleManualRefresh}
            onClearCache={handleClearCache}
            loading={loading}
          />
          {lastRefreshed && (
            <span
              className="text-xs text-text-muted font-medium whitespace-nowrap"
              title={'Last updated: ' + lastRefreshed.toLocaleString()}
              style={{ animation: 'fadeIn 0.3s ease' }}
            >
              {'Updated ' + (function() {
                var diff = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
                if (diff < 60) return 'just now';
                if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
                return lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              })()}
            </span>
          )}
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button className="px-4 py-2.5 border border-border rounded-xl bg-white hover:border-brand-black hover:text-brand-black transition-colors text-sm font-medium text-text-primary shadow-soft" onClick={function() { navigate('/admin/analytics'); }}>
            📊 Analytics
          </button>
          <button className="px-4 py-2.5 bg-brand-black text-brand-white rounded-xl hover:bg-black active:bg-brand-black-hover transition-all text-sm font-semibold shadow-lg hover:shadow-xl" onClick={function() { navigate('/admin/orders'); }}>
            📦 View Orders
          </button>
        </div>
      </div>

      {/* API Error Banner */}
      {apiErrors.length > 0 && (
        <div className="mb-6 bg-warning-bg border border-warning/30 rounded-2xl p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-warning mb-1">Some data couldn't be loaded</div>
              <div className="text-xs text-warning/80">
                Failed to load: {apiErrors.map(e => e.name).join(', ')}.
                Data may appear incomplete.{" "}
                <button
                  className="underline font-semibold hover:text-warning"
                  onClick={handleManualRefresh}
                >
                  Retry now
                </button>
              </div>
            </div>
            <button
              className="text-warning/50 hover:text-warning text-lg leading-none p-1"
              onClick={() => setApiErrors([])}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Alerts */}
      <div className="mb-8 space-y-3">
        {alerts.filter(function(a) { return a.show; }).map(function(a) {
          var alertBorder = 'flex items-start gap-4 p-4 rounded-xl border ';
          if (a.type === 'warning') {
            alertBorder = alertBorder + 'bg-warning-bg border-warning/20 text-warning';
          } else if (a.type === 'error') {
            alertBorder = alertBorder + 'bg-danger-bg border-danger/20 text-danger';
          } else if (a.type === 'success') {
            alertBorder = alertBorder + 'bg-success-bg border-success/20 text-success';
          } else {
            alertBorder = alertBorder + 'bg-info-bg border-info/20 text-info';
          }
          return (
            <div key={a.id} className={alertBorder}>
              <span className="text-xl shrink-0">{a.type === 'warning' ? '\u26A0\uFE0F' : a.type === 'error' ? '\uD83D\uDD34' : a.type === 'success' ? '\u2705' : '\uD83D\uDD25'}</span>
              <div className="flex-1 text-sm pt-0.5">
                <div className="font-bold mb-0.5">{a.title}</div>
                <div className="opacity-90">{a.message}</div>
              </div>
              <button className="text-lg opacity-50 hover:opacity-100 p-1" onClick={function() { setAlerts(alerts.map(function(x) { return x.id === a.id ? { ...x, show: false } : x; })); }}>✕</button>
            </div>
          );
        })}
      </div>

      {/* Stat Cards */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-4 mb-4 text-sm text-text-muted bg-white border border-border rounded-2xl shadow-soft">
          <div className="spinner w-5 h-5" style={{ borderWidth: '2px' }} />
          <span>Updating dashboard data...</span>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
        {[
          (function() {
            var rev = metrics.revenueChangePercent;
            var revLabel = (rev != null && !isNaN(rev))
              ? (rev >= 0 ? '\u2191 ' : '\u2193 ') + Math.abs(rev).toFixed(1) + '% vs prev'
              : '— vs prev';
            var revColor = (rev != null && !isNaN(rev))
              ? (rev >= 0 ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg')
              : 'text-text-muted bg-surface';
            return { icon: '\uD83D\uDCB0', title: 'Total Revenue', value: '\u20B9' + (metrics.totalRevenue / 1000).toFixed(1) + 'k', change: revLabel, changeColor: revColor, gradient: 'from-brand-orange to-secondary' };
          })(),
          (function() {
            var ord = metrics.ordersChangePercent;
            var ordLabel = (ord != null && !isNaN(ord))
              ? (ord >= 0 ? '\u2191 ' : '\u2193 ') + Math.abs(ord).toFixed(1) + '% vs prev'
              : '— vs prev';
            var ordColor = (ord != null && !isNaN(ord))
              ? (ord >= 0 ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg')
              : 'text-text-muted bg-surface';
            return { icon: '\uD83D\uDCE6', title: 'Total Orders', value: String(metrics.totalOrders || metrics.ordersToday), change: ordLabel, changeColor: ordColor, gradient: 'from-accent-green to-accent-mint' };
          })(),
          { icon: '\uD83D\uDC65', title: 'Active Users', value: metrics.activeUsers?.toLocaleString() || '0', change: (metrics.newUsers || '0') + ' new in period', changeColor: 'text-success bg-success-bg', gradient: 'from-info to-blue-400' },
          { icon: '\uD83D\uDCC8', title: 'Avg Order Value', value: '\u20B9' + (metrics.avgOrderValue > 0 ? Number(metrics.avgOrderValue).toFixed(0) : '0'), change: metrics.totalOrders > 0 ? 'Across ' + metrics.totalOrders + ' orders' : 'No orders yet', changeColor: 'text-info bg-info-bg', gradient: 'from-accent-green to-accent-mint' },
          { icon: '\uD83D\uDCC9', title: 'Low Stock Items', value: String(metrics.lowStockCount), change: metrics.lowStockCount > 0 ? String(metrics.lowStockCount) + ' need restock' : 'All stocked', changeColor: metrics.lowStockCount > 0 ? 'text-danger bg-danger-bg' : 'text-success bg-success-bg', gradient: 'from-warning to-orange-400' },
        ].map(function(stat, i) {
          var isLowStock = stat.title === 'Low Stock Items';
          var classes = 'bg-white p-5 rounded-2xl border border-border shadow-soft hover:shadow-card transition-shadow relative overflow-hidden group';
          if (isLowStock) {
            classes = classes + ' cursor-pointer hover:border-warning';
          }
          return (
            <div key={stat.title}
              className={classes}
              onClick={isLowStock ? goToInventory : undefined}
              role={isLowStock ? 'button' : undefined}
              tabIndex={isLowStock ? 0 : undefined}
              onKeyDown={isLowStock ? handleCardKeyDown : undefined}
            >
              <div className={'absolute top-0 left-0 w-full h-1 bg-gradient-to-r ' + stat.gradient + ' opacity-0 group-hover:opacity-100 transition-opacity'} />
              <div className="text-2xl mb-3">{stat.icon}</div>
              <div className="text-xs font-semibold tracking-wider text-text-muted uppercase mb-1">{stat.title}</div>
              <div className="text-2xl font-bold text-text-primary mb-2 font-display">{stat.value}</div>
              <div className={'text-[11px] font-semibold px-2 py-0.5 rounded-md w-fit ' + stat.changeColor}>{stat.change}</div>
            </div>
          );
        })}
      </div>

      {/* Conversion Metrics + KPI Row */}
      {conversionMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-border rounded-xl p-4 shadow-soft text-center">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Conversion Rate</div>
            <div className="text-2xl font-bold text-text-primary font-display">{(conversionMetrics.conversionRate || 0).toFixed(1)}%</div>
            <div className="text-[11px] text-text-muted mt-1">{conversionMetrics.completedOrders} orders from {conversionMetrics.totalCarts} carts</div>
          </div>
          <div className="bg-white border border-border rounded-xl p-4 shadow-soft text-center">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Completed Orders</div>
            <div className="text-2xl font-bold text-success font-display">{conversionMetrics.completedOrders}</div>
            <div className="text-[11px] text-text-muted mt-1">Successfully processed</div>
          </div>
          <div className="bg-white border border-border rounded-xl p-4 shadow-soft text-center">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Abandoned Carts</div>
            <div className="text-2xl font-bold text-danger font-display">{conversionMetrics.abandonedCarts}</div>
            <div className="text-[11px] text-text-muted mt-1">Did not convert</div>
          </div>
          <div className="bg-white border border-border rounded-xl p-4 shadow-soft text-center">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Total Carts Created</div>
            <div className="text-2xl font-bold text-text-primary font-display">{conversionMetrics.totalCarts}</div>
            <div className="text-[11px] text-text-muted mt-1">In this period</div>
          </div>
        </div>
      )}

      {/* Live Orders + Revenue Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 mb-8">
        {/* Live Orders Feed */}
        <div className="bg-white border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse shadow-glow-green" />
              <h3 className="font-display font-bold text-text-primary">Live Orders</h3>
            </div>
            <button className="text-xs font-semibold text-brand-orange hover:underline" onClick={function() { navigate('/admin/orders'); }}>View All</button>
          </div>
          <div className="flex-1 overflow-auto max-h-[420px]">
            {liveOrders.map(function(order, idx) {
              return (
                <div key={order.id || idx} className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 last:border-0 hover:bg-surface transition-colors">
                  <div className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs font-bold shrink-0">
                    {order.customer.split(' ').map(function(n) { return n[0]; }).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-text-primary">{order.id}</span>
                      <span className={'text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ' + statusColor(order.status)}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-text-muted truncate">{order.product}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-text-primary">{'\u20B9'}{order.amount}</div>
                    <div className="text-[10px] text-text-muted">{order.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Revenue Comparison Chart */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
          <h3 className="font-display font-bold text-text-primary text-lg mb-1">Revenue Comparison</h3>
          <p className="text-xs text-text-muted mb-4">
            {revenueComparison ? (
              <>Current vs Previous Period &middot; Change: <span className={(revenueComparison.changePercent ?? 0) >= 0 ? 'text-success font-bold' : 'text-danger font-bold'}>{(revenueComparison.changePercent ?? 0) >= 0 ? '+' : ''}{(revenueComparison.changePercent ?? 0).toFixed(1)}%</span></>
            ) : 'Comparing current vs previous period'}
          </p>
          <div className="h-[280px]" style={{ minWidth: 1, minHeight: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#8a8a9a' }} axisLine={false} tickLine={false} dy={8} />
                <YAxis tick={{ fontSize: 11, fill: '#8a8a9a' }} axisLine={false} tickLine={false} tickFormatter={function(v) { return '\u20B9' + v/1000 + 'k'; }} />
                <Tooltip
                  formatter={function(v) { return '\u20B9' + Number(v).toLocaleString(); }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e5ea', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 500 }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Current Period" fill="#1a1a1a" radius={[4, 4, 0, 0]} maxBarSize={16} />
                <Bar dataKey="Previous Period" fill="#C9A96E" radius={[4, 4, 0, 0]} maxBarSize={16} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Order Status + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Order Status */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
          <h3 className="font-display font-bold text-text-primary text-lg mb-4">Order Status</h3>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-[180px] w-[180px] shrink-0" style={{ minWidth: 1, minHeight: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={orderStatus} innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={4} strokeWidth={0}>
                    {orderStatus.map(function(s, i) { return <Cell key={s.name} fill={PIE_COLORS[i]} />; })}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full flex flex-col gap-2.5">
              {orderStatus.map(function(s, i) {
                return (
                  <div key={s.name} className="flex items-center justify-between text-sm bg-surface p-2.5 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-text-muted font-medium">{s.name}</span>
                    </div>
                    <strong className="text-text-primary">{s.value}%</strong>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <h3 className="font-display font-bold text-text-primary text-lg">Top Selling Products</h3>
            <button className="text-xs font-semibold text-brand-orange hover:underline" onClick={function() { navigate('/admin/products'); }}>View All</button>
          </div>
          <div className="flex-1 overflow-auto">
            {topProducts.length > 0 ? topProducts.map(function(p, i) {
              var rankClass = 'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ';
              if (i === 0) {
                rankClass = rankClass + 'bg-brand-orange text-white shadow-glow-orange';
              } else {
                rankClass = rankClass + 'bg-surface text-text-muted border border-border';
              }
              return (
                <div key={p.name} className="flex items-center gap-4 p-4 border-b border-border/50 last:border-0 hover:bg-surface transition-colors">
                  <div className={rankClass}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-text-primary text-sm">{p.name}</div>
                    <div className="text-xs text-text-muted mt-0.5">{p.sales} units sold</div>
                  </div>
                  <div className="font-bold text-text-primary text-sm">{'\u20B9'}{((p.revenue || 0) / 1000).toFixed(1)}k</div>
                </div>
              );
            }) : (
              <div className="p-8 text-center text-text-muted text-sm">No products data yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Customer Growth + Hourly Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Customer Growth Trend */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
          <h3 className="font-display font-bold text-text-primary text-lg mb-5">Customer Growth</h3>            <div className="h-[250px]" style={{ minWidth: 1, minHeight: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthDisplay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="customerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8a8a9a' }} axisLine={false} tickLine={false} dy={8} tickFormatter={function(v) { return v ? v.slice(5) : ''; }} />
                <YAxis tick={{ fontSize: 11, fill: '#8a8a9a' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e5ea', fontSize: '0.8rem' }} />
                <Area type="monotone" dataKey="totalUsers" stroke="#3b82f6" strokeWidth={2} fill="url(#customerGrad)" name="Total Users" />
                <Bar dataKey="newUsers" fill="#93c5fd" radius={[2, 2, 0, 0]} maxBarSize={8} name="New Users" opacity={0.7} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hourly Sales Distribution */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
          <h3 className="font-display font-bold text-text-primary text-lg mb-5">Hourly Sales Distribution</h3>            <div className="h-[250px]" style={{ minWidth: 1, minHeight: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#8a8a9a' }} axisLine={false} tickLine={false} dy={8} />
                <YAxis tick={{ fontSize: 11, fill: '#8a8a9a' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={function(v, name) { return name === 'revenue' ? '\u20B9' + Number(v).toLocaleString() : v; }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e5ea', fontSize: '0.8rem' }}
                />
                <Bar dataKey="orders" fill="#1a1a1a" radius={[3, 3, 0, 0]} maxBarSize={12} name="Orders" />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Payment Methods + Daily Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Payment Methods Breakdown */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
          <h3 className="font-display font-bold text-text-primary text-lg mb-4">Payment Methods</h3>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-[200px] w-[200px] shrink-0" style={{ minWidth: 1, minHeight: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentMethods.length > 0 ? paymentMethods.map(p => ({ name: p.method, value: p.percentage })) : [{ name: 'No Data', value: 100 }]}
                    innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {(paymentMethods.length > 0 ? paymentMethods : [{ method: 'No Data', percentage: 100 }]).map(function(p, i) {
                      return <Cell key={p.method} fill={CHART_COLORS[i % CHART_COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip formatter={function(v) { return v.toFixed(1) + '%'; }} contentStyle={{ borderRadius: 8, border: '1px solid #E8E2D9', fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full flex flex-col gap-2">
              {paymentMethods.slice(0, 6).map(function(p, i) {
                return (
                  <div key={p.method} className="flex items-center justify-between text-sm bg-surface p-2.5 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-text-muted font-medium">{p.method}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-text-muted">{p.count} transactions</span>
                      <strong className="text-text-primary">{(p.percentage || 0).toFixed(1)}%</strong>
                    </div>
                  </div>
                );
              })}
              {paymentMethods.length === 0 && (
                <div className="text-sm text-text-muted text-center py-4">No payment data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Daily Sales Trend */}
        <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
          <h3 className="font-display font-bold text-text-primary text-lg mb-5">Daily Sales (Last 14 Days)</h3>            <div className="h-[250px]" style={{ minWidth: 1, minHeight: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#8a8a9a' }} axisLine={false} tickLine={false} dy={8} tickFormatter={function(v) { return v ? v.slice(5) : ''; }} />
                <YAxis tick={{ fontSize: 11, fill: '#8a8a9a' }} axisLine={false} tickLine={false} tickFormatter={function(v) { return '\u20B9' + v/1000 + 'k'; }} />
                <Tooltip
                  formatter={function(v, name) {
                    if (name === 'revenue') return '\u20B9' + Number(v).toLocaleString();
                    return v;
                  }}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e5e5ea', fontSize: '0.8rem' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#1a1a1a" strokeWidth={2} dot={{ r: 3, fill: '#1a1a1a' }} name="Revenue" />
                <Bar dataKey="orders" fill="#C9A96E" radius={[3, 3, 0, 0]} maxBarSize={8} name="Orders" opacity={0.6} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Review Analytics ── */}
      {reviewAnalytics && (
        <div className="mb-8">
          <h3 className="font-display font-bold text-text-primary text-lg mb-5">Review Analytics</h3>

          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-border rounded-xl p-4 shadow-soft">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Avg Rating</div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-text-primary font-display">{reviewAnalytics.average_rating ?? '0.0'}</span>
                <span className="text-sm text-yellow-500">{'\u2605'}</span>
              </div>
            </div>
            <div className="bg-white border border-border rounded-xl p-4 shadow-soft">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Total Reviews</div>
              <div className="text-2xl font-bold text-text-primary font-display">{reviewAnalytics.total_reviews ?? 0}</div>
            </div>
            <div className="bg-white border border-border rounded-xl p-4 shadow-soft">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Approved</div>
              <div className="text-2xl font-bold text-success font-display">{reviewAnalytics.total_approved ?? 0}</div>
            </div>
            <div className="bg-white border border-border rounded-xl p-4 shadow-soft">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Pending</div>
              <div className="text-2xl font-bold text-warning font-display">{reviewAnalytics.total_pending ?? 0}</div>
            </div>
          </div>

          {/* Rating distribution + Top reviewed products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Rating Distribution */}
            <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
              <h4 className="font-display font-semibold text-text-primary mb-4">Rating Distribution</h4>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((star) => {
                  const item = (reviewAnalytics.rating_distribution || []).find((d) => d.rating === star);
                  const pct = item?.percentage ?? 0;
                  const count = item?.count ?? 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text-muted w-8 shrink-0">{star} {'\u2605'}</span>
                      <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden border border-border/50">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: pct + '%',
                            background: star >= 4 ? '#22c55e' : star >= 3 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="text-xs text-text-muted w-10 text-right shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Reviewed Products */}
            <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
              <h4 className="font-display font-semibold text-text-primary mb-4">Top Reviewed Products</h4>
              <div className="space-y-3">
                {(reviewAnalytics.top_reviewed_products || []).length > 0 ? (
                  reviewAnalytics.top_reviewed_products.slice(0, 5).map((p, i) => (
                    <div key={p.product_name || i} className="flex items-center justify-between bg-surface p-3 rounded-lg border border-border/50">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">{p.product_name}</div>
                        <div className="text-xs text-text-muted mt-0.5">{p.count} reviews</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        <span className="text-sm font-bold text-yellow-600">{p.avg_rating.toFixed(1)}</span>
                        <span className="text-xs text-yellow-500">{'\u2605'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-text-muted py-4 text-center">No review data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Rating Trend */}
          {reviewAnalytics.monthly_trend && reviewAnalytics.monthly_trend.length > 0 && (
            <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
              <h4 className="font-display font-semibold text-text-primary mb-4">Average Rating Trend (12 Months)</h4>
              <div className="h-[220px]" style={{ minWidth: 1, minHeight: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reviewAnalytics.monthly_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#8a8a9a' }} axisLine={false} tickLine={false} dy={8} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11, fill: '#8a8a9a' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v) => [Number(v).toFixed(2), 'Avg Rating']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e5ea', fontSize: '0.8rem' }}
                    />
                    <Line type="monotone" dataKey="avg_rating" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} name="Avg Rating" />
                    <Bar dataKey="total" fill="#e5e5ea" radius={[2, 2, 0, 0]} maxBarSize={8} name="Total Reviews" opacity={0.5} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity Log */}
      <div className="bg-white border border-border rounded-2xl shadow-soft overflow-hidden mb-8">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h3 className="font-display font-bold text-text-primary text-lg">Recent Activity</h3>
          <span className="text-xs font-medium bg-surface text-text-muted px-2.5 py-1 rounded-lg border border-border">Last 24h</span>
        </div>
        <div className="p-5">
          <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
            {(logs.length ? logs : []).slice(0, 6).map(function(log, i) {
              var dotColor = 'bg-info';
              if (log.type === 'success') dotColor = 'bg-accent-green';
              else if (log.type === 'warning') dotColor = 'bg-warning';
              else if (log.type === 'danger') dotColor = 'bg-danger';
              return (
                <div key={log.id || log.description || i} className="relative">
                  <div className={'absolute -left-[31px] w-4 h-4 rounded-full border-[3px] border-white shadow-sm ' + dotColor} />
                  <div>
                    <div className="text-sm font-medium text-text-primary leading-snug">{log.description || log.text || log.message || log.action}</div>
                    <div className="text-xs text-text-muted mt-1">{log.time || formatDateTime(log.createdAt) || ''}</div>
                  </div>
                </div>
              );
            })}
            {logs.length === 0 && (
              <div className="text-sm text-text-muted py-2">No recent activity</div>
            )}
          </div>
        </div>
      </div>

      {/* System Health */}
      {health && (
        <div className="flex flex-wrap gap-4 p-5 bg-charcoal text-white rounded-2xl shadow-lg mb-4">
          {[
            { label: 'Database', value: health.databaseConnection ? 'Connected' : 'Disconnected', color: health.databaseConnection ? 'bg-accent-green' : 'bg-danger', status: health.databaseConnection ? 'Healthy' : 'Unhealthy' },
            { label: 'Cache', value: health.cacheConnection ? 'Connected' : 'Disconnected', color: health.cacheConnection ? 'bg-accent-green' : 'bg-warning', status: health.cacheConnection ? 'Healthy' : 'Degraded' },
            { label: 'Disk Space', value: health.diskSpace || 'Available', color: 'bg-accent-green', status: 'Healthy' },
            { label: 'Uptime', value: health.uptime ? String(health.uptime) + 'h' : 'N/A', color: 'bg-accent-green', status: 'Running' },
          ].map(function(item, i) {
            var containerClass = 'flex-1 min-w-[120px] flex items-center gap-3';
            if (i > 0) containerClass = containerClass + ' border-l border-white/10 pl-4';
            return (
              <div key={item.label} className={containerClass}>
                <div className={'w-2.5 h-2.5 rounded-full ' + item.color + ' animate-pulse'} />
                <div>
                  <div className="text-[10px] tracking-widest text-white/50 uppercase font-semibold mb-0.5">{item.label}</div>
                  <div className="text-sm font-medium">{item.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

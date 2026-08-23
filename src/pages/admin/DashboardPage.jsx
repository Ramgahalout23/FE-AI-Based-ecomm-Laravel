import { useState, useEffect, useCallback, useMemo, useReducer, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend, CartesianGrid } from 'recharts';
import { motion, animate, useReducedMotion } from 'framer-motion';
import { adminAPI } from '../../api/admin';
import { analyticsAPI } from '../../api/analytics';
import { formatDateTime, formatTime } from '../../utils/formatters';
import DateRangePicker, { getDateParams, getDefaultDateRange } from '../../components/common/DateRangePicker';
import RefreshControls from '../../components/common/RefreshControls';
import useDashboardCache from '../../hooks/useDashboardCache';
import useInterval from '../../hooks/useInterval';
import DashboardSkeleton from '../../components/dashboard/SkeletonLoader';
import { BarChart3, Package, AlertTriangle, X, Users, TrendingUp, IndianRupee } from 'lucide-react';

const PIE_COLORS = ['#1a1a1a', '#22c55e', '#888888', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];
const CHART_COLORS = ['#1a1a1a', '#27AE60', '#2980B9', '#E74C3C', '#8E44AD', '#F39C12', '#1ABC9C'];

// ── Stable recharts config constants (stable references prevent re-render loops) ──
const CHART_MARGIN = { top: 10, right: 10, left: -20, bottom: 0 };
const TICK_STYLE_XS = { fontSize: 10, fill: '#8a8a9a' };
const TICK_STYLE_SM = { fontSize: 11, fill: '#8a8a9a' };
const TOOLTIP_STYLE = { borderRadius: '12px', border: '1px solid #e5e5ea', fontSize: '0.8rem' };
const TOOLTIP_STYLE_BOLD = { borderRadius: '12px', border: '1px solid #e5e5ea', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontWeight: 500 };
const LEGEND_STYLE = { fontSize: '11px', paddingTop: '4px' };
const LEGEND_STYLE_PT8 = { fontSize: '11px', paddingTop: '8px' };
const FORMAT_CURRENCY_K = (v) => '₹' + (v / 1000) + 'k';
const FORMAT_CURRENCY_LOCALE = (v) => '₹' + Number(v).toLocaleString();
const FORMAT_DATE_SLICE = (v) => v ? v.slice(5) : '';
const FORMAT_TOOLTIP_CURRENCY = (v, name) => name === 'revenue' ? '₹' + Number(v).toLocaleString() : v;
const FORMAT_AVG_RATING = (v) => [Number(v).toFixed(2), 'Avg Rating'];
const FORMAT_PIE_PCT = (v) => (v ?? 0).toFixed(1) + '%';

// ── Stable element-level config constants (stable references prevent re-render loops) ──
const BAR_RADIUS_4 = [4, 4, 0, 0];
const BAR_RADIUS_3 = [3, 3, 0, 0];
const BAR_RADIUS_2 = [2, 2, 0, 0];
const DOT_BLACK = { r: 3, fill: '#1a1a1a' };
const DOT_AMBER = { r: 3, fill: '#f59e0b' };

const DASHBOARD_DEFAULTS = {
  metrics: { totalRevenue: 0, ordersToday: 0, activeUsers: 0, pendingReviews: 0, lowStockCount: 0, totalOrders: 0, newUsers: 0, avgOrderValue: 0, revenueChangePercent: 0, ordersChangePercent: 0 },
  health: null,
  logs: [],
  liveOrders: [],
  orderStatus: [{ name: 'No Orders', value: 100 }],
  topProducts: [],
  revenueComparison: null,
  customerGrowth: [],
  hourlyData: [],
  paymentMethods: [],
  conversionMetrics: null,
  dailySales: [],
  reviewAnalytics: null,
};

// ── Premium motion presets ──
const EASE = [0.16, 1, 0.3, 1];
const cardContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const cardItemVariants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

/**
 * AnimatedNumber — counts from 0 up to `value` on mount/change with the
 * design system's premium easing. Respects prefers-reduced-motion.
 */
function AnimatedNumber({ value, format = (v) => String(Math.round(v)), duration = 0.9 }) {
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(value);
      return undefined;
    }
    const controls = animate(0, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  return format(display);
}

/**
 * SectionReveal — scroll-triggered reveal for dashboard sections.
 * Animates once when the section enters the viewport.
 */
function SectionReveal({ children, delay = 0, className = '' }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Map backend order data to the live orders format the dashboard expects.
 */
function mapOrders(orders) {
  if (!Array.isArray(orders)) return [];
  return orders.map(o => ({
    id: o.orderNumber || (o.id ? o.id.substring(0, 8).toUpperCase() : ''),
    customer: o.user ? (o.user.firstName || o.user.first_name || '') + ' ' + (o.user.lastName || o.user.last_name || '') : 'Guest',
    product: o.items?.[0]?.product?.name || 'Multiple Items',
    amount: o.total || o.amount || 0,
    status: o.status,
    time: formatDateTime(o.createdAt || o.created_at),
  }));
}

/**
 * Normalise an API response: unwrap .data?.data -> .data.
 */
function unwrap(res) {
  return res?.data?.data || res?.data || res || null;
}

/**
 * Reducer for dashboard data.
 */
function dashboardReducer(state, action) {
  switch (action.type) {
    case 'SET_MULTIPLE':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const cache = useDashboardCache(5, 'dashboard'); // Keep up to 5 date ranges in cache
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Main dashboard state — updated all at once from the consolidated endpoint
  const [data, dispatch] = useReducer(dashboardReducer, DASHBOARD_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [apiErrors, setApiErrors] = useState([]);
  const [chartsReady, setChartsReady] = useState(false);

  // Delay chart rendering until after layout is computed — prevents recharts
  // from measuring zero-width/height containers and spamming "width(-1)" warnings.
  useEffect(() => {
    if (!loading) {
      const raf = requestAnimationFrame(() => {
        requestAnimationFrame(() => setChartsReady(true));
      });
      return () => cancelAnimationFrame(raf);
    }
    setChartsReady(false);
  }, [loading]);

  // ── Core fetcher: uses the consolidated backend endpoint ──
  const fetchDashboardData = useCallback(async (range, { skipCache = false, isBackground = false } = {}) => {
    const dateParams = getDateParams(range);

    // Check cache first (unless forced refresh)
    if (!skipCache) {
      const cached = cache.get(range);
      if (cached) {
        dispatch({ type: 'SET_MULTIPLE', payload: { ...DASHBOARD_DEFAULTS, ...cached } });
        if (!isBackground) setLoading(false);
        return;
      }
    }

    if (!isBackground && !cache.get(range)) setLoading(true);

    try {
      // PRIMARY: use the consolidated endpoint (1 API call instead of 14)
      const fullRes = await adminAPI.getFullDashboard({ ...dateParams });
      const full = unwrap(fullRes);

      if (full) {
        // Build all dashboard data synchronously, then dispatch once.
        // React 18+ automatically batches the dispatch + state updates
        // into a single render — no need for setTimeout(0) yielding.
        let d = { ...DASHBOARD_DEFAULTS };

        // 1. Metrics (stat cards)
        if (full.metrics) d.metrics = { ...d.metrics, ...full.metrics };

        // 2. Health
        if (full.health) d.health = full.health;

        // 3. Activity logs
        if (Array.isArray(full.logs)) d.logs = full.logs.slice(0, 8);

        // 4. Live orders
        if (full.orders) {
          const orders = Array.isArray(full.orders) ? full.orders : (full.orders.data || []);
          d.liveOrders = mapOrders(orders);
        }

        // 5. Order status distribution
        if (Array.isArray(full.orderStatus) && full.orderStatus.length > 0) {
          const total = full.orderStatus.reduce((a, b) => a + Number(b.value || b.count || 0), 0);
          if (total > 0) {
            d.orderStatus = full.orderStatus.map(s => ({ name: s.name, value: Math.round((Number(s.value || s.count || 0) / total) * 100) }));
          }
        }

        // 6. Top products
        if (Array.isArray(full.topProducts)) {
          d.topProducts = full.topProducts.slice(0, 5).map(p => ({
            name: p.productName || p.name,
            sales: p.unitsSold || p.sales_count || 0,
            revenue: p.revenue || 0,
          }));
        }

        // 7. Revenue comparison
        if (full.revenueComp) d.revenueComparison = full.revenueComp;

        // 8. Customer growth
        if (Array.isArray(full.customerGrowth)) d.customerGrowth = full.customerGrowth;

        // 9. Hourly distribution
        if (Array.isArray(full.hourlyDist)) {
          d.hourlyData = full.hourlyDist.map(h => ({ hour: (h.hour || '') + ':00', orders: h.orders, revenue: h.revenue }));
        }

        // 10. Payment methods
        if (Array.isArray(full.paymentTrends)) d.paymentMethods = full.paymentTrends;

        // 11. Conversion metrics
        if (full.conversion) d.conversionMetrics = full.conversion;

        // 12. Daily sales (last 14 days)
        if (Array.isArray(full.dailySales)) d.dailySales = full.dailySales.slice(-14);

        // 13. Review analytics
        if (full.reviewAnalytics) d.reviewAnalytics = full.reviewAnalytics;

        // Single batched dispatch — React 18+ batches these into one render
        dispatch({ type: 'SET_MULTIPLE', payload: d });
        if (!isBackground) setLoading(false);
        cache.set(range, d);
        setApiErrors([]);
        setLastRefreshed(new Date());
        return;
      }
    } catch {
      // Consolidated endpoint failed — fall back to individual calls
    }

    // ── FALLBACK: individual API calls (original behaviour) ──
    const [
      metricsRes,
      healthRes,
      logsRes,
      ordersRes,
      orderStatusRes,
      topProductsRes,
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
      analyticsAPI.getRevenueComparison(dateParams),
      analyticsAPI.getCustomerGrowth(dateParams),
      analyticsAPI.getHourlyDistribution(dateParams),
      analyticsAPI.getPaymentMethodTrends(dateParams),
      analyticsAPI.getConversionMetrics(dateParams),
      analyticsAPI.getDailySales(dateParams),
      analyticsAPI.getReviewAnalytics(dateParams),
    ]);

    const fetched = { ...DASHBOARD_DEFAULTS };

    if (metricsRes.status === 'fulfilled') {
      const d = unwrap(metricsRes.value);
      if (d) fetched.metrics = { ...fetched.metrics, ...d };
    }

    if (healthRes.status === 'fulfilled') {
      fetched.health = unwrap(healthRes.value);
    }

    if (logsRes.status === 'fulfilled') {
      const logsData = logsRes.value.data?.data?.logs || logsRes.value.data?.logs || logsRes.value.data?.data || [];
      if (Array.isArray(logsData)) fetched.logs = logsData.slice(0, 8);
    }

    if (ordersRes.status === 'fulfilled') {
      const ordersData = unwrap(ordersRes.value) || [];
      fetched.liveOrders = mapOrders(Array.isArray(ordersData) ? ordersData : []);
    }

    if (orderStatusRes.status === 'fulfilled') {
      const stats = unwrap(orderStatusRes.value) || [];
      if (Array.isArray(stats) && stats.length > 0) {
        const total = stats.reduce((a, b) => a + Number(b.value), 0);
        if (total > 0) {
          fetched.orderStatus = stats.map(s => ({ name: s.name, value: Math.round((Number(s.value) / total) * 100) }));
        }
      }
    }

    if (topProductsRes.status === 'fulfilled') {
      const products = unwrap(topProductsRes.value) || [];
      if (Array.isArray(products)) {
        fetched.topProducts = products.slice(0, 5).map(p => ({
          name: p.productName || p.name,
          sales: p.unitsSold || p.sales_count || 0,
          revenue: p.revenue || 0,
        }));
      }
    }

    if (revenueCompRes.status === 'fulfilled') {
      fetched.revenueComparison = unwrap(revenueCompRes.value);
    }

    if (customerGrowthRes.status === 'fulfilled') {
      fetched.customerGrowth = unwrap(customerGrowthRes.value) || [];
    }

    if (hourlyDistRes.status === 'fulfilled') {
      const hd = unwrap(hourlyDistRes.value) || [];
      if (Array.isArray(hd)) {
        fetched.hourlyData = hd.map(h => ({ hour: h.hour + ':00', orders: h.orders, revenue: h.revenue }));
      }
    }

    if (paymentTrendsRes.status === 'fulfilled') {
      fetched.paymentMethods = unwrap(paymentTrendsRes.value) || [];
    }

    if (conversionRes.status === 'fulfilled') {
      fetched.conversionMetrics = unwrap(conversionRes.value);
    }

    if (dailySalesRes.status === 'fulfilled') {
      const ds = unwrap(dailySalesRes.value) || [];
      if (Array.isArray(ds)) fetched.dailySales = ds.slice(-14);
    }

    if (reviewAnalyticsRes.status === 'fulfilled') {
      fetched.reviewAnalytics = unwrap(reviewAnalyticsRes.value);
    }

    // Track API errors
    const apiNames = ['Dashboard Metrics', 'System Health', 'Activity Logs', 'Orders', 'Order Status', 'Top Products', 'Revenue Comparison', 'Customer Growth', 'Hourly Distribution', 'Payment Methods', 'Conversion Metrics', 'Daily Sales', 'Review Analytics'];
    const results = [metricsRes, healthRes, logsRes, ordersRes, orderStatusRes, topProductsRes, revenueCompRes, customerGrowthRes, hourlyDistRes, paymentTrendsRes, conversionRes, dailySalesRes, reviewAnalyticsRes];
    const failures = results.map((r, i) => r.status === 'rejected' ? apiNames[i] : null).filter(Boolean);
    if (failures.length > 0) {
      setApiErrors(prev => {
        const newErrors = failures.map(name => ({ id: Date.now() + '_' + name.replace(/\s+/g, '_'), name, time: new Date() }));
        return [...prev, ...newErrors].slice(-3);
      });
    } else {
      setApiErrors([]);
    }

    cache.set(range, fetched);
    dispatch({ type: 'SET_MULTIPLE', payload: fetched });
    setLastRefreshed(new Date());
    if (!isBackground) setLoading(false);
  }, [cache]);

  // ── Manual refresh ──
  const handleManualRefresh = useCallback(() => {
    fetchDashboardData(dateRange, { skipCache: true });
  }, [dateRange, fetchDashboardData]);

  // ── Clear cache and refresh ──
  const handleClearCache = useCallback(() => {
    cache.clear();
    fetchDashboardData(dateRange, { skipCache: true });
  }, [cache, dateRange, fetchDashboardData]);

  // ── Load on mount and date range change ──
  // The ref prevents a duplicate fetch caused by React Strict Mode
  // double-rendering in development.  Date-range changes still trigger
  // fresh fetches because we track the last-fetched range.
  const lastFetchedRangeRef = useRef(null);
  useEffect(() => {
    const rangeKey = dateRange ? `${dateRange.start}_${dateRange.end}` : '';
    if (lastFetchedRangeRef.current === rangeKey) return; // already fetched this range
    lastFetchedRangeRef.current = rangeKey;
    fetchDashboardData(dateRange);
  }, [dateRange, fetchDashboardData]);

  // ── Auto-refresh interval ──
  useInterval(() => {
    fetchDashboardData(dateRange, { skipCache: true, isBackground: true });
  }, refreshInterval);

  // ── Derived data ──
  const { metrics, health, logs, liveOrders, orderStatus, topProducts,
    revenueComparison, customerGrowth, hourlyData, paymentMethods,
    conversionMetrics, dailySales, reviewAnalytics } = data;

  const comparisonChartData = useMemo(() => {
    if (!revenueComparison) return [];
    const currentMap = {};
    (revenueComparison.current || []).forEach(d => { currentMap[d.date] = d.revenue; });
    const previousMap = {};
    (revenueComparison.previous || []).forEach(d => { previousMap[d.date] = d.revenue; });
    const allDates = [...new Set([...Object.keys(currentMap), ...Object.keys(previousMap)])].sort();
    return allDates.map((date, i) => ({
      day: 'Day ' + (i + 1),
      'Current Period': currentMap[date] || 0,
      'Previous Period': previousMap[date] || 0,
    }));
  }, [revenueComparison]);

  const growthDisplay = useMemo(() =>
    Array.isArray(customerGrowth) ? customerGrowth.slice(-14) : [],
    [customerGrowth]
  );

  // ── Stable chart data/cells (memoized to prevent re-render loops) ──
  const paymentPieData = useMemo(() =>
    paymentMethods.length > 0
      ? paymentMethods.map(p => ({ name: p.method, value: p.percentage }))
      : [{ name: 'No Data', value: 100 }],
    [paymentMethods]
  );

  const paymentPieCells = useMemo(() =>
    (paymentMethods.length > 0 ? paymentMethods : [{ method: 'No Data', percentage: 100 }])
      .map((p, i) => <Cell key={p.method} fill={CHART_COLORS[i % CHART_COLORS.length]} />),
    [paymentMethods]
  );

  const orderStatusCells = useMemo(() =>
    orderStatus.map((s, i) => <Cell key={s.name} fill={PIE_COLORS[i]} />),
    [orderStatus]
  );

  const statusColor = (status) => {
    switch (status) {
      case 'New': return 'bg-brand-orange/10 text-brand-orange';
      case 'Processing': return 'bg-secondary/20 text-secondary-dark';
      case 'Shipped': return 'bg-info-bg text-info';
      case 'Delivered': return 'bg-success-bg text-success';
      default: return 'bg-surface text-text-muted';
    }
  };

  const goToInventory = () => navigate('/admin/inventory');

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
              title={'Last updated: ' + formatDateTime(lastRefreshed)}
              style={{ animation: 'fadeIn 0.3s ease' }}
            >
              {'Updated ' + (function() {
                var diff = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
                if (diff < 60) return 'just now';
                if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
                return formatTime(lastRefreshed);
              })()}
            </span>
          )}
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button className="px-4 py-2.5 border border-border rounded-xl bg-white hover:border-brand-black hover:text-brand-black transition-colors text-sm font-medium text-text-primary shadow-soft flex items-center gap-2" onClick={() => navigate('/admin/analytics')}>
            <BarChart3 size={16} /> Analytics
          </button>
          <button className="btn-dark px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2" onClick={() => navigate('/admin/orders')}>
            <Package size={16} /> View Orders
          </button>
        </div>
      </div>

      {/* API Error Banner */}
      {apiErrors.length > 0 && (
        <div className="mb-6 bg-warning-bg border border-warning/30 rounded-2xl p-4 shadow-soft">
          <div className="flex items-start gap-3">
            <span className="text-xl shrink-0 mt-0.5"><AlertTriangle size={20} /></span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-warning mb-1">Some data couldn't be loaded</div>
              <div className="text-xs text-warning/80">
                Failed to load: {apiErrors.map(e => e.name).join(', ')}.
                Data may appear incomplete.{' '}
                <button className="underline font-semibold hover:text-warning" onClick={handleManualRefresh}>Retry now</button>
              </div>
            </div>
            <button className="text-warning/50 hover:text-warning text-lg leading-none p-1" onClick={() => setApiErrors([])} aria-label="Dismiss"><X size={16} /></button>
          </div>
        </div>
      )}

      {/* Show skeleton while loading (only when no cached data is showing) */}
      {loading && (
        <div className="mb-4" style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="flex items-center justify-center gap-3 py-3 mb-6 text-sm text-text-muted bg-white border border-border rounded-2xl shadow-soft">
            <div className="spinner w-4 h-4" style={{ borderWidth: '2px' }} />
            <span>Updating dashboard data...</span>
          </div>
          <DashboardSkeleton />
        </div>
      )}

      {/* Hide everything else when loading skeletons are showing */}
      {!loading && (
      <div>
      {/* Stat Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8"
        variants={cardContainerVariants}
        initial="hidden"
        animate="show"
      >
        {[
          (() => {
            const rev = metrics.revenueChangePercent;
            const revLabel = (rev != null && !isNaN(rev)) ? (rev >= 0 ? '\u2191 ' : '\u2193 ') + Math.abs(rev).toFixed(1) + '% vs prev' : '— vs prev';
            const revColor = (rev != null && !isNaN(rev)) ? (rev >= 0 ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg') : 'text-text-muted bg-surface';
            return { icon: IndianRupee, title: 'Total Revenue', value: metrics.totalRevenue ?? 0, format: (v) => '\u20B9' + (v / 1000).toFixed(1) + 'k', change: revLabel, changeColor: revColor, gradient: 'from-[#1a1a1a] to-[#333333]' };
          })(),
          (() => {
            const ord = metrics.ordersChangePercent;
            const ordLabel = (ord != null && !isNaN(ord)) ? (ord >= 0 ? '\u2191 ' : '\u2193 ') + Math.abs(ord).toFixed(1) + '% vs prev' : '— vs prev';
            const ordColor = (ord != null && !isNaN(ord)) ? (ord >= 0 ? 'text-success bg-success-bg' : 'text-danger bg-danger-bg') : 'text-text-muted bg-surface';
            return { icon: Package, title: 'Total Orders', value: metrics.totalOrders || metrics.ordersToday || 0, format: (v) => String(Math.round(v)), change: ordLabel, changeColor: ordColor, gradient: 'from-[#27AE60] to-[#1ABC9C]' };
          })(),
          { icon: Users, title: 'Active Users', value: metrics.activeUsers || 0, format: (v) => Math.round(v).toLocaleString(), change: (metrics.newUsers || '0') + ' new in period', changeColor: 'text-success bg-success-bg', gradient: 'from-[#2980B9] to-[#3498DB]' },
          { icon: TrendingUp, title: 'Avg Order Value', value: metrics.avgOrderValue > 0 ? Number(metrics.avgOrderValue) : 0, format: (v) => '\u20B9' + Math.round(v), change: metrics.totalOrders > 0 ? 'Across ' + metrics.totalOrders + ' orders' : 'No orders yet', changeColor: 'text-info bg-info-bg', gradient: 'from-[#8E44AD] to-[#9B59B6]' },
          { icon: AlertTriangle, title: 'Low Stock Items', value: metrics.lowStockCount || 0, format: (v) => String(Math.round(v)), change: metrics.lowStockCount > 0 ? String(metrics.lowStockCount) + ' need restock' : 'All stocked', changeColor: metrics.lowStockCount > 0 ? 'text-danger bg-danger-bg' : 'text-success bg-success-bg', gradient: 'from-[#F39C12] to-[#E67E22]' },
        ].map(stat => (
          <motion.div
            key={stat.title}
            variants={cardItemVariants}
            className={'bg-white p-5 rounded-2xl border border-border shadow-soft hover:shadow-card transition-all duration-300 hover:-translate-y-1 relative overflow-hidden group' + (stat.title === 'Low Stock Items' ? ' cursor-pointer hover:border-warning' : '')}
            onClick={stat.title === 'Low Stock Items' ? goToInventory : undefined}
            role={stat.title === 'Low Stock Items' ? 'button' : undefined}
            tabIndex={stat.title === 'Low Stock Items' ? 0 : undefined}
            onKeyDown={stat.title === 'Low Stock Items' ? (e) => { if (e.key === 'Enter' || e.code === 'Space') { e.preventDefault(); goToInventory(); } } : undefined}
          >
            <div className={'absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ' + stat.gradient + ' opacity-0 group-hover:opacity-100 transition-opacity duration-300'} />
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-black/10 to-black/5 text-[#1a1a1a] flex items-center justify-center mb-3">
              <stat.icon size={20} strokeWidth={1.75} />
            </div>
            <div className="text-xs font-semibold tracking-wider text-text-muted uppercase mb-1">{stat.title}</div>
            <div className="text-2xl font-bold text-text-primary mb-2 font-display tabular-nums">
              <AnimatedNumber value={stat.value} format={stat.format} />
            </div>
            <div className={'text-[11px] font-semibold px-2 py-0.5 rounded-md w-fit ' + stat.changeColor}>{stat.change}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Conversion Metrics */}
      {conversionMetrics && (
        <SectionReveal className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
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
        </SectionReveal>
      )}

      {/* Live Orders + Revenue Comparison */}
      <SectionReveal className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 mb-8">
        <div className="bg-white border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-accent-green animate-pulse shadow-glow-green" />
              <h3 className="font-display font-bold text-text-primary">Live Orders</h3>
            </div>
            <button className="text-xs font-semibold text-brand-black hover:text-black hover:underline" onClick={() => navigate('/admin/orders')}>View All</button>
          </div>
          <div className="flex-1 overflow-auto max-h-[420px]">
            {liveOrders.map((order, idx) => (
              <motion.div
                key={order.id + '-' + idx}
                initial={{ opacity: 0, x: -14 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: EASE, delay: Math.min(idx * 0.06, 0.4) }}
                className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50 last:border-0 hover:bg-surface transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-xs font-bold shrink-0">
                  {order.customer.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-text-primary">{order.id}</span>
                    <span className={'text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ' + statusColor(order.status)}>{order.status}</span>
                  </div>
                  <div className="text-[11px] text-text-muted truncate">{order.product}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-bold text-text-primary">{'\u20B9'}{order.amount}</div>
                  <div className="text-[10px] text-text-muted">{order.time}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          className="bg-white border border-border rounded-2xl p-5 shadow-soft"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
        >
          <h3 className="font-display font-bold text-text-primary text-lg mb-1">Revenue Comparison</h3>
          <p className="text-xs text-text-muted mb-4">
            {revenueComparison ? (
              <>Current vs Previous Period &middot; Change: <span className={(revenueComparison.changePercent ?? 0) >= 0 ? 'text-success font-bold' : 'text-danger font-bold'}>{revenueComparison.changePercent >= 0 ? '+' : ''}{(revenueComparison.changePercent ?? 0).toFixed(1)}%</span></>
            ) : 'Comparing current vs previous period'}
          </p>
          <div className="h-[280px]" style={{ minWidth: '1px', minHeight: '1px', width: '100%' }}>
            {chartsReady && <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonChartData} margin={CHART_MARGIN} animationDuration={800}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={TICK_STYLE_SM} axisLine={false} tickLine={false} dy={8} />
                <YAxis tick={TICK_STYLE_SM} axisLine={false} tickLine={false} tickFormatter={FORMAT_CURRENCY_K} />
                <Tooltip formatter={FORMAT_CURRENCY_LOCALE} contentStyle={TOOLTIP_STYLE_BOLD} />
                <Legend wrapperStyle={LEGEND_STYLE_PT8} />
                <Bar dataKey="Current Period" fill="#1a1a1a" radius={BAR_RADIUS_4} maxBarSize={16} />
                <Bar dataKey="Previous Period" fill="#6b7280" radius={BAR_RADIUS_4} maxBarSize={16} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>}
          </div>
        </motion.div>
      </SectionReveal>

      {/* Order Status + Top Products */}
      <SectionReveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
          <h3 className="font-display font-bold text-text-primary text-lg mb-4">Order Status</h3>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-[180px] w-[180px] shrink-0" style={{ minWidth: '1px', minHeight: '1px' }}>
              {chartsReady && <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie animationDuration={800} data={orderStatus} innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={4} strokeWidth={0}>
                    {orderStatusCells}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>}
            </div>
            <div className="w-full flex flex-col gap-2.5">
              {orderStatus.map((s, i) => (
                <div key={s.name} className="flex items-center justify-between text-sm bg-surface p-2.5 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                    <span className="text-text-muted font-medium">{s.name}</span>
                  </div>
                  <strong className="text-text-primary">{s.value}%</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <h3 className="font-display font-bold text-text-primary text-lg">Top Selling Products</h3>
            <button className="text-xs font-semibold text-brand-black hover:text-black hover:underline" onClick={() => navigate('/admin/products')}>View All</button>
          </div>
          <div className="flex-1 overflow-auto">
            {topProducts.length > 0 ? topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-4 p-4 border-b border-border/50 last:border-0 hover:bg-surface transition-colors">
                <div className={'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ' + (i === 0 ? 'bg-brand-orange text-white shadow-glow-orange' : 'bg-surface text-text-muted border border-border')}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-text-primary text-sm">{p.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">{p.sales} units sold</div>
                </div>
                <div className="font-bold text-text-primary text-sm">{'\u20B9'}{((p.revenue || 0) / 1000).toFixed(1)}k</div>
              </div>
            )) : (
              <div className="p-8 text-center text-text-muted text-sm">No products data yet</div>
            )}
          </div>
        </div>
      </SectionReveal>

      {/* Customer Growth + Hourly Distribution */}
      <SectionReveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
          <h3 className="font-display font-bold text-text-primary text-lg mb-5">Customer Growth</h3>
          <div className="h-[250px]" style={{ minWidth: '1px', minHeight: '1px', width: '100%' }}>
            {chartsReady && <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={growthDisplay} margin={CHART_MARGIN} animationDuration={800}>
                <defs>
                  <linearGradient id="customerGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={TICK_STYLE_XS} axisLine={false} tickLine={false} dy={8} tickFormatter={FORMAT_DATE_SLICE} />
                <YAxis tick={TICK_STYLE_SM} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Area type="monotone" dataKey="totalUsers" stroke="#3b82f6" strokeWidth={2} fill="url(#customerGrad)" name="Total Users" />
                <Bar dataKey="newUsers" fill="#93c5fd" radius={BAR_RADIUS_2} maxBarSize={8} name="New Users" opacity={0.7} />
                <Legend wrapperStyle={LEGEND_STYLE} />
              </AreaChart>
            </ResponsiveContainer>}
          </div>
        </div>

        <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
          <h3 className="font-display font-bold text-text-primary text-lg mb-5">Hourly Sales Distribution</h3>
          <div className="h-[250px]" style={{ minWidth: '1px', minHeight: '1px', width: '100%' }}>
            {chartsReady && <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} margin={CHART_MARGIN} animationDuration={800}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={TICK_STYLE_XS} axisLine={false} tickLine={false} dy={8} />
                <YAxis tick={TICK_STYLE_SM} axisLine={false} tickLine={false} />
                <Tooltip formatter={FORMAT_TOOLTIP_CURRENCY} contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="orders" fill="#1a1a1a" radius={BAR_RADIUS_3} maxBarSize={12} name="Orders" />
                <Legend wrapperStyle={LEGEND_STYLE} />
              </BarChart>
            </ResponsiveContainer>}
          </div>
        </div>
      </SectionReveal>

      {/* Payment Methods + Daily Sales */}
      <SectionReveal className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
          <h3 className="font-display font-bold text-text-primary text-lg mb-4">Payment Methods</h3>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-[200px] w-[200px] shrink-0" style={{ minWidth: '1px', minHeight: '1px' }}>
              {chartsReady && <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie animationDuration={800} data={paymentPieData}
                    innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {paymentPieCells}
                  </Pie>
                  <Tooltip formatter={FORMAT_PIE_PCT} contentStyle={TOOLTIP_STYLE} />
                </PieChart>
              </ResponsiveContainer>}
            </div>
            <div className="w-full flex flex-col gap-2">
              {paymentMethods.slice(0, 6).map((p, i) => (
                <div key={p.method} className="flex items-center justify-between text-sm bg-surface p-2.5 rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-text-muted font-medium">{p.method}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">{p.count || 0} transactions</span>
                    <strong className="text-text-primary">{(p.percentage || 0).toFixed(1)}%</strong>
                  </div>
                </div>
              ))}
              {paymentMethods.length === 0 && <div className="text-sm text-text-muted text-center py-4">No payment data available</div>}
            </div>
          </div>
        </div>

        <motion.div
          className="bg-white border border-border rounded-2xl p-5 shadow-soft"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
        >
          <h3 className="font-display font-bold text-text-primary text-lg mb-5">Daily Sales (Last 14 Days)</h3>
          <div className="h-[250px]" style={{ minWidth: '1px', minHeight: '1px', width: '100%' }}>
            {chartsReady && <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySales} margin={CHART_MARGIN} animationDuration={800}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={TICK_STYLE_XS} axisLine={false} tickLine={false} dy={8} tickFormatter={FORMAT_DATE_SLICE} />
                <YAxis tick={TICK_STYLE_SM} axisLine={false} tickLine={false} tickFormatter={FORMAT_CURRENCY_K} />
                <Tooltip formatter={FORMAT_TOOLTIP_CURRENCY} contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="revenue" stroke="#1a1a1a" strokeWidth={2} dot={DOT_BLACK} name="Revenue" />
                <Bar dataKey="orders" fill="#6b7280" radius={BAR_RADIUS_3} maxBarSize={8} name="Orders" opacity={0.6} />
                <Legend wrapperStyle={LEGEND_STYLE} />
              </LineChart>
            </ResponsiveContainer>}
          </div>
        </motion.div>
      </SectionReveal>

      {/* Review Analytics */}
      {reviewAnalytics && (
        <SectionReveal className="mb-8">
          <h3 className="font-display font-bold text-text-primary text-lg mb-5">Review Analytics</h3>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
              <h4 className="font-display font-semibold text-text-primary mb-4">Rating Distribution</h4>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map(star => {
                  const item = (reviewAnalytics.rating_distribution || []).find(d => d.rating === star);
                  const pct = item?.percentage ?? 0;
                  const count = item?.count ?? 0;
                  return (
                    <div key={star} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-text-muted w-8 shrink-0">{star} {'\u2605'}</span>
                      <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden border border-border/50">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: pct + '%', background: star >= 4 ? '#22c55e' : star >= 3 ? '#f59e0b' : '#ef4444' }} />
                      </div>
                      <span className="text-xs text-text-muted w-10 text-right shrink-0">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
              <h4 className="font-display font-semibold text-text-primary mb-4">Top Reviewed Products</h4>
              <div className="space-y-3">
                {(reviewAnalytics.top_reviewed_products || []).length > 0 ? (
                  reviewAnalytics.top_reviewed_products.slice(0, 5).map((p, i) => (
                    <div key={p.product_name + '-' + i} className="flex items-center justify-between bg-surface p-3 rounded-lg border border-border/50">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-text-primary truncate">{p.product_name}</div>
                        <div className="text-xs text-text-muted mt-0.5">{p.count} reviews</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        <span className="text-sm font-bold text-yellow-600">{(p.avg_rating ?? 0).toFixed(1)}</span>
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

          {reviewAnalytics.monthly_trend && reviewAnalytics.monthly_trend.length > 0 && (
            <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
              <h4 className="font-display font-semibold text-text-primary mb-4">Average Rating Trend (12 Months)</h4>
              <div className="h-[220px]" style={{ minWidth: '1px', minHeight: '1px', width: '100%' }}>
                {chartsReady && <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={reviewAnalytics.monthly_trend} margin={CHART_MARGIN} animationDuration={800}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={TICK_STYLE_XS} axisLine={false} tickLine={false} dy={8} />
                    <YAxis domain={[0, 5]} tick={TICK_STYLE_SM} axisLine={false} tickLine={false} />
                    <Tooltip formatter={FORMAT_AVG_RATING} contentStyle={TOOLTIP_STYLE} />
                    <Line type="monotone" dataKey="avg_rating" stroke="#f59e0b" strokeWidth={2} dot={DOT_AMBER} name="Avg Rating" />
                    <Bar dataKey="total" fill="#e5e5ea" radius={BAR_RADIUS_2} maxBarSize={8} name="Total Reviews" opacity={0.5} />
                    <Legend wrapperStyle={LEGEND_STYLE} />
                  </LineChart>
                </ResponsiveContainer>}
              </div>
            </div>
          )}
        </SectionReveal>
      )}

      {/* Activity Log */}
      <SectionReveal className="bg-white border border-border rounded-2xl shadow-soft overflow-hidden mb-8">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h3 className="font-display font-bold text-text-primary text-lg">Recent Activity</h3>
          <span className="text-xs font-medium bg-surface text-text-muted px-2.5 py-1 rounded-lg border border-border">Last 24h</span>
        </div>
        <div className="p-5">
          <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
            {(logs.length ? logs : []).slice(0, 6).map((log, i) => {
              let dotColor = 'bg-info';
              if (log.type === 'success') dotColor = 'bg-accent-green';
              else if (log.type === 'warning') dotColor = 'bg-warning';
              else if (log.type === 'danger') dotColor = 'bg-danger';
              return (
                <div key={(log.id || 'log') + '-' + i} className="relative">
                  <div className={'absolute -left-[31px] w-4 h-4 rounded-full border-[3px] border-white shadow-sm ' + dotColor} />
                  <div>
                    <div className="text-sm font-medium text-text-primary leading-snug">{log.description || log.text || log.message || log.action}</div>
                    <div className="text-xs text-text-muted mt-1">{log.time || formatDateTime(log.createdAt || log.created_at) || ''}</div>
                  </div>
                </div>
              );
            })}
            {logs.length === 0 && <div className="text-sm text-text-muted py-2">No recent activity</div>}
          </div>
        </div>
      </SectionReveal>

      {/* System Health */}
      {health && (
        <SectionReveal className="flex flex-wrap gap-4 p-5 bg-charcoal text-white rounded-2xl shadow-lg mb-4">
          {[
            { label: 'Database', value: health.databaseConnection ? 'Connected' : 'Disconnected', color: health.databaseConnection ? 'bg-accent-green' : 'bg-danger', status: health.databaseConnection ? 'Healthy' : 'Unhealthy' },
            { label: 'Cache', value: health.cacheConnection ? 'Connected' : 'Disconnected', color: health.cacheConnection ? 'bg-accent-green' : 'bg-warning', status: health.cacheConnection ? 'Healthy' : 'Degraded' },
            { label: 'Disk Space', value: health.diskSpace || 'Available', color: 'bg-accent-green', status: 'Healthy' },
            { label: 'Uptime', value: health.uptime ? String(health.uptime) + 'h' : 'N/A', color: 'bg-accent-green', status: 'Running' },
          ].map((item, i) => (
            <div key={item.label} className={'flex-1 min-w-[120px] flex items-center gap-3' + (i > 0 ? ' border-l border-white/10 pl-4' : '')}>
              <div className={'w-2.5 h-2.5 rounded-full ' + item.color + ' animate-pulse'} />
              <div>
                <div className="text-[10px] tracking-widest text-white/50 uppercase font-semibold mb-0.5">{item.label}</div>
                <div className="text-sm font-medium">{item.value}</div>
              </div>
            </div>
          ))}
        </SectionReveal>
      )}
      </div>
      )}
    </div>
  );
}

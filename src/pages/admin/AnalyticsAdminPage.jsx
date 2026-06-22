import { useState, useEffect, useCallback, useRef } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, CartesianGrid, Legend } from 'recharts';
import { analyticsAPI } from '../../api/analytics';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import DateRangePicker, { getDateParams, getDefaultDateRange } from '../../components/common/DateRangePicker';
import RefreshControls from '../../components/common/RefreshControls';
import useDashboardCache from '../../hooks/useDashboardCache';
import useInterval from '../../hooks/useInterval';

const COLORS = ['#C9A96E', '#27AE60', '#2980B9', '#C0392B', '#8E44AD', '#F39C12', '#1ABC9C', '#2C3E50'];
const PIE_COLORS = ['#1a1a1a', '#22c55e', '#888888', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

export default function AnalyticsAdminPage() {
  const cache = useDashboardCache(10);
  const fetchingRef = useRef(false);
  const [dateRange, setDateRange] = useState(getDefaultDateRange());
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [sales, setSales] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orderStatus, setOrderStatus] = useState([]);
  const [payMethods, setPayMethods] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [tab, setTab] = useState('overview');
  // New state
  const [dailySales, setDailySales] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [revenueComparison, setRevenueComparison] = useState(null);
  const [customerGrowth, setCustomerGrowth] = useState([]);
  const [conversionMetrics, setConversionMetrics] = useState(null);
  const [paymentMethodTrends, setPaymentMethodTrends] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [userAnalytics, setUserAnalytics] = useState(null);

  const restoreState = useCallback((snapshot) => {
    setSales(snapshot.sales);
    setRevenue(snapshot.revenue);
    setCategories(snapshot.categories);
    setOrderStatus(snapshot.orderStatus);
    setPayMethods(snapshot.payMethods);
    setTopCustomers(snapshot.topCustomers);
    setDashboardSummary(snapshot.dashboardSummary);
    if (snapshot.dailySales) setDailySales(snapshot.dailySales);
    if (snapshot.hourlyData) setHourlyData(snapshot.hourlyData);
    if (snapshot.revenueComparison) setRevenueComparison(snapshot.revenueComparison);
    if (snapshot.customerGrowth) setCustomerGrowth(snapshot.customerGrowth);
    if (snapshot.conversionMetrics) setConversionMetrics(snapshot.conversionMetrics);
    if (snapshot.paymentMethodTrends) setPaymentMethodTrends(snapshot.paymentMethodTrends);
    if (snapshot.topProducts) setTopProducts(snapshot.topProducts);
    if (snapshot.userAnalytics) setUserAnalytics(snapshot.userAnalytics);
  }, []);

  const loadAnalytics = useCallback(async (range, { skipCache = false, isBackground = false } = {}) => {
    // Prevent concurrent fetches
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    // Check cache first (unless forced refresh)
    if (!skipCache) {
      const cached = cache.get(range);
      if (cached) {
        fetchingRef.current = false;
        restoreState(cached);
        return;
      }
    }

    if (!isBackground) setLoading(true);
    const dateParams = getDateParams(range);

    // Collect all fetched data into a local object to avoid stale closures when caching
    const fetched = {
      sales: null,
      revenue: [],
      categories: [],
      orderStatus: [],
      payMethods: [],
      topCustomers: [],
      dashboardSummary: null,
      dailySales: [],
      hourlyData: [],
      revenueComparison: null,
      customerGrowth: [],
      conversionMetrics: null,
      paymentMethodTrends: [],
      topProducts: [],
      userAnalytics: null,
    };

    // ── Fire ALL API calls in parallel using Promise.allSettled ──
    const [
      salesRes,
      revenueTrendsRes,
      categoryPerfRes,
      orderStatusRes,
      payMethodsRes,
      topCustomersRes,
      dashboardSummaryRes,
      dailySalesRes,
      hourlyDistRes,
      revenueCompRes,
      customerGrowthRes,
      conversionRes,
      paymentTrendsRes,
      productsRes,
      usersRes,
    ] = await Promise.allSettled([
      analyticsAPI.getSales(dateParams),
      analyticsAPI.getRevenueTrends(dateParams),
      analyticsAPI.getCategoryPerformance(dateParams),
      analyticsAPI.getOrderStatus(dateParams),
      analyticsAPI.getPaymentMethods(dateParams),
      analyticsAPI.getTopCustomers(dateParams),
      analyticsAPI.getDashboardSummary(dateParams),
      analyticsAPI.getDailySales(dateParams),
      analyticsAPI.getHourlyDistribution(dateParams),
      analyticsAPI.getRevenueComparison(dateParams),
      analyticsAPI.getCustomerGrowth(dateParams),
      analyticsAPI.getConversionMetrics(dateParams),
      analyticsAPI.getPaymentMethodTrends(dateParams),
      analyticsAPI.getProducts(dateParams),
      analyticsAPI.getUsers(dateParams),
    ]);

    // ── Process each result ──

    if (salesRes.status === 'fulfilled') {
      const data = salesRes.value.data?.data || salesRes.value.data;
      if (data) { fetched.sales = data; setSales(data); }
    } else { console.warn('Sales API failed:', salesRes.reason); }

    if (revenueTrendsRes.status === 'fulfilled') {
      const data = revenueTrendsRes.value.data?.data?.trends || revenueTrendsRes.value.data?.trends || revenueTrendsRes.value.data?.data || [];
      if (Array.isArray(data)) { fetched.revenue = data; setRevenue(data); }
    } else { console.warn('Revenue trends API failed:', revenueTrendsRes.reason); }

    if (categoryPerfRes.status === 'fulfilled') {
      const data = categoryPerfRes.value.data?.data?.categories || categoryPerfRes.value.data?.categories || categoryPerfRes.value.data?.data || [];
      if (Array.isArray(data)) { fetched.categories = data; setCategories(data); }
    } else { console.warn('Category performance API failed:', categoryPerfRes.reason); }

    if (orderStatusRes.status === 'fulfilled') {
      const data = orderStatusRes.value.data?.data || orderStatusRes.value.data || [];
      if (Array.isArray(data) && data.length > 0) {
        const total = data.reduce((a, b) => a + Number(b.value), 0);
        if (total > 0) {
          const mapped = data.map(s => ({
            name: s.name,
            value: Math.round((Number(s.value) / total) * 100),
          }));
          fetched.orderStatus = mapped;
          setOrderStatus(mapped);
        } else {
          const fallback = [{ name: 'No Orders', value: 100 }];
          fetched.orderStatus = fallback;
          setOrderStatus(fallback);
        }
      }
    } else { console.warn('Order status API failed:', orderStatusRes.reason); }

    if (payMethodsRes.status === 'fulfilled') {
      const data = payMethodsRes.value.data?.data?.methods || payMethodsRes.value.data?.methods || payMethodsRes.value.data?.data || [];
      if (Array.isArray(data)) { fetched.payMethods = data; setPayMethods(data); }
    } else { console.warn('Payment methods API failed:', payMethodsRes.reason); }

    if (topCustomersRes.status === 'fulfilled') {
      const data = topCustomersRes.value.data?.data?.customers || topCustomersRes.value.data?.customers || topCustomersRes.value.data?.data || [];
      if (Array.isArray(data)) { fetched.topCustomers = data; setTopCustomers(data); }
    } else { console.warn('Top customers API failed:', topCustomersRes.reason); }

    if (dashboardSummaryRes.status === 'fulfilled') {
      const data = dashboardSummaryRes.value.data?.data || dashboardSummaryRes.value.data;
      if (data) { fetched.dashboardSummary = data; setDashboardSummary(data); }
    } else { console.warn('Dashboard summary API failed:', dashboardSummaryRes.reason); }

    if (dailySalesRes.status === 'fulfilled') {
      const data = dailySalesRes.value.data?.data || dailySalesRes.value.data || [];
      if (Array.isArray(data)) { fetched.dailySales = data; setDailySales(data); }
    } else { console.warn('Daily sales API failed:', dailySalesRes.reason); }

    if (hourlyDistRes.status === 'fulfilled') {
      const data = hourlyDistRes.value.data?.data || hourlyDistRes.value.data || [];
      if (Array.isArray(data)) {
        const mapped = data.map(h => ({
          hour: h.hour + ':00',
          orders: h.orders,
          revenue: h.revenue,
        }));
        fetched.hourlyData = mapped;
        setHourlyData(mapped);
      }
    } else { console.warn('Hourly distribution API failed:', hourlyDistRes.reason); }

    if (revenueCompRes.status === 'fulfilled') {
      const data = revenueCompRes.value.data?.data || revenueCompRes.value.data;
      if (data) { fetched.revenueComparison = data; setRevenueComparison(data); }
    } else { console.warn('Revenue comparison API failed:', revenueCompRes.reason); }

    if (customerGrowthRes.status === 'fulfilled') {
      const data = customerGrowthRes.value.data?.data || customerGrowthRes.value.data || [];
      if (Array.isArray(data)) { fetched.customerGrowth = data; setCustomerGrowth(data); }
    } else { console.warn('Customer growth API failed:', customerGrowthRes.reason); }

    if (conversionRes.status === 'fulfilled') {
      const data = conversionRes.value.data?.data || conversionRes.value.data;
      if (data) { fetched.conversionMetrics = data; setConversionMetrics(data); }
    } else { console.warn('Conversion metrics API failed:', conversionRes.reason); }

    if (paymentTrendsRes.status === 'fulfilled') {
      const data = paymentTrendsRes.value.data?.data || paymentTrendsRes.value.data || [];
      if (Array.isArray(data)) { fetched.paymentMethodTrends = data; setPaymentMethodTrends(data); }
    } else { console.warn('Payment method trends API failed:', paymentTrendsRes.reason); }

    if (productsRes.status === 'fulfilled') {
      const data = productsRes.value.data?.data || productsRes.value.data || [];
      if (Array.isArray(data)) { fetched.topProducts = data.slice(0, 10); setTopProducts(data.slice(0, 10)); }
    } else { console.warn('Product analytics API failed:', productsRes.reason); }

    if (usersRes.status === 'fulfilled') {
      const data = usersRes.value.data?.data || usersRes.value.data;
      if (data) { fetched.userAnalytics = data; setUserAnalytics(data); }
    } else { console.warn('User analytics API failed:', usersRes.reason); }

    // Log any failures for debugging
    const failures = [salesRes, revenueTrendsRes, categoryPerfRes, orderStatusRes, payMethodsRes, topCustomersRes, dashboardSummaryRes, dailySalesRes, hourlyDistRes, revenueCompRes, customerGrowthRes, conversionRes, paymentTrendsRes, productsRes, usersRes]
      .filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      console.warn(`${failures.length} analytics API(s) failed (non-critical)`);
    }

    // Cache the result — always update cache with fresh data (no stale closure)
    cache.set(range, fetched);

    setLastRefreshed(new Date());
    if (!isBackground) setLoading(false);
    fetchingRef.current = false;
  }, [cache, restoreState]);

  // --- Manual refresh (bypasses cache) ---
  const handleManualRefresh = useCallback(() => {
    loadAnalytics(dateRange, { skipCache: true });
  }, [dateRange, loadAnalytics]);

  // --- Clear cache and refresh ---
  const handleClearCache = useCallback(() => {
    cache.clear();
    loadAnalytics(dateRange, { skipCache: true });
  }, [cache, dateRange, loadAnalytics]);

  useEffect(() => {
    loadAnalytics(dateRange);
    return () => { fetchingRef.current = false; };
  }, [dateRange, loadAnalytics]);

  // --- Auto-refresh interval ---
  useInterval(() => {
    loadAnalytics(dateRange, { skipCache: true, isBackground: true });
  }, refreshInterval);

  const revenueFallback = [
    { month: 'Jan', revenue: 32000 }, { month: 'Feb', revenue: 38000 }, { month: 'Mar', revenue: 41000 },
    { month: 'Apr', revenue: 35000 }, { month: 'May', revenue: 48000 }, { month: 'Jun', revenue: 52000 },
    { month: 'Jul', revenue: 61000 }, { month: 'Aug', revenue: 55000 }, { month: 'Sep', revenue: 67000 },
    { month: 'Oct', revenue: 72000 }, { month: 'Nov', revenue: 68000 }, { month: 'Dec', revenue: 85000 },
  ];

  const catFallback = [
    { name: 'Fashion', revenue: 145000, orders: 312 }, { name: 'Accessories', revenue: 89000, orders: 215 },
    { name: 'Jewellery', revenue: 112000, orders: 87 }, { name: 'Beauty', revenue: 56000, orders: 445 },
    { name: 'Footwear', revenue: 67000, orders: 156 },
  ];

  const orderFallback = [
    { name: 'Processing', value: 40 }, { name: 'Delivered', value: 35 },
    { name: 'Shipped', value: 15 }, { name: 'Cancelled', value: 7 }, { name: 'Returned', value: 3 },
  ];

  const productFallback = [
    { productName: 'Classic White Tee', unitsSold: 245, revenue: 490000 },
    { productName: 'Black Crew Neck', unitsSold: 198, revenue: 396000 },
    { productName: 'Premium Hoodie', unitsSold: 156, revenue: 468000 },
    { productName: 'Slim Fit Jeans', unitsSold: 134, revenue: 402000 },
    { productName: 'Leather Jacket', unitsSold: 89, revenue: 445000 },
    { productName: 'Summer Dress', unitsSold: 212, revenue: 424000 },
    { productName: 'Sports Shoes', unitsSold: 167, revenue: 501000 },
    { productName: 'Wool Scarf', unitsSold: 98, revenue: 98000 },
  ];

  // Build comparison chart data
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

    return allDates.map((date, i) => ({
      day: 'Day ' + (i + 1),
      'Current Period': currentMap[date] || 0,
      'Previous Period': previousMap[date] || 0,
    }));
  })();

  const growthDisplay = customerGrowth.length > 0 ? customerGrowth.slice(-14) : [];

  return (
    <div>
      <div className="admin-header-row" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 600, color: 'var(--charcoal)', marginBottom: '0.25rem', letterSpacing: '-0.01em' }}>Analytics</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Track performance across all channels</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
        </div>
      </div>

      <div className="admin-tabs-wrap" style={{ marginBottom: '1.5rem' }}>
        <button className={`admin-tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</button>
        <button className={`admin-tab ${tab === 'sales' ? 'active' : ''}`} onClick={() => setTab('sales')}>Sales</button>
        <button className={`admin-tab ${tab === 'products' ? 'active' : ''}`} onClick={() => setTab('products')}>Products</button>
        <button className={`admin-tab ${tab === 'payments' ? 'active' : ''}`} onClick={() => setTab('payments')}>Payments</button>
        <button className={`admin-tab ${tab === 'customers' ? 'active' : ''}`} onClick={() => setTab('customers')}>Customers</button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-3 py-4 mb-4 text-sm text-text-muted bg-white border border-border rounded-2xl shadow-soft">
          <div className="spinner w-5 h-5" style={{ borderWidth: '2px' }} />
          <span>Loading analytics data...</span>
        </div>
      )}

      {/* ========== OVERVIEW TAB ========== */}
      {tab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon revenue">💰</div><div className="stat-label">Total Revenue</div><div className="stat-val">{formatCurrency(dashboardSummary?.metrics?.totalRevenue || sales?.totalRevenue || sales?.revenue || sales?.total_revenue || 0)}</div><div className="stat-change stat-up">↑ {revenueComparison ? Math.abs(revenueComparison.changePercent ?? 0).toFixed(1) : '14.2'}% vs prev</div></div>
            <div className="stat-card"><div className="stat-icon orders">📦</div><div className="stat-label">Total Orders</div><div className="stat-val">{formatNumber(dashboardSummary?.metrics?.totalOrders || sales?.totalOrders || sales?.orders || sales?.total_orders || 0)}</div><div className="stat-change stat-up">↑ {conversionMetrics ? conversionMetrics.completedOrders : 0} completed</div></div>
            <div className="stat-card"><div className="stat-icon users">👥</div><div className="stat-label">Total Customers</div><div className="stat-val">{formatNumber(userAnalytics?.totalUsers || dashboardSummary?.metrics?.totalUsers || dashboardSummary?.totalCustomers || 0)}</div><div className="stat-change">{userAnalytics?.newUsers ? '↑ ' + userAnalytics.newUsers + ' new' : ''}</div></div>
            <div className="stat-card"><div className="stat-icon revenue">📊</div><div className="stat-label">AOV</div><div className="stat-val">{formatCurrency(dashboardSummary?.metrics?.avgOrderValue || dashboardSummary?.avgOrderValue || sales?.avgOrderValue || sales?.aov || sales?.average_order_value || 0)}</div><div className="stat-change">{conversionMetrics ? (conversionMetrics.conversionRate ?? 0).toFixed(1) + '% conv.' : ''}</div></div>
          </div>

          {/* Conversion Metrics Row */}
          {conversionMetrics && (
            <div className="chart-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                  {[
                    { label: 'Conversion Rate', value: (conversionMetrics.conversionRate ?? 0).toFixed(1) + '%', change: conversionMetrics.completedOrders + ' orders' },
                    { label: 'Completed Orders', value: conversionMetrics.completedOrders, change: 'Successfully processed' },
                    { label: 'Abandoned Carts', value: conversionMetrics.abandonedCarts, change: 'Did not convert' },
                    { label: 'Total Carts', value: conversionMetrics.totalCarts, change: 'In this period' },
                  ].map((item, i) => (
                    <div key={i} style={{ textAlign: 'center', padding: '1rem 0.5rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{item.label}</div>
                      <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--charcoal)' }}>{item.value}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginTop: '0.25rem' }}>{item.change}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="chart-grid">
            <div className="chart-card">
              <div className="chart-title">Revenue Trend (Monthly)</div>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={revenue.length ? revenue : revenueFallback}>
                  <defs><linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#C9A96E" stopOpacity={0.3} /><stop offset="100%" stopColor="#C9A96E" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #E8E2D9', fontSize: '0.8rem' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#C9A96E" strokeWidth={2} fill="url(#goldFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <div className="chart-title">Order Distribution</div>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={orderStatus.length ? orderStatus : orderFallback} innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {(orderStatus.length ? orderStatus : orderFallback).map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div style={{ padding: '0 0.5rem' }}>
                {(orderStatus.length ? orderStatus : orderFallback).map((s, i) => (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem', fontSize: '0.75rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i] }} />
                    <span style={{ flex: 1, color: 'var(--muted)' }}>{s.name}</span><strong>{s.value}%</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Revenue Comparison */}
          <div className="chart-card" style={{ marginTop: '1.5rem' }}>
            <div className="chart-title" style={{ marginBottom: '0.25rem' }}>Revenue Comparison (Current vs Previous Period)</div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1rem' }}>
              {revenueComparison ? (
                <>Change: <span style={{ color: revenueComparison.changePercent >= 0 ? '#27AE60' : '#E74C3C', fontWeight: 700 }}>{(revenueComparison.changePercent ?? 0) >= 0 ? '+' : ''}{(revenueComparison.changePercent ?? 0).toFixed(1)}%</span> &middot; Current: {formatCurrency(revenueComparison.currentTotal)} vs Previous: {formatCurrency(revenueComparison.previousTotal)}</>
              ) : 'Comparing revenue across two equal-length periods'}
            </p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={comparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => '₹' + v/1000 + 'k'} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: '0.8rem' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="Current Period" fill="#1a1a1a" radius={[4, 4, 0, 0]} maxBarSize={16} />
                <Bar dataKey="Previous Period" fill="#C9A96E" radius={[4, 4, 0, 0]} maxBarSize={16} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Customer Growth */}
          <div className="chart-card" style={{ marginTop: '1.5rem' }}>
            <div className="chart-title">Customer Growth</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={growthDisplay}>
                <defs><linearGradient id="custGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2980B9" stopOpacity={0.2} /><stop offset="100%" stopColor="#2980B9" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v ? v.slice(5) : ''} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: '0.8rem' }} />
                <Area type="monotone" dataKey="totalUsers" stroke="#2980B9" strokeWidth={2} fill="url(#custGrad)" name="Total Users" />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ========== SALES TAB ========== */}
      {tab === 'sales' && (
        <>
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card"><div className="stat-icon revenue">💰</div><div className="stat-label">Total Revenue</div><div className="stat-val">{formatCurrency(dashboardSummary?.metrics?.totalRevenue || sales?.totalRevenue || sales?.revenue || 0)}</div><div className="stat-change stat-up">Revenue in this period</div></div>
            <div className="stat-card"><div className="stat-icon orders">📦</div><div className="stat-label">Total Orders</div><div className="stat-val">{formatNumber(dashboardSummary?.metrics?.totalOrders || sales?.totalOrders || sales?.orders || 0)}</div><div className="stat-change">{sales?.averageOrderValue ? 'AOV: ' + formatCurrency(sales.averageOrderValue) : ''}</div></div>
            <div className="stat-card"><div className="stat-icon revenue">📊</div><div className="stat-label">Daily Avg Revenue</div><div className="stat-val">{formatCurrency(dailySales.length > 0 ? dailySales.reduce((s, d) => s + d.revenue, 0) / dailySales.length : 0)}</div><div className="stat-change">Across {dailySales.length} days</div></div>
            <div className="stat-card"><div className="stat-icon users">🕐</div><div className="stat-label">Peak Hour</div><div className="stat-val">{hourlyData.length > 0 ? (() => { const peak = [...hourlyData].sort((a, b) => b.orders - a.orders)[0]; return peak ? peak.hour : 'N/A'; })() : 'N/A'}</div><div className="stat-change">Most orders placed</div></div>
          </div>

          {/* Daily Sales Trend */}
          <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
            <div className="chart-title">Daily Sales</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v ? v.slice(5) : ''} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => '₹' + v/1000 + 'k'} />
                <Tooltip formatter={(v, name) => name === 'revenue' || name === 'aov' ? formatCurrency(v) : v} contentStyle={{ borderRadius: 8, fontSize: '0.8rem' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line type="monotone" dataKey="revenue" stroke="#1a1a1a" strokeWidth={2} dot={{ r: 3 }} name="Revenue" />
                <Line type="monotone" dataKey="aov" stroke="#C9A96E" strokeWidth={1.5} dot={{ r: 2 }} name="AOV" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Hourly Distribution */}
          <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
            <div className="chart-title">Hourly Order Distribution</div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: '0.8rem' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="orders" fill="#1a1a1a" radius={[3, 3, 0, 0]} maxBarSize={14} name="Orders" />
                <Bar dataKey="revenue" fill="#C9A96E" radius={[3, 3, 0, 0]} maxBarSize={14} name="Revenue" opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Conversion Metrics */}
          {conversionMetrics && (
            <div className="chart-card">
              <div className="chart-title">Conversion Metrics</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', padding: '1rem 0' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#27AE60' }}>{(conversionMetrics.conversionRate ?? 0).toFixed(1)}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Conversion Rate</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--charcoal)' }}>{conversionMetrics.completedOrders}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Completed Orders</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#E74C3C' }}>{conversionMetrics.abandonedCarts}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Abandoned Carts</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#3498DB' }}>{conversionMetrics.totalCarts}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Total Carts</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========== PRODUCTS TAB ========== */}
      {tab === 'products' && (
        <>
          <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
            <div className="chart-title">Top Products by Revenue</div>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={(topProducts.length ? topProducts : productFallback).slice(0, 8)} layout="vertical" margin={{ left: 100, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => '₹' + v/1000 + 'k'} />
                <YAxis dataKey="productName" type="category" tick={{ fontSize: 11, width: 100 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: '0.8rem' }} />
                <Bar dataKey="revenue" fill="#C9A96E" radius={[0, 4, 4, 0]} maxBarSize={24} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
            <div className="chart-title">Top Products by Units Sold</div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={(topProducts.length ? topProducts : productFallback).slice(0, 8)} layout="vertical" margin={{ left: 100, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis dataKey="productName" type="category" tick={{ fontSize: 11, width: 100 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: '0.8rem' }} />
                <Bar dataKey="unitsSold" fill="#2980B9" radius={[0, 4, 4, 0]} maxBarSize={24} name="Units Sold" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Category Performance */}
          <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
            <div className="chart-title">Category Performance</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categories.length ? categories : catFallback}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: '0.8rem' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="revenue" fill="#C9A96E" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="orders" fill="#27AE60" radius={[4, 4, 0, 0]} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="table-card">
            <div className="table-head"><h3>Product & Category Breakdown</h3></div>
            <table className="admin-table">
              <thead><tr><th>#</th><th>Product / Category</th><th>Revenue</th><th>Units Sold</th><th>Unit Price</th></tr></thead>
              <tbody>
                {(topProducts.length ? topProducts : productFallback).slice(0, 8).map((p, i) => (
                  <tr key={p.productId || i}>
                    <td><span style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? 'var(--gold)' : 'var(--off-white)', color: i === 0 ? '#fff' : 'var(--muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>{i + 1}</span></td>
                    <td><strong>{p.productName || p.name}</strong></td>
                    <td><strong>{formatCurrency(p.revenue)}</strong></td>
                    <td>{p.unitsSold || p.orders || p.sales || 0}</td>
                    <td>{formatCurrency(p.unitsSold ? p.revenue / p.unitsSold : 0)}</td>
                  </tr>
                ))}
                {(topProducts.length === 0 && (
                  <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">📦</div><h3>No data yet</h3><p>Product analytics will appear once you have orders.</p></div></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ========== PAYMENTS TAB ========== */}
      {tab === 'payments' && (
        <>
          <div className="chart-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="chart-card">
              <div className="chart-title">Payment Methods Distribution</div>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentMethodTrends.length > 0 ? paymentMethodTrends.map(p => ({ name: p.method, value: p.percentage })) : [{ name: 'Razorpay', value: 60 }, { name: 'COD', value: 25 }, { name: 'Wallet', value: 15 }]}
                    innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3} strokeWidth={0}>
                    {(paymentMethodTrends.length > 0 ? paymentMethodTrends : [{ method: 'Razorpay' }, { method: 'COD' }, { method: 'Wallet' }]).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => (v ?? 0).toFixed(1) + '%'} contentStyle={{ borderRadius: 8, fontSize: '0.8rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-card">
              <div className="chart-title">Payment Methods by Revenue</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={paymentMethodTrends.length > 0 ? paymentMethodTrends : [
                  { method: 'Razorpay', revenue: 245000, count: 312 },
                  { method: 'COD', revenue: 98000, count: 145 },
                  { method: 'Wallet', revenue: 45000, count: 78 },
                ]} layout="vertical" margin={{ left: 60, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => '₹' + v/1000 + 'k'} />
                  <YAxis dataKey="method" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, fontSize: '0.8rem' }} />
                  <Bar dataKey="revenue" fill="#C9A96E" radius={[0, 4, 4, 0]} maxBarSize={20} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="table-card" style={{ marginBottom: '1.5rem' }}>
            <div className="table-head"><h3>Payment Method Details</h3></div>
            <table className="admin-table">
              <thead><tr><th>Method</th><th>Transactions</th><th>Revenue</th><th>Share</th><th>Avg per Transaction</th></tr></thead>
              <tbody>
                {(paymentMethodTrends.length ? paymentMethodTrends : []).map((p, i) => (
                  <tr key={p.method || i}>
                    <td><strong>{p.method}</strong></td>
                    <td>{p.count}</td>
                    <td><strong>{formatCurrency(p.revenue)}</strong></td>
                    <td>{(p.percentage ?? 0).toFixed(1)}%</td>
                    <td>{formatCurrency(p.count ? p.revenue / p.count : 0)}</td>
                  </tr>
                ))}
                {paymentMethodTrends.length === 0 && (
                  <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">💳</div><h3>No payment data yet</h3><p>Payment analytics will appear once you have orders.</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Hourly Sales for Payments tab */}
          <div className="chart-card">
            <div className="chart-title">Hourly Sales (Order Volume)</div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: '0.8rem' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="revenue" fill="#C9A96E" stroke="#C9A96E" strokeWidth={2} fillOpacity={0.1} name="Revenue" />
                <Bar dataKey="orders" fill="#1a1a1a" radius={[3, 3, 0, 0]} maxBarSize={12} name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ========== CUSTOMERS TAB ========== */}
      {tab === 'customers' && (
        <>
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card"><div className="stat-icon users">👥</div><div className="stat-label">Total Users</div><div className="stat-val">{formatNumber(userAnalytics?.totalUsers || dashboardSummary?.metrics?.totalUsers || dashboardSummary?.totalCustomers || 0)}</div><div className="stat-change">{userAnalytics?.newUsers ? formatNumber(userAnalytics.newUsers) + ' new in period' : ''}</div></div>
            <div className="stat-card"><div className="stat-icon users">✅</div><div className="stat-label">Active Users</div><div className="stat-val">{formatNumber(userAnalytics?.activeUsers || 0)}</div><div className="stat-change">Recently logged in</div></div>
            <div className="stat-card"><div className="stat-icon revenue">💵</div><div className="stat-label">Total Customer Revenue</div><div className="stat-val">{formatCurrency(userAnalytics?.totalRevenue || 0)}</div></div>
            <div className="stat-card"><div className="stat-icon revenue">📊</div><div className="stat-label">Customer AOV</div><div className="stat-val">{formatCurrency(userAnalytics?.averageOrderValue || 0)}</div></div>
          </div>

          {/* Customer Growth Chart */}
          <div className="chart-card" style={{ marginBottom: '1.5rem' }}>
            <div className="chart-title">Customer Growth Trend</div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={growthDisplay}>
                <defs><linearGradient id="custGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2980B9" stopOpacity={0.3} /><stop offset="100%" stopColor="#2980B9" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v ? v.slice(5) : ''} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: '0.8rem' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Area type="monotone" dataKey="totalUsers" stroke="#2980B9" strokeWidth={2} fill="url(#custGrad2)" name="Total Users" />
                <Bar dataKey="newUsers" fill="#93c5fd" radius={[3, 3, 0, 0]} maxBarSize={8} name="New Users" opacity={0.7} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top Customers Table */}
          <div className="table-card">
            <div className="table-head"><h3>Top Customers</h3></div>
            <table className="admin-table">
              <thead><tr><th>#</th><th>Customer</th><th>Total Spent</th><th>Orders</th><th>LTV</th></tr></thead>
              <tbody>
                {topCustomers.length ? topCustomers.map((c, i) => (
                  <tr key={c.id || i}>
                    <td><span style={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? 'var(--gold)' : 'var(--off-white)', color: i === 0 ? '#fff' : 'var(--muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>{i + 1}</span></td>
                    <td><strong>{c.name || c.email || '—'}</strong></td>
                    <td><strong>{formatCurrency(c.totalSpent)}</strong></td>
                    <td>{c.orderCount || c.orders || 0}</td>
                    <td>{formatCurrency(c.ltv || c.totalSpent)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">👥</div><h3>No data yet</h3><p>Customer insights will appear once you have orders.</p></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

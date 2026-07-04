/**
 * Skeleton loading placeholders for the dashboard.
 * Uses the existing `.skeleton` CSS class (shimmer animation) from components.css.
 * Each skeleton section mirrors the exact layout of the real dashboard section
 * so there's no layout shift when content loads.
 */

// ── Base skeleton block ──
function S({ className = '', style = {} }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

// ── Stat Cards Row (5 cards) ──
export function SkeletonStatCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white p-5 rounded-2xl border border-border shadow-soft">
          <S className="w-10 h-10 rounded-xl mb-3" />
          <S className="w-20 h-3 mb-2" />
          <S className="w-28 h-8 mb-2" />
          <S className="w-24 h-4" />
        </div>
      ))}
    </div>
  );
}

// ── Conversion Metrics Row (4 cards) ──
export function SkeletonConversionMetrics() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="bg-white border border-border rounded-xl p-4 shadow-soft text-center">
          <S className="w-24 h-3 mx-auto mb-2" />
          <S className="w-16 h-7 mx-auto mb-1" />
          <S className="w-28 h-3 mx-auto" />
        </div>
      ))}
    </div>
  );
}

// ── Live Orders Feed ──
export function SkeletonLiveOrders() {
  return (
    <div className="bg-white border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col">
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <S className="w-2.5 h-2.5 rounded-full" />
          <S className="w-24 h-4" />
        </div>
      </div>
      <div className="flex-1 overflow-auto max-h-[420px]">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3.5 border-b border-border/50">
            <S className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <S className="w-32 h-3 mb-1" />
              <S className="w-24 h-2" />
            </div>
            <div className="text-right shrink-0">
              <S className="w-20 h-3 mb-1 ml-auto" />
              <S className="w-16 h-2 ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Revenue Comparison Chart ──
export function SkeletonRevenueChart() {
  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
      <S className="w-40 h-5 mb-1" />
      <S className="w-56 h-3 mb-4" />
      <div className="h-[280px] flex items-end gap-2 px-4">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1" style={{ height: '100%', justifyContent: 'flex-end' }}>
            <S className="w-full rounded-t" style={{ height: `${30 + Math.random() * 60}%`, maxWidth: 20 }} />
            <S className="w-full rounded-t" style={{ height: `${20 + Math.random() * 50}%`, maxWidth: 20 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Order Status Pie + Top Products ──
export function SkeletonOrderStatus() {
  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
      <S className="w-28 h-5 mb-4" />
      <div className="flex flex-col md:flex-row items-center gap-6">
        <S className="h-[180px] w-[180px] rounded-full shrink-0" />
        <div className="w-full flex flex-col gap-2.5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between bg-surface p-2.5 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <S className="w-2.5 h-2.5 rounded-full" />
                <S className="w-20 h-3" />
              </div>
              <S className="w-10 h-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonTopProducts() {
  return (
    <div className="bg-white border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col">
      <div className="p-5 border-b border-border flex justify-between items-center">
        <S className="w-40 h-5" />
        <S className="w-14 h-3" />
      </div>
      <div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border/50">
            <S className="w-8 h-8 rounded-full shrink-0" />
            <div className="flex-1">
              <S className="w-36 h-4 mb-1" />
              <S className="w-20 h-3" />
            </div>
            <S className="w-16 h-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Area/Bar Chart Skeleton ──
export function SkeletonChartCard({ titleWidth = 32 }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
      {/* Use inline style for dynamic width — Tailwind JIT can't parse template literals */}
      <S className="h-5 mb-5" style={{ width: titleWidth + 'px' }} />
      <div className="h-[250px] flex items-end gap-1.5 px-2">
        {[...Array(14)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <S className="w-full rounded-t" style={{ height: `${15 + Math.random() * 65}%`, minWidth: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payment Methods Pie Skeleton ──
export function SkeletonPaymentMethods() {
  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
      <S className="w-32 h-5 mb-4" />
      <div className="flex flex-col md:flex-row items-center gap-6">
        <S className="h-[200px] w-[200px] rounded-full shrink-0" />
        <div className="w-full flex flex-col gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between bg-surface p-2.5 rounded-lg border border-border/50">
              <div className="flex items-center gap-2">
                <S className="w-2.5 h-2.5 rounded-full" />
                <S className="w-20 h-3" />
              </div>
              <div className="flex items-center gap-3">
                <S className="w-16 h-2" />
                <S className="w-10 h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Daily Sales Line Chart Skeleton ──
export function SkeletonDailySales() {
  return (
    <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
      <S className="w-48 h-5 mb-5" />
      <div className="h-[250px] flex items-end gap-1.5 px-2">
        {[...Array(14)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <S className="w-full rounded-t" style={{ height: `${20 + Math.random() * 55}%`, minWidth: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Activity Log Timeline Skeleton ──
export function SkeletonActivityLog() {
  return (
    <div className="bg-white border border-border rounded-2xl shadow-soft overflow-hidden mb-8">
      <div className="p-5 border-b border-border flex justify-between items-center">
        <S className="w-28 h-5" />
        <S className="w-16 h-3" />
      </div>
      <div className="p-5">
        <div className="relative pl-6 space-y-5 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-border">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="relative">
              <S className="absolute -left-[31px] w-4 h-4 rounded-full border-[3px] border-white shadow-sm" />
              <S className="w-48 h-4 mb-1" />
              <S className="w-24 h-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── System Health Skeleton ──
export function SkeletonSystemHealth() {
  return (
    <div className="flex flex-wrap gap-4 p-5 bg-charcoal text-white rounded-2xl shadow-lg mb-4 opacity-60">
      {[...Array(4)].map((_, i) => (
        <div key={i} className={'flex-1 min-w-[120px] flex items-center gap-3' + (i > 0 ? ' border-l border-white/10 pl-4' : '')}>
          <S className="w-2.5 h-2.5 rounded-full" />
          <div>
            <S className="w-16 h-2 mb-1" />
            <S className="w-20 h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Review Analytics Skeleton ──
export function SkeletonReviewAnalytics() {
  return (
    <div className="mb-8">
      <S className="w-32 h-5 mb-5" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-border rounded-xl p-4 shadow-soft">
            <S className="w-20 h-3 mb-2" />
            <S className="w-14 h-7 mb-1" />
            <S className="w-24 h-3" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
          <S className="w-28 h-5 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <S className="w-8 h-3 shrink-0" />
                <S className="flex-1 h-3 rounded-full" />
                <S className="w-10 h-3 shrink-0" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-border rounded-2xl p-5 shadow-soft">
          <S className="w-32 h-5 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between bg-surface p-3 rounded-lg border border-border/50">
                <div className="flex-1 min-w-0">
                  <S className="w-36 h-4 mb-1" />
                  <S className="w-16 h-3" />
                </div>
                <S className="w-16 h-4 shrink-0 ml-3" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Complete Dashboard Skeleton Layout ──
export default function DashboardSkeleton() {
  return (
    <>
      <SkeletonStatCards />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-6 mb-8">
        <SkeletonLiveOrders />
        <SkeletonRevenueChart />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SkeletonOrderStatus />
        <SkeletonTopProducts />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SkeletonChartCard titleWidth={32} />
        <SkeletonChartCard titleWidth={36} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <SkeletonPaymentMethods />
        <SkeletonDailySales />
      </div>
      <SkeletonActivityLog />
      <SkeletonSystemHealth />
    </>
  );
}

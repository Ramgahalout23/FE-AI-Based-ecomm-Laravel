/**
 * Skeleton loading placeholders for the analytics page.
 * Uses the existing `.skeleton` CSS class (shimmer animation) from components.css.
 * Mirrors the analytics overview tab layout to prevent layout shift.
 */

function S({ className = '', style = {} }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

// ── Stat Cards Row (4 cards) ──
export function SkeletonAnalyticsStats() {
  return (
    <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="stat-card" style={{ padding: '1.25rem' }}>
          <S className="w-10 h-10 rounded-xl mb-2" />
          <S className="w-20 h-3 mb-1" />
          <S className="w-24 h-7 mb-1" />
          <S className="w-28 h-3" />
        </div>
      ))}
    </div>
  );
}

// ── Conversion Metrics Row (4 cards) ──
export function SkeletonAnalyticsConversion() {
  return (
    <div className="chart-card" style={{ marginBottom: '1.5rem', gridColumn: '1 / -1', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ textAlign: 'center', padding: '1rem 0.5rem', background: 'var(--surface)', borderRadius: '12px', border: '1px solid var(--border)' }}>
            <S className="w-20 h-3 mx-auto mb-2" />
            <S className="w-16 h-7 mx-auto mb-1" />
            <S className="w-24 h-3 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Revenue Trend Area Chart ──
export function SkeletonRevenueTrend() {
  return (
    <div className="chart-card">
      <S className="w-36 h-5 mb-4" />
      <div className="h-[250px] flex items-end gap-1.5 px-2">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <S className="w-full rounded-t" style={{ height: `${20 + Math.random() * 60}%`, minWidth: 6 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Order Distribution Pie Chart ──
export function SkeletonOrderDist() {
  return (
    <div className="chart-card">
      <S className="w-28 h-5 mb-4" />
      <S className="h-[180px] w-[180px] rounded-full mx-auto mb-4" />
      <div style={{ padding: '0 0.5rem' }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <S className="w-2 h-2 rounded-full shrink-0" />
            <S className="flex-1 h-3" />
            <S className="w-8 h-3" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Revenue Comparison Bar Chart ──
export function SkeletonRevenueComparison() {
  return (
    <div className="chart-card" style={{ marginTop: '1.5rem' }}>
      <S className="w-56 h-5 mb-1" />
      <S className="w-64 h-3 mb-4" />
      <div className="h-[250px] flex items-end gap-2 px-4">
        {[...Array(12)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1" style={{ height: '100%', justifyContent: 'flex-end' }}>
            <S className="w-full rounded-t" style={{ height: `${25 + Math.random() * 55}%`, maxWidth: 16 }} />
            <S className="w-full rounded-t" style={{ height: `${15 + Math.random() * 45}%`, maxWidth: 16 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Customer Growth Area Chart ──
export function SkeletonCustomerGrowth() {
  return (
    <div className="chart-card" style={{ marginTop: '1.5rem' }}>
      <S className="w-32 h-5 mb-4" />
      <div className="h-[220px] flex items-end gap-1.5 px-2">
        {[...Array(14)].map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <S className="w-full rounded-t" style={{ height: `${15 + Math.random() * 70}%`, minWidth: 5 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Complete Analytics Skeleton (Overview tab layout) ──
export default function AnalyticsSkeleton() {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <SkeletonAnalyticsStats />
      <div className="chart-grid" style={{ marginBottom: '1.5rem' }}>
        <SkeletonRevenueTrend />
        <SkeletonOrderDist />
      </div>
      <SkeletonRevenueComparison />
      <SkeletonCustomerGrowth />
    </div>
  );
}

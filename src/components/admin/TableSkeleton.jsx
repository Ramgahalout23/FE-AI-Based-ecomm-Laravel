/**
 * Reusable table skeleton for admin list pages (Orders, Products, Users).
 * Uses the existing `.skeleton` CSS class (shimmer animation) from components.css.
 *
 * Props:
 * - rows: number of table rows to show (default 6)
 * - columns: number of table columns (default 6)
 * - showStatsGrid: boolean — renders an 8-card stats grid above the table
 * - showHeader: boolean — renders a header skeleton above toolbar
 */

function S({ className = '', style = {} }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function StatsGridSkeleton() {
  return (
    <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
      {[...Array(8)].map((_, i) => (
        <div key={i} className="stat-card" style={{ padding: '1.25rem' }}>
          <S className="w-16 h-3 mb-2" />
          <S className="w-12 h-7" />
        </div>
      ))}
    </div>
  );
}

export function TableToolbarSkeleton() {
  return (
    <div className="table-toolbar">
      <S className="h-9 flex-1 max-w-[260px] rounded-lg" />
      <S className="h-9 w-[140px] rounded-lg" />
      <S className="h-9 w-[120px] rounded-lg" />
      <S className="h-4 w-20" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 6 }) {
  return (
    <tr>
      {[...Array(columns)].map((_, i) => (
        <td key={i}>
          <S style={{
            width: i === 0 ? '60%' : i === columns - 1 ? '40%' : '50%',
            height: '14px',
          }} />
        </td>
      ))}
    </tr>
  );
}

export default function TableSkeleton({
  rows = 6,
  columns = 6,
  showStatsGrid = false,
  showHeader = false,
}) {
  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="flex items-center justify-center gap-3 py-3 mb-4 text-sm text-text-muted bg-white border border-border rounded-2xl shadow-soft">
        <div className="spinner w-4 h-4" style={{ borderWidth: '2px' }} />
        <span>Loading data...</span>
      </div>

      {showHeader && (
        <div className="admin-header" style={{ marginBottom: '1.5rem' }}>
          <S className="w-32 h-6 mb-1" />
          <S className="w-48 h-3" />
        </div>
      )}

      {showStatsGrid && <StatsGridSkeleton />}

      <div className="table-card">
        <TableToolbarSkeleton />
        <table className="admin-table">
          <thead>
            <tr>
              {[...Array(columns)].map((_, i) => (
                <th key={i}>
                  <S className="w-16 h-3" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(rows)].map((_, i) => (
              <TableRowSkeleton key={i} columns={columns} />
            ))}
          </tbody>
        </table>
        <div className="pagination" style={{ padding: '1.5rem' }}>
          <div className="flex items-center justify-center gap-2">
            <S className="w-9 h-9 rounded-lg" />
            <S className="w-9 h-9 rounded-lg" />
            <S className="w-9 h-9 rounded-lg" />
            <S className="w-16 h-4 mx-2" />
            <S className="w-10 h-9 rounded-lg" />
            <S className="w-10 h-9 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

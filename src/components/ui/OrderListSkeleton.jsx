import Skeleton from './Skeleton';

/**
 * OrderListRowSkeleton — Placeholder for a single row in the orders table
 */
export function OrderListRowSkeleton() {
  return (
    <tr style={{ borderBottom: '1px solid #e5e5ea' }}>
      <td style={{ padding: '1rem 1.5rem' }}><Skeleton className="!w-20 !h-4 !rounded-md" /></td>
      <td style={{ padding: '1rem 1.5rem' }}><Skeleton className="!w-24 !h-4 !rounded-md" /></td>
      <td style={{ padding: '1rem 1.5rem' }}><Skeleton className="!w-12 !h-4 !rounded-md" /></td>
      <td style={{ padding: '1rem 1.5rem' }}><Skeleton className="!w-16 !h-4 !rounded-md" /></td>
      <td style={{ padding: '1rem 1.5rem' }}><Skeleton className="!w-20 !h-5 !rounded-full" /></td>
      <td style={{ padding: '1rem 1.5rem' }}><Skeleton className="!w-16 !h-8 !rounded-md" /></td>
    </tr>
  );
}

/**
 * OrderListSkeleton — Full orders page skeleton with table
 */
export default function OrderListSkeleton() {
  return (
    <div className="section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Breadcrumb skeleton */}
        <div className="flex gap-2 mb-6">
          <Skeleton className="!w-12 !h-4 !rounded-md" />
          <Skeleton className="!w-8 !h-4 !rounded-md" />
          <Skeleton className="!w-20 !h-4 !rounded-md" />
        </div>
      </div>
      <div className="section-header">
        <div>
          <Skeleton className="!w-16 !h-3 !rounded-md mb-2" />
          <Skeleton className="!w-32 !h-8 !rounded-lg" />
        </div>
      </div>
      <div className="table-card">
        <table className="admin-table">
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e5ea' }}>
              {['Order ID', 'Date', 'Items', 'Total', 'Status', 'Action'].map((h, i) => (
                <th key={i} style={{ padding: '0.75rem 1.5rem' }}>
                  <Skeleton className="!w-16 !h-3 !rounded-md" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <OrderListRowSkeleton key={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

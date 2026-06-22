import Skeleton from './Skeleton';

/**
 * OrderDetailSkeleton — Full order detail page skeleton
 * Matches the layout of OrderDetailPage (breadcrumb, title, timeline, items, summary).
 */
export default function OrderDetailSkeleton() {
  return (
    <div className="section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {/* Breadcrumb */}
        <div className="flex gap-2 mb-6">
          <Skeleton className="!w-12 !h-4 !rounded-md" />
          <Skeleton className="!w-8 !h-4 !rounded-md" />
          <Skeleton className="!w-16 !h-4 !rounded-md" />
          <Skeleton className="!w-8 !h-4 !rounded-md" />
          <Skeleton className="!w-24 !h-4 !rounded-md" />
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <Skeleton className="!w-56 !h-8 !rounded-lg mb-2" />
          <Skeleton className="!w-32 !h-4 !rounded-md" />
        </div>
        <Skeleton className="!w-24 !h-7 !rounded-full" />
      </div>

      {/* Timeline skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5rem', background: '#f8f6f3', borderRadius: 8, marginBottom: '1.5rem' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flex: 1 }}>
            <Skeleton className="!w-7 !h-7 !rounded-full" />
            <Skeleton className="!w-16 !h-3 !rounded-md" />
          </div>
        ))}
      </div>

      {/* Items table */}
      <div className="table-card" style={{ marginBottom: '1.5rem' }}>
        <div className="table-head">
          <Skeleton className="!w-20 !h-5 !rounded-md" />
        </div>
        <table className="admin-table">
          <thead>
            <tr style={{ borderBottom: '1px solid #e5e5ea' }}>
              {['Product', 'Qty', 'Price', 'Total'].map((h, i) => (
                <th key={i} style={{ padding: '0.75rem 1.5rem' }}>
                  <Skeleton className="!w-14 !h-3 !rounded-md" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 2 }).map((_, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #e5e5ea' }}>
                <td style={{ padding: '1rem 1.5rem' }}><Skeleton className="!w-48 !h-4 !rounded-md" /></td>
                <td style={{ padding: '1rem 1.5rem' }}><Skeleton className="!w-8 !h-4 !rounded-md" /></td>
                <td style={{ padding: '1rem 1.5rem' }}><Skeleton className="!w-16 !h-4 !rounded-md" /></td>
                <td style={{ padding: '1rem 1.5rem' }}><Skeleton className="!w-16 !h-4 !rounded-md" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Total + Cancel button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton className="!w-32 !h-6 !rounded-md" />
        <Skeleton className="!w-28 !h-9 !rounded-md" />
      </div>
    </div>
  );
}

import Skeleton from './Skeleton';

/**
 * NotificationsSkeleton — Placeholder for the notifications list page
 */
export function NotificationItemSkeleton() {
  return (
    <div style={{
      background: '#f8f6f3',
      border: '1px solid #e5e5ea',
      borderRadius: 8,
      padding: '1rem 1.25rem',
      borderLeft: '3px solid #ddd',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem' }}>
        <Skeleton className="!w-40 !h-4 !rounded-md" />
        <Skeleton className="!w-16 !h-3 !rounded-md" />
      </div>
      <Skeleton className="!w-full !h-3 !rounded-md mt-2" />
      <Skeleton className="!w-3/4 !h-3 !rounded-md mt-1" />
    </div>
  );
}

/**
 * NotificationsSkeleton — Full notifications page skeleton
 */
export default function NotificationsSkeleton() {
  return (
    <div className="section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="flex gap-2 mb-6">
          <Skeleton className="!w-12 !h-4 !rounded-md" />
          <Skeleton className="!w-8 !h-4 !rounded-md" />
          <Skeleton className="!w-24 !h-4 !rounded-md" />
        </div>
      </div>
      <div className="section-header">
        <div>
          <Skeleton className="!w-16 !h-3 !rounded-md mb-2" />
          <Skeleton className="!w-40 !h-8 !rounded-lg" />
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <NotificationItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

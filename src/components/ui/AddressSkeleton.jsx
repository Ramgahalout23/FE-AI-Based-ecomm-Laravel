import Skeleton from './Skeleton';

/**
 * AddressCardSkeleton — Placeholder for a single address card
 */
export function AddressCardSkeleton() {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e5ea',
      borderRadius: 10,
      padding: '1.25rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Skeleton className="!w-4 !h-4 !rounded-md" />
          <Skeleton className="!w-16 !h-4 !rounded-md" />
        </div>
        <Skeleton className="!w-14 !h-5 !rounded-full" />
      </div>
      <div className="space-y-1.5">
        <Skeleton className="!w-48 !h-3 !rounded-md" />
        <Skeleton className="!w-36 !h-3 !rounded-md" />
        <Skeleton className="!w-40 !h-3 !rounded-md" />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <Skeleton className="!w-20 !h-7 !rounded-md" />
        <Skeleton className="!w-8 !h-7 !rounded-md" />
      </div>
    </div>
  );
}

/**
 * AddressSkeleton — Full addresses page skeleton
 */
export default function AddressSkeleton() {
  return (
    <div className="section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        <div className="flex gap-2 mb-6">
          <Skeleton className="!w-12 !h-4 !rounded-md" />
          <Skeleton className="!w-8 !h-4 !rounded-md" />
          <Skeleton className="!w-20 !h-4 !rounded-md" />
          <Skeleton className="!w-8 !h-4 !rounded-md" />
          <Skeleton className="!w-20 !h-4 !rounded-md" />
        </div>
      </div>
      <div className="section-header">
        <div>
          <Skeleton className="!w-16 !h-3 !rounded-md mb-2" />
          <Skeleton className="!w-36 !h-8 !rounded-lg" />
        </div>
        <Skeleton className="!w-28 !h-8 !rounded-md" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <AddressCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

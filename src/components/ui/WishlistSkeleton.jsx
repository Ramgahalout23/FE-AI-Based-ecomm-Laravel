import Skeleton from './Skeleton';

/**
 * WishlistSkeleton — Placeholder for the wishlist page
 * Matches the wishlist grid layout (2-3 column grid of items).
 */
export default function WishlistSkeleton() {
  return (
    <div className="wishlist-page">
      <div className="max-w-7xl mx-auto px-4 pt-6 sm:pt-8">
        <div className="flex gap-2 mb-6">
          <Skeleton className="!w-12 !h-4 !rounded-md" />
          <Skeleton className="!w-8 !h-4 !rounded-md" />
          <Skeleton className="!w-16 !h-4 !rounded-md" />
        </div>
      </div>

      {/* Header */}
      <div className="wishlist-header">
        <div className="wishlist-header-left">
          <Skeleton className="!w-12 !h-12 !rounded-xl" />
          <div>
            <Skeleton className="!w-36 !h-6 !rounded-lg mb-1" />
            <Skeleton className="!w-28 !h-3 !rounded-md" />
          </div>
        </div>
        <div className="wishlist-header-right">
          <Skeleton className="!w-20 !h-7 !rounded-full" />
        </div>
      </div>

      {/* Items Grid — 3 columns */}
      <div className="wishlist-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="wishlist-item" style={{ border: '1px solid #e5e5ea', borderRadius: 12, overflow: 'hidden' }}>
            {/* Image */}
            <Skeleton className="!w-full !aspect-[3/4] !rounded-none" />
            {/* Info */}
            <div className="p-4 space-y-3">
              <Skeleton className="!w-3/4 !h-4 !rounded-md" />
              <div className="flex items-center gap-2">
                <Skeleton className="!w-16 !h-5 !rounded-md" />
                <Skeleton className="!w-12 !h-3 !rounded-md line-through" />
              </div>
              <Skeleton className="!w-24 !h-3 !rounded-md" />
              <Skeleton className="!w-full !h-9 !rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import Skeleton from './Skeleton';

/**
 * ProductCardSkeleton — Placeholder for a single product card
 * Matches the dimensions of ProductCard (3:4 aspect ratio image, info below).
 */
export default function ProductCardSkeleton({ className = '' }) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden border border-gray-100 ${className}`}>
      {/* Image area — 3:4 aspect ratio */}
      <Skeleton className="!w-full !aspect-[3/4] !rounded-none" />
      {/* Info area */}
      <div className="p-4 space-y-3">
        <Skeleton className="!w-16 !h-3 !rounded-md" />
        <Skeleton className="!w-40 !h-4 !rounded-md" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="!w-14 !h-5 !rounded" />
          <Skeleton className="!w-12 !h-3 !rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="!w-20 !h-7 !rounded-md" />
          <Skeleton className="!w-14 !h-4 !rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * ProductGridSkeleton — Grid of product card skeletons
 * @param {number} count - Number of skeleton cards (default: 8)
 * @param {string} gridClass - Tailwind grid classes (default: grid-cols-2 md:grid-cols-4)
 */
export function ProductGridSkeleton({ count = 8, gridClass = 'grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6' }) {
  return (
    <div className={gridClass}>
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

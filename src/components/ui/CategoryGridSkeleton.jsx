import Skeleton from './Skeleton';

/**
 * CategoryCardSkeleton — Placeholder for a single category card
 */
export function CategoryCardSkeleton() {
  return (
    <div style={{
      background: '#fff',
      border: '2px solid #e5e5ea',
      borderRadius: 16,
      padding: '1.5rem 1rem',
      textAlign: 'center',
    }}>
      <Skeleton className="!w-12 !h-12 !rounded-full mx-auto mb-3" />
      <Skeleton className="!w-24 !h-4 !rounded-md mx-auto mb-1" />
      <Skeleton className="!w-16 !h-3 !rounded-md mx-auto" />
    </div>
  );
}

/**
 * CategoryGridSkeleton — Grid of category card skeletons
 * @param {number} count - Number of skeleton cards (default: 8)
 */
export default function CategoryGridSkeleton({ count = 8 }) {
  return (
    <section className="py-12 md:py-16">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <Skeleton className="!w-16 !h-3 !rounded-md mx-auto mb-2" />
          <Skeleton className="!w-48 !h-8 !rounded-lg mx-auto" />
        </div>
        <div className="cat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
          {Array.from({ length: count }).map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

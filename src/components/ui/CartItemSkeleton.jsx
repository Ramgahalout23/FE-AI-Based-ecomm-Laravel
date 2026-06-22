import Skeleton from './Skeleton';

/**
 * CartItemSkeleton — Placeholder for a single cart item row
 * Matches the layout of cart items in CartPage (image + details + quantity + price).
 */
export function CartItemSkeleton() {
  return (
    <div className="flex gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl">
      {/* Product Image */}
      <Skeleton className="!w-20 sm:!w-24 !h-20 sm:!h-24 !rounded-lg sm:!rounded-xl shrink-0" />
      {/* Product Details */}
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="!w-3/4 !h-4 !rounded-md" />
            <Skeleton className="!w-20 !h-3 !rounded-md" />
          </div>
          <Skeleton className="!w-8 !h-8 !rounded-lg shrink-0" />
        </div>
        <div className="flex items-center justify-between mt-auto">
          {/* Quantity Controls */}
          <div className="flex items-center gap-1">
            <Skeleton className="!w-8 !h-8 !rounded-lg" />
            <Skeleton className="!w-8 !h-5 !rounded" />
            <Skeleton className="!w-8 !h-8 !rounded-lg" />
          </div>
          {/* Price */}
          <Skeleton className="!w-20 !h-5 !rounded-md" />
        </div>
      </div>
    </div>
  );
}

/**
 * CartSummarySkeleton — Placeholder for the order summary sidebar
 */
export function CartSummarySkeleton() {
  return (
    <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
      <Skeleton className="!w-40 !h-6 !rounded-md" />
      <div className="space-y-3 border-t pt-4">
        <div className="flex justify-between">
          <Skeleton className="!w-24 !h-4 !rounded-md" />
          <Skeleton className="!w-16 !h-4 !rounded-md" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="!w-20 !h-4 !rounded-md" />
          <Skeleton className="!w-12 !h-4 !rounded-md" />
        </div>
        <div className="flex justify-between pt-3 border-t">
          <Skeleton className="!w-16 !h-5 !rounded-md" />
          <Skeleton className="!w-20 !h-5 !rounded-md" />
        </div>
      </div>
      <Skeleton className="!w-full !h-12 !rounded-xl" />
    </div>
  );
}

/**
 * CartPageSkeleton — Full cart page loading state (items + summary)
 */
export default function CartPageSkeleton() {
  return (
    <div className="page-content bg-white flex-1">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        {/* Breadcrumb skeleton */}
        <div className="flex gap-2 mb-6">
          <Skeleton className="!w-12 !h-4 !rounded-md" />
          <Skeleton className="!w-8 !h-4 !rounded-md" />
          <Skeleton className="!w-10 !h-4 !rounded-md" />
        </div>
        {/* Title */}
        <Skeleton className="!w-64 !h-8 !rounded-lg mb-8" />
        {/* Grid */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          <div className="md:col-span-2 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <CartItemSkeleton key={i} />
            ))}
          </div>
          <div className="lg:sticky lg:top-8 h-fit">
            <CartSummarySkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

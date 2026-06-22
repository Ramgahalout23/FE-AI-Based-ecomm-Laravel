import Skeleton from './Skeleton';

/**
 * PageContentSkeleton — Placeholder for CMS/content pages
 * Shows a centered skeleton with breadcrumb, title, and content blocks.
 */
export default function PageContentSkeleton({ withBreadcrumb = true }) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 sm:py-16">
      {withBreadcrumb && (
        <div className="flex gap-2 mb-8 justify-center">
          <Skeleton className="!w-12 !h-4 !rounded-md" />
          <Skeleton className="!w-8 !h-4 !rounded-md" />
          <Skeleton className="!w-20 !h-4 !rounded-md" />
        </div>
      )}
      <div className="flex flex-col items-center text-center">
        {/* Title */}
        <Skeleton className="!w-64 !h-10 !rounded-lg mb-4" />
        <Skeleton className="!w-48 !h-4 !rounded-md mb-8" />

        {/* Content blocks */}
        <div className="w-full space-y-4">
          <Skeleton className="!w-full !h-4 !rounded-md" />
          <Skeleton className="!w-full !h-4 !rounded-md" />
          <Skeleton className="!w-3/4 !h-4 !rounded-md" />
          <div className="pt-4">
            <Skeleton className="!w-full !h-4 !rounded-md mb-2" />
            <Skeleton className="!w-full !h-4 !rounded-md mb-2" />
            <Skeleton className="!w-5/6 !h-4 !rounded-md mb-2" />
            <Skeleton className="!w-2/3 !h-4 !rounded-md" />
          </div>
          <div className="pt-4">
            <Skeleton className="!w-full !h-4 !rounded-md mb-2" />
            <Skeleton className="!w-4/5 !h-4 !rounded-md mb-2" />
            <Skeleton className="!w-3/4 !h-4 !rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

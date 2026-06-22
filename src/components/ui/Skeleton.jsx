/**
 * Skeleton — Base primitive for all skeleton loading states.
 * Uses the `.skeleton` CSS class defined in components.css (shimmer animation).
 *
 * Usage:
 *   <Skeleton className="!w-full !h-5 !rounded-md" />
 *   <Skeleton className="!w-40 !h-10 !rounded-lg" />
 *
 * Using `!` prefix overrides the default `border-radius: 12px` from `.skeleton`.
 */

export default function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

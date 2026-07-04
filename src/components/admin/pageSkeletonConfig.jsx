/**
 * pageSkeletonConfig.js
 *
 * Central registry for all admin page skeleton configurations.
 *
 * Usage:
 * ```jsx
 * import { PageSkeleton } from '../../components/admin/pageSkeletonConfig';
 *
 * // Direct usage:
 * {loading && <PageSkeleton page="orders" />}
 *
 * // With AdminPageShell:
 * <AdminPageShell page="orders" ...>
 * ```
 *
 * To change a page's skeleton, edit the PAGE_SKELETON_CONFIG object below.
 * No need to hunt down individual JSX files.
 */

import TableSkeleton from './TableSkeleton';

/**
 * Skeleton configuration for each admin page.
 *
 * Key convention: lowercase plural, matching the page's route/purpose.
 *
 * Properties:
 *   columns    — number of table columns in the skeleton
 *   rows       — number of table rows in the skeleton
 *   showStatsGrid — show stat cards above the table skeleton (default false)
 */
export const PAGE_SKELETON_CONFIG = {
  orders:          { columns: 6, rows: 6, showStatsGrid: true },
  products:        { columns: 6, rows: 8 },
  users:           { columns: 6, rows: 6 },
  brands:          { columns: 5, rows: 6 },
  categories:      { columns: 6, rows: 6 },
  variants:        { columns: 9, rows: 6 },
  banners:         { columns: 6, rows: 6 },
  shipping:        { columns: 7, rows: 6 },
  coupons:         { columns: 8, rows: 8 },
  payments:        { columns: 7, rows: 6, showStatsGrid: true },
  reviews:         { columns: 7, rows: 8 },
  'abandoned-carts': { columns: 6, rows: 8 },
  inventory:       { columns: 5, rows: 8 },
  'curated-looks': { columns: 7, rows: 8 },
  currency:        { columns: 8, rows: 8 },
};

/**
 * Return the full skeleton props for a given page key.
 * Falls back to { columns: 6, rows: 6 } if the key is unknown.
 */
export function getSkeletonProps(pageKey) {
  return PAGE_SKELETON_CONFIG[pageKey] ?? { columns: 6, rows: 6 };
}

/**
 * Convenience component: renders the correct <TableSkeleton> for a page key.
 *
 * Props:
 *   page   — key into PAGE_SKELETON_CONFIG (required)
 *   ...rest — any extra props forwarded to <TableSkeleton> (e.g. showHeader)
 *
 * Example:
 *   <PageSkeleton page="orders" />
 *   // Equivalent to: <TableSkeleton columns={6} rows={6} showStatsGrid />
 */
export function PageSkeleton({ page, ...rest }) {
  const props = getSkeletonProps(page);
  return <TableSkeleton {...props} {...rest} />;
}

export default PageSkeleton;

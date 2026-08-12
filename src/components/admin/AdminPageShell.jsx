/**
 * AdminPageShell — a standardized wrapper for admin list pages.
 *
 * Handles:
 * - Loading state (shows a skeleton)
 * - Error state (shows a dismissable error alert)
 * - Premium content entrance (fade + slide-up via framer-motion)
 * - Optional page header (title + subtitle)
 *
 * Usage (preferred — uses pageSkeletonConfig):
 * ```jsx
 * <AdminPageShell
 *   page="coupons"
 *   title="Coupons"
 *   subtitle="Manage discount codes"
 *   loading={loading}
 *   error={error}
 * >
 *   <div className="table-card">...</div>
 * </AdminPageShell>
 * ```
 *
 * Usage (custom skeleton):
 * ```jsx
 * <AdminPageShell
 *   title="Coupons"
 *   subtitle="Manage discount codes"
 *   loading={loading}
 *   error={error}
 *   skeleton={<CustomSkeleton />}
 * >
 *   <div className="table-card">...</div>
 * </AdminPageShell>
 * ```
 */

import { motion } from 'framer-motion';
import { PageSkeleton } from './pageSkeletonConfig';

// ── Premium motion presets (share the design system's easing curve) ──
const EASE = [0.16, 1, 0.3, 1];

// ── Shared error alert ──
function ErrorAlert({ error, onDismiss }) {
  if (!error) return null;
  return (
    <motion.div
      className="admin-alert danger mb-4"
      role="alert"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <span className="admin-alert-icon">⚠️</span>
      <div className="admin-alert-body">
        <div className="admin-alert-title">Error Loading Data</div>
        <div>{error}</div>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          style={{
            background: 'none', border: 'none', color: 'inherit',
            cursor: 'pointer', fontSize: '1rem', padding: '0.25rem',
            marginLeft: 'auto', opacity: 0.7, flexShrink: 0,
          }}
          aria-label="Dismiss error"
        >
          ✕
        </button>
      )}
    </motion.div>
  );
}

// ── Optional header ──
function PageHeader({ title, subtitle, actions }) {
  if (!title && !subtitle && !actions) return null;
  return (
    <motion.div
      className="admin-header admin-header-row"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <div>
        {title && <h2>{title}</h2>}
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {actions}
        </div>
      )}
    </motion.div>
  );
}

export default function AdminPageShell({
  title,
  subtitle,
  page,
  loading = false,
  error = null,
  skeleton = null,
  onDismissError,
  actions,
  children,
  className = '',
  style = {},
}) {
  return (
    <div className={className} style={style}>
      {/* Page header */}
      <PageHeader title={title} subtitle={subtitle} actions={actions} />

      {/* Error alert (visible even during loading so API failures don't cause blank skeleton) */}
      {error && (
        <ErrorAlert error={error} onDismiss={onDismissError} />
      )}

      {/* Loading skeleton */}
      {loading && (
        <div style={{ animation: 'fadeIn 0.3s ease' }}>
          <div className="flex items-center justify-center gap-3 py-3 mb-4 text-sm text-text-muted bg-white border border-border rounded-2xl shadow-soft">
            <div className="spinner w-4 h-4" style={{ borderWidth: '2px' }} />
            <span>Loading data...</span>
          </div>
          {page ? <PageSkeleton page={page} /> : skeleton}
        </div>
      )}

      {/* Content with premium entrance */}
      {!loading && (
        <motion.div
          className="admin-shell-content"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.05 }}
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

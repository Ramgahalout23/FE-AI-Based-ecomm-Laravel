import React from 'react';
import hotToast, { Toaster } from 'react-hot-toast';
import OrderConfirmedToast from './OrderConfirmedToast';

/* ── Wrapper API (default export) ──────────────── */
// This wrapper ensures ALL files that import `toast` get consistent duration defaults.
// Instead of `import toast from 'react-hot-toast'`, use `import toast from '../../utils/toast'`.

// ── Detect if we're on a storefront route (not admin) ──
// Decorative success/info toasts are suppressed on the storefront for a
// cleaner UX (the cart drawer and inline UI give their own feedback).
// Error toasts are NEVER suppressed — checkout validation, coupon errors and
// payment failures rely on them being visible.
const isStorefront = () => {
  if (typeof window === 'undefined') return false;
  const path = window.location.pathname;
  return !path.startsWith('/admin');
};

const toast = {
  success: (message, opts = {}) => {
    if (isStorefront()) return;
    hotToast.success(message, { duration: 3000, ...opts });
  },
  error: (message, opts = {}) => {
    hotToast.error(message, { duration: 4000, ...opts });
  },
  info: (message, opts = {}) => {
    if (isStorefront()) return;
    hotToast(message, { duration: 3000, ...opts });
  },
  custom: (component, opts = {}) => {
    if (isStorefront()) return;
    hotToast.custom(component, opts);
  },
  loading: (message, opts = {}) => {
    if (isStorefront()) return '';
    return hotToast.loading(message, {
      style: {
        background: '#ffffff',
        borderRadius: '16px',
        padding: '14px 20px 18px',
        boxShadow: '0 12px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
      },
      ...opts,
    });
  },
  dismiss: (toastId) => hotToast.dismiss(toastId),
  promise: (promise, msgs, opts) => {
    if (isStorefront()) return promise;
    return hotToast.promise(promise, msgs, opts);
  },
  remove: (toastId) => hotToast.remove(toastId),
};

export { Toaster };

/* ── Generic helpers ────────────────────────────── */

/**
 * Show a generic success toast with consistent styling.
 * Accepts extra options that are merged over defaults.
 */
export const showSuccess = (message, opts = {}) =>
  toast.success(message, opts);

/**
 * Show a generic error toast with consistent styling.
 */
export const showError = (message, opts = {}) =>
  toast.error(message, opts);

/**
 * Safely handle an API error response: extract the message and show it.
 * If no message can be extracted, falls back to `fallback`.
 */
export const handleApiError = (err, fallback = 'Something went wrong') => {
  const message =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;
  showError(message);
  return message;
};

/* ── Cart / Bag ───────────────────────────────────
   Intentionally silent — the cart drawer itself gives visual
   feedback, so adding/removing items shows no toast. */

export const addedToCart = () => {};

export const removedFromCart = () => {};

export const removedFromBag = () => {};

/* ── Wishlist ───────────────────────────────────── */

export const addedToWishlist = () => {
  if (isStorefront()) return;
  showSuccess('Added to wishlist');
};

export const removedFromWishlist = () => {
  if (isStorefront()) return;
  showSuccess('Removed from wishlist');
};

export const wishlistError = () => {
  showError('Could not update wishlist');
};

export const movedToCart = (productName) => {
  if (isStorefront()) return;
  showSuccess(`${productName || 'Item'} moved to cart`);
};

export const linkCopied = () => {
  if (isStorefront()) return;
  showSuccess('Link copied to clipboard!');
};

export const wishlistCleared = () => {
  if (isStorefront()) return;
  showSuccess('Wishlist cleared', { duration: 2000 });
};

/* ── Premium Order Confirmed Toast ─────────────── */

export const orderPlaced = (orderId) => {
  if (isStorefront()) return;
  hotToast.custom(
    (t) => {
      return React.createElement(
        'div',
        {
          className: 'toast-premium',
          style: {
            background: '#ffffff',
            borderRadius: 16,
            padding: '16px 20px',
            boxShadow: '0 12px 48px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.1)',
            borderLeft: '4px solid #22c55e',
            opacity: t.visible ? 1 : 0,
            transition: 'opacity 0.3s ease',
          },
        },
        React.createElement(OrderConfirmedToast, {
          title: 'Order Confirmed! 🎉',
          orderId,
          subtitle: "Thank you for your purchase — we'll keep you updated.",
        })
      );
    },
    /* Bottom-right so it never covers the navbar. The global Toaster is also
       bottom-right; custom toasts must state it explicitly. */
    { duration: 6000, position: 'bottom-right' }
  );
};

export const paymentSuccessful = (orderId) => {
  if (isStorefront()) return;
  hotToast.custom(
    (t) => {
      return React.createElement(
        'div',
        {
          className: 'toast-premium',
          style: {
            background: '#ffffff',
            borderRadius: 16,
            padding: '16px 20px',
            boxShadow: '0 12px 48px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)',
            border: '1px solid rgba(0,0,0,0.1)',
            borderLeft: '4px solid #22c55e',
            opacity: t.visible ? 1 : 0,
            transition: 'opacity 0.3s ease',
          },
        },
        React.createElement(OrderConfirmedToast, {
          title: 'Payment Successful! 💳',
          orderId,
          subtitle: 'Your payment has been verified and your order is confirmed.',
        })
      );
    },
    { duration: 6000, position: 'bottom-right' }
  );
};

export const orderCancelled = () => {
  if (isStorefront()) return;
  showSuccess('Order cancelled');
};

export const couponApplied = (savings) => {
  if (isStorefront()) return;
  showSuccess(`Coupon applied! You saved ${savings}`);
};

export const couponRemoved = () => {
  if (isStorefront()) return;
  showSuccess('Coupon removed');
};

/* ── Auth ───────────────────────────────────────── */

export const welcomeBack = () => {
  if (isStorefront()) return;
  showSuccess('Welcome back!');
};

export const accountCreated = () => {
  if (isStorefront()) return;
  showSuccess('Account created!', { duration: 5000 });
};

export const passwordReset = () => {
  if (isStorefront()) return;
  showSuccess('Password reset!');
};

export const resetLinkSent = () => {
  if (isStorefront()) return;
  showSuccess('Reset link sent!');
};

/* ── Addresses ──────────────────────────────────── */

export const addressAdded = () => {
  if (isStorefront()) return;
  showSuccess('Address added');
};

export const addressDeleted = () => {
  if (isStorefront()) return;
  showSuccess('Address deleted');
};

export const addressUpdated = () => {
  if (isStorefront()) return;
  showSuccess('Default address updated');
};

/* ── Notifications ──────────────────────────────── */

export const allMarkedRead = () => {
  if (isStorefront()) return;
  showSuccess('All marked as read');
};

/* ── Admin CRUD helpers ─────────────────────────── */

export const itemCreated = (label) => {
  if (isStorefront()) return;
  showSuccess(`${label} created`);
};

export const itemUpdated = (label) => {
  if (isStorefront()) return;
  showSuccess(`${label} updated`);
};

export const itemDeleted = (label) => {
  if (isStorefront()) return;
  showSuccess(`${label} deleted`);
};

export const itemPublished = (label) => {
  if (isStorefront()) return;
  showSuccess(`${label} published`);
};

export const itemArchived = (label) => {
  if (isStorefront()) return;
  showSuccess(`${label} archived`);
};

export const settingsSaved = () => {
  if (isStorefront()) return;
  showSuccess('Settings updated successfully');
};

export const cacheCleared = () => {
  if (isStorefront()) return;
  showSuccess('Cache cleared successfully');
};

/* ── Validation shorthands ──────────────────────── */

export const fillRequiredFields = () => {
  showError('Please fill all required fields');
};

export const invalidCoupon = () => {
  showError('Coupon is not applicable to your cart');
};

/* ── Generic success/error for one-off messages ─── */

export { showSuccess as success, showError as error };

/**
 * Default export: the wrapper toast object with consistent defaults.
 * Use `import toast from '../../utils/toast'` instead of `import toast from 'react-hot-toast'`.
 */
export default toast;

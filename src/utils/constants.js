export const ORDER_STATUSES = {
  PENDING: { label: 'Pending', class: 'status-pending' },
  CONFIRMED: { label: 'Confirmed', class: 'status-processing' },
  PROCESSING: { label: 'Processing', class: 'status-processing' },
  SHIPPED: { label: 'Shipped', class: 'status-in-transit' },
  DELIVERED: { label: 'Delivered', class: 'status-delivered' },
  FAILED: { label: 'Failed', class: 'status-failed' },
  CANCELLED: { label: 'Cancelled', class: 'status-cancelled' },
  RETURNED: { label: 'Returned', class: 'status-warning' },
  RETURN_REQUESTED: { label: 'Return Requested', class: 'status-warning' },
};

export const PAYMENT_STATUSES = {
  PENDING: { label: 'Pending', class: 'status-pending' },
  COMPLETED: { label: 'Completed', class: 'status-completed' },
  FAILED: { label: 'Failed', class: 'status-failed' },
  REFUNDED: { label: 'Refunded', class: 'status-warning' },
};

export const USER_ROLES = { MANAGER: 'MANAGER', CUSTOMER: 'CUSTOMER' };

export const NOTIFICATION_TYPES = ['ORDER', 'PROMOTION', 'SYSTEM', 'REMINDER'];

export const BANNER_TYPES = ['HERO', 'SALE', 'CATEGORY', 'POPUP', 'FEATURED', 'NEW_ARRIVAL'];

export const SHIPPING_STATUSES = ['PENDING', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

export const COUPON_TYPES = ['PERCENTAGE', 'FIXED'];

/**
 * Map color names to hex codes for swatch rendering.
 */
export const getColorHex = (colorName) => {
  const colors = {
    'Black': '#000000',
    'White': '#ffffff',
    'Navy': '#1e3a8a',
    'Grey': '#9ca3af',
    'Green': '#166534',
    'Olive': '#4d7c0f',
    'Maroon': '#991b1b',
    'Blue Wash': '#60a5fa',
    'Grey Wash': '#6b7280',
    'Multi': 'linear-gradient(45deg, #000 33%, #fff 33%, #fff 66%, #9ca3af 66%)',
    'Red': '#dc2626',
    'Blue': '#2563eb',
  };
  return colors[colorName] || '#cccccc';
};

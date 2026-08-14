/**
 * Shared helpers for user notifications.
 *
 * Kept in one place so the notification bell dropdown and the full
 * notifications page render the same read state and deep-link to the
 * same pages — the two can't drift apart.
 */

/**
 * Read state of a notification.
 * The API serializes the DB column as `is_read` (snake_case); some older
 * payloads expose `isRead`. Accept both.
 */
export function notificationIsRead(n) {
  return Boolean(n?.isRead ?? n?.is_read);
}

function firstId(data, keys) {
  if (!data) return null;
  for (const k of keys) {
    const v = data[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

/**
 * Role-aware deep-link target for a notification.
 * Returns a router path (string) or null if nothing maps.
 */
export function getNotificationRoute(n, isAdmin) {
  if (!n) return null;
  const d = n.data || {};
  const type = (n.type || '').toLowerCase();

  if (isAdmin) {
    const orderId = firstId(d, ['orderId', 'order_id']);
    if (orderId) return `/admin/orders/${orderId}`;

    const userId = firstId(d, ['userId', 'user_id']);
    if (userId) return `/admin/users/${userId}`;

    const productId = firstId(d, ['productId', 'product_id']);
    if (productId) return `/admin/products/${productId}`;

    const reviewId = firstId(d, ['reviewId', 'review_id']);
    if (reviewId) return `/admin/reviews/${reviewId}`;

    const returnId = firstId(d, ['returnId', 'return_request_id', 'return_id']);
    if (returnId) return `/admin/returns/${returnId}`;

    const refundId = firstId(d, ['refundId', 'refund_id']);
    if (refundId) return `/admin/refunds/${refundId}`;

    const ticketId = firstId(d, ['ticketId', 'ticket_id']);
    if (ticketId) return `/admin/support/${ticketId}`;

    const couponId = firstId(d, ['couponId', 'coupon_id']);
    if (couponId) return `/admin/coupons/${couponId}`;

    const campaignId = firstId(d, ['adCampaignId', 'campaignId', 'campaign_id']);
    if (campaignId) return `/admin/ads/campaigns/${campaignId}`;

    if (firstId(d, ['ruleId', 'rule_id'])) return '/admin/ads/automation';

    // Type-based fallbacks (notifications without a target id)
    if (type === 'promotion' || type === 'coupon') return '/admin/promotions';
    if (type.includes('return')) return '/admin/returns';
    if (type.includes('refund')) return '/admin/refunds';
    if (type.includes('ticket') || type === 'support') return '/admin/support';
    if (type.startsWith('ad_')) return '/admin/ads';
    if (type.includes('review')) return '/admin/reviews';
    if (type.includes('order')) return '/admin/orders';
    return '/admin/notifications';
  }

  // ─── Storefront (regular user) ───
  const orderId = firstId(d, ['orderId', 'order_id']);
  if (orderId) return `/orders/${orderId}`;

  if (d.productSlug) return `/products/${d.productSlug}`;

  if (firstId(d, ['returnId', 'return_request_id', 'return_id'])) return '/returns';

  if (type === 'cart') return '/cart';
  if (type === 'promotion') return '/sales';
  if (type.includes('ticket') || type === 'support') return '/support';
  if (type.includes('return')) return '/returns';
  if (type.includes('refund')) return '/orders';
  return '/notifications';
}

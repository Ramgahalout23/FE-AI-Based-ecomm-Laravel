/**
 * THREVOLT Web Push Service Worker
 *
 * Handles:
 * - Background push notifications (orders, messages, status updates, promotions)
 * - Notification click navigation to specific order/chat/support pages
 * - Tab synchronization when notifications arrive
 */

const CACHE_NAME = 'threvolt-sw-v1';

// Install event — immediately take control
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event — claim all open client tabs
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push event — display notification even when browser tab is closed
self.addEventListener('push', (event) => {
  let payload = {};

  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (err) {
    try {
      payload = { body: event.data.text() };
    } catch {
      payload = {};
    }
  }

  const title = payload.title || 'THREVOLT';
  const targetUrl = payload.url || payload.data?.url || '/';

  const isChat = payload.data?.type === 'chat' || payload.data?.type === 'new_chat' || Boolean(payload.data?.ticketId);
  const isOrder = Boolean(payload.data?.orderId) || payload.data?.type === 'order_status' || payload.data?.type === 'new_order';

  const notificationOptions = {
    body: payload.body || 'You have a new update.',
    icon: payload.icon || '/logo.png',
    badge: payload.badge || '/logo.png',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    data: {
      url: targetUrl,
      ...(payload.data || {}),
      timestamp: Date.now(),
    },
    tag: payload.data?.orderId
      ? `order-${payload.data.orderId}`
      : payload.data?.ticketId
      ? `chat-${payload.data.ticketId}`
      : 'threvolt-general',
    renotify: true,
    actions: isChat
      ? [
          { action: 'reply', title: '💬 View & Reply' },
          { action: 'dismiss', title: 'Dismiss' },
        ]
      : isOrder
      ? [
          { action: 'track', title: '📦 Track Order' },
          { action: 'dismiss', title: 'Dismiss' },
        ]
      : [
          { action: 'open', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' },
        ],
  };

  event.waitUntil(
    (async () => {
      const matchedClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // If user is currently focused on the live chat tab, they already see messages via Socket.IO.
      // Suppress duplicate OS lockscreen banner while in-focus, but always show if screen is locked or app is in background.
      const isFocusedOnLiveChat = matchedClients.some((c) => {
        if (!c.focused || c.visibilityState !== 'visible') return false;
        if (isChat) {
          const url = c.url || '';
          const hasTicketMatch = Boolean(payload.data?.ticketId && url.includes(payload.data.ticketId));
          return url.includes('/admin/chat') || url.includes('/support') || hasTicketMatch;
        }
        return false;
      });

      if (!isFocusedOnLiveChat) {
        try {
          await self.registration.showNotification(title, notificationOptions);
        } catch (err) {
          // iOS Safari fallback: iOS rejects complex actions and vibrate arrays
          try {
            await self.registration.showNotification(title, {
              body: notificationOptions.body,
              icon: notificationOptions.icon || '/logo.png',
              badge: notificationOptions.badge || '/logo.png',
              tag: notificationOptions.tag,
              data: notificationOptions.data,
              renotify: true,
            });
          } catch (fallbackErr) {
            console.warn('[SW] Push showNotification failed:', fallbackErr);
          }
        }
      }

      for (const client of matchedClients) {
        client.postMessage({
          type: 'PUSH_NOTIFICATION_RECEIVED',
          payload: {
            title,
            body: notificationOptions.body,
            url: targetUrl,
            data: notificationOptions.data,
            inFocus: isFocusedOnLiveChat,
          },
        });
      }
    })(),
  );
});

// Notification click event — focus active window or open new window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // If user clicked the "dismiss" action, take no further action
  if (event.action === 'dismiss') {
    return;
  }

  const rawUrl = event.notification.data?.url || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });

      // If an existing tab is open on our origin, navigate and focus it
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          if ('navigate' in client) {
            await client.navigate(targetUrl);
          }
          return client.focus();
        }
      }

      // If no tab is open, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

// Push subscription change event — handle renewed push subscription
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const newSubscription = await self.registration.pushManager.subscribe(
          event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true },
        );
        // Broadcast new subscription to active clients to sync with backend
        const windowClients = await self.clients.matchAll({ type: 'window' });
        for (const client of windowClients) {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: newSubscription.toJSON(),
          });
        }
      } catch (err) {
        console.error('[SW] Failed to renew push subscription:', err);
      }
    })(),
  );
});

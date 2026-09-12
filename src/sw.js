/**
 * Custom Service Worker — Push Notification Handler
 *
 * This file is injected into the VitePWA-generated service worker.
 * It listens for push events and shows native notifications on
 * the lock screen and notification bar (like WhatsApp).
 */

import { registerRoute } from 'workbox-routing';
import { NetworkOnly, StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// VitePWA injectManifest manifest placeholder (precache omitted for instant activation & zero network overhead)
const _wbManifest = self.__WB_MANIFEST || [];

// ── Immediate Activation ──
// Takes control immediately so pushManager.subscribe has an active worker without closing tabs
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Push Event Handler ──
// This is what shows notifications on the lock screen and notification bar
self.addEventListener('push', (event) => {
  let data = {};
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch {
    try {
      data = {
        title: 'THREVOLT',
        body: event.data ? event.data.text() : 'You have a new update.',
      };
    } catch {
      data = {};
    }
  }

  const title = data.title || 'THREVOLT';
  const targetUrl = data.url || data.data?.url || '/';

  const isChat = data.data?.type === 'chat' || data.data?.type === 'new_chat' || Boolean(data.data?.ticketId);
  const isOrder = Boolean(data.data?.orderId) || data.data?.type === 'order_status' || data.data?.type === 'new_order';

  // Detect iOS Safari / WebKit (which rejects 'actions', 'vibrate', and 'requireInteraction')
  const ua = self.navigator?.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (self.navigator?.platform === 'MacIntel' && self.navigator?.maxTouchPoints > 1);

  const origin = self.location?.origin || 'https://threvolt.com';
  const iconUrl = data.icon ? (data.icon.startsWith('http') ? data.icon : new URL(data.icon, origin).href) : new URL('/logo.png', origin).href;
  const badgeUrl = data.badge ? (data.badge.startsWith('http') ? data.badge : new URL(data.badge, origin).href) : new URL('/logo.png', origin).href;

  const options = {
    body: data.body || 'You have a new update.',
    icon: iconUrl,
    badge: badgeUrl,
    data: {
      url: targetUrl,
      ...(data.data || {}),
      timestamp: Date.now(),
    },
    tag: data.data?.orderId
      ? `order-${data.data.orderId}`
      : data.data?.ticketId
      ? `chat-${data.data.ticketId}`
      : 'threvolt-general',
    renotify: true,
    silent: false,
  };

  // Add rich interactions only on non-iOS platforms (Android, Windows, macOS Chrome/Edge)
  if (!isIOS) {
    options.vibrate = [200, 100, 200, 100, 200];
    options.requireInteraction = true;
    if (isChat) {
      options.actions = [
        { action: 'reply', title: '💬 View & Reply' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    } else if (isOrder) {
      options.actions = [
        { action: 'track', title: '📦 Track Order' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    } else {
      options.actions = [
        { action: 'open', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    }
  }

  event.waitUntil(
    (async () => {
      const matchedClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      // Only suppress background banner if user is actively focused on this exact chat ticket in an active window
      const isFocusedOnLiveChat = matchedClients.some((c) => {
        if (!c.focused || c.visibilityState !== 'visible') return false;
        if (isChat && data.data?.ticketId) {
          const url = c.url || '';
          return url.includes(data.data.ticketId);
        }
        return false;
      });

      if (!isFocusedOnLiveChat) {
        try {
          await self.registration.showNotification(title, options);
        } catch (err) {
          // Fallback if platform rejects any specific option
          try {
            await self.registration.showNotification(title, {
              body: options.body,
              icon: options.icon || '/logo.png',
              badge: options.badge || '/logo.png',
              tag: options.tag,
              data: options.data,
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
          payload: { title, body: options.body, url: targetUrl, data: options.data, inFocus: isFocusedOnLiveChat },
        });
      }
    })(),
  );
});

// ── Push Subscription Renewal Handler ──
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const newSub = await self.registration.pushManager.subscribe(
          event.oldSubscription ? event.oldSubscription.options : { userVisibleOnly: true }
        );
        const windowClients = await self.clients.matchAll({ type: 'window' });
        for (const client of windowClients) {
          client.postMessage({
            type: 'PUSH_SUBSCRIPTION_CHANGED',
            subscription: newSub.toJSON(),
          });
        }
      } catch (err) {
        console.error('[SW] Failed to renew push subscription:', err);
      }
    })()
  );
});

// ── Notification Click Handler ──
// Opens the relevant page when user taps the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const rawUrl = event.notification.data?.url || '/';
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windowClients) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          try {
            if ('navigate' in client) {
              await client.navigate(targetUrl);
            }
          } catch {}
          client.postMessage({ type: 'OPEN_LIVE_CHAT', targetUrl });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })(),
  );
});

// ── Notification Close Handler ──
self.addEventListener('notificationclose', (_event) => {
  // Optional: track notification dismissals
});

// Dynamic user & mutable APIs — Network only (never serve stale user data from offline cache)
const userDynamicPrefixes = [
  '/api/v1/orders',
  '/api/v1/user',
  '/api/v1/user-profile',
  '/api/v1/cart',
  '/api/v1/chat',
  '/api/v1/auth',
  '/api/v1/wishlist',
  '/api/v1/notifications',
  '/api/v1/admin',
];

registerRoute(
  ({ url }) => userDynamicPrefixes.some((prefix) => url.pathname.startsWith(prefix)),
  new NetworkOnly(),
);

// Cache safe public catalog / settings API responses for offline
const publicCacheablePrefixes = [
  '/api/v1/products',
  '/api/v1/categories',
  '/api/v1/settings',
  '/api/v1/promotions',
  '/api/v1/brands',
];

registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    publicCacheablePrefixes.some((prefix) => url.pathname.startsWith(prefix)),
  new StaleWhileRevalidate({
    cacheName: 'api-cache',
    expiration: new ExpirationPlugin({
      maxEntries: 50,
      maxAgeSeconds: 120,
    }),
  }),
);

// Cache images
registerRoute(
  ({ url }) => url.pathname.startsWith('/uploads/'),
  new CacheFirst({
    cacheName: 'image-cache',
    expiration: new ExpirationPlugin({
      maxEntries: 100,
      maxAgeSeconds: 24 * 60 * 60,
    }),
  }),
);

/**
 * Realtime Service — Unified real-time event service
 *
 * Supports three modes (controlled by admin panel setting 'realtime_driver'):
 *   1. "pusher"    — Uses Pusher JS (works on shared hosting, no Node.js needed)
 *   2. "websocket" — Uses Socket.IO (requires Node.js server)
 *   3. "disabled"  — No-ops, all events silently dropped
 *
 * The active driver is fetched from settings API and cached in localStorage.
 */

import client from '../api/client';
import useAuthStore from '../store/authStore';

// ── State ──
let realtimeDriver = null;
let pusherClient = null;
let socketClient = null;
let listeners = {};
let driverInitPromise = null;

const DRIVER_CACHE_KEY = 'LUXE_REALTIME_DRIVER';

/**
 * Fetch the active realtime driver from the server.
 */
async function fetchDriver() {
  const cached = localStorage.getItem(DRIVER_CACHE_KEY);
  if (cached && ['pusher', 'websocket', 'disabled'].includes(cached.toLowerCase())) {
    realtimeDriver = cached.toLowerCase();
    return cached.toLowerCase();
  }

  try {
    const res = await client.get('/settings/realtime_driver');
    const driver = (res?.data?.data?.value || res?.data?.value || 'disabled').toLowerCase();
    if (['pusher', 'websocket', 'disabled'].includes(driver)) {
      realtimeDriver = driver;
      localStorage.setItem(DRIVER_CACHE_KEY, driver);
      return driver;
    }
  } catch {
    // Fallback
  }

  // Default to websocket for local dev
  realtimeDriver = 'websocket';
  return 'websocket';
}

/**
 * Clear the driver cache.
 */
export function clearDriverCache() {
  localStorage.removeItem(DRIVER_CACHE_KEY);
  realtimeDriver = null;
}

/**
 * Fetch Pusher config from the backend.
 */
async function fetchPusherConfig() {
  try {
    const res = await client.get('/broadcasting/config');
    return res?.data?.data || {};
  } catch {
    return {};
  }
}

/**
 * Initialize the realtime connection based on the active driver.
 */
async function initDriver() {
  if (driverInitPromise) return driverInitPromise;

  driverInitPromise = (async () => {
    await fetchDriver();

    if (realtimeDriver === 'disabled') return;

    if (realtimeDriver === 'websocket') {
      const { connectSocket } = await import('./socketService');
      socketClient = connectSocket();
      return;
    }

    if (realtimeDriver === 'pusher') {
      try {
        const Pusher = (await import('pusher-js')).default;
        const config = await fetchPusherConfig();
        const appKey = config.key || import.meta.env.VITE_PUSHER_APP_KEY;
        const cluster = config.cluster || import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1';

        if (!appKey) {
          console.warn('[Realtime] Pusher: No app key configured.');
          return;
        }

        const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken');

        pusherClient = new Pusher(appKey, {
          cluster,
          authEndpoint: '/api/v1/broadcasting/auth',
          auth: {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
          forceTLS: true,
          enabledTransports: ['ws', 'wss'],
        });

        pusherClient.connection.bind('connected', () => {
          console.debug('[Realtime] Pusher connected');
        });

        pusherClient.connection.bind('error', (err) => {
          console.warn('[Realtime] Pusher connection error:', err);
        });

        // Re-bind existing listeners
        Object.entries(listeners).forEach(([event, handlers]) => {
          handlers.forEach((handler) => bindPusherListener(event, handler));
        });

        return pusherClient;
      } catch (err) {
        console.warn('[Realtime] Failed to initialize Pusher:', err);
      }
    }
  })();

  return driverInitPromise;
}

/**
 * Bind a listener to Pusher.
 */
function bindPusherListener(event, handler) {
  if (!pusherClient) return;
  const channelName = getPusherChannel(event);
  if (!channelName) return;
  const channel = pusherClient.subscribe(channelName);
  channel.bind(event, handler);
}

/**
 * Map a realtime event to its Pusher channel.
 *
 * Chat events are role-aware:
 *   - Admins subscribe to the shared 'private-admin' channel.
 *   - Customers subscribe to their own 'private-user.{id}' channel so they only
 *     receive messages for their own conversation.
 */
function getPusherChannel(event) {
  if (event.startsWith('chat:')) {
    if (localStorage.getItem('adminToken')) return 'private-admin';
    const userId = useAuthStore.getState().user?.id;
    return userId ? `private-user.${userId}` : null;
  }
  if (event.startsWith('order:') || event.startsWith('notification:') || event.startsWith('ad:')) {
    return 'private-admin';
  }
  return null;
}

/**
 * Subscribe to a realtime event.
 * Returns an unsubscribe function.
 */
export function onRealtimeEvent(event, handler) {
  if (!listeners[event]) listeners[event] = [];
  listeners[event].push(handler);

  if (realtimeDriver === 'websocket' && socketClient) {
    socketClient.on(event, handler);
  } else if (realtimeDriver === 'pusher' && pusherClient) {
    bindPusherListener(event, handler);
  }

  return () => {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter((h) => h !== handler);
    }
    if (socketClient) socketClient?.off(event, handler);
    if (pusherClient) {
      const channelName = getPusherChannel(event);
      if (channelName) {
        const channel = pusherClient.channel(channelName);
        if (channel) channel.unbind(event, handler);
      }
    }
  };
}

/**
 * Initialize realtime connection.
 */
export async function connectRealtime() {
  // Already connected — skip
  if (realtimeDriver === 'pusher' && pusherClient?.connection?.state === 'connected') return;
  if (realtimeDriver === 'websocket' && socketClient?.connected) return;
  await initDriver();
}

/**
 * Disconnect all realtime connections.
 */
export function disconnectRealtime() {
  if (pusherClient) {
    pusherClient.disconnect();
    pusherClient = null;
  }

  // Import dynamically to avoid circular deps
  import('./socketService').then(mod => {
    mod.disconnectSocket();
  }).catch(() => {});

  listeners = {};
  realtimeDriver = null;
  driverInitPromise = null;
}

/**
 * Get current connection status.
 */
export function isRealtimeConnected() {
  if (realtimeDriver === 'disabled') return false;
  if (realtimeDriver === 'pusher') return pusherClient?.connection?.state === 'connected';
  if (realtimeDriver === 'websocket') return socketClient?.connected || false;
  return false;
}

/**
 * Refresh driver config (call after admin saves settings).
 */
export async function refreshRealtimeDriver() {
  clearDriverCache();
  disconnectRealtime();
  await connectRealtime();
}

export default {
  connectRealtime,
  disconnectRealtime,
  onRealtimeEvent,
  isRealtimeConnected,
  refreshRealtimeDriver,
  clearDriverCache,
};

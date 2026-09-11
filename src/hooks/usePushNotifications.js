/**
 * usePushNotifications
 *
 * Manages Web Push notification subscriptions:
 * - Checks browser support and permission state
 * - Proactively registers service worker (/sw.js)
 * - Subscribes/unsubscribes device to Web Push
 * - Syncs push subscriptions with the backend
 * - Provides sendTest helper
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import useAuthStore from '../store/authStore';
import api from '../api/client';

// Helper to convert base64 VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const SW_VERSION = 'v3';

export default function usePushNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);
  const swRegistrationRef = useRef(null);
  const { isAuthenticated } = useAuthStore();

  // Check support on mount
  useEffect(() => {
    const isSupported =
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, []);

  /**
   * Helper to ensure an active service worker registration is available
   */
  const getActiveRegistration = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;

    try {
      // 1. Force one-time cleanup of any legacy/broken service workers (e.g. old workbox precache errors)
      const installedVersion = localStorage.getItem('threvolt_sw_v');
      if (installedVersion !== SW_VERSION) {
        console.log('[Push] Migrating Service Worker to', SW_VERSION);
        try {
          const oldRegs = await navigator.serviceWorker.getRegistrations();
          for (const r of oldRegs) {
            await r.unregister();
          }
          if ('caches' in window) {
            const cacheKeys = await caches.keys();
            for (const key of cacheKeys) {
              if (key.includes('workbox') || key.includes('precache') || key.includes('threvolt')) {
                await caches.delete(key);
              }
            }
          }
        } catch { /* ignore */ }
        localStorage.setItem('threvolt_sw_v', SW_VERSION);
        swRegistrationRef.current = null;
      }

      // 2. Check if we already have an active registration
      let reg = await navigator.serviceWorker.getRegistration();

      // If existing registration has an active worker, return it
      if (reg?.active) {
        swRegistrationRef.current = reg;
        return reg;
      }

      // If no registration exists, register /sw.js
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }

      if (reg.active) {
        swRegistrationRef.current = reg;
        return reg;
      }

      // If a worker is waiting, prompt SKIP_WAITING to activate it immediately
      if (reg.waiting) {
        try {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } catch { /* ignore */ }
      }

      // If a worker is installing, listen for its activation
      if (reg.installing) {
        const sw = reg.installing;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' || sw.state === 'activated') {
            try {
              sw.postMessage({ type: 'SKIP_WAITING' });
            } catch { /* ignore */ }
          }
        });
      }

      // 3. Wait on navigator.serviceWorker.ready with a 10-second timeout
      const readyReg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Service Worker activation timed out')), 10000),
        ),
      ]);

      if (readyReg?.active) {
        swRegistrationRef.current = readyReg;
        return readyReg;
      }

      swRegistrationRef.current = reg;
      return reg;
    } catch (err) {
      console.warn('[Push] Registration check warning:', err);
      try {
        const fallbackReg = await navigator.serviceWorker.ready;
        if (fallbackReg?.active) {
          swRegistrationRef.current = fallbackReg;
          return fallbackReg;
        }
      } catch { /* ignore */ }
      return null;
    }
  }, []);

  // Proactively register SW on mount if supported
  useEffect(() => {
    if (supported) {
      getActiveRegistration();
    }
  }, [supported, getActiveRegistration]);

  /**
   * Get the VAPID public key from backend
   */
  const getVapidKey = useCallback(async () => {
    try {
      const res = await api.get('/push/vapid-public-key');
      return res.data?.data?.publicKey || null;
    } catch (err) {
      console.warn('[Push] Could not retrieve VAPID key:', err);
      return null;
    }
  }, []);

  /**
   * Sync active subscription to backend
   */
  const syncSubscriptionToBackend = useCallback(async (subscription) => {
    try {
      const subJson = subscription.toJSON();
      await api.post('/push/subscribe', {
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
      });
      return true;
    } catch (err) {
      console.warn('[Push] Failed to sync subscription to backend:', err);
      return false;
    }
  }, []);

  /**
   * Subscribe to Web Push notifications
   */
  const subscribe = useCallback(async () => {
    if (!supported || loading) return false;
    setLoading(true);

    // Enforce an absolute 12-second timeout so the UI CAN NEVER HANG
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Subscription request timed out. Please try again.')), 12000),
    );

    const performSubscription = async () => {
      // 1. Request browser permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        console.warn('[Push] Notification permission not granted:', perm);
        return false;
      }

      // 2. Fetch VAPID key and ensure active SW registration in parallel
      const [vapidKey, reg] = await Promise.all([
        getVapidKey(),
        getActiveRegistration(),
      ]);

      if (!vapidKey) {
        console.warn('[Push] No VAPID public key available from server');
        return false;
      }

      // Ensure registration has an active service worker before PushManager subscribe
      let targetReg = reg;
      if (!targetReg?.active) {
        try {
          const readyReg = await navigator.serviceWorker.ready;
          if (readyReg?.active) targetReg = readyReg;
        } catch { /* ignore */ }
      }

      if (!targetReg || !targetReg.pushManager) {
        console.warn('[Push] PushManager not available on registration');
        return false;
      }

      if (!targetReg.active) {
        console.warn('[Push] Cannot subscribe to push: Service Worker is not active yet');
        return false;
      }

      // 3. Subscribe via PushManager
      const appServerKey = urlBase64ToUint8Array(vapidKey);
      let subscription = await targetReg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await targetReg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });
      }

      // 4. Save subscription to backend if user is authenticated
      if (isAuthenticated || localStorage.getItem('adminToken') || localStorage.getItem('authToken')) {
        await syncSubscriptionToBackend(subscription);
      }

      setIsSubscribed(true);
      return true;
    };

    try {
      return await Promise.race([performSubscription(), timeoutPromise]);
    } catch (err) {
      console.error('[Push] Subscribe failed:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [supported, loading, getActiveRegistration, getVapidKey, isAuthenticated, syncSubscriptionToBackend]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async () => {
    if (!supported) return false;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        try {
          await api.delete('/push/unsubscribe', {
            data: { endpoint: subscription.endpoint },
          });
        } catch {
          // Backend deletion failed, still remove locally
        }
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err);
      setLoading(false);
      return false;
    }
  }, [supported]);

  /**
   * Send a test notification
   */
  const sendTest = useCallback(async () => {
    try {
      const res = await api.post('/push/test');
      return res.data;
    } catch (err) {
      console.error('[Push] Test notification failed:', err);
      throw err;
    }
  }, []);

  /**
   * Check subscription status on mount and on auth change
   */
  useEffect(() => {
    if (!supported) return;

    let isMounted = true;

    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();

        if (!isMounted) return;

        const active = Boolean(sub);
        setIsSubscribed(active);

        // If user is logged in and subscription exists, ensure backend has it registered
        if (active && (isAuthenticated || localStorage.getItem('adminToken') || localStorage.getItem('authToken'))) {
          syncSubscriptionToBackend(sub);
        }
      } catch {
        // SW not ready or permission denied
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [supported, isAuthenticated, syncSubscriptionToBackend]);

  /**
   * Listen for messages from the service worker (renewals, broadcasts)
   */
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event) => {
      if (event.data?.type === 'PUSH_SUBSCRIPTION_CHANGED' && event.data.subscription) {
        api.post('/push/subscribe', {
          endpoint: event.data.subscription.endpoint,
          p256dh: event.data.subscription.keys?.p256dh,
          auth: event.data.subscription.keys?.auth,
        }).catch(() => {});
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  return {
    supported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    sendTest,
  };
}

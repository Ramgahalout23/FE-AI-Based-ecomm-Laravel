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
   * Register service worker (/sw.js)
   */
  const registerSW = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;
    if (swRegistrationRef.current) return swRegistrationRef.current;

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      swRegistrationRef.current = reg;
      return reg;
    } catch (err) {
      console.warn('[Push] Service worker registration failed:', err);
      return null;
    }
  }, []);

  // Proactively register SW on mount if supported
  useEffect(() => {
    if (supported) {
      registerSW();
    }
  }, [supported, registerSW]);

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

    // Enforce an absolute 10-second timeout so the UI CAN NEVER HANG
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Subscription request timed out. Please try again.')), 10000),
    );

    const performSubscription = async () => {
      // 1. Request browser permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        return false;
      }

      // 2. Fetch VAPID key and ensure SW registration in parallel
      const [vapidKey, regResult] = await Promise.all([
        getVapidKey(),
        registerSW(),
      ]);

      if (!vapidKey) {
        console.warn('[Push] No VAPID public key available from server');
        return false;
      }

      let reg = regResult || swRegistrationRef.current;

      // If no active worker yet, send skip-waiting and wait at most 2 seconds for activation
      if (!reg?.active) {
        if (reg?.waiting) {
          try {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          } catch { /* ignore */ }
        }
        const readyPromise = navigator.serviceWorker.ready;
        const quickTimeout = new Promise((resolve) => setTimeout(resolve, 2000));
        const readyReg = await Promise.race([readyPromise, quickTimeout]);
        if (readyReg) reg = readyReg;
      }

      if (!reg || !reg.pushManager) {
        console.warn('[Push] PushManager not available on registration');
        return false;
      }

      // 3. Subscribe via PushManager
      const appServerKey = urlBase64ToUint8Array(vapidKey);
      let subscription = await reg.pushManager.getSubscription();

      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
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
  }, [supported, loading, registerSW, getVapidKey, isAuthenticated, syncSubscriptionToBackend]);

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

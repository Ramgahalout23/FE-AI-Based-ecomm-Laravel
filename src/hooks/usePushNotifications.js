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
  /**
   * Helper to ensure an active service worker registration is available
   */
  const getActiveRegistration = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return null;

    try {
      if (swRegistrationRef.current?.active) {
        return swRegistrationRef.current;
      }

      // 1. Check if we already have an active registration or register /sw.js
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }

      // 2. If a worker is waiting, prompt SKIP_WAITING to activate it immediately
      if (reg.waiting) {
        try {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        } catch { /* ignore */ }
      }

      // 3. If a worker is installing, listen for its activation
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

      if (reg.active) {
        swRegistrationRef.current = reg;
        return reg;
      }

      // 4. Brief polling wait (max 2 seconds) for active worker, never hanging
      await new Promise((resolve) => {
        let elapsed = 0;
        const interval = setInterval(() => {
          elapsed += 100;
          if (reg.active || elapsed >= 2000) {
            clearInterval(interval);
            resolve();
          }
        }, 100);
      });

      swRegistrationRef.current = reg;
      return reg;
    } catch (err) {
      console.warn('[Push] Registration check warning:', err);
      try {
        const fallbackReg = await navigator.serviceWorker.getRegistration();
        if (fallbackReg) {
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
      const sessionId = typeof window !== 'undefined'
        ? localStorage.getItem('chatSessionId') || `anon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        : null;
      if (sessionId && typeof window !== 'undefined') {
        localStorage.setItem('chatSessionId', sessionId);
      }

      await api.post('/push/subscribe', {
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
        sessionId,
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

    // Enforce an absolute 15-second timeout so the UI CAN NEVER HANG
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Subscription request timed out. Please try again.')), 15000),
    );

    const performSubscription = async () => {
      // 1. Request browser permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        console.warn('[Push] Notification permission not granted:', perm);
        return false;
      }

      // 2. Fetch VAPID key and ensure registration in parallel
      const [vapidKey, reg] = await Promise.all([
        getVapidKey(),
        getActiveRegistration(),
      ]);

      if (!vapidKey) {
        console.warn('[Push] No VAPID public key available from server');
        return false;
      }

      const targetReg = reg || (await navigator.serviceWorker.getRegistration());
      if (!targetReg || !targetReg.pushManager) {
        console.warn('[Push] PushManager not available on registration');
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

      // 4. Save subscription to backend (supports both authenticated user and guest session)
      await syncSubscriptionToBackend(subscription);

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
  }, [supported, loading, getActiveRegistration, getVapidKey, syncSubscriptionToBackend]);

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = useCallback(async () => {
    if (!supported) return false;
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg?.pushManager) {
        setIsSubscribed(false);
        setLoading(false);
        return true;
      }

      const subscription = await reg.pushManager.getSubscription();

      if (subscription) {
        try {
          const sessionId = typeof window !== 'undefined' ? localStorage.getItem('chatSessionId') : null;
          await api.delete('/push/unsubscribe', {
            data: { endpoint: subscription.endpoint, sessionId },
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
      const sessionId = typeof window !== 'undefined' ? localStorage.getItem('chatSessionId') : null;
      const res = await api.post('/push/test', { sessionId });
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
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg?.pushManager) return;

        const sub = await reg.pushManager.getSubscription();

        if (!isMounted) return;

        const active = Boolean(sub);
        setIsSubscribed(active);

        // Ensure active subscription is synced to backend with current token/session
        if (active) {
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
        const sessionId = typeof window !== 'undefined' ? localStorage.getItem('chatSessionId') : null;
        api.post('/push/subscribe', {
          endpoint: event.data.subscription.endpoint,
          p256dh: event.data.subscription.keys?.p256dh,
          auth: event.data.subscription.keys?.auth,
          sessionId,
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

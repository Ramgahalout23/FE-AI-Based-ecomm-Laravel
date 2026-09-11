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
      if (swRegistrationRef.current?.active) {
        return swRegistrationRef.current;
      }

      // 1. Get current registration or register /sw.js
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      }

      // 2. Await ready state with fallback
      const readyReg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(() => resolve(reg), 1500)),
      ]);

      swRegistrationRef.current = readyReg || reg;
      return readyReg || reg;
    } catch (err) {
      console.warn('[Push] Registration check warning:', err);
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

    try {
      console.log('[Push] Step 1: Requesting notification permission...');
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        console.warn('[Push] Notification permission denied:', perm);
        setLoading(false);
        return false;
      }

      console.log('[Push] Step 2: Fetching VAPID key and waiting for Service Worker...');
      const [vapidKey, reg] = await Promise.all([
        getVapidKey(),
        (async () => {
          let r = await navigator.serviceWorker.getRegistration();
          if (!r) {
            r = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
          }
          return await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((resolve) => setTimeout(() => resolve(r), 2000)),
          ]);
        })(),
      ]);

      if (!vapidKey) {
        console.warn('[Push] No VAPID public key available from server');
        setLoading(false);
        return false;
      }

      if (!reg?.pushManager) {
        console.warn('[Push] PushManager not available on registration');
        setLoading(false);
        return false;
      }

      console.log('[Push] Step 3: Checking existing device push subscription...');
      const appServerKey = urlBase64ToUint8Array(vapidKey);
      let subscription = null;

      try {
        subscription = await reg.pushManager.getSubscription();
      } catch (subErr) {
        console.warn('[Push] Could not read existing subscription:', subErr);
      }

      if (subscription) {
        console.log('[Push] Existing subscription detected, syncing to backend...');
        await syncSubscriptionToBackend(subscription);
        setIsSubscribed(true);
        setLoading(false);
        return true;
      }

      console.log('[Push] Step 4: Registering new subscription with PushManager...');
      try {
        subscription = await Promise.race([
          reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: appServerKey,
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Browser push service (FCM) response timed out')), 10000),
          ),
        ]);
      } catch (subErr) {
        console.warn('[Push] Primary subscribe failed, clearing orphaned subscription and retrying...', subErr);
        try {
          const oldSub = await reg.pushManager.getSubscription();
          if (oldSub) await oldSub.unsubscribe();
        } catch { /* ignore */ }

        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });
      }

      if (subscription) {
        console.log('[Push] Step 5: Syncing new subscription with backend...');
        await syncSubscriptionToBackend(subscription);
        setIsSubscribed(true);
        console.log('[Push] Push notifications activated successfully!');
        setLoading(false);
        return true;
      }

      setLoading(false);
      return false;
    } catch (err) {
      console.error('[Push] Subscribe failed:', err);
      setLoading(false);
      return false;
    }
  }, [supported, loading, getVapidKey, syncSubscriptionToBackend]);

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

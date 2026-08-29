/**
 * usePushNotifications
 *
 * Manages Web Push notification subscription:
 * - Checks browser support and permission
 * - Registers service worker and subscribes to push
 * - Sends subscription to backend
 * - Provides subscribe/unsubscribe/test functions
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import useAuthStore from '../store/authStore';
import api from '../api/client';

// Backend API base URL (for VAPID key and subscription endpoints)
const API_BASE = import.meta.env.VITE_API_URL || '';

export default function usePushNotifications() {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [supported, setSupported] = useState(false);
  const swRef = useRef(null);

  // Check support on mount
  useEffect(() => {
    const isSupported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;
    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, []);

  /**
   * Get the VAPID public key from the backend.
   */
  const getVapidKey = useCallback(async () => {
    try {
      const res = await api.get('/push/vapid-public-key');
      return res.data?.data?.publicKey || null;
    } catch {
      return null;
    }
  }, []);

  /**
   * Register the service worker and return it.
   */
  const registerSW = useCallback(async () => {
    if (swRef.current) return swRef.current;
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      swRef.current = reg;
      return reg;
    } catch (err) {
      console.error('[Push] Service worker registration failed:', err);
      return null;
    }
  }, []);

  /**
   * Subscribe to push notifications.
   */
  const subscribe = useCallback(async () => {
    if (!supported || loading) return false;
    setLoading(true);
    try {
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setLoading(false);
        return false;
      }

      // Register service worker
      const reg = await registerSW();
      if (!reg) {
        setLoading(false);
        return false;
      }

      // Get VAPID key
      const vapidKey = await getVapidKey();
      if (!vapidKey) {
        console.error('[Push] No VAPID key available');
        setLoading(false);
        return false;
      }

      // Convert VAPID key to Uint8Array
      const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      // Subscribe to push
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      // Send subscription to backend
      const subJson = subscription.toJSON();
      await api.post('/push/subscribe', {
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth: subJson.keys.auth,
      });

      setIsSubscribed(true);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('[Push] Subscribe failed:', err);
      setLoading(false);
      return false;
    }
  }, [supported, loading, registerSW, getVapidKey]);

  /**
   * Unsubscribe from push notifications.
   */
  const unsubscribe = useCallback(async () => {
    if (!supported) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        // Notify backend
        await api.delete('/push/unsubscribe', {
          data: { endpoint: subscription.endpoint },
        });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
      setLoading(false);
    } catch (err) {
      console.error('[Push] Unsubscribe failed:', err);
      setLoading(false);
    }
  }, [supported]);

  /**
   * Send a test notification.
   */
  const sendTest = useCallback(async () => {
    try {
      await api.post('/push/test');
    } catch (err) {
      console.error('[Push] Test notification failed:', err);
    }
  }, []);

  /**
   * Check if currently subscribed (on mount).
   */
  useEffect(() => {
    if (!supported) return;
    (async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setIsSubscribed(Boolean(sub));
      } catch {
        // SW not ready yet
      }
    })();
  }, [supported]);

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

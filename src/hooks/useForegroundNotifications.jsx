/**
 * useForegroundNotifications
 *
 * Real-time notification listener for active sessions:
 * - Emits gentle sound chime via Web Audio API
 * - Triggers browser notifications when tab is backgrounded
 * - Shows toast alerts with quick action links
 * - Listens for socket events:
 *     - 'order:created' (Admins & Customer)
 *     - 'order:statusUpdated' (Customer)
 *     - 'order:cancelled' (Customer & Admin)
 *     - 'chat:message' (Admins & Customer)
 *     - 'notification:new' (In-app updates)
 */

import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import toast from '../utils/toast';

/**
 * Play a notification chime synthesized via Web Audio API.
 * Clean, pleasant two-tone melodic chime (C5 -> E5 -> G5).
 */
function playNotificationChime() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, time: now },        // C5
      { freq: 659.25, time: now + 0.08 }, // E5
      { freq: 783.99, time: now + 0.16 }, // G5
    ];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.18, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.3);
    });

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // AudioContext blocked or not supported
  }
}

/**
 * Trigger browser system notification (useful when tab is in background)
 */
async function showBrowserNotification(title, options = {}) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') {
    return;
  }

  const defaultOptions = {
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [100, 50, 100],
    ...options,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg?.showNotification) {
        await reg.showNotification(title, defaultOptions);
        return;
      }
    }
    new Notification(title, defaultOptions);
  } catch (err) {
    console.warn('[Foreground Notification] Failed to display browser alert:', err);
  }
}

export default function useForegroundNotifications() {
  const { user, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const isAdmin = Boolean(
    isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN' || localStorage.getItem('adminToken')),
  );
  const currentUserId = user?.id;

  const handleOrderCreated = useCallback(
    (data) => {
      if (!data) return;

      if (isAdmin) {
        playNotificationChime();
        const orderNum = data.orderNumber || data.orderId?.slice(0, 8) || '';
        const total = data.summary?.total ? ` (₹${data.summary.total})` : '';

        toast.custom(
          (t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                navigateRef.current(`/admin/orders/${data.orderId}`);
              }}
              className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-emerald-500/30 rounded-xl shadow-lift cursor-pointer hover:bg-emerald-50/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 font-bold text-base">
                🛒
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary dark:text-white">
                  New Order Received!
                </p>
                <p className="text-xs text-text-secondary truncate">
                  Order #{orderNum}{total}
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-600">View</span>
            </div>
          ),
          { duration: 6000 },
        );

        if (document.hidden) {
          showBrowserNotification('🛒 New Order Received!', {
            body: `Order #${orderNum}${total}`,
            data: { url: `/admin/orders/${data.orderId}` },
          });
        }
      } else if (currentUserId && data.userId === currentUserId) {
        playNotificationChime();
        const orderNum = data.orderNumber || '';

        toast.success(`🛍️ Order #${orderNum} placed successfully!`, {
          duration: 5000,
        });

        if (document.hidden) {
          showBrowserNotification('🛍️ Order Confirmed!', {
            body: `Your order #${orderNum} has been confirmed.`,
            data: { url: `/orders/${data.orderId}` },
          });
        }
      }
    },
    [isAdmin, currentUserId],
  );

  const handleOrderStatusUpdated = useCallback(
    (data) => {
      if (!data) return;
      if (currentUserId && data.userId === currentUserId) {
        playNotificationChime();
        const orderNum = data.orderNumber || '';
        const status = data.status || 'Updated';

        toast.custom(
          (t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                navigateRef.current(`/orders/${data.orderId}`);
              }}
              className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-blue-500/30 rounded-xl shadow-lift cursor-pointer hover:bg-blue-50/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-blue-600 text-base">
                📦
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary dark:text-white">
                  Order Status Update
                </p>
                <p className="text-xs text-text-secondary truncate">
                  Order #{orderNum} is now {status}
                </p>
              </div>
              <span className="text-xs font-semibold text-blue-600">Track</span>
            </div>
          ),
          { duration: 5000 },
        );

        if (document.hidden) {
          showBrowserNotification(`📦 Order #${orderNum}: ${status}`, {
            body: `Your order #${orderNum} status is now ${status}.`,
            data: { url: `/orders/${data.orderId}` },
          });
        }
      }
    },
    [currentUserId],
  );

  const handleOrderCancelled = useCallback(
    (data) => {
      if (!data) return;
      playNotificationChime();
      const orderNum = data.orderNumber || '';

      if (isAdmin) {
        toast.error(`Order #${orderNum} was cancelled.`);
        if (document.hidden) {
          showBrowserNotification('❌ Order Cancelled', {
            body: `Order #${orderNum} was cancelled.`,
            data: { url: `/admin/orders/${data.orderId}` },
          });
        }
      } else if (currentUserId && data.userId === currentUserId) {
        toast.error(`Your order #${orderNum} was cancelled.`);
        if (document.hidden) {
          showBrowserNotification('❌ Order Cancelled', {
            body: `Your order #${orderNum} has been cancelled.`,
            data: { url: `/orders/${data.orderId}` },
          });
        }
      }
    },
    [isAdmin, currentUserId],
  );

  const handleChatMessage = useCallback(
    (data) => {
      if (!data?.message) return;
      const msg = data.message;
      const isFromAdmin = msg.isFromAdmin;

      // When admin receives message from customer
      if (isAdmin && !isFromAdmin) {
        playNotificationChime();
        const sender = msg.senderName || 'Customer';
        const preview = msg.content?.slice(0, 70) || 'New message';

        toast.custom(
          (t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                navigateRef.current('/admin/support');
              }}
              className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-primary/30 rounded-xl shadow-lift cursor-pointer hover:bg-primary/5 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-base font-bold">
                💬
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary dark:text-white">
                  Message from {sender}
                </p>
                <p className="text-xs text-text-secondary truncate">{preview}</p>
              </div>
              <span className="text-xs font-semibold text-primary">Reply</span>
            </div>
          ),
          { duration: 5000 },
        );

        if (document.hidden) {
          showBrowserNotification(`💬 Support: ${sender}`, {
            body: preview,
            data: { url: '/admin/support' },
          });
        }
      }

      // When customer receives message from admin
      if (!isAdmin && isFromAdmin) {
        playNotificationChime();
        const preview = msg.content?.slice(0, 70) || 'New response';

        toast.custom(
          (t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                navigateRef.current('/support');
              }}
              className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-primary/30 rounded-xl shadow-lift cursor-pointer hover:bg-primary/5 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary text-base font-bold">
                💬
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary dark:text-white">
                  Support Team Replied
                </p>
                <p className="text-xs text-text-secondary truncate">{preview}</p>
              </div>
              <span className="text-xs font-semibold text-primary">Open</span>
            </div>
          ),
          { duration: 5000 },
        );

        if (document.hidden) {
          showBrowserNotification('💬 Support Team Replied', {
            body: preview,
            data: { url: '/support' },
          });
        }
      }
    },
    [isAdmin],
  );

  const handleNewNotification = useCallback(
    (data) => {
      if (!data) return;
      if (currentUserId && data.userId && data.userId !== currentUserId) return;

      playNotificationChime();
      const title = data.title || 'Notification';
      const message = data.message || '';

      if (document.hidden) {
        showBrowserNotification(title, {
          body: message,
          data: { url: '/notifications' },
        });
      }
    },
    [currentUserId],
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    let unsubs = [];
    let cancelled = false;

    import('../services/socketService').then(({ onSocketEvent }) => {
      if (cancelled || !onSocketEvent) return;
      unsubs = [
        onSocketEvent('order:created', handleOrderCreated),
        onSocketEvent('order:statusUpdated', handleOrderStatusUpdated),
        onSocketEvent('order:cancelled', handleOrderCancelled),
        onSocketEvent('chat:message', handleChatMessage),
        onSocketEvent('notification:new', handleNewNotification),
      ];
    }).catch((err) => {
      console.warn('[ForegroundNotifications] Socket service unavailable:', err);
    });

    return () => {
      cancelled = true;
      unsubs.forEach((fn) => typeof fn === 'function' && fn());
    };
  }, [
    isAuthenticated,
    handleOrderCreated,
    handleOrderStatusUpdated,
    handleOrderCancelled,
    handleChatMessage,
    handleNewNotification,
  ]);
}

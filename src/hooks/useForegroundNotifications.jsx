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

let lastChimeTime = 0;

/**
 * Play a notification chime synthesized via Web Audio API.
 * Clean, pleasant melodic chime (C5 -> E5 -> G5).
 */
export function playNotificationChime() {
  const now = Date.now();
  if (now - lastChimeTime < 800) return; // Debounce rapid triggers
  lastChimeTime = now;

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const nowTime = ctx.currentTime;
    const notes = [
      { freq: 523.25, time: nowTime },        // C5
      { freq: 659.25, time: nowTime + 0.08 }, // E5
      { freq: 783.99, time: nowTime + 0.16 }, // G5
    ];

    notes.forEach(({ freq, time }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.25, time + 0.02);
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
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [200, 100, 200, 100, 200],
    ...options,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(() => resolve(null), 1000)),
      ]);
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
  const sessionId = typeof window !== 'undefined' ? localStorage.getItem('chatSessionId') : null;

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

        // Always show browser system notification so it appears in Windows Action Center / Android notification shade
        showBrowserNotification('🛒 New Order Received!', {
          body: `Order #${orderNum}${total}`,
          data: { url: `/admin/orders/${data.orderId}` },
        });
      } else {
        const isMyOrder = (currentUserId && data.userId === currentUserId) ||
          (sessionId && data.sessionId === sessionId) ||
          (typeof window !== 'undefined' && localStorage.getItem('last_order_id') === data.orderId);

        if (isMyOrder) {
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
      }
    },
    [isAdmin, currentUserId, sessionId],
  );

  const handleOrderStatusUpdated = useCallback(
    (data) => {
      if (!data) return;
      const isMyOrder = (currentUserId && data.userId === currentUserId) ||
        (sessionId && data.sessionId === sessionId) ||
        (typeof window !== 'undefined' && localStorage.getItem('last_order_id') === data.orderId);

      if (isMyOrder) {
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
    [currentUserId, sessionId],
  );

  const handleOrderCancelled = useCallback(
    (data) => {
      if (!data) return;
      const orderNum = data.orderNumber || '';

      if (isAdmin) {
        playNotificationChime();
        toast.error(`Order #${orderNum} was cancelled.`);
        showBrowserNotification('❌ Order Cancelled', {
          body: `Order #${orderNum} was cancelled.`,
          data: { url: `/admin/orders/${data.orderId}` },
        });
      } else {
        const isMyOrder = (currentUserId && data.userId === currentUserId) ||
          (sessionId && data.sessionId === sessionId) ||
          (typeof window !== 'undefined' && localStorage.getItem('last_order_id') === data.orderId);

        if (isMyOrder) {
          playNotificationChime();
          toast.error(`Your order #${orderNum} was cancelled.`);
          if (document.hidden) {
            showBrowserNotification('❌ Order Cancelled', {
              body: `Your order #${orderNum} has been cancelled.`,
              data: { url: `/orders/${data.orderId}` },
            });
          }
        }
      }
    },
    [isAdmin, currentUserId, sessionId],
  );

  const handleChatMessage = useCallback(
    (data) => {
      if (!data?.message) return;
      const msg = data.message;
      const isFromAdmin = msg.isFromAdmin;

      // When admin receives message from customer
      if (isAdmin && !isFromAdmin) {
        const isViewingAdminChat =
          typeof window !== 'undefined' &&
          window.location.pathname.startsWith('/admin/chat') &&
          !document.hidden &&
          document.hasFocus();

        // If admin is actively on the chat screen, socket streams messages live without annoying popups
        if (isViewingAdminChat) return;

        playNotificationChime();
        const sender = msg.senderName || 'Customer';
        const preview = msg.content?.slice(0, 70) || 'New message';

        toast.custom(
          (t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                navigateRef.current('/admin/chat');
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

        // Show browser OS notification ONLY when tab is in background or unfocused
        if (document.hidden || !document.hasFocus()) {
          showBrowserNotification(`💬 Support: ${sender}`, {
            body: preview,
            data: { url: '/admin/chat' },
          });
        }
      }

      // When customer receives message from admin
      if (!isAdmin && isFromAdmin) {
        const isLiveChatWidgetOpen =
          !document.hidden &&
          document.hasFocus() &&
          Boolean(document.querySelector('.chat-preview-window, [data-chat-open="true"], .chat-open'));

        // If customer is actively viewing the chat window, socket streams messages live
        if (isLiveChatWidgetOpen) return;

        playNotificationChime();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        const preview = msg.content?.slice(0, 70) || 'New response';
        const sender = msg.senderName || 'Support Team';

        toast.custom(
          (t) => (
            <div
              onClick={() => {
                toast.dismiss(t.id);
                window.dispatchEvent(new CustomEvent('open-live-chat'));
              }}
              className="flex items-center gap-3 p-3 bg-white dark:bg-zinc-900 border border-emerald-500/40 rounded-xl shadow-lift cursor-pointer hover:bg-emerald-50/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 text-base font-bold">
                💬
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary dark:text-white">
                  {sender} Replied
                </p>
                <p className="text-xs text-text-secondary truncate">{preview}</p>
              </div>
              <span className="text-xs font-semibold text-emerald-600">Open Chat</span>
            </div>
          ),
          { duration: 6000 },
        );

        if (document.hidden || !document.hasFocus()) {
          showBrowserNotification(`💬 ${sender} Replied`, {
            body: preview,
            data: { url: '/' },
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

      showBrowserNotification(title, {
        body: message,
        data: { url: isAdmin ? '/admin/notifications' : '/notifications' },
      });
    },
    [isAdmin, currentUserId],
  );

  useEffect(() => {
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
    handleOrderCreated,
    handleOrderStatusUpdated,
    handleOrderCancelled,
    handleChatMessage,
    handleNewNotification,
  ]);

  // Service Worker Broadcast Listener — ensures audio chime and toasts fire
  // even when WebSockets are offline or blocked by Hostinger CDN / proxy.
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleSWMessage = (event) => {
      if (event.data?.type === 'PUSH_NOTIFICATION_RECEIVED') {
        const { title, body, url, inFocus } = event.data.payload || {};
        // If client was already focused on the active live chat, suppress duplicate chime and toast
        if (inFocus) return;

        playNotificationChime();
        if (title) {
          toast.custom(
            (t) => (
              <div
                onClick={() => {
                  toast.dismiss(t.id);
                  if (url) navigateRef.current(url);
                }}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl cursor-pointer transition-all hover:scale-[1.02] max-w-sm"
              >
                <div className="w-9 h-9 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-600 font-bold shrink-0">
                  🔔
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-text-primary dark:text-white truncate">
                    {title}
                  </p>
                  <p className="text-xs text-text-secondary truncate">{body}</p>
                </div>
              </div>
            ),
            { duration: 5000 },
          );
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleSWMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleSWMessage);
    };
  }, []);
}

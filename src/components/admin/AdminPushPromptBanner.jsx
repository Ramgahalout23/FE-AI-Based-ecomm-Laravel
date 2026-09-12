import { useState, useEffect, useMemo } from 'react';
import { BellRing, X, Check, Share, Monitor, Smartphone } from 'lucide-react';
import usePushNotifications from '../../hooks/usePushNotifications';
import toast from '../../utils/toast';

/**
 * AdminPushPromptBanner — Device-Adaptive Admin Alert Banner.
 * Accurately detects:
 * - Real iOS (iPhone / iPad): Shows Home Screen installation guidance only when on iOS outside standalone mode.
 * - Android: Shows Android mobile lock-screen & sound alert prompt.
 * - Desktop: Shows Desktop background chime & notification center alert prompt.
 * Prevents Desktop/Android from ever seeing irrelevant Apple iOS instructions.
 */
export default function AdminPushPromptBanner() {
  const { supported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  // Device detection
  const deviceInfo = useMemo(() => {
    if (typeof navigator === 'undefined') {
      return { isIOS: false, isAndroid: false, isDesktop: true, isStandalone: false };
    }
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    // Real iOS detection: iPhone, iPad, iPod. Exclude Windows, Linux, and Android.
    const isIOS =
      !isAndroid &&
      !/Windows|Linux/i.test(ua) &&
      (/iPhone|iPod/i.test(ua) ||
        /iPad/i.test(ua) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && !('MSStream' in window)));
    const isDesktop = !isIOS && !isAndroid;
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.navigator?.standalone === true || window.matchMedia('(display-mode: standalone)').matches);

    return { isIOS, isAndroid, isDesktop, isStandalone };
  }, []);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('admin_push_banner_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  if (dismissed) {
    return null;
  }

  // ── CASE 1: REAL APPLE iOS (NOT in standalone mode) ──
  // iOS Safari requires adding to Home Screen to enable Web Push
  if (deviceInfo.isIOS && !deviceInfo.isStandalone) {
    return (
      <div className="relative mb-4 bg-zinc-950 text-white p-3.5 sm:p-4 rounded-2xl border border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/25 flex items-center justify-center flex-shrink-0 text-blue-400">
            <Share size={19} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide">
                Enable iPhone Lock-Screen Alerts
              </h4>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 uppercase tracking-wider">
                Apple iOS
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
              Apple requires THREVOLT on your Home Screen: Tap <strong>Share (⎋ / ↑)</strong> → <strong>Add to Home Screen</strong>, then open from your home screen.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setDismissed(true);
            sessionStorage.setItem('admin_push_banner_dismissed', 'true');
          }}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer self-end sm:self-auto"
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // If push is not supported, already subscribed, or blocked by browser
  if (!supported || isSubscribed || permission === 'denied') {
    return null;
  }

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      toast.success('🔔 Push notifications enabled! You will now receive instant order & chat alerts.');
      setDismissed(true);
      sessionStorage.setItem('admin_push_banner_dismissed', 'true');
    } else {
      const currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
      if (currentPerm === 'denied') {
        toast.error('Notifications are blocked by your browser. Please click the 🔒 icon in your address bar and set Notifications to "Allow".');
        setDismissed(true);
      } else {
        toast.error('To enable alerts, please click the 🔒 icon in your address bar and choose "Allow".');
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('admin_push_banner_dismissed', 'true');
  };

  // ── CASE 2: APPLE iOS (In Standalone PWA Mode) ──
  if (deviceInfo.isIOS && deviceInfo.isStandalone) {
    return (
      <div className="relative mb-4 bg-zinc-950 text-white p-3.5 sm:p-4 rounded-2xl border border-blue-500/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 text-blue-400">
            <Smartphone size={19} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide">
                Enable iPhone Lock-Screen Alerts
              </h4>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-500/25 text-blue-300 rounded border border-blue-500/40 uppercase tracking-wider">
                Apple iOS
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
              Allow lock-screen alerts to receive instant notifications when customers message or place orders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto relative z-10 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 active:scale-95 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check size={14} className="stroke-[3]" />
            )}
            Enable Lock-Screen Alerts
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Dismiss"
            aria-label="Dismiss banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── CASE 3: ANDROID MOBILE ──
  if (deviceInfo.isAndroid) {
    return (
      <div className="relative mb-4 bg-zinc-950 text-white p-3.5 sm:p-4 rounded-2xl border border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 text-white">
            <Smartphone size={19} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide">
                Enable Android Order & Chat Alerts
              </h4>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-white/15 text-white/90 rounded border border-white/15 uppercase tracking-wider">
                Android
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
              Get real-time sound chimes and lock-screen alerts whenever a customer places an order or messages support.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto relative z-10 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleEnable}
            disabled={loading}
            className="px-4 py-2 bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {loading ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <Check size={14} className="stroke-[3]" />
            )}
            Enable Alerts
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
            title="Dismiss"
            aria-label="Dismiss banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // ── CASE 3: DESKTOP (Windows / Mac / Linux) ──
  return (
    <div className="relative mb-4 bg-zinc-950 text-white p-3.5 sm:p-4 rounded-2xl border border-zinc-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden">
      <div className="flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 text-white">
          <Monitor size={19} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white tracking-wide">
              Enable Desktop Push Notifications
            </h4>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-white/15 text-white/90 rounded border border-white/15 uppercase tracking-wider">
              Desktop
            </span>
          </div>
          <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
            Receive audio chimes and system notifications for new orders and live chats, even when working in another tab.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto relative z-10 w-full sm:w-auto justify-end">
        <button
          type="button"
          onClick={handleEnable}
          disabled={loading}
          className="px-4 py-2 bg-white hover:bg-neutral-200 active:scale-95 text-black font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
        >
          {loading ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check size={14} className="stroke-[3]" />
          )}
          Enable Desktop Alerts
        </button>

        <button
          type="button"
          onClick={handleDismiss}
          className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

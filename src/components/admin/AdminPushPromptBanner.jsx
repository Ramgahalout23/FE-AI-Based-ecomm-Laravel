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
  const { supported, permission, isSubscribed, loading, subscribe, sendTest } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [testing, setTesting] = useState(false);

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

  const handleTest = async () => {
    setTesting(true);
    try {
      await sendTest();
      toast.success('🔔 Test alert sent! Check your Windows desktop / phone lock screen.');
    } catch (err) {
      toast.error('Could not send test alert: ' + (err?.response?.data?.message || err?.message || 'Check server connection'));
    } finally {
      setTesting(false);
    }
  };

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      toast.success('🔔 Push notifications enabled! You will now receive instant order & chat alerts.');
    } else {
      const currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
      if (currentPerm === 'denied') {
        toast.error('Notifications are blocked by your browser. Please click the 🔒 icon in your address bar and set Notifications to "Allow".');
      } else {
        toast.error('To enable alerts, please click the 🔒 icon in your address bar and choose "Allow".');
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('admin_push_banner_dismissed', 'true');
  };

  if (dismissed || !supported) {
    return null;
  }

  // ── CASE 0: PERMISSION DENIED BY BROWSER ──
  if (permission === 'denied') {
    return (
      <div className="relative mb-4 bg-red-950/90 text-white p-3.5 sm:p-4 rounded-2xl border border-red-500/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-400/30 flex items-center justify-center flex-shrink-0 text-red-400 font-bold text-lg">
            🔒
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white tracking-wide">
                Notifications Blocked by Browser
              </h4>
              <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-red-500/30 text-red-200 rounded border border-red-500/40 uppercase tracking-wider">
                Action Required
              </span>
            </div>
            <p className="text-xs text-red-200 mt-0.5 leading-relaxed">
              Order and chat alerts cannot appear outside the browser because notification permission is blocked. Click the <strong>🔒 icon</strong> next to the URL in your address bar and set Notifications to <strong>"Allow"</strong>.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="p-2 text-red-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer self-end sm:self-auto"
          title="Dismiss"
          aria-label="Dismiss banner"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // ── CASE 0.5: ALREADY SUBSCRIBED — COMPACT ACTIVE BAR WITH 1-CLICK TEST ──
  if (isSubscribed) {
    return (
      <div className="relative mb-4 bg-zinc-950 text-white p-3 sm:p-3.5 rounded-2xl border border-emerald-500/30 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-2.5 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-400 text-sm">
            🔔
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400 tracking-wide uppercase">
                Real-Time Admin Alerts Active
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Live orders and customer chats will alert your Windows Action Center or phone lock-screen.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto relative z-10 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
          >
            {testing ? (
              <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <BellRing size={13} />
            )}
            Send Test Alert
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    );
  }

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

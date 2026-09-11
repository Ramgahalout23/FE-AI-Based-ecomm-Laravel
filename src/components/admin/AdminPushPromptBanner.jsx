import { useState, useEffect } from 'react';
import { Bell, BellRing, X, Sparkles, Check, Share } from 'lucide-react';
import usePushNotifications from '../../hooks/usePushNotifications';
import toast from '../../utils/toast';

export default function AdminPushPromptBanner() {
  const { supported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);

  const isIOS =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  const isStandalone =
    typeof window !== 'undefined' &&
    (window.navigator?.standalone === true || window.matchMedia('(display-mode: standalone)').matches);

  useEffect(() => {
    const isDismissed = sessionStorage.getItem('admin_push_banner_dismissed') === 'true';
    if (isDismissed) {
      setDismissed(true);
    }
  }, []);

  if (dismissed) {
    return null;
  }

  // iOS Safari/Chrome regular tabs do not support Push API until added to Home Screen
  if (isIOS && !isStandalone) {
    return (
      <div className="relative mb-4 bg-gradient-to-r from-blue-950/90 via-zinc-900 to-zinc-950 text-white p-3.5 sm:p-4 rounded-2xl border border-blue-500/30 shadow-lift flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center flex-shrink-0 text-blue-400">
            <Share size={20} />
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
            <p className="text-xs text-zinc-300 mt-0.5">
              Apple requires THREVOLT on your Home Screen: Tap <strong>Share (⎋ / ↑)</strong> → <strong>Add to Home Screen</strong>, then open the app from your home screen.
            </p>
          </div>
        </div>
        <button
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

  if (!supported || isSubscribed || permission === 'denied') {
    return null;
  }

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      toast.success('🔔 Push notifications enabled! You will now receive instant order & chat alerts.');
    } else {
      const currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
      if (currentPerm === 'denied') {
        toast.error('Notifications are blocked by your browser. Please click the 🔒 icon in your address bar and set Notifications to "Allow".');
      } else {
        toast.error('To enable alerts, please click the 🔒 or 🔔 icon in your address bar and choose "Allow".');
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('admin_push_banner_dismissed', 'true');
  };

  return (
    <div className="relative mb-4 bg-gradient-to-r from-emerald-900/90 via-zinc-900 to-zinc-950 text-white p-3.5 sm:p-4 rounded-2xl border border-emerald-500/30 shadow-lift flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 overflow-hidden">
      {/* Background glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center gap-3 relative z-10">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center flex-shrink-0 text-emerald-400 animate-pulse">
          <BellRing size={20} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-white tracking-wide">
              Enable Real-time Push Alerts
            </h4>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30 uppercase tracking-wider">
              Recommended
            </span>
          </div>
          <p className="text-xs text-zinc-300 mt-0.5">
            Get instant desktop and lock-screen sound alerts when customers place orders or message support.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-auto relative z-10 w-full sm:w-auto justify-end">
        <button
          onClick={handleEnable}
          disabled={loading}
          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-xs rounded-xl shadow-glow-emerald transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <span className="inline-block w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Check size={14} className="stroke-[3]" />
          )}
          Enable Alerts
        </button>

        <button
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

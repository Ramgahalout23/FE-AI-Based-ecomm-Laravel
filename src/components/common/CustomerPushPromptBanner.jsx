import { useState, useEffect } from 'react';
import { Bell, Check, X, ShieldCheck } from 'lucide-react';
import usePushNotifications from '../../hooks/usePushNotifications';
import toast from '../../utils/toast';

/**
 * CustomerPushPromptBanner — Luxury Monochrome Floating Micro-Prompt.
 * Styled in pure luxury black & white (THREVOLT Luxe design system):
 * - Non-intrusive floating position at bottom-right (desktop) and above mobile nav (mobile)
 * - Never pushes the page content or navbar down
 * - High-contrast black/white luxury pill design (Zara / Apple / SSENSE style)
 * - Delayed appearance (6s) so page loading is completely unimpeded
 * - Remembers dismissal in localStorage so it never pesters the user again
 */
export default function CustomerPushPromptBanner() {
  const { supported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Check persistent opt-out or previous dismissal
    const isDismissed =
      typeof window !== 'undefined' &&
      (localStorage.getItem('customer_push_dismissed_v2') === 'true' ||
       sessionStorage.getItem('customer_push_banner_dismissed') === 'true' ||
       localStorage.getItem('customer_push_opt_out') === 'true');

    if (!isDismissed) {
      // 6-second delay: lets the visitor explore the products first without distraction
      const timer = setTimeout(() => {
        setDismissed(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Do not display if unsupported, already subscribed, blocked by browser, or dismissed
  if (!supported || isSubscribed || permission === 'denied' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      toast.success('Alerts enabled! You will now receive lock-screen order tracking & chat replies.');
      setDismissed(true);
      localStorage.setItem('customer_push_dismissed_v2', 'true');
    } else {
      const currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
      if (currentPerm === 'denied') {
        toast.error('Notifications are blocked by your browser. Please click the 🔒 icon in your address bar and set Notifications to "Allow".');
        setDismissed(true);
        localStorage.setItem('customer_push_dismissed_v2', 'true');
      } else {
        toast.error('To enable alerts, please click the 🔒 icon in your address bar and choose "Allow".');
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('customer_push_dismissed_v2', 'true');
  };

  return (
    <aside
      aria-label="Order and support push notifications"
      className="fixed z-50 bottom-20 left-4 right-4 sm:bottom-6 sm:right-6 sm:left-auto sm:max-w-sm pointer-events-auto"
    >
      <div className="relative overflow-hidden rounded-2xl bg-black text-white p-4 border border-white/15 shadow-2xl backdrop-blur-xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-start gap-3.5">
          {/* Refined minimalist bell icon in monochrome box */}
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 text-white">
            <Bell size={18} className="stroke-[1.75]" />
          </div>

          <div className="flex-1 min-w-0 pr-5">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white tracking-tight">
                Delivery & VIP Updates
              </h4>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold bg-white/10 text-white/80 rounded tracking-wider uppercase">
                Alerts
              </span>
            </div>
            <p className="text-xs text-white/70 mt-1 leading-relaxed">
              Instant lock-screen updates for your parcels, dispatch tracking, and customer support replies.
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-2.5 mt-3.5">
              <button
                type="button"
                onClick={handleEnable}
                disabled={loading}
                className="px-4 py-1.5 bg-white hover:bg-neutral-100 active:scale-95 text-black font-semibold text-xs rounded-full transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {loading ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Allowing...
                  </>
                ) : (
                  <>
                    <Check size={13} className="stroke-[2.5]" />
                    Enable Alerts
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="text-xs font-medium text-white/50 hover:text-white px-2 py-1 transition-colors cursor-pointer"
              >
                Not now
              </button>
            </div>
          </div>

          {/* Quick Close Button */}
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss alert prompt"
            className="absolute top-3.5 right-3.5 p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}

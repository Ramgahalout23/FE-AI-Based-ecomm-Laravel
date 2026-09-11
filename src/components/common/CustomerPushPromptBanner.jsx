import { useState, useEffect } from 'react';
import { BellRing, Bell, Check, X, ShieldCheck } from 'lucide-react';
import usePushNotifications from '../../hooks/usePushNotifications';
import toast from '../../utils/toast';

export default function CustomerPushPromptBanner() {
  const { supported, permission, isSubscribed, loading, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Only show after a small initial delay (3s) so the initial page paint is instantaneous
    const isDismissed =
      typeof window !== 'undefined' &&
      (sessionStorage.getItem('customer_push_banner_dismissed') === 'true' ||
       localStorage.getItem('customer_push_opt_out') === 'true');

    if (!isDismissed) {
      const timer = setTimeout(() => {
        setDismissed(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Do not display if not supported, already subscribed, blocked by browser, or dismissed
  if (!supported || isSubscribed || permission === 'denied' || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    const success = await subscribe();
    if (success) {
      toast.success('🔔 Alerts enabled! You will now receive lock-screen order tracking & chat replies.');
      setDismissed(true);
      sessionStorage.setItem('customer_push_banner_dismissed', 'true');
    } else {
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        toast.error('Notifications are blocked in your browser. Please allow them in site settings.');
        setDismissed(true);
      } else {
        toast.error('Could not activate notifications. Please try again.');
      }
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('customer_push_banner_dismissed', 'true');
  };

  return (
    <aside
      aria-label="Order & Support Push Notifications"
      className="relative z-40 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-2 pb-1"
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-neutral-900 to-zinc-950 text-white p-3 sm:p-4 border border-emerald-500/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
        {/* Ambient subtle glow */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0 text-emerald-400">
            <BellRing size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white tracking-wide">
                Live Delivery & Support Alerts
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                <ShieldCheck size={11} /> Real-time
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-0.5 leading-relaxed">
              Receive lock-screen updates when your order ships, arrives, or when support replies to you.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto relative z-10 w-full sm:w-auto justify-end">
          <button
            onClick={handleEnable}
            disabled={loading}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
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
            title="Dismiss notification prompt"
            aria-label="Dismiss banner"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

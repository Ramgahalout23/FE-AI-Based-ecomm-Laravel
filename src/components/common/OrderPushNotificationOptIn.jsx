import { useState } from 'react';
import { BellRing, Bell, Check, Smartphone, Sparkles } from 'lucide-react';
import usePushNotifications from '../../hooks/usePushNotifications';
import toast from '../../utils/toast';

export default function OrderPushNotificationOptIn({ orderId }) {
  const { supported, permission, isSubscribed, loading, subscribe, sendTest } = usePushNotifications();
  const [testing, setTesting] = useState(false);

  if (!supported || permission === 'denied') {
    return null;
  }

  const handleSubscribe = async () => {
    const success = await subscribe();
    if (success) {
      toast.success('🔔 Delivery alerts enabled! You will be notified when your order ships.');
    } else {
      const currentPerm = typeof Notification !== 'undefined' ? Notification.permission : 'default';
      if (currentPerm === 'denied') {
        toast.error('Notifications are blocked by your browser. Please click the 🔒 icon in your address bar and set Notifications to "Allow".');
      } else {
        toast.error('To enable alerts, please click the 🔒 or 🔔 icon in your address bar and choose "Allow".');
      }
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      await sendTest();
      toast.success('Test notification dispatched!');
    } catch {
      toast.error('Failed to send test notification');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-4 bg-gradient-to-br from-emerald-50/70 via-white to-zinc-50 rounded-2xl border border-emerald-500/20 shadow-sm text-left transition-all">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
            isSubscribed ? 'bg-emerald-500/15 text-emerald-600' : 'bg-zinc-100 text-zinc-600'
          }`}>
            {isSubscribed ? <BellRing size={20} className="animate-pulse" /> : <Bell size={20} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-gray-900">
                Live Delivery Updates
              </h4>
              {isSubscribed && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  <Check size={10} className="stroke-[3]" /> Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {isSubscribed
                ? 'You will receive lock-screen alerts when your order is packed, shipped, and out for delivery.'
                : 'Get instant push notifications when your package is packed, shipped, and delivered.'}
            </p>
          </div>
        </div>

        <div className="flex-shrink-0 self-end sm:self-center">
          {isSubscribed ? (
            <button
              onClick={handleTest}
              disabled={testing}
              className="text-xs px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 rounded-lg shadow-2xs font-medium cursor-pointer transition-colors"
            >
              {testing ? 'Testing...' : 'Send Test'}
            </button>
          ) : (
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Smartphone size={13} />
              {loading ? 'Enabling...' : 'Enable Alerts'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

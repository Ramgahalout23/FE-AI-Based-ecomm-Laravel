/**
 * PushNotificationToggle
 *
 * Premium toggle component for enabling/disabling browser push notifications.
 * Shows permission status and allows subscribe/unsubscribe/test.
 */

import { useState } from 'react';
import { Bell, BellOff, BellRing, Smartphone, Check, X } from 'lucide-react';
import usePushNotifications from '../../hooks/usePushNotifications';

export default function PushNotificationToggle() {
  const {
    supported,
    permission,
    isSubscribed,
    loading,
    subscribe,
    unsubscribe,
    sendTest,
  } = usePushNotifications();

  const [showTest, setShowTest] = useState(false);

  if (!supported) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
        <BellOff size={20} className="text-gray-400" />
        <div>
          <p className="text-sm font-medium text-gray-600">Push Notifications</p>
          <p className="text-xs text-gray-400">Not supported in this browser</p>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100">
        <BellOff size={20} className="text-red-400" />
        <div>
          <p className="text-sm font-medium text-red-700">Notifications Blocked</p>
          <p className="text-xs text-red-400">
            You've blocked notifications. Enable them in your browser settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSubscribed ? (
            <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
              <BellRing size={20} className="text-emerald-600" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center">
              <Bell size={20} className="text-gray-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Order Updates
            </p>
            <p className="text-xs text-gray-500">
              {isSubscribed
                ? 'Get notified on your phone when order status changes'
                : 'Enable to get instant order updates on your phone'}
            </p>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={loading}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            isSubscribed ? 'bg-emerald-600' : 'bg-gray-200'
          } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              isSubscribed ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Status bar */}
      {isSubscribed && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
          <Smartphone size={14} className="text-gray-400" />
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Check size={12} className="text-emerald-500" />
            Active — you'll receive lock screen notifications
          </span>
          <button
            onClick={sendTest}
            className="ml-auto text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Test
          </button>
        </div>
      )}

      {permission === 'default' && !isSubscribed && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <Bell size={12} />
            Tap the toggle to enable — your browser will ask for permission
          </p>
        </div>
      )}
    </div>
  );
}

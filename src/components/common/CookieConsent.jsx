import { Info, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function CookieConsent({ enabled = true }) {
  const [showModal, setShowModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Don't show if disabled via admin toggle
    if (!enabled) return;
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      setTimeout(() => setShowModal(true), 1000);
    }
  }, [enabled]);

  // If admin has disabled cookie consent, never render
  if (!enabled) return null;

  const handleAcceptAll = () => {
    localStorage.setItem('cookieConsent', JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    }));
    setShowModal(false);
    setShowSettings(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem('cookieConsent', JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString()
    }));
    setShowModal(false);
    setShowSettings(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookieConsent', JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString()
    }));
    setShowModal(false);
    setShowSettings(false);
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {!showSettings ? (
          <>
            {/* Header */}
            <div className="p-5 pb-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <Info size={20} />
                </div>
                <h2 className="font-display text-lg font-bold text-black">We use cookies</h2>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                We use cookies to improve your experience. By continuing, you agree to our use of cookies.
              </p>
            </div>

            {/* Options - compact */}
            <div className="px-5 pb-3 space-y-2">
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-black">Analytics</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                </label>
              </div>
              <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-black">Marketing</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 pt-3 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => setShowSettings(true)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-black border-2 border-gray-200 rounded-lg hover:border-black transition-colors"
              >
                Settings
              </button>
              <button
                onClick={handleAcceptEssential}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-black bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reject
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
              >
                Accept
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Settings View */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-bold text-black">Cookie Settings</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-black">Necessary</p>
                    <p className="text-xs text-gray-500">Required for cart & checkout</p>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Required</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-black">Analytics</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-black">Marketing</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="p-5 pt-0">
              <button
                onClick={handleSavePreferences}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors"
              >
                Save Preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
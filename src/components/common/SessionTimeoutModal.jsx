import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

;

const COUNTDOWN_SECONDS = 300; // 5 minutes

export default function SessionTimeoutModal({ open, onStayLoggedIn }) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setCountdown(COUNTDOWN_SECONDS);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [open]);

  // Auto-focus the button when modal opens
  useEffect(() => {
    if (open && buttonRef.current) {
      buttonRef.current.focus();
    }
  }, [open]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Circular progress SVG
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = countdown / COUNTDOWN_SECONDS;
  const dashOffset = circumference * (1 - progress);

  // Urgency levels
  const isUrgent = countdown <= 60;
  const isCritical = countdown <= 30;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-md animate-fade-in"
        onClick={onStayLoggedIn}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-border animate-scale-in overflow-hidden">
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

        {/* Icon */}
        <div className={`flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-5 transition-all duration-500 ${
          isCritical ? 'bg-red-100 scale-110' : isUrgent ? 'bg-orange-100' : 'bg-amber-100'
        }`}>
          <AlertTriangle size={32} className={`transition-colors duration-500 ${
            isCritical ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-amber-500'
          }`} />
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-text-primary mb-2">
          {t('session.expiring_title')}
        </h2>

        {/* Message */}
        <p className="text-sm text-text-muted text-center mb-6 leading-relaxed max-w-xs mx-auto">
          {t('session.expiring_desc')}
        </p>

        {/* ── Circular Countdown ── */}
        <div className="flex justify-center mb-6">
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Background ring */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50" cy="50" r={radius}
                fill="none"
                stroke="#f1f1f1"
                strokeWidth="6"
              />
              <circle
                cx="50" cy="50" r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                className={`transition-all duration-1000 ease-linear ${
                  isCritical ? 'text-red-500' : isUrgent ? 'text-orange-500' : 'text-amber-500'
                }`}
              />
            </svg>
            {/* Center content */}
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold font-mono tabular-nums text-text-primary">
                {formatTime(countdown)}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-medium mt-0.5">
                remaining
              </span>
            </div>
          </div>
        </div>

        {/* ── Prominent Extension Button ── */}
        <button
          ref={buttonRef}
          onClick={onStayLoggedIn}
          className={`group relative w-full py-4 font-bold rounded-2xl transition-all duration-300 shadow-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 ${
            isCritical
              ? 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-red-500/30 animate-pulse'
              : isUrgent
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/30'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/30'
          }`}
        >
          {/* Shine effect */}
          <span className="absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.2)_50%,transparent_70%)] translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 ease-in-out" />

          {/* Button content */}
          <span className="relative flex items-center justify-center gap-3 text-base">
            <RefreshCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
            {t('session.stay_logged_in')}
          </span>
        </button>

        {/* Subtle hint */}
        <p className="text-[12px] text-text-muted text-center mt-4 leading-relaxed">
          {t('session.click_to_stay')}
        </p>
      </div>
    </div>
  );
}

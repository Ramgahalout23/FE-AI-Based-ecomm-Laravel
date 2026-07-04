import { AlertTriangle, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

;

const COUNTDOWN_SECONDS = 300; // 5 minutes

export default function SessionTimeoutModal({ open, onStayLoggedIn }) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

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

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onStayLoggedIn}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 animate-scale-in border border-border">
        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-warning-bg mx-auto mb-4">
          <AlertTriangle size={28} />
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-center text-text-primary mb-2">
          {t('session.expiring_title')}
        </h2>

        {/* Message */}
        <p className="text-sm text-text-muted text-center mb-6 leading-relaxed">
          {t('session.expiring_desc')}
        </p>

        {/* Countdown */}
        <div className="flex items-center justify-center gap-2 mb-6 p-3 bg-surface rounded-xl border border-border/50">
          <Clock size={18} />
          <span className="text-lg font-bold text-text-primary font-mono tabular-nums">
            {formatTime(countdown)}
          </span>
          <span className="text-xs text-text-muted">{t('session.time_remaining')}</span>
        </div>

        {/* Action button */}
        <button
          onClick={onStayLoggedIn}
          className="w-full py-3 bg-brand-black text-white font-semibold rounded-xl hover:bg-black active:bg-brand-black-hover transition-all text-sm shadow-lg hover:shadow-xl"
        >
          {t('session.stay_logged_in')}
        </button>

        <p className="text-[11px] text-text-muted text-center mt-4">
          {t('session.click_to_stay')}
        </p>
      </div>
    </div>
  );
}

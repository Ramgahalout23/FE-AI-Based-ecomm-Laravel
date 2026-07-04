import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

function getTimeRemaining(endDate) {
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const diff = end - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, expired: true };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    total: diff,
    expired: false,
  };
}

function TimeUnit({ value, label, compact }) {
  const display = String(value).padStart(2, '0');
  return (
    <div className={`flex flex-col items-center ${compact ? 'gap-0' : 'gap-0.5'}`}>
      <div className={`
        flex items-center justify-center font-mono font-bold tabular-nums leading-none
        ${compact ? 'text-lg md:text-xl' : 'text-xl md:text-3xl'}
      `}>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={display}
            initial={{ y: 8, opacity: 0, filter: 'blur(2px)' }}
            animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
            exit={{ y: -8, opacity: 0, filter: 'blur(2px)' }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
            {display}
          </motion.span>
        </AnimatePresence>
      </div>
      <span className={`uppercase tracking-wider font-semibold ${compact ? 'text-[8px]' : 'text-[9px] md:text-[10px]'} opacity-60`}>
        {label}
      </span>
    </div>
  );
}

export default function FlashSaleCountdown({ endDate, label: labelProp, compact = false, onExpired, className = '' }) {
  const { t } = useTranslation();
  const label = labelProp ?? t('flash_sale.sale_ends_in');
  const [time, setTime] = useState(() => getTimeRemaining(endDate));
  const intervalRef = useRef(null);
  const expiredRef = useRef(false);

  const tick = useCallback(() => {
    const remaining = getTimeRemaining(endDate);
    setTime(remaining);

    if (remaining.expired && !expiredRef.current) {
      expiredRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (onExpired) onExpired();
    }
  }, [endDate, onExpired]);

  useEffect(() => {
    expiredRef.current = false;
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [endDate, tick]);

  if (time.expired) return null;

  const hasDays = time.days > 0;
  const showDays = hasDays || time.days > 0;

  return (
    <div className={`${className}`}>
      {label && (
        <p className={`font-bold uppercase tracking-wider ${compact ? 'text-[9px] mb-1' : 'text-[10px] md:text-xs mb-1.5 md:mb-2'} opacity-75`}>
          {label}
        </p>
      )}
      <div className={`flex items-center ${compact ? 'gap-2' : 'gap-2.5 md:gap-3'}`}>
        {/* Days — only shown when > 0 */}
        {showDays && (
          <>
            <TimeUnit value={time.days} label={t('flash_sale.days')} compact={compact} />
            <span className={`font-mono font-bold opacity-30 self-start mt-0.5 ${compact ? 'text-sm' : 'text-lg md:text-xl'}`}>:</span>
          </>
        )}

        <TimeUnit value={time.hours} label={t('flash_sale.hrs')} compact={compact} />
        <span className={`font-mono font-bold opacity-30 self-start mt-0.5 ${compact ? 'text-sm' : 'text-lg md:text-xl'}`}>:</span>
        <TimeUnit value={time.minutes} label={t('flash_sale.min')} compact={compact} />
        <span className={`font-mono font-bold opacity-30 self-start mt-0.5 ${compact ? 'text-sm' : 'text-lg md:text-xl'}`}>:</span>
        <TimeUnit value={time.seconds} label={t('flash_sale.sec')} compact={compact} />
      </div>
    </div>
  );
}

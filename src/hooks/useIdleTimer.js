/**
 * useIdleTimer — Tracks user inactivity and fires callbacks at configurable
 * warning and timeout thresholds. Resets the timer on any user interaction
 * (mousemove, click, keydown, scroll, touchstart).
 *
 * Usage:
 *   const { idleWarning, idleExpired, resetTimer } = useIdleTimer({
 *     idleTimeout: 8 * 60 * 60 * 1000,        // 8 hr — auto-logout
 *     warningTimeout: 7 * 60 * 60 * 1000 + 55 * 60 * 1000, // 7h55m — show warning
 *     onWarning: () => setShowWarning(true),
 *     onTimeout: () => logout(),
 *   });
 */
import { useEffect, useRef, useCallback } from 'react';

const DEFAULT_EVENTS = ['mousemove', 'mousedown', 'click', 'keydown', 'scroll', 'touchstart', 'touchmove', 'wheel'];

export default function useIdleTimer({
  idleTimeout = 8 * 60 * 60 * 1000,        // 8 hours
  warningTimeout = 7 * 60 * 60 * 1000 + 55 * 60 * 1000, // 7 hours 55 minutes
  onWarning = () => {},
  onTimeout = () => {},
  enabled = true,
}) {
  const timerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const listenersRef = useRef([]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  }, []);

  const resetTimer = useCallback(() => {
    clearTimers();
    if (!enabled) return;

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      onWarning();
    }, warningTimeout);

    // Set hard timeout
    timerRef.current = setTimeout(() => {
      onTimeout();
    }, idleTimeout);
  }, [enabled, warningTimeout, idleTimeout, onWarning, onTimeout, clearTimers]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Start the timer on mount
    resetTimer();

    // Attach listeners for all activity events
    const events = DEFAULT_EVENTS;
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });
    listenersRef.current = events;

    return () => {
      clearTimers();
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [enabled, resetTimer, clearTimers, handleActivity]);

  return { resetTimer };
}

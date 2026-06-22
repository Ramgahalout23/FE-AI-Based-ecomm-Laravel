import { useState, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * usePullToRefresh — A lightweight pull-to-refresh hook for mobile.
 *
 * @param {Object} options
 * @param {Function} options.onRefresh - Async function to call when pulled past threshold.
 * @param {number}  [options.threshold=80]  - Pull distance (px) required to trigger refresh.
 * @param {number}  [options.maxPull=130]   - Max pull distance (px) before hard stop.
 * @param {boolean} [options.disabled=false] - Disable pull-to-refresh (e.g. while loading).
 * @param {Element} [options.scrollableEl]   - Optional scrollable element ref. Defaults to window.
 *
 * @returns {{ pullDistance: number, isRefreshing: boolean, isPulling: boolean }}
 */
export default function usePullToRefresh({
  onRefresh,
  threshold = 80,
  maxPull = 130,
  disabled = false,
  scrollableEl = null,
} = {}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const touchStartYRef = useRef(0);
  const pullDistRef = useRef(0);
  const isPullingRef = useRef(false);
  const isRefreshingRef = useRef(false);
  const isAnimatingRef = useRef(false);

  /* ── Determine if we're on a touch device ── */
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  /* ── Reset on route change ── */
  const location = useLocation();
  useEffect(() => {
    setPullDistance(0);
    setIsPulling(false);
    pullDistRef.current = 0;
  }, [location.pathname]);

  /* ── Touch start ── */
  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshingRef.current || isAnimatingRef.current) return;

    const scrollTop = scrollableEl
      ? scrollableEl.scrollTop
      : (window.pageYOffset || document.documentElement.scrollTop);

    // Only activate when scrolled to the very top (with a small tolerance)
    if (scrollTop > 5) return;

    touchStartYRef.current = e.touches[0].clientY;
    pullDistRef.current = 0;
    setIsPulling(true);
    isPullingRef.current = true;
  }, [disabled, scrollableEl]);

  /* ── Touch move ── */
  const handleTouchMove = useCallback((e) => {
    if (!isPullingRef.current || isRefreshingRef.current || isAnimatingRef.current) return;

    const currentY = e.touches[0].clientY;
    let dist = (currentY - touchStartYRef.current) * 0.55; // friction factor

    // Only pulling down
    if (dist <= 0) {
      setPullDistance(0);
      pullDistRef.current = 0;
      return;
    }

    // Apply rubber-band resistance as we approach maxPull
    if (dist > maxPull * 0.6) {
      const excess = dist - maxPull * 0.6;
      dist = maxPull * 0.6 + excess * 0.3;
    }
    if (dist > maxPull) dist = maxPull;

    setPullDistance(Math.round(dist));
    pullDistRef.current = Math.round(dist);
  }, [isPulling, maxPull]);

  /* ── Touch end ── */
  const handleTouchEnd = useCallback(() => {
    if (!isPullingRef.current || isRefreshingRef.current) return;

    const dist = pullDistRef.current;

    if (dist >= threshold && !disabled) {
      // Trigger refresh
      setIsRefreshing(true);
      isRefreshingRef.current = true;

      // Show the spinner at the threshold position
      setPullDistance(threshold);

      const result = onRefresh ? onRefresh() : Promise.resolve();

      Promise.resolve(result).finally(() => {
        setIsRefreshing(false);
        isRefreshingRef.current = false;
        isAnimatingRef.current = true;

        // Animate back to zero
        setPullDistance(0);
        pullDistRef.current = 0;
        setIsPulling(false);
        isPullingRef.current = false;

        setTimeout(() => {
          isAnimatingRef.current = false;
        }, 350);
      });
    } else {
      // Not enough pull — spring back
      isAnimatingRef.current = true;
      setPullDistance(0);
      pullDistRef.current = 0;
      setIsPulling(false);
      isPullingRef.current = false;

      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 300);
    }
  }, [threshold, disabled, onRefresh]);

  /* ── Touch cancel ── */
  const handleTouchCancel = useCallback(() => {
    if (!isPullingRef.current) return;
    setPullDistance(0);
    pullDistRef.current = 0;
    setIsPulling(false);
    isPullingRef.current = false;
    isAnimatingRef.current = false;
  }, []);

  /* ── Attach / detach listeners ── */
  useEffect(() => {
    if (!isTouchDevice) return;

    const el = scrollableEl || window;
    const opts = { passive: true };

    el.addEventListener('touchstart', handleTouchStart, opts);
    el.addEventListener('touchmove', handleTouchMove, opts);
    el.addEventListener('touchend', handleTouchEnd, opts);
    el.addEventListener('touchcancel', handleTouchCancel, opts);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [isTouchDevice, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel, scrollableEl]);

  return { pullDistance, isRefreshing, isPulling };
}

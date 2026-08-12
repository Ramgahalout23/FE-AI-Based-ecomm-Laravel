import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Clock, RefreshCw, LogIn } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import useSessionStore from '../../store/sessionStore';
import { refreshSharedToken } from '../../api/client';

/** Show the banner when the access token has this much time (or less) left. */
const WARNING_MS = 5 * 60 * 1000;

function formatCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * TokenExpiryBanner — warns the admin when the access token is within a few
 * minutes of expiring and offers a one-click "stay logged in". The backend
 * refresh endpoint accepts recently-expired tokens (grace window), so the
 * banner even auto-renews right after expiry — clicking the button (or just
 * refreshing the page, which triggers the shared 401→refresh flow) swaps the
 * dying token for a fresh one without a login.
 */
export default function TokenExpiryBanner() {
  const tokenExpiresAt = useSessionStore((s) => s.tokenExpiresAt);
  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  const [renewFailed, setRenewFailed] = useState(false);
  const autoRenewedRef = useRef(false);

  const renew = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await refreshSharedToken();
      // refreshSharedToken records the new expiry in sessionStore, so the
      // banner hides itself on the next render.
      setRenewFailed(false);
      setNow(Date.now());
    } catch {
      setRenewFailed(true);
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  // Tick every second so the countdown stays live.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-renew once right after expiry — the backend grace window still
  // accepts the swap, so the session survives without any user action.
  useEffect(() => {
    if (!tokenExpiresAt) return;
    if (tokenExpiresAt - Date.now() <= 0 && !autoRenewedRef.current && !renewFailed) {
      autoRenewedRef.current = true;
      renew();
    }
  }, [tokenExpiresAt, now, renew, renewFailed]);

  // Coming back to a stale tab: if the token is already inside the warning
  // window (or just expired), renew immediately so the admin never finds a
  // dead session waiting for them.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const expiresAt = useSessionStore.getState().tokenExpiresAt;
      if (expiresAt && expiresAt - Date.now() <= WARNING_MS) {
        setNow(Date.now());
        renew();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [renew]);

  if (!tokenExpiresAt) return null;

  const remaining = tokenExpiresAt - now;
  const isExpired = remaining <= 0;
  const show = isExpired || remaining <= WARNING_MS;
  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={isExpired ? 'expired' : 'warning'}
        role="status"
        aria-live="polite"
        className={`token-expiry-banner ${isExpired ? 'token-expiry-banner--expired' : ''}`}
        initial={{ y: -56, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -56, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      >
        <div className="token-expiry-banner__inner">
          <div className={`token-expiry-banner__icon ${isExpired ? 'token-expiry-banner__icon--danger' : ''}`}>
            {isExpired ? <AlertTriangle size={15} /> : <Clock size={15} />}
          </div>

          <div className="token-expiry-banner__text">
            <span className="token-expiry-banner__message">
              {isExpired
                ? 'Your admin session just expired — renewing it keeps you logged in.'
                : 'Your admin session expires in'}
            </span>
            {!isExpired && <span className="token-expiry-banner__countdown">{formatCountdown(remaining)}</span>}
            {renewFailed && (
              <span className="token-expiry-banner__failed">Automatic renewal failed — try again or sign back in.</span>
            )}
          </div>

          <div className="token-expiry-banner__actions">
            {renewFailed ? (
              <>
                <button type="button" onClick={renew} className="token-expiry-banner__btn" disabled={refreshing}>
                  <RefreshCw size={14} className={refreshing ? 'token-expiry-banner__spin' : ''} />
                  {refreshing ? 'Renewing…' : 'Try again'}
                </button>
                <a href="/admin/login" className="token-expiry-banner__link">
                  <LogIn size={14} />
                  Sign in again
                </a>
              </>
            ) : (
              <button type="button" onClick={renew} className="token-expiry-banner__btn" disabled={refreshing}>
                <RefreshCw size={14} className={refreshing ? 'token-expiry-banner__spin' : ''} />
                {refreshing ? 'Renewing…' : 'Stay logged in'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import useSessionStore from '../../store/sessionStore';
import useAuthStore from '../../store/authStore';

/** Compact relative time: "just now", "3m ago", "2h ago", "4d ago". */
function timeAgo(ms) {
  if (!ms) return '—';
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 5) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function exactTime(ms) {
  if (!ms) return 'never';
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * SessionIndicator — small "session active" readout for the admin sidebar.
 * Shows the last successful auth check and the last token refresh so a
 * silently dying session (stale token, revoked elsewhere) becomes visible:
 * if the numbers stop updating, the session is no longer being validated.
 */
export default function SessionIndicator() {
  const { lastAuthCheck, lastTokenRefresh } = useSessionStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Re-render periodically so relative times stay fresh.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="session-indicator mt-2 pt-2 border-t border-white/5 select-none"
      title={`Session active: ${isAuthenticated ? 'yes' : 'no'}\nLast auth check: ${exactTime(lastAuthCheck)}\nToken refreshed: ${exactTime(lastTokenRefresh)}`}
    >
      <div className="flex items-center gap-1.5">
        <ShieldCheck size={10} className={isAuthenticated ? 'text-emerald-400' : 'text-red-400'} />
        <span className={`text-[9px] font-semibold uppercase tracking-wider ${isAuthenticated ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
          Session active
        </span>
        <span
          className={`w-1.5 h-1.5 rounded-full ml-auto ${isAuthenticated ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`}
        />
      </div>
      <div className="mt-1.5 space-y-0.5 text-[9px] text-white/30 leading-tight">
        <div className="flex items-center justify-between gap-2">
          <span>Auth check</span>
          <span className={lastAuthCheck ? 'text-white/45' : ''}>{timeAgo(lastAuthCheck)}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span>Token refresh</span>
          <span className={lastTokenRefresh ? 'text-white/45' : ''}>{timeAgo(lastTokenRefresh)}</span>
        </div>
      </div>
    </div>
  );
}

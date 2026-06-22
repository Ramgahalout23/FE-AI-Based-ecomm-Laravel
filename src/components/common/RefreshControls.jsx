import { useState, useRef, useEffect } from 'react';

const INTERVAL_OPTIONS = [
  { label: 'Off', value: null },
  { label: '30s', value: 30000 },
  { label: '1m', value: 60000 },
  { label: '2m', value: 120000 },
  { label: '5m', value: 300000 },
];

export default function RefreshControls({ interval, onIntervalChange, onManualRefresh, loading, onClearCache }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef(null);

  // Countdown ticker — only when interval is active
  useEffect(() => {
    if (!interval) {
      setCountdown(0);
      return;
    }

    setCountdown(Math.round(interval / 1000));

    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) return Math.round(interval / 1000);
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownRef.current);
  }, [interval]);

  // Reset countdown after each refresh completes
  useEffect(() => {
    if (!loading && interval) {
      setCountdown(Math.round(interval / 1000));
    }
  }, [loading, interval]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const activeOption = INTERVAL_OPTIONS.find(o => o.value === interval) || INTERVAL_OPTIONS[0];

  return (
    <div className="refresh-controls" ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}>
      {/* Clear cache button */}
      {onClearCache && (
        <button
          onClick={onClearCache}
          disabled={loading}
          title="Clear cache &amp; refresh"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            border: '1.5px solid #e5e5ea',
            borderRadius: '10px',
            background: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: loading ? 0.5 : 1,
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.background = '#fef2f2'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e5ea'; e.currentTarget.style.background = '#fff'; }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a8a9a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      )}

      {/* Manual refresh button */}
      <button
        onClick={onManualRefresh}
        disabled={loading}
        title="Refresh now"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '36px',
          height: '36px',
          border: '1.5px solid #e5e5ea',
          borderRadius: '10px',
          background: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          opacity: loading ? 0.5 : 1,
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.borderColor = '#1a1a1a'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e5ea'; }}
      >
        <svg
          width="16" height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#8a8a9a"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }}
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      </button>

      {/* Auto-refresh interval selector */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0.5rem 0.75rem',
          border: '1.5px solid #e5e5ea',
          borderRadius: '10px',
          background: '#fff',
          cursor: 'pointer',
          fontSize: '0.78rem',
          fontWeight: 500,
          color: interval ? '#1a1a1a' : '#8a8a9a',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e5ea'; }}
      >
        {/* Live indicator dot */}
        {interval ? (
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: '#22c55e', display: 'inline-block',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
        ) : (
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#d1d1d6', display: 'inline-block' }} />
        )}
        <span>{interval ? `Auto ${activeOption.label}` : 'Auto-refresh Off'}</span>
        {interval && countdown > 0 && (
          <span style={{ fontSize: '0.68rem', color: '#8a8a9a', fontWeight: 400, minWidth: '24px', textAlign: 'right' }}>
            {countdown}s
          </span>
        )}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8a8a9a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          background: '#fff',
          border: '1px solid #e5e5ea',
          borderRadius: '12px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
          minWidth: '160px',
          zIndex: 50,
          overflow: 'hidden',
          animation: 'fadeSlideIn 0.15s ease',
        }}>
          <div style={{ padding: '4px' }}>
            {INTERVAL_OPTIONS.map((opt) => {
              const isActive = opt.value === interval;
              return (
                <button
                  key={opt.label}
                  onClick={() => {
                    onIntervalChange(opt.value);
                    setOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: isActive ? '#1a1a1a' : 'transparent',
                    color: isActive ? '#fff' : '#1a1a2e',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 600 : 400,
                    textAlign: 'left',
                    transition: 'all 0.1s ease',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#f5f5f5'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {opt.value ? (
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: isActive ? '#22c55e' : '#d1d1d6', display: 'inline-block' }} />
                  ) : (
                    <span style={{ width: '7px', height: '7px', borderRadius: '2px', background: isActive ? '#fff' : '#d1d1d6', display: 'inline-block' }} />
                  )}
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Last refreshed hint */}
          <div style={{
            padding: '0.4rem 0.75rem',
            borderTop: '1px solid #f0f0f0',
            fontSize: '0.65rem',
            color: '#b0b0b8',
            textAlign: 'center',
          }}>
            {interval ? `Refreshes every ${activeOption.label}` : 'Manual refresh only'}
          </div>
        </div>
      )}
    </div>
  );
}

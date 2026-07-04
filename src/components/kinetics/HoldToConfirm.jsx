import { useState, useRef, useCallback } from 'react';

/**
 * HoldToConfirm — press and hold a button; a ring fills.
 * Release early to cancel, hold the full duration to confirm.
 *
 * @param {number} ms - Hold duration in ms. Default 800.
 * @param {function} onConfirm - callback when held long enough.
 * @param {string} label - Button label text.
 * @param {boolean} disabled
 */
export default function HoldToConfirm({
  onConfirm,
  ms = 800,
  label = 'Hold to confirm',
  disabled = false,
  className = '',
  ...props
}) {
  const [state, setState] = useState('idle'); // idle | holding | completed
  const timerRef = useRef(null);

  const handleStart = useCallback(() => {
    if (disabled) return;
    setState('holding');
    timerRef.current = setTimeout(() => {
      setState('completed');
      if (onConfirm) onConfirm();
    }, ms);
  }, [disabled, ms, onConfirm]);

  const handleEnd = useCallback(() => {
    if (state === 'completed') return;
    clearTimeout(timerRef.current);
    setState('idle');
  }, [state]);

  const circumference = 2 * Math.PI * 33; // r=33

  return (
    <button
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      disabled={disabled || state === 'completed'}
      className={`kinetics-hold-btn ${state} ${className}`}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '10px 24px',
        borderRadius: '12px',
        border: state === 'completed' ? '2px solid #22c55e' : '2px solid #e5e5ea',
        background: state === 'completed' ? '#e8f8f1' : 'white',
        color: state === 'completed' ? '#22c55e' : '#1a1a1a',
        fontWeight: 600,
        fontSize: '0.85rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        outline: 'none',
        overflow: 'hidden',
        ...props.style,
      }}
      {...props}
    >
      {/* Progress ring */}
      <svg
        width="24"
        height="24"
        viewBox="0 0 72 72"
        className="kinetics-hold-ring"
        style={{ flexShrink: 0 }}
      >
        <circle
          cx="36"
          cy="36"
          r="33"
          fill="none"
          stroke="#e5e5ea"
          strokeWidth="3"
        />
        <circle
          cx="36"
          cy="36"
          r="33"
          className="kinetics-hold-progress"
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: state === 'holding' ? 0 : circumference,
            transition: state === 'holding'
              ? `stroke-dashoffset ${ms}ms linear`
              : 'stroke-dashoffset 0.2s ease-out',
          }}
        />
      </svg>

      <span>{state === 'completed' ? '✓ Done' : state === 'holding' ? 'Hold...' : label}</span>
    </button>
  );
}

/* ── Premium Order Confirmed Toast Component ────── */

export default function OrderConfirmedToast({ title, orderId, subtitle }) {
  return (
    <div className="flex items-start gap-3.5" style={{ minWidth: 280, maxWidth: 380 }}>
      {/* Animated checkmark */}
      <div className="checkmark-circle shrink-0" style={{ marginTop: 1 }}>
        <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
          <circle cx="19" cy="19" r="17" fill="#22c55e" className="checkmark-bg" />
          <path
            d="M11 19.5l5.5 5.5L27 14"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="checkmark-path"
          />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-bold text-black" style={{ fontSize: '0.9375rem', lineHeight: 1.3, marginBottom: 2 }}>
          {title}
        </p>
        {orderId && (
          <span
            style={{
              display: 'inline-block',
              fontSize: '0.6875rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              background: '#f3f4f6',
              color: '#6b7280',
              padding: '2px 8px',
              borderRadius: 6,
              marginBottom: 4,
            }}
          >
            Order #{typeof orderId === 'string' ? orderId.slice(-8).toUpperCase() : orderId}
          </span>
        )}
        {subtitle && (
          <p style={{ fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.4, marginTop: orderId ? 2 : 0 }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

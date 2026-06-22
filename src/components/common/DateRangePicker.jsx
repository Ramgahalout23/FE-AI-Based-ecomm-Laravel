import { useState, useRef, useEffect, useCallback } from 'react';

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 30 Days', days: 30 },
  { label: 'This Month', custom: 'thisMonth' },
  { label: 'Last Month', custom: 'lastMonth' },
  { label: 'This Year', custom: 'thisYear' },
  { label: 'Custom Range', custom: 'custom' },
];

function computePresetRange(preset) {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start;

  if (preset.days !== undefined) {
    start = new Date(now);
    start.setDate(start.getDate() - preset.days);
    start.setHours(0, 0, 0, 0);
  } else if (preset.custom === 'thisMonth') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset.custom === 'lastMonth') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end.setTime(new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime());
  } else if (preset.custom === 'thisYear') {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    start = new Date(now);
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
  }

  return { start, end };
}

function formatDateLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [activePreset, setActivePreset] = useState('Last 30 Days');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const ref = useRef(null);

  const currentRange = value || computePresetRange(PRESETS[2]);

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

  const applyPreset = useCallback((preset) => {
    if (preset.custom === 'custom') {
      setActivePreset('Custom Range');
      return;
    }
    const range = computePresetRange(preset);
    setActivePreset(preset.label);
    onChange(range);
    setOpen(false);
  }, [onChange]);

  const applyCustomRange = useCallback(() => {
    if (customStart && customEnd) {
      const start = new Date(customStart);
      start.setHours(0, 0, 0, 0);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      if (start <= end) {
        onChange({ start, end });
        setActivePreset('Custom Range');
        setOpen(false);
      }
    }
  }, [customStart, customEnd, onChange]);

  const label = activePreset === 'Custom Range'
    ? `${formatDateLabel(currentRange.start)} — ${formatDateLabel(currentRange.end)}`
    : activePreset;

  return (
    <div className="date-range-picker" ref={ref} style={{ position: 'relative' }}>
      <button
        className="date-range-trigger"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0.6rem 1rem',
          border: '1.5px solid #e5e5ea',
          borderRadius: '12px',
          background: '#fff',
          cursor: 'pointer',
          fontSize: '0.82rem',
          fontWeight: 500,
          color: '#1a1a2e',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e5ea'; }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8a8a9a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8a8a9a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="date-range-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: '#fff',
            border: '1px solid #e5e5ea',
            borderRadius: '14px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            minWidth: '320px',
            zIndex: 50,
            overflow: 'hidden',
            animation: 'fadeSlideIn 0.2s ease',
          }}
        >
          {/* Presets */}
          <div style={{ padding: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            {PRESETS.map((preset) => {
              const isActive = activePreset === preset.label;
              return (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  style={{
                    padding: '0.5rem 0.75rem',
                    border: 'none',
                    borderRadius: '8px',
                    background: isActive ? '#1a1a1a' : 'transparent',
                    color: isActive ? '#fff' : '#1a1a2e',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: isActive ? 600 : 450,
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#f5f5f5'; }}
                  onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Custom Range Inputs */}
          {activePreset === 'Custom Range' && (
            <div style={{ padding: '0 0.75rem 0.75rem', borderTop: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', gap: '8px', paddingTop: '0.75rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>From</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.6rem',
                      border: '1.5px solid #e5e5ea',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      outline: 'none',
                      background: '#fafafa',
                      color: '#1a1a2e',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e5ea'; }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#8a8a9a', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>To</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.45rem 0.6rem',
                      border: '1.5px solid #e5e5ea',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      outline: 'none',
                      background: '#fafafa',
                      color: '#1a1a2e',
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = '#1a1a1a'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = '#e5e5ea'; }}
                  />
                </div>
              </div>
              <button
                onClick={applyCustomRange}
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '0.5rem',
                  border: 'none',
                  borderRadius: '8px',
                  background: '#1a1a1a',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#000'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a1a'; }}
              >
                Apply Range
              </button>
            </div>
          )}

          {/* Current range display */}
          <div style={{
            padding: '0.5rem 0.75rem',
            background: '#f9f9fb',
            borderTop: '1px solid #f0f0f0',
            fontSize: '0.7rem',
            color: '#8a8a9a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>
              {formatDateLabel(currentRange.start)} — {formatDateLabel(currentRange.end)}
            </span>
            <button
              onClick={() => { setOpen(false); }}
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: '0.7rem',
                color: '#8a8a9a',
                fontWeight: 600,
                textDecoration: 'underline',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to get ISO strings from range
export function getDateParams(range) {
  if (!range) return {};
  return {
    startDate: range.start.toISOString().split('T')[0],
    endDate: range.end.toISOString().split('T')[0],
  };
}

// Default range (last 30 days)
export function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 30);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

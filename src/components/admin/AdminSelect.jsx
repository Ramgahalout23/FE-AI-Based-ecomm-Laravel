/**
 * AdminSelect — styled dropdown replacing native <select> in the admin panel.
 *
 * The closed control is a button (selected value + rotating chevron); the open
 * state is an animated framer-motion popup with hover/active rows, a check on
 * the selected option, keyboard navigation (↑/↓, Enter, Esc), and click-outside
 * to close. Opens upward automatically when there isn't room below.
 *
 * Props:
 * - value       — current value (string)
 * - onChange    — (value) => void
 * - options     — [{ value, label, dot?, hint? }, ...] or array of strings
 * - placeholder — shown when no value matches
 * - dotClass    — optional CSS class for a status dot before the label
 *                 (e.g. 'status-active') — applied to the selected button and
 *                 each option; `dot` on an option overrides it
 * - size        — 'sm' (compact, row actions) | 'md' (toolbar, default)
 * - className   — extra classes
 * - style       — extra inline styles
 * - ariaLabel   — accessibility label for the trigger button
 *
 * Usage:
 * ```jsx
 * <AdminSelect
 *   value={o.status}
 *   onChange={(v) => handleStatus(o.id, v)}
 *   options={STATUS_OPTIONS}
 *   dotClass={(v) => ORDER_STATUSES[v]?.class}
 *   size="sm"
 * />
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

const EASE = [0.16, 1, 0.3, 1];

function normalizeOptions(options) {
  return (options || []).map((o) => (
    typeof o === 'string' || typeof o === 'number'
      ? { value: o, label: String(o) }
      : { value: o.value, label: o.label ?? String(o.value), dot: o.dot, hint: o.hint }
  ));
}

export default function AdminSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select...',
  dotClass,
  size = 'md',
  className = '',
  style,
  ariaLabel,
  disabled = false,
}) {
  const items = normalizeOptions(options);
  const [open, setOpen] = useState(false);
  const [dir, setDir] = useState('down'); // 'up' | 'down'
  const [activeIdx, setActiveIdx] = useState(0);
  const rootRef = useRef(null);
  const selectedIdx = items.findIndex((o) => o.value === value);

  const close = useCallback(() => setOpen(false), []);

  // Click outside + Escape
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) close();
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const openPopup = () => {
    if (disabled) return;
    setActiveIdx(selectedIdx >= 0 ? selectedIdx : 0);
    // Decide open direction based on available space below the trigger.
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect) {
      const estHeight = Math.min(items.length, 8) * 38 + 14;
      setDir(window.innerHeight - rect.bottom < estHeight ? 'up' : 'down');
    }
    setOpen(true);
  };

  const handleTriggerKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) openPopup();
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!open) openPopup();
    }
  };

  const handleMenuKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const opt = items[activeIdx]; if (opt) onChange(opt.value); close(); }
    else if (e.key === 'Home') { e.preventDefault(); setActiveIdx(0); }
    else if (e.key === 'End') { e.preventDefault(); setActiveIdx(items.length - 1); }
  };

  const selected = selectedIdx >= 0 ? items[selectedIdx] : null;
  const dotFor = (opt) => opt?.dot || (typeof dotClass === 'function' ? dotClass(opt?.value) : dotClass);

  return (
    <div
      ref={rootRef}
      className={`admin-select admin-select--${size} ${open ? 'is-open' : ''} ${className}`.trim()}
      style={style}
    >
      <button
        type="button"
        className="admin-select__trigger"
        onClick={() => (open ? close() : openPopup())}
        onKeyDown={handleTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
      >
        <span className="admin-select__value">
          {dotFor(selected) && <span className={`admin-select__dot ${dotFor(selected)}`} />}
          <span className="admin-select__label">{selected ? selected.label : placeholder}</span>
        </span>
        <motion.span
          className="admin-select__chevron"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <ChevronDown size={size === 'sm' ? 13 : 15} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            className={`admin-select__menu admin-select__menu--${dir}`}
            role="listbox"
            tabIndex={-1}
            onKeyDown={handleMenuKey}
            initial={{ opacity: 0, y: dir === 'down' ? -6 : 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dir === 'down' ? -4 : 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE }}
          >
            {items.map((opt, idx) => {
              const isSelected = opt.value === value;
              const isActive = idx === activeIdx;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    className={`admin-select__option ${isActive ? 'is-active' : ''} ${isSelected ? 'is-selected' : ''}`}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => { onChange(opt.value); close(); }}
                  >
                    <span className="admin-select__option-main">
                      {dotFor(opt) && <span className={`admin-select__dot ${dotFor(opt)}`} />}
                      <span className="admin-select__label">{opt.label}</span>
                    </span>
                    {opt.hint && <span className="admin-select__hint">{opt.hint}</span>}
                    {isSelected && <Check size={14} strokeWidth={3} className="admin-select__check" />}
                  </button>
                </li>
              );
            })}
            {items.length === 0 && (
              <li className="admin-select__empty">No options</li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

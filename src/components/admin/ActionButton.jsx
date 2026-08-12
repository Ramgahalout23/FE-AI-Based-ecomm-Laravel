/**
 * ActionButton — brief feedback for page-level actions (delete, status toggle,
 * publish, revoke). Same lifecycle as SaveButton but compact for row buttons:
 *
 *   idle    → normal content ("Delete", an icon, etc.)
 *   saving  → spinner while the async action runs (button disabled)
 *   success → green check for ~900ms, then back to idle
 *
 * Props:
 * - onClick  — async action, already bound to its id; must return truthy ONLY
 *              on real success (return false so no false green check)
 * - confirm  — optional message; shows the animated ConfirmDialog BEFORE the
 *              action runs (handlers should drop their own confirm to avoid
 *              double prompts)
 * - idle     — content shown when idle (string or icon element)
 * - title    — optional tooltip
 * - className— appended to button classes (default "btn-ghost btn-sm")
 * - disabled — force-disabled
 *
 * Usage:
 * ```jsx
 * <ActionButton className="btn-del" confirm="Delete this coupon?"
 *   onClick={() => handleDelete(c.id)} idle="Delete" />
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { useConfirm } from '../../contexts/ConfirmContext';

const EASE = [0.16, 1, 0.3, 1];

export default function ActionButton({
  onClick,
  confirm = null,
  idle = 'Delete',
  title,
  className = 'btn-ghost btn-sm',
  style,
  disabled = false,
}) {
  const [state, setState] = useState('idle'); // 'idle' | 'saving' | 'success'
  const busy = useRef(false);
  const mounted = useRef(true);
  const confirmAction = useConfirm();

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const handleClick = useCallback(async () => {
    if (busy.current || disabled) return;
    if (confirm) {
      const ok = await confirmAction({ message: confirm, danger: true });
      if (!ok) return;
    }
    busy.current = true;
    setState('saving');
    try {
      const ok = await onClick();
      if (ok) {
        setState('success');
        setTimeout(() => {
          if (!mounted.current) return;
          setState('idle');
          busy.current = false;
        }, 900);
        return;
      }
    } catch {
      // Handler already shows its own error toast — just return to idle
    }
    setState('idle');
    busy.current = false;
  }, [onClick, confirm, disabled, confirmAction]);

  return (
    <motion.button
      type="button"
      title={title}
      className={`action-btn ${state === 'saving' ? 'is-saving' : ''} ${state === 'success' ? 'is-success' : ''} ${className}`.trim()}
      style={style}
      disabled={disabled || state !== 'idle'}
      onClick={handleClick}
      whileTap={state === 'idle' && !disabled ? { scale: 0.95 } : undefined}
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === 'saving' && (
          <motion.span
            key="saving"
            className="action-btn-content"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15, ease: EASE }}
          >
            <Loader2 size={13} className="save-spinner" />
          </motion.span>
        )}
        {state === 'success' && (
          <motion.span
            key="success"
            className="action-btn-content"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.18, ease: EASE }}
          >
            <Check size={13} strokeWidth={3} />
          </motion.span>
        )}
        {state === 'idle' && (
          <motion.span
            key="idle"
            className="action-btn-content"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15, ease: EASE }}
          >
            {idle}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

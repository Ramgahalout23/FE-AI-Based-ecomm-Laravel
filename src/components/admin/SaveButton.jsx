/**
 * SaveButton — animated submit button for admin forms.
 *
 * Self-manages the full save lifecycle so form actions give instant feedback:
 *
 *   idle    → normal label (e.g. "Create")
 *   saving  → spinner + "Saving…" + disabled (prevents double submits)
 *   success → green check + "Saved!" for ~900ms, then `onSuccess` fires
 *             (e.g. close the modal) so the confirmation is actually visible
 *
 * Props:
 * - onClick     — async handler that returns truthy ONLY on real success
 *                 (return false on validation failure so no false "Saved!")
 * - onSuccess   — called after the success state plays (close modal / refresh)
 * - idleLabel   — normal button label
 * - successLabel— text shown next to the check (default "Saved!")
 * - className   — appended to the button classes (default "btn-dark btn-sm")
 * - disabled    — force-disabled (e.g. missing required fields)
 *
 * Usage:
 * ```jsx
 * <SaveButton onClick={handleSave} onSuccess={() => setShowModal(false)}
 *   idleLabel={editing ? 'Update' : 'Create'} />
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { markFormSaved } from '../../store/formSavedStore';

const EASE = [0.16, 1, 0.3, 1];

export default function SaveButton({
  onClick,
  onSuccess,
  idleLabel = 'Save',
  successLabel = 'Saved!',
  className = 'btn-dark btn-sm',
  disabled = false,
}) {
  const [state, setState] = useState('idle'); // 'idle' | 'saving' | 'success'
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const handleClick = useCallback(async () => {
    if (busy.current || disabled) return;
    busy.current = true;
    setState('saving');
    try {
      const ok = await onClick();
      if (ok) {
        setState('success');
        // Signal AdminFormField so the form's fields show a lingering green
        // check, tied exactly to this save's success.
        markFormSaved();
        setTimeout(() => {
          if (!mounted.current) return;
          setState('idle');
          busy.current = false;
          onSuccess?.();
        }, 900);
        return;
      }
    } catch {
      // Handler already shows an error toast — just return to idle
    }
    setState('idle');
    busy.current = false;
  }, [onClick, onSuccess, disabled]);

  return (
    <motion.button
      type="button"
      className={`save-btn ${state === 'saving' ? 'is-saving' : ''} ${state === 'success' ? 'is-success' : ''} ${className}`.trim()}
      disabled={disabled || state !== 'idle'}
      onClick={handleClick}
      whileTap={state === 'idle' && !disabled ? { scale: 0.96 } : undefined}
      aria-live="polite"
    >
      <AnimatePresence mode="wait" initial={false}>
        {state === 'saving' && (
          <motion.span
            key="saving"
            className="save-btn-content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: EASE }}
          >
            <Loader2 size={14} className="save-spinner" /> Saving…
          </motion.span>
        )}
        {state === 'success' && (
          <motion.span
            key="success"
            className="save-btn-content"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <Check size={14} strokeWidth={3} /> {successLabel}
          </motion.span>
        )}
        {state === 'idle' && (
          <motion.span
            key="idle"
            className="save-btn-content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: EASE }}
          >
            {idleLabel}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

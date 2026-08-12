/**
 * AdminFormField — drop-in wrapper for admin form fields with animated
 * inline validation.
 *
 * - `error`   → the field shows a red border + glow, shakes once, and the
 *               error message slides in below with an alert icon.
 * - `valid`   → the control gets a green border and a green check mark.
 * - `required`→ appends a red asterisk to the label.
 *
 * Usage:
 * ```jsx
 * <AdminFormField label="Brand Name" required error={errors.name} valid={validFields.name}>
 *   <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Gucci" />
 * </AdminFormField>
 * ```
 *
 * Pair it with `useAdminFormValidation` (src/hooks/useAdminFormValidation.js).
 *
 * The wrapper is a motion element with `modalItemVariants`, so fields cascade
 * in when rendered inside AdminModal's staggered body; outside a modal it
 * renders statically (no animation).
 */

import { Children, cloneElement, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { modalItemVariants } from '../../utils/motionPresets';
import useFormSavedStore from '../../store/formSavedStore';

const EASE = [0.16, 1, 0.3, 1];

export default function AdminFormField({
  label,
  required = false,
  error = null,
  valid = false,
  hint = null,
  className = '',
  children,
}) {
  const control = Children.only(children);
  const controlWithAria = cloneElement(control, {
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error ? undefined : undefined,
  });

  // ── Saved-feedback: a lingering green check after SaveButton success ──
  const savedAt = useFormSavedStore((s) => s.savedAt);
  const savedUntil = useFormSavedStore((s) => s.savedUntil);
  // A `now` snapshot updated by an interval keeps freshness checks out of
  // render (React Compiler forbids impure calls like Date.now() in render).
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!savedAt) return;
    let id;
    const tick = () => {
      const n = Date.now();
      setNow(n);
      if (n >= savedUntil) clearInterval(id); // stop once the badge window ends
    };
    tick();
    id = setInterval(tick, 400);
    return () => clearInterval(id);
  }, [savedAt, savedUntil]);

  // Only celebrate fields that actually hold a value (empty optional fields
  // get no check) and never next to an error. `now > savedAt` guarantees a
  // freshly mounted field can never flash a stale badge from an older save.
  const rawValue = control?.props?.value;
  const hasValue = rawValue !== '' && rawValue !== null && rawValue !== undefined;
  const savedActive = savedAt > 0 && !error && hasValue && now > savedAt && now < savedUntil;

  return (
    <motion.div
      className={`form-group ${error ? 'has-error' : ''} ${valid ? 'is-valid' : ''} ${savedActive ? 'is-saved' : ''} ${className}`.trim()}
      variants={modalItemVariants}
    >
      {label && (
        <div className="form-label-row">
          <label>
            {label}
            {required && <span className="required-mark">*</span>}
          </label>
          <AnimatePresence>
            {savedActive && (
              <motion.span
                className="field-saved-check"
                initial={{ opacity: 0, scale: 0.5, y: 4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25, ease: EASE }}
              >
                <Check size={11} strokeWidth={3} /> Saved
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}
      {controlWithAria}
      {hint && !error && <span className="field-note">{hint}</span>}
      <AnimatePresence>
        {error && (
          <motion.div
            className="form-error"
            role="alert"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

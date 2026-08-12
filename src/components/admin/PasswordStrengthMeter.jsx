/**
 * PasswordStrengthMeter — live strength feedback for password fields.
 *
 * Renders a 4-segment bar colored by score, a strength label (Very weak →
 * Strong), and a checklist of the exact rules the password validators enforce
 * (8+ characters / uppercase / number), so the meter and inline errors always
 * agree. Recomputes on every keystroke.
 *
 * Props:
 * - value       — the current password value
 * - showChecks  — show the requirement checklist (default true)
 *
 * Usage:
 * ```jsx
 * <AdminFormField label="Password" error={errors.password} valid={validFields.password}>
 *   <PasswordInput value={form.password} onChange={...} />
 * </AdminFormField>
 * <PasswordStrengthMeter value={form.password} />
 * ```
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { passwordStrength } from '../../hooks/useAdminFormValidation';

const LEVELS = [
  { color: '#ef4444', label: 'Very weak' },
  { color: '#f59e0b', label: 'Weak' },
  { color: '#eab308', label: 'Fair' },
  { color: '#84cc16', label: 'Good' },
  { color: '#22c55e', label: 'Strong' },
];

export default function PasswordStrengthMeter({ value, showChecks = true }) {
  const { score, label, checks, empty } = passwordStrength(value);
  const level = LEVELS[score];

  return (
    <div className="pw-meter">
      <div
        className="pw-meter-bar"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={empty ? 0 : score}
        aria-label="Password strength"
      >
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`pw-meter-seg${empty || i >= score ? '' : ' on'}`}
            style={!empty && i < score ? { background: level.color } : undefined}
          />
        ))}
      </div>
      <div className="pw-meter-meta">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={label || 'empty'}
            className="pw-meter-label"
            style={!empty ? { color: level.color } : undefined}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.15 }}
          >
            {empty ? 'Password strength' : label}
          </motion.span>
        </AnimatePresence>
        {showChecks && (
          <span className="pw-meter-checks">
            {checks.map((c) => (
              <span key={c.key} className={`pw-check${c.met ? ' met' : ''}`}>
                <Check size={10} strokeWidth={3.5} /> {c.label}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

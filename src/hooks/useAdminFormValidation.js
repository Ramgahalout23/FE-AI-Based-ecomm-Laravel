/**
 * useAdminFormValidation — rules-based inline validation for admin forms.
 *
 * ```jsx
 * const validation = useAdminFormValidation({
 *   name: required('Category name is required'),
 *   description: required('Description is required'),
 * });
 *
 * const handleSave = () => {
 *   if (!validation.validateForm(form)) return; // shakes invalid fields
 *   ...
 * };
 *
 * // After a failed submit, validate live on every change:
 * onChange={e => { setForm({ ...form, name: e.target.value }); validation.handleChange('name', e.target.value); }}
 * ```
 *
 * Rules are functions `(value) => string | ''` — return an error message
 * or an empty string when valid.
 *
 * The primitives below are composed into named, page-agnostic rules in
 * `./validationRules.js` (the shared registry) — import those when a rule
 * already exists instead of redefining it per page.
 */

import { useRef, useState } from 'react';

/** True when the value is blank. */
const isEmpty = (value) =>
  value === undefined || value === null || String(value).trim() === '';

/** Validator: field must be non-empty after trimming. */
export const required = (message = 'This field is required') =>
  (value) => (isEmpty(value) ? message : '');

/** Validator: optional field, but when filled it must be a valid URL. */
export const validUrl = (message = 'Enter a valid URL') =>
  (value) => {
    if (value === undefined || value === null || String(value).trim() === '') return '';
    try {
      new URL(String(value).trim());
      return '';
    } catch {
      return message;
    }
  };

/** Validator: optional field, but when filled it must be a valid email address. */
export const validEmail = (message = 'Enter a valid email address') =>
  (value) => {
    if (isEmpty(value)) return '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim()) ? '' : message;
  };

/** Validator: value must be at least `min` characters. Empty passes (combine with required()). */
export const minLength = (min, message = `Must be at least ${min} characters`) =>
  (value) => (isEmpty(value) || String(value).length >= min ? '' : message);

/** Validator: must contain at least one uppercase letter. Empty passes. */
export const hasUppercase = (message = 'Must include an uppercase letter') =>
  (value) => (isEmpty(value) || /[A-Z]/.test(String(value)) ? '' : message);

/** Validator: must contain at least one number. Empty passes. */
export const hasNumber = (message = 'Must include a number') =>
  (value) => (isEmpty(value) || /\d/.test(String(value)) ? '' : message);

/** Validator: trimmed value must be exactly `n` characters. Empty passes. */
export const exactLength = (n, message = `Must be exactly ${n} characters`) =>
  (value) => (isEmpty(value) || String(value).trim().length === n ? '' : message);

/** Validator: trimmed value must be between `min` and `max` characters. Empty passes. */
export const lengthBetween = (min, max, message = `Must be ${min}-${max} characters`) =>
  (value) => {
    if (isEmpty(value)) return '';
    const len = String(value).trim().length;
    return len >= min && len <= max ? '' : message;
  };

/** Validator: optional field, but when filled it must be a non-negative number. */
export const nonNegativeNumber = (message = 'Enter a valid non-negative number') =>
  (value) => {
    if (isEmpty(value)) return '';
    const n = parseFloat(String(value).trim());
    return Number.isFinite(n) && n >= 0 ? '' : message;
  };

/** Validator: optional field, but when filled it must be a positive whole number (1+). */
export const positiveInteger = (message = 'Enter a positive whole number') =>
  (value) => {
    if (isEmpty(value)) return '';
    const s = String(value).trim();
    return /^\d+$/.test(s) && parseInt(s, 10) > 0 ? '' : message;
  };

/**
 * Live password strength analysis — used by PasswordStrengthMeter and the
 * password rules above.
 *
 * Returns { score (0-4), label, empty, checks: [{ key, label, met }] } where
 * the checks are the same three rules enforced by the validators, so the meter
 * and the inline errors always agree.
 */
export const passwordStrength = (value) => {
  const v = String(value ?? '');
  const checks = [
    { key: 'length', label: '8+ characters', met: v.length >= 8 },
    { key: 'upper', label: 'Uppercase', met: /[A-Z]/.test(v) },
    { key: 'number', label: 'Number', met: /\d/.test(v) },
  ];

  let score = 0;
  if (v.length >= 8) score += 1;
  if (/[A-Z]/.test(v)) score += 1;
  if (/\d/.test(v)) score += 1;
  if (v.length >= 12) score += 1; // bonus tier for longer passphrases
  score = Math.min(4, Math.max(0, score));

  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: v ? labels[score] : '', checks, empty: !v };
};

/** Compose multiple validators for one field (first failure wins). */
export const composeValidators = (...validators) =>
  (value) => {
    for (const fn of validators) {
      const msg = fn(value);
      if (msg) return msg;
    }
    return '';
  };

/**
 * After a failed submit, move the keyboard user to the first invalid field:
 * scroll its group into view and focus its control.
 *
 * Error states are already committed to the DOM by the time this runs (it is
 * deferred to the next animation frame), so we can find them by class:
 *   - `.form-group.has-error`  — AdminFormField groups AND the manual
 *     form-group pattern used across the settings page / export modal
 *   - `.qty-invalid`           — barcode SKU input + bulk-adjust quantity rows
 *   - `.import-dropzone-error` — product import dropzone
 *
 * File inputs are never focused (that would open the OS picker); the dropzone
 * still scrolls into view, which is the useful part.
 */
function focusFirstInvalidField() {
  if (typeof document === 'undefined') return;
  requestAnimationFrame(() => {
    const group =
      document.querySelector('.form-group.has-error') ||
      document.querySelector('.qty-invalid') ||
      document.querySelector('.import-dropzone-error');
    if (!group) return;

    group.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const selector = 'input:not([type="file"]):not([type="hidden"]), select, textarea';
    const control = group.matches(selector) ? group : group.querySelector(selector);
    if (control) control.focus({ preventScroll: true });
  });
}

export function useAdminFormValidation(rules) {
  const [errors, setErrors] = useState({});
  const [validFields, setValidFields] = useState({});
  const submittedRef = useRef(false);

  const ruleFor = (name) => rules[name];

  const validateOne = (name, value) => {
    const rule = ruleFor(name);
    if (typeof rule !== 'function') return '';
    return rule(value) || '';
  };

  /** Validate every field at once (call from the submit handler). */
  const validateForm = (values) => {
    submittedRef.current = true;
    const nextErrors = {};
    const nextValid = {};
    let ok = true;

    Object.keys(rules).forEach((name) => {
      const msg = validateOne(name, values[name]);
      if (msg) {
        nextErrors[name] = msg;
        ok = false;
      } else if (!isEmpty(values[name])) {
        // Green check only when the field actually has a value — an empty
        // optional field is fine but shouldn't be celebrated.
        nextValid[name] = true;
      }
    });

    setErrors(nextErrors);
    setValidFields(nextValid);
    if (!ok) focusFirstInvalidField();
    return ok;
  };

  /** Live-validate a single field as it changes (only after first submit). */
  const handleChange = (name, value) => {
    if (!submittedRef.current) return;

    const msg = validateOne(name, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) next[name] = msg;
      else delete next[name];
      return next;
    });
    setValidFields((prev) => {
      const next = { ...prev };
      if (msg || isEmpty(value)) delete next[name];
      else next[name] = true;
      return next;
    });
  };

  /** Manually mark a field invalid (e.g. server-side rejection). */
  const setFieldError = (name, message) => {
    setErrors((prev) => ({ ...prev, [name]: message }));
    setValidFields((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  /** Clear all errors/valid marks (e.g. when a modal reopens). */
  const reset = () => {
    submittedRef.current = false;
    setErrors({});
    setValidFields({});
  };

  return { errors, validFields, validateForm, handleChange, setFieldError, reset };
}
